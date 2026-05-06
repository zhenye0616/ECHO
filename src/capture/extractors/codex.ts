import { open, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename } from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { isNonEmptyString } from '../../guards.js';
import { createLogger } from '../../logging/index.js';
import type { Storage } from '../../storage/interface.js';
import { probeGitState } from '../git-state.js';
import { processCandidate } from '../pipeline.js';
import { bootScanJsonl } from './_shared.js';
import {
  buildToolCall,
  MAX_TOOL_CALLS_PER_TURN,
  truncateThinking,
  type GitState,
  type ToolCall,
} from './_turn_meta.js';

const log = createLogger('capture.codex');

const HOME = homedir();
const DEFAULT_SESSIONS_PREFIX = `${HOME}/.codex/sessions/`;

export interface CodexGitMeta {
  sha?: string;
  branch?: string;
  origin_url?: string;
}

export interface CodexSessionMeta {
  source?: string;
  cli_version?: string;
  model_provider?: string;
  model?: string;
  reasoning_effort?: string;
  personality?: string;
  approval_policy?: string;
  sandbox_policy_type?: string;
}

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
  git?: CodexGitMeta;
  codex?: CodexSessionMeta;
  tool_calls?: ToolCall[];
  thinking?: string;
  git_state?: GitState;
}

export interface ExtractCodexResult {
  turns: CodexTurn[];
  newOffset: number;
  cwd?: string;
  git?: CodexGitMeta;
  codex?: CodexSessionMeta;
}

