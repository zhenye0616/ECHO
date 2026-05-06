import { open, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname } from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { isNonEmptyString } from '../../guards.js';
import { createLogger } from '../../logging/index.js';
import type { Storage } from '../../storage/interface.js';
import { probeGitState } from '../git-state.js';
import { processCandidate } from '../pipeline.js';
import { bootScanJsonl, dedupStrings } from './_shared.js';
import {
  MAX_TOOL_CALLS_PER_TURN,
  truncateArgs,
  truncateOutput,
  truncateThinking,
  type GitState,
  type ToolCall,
} from './_turn_meta.js';

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
  tool_calls?: ToolCall[];
  thinking?: string;
  git_state?: GitState;
}

export interface ExtractClaudeCodeResult {
  turns: ClaudeCodeTurn[];
  newOffset: number;
}

interface ParsedToolUse {
  id: string;
  name: string;
  input: unknown;
}

interface ParsedToolResult {
  tool_use_id: string;
  content: string;
  is_error: boolean;
}

interface ExtractedContent {
  text: string;
  hasTool: boolean;
  files: string[];
  toolUses: ParsedToolUse[];
  toolResults: ParsedToolResult[];
  thinking: string[];
}

interface ParsedLine {
  role: 'user' | 'assistant';
  text: string;
  hasTool: boolean;
  timestamp: string | undefined;
  cwd: string | undefined;
  files: string[];
  toolUses: ParsedToolUse[];
  toolResults: ParsedToolResult[];
  thinking: string[];
}

const FILE_INPUT_KEYS = ['file_path', 'path', 'notebook_path'] as const;

function stringifyToolResultContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue;
    const b = block as Record<string, unknown>;
    if (b['type'] === 'text' && typeof b['text'] === 'string') {
      parts.push(b['text']);
    }
  }
  return parts.join('\n');
}

