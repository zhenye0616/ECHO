import { open, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname } from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { createLogger } from '../../logging/index.js';
import type { Storage } from '../../storage/interface.js';
import { processCandidate } from '../pipeline.js';

const log = createLogger('capture.claude-code');

const HOME = homedir();
const DEFAULT_PROJECTS_PREFIX = `${HOME}/.claude/projects/`;

export interface ClaudeCodeTurn {
  project: string;
  session_id: string;
  turn_index: number;
  user_message: string;
  assistant_message: string;
  mtime: number;
  timestamp: string;
  had_tool_use: boolean;
  byte_offset: number;
  repo_root?: string;
  files_referenced?: string[];
}

export interface ExtractClaudeCodeResult {
  turns: ClaudeCodeTurn[];
  newOffset: number;
}

interface ParsedLine {
  role: 'user' | 'assistant';
  text: string;
  hasTool: boolean;
  timestamp: string | undefined;
  cwd: string | undefined;
  files: string[];
}

const FILE_INPUT_KEYS = ['file_path', 'path', 'notebook_path'] as const;

function extractContent(content: unknown): { text: string; hasTool: boolean; files: string[] } {
  if (typeof content === 'string') {
    return { text: content, hasTool: false, files: [] };
  }
  if (!Array.isArray(content)) {
    return { text: '', hasTool: false, files: [] };
  }
  const parts: string[] = [];
  const files: string[] = [];
  let hasTool = false;
  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue;
    const b = block as Record<string, unknown>;
    const blockType = b['type'];
    if (blockType === 'text' && typeof b['text'] === 'string') {
      parts.push(b['text']);
    } else if (blockType === 'tool_use' || blockType === 'tool_result') {
      hasTool = true;
      if (blockType === 'tool_use') {
        const input = b['input'];
        if (typeof input === 'object' && input !== null) {
          const i = input as Record<string, unknown>;
          for (const key of FILE_INPUT_KEYS) {
            const v = i[key];
            if (typeof v === 'string' && v.length > 0) files.push(v);
          }
        }
      }
    }
  }
  return { text: parts.join(''), hasTool, files };
}

function parseLine(line: string): ParsedLine | null {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const message = obj['message'];
  if (typeof message !== 'object' || message === null) return null;
  const msg = message as Record<string, unknown>;
  const role = msg['role'];
  if (role !== 'user' && role !== 'assistant') return null;
  const { text, hasTool, files } = extractContent(msg['content']);
  const ts = obj['timestamp'];
  const cwd = obj['cwd'];
  return {
    role,
    text,
    hasTool,
    timestamp: typeof ts === 'string' ? ts : undefined,
    cwd: typeof cwd === 'string' && cwd.length > 0 ? cwd : undefined,
    files,
  };
}

function dedupStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function deriveSessionId(jsonlPath: string): string {
  const base = basename(jsonlPath);
  return base.endsWith('.jsonl') ? base.slice(0, -'.jsonl'.length) : base;
}

function deriveProject(jsonlPath: string): string {
  return basename(dirname(jsonlPath));
}

export async function extractClaudeCodeTurns(
  jsonlPath: string,
  lastByteOffset: number,
): Promise<ExtractClaudeCodeResult> {
  let st: Awaited<ReturnType<typeof stat>>;
  try {
    st = await stat(jsonlPath);
  } catch (err) {
    log.warn('stat_failed', { path: jsonlPath, message: (err as Error).message });
    return { turns: [], newOffset: lastByteOffset };
  }
  const fileSize = st.size;
  if (fileSize <= lastByteOffset) {
    return { turns: [], newOffset: lastByteOffset };
  }

  const length = fileSize - lastByteOffset;
  const buffer = Buffer.alloc(length);
  let fh: Awaited<ReturnType<typeof open>>;
  try {
    fh = await open(jsonlPath, 'r');
  } catch (err) {
    log.warn('open_failed', { path: jsonlPath, message: (err as Error).message });
    return { turns: [], newOffset: lastByteOffset };
  }
  try {
    await fh.read(buffer, 0, length, lastByteOffset);
  } finally {
    await fh.close();
  }

  const text = buffer.toString('utf8');
  const lastNewline = text.lastIndexOf('\n');
  if (lastNewline === -1) {
    return { turns: [], newOffset: lastByteOffset };
  }
  const consumable = text.slice(0, lastNewline + 1);
  const consumedBytes = Buffer.byteLength(consumable, 'utf8');

  const lines = consumable.split('\n').filter((l) => l.length > 0);
  const session_id = deriveSessionId(jsonlPath);
  const project = deriveProject(jsonlPath);
  const fileMtime = st.mtimeMs;

  const turns: ClaudeCodeTurn[] = [];
  let pendingUser:
    | { line: ParsedLine; hadToolThisTurn: boolean; filesThisTurn: string[] }
    | null = null;
  let hadToolBetween = false;
  let filesBetween: string[] = [];
  let offsetCursor = lastByteOffset;
  let turnIndex = 0;
  let currentCwd: string | undefined;

  for (const line of lines) {
    const lineBytes = Buffer.byteLength(line, 'utf8') + 1; // +1 for the newline
    offsetCursor += lineBytes;
    const parsed = parseLine(line);
    if (parsed === null) continue;
    if (parsed.cwd !== undefined) currentCwd = parsed.cwd;

    if (parsed.text === '') {
      if (parsed.hasTool) hadToolBetween = true;
      if (parsed.files.length > 0) filesBetween.push(...parsed.files);
      continue;
    }

    if (parsed.role === 'user') {
      if (pendingUser !== null) {
        log.warn('user_replaced_without_assistant', { session_id });
      }
      pendingUser = {
        line: parsed,
        hadToolThisTurn: hadToolBetween || parsed.hasTool,
        filesThisTurn: [...filesBetween, ...parsed.files],
      };
      hadToolBetween = false;
      filesBetween = [];
    } else {
      if (pendingUser === null) {
        log.warn('orphan_assistant', { session_id });
        if (parsed.hasTool) hadToolBetween = true;
        if (parsed.files.length > 0) filesBetween.push(...parsed.files);
        continue;
      }
      const had_tool_use =
        pendingUser.hadToolThisTurn || hadToolBetween || parsed.hasTool;
      const allFiles = dedupStrings([
        ...pendingUser.filesThisTurn,
        ...filesBetween,
        ...parsed.files,
      ]);
      const turn: ClaudeCodeTurn = {
        project,
        session_id,
        turn_index: turnIndex,
        user_message: pendingUser.line.text,
        assistant_message: parsed.text,
        mtime: fileMtime,
        timestamp: parsed.timestamp ?? new Date(fileMtime).toISOString(),
        had_tool_use,
        byte_offset: offsetCursor,
      };
      if (currentCwd !== undefined) turn.repo_root = currentCwd;
      if (allFiles.length > 0) turn.files_referenced = allFiles;
      turns.push(turn);
      turnIndex += 1;
      pendingUser = null;
      hadToolBetween = false;
      filesBetween = [];
    }
  }

  return { turns, newOffset: lastByteOffset + consumedBytes };
}