interface ParsedLine {
  kind: 'message' | 'tool_call' | 'tool_output' | 'reasoning' | 'session_meta' | 'turn_context' | 'other';
  role?: 'user' | 'assistant';
  text?: string;
  cwd?: string;
  timestamp?: string;
  git?: CodexGitMeta;
  // session_meta-derived fields (subset of CodexSessionMeta)
  source?: string;
  cli_version?: string;
  model_provider?: string;
  // turn_context-derived fields (subset of CodexSessionMeta)
  model?: string;
  reasoning_effort?: string;
  personality?: string;
  approval_policy?: string;
  sandbox_policy_type?: string;
  // Tool / reasoning payload extras
  tool_call_name?: string;
  tool_call_args?: string;
  tool_call_id?: string;
  tool_output?: string;
  tool_is_error?: boolean;
  reasoning_text?: string;
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
      const p = payload as Record<string, unknown>;
      const c = p['cwd'];
      if (typeof c === 'string' && c.length > 0) out.cwd = c;
      const src = p['source'];
      if (typeof src === 'string' && src.length > 0) out.source = src;
      const cv = p['cli_version'];
      if (typeof cv === 'string' && cv.length > 0) out.cli_version = cv;
      const mp = p['model_provider'];
      if (typeof mp === 'string' && mp.length > 0) out.model_provider = mp;
      const git = p['git'];
      if (typeof git === 'object' && git !== null) {
        const g = git as Record<string, unknown>;
        const gm: CodexGitMeta = {};
        const sha = g['commit_hash'];
        if (typeof sha === 'string' && sha.length > 0) gm.sha = sha;
        const br = g['branch'];
        if (typeof br === 'string' && br.length > 0) gm.branch = br;
        const url = g['repository_url'];
        if (typeof url === 'string' && url.length > 0) gm.origin_url = url;
        if (Object.keys(gm).length > 0) out.git = gm;
      }
    }
    return out;
  }

  if (t === 'turn_context') {
    const payload = obj['payload'];
    const out: ParsedLine = { kind: 'turn_context', timestamp };
    if (typeof payload === 'object' && payload !== null) {
      const p = payload as Record<string, unknown>;
      const c = p['cwd'];
      if (typeof c === 'string' && c.length > 0) out.cwd = c;
      const m = p['model'];
      if (typeof m === 'string' && m.length > 0) out.model = m;
      const eff = p['effort'];
      if (typeof eff === 'string' && eff.length > 0) out.reasoning_effort = eff;
      const pers = p['personality'];
      if (typeof pers === 'string' && pers.length > 0) out.personality = pers;
      const ap = p['approval_policy'];
      if (typeof ap === 'string' && ap.length > 0) out.approval_policy = ap;
      const sp = p['sandbox_policy'];
      if (typeof sp === 'object' && sp !== null) {
        const spt = (sp as Record<string, unknown>)['type'];
        if (typeof spt === 'string' && spt.length > 0) out.sandbox_policy_type = spt;
      }
    }
    return out;
  }

  if (t !== 'response_item') return { kind: 'other', timestamp };
  const payload = obj['payload'];
  if (typeof payload !== 'object' || payload === null) return { kind: 'other', timestamp };
  const p = payload as Record<string, unknown>;
  const ptype = p['type'];

  if (ptype === 'reasoning') {
    const out: ParsedLine = { kind: 'reasoning', timestamp };
    const summary = p['summary'];
    if (Array.isArray(summary)) {
      const parts: string[] = [];
      for (const s of summary) {
        if (typeof s === 'object' && s !== null) {
          const sb = s as Record<string, unknown>;
          if (typeof sb['text'] === 'string') parts.push(sb['text']);
        } else if (typeof s === 'string') {
          parts.push(s);
        }
      }
      if (parts.length > 0) out.reasoning_text = parts.join('\n');
    } else if (typeof p['text'] === 'string') {
      out.reasoning_text = p['text'];
    }
    return out;
  }

  if (ptype === 'function_call' || ptype === 'custom_tool_call') {
    const out: ParsedLine = { kind: 'tool_call', timestamp };
    if (isNonEmptyString(p['name'])) out.tool_call_name = p['name'];
    const args = p['arguments'];
    if (typeof args === 'string') out.tool_call_args = args;
    else if (args !== undefined && args !== null) out.tool_call_args = JSON.stringify(args);
    if (isNonEmptyString(p['call_id'])) out.tool_call_id = p['call_id'];
    return out;
  }

  if (ptype === 'function_call_output' || ptype === 'custom_tool_call_output') {
    const out: ParsedLine = { kind: 'tool_output', timestamp };
    if (isNonEmptyString(p['call_id'])) out.tool_call_id = p['call_id'];
    const o = p['output'];
    if (typeof o === 'string') {
      out.tool_output = o;
    } else if (typeof o === 'object' && o !== null) {
      const od = o as Record<string, unknown>;
      if (typeof od['content'] === 'string') out.tool_output = od['content'];
      else if (typeof od['text'] === 'string') out.tool_output = od['text'];
      const md = od['metadata'];
      if (typeof md === 'object' && md !== null) {
        const ec = (md as Record<string, unknown>)['exit_code'];
        if (typeof ec === 'number' && ec !== 0) out.tool_is_error = true;
      }
    }
    if (out.tool_output !== undefined && /Process exited with code (?!0\b)\d+/.test(out.tool_output)) {
      out.tool_is_error = true;
    }
    return out;
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

interface PendingToolCall {
  name: string;
  args?: string;
  call_id?: string;
  output?: string;
  is_error?: boolean;
}

interface PendingCluster {
  userText: string;
  assistantTexts: string[];
  assistantLastLineEndOffset: number;
  hadTool: boolean;
  timestamp: string;
  cwd?: string;
  git?: CodexGitMeta;
  codex?: CodexSessionMeta;
  toolCalls: PendingToolCall[];
  thinking: string[];
}

function mergeCodexMeta(
  base: CodexSessionMeta | undefined,
  patch: Partial<CodexSessionMeta>,
): CodexSessionMeta | undefined {
  const next: CodexSessionMeta = { ...(base ?? {}) };
  let changed = false;
  for (const [k, v] of Object.entries(patch) as [keyof CodexSessionMeta, string | undefined][]) {
    if (typeof v === 'string' && v.length > 0 && next[k] !== v) {
      next[k] = v;
      changed = true;
    }
  }
  if (!changed && base !== undefined) return base;
  return Object.keys(next).length > 0 ? next : undefined;
}

export interface ExtractCodexInput {
  lastKnownCwd?: string;
  lastKnownGit?: CodexGitMeta;
  lastKnownCodex?: CodexSessionMeta;
}

export async function extractCodexTurns(
  jsonlPath: string,
  lastByteOffset: number,
  lastKnownCwdOrInput?: string | ExtractCodexInput,
): Promise<ExtractCodexResult> {
  const input: ExtractCodexInput =
    typeof lastKnownCwdOrInput === 'string'
      ? { lastKnownCwd: lastKnownCwdOrInput }
      : lastKnownCwdOrInput ?? {};
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
  let cwd: string | undefined = input.lastKnownCwd;
  let git: CodexGitMeta | undefined = input.lastKnownGit;
  let codexMeta: CodexSessionMeta | undefined = input.lastKnownCodex;
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
    if (pending.git !== undefined) turn.git = pending.git;
    if (pending.codex !== undefined) turn.codex = pending.codex;
    if (pending.toolCalls.length > 0) {
      turn.tool_calls = pending.toolCalls
        .slice(0, MAX_TOOL_CALLS_PER_TURN)
        .map((p) =>
          buildToolCall({
            name: p.name,
            call_id: p.call_id,
            argsRaw: p.args,
            outputRaw: p.output,
            is_error: p.is_error,
          }),
        );
    }
    if (pending.thinking.length > 0) {
      const t = truncateThinking(pending.thinking.join('\n\n'));
      turn.thinking = t.value;
    }
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
      if (parsed.git !== undefined) git = { ...(git ?? {}), ...parsed.git };
      codexMeta = mergeCodexMeta(codexMeta, {
        source: parsed.source,
        cli_version: parsed.cli_version,
        model_provider: parsed.model_provider,
      });
      lineStartOffset = lineEndOffset;
      continue;
    }

    if (parsed.kind === 'turn_context') {
      if (parsed.cwd !== undefined) cwd = parsed.cwd;
      codexMeta = mergeCodexMeta(codexMeta, {
        model: parsed.model,
        reasoning_effort: parsed.reasoning_effort,
        personality: parsed.personality,
        approval_policy: parsed.approval_policy,
        sandbox_policy_type: parsed.sandbox_policy_type,
      });
      lineStartOffset = lineEndOffset;
      continue;
    }

    if (parsed.kind === 'tool_call') {
      if (pending !== null && pending.toolCalls.length < MAX_TOOL_CALLS_PER_TURN) {
        pending.hadTool = true;
        const tc: PendingToolCall = { name: parsed.tool_call_name ?? '?' };
        if (parsed.tool_call_args !== undefined) tc.args = parsed.tool_call_args;
        if (parsed.tool_call_id !== undefined) tc.call_id = parsed.tool_call_id;
        pending.toolCalls.push(tc);
      } else if (pending !== null) {
        pending.hadTool = true;
      }
      lineStartOffset = lineEndOffset;
      continue;
    }

    if (parsed.kind === 'tool_output') {
      if (pending !== null) {
        pending.hadTool = true;
        // Match to the most recent tool_call with the same call_id (or, lacking
        // an id, the most recent un-resolved call). Single forward scan.
        for (let i = pending.toolCalls.length - 1; i >= 0; i--) {
          const tc = pending.toolCalls[i]!;
          if (tc.output !== undefined) continue;
          if (parsed.tool_call_id !== undefined && tc.call_id !== parsed.tool_call_id) continue;
          if (parsed.tool_output !== undefined) tc.output = parsed.tool_output;
          if (parsed.tool_is_error === true) tc.is_error = true;
          break;
        }
      }
      lineStartOffset = lineEndOffset;
      continue;
    }

    if (parsed.kind === 'reasoning') {
      if (pending !== null && parsed.reasoning_text !== undefined) {
        pending.thinking.push(parsed.reasoning_text);
      }
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
        toolCalls: [],
        thinking: [],
      };
      if (cwd !== undefined) pending.cwd = cwd;
      if (git !== undefined) pending.git = git;
      if (codexMeta !== undefined) pending.codex = codexMeta;
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
  if (git !== undefined) result.git = git;
  if (codexMeta !== undefined) result.codex = codexMeta;
  return result;
}