function extractContent(content: unknown): ExtractedContent {
  if (typeof content === 'string') {
    return { text: content, hasTool: false, files: [], toolUses: [], toolResults: [], thinking: [] };
  }
  if (!Array.isArray(content)) {
    return { text: '', hasTool: false, files: [], toolUses: [], toolResults: [], thinking: [] };
  }
  const parts: string[] = [];
  const files: string[] = [];
  const toolUses: ParsedToolUse[] = [];
  const toolResults: ParsedToolResult[] = [];
  const thinking: string[] = [];
  let hasTool = false;
  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue;
    const b = block as Record<string, unknown>;
    const blockType = b['type'];
    if (blockType === 'text' && typeof b['text'] === 'string') {
      parts.push(b['text']);
    } else if (blockType === 'thinking' && typeof b['thinking'] === 'string') {
      thinking.push(b['thinking']);
    } else if (blockType === 'tool_use') {
      hasTool = true;
      const id = b['id'];
      const name = b['name'];
      const input = b['input'];
      if (isNonEmptyString(id) && isNonEmptyString(name)) {
        toolUses.push({ id, name, input });
      }
      if (typeof input === 'object' && input !== null) {
        const i = input as Record<string, unknown>;
        for (const key of FILE_INPUT_KEYS) {
          const v = i[key];
          if (isNonEmptyString(v)) files.push(v);
        }
      }
    } else if (blockType === 'tool_result') {
      hasTool = true;
      const tuid = b['tool_use_id'];
      if (isNonEmptyString(tuid)) {
        toolResults.push({
          tool_use_id: tuid,
          content: stringifyToolResultContent(b['content']),
          is_error: b['is_error'] === true,
        });
      }
    }
  }
  return { text: parts.join(''), hasTool, files, toolUses, toolResults, thinking };
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
  const ec = extractContent(msg['content']);
  const ts = obj['timestamp'];
  const cwd = obj['cwd'];
  return {
    role,
    text: ec.text,
    hasTool: ec.hasTool,
    timestamp: typeof ts === 'string' ? ts : undefined,
    cwd: isNonEmptyString(cwd) ? cwd : undefined,
    files: ec.files,
    toolUses: ec.toolUses,
    toolResults: ec.toolResults,
    thinking: ec.thinking,
  };
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

  const lines = consumable.split('\n').filter((l) => l.length > 0);
  const session_id = deriveSessionId(jsonlPath);
  const project = deriveProject(jsonlPath);
  const fileMtime = st.mtimeMs;

  const turns: ClaudeCodeTurn[] = [];
  interface PendingCluster {
    userText: string;
    timestamp: string;
    assistantTexts: string[];
    assistantLastLineEndOffset: number;
    hadTool: boolean;
    files: string[];
    toolUses: ParsedToolUse[];
    toolResults: ParsedToolResult[];
    thinking: string[];
    repo_root?: string;
  }
  let pending: PendingCluster | null = null;
  // "Between" buffers accumulate side-effects from lines that arrive when no
  // cluster is open (e.g., orphan tool_results before any user line). They
  // get folded into the next cluster's pending state at user-line time.
  let hadToolBetween = false;
  let filesBetween: string[] = [];
  let toolUsesBetween: ParsedToolUse[] = [];
  let toolResultsBetween: ParsedToolResult[] = [];
  let thinkingBetween: string[] = [];
  let lineStartOffset = lastByteOffset;
  // Tracks the END of the last line that contributed to an EMITTED turn.
  // Pending-cluster lines (user + assistants without a closing next-user) are
  // intentionally NOT past confirmedThroughOffset, so the next pass re-reads
  // them and rebuilds the pending cluster from scratch. Mirrors codex.ts.
  let confirmedThroughOffset = lastByteOffset;
  let currentCwd: string | undefined;

  function emitPendingIfComplete(): void {
    if (pending === null) return;
    if (pending.assistantTexts.length === 0) return;
    const allFiles = dedupStrings(pending.files);
    const turn: ClaudeCodeTurn = {
      project,
      session_id,
      turn_index: turns.length,
      user_message: pending.userText,
      assistant_message: pending.assistantTexts.join('\n\n'),
      mtime: fileMtime,
      timestamp: pending.timestamp,
      had_tool_use: pending.hadTool,
      byte_offset: pending.assistantLastLineEndOffset,
    };
    if (pending.repo_root !== undefined) turn.repo_root = pending.repo_root;
    if (allFiles.length > 0) turn.files_referenced = allFiles;
    const toolCalls = matchToolCalls(pending.toolUses, pending.toolResults);
    if (toolCalls.length > 0) turn.tool_calls = toolCalls;
    if (pending.thinking.length > 0) {
      const t = truncateThinking(pending.thinking.join('\n\n'));
      turn.thinking = t.value;
    }
    turns.push(turn);
    confirmedThroughOffset = pending.assistantLastLineEndOffset;
  }

  for (const line of lines) {
    const lineEndOffset = lineStartOffset + Buffer.byteLength(line, 'utf8') + 1;
    const parsed = parseLine(line);
    if (parsed === null) {
      lineStartOffset = lineEndOffset;
      continue;
    }
    if (parsed.cwd !== undefined) currentCwd = parsed.cwd;

    if (parsed.text === '') {
      // Side-effects (tool_use, tool_result, thinking blocks) accumulate into
      // the open cluster if there is one; otherwise into the "between" buffers
      // so they fold into whatever cluster opens next.
      if (pending !== null) {
        if (parsed.hasTool) pending.hadTool = true;
        if (parsed.files.length > 0) pending.files.push(...parsed.files);
        if (parsed.toolUses.length > 0) pending.toolUses.push(...parsed.toolUses);
        if (parsed.toolResults.length > 0) pending.toolResults.push(...parsed.toolResults);
        if (parsed.thinking.length > 0) pending.thinking.push(...parsed.thinking);
      } else {
        if (parsed.hasTool) hadToolBetween = true;
        if (parsed.files.length > 0) filesBetween.push(...parsed.files);
        if (parsed.toolUses.length > 0) toolUsesBetween.push(...parsed.toolUses);
        if (parsed.toolResults.length > 0) toolResultsBetween.push(...parsed.toolResults);
        if (parsed.thinking.length > 0) thinkingBetween.push(...parsed.thinking);
      }
      lineStartOffset = lineEndOffset;
      continue;
    }

    if (parsed.role === 'user') {
      // A new text-bearing user line closes any prior cluster.
      if (pending !== null) {
        if (pending.assistantTexts.length > 0) {
          emitPendingIfComplete();
        } else {
          log.warn('user_replaced_without_assistant', { session_id });
        }
      }
      pending = {
        userText: parsed.text,
        timestamp: parsed.timestamp ?? new Date(fileMtime).toISOString(),
        assistantTexts: [],
        assistantLastLineEndOffset: lineEndOffset,
        hadTool: hadToolBetween || parsed.hasTool,
        files: [...filesBetween, ...parsed.files],
        toolUses: [...toolUsesBetween, ...parsed.toolUses],
        toolResults: [...toolResultsBetween, ...parsed.toolResults],
        thinking: [...thinkingBetween, ...parsed.thinking],
      };
      if (currentCwd !== undefined) pending.repo_root = currentCwd;
      hadToolBetween = false;
      filesBetween = [];
      toolUsesBetween = [];
      toolResultsBetween = [];
      thinkingBetween = [];
    } else {
      // text-bearing assistant
      if (pending === null) {
        log.warn('orphan_assistant', { session_id });
      } else {
        pending.assistantTexts.push(parsed.text);
        pending.assistantLastLineEndOffset = lineEndOffset;
        if (parsed.timestamp !== undefined) pending.timestamp = parsed.timestamp;
        if (parsed.hasTool) pending.hadTool = true;
        if (parsed.files.length > 0) pending.files.push(...parsed.files);
        if (parsed.toolUses.length > 0) pending.toolUses.push(...parsed.toolUses);
        if (parsed.toolResults.length > 0) pending.toolResults.push(...parsed.toolResults);
        if (parsed.thinking.length > 0) pending.thinking.push(...parsed.thinking);
      }
    }
    lineStartOffset = lineEndOffset;
  }

  // Intentionally do NOT emit pending here. A cluster only counts as closed
  // when the next user line appears; emitting at EOF risks double-emission
  // when the next pass sees more assistant lines arrive (for active sessions)
  // or losing-then-recapturing content as orphans.
  return { turns, newOffset: confirmedThroughOffset };
}