async function backfillOffsetMap(storage: Storage): Promise<Map<string, { offset: number; turn_index: number }>> {
  const map = new Map<string, { offset: number; turn_index: number }>();
  const events = await storage.query();
  for (const evt of events) {
    if (!evt.source.startsWith('fs:')) continue;
    if (!evt.source.endsWith('.jsonl')) continue;
    const md = evt.metadata;
    if (md === undefined) continue;
    const offset = md['byte_offset'];
    const turn_index = md['turn_index'];
    if (typeof offset !== 'number' || typeof turn_index !== 'number') continue;
    const path = evt.source.slice('fs:'.length);
    const cur = map.get(path);
    if (cur === undefined || offset > cur.offset) {
      map.set(path, { offset, turn_index });
    }
  }
  return map;
}

export interface ClaudeCodeExtractorOptions {
  projectsPrefix?: string;
}

export interface ClaudeCodeExtractorHandle {
  stop: () => Promise<void>;
}

export async function startClaudeCodeExtractor(
  storage: Storage,
  options: ClaudeCodeExtractorOptions = {},
): Promise<ClaudeCodeExtractorHandle> {
  const projectsPrefix = options.projectsPrefix ?? DEFAULT_PROJECTS_PREFIX;
  const offsetMap = await backfillOffsetMap(storage);

  let processing: Promise<void> = Promise.resolve();
  let stopped = false;

  function isJsonl(p: string): boolean {
    return p.startsWith(projectsPrefix) && p.endsWith('.jsonl');
  }

  async function handleJsonlChange(path: string): Promise<void> {
    const cur = offsetMap.get(path) ?? { offset: 0, turn_index: -1 };
    const { turns, newOffset } = await extractClaudeCodeTurns(path, cur.offset);
    let nextTurnIndex = cur.turn_index + 1;
    for (const turn of turns) {
      const metadata: Record<string, unknown> = {
        project: turn.project,
        session_id: turn.session_id,
        turn_index: nextTurnIndex,
        mtime: turn.mtime,
        byte_offset: turn.byte_offset,
      };
      if (turn.had_tool_use) metadata['had_tool_use'] = true;
      if (turn.repo_root !== undefined) metadata['repo_root'] = turn.repo_root;
      if (turn.files_referenced !== undefined) metadata['files_referenced'] = turn.files_referenced;
      const candidate = {
        source: `fs:${path}`,
        timestamp: turn.timestamp,
        content: `USER: ${turn.user_message}\n\nASSISTANT: ${turn.assistant_message}`,
        metadata,
      };
      log.info('candidate', { session_id: turn.session_id, turn_index: nextTurnIndex });
      const result = await processCandidate(candidate, storage);
      if (result.accepted) {
        nextTurnIndex += 1;
      } else {
        log.warn('candidate_rejected', { reason: result.reason, path });
      }
    }
    offsetMap.set(path, { offset: newOffset, turn_index: nextTurnIndex - 1 });
  }

  function schedule(work: () => Promise<void>): void {
    if (stopped) return;
    processing = processing.then(async () => {
      if (stopped) return;
      try {
        await work();
      } catch (err) {
        log.error('handler_error', { message: (err as Error).message });
      }
    });
  }

  const watcher: FSWatcher = chokidar.watch(projectsPrefix, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: false,
  });

  function dispatch(p: string): void {
    if (isJsonl(p)) {
      schedule(() => handleJsonlChange(p));
    }
  }

  watcher.on('add', dispatch);
  watcher.on('change', dispatch);
  watcher.on('error', (err: unknown) => {
    log.error('watcher_error', { message: (err as Error).message });
  });

  await new Promise<void>((resolve) => {
    watcher.once('ready', () => resolve());
  });

  log.info('started', { projectsPrefix });

  return {
    stop: async () => {
      stopped = true;
      await watcher.close();
      await processing;
      log.info('stopped', {});
    },
  };
}