interface OffsetEntry {
  offset: number;
  turn_index: number;
  cwd?: string;
  git?: CodexGitMeta;
  codex?: CodexSessionMeta;
}

function readGitMetaFromMd(md: Record<string, unknown>): CodexGitMeta | undefined {
  const raw = md['git'];
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  const out: CodexGitMeta = {};
  if (typeof r['sha'] === 'string') out.sha = r['sha'] as string;
  if (typeof r['branch'] === 'string') out.branch = r['branch'] as string;
  if (typeof r['origin_url'] === 'string') out.origin_url = r['origin_url'] as string;
  return Object.keys(out).length > 0 ? out : undefined;
}

function readCodexMetaFromMd(md: Record<string, unknown>): CodexSessionMeta | undefined {
  const raw = md['codex'];
  if (typeof raw !== 'object' || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  const out: CodexSessionMeta = {};
  for (const k of [
    'source',
    'cli_version',
    'model_provider',
    'model',
    'reasoning_effort',
    'personality',
    'approval_policy',
    'sandbox_policy_type',
  ] as const) {
    const v = r[k];
    if (typeof v === 'string' && v.length > 0) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
    const git = readGitMetaFromMd(md);
    const codex = readCodexMetaFromMd(md);
    const cur = map.get(path);
    if (cur === undefined || offset > cur.offset) {
      // Older codex events written before the metadata-persistence fix may lack
      // these on later turns; carry forward whatever we've already learned.
      const entry: OffsetEntry = { offset, turn_index };
      entry.cwd = cwd ?? cur?.cwd;
      entry.git = git ?? cur?.git;
      entry.codex = codex ?? cur?.codex;
      if (entry.cwd === undefined) delete entry.cwd;
      if (entry.git === undefined) delete entry.git;
      if (entry.codex === undefined) delete entry.codex;
      map.set(path, entry);
    } else {
      // Older event from same file: enrich a sparse current entry if helpful.
      const merged: OffsetEntry = { ...cur };
      if (merged.cwd === undefined && cwd !== undefined) merged.cwd = cwd;
      if (merged.git === undefined && git !== undefined) merged.git = git;
      if (merged.codex === undefined && codex !== undefined) merged.codex = codex;
      map.set(path, merged);
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
    const extractInput: ExtractCodexInput = {};
    if (cur.cwd !== undefined) extractInput.lastKnownCwd = cur.cwd;
    if (cur.git !== undefined) extractInput.lastKnownGit = cur.git;
    if (cur.codex !== undefined) extractInput.lastKnownCodex = cur.codex;
    const { turns, newOffset, cwd: passCwd, git: passGit, codex: passCodex } =
      await extractCodexTurns(path, cur.offset, extractInput);
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
      if (turn.git !== undefined) metadata['git'] = turn.git;
      if (turn.codex !== undefined) metadata['codex'] = turn.codex;
      if (turn.tool_calls !== undefined) metadata['tool_calls'] = turn.tool_calls;
      if (turn.thinking !== undefined) metadata['thinking'] = turn.thinking;
      const gitState = await probeGitState(turn.cwd, turn.timestamp);
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
    const nextCwd = passCwd ?? cur.cwd;
    const nextGit = passGit ?? cur.git;
    const nextCodex = passCodex ?? cur.codex;
    const next: OffsetEntry = { offset: newOffset, turn_index: nextTurnIndex - 1 };
    if (nextCwd !== undefined) next.cwd = nextCwd;
    if (nextGit !== undefined) next.git = nextGit;
    if (nextCodex !== undefined) next.codex = nextCodex;
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

  await bootScanJsonl(sessionsPrefix, schedule, handleJsonlChange, log);

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