function matchToolCalls(
  uses: ParsedToolUse[],
  results: ParsedToolResult[],
): ToolCall[] {
  const resultById = new Map<string, ParsedToolResult>();
  for (const r of results) resultById.set(r.tool_use_id, r);
  const out: ToolCall[] = [];
  for (const u of uses) {
    if (out.length >= MAX_TOOL_CALLS_PER_TURN) break;
    const r = resultById.get(u.id);
    const tc: ToolCall = { name: u.name, call_id: u.id };
    if (u.input !== undefined && u.input !== null) {
      const argsStr = typeof u.input === 'string' ? u.input : JSON.stringify(u.input);
      const t = truncateArgs(argsStr);
      tc.args = t.value;
      if (t.truncated) tc.args_truncated = true;
    }
    if (r !== undefined) {
      const t = truncateOutput(r.content);
      tc.output = t.value;
      if (t.truncated) tc.output_truncated = true;
      if (r.is_error) tc.is_error = true;
    }
    out.push(tc);
  }
  return out;
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
      if (turn.tool_calls !== undefined) metadata['tool_calls'] = turn.tool_calls;
      if (turn.thinking !== undefined) metadata['thinking'] = turn.thinking;
      const gitState = await probeGitState(turn.repo_root, turn.timestamp);
      if (gitState !== undefined) metadata['git_state'] = gitState;
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

  await bootScanJsonl(projectsPrefix, schedule, handleJsonlChange, log);

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
