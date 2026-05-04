import { open, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename } from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { createLogger } from '../../logging/index.js';
import type { Storage } from '../../storage/interface.js';
import { processCandidate } from '../pipeline.js';

const log = createLogger('capture.codex');

const HOME = homedir();
const DEFAULT_SESSIONS_PREFIX = `${HOME}/.codex/sessions/`;

export interface CodexTurn {
  session_id: string;
  turn_index: number;
  user_message: string;
  assistant_message: string;
  cwd?: string;
  mtime: number;
  timestamp: string;
  had_tool_use: boolean;
  byte_offset: number; // file offset just past the LAST line consumed for this turn
}

export interface ExtractCodexResult {
  turns: CodexTurn[];
  newOffset: number;
  cwd?: string;
}

interface ParsedLine {
  kind: 'message' | 'tool' | 'session_meta' | 'other';
  role?: 'user' | 'assistant';
  text?: string;
  cwd?: string;
  timestamp?: string;
}

function extractMessageText(content: unknown): string {
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const block of content) {
    if (typeof block !== 'object' || block === null) continue;
    const b = block as Record<string, unknown>;
    const t = b['type'];
    if ((t === 'input_text' || t === 'output_text') && typeof b['text'] === 'string') {
      parts.push(b['text']);
    }
  }
  return parts.join('');
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
  const t = obj['type'];
  const ts = obj['timestamp'];
  const timestamp = typeof ts === 'string' ? ts : undefined;

  if (t === 'session_meta') {
    const payload = obj['payload'];
    const out: ParsedLine = { kind: 'session_meta', timestamp };
    if (typeof payload === 'object' && payload !== null) {
      const c = (payload as Record<string, unknown>)['cwd'];
      if (typeof c === 'string' && c.length > 0) out.cwd = c;
    }
    return out;
  }

  if (t !== 'response_item') return { kind: 'other', timestamp };
  const payload = obj['payload'];
  if (typeof payload !== 'object' || payload === null) return { kind: 'other', timestamp };
  const p = payload as Record<string, unknown>;
  const ptype = p['type'];

  if (
    ptype === 'function_call' ||
    ptype === 'function_call_output' ||
    ptype === 'custom_tool_call' ||
    ptype === 'custom_tool_call_output'
  ) {
    return { kind: 'tool', timestamp };
  }

  if (ptype !== 'message') return { kind: 'other', timestamp };
  const role = p['role'];
  if (role !== 'user' && role !== 'assistant') return { kind: 'other', timestamp };
  return {
    kind: 'message',
    role,
    text: extractMessageText(p['content']),
    timestamp,
  };
}

function deriveSessionId(jsonlPath: string): string {
  const base = basename(jsonlPath);
  // rollout-<ISO>-<uuid>.jsonl  → take the trailing UUID, fall back to filename
  const m = base.match(
    /^rollout-.*-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/,
  );
  if (m && m[1] !== undefined) return m[1];
  return base.endsWith('.jsonl') ? base.slice(0, -'.jsonl'.length) : base;
}

interface PendingCluster {
  userText: string;
  assistantTexts: string[];
  assistantLastLineEndOffset: number;
  hadTool: boolean;
  timestamp: string;
  cwd?: string;
}

export async function extractCodexTurns(
  jsonlPath: string,
  lastByteOffset: number,
  lastKnownCwd?: string,
): Promise<ExtractCodexResult> {
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
  const fileMtime = st.mtimeMs;

  const turns: CodexTurn[] = [];
  let pending: PendingCluster | null = null;
  let cwd: string | undefined = lastKnownCwd;
  let lineStartOffset = lastByteOffset;
  // Tracks the END of the last line that contributed to an EMITTED turn.
  // Pending-cluster lines (user + assistants without a closing next-user) are
  // intentionally NOT past confirmedThroughOffset, so the next pass re-reads
  // them and rebuilds the pending cluster from scratch.
  let confirmedThroughOffset = lastByteOffset;

  function emitPendingIfComplete(): void {
    if (pending === null) return;
    if (pending.assistantTexts.length === 0) return;
    const turn: CodexTurn = {
      session_id,
      turn_index: turns.length,
      user_message: pending.userText,
      assistant_message: pending.assistantTexts.join('\n\n'),
      mtime: fileMtime,
      timestamp: pending.timestamp,
      had_tool_use: pending.hadTool,
      byte_offset: pending.assistantLastLineEndOffset,
    };
    if (pending.cwd !== undefined) turn.cwd = pending.cwd;
    turns.push(turn);
    confirmedThroughOffset = pending.assistantLastLineEndOffset;
  }

  for (const line of lines) {
    const lineEndOffset = lineStartOffset + Buffer.byteLength(line, 'utf8') + 1; // +1 for \n
    const parsed = parseLine(line);
    if (parsed === null) {
      lineStartOffset = lineEndOffset;
      continue;
    }

    if (parsed.kind === 'session_meta') {
      if (parsed.cwd !== undefined) cwd = parsed.cwd;
      lineStartOffset = lineEndOffset;
      continue;
    }

    if (parsed.kind === 'tool') {
      if (pending !== null) pending.hadTool = true;
      lineStartOffset = lineEndOffset;
      continue;
    }

    if (parsed.kind === 'other') {
      lineStartOffset = lineEndOffset;
      continue;
    }

    // kind === 'message'
    if (parsed.role === 'user') {
      // A new user closes any prior cluster.
      if (pending !== null) {
        if (pending.assistantTexts.length > 0) {
          emitPendingIfComplete();
        } else {
          log.warn('user_with_no_assistant', { session_id });
        }
      }
      pending = {
        userText: parsed.text ?? '',
        assistantTexts: [],
        assistantLastLineEndOffset: lineEndOffset,
        hadTool: false,
        timestamp: parsed.timestamp ?? new Date(fileMtime).toISOString(),
      };
      if (cwd !== undefined) pending.cwd = cwd;
    } else {
      // assistant
      if (pending === null) {
        log.warn('orphan_assistant', { session_id });
      } else if ((parsed.text ?? '').length > 0) {
        pending.assistantTexts.push(parsed.text!);
        pending.assistantLastLineEndOffset = lineEndOffset;
        if (parsed.timestamp !== undefined) pending.timestamp = parsed.timestamp;
      }
    }

    lineStartOffset = lineEndOffset;
  }

  // Intentionally do NOT emit the pending cluster here. A cluster only counts
  // as closed when the next user line appears (or the file is otherwise known
  // to be complete). Emitting on EOF risks duplicate turns when the next pass
  // sees more assistant lines arrive.
  const result: ExtractCodexResult = { turns, newOffset: confirmedThroughOffset };
  if (cwd !== undefined) result.cwd = cwd;
  return result;
}

interface OffsetEntry {
  offset: number;
  turn_index: number;
  cwd?: string;
}

async function backfillOffsetMap(storage: Storage): Promise<Map<string, OffsetEntry>> {
  const map = new Map<string, OffsetEntry>();
  const events = await storage.query({ source_prefix: 'fs:' });
  for (const evt of events) {
    if (!evt.source.endsWith('.jsonl')) continue;
    if (!evt.source.includes('/.codex/sessions/')) continue;
    const md = evt.metadata;
    if (md === undefined) continue;
    const offset = md['byte_offset'];
    const turn_index = md['turn_index'];
    if (typeof offset !== 'number' || typeof turn_index !== 'number') continue;
    const path = evt.source.slice('fs:'.length);
    const cwdVal = md['cwd'];
    const cwd = typeof cwdVal === 'string' ? cwdVal : undefined;
    const cur = map.get(path);
    if (cur === undefined || offset > cur.offset) {
      // Older codex events written before the cwd-persistence fix may lack cwd on later turns.
      const entry: OffsetEntry = { offset, turn_index };
      if (cwd !== undefined) entry.cwd = cwd;
      else if (cur?.cwd !== undefined) entry.cwd = cur.cwd;
      map.set(path, entry);
    } else if (cwd !== undefined && cur.cwd === undefined) {
      map.set(path, { ...cur, cwd });
    }
  }
  return map;
}

export interface CodexExtractorOptions {
  sessionsPrefix?: string;
}

export interface CodexExtractorHandle {
  stop: () => Promise<void>;
}

export async function startCodexExtractor(
  storage: Storage,
  options: CodexExtractorOptions = {},
): Promise<CodexExtractorHandle> {
  const sessionsPrefix = options.sessionsPrefix ?? DEFAULT_SESSIONS_PREFIX;
  const offsetMap = await backfillOffsetMap(storage);

  let processing: Promise<void> = Promise.resolve();
  let stopped = false;

  function isJsonl(p: string): boolean {
    return p.startsWith(sessionsPrefix) && p.endsWith('.jsonl');
  }

  async function handleJsonlChange(path: string): Promise<void> {
    const cur = offsetMap.get(path) ?? { offset: 0, turn_index: -1 };
    const { turns, newOffset, cwd: passCwd } = await extractCodexTurns(
      path,
      cur.offset,
      cur.cwd,
    );
    let nextTurnIndex = cur.turn_index + 1;
    for (const turn of turns) {
      const metadata: Record<string, unknown> = {
        session_id: turn.session_id,
        turn_index: nextTurnIndex,
        mtime: turn.mtime,
        byte_offset: turn.byte_offset,
      };
      if (turn.had_tool_use) metadata['had_tool_use'] = true;
      if (turn.cwd !== undefined) {
        metadata['cwd'] = turn.cwd;
        metadata['repo_root'] = turn.cwd;
      }
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
    const nextCwd = passCwd ?? cur.cwd;
    const next: OffsetEntry = { offset: newOffset, turn_index: nextTurnIndex - 1 };
    if (nextCwd !== undefined) next.cwd = nextCwd;
    offsetMap.set(path, next);
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

  const watcher: FSWatcher = chokidar.watch(sessionsPrefix, {
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

  log.info('started', { sessionsPrefix });

  return {
    stop: async () => {
      stopped = true;
      await watcher.close();
      await processing;
      log.info('stopped', {});
    },
  };
}
