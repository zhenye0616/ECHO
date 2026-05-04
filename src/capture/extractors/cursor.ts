import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import chokidar, { type FSWatcher } from 'chokidar';
import { createLogger } from '../../logging/index.js';
import type { Storage } from '../../storage/interface.js';
import { processCandidate } from '../pipeline.js';
import { dedupStrings } from './_shared.js';

const log = createLogger('capture.cursor');

const HOME = homedir();
const DEFAULT_GLOBAL_DB = `${HOME}/Library/Application Support/Cursor/User/globalStorage/state.vscdb`;
const DEFAULT_WORKSPACE_PREFIX = `${HOME}/Library/Application Support/Cursor/User/workspaceStorage/`;

const BUBBLE_KEY_PREFIX = 'bubbleId:';
const COMPOSER_KEY_PREFIX = 'composerData:';

// Cursor encodes bubble role as a numeric `type` in cursorDiskKV.
const TYPE_USER = 1;
const TYPE_ASSISTANT = 2;

export interface ReferencedFile {
  path: string;
  language?: string;
}

// Tier-A context extracted from the bubble rows. Only the fields with content
// in real Cursor data are surfaced here (probed empirically against a live
// install: many bubble fields like `gitDiffs`, `toolResults`, `relevantFiles`
// were always empty and are therefore not extracted today).
export interface CursorTurnContext {
  // Files the user dragged into the chat (from user bubble's
  // attachedFileCodeChunksUris). Dedup'd, in the order they appeared.
  attached_files?: string[];
  // Files the assistant referenced or wrote code for (from each assistant
  // bubble's codeBlocks[]). Dedup'd by path. Cluster-aggregated.
  referenced_files?: ReferencedFile[];
  // Files the assistant deleted in this turn (from each assistant bubble's
  // deletedFiles[]). Dedup'd. Cluster-aggregated.
  deleted_files?: string[];
}

export interface CursorTurn {
  composer_id: string;
  user_bubble_id: string;
  // The last assistant bubble in the cluster — used as the resume checkpoint.
  assistant_bubble_id: string;
  // Every assistant bubble that followed the user, in chronological order.
  // Always at least 1; usually more (Cursor often splits a single assistant
  // response into a thinking-block bubble + answer bubble + tool-result
  // bubbles, all with type=2).
  assistant_bubble_ids: string[];
  workspace_id?: string;
  user_message: string;
  // Concatenated text of every assistant bubble in the cluster, joined by
  // a blank line. Empty bubbles are kept (they may carry richText elsewhere
  // that we don't extract today) but contribute no characters.
  assistant_message: string;
  assistant_created_at: number;
  mtime: number;
  // Aggregated structured context from the user + assistant cluster. Only
  // populated keys are present; omitted entirely if all categories are empty.
  context?: CursorTurnContext;
}

interface ComposerInfo {
  composer_id: string;
  createdAt: number;
  bubbleOrder: Map<string, number>; // bubble_id → position in fullConversationHeadersOnly
}

interface BubbleContext {
  attachedFiles: string[];
  referencedFiles: ReferencedFile[];
  deletedFiles: string[];
}

interface ParsedBubble {
  composer_id: string;
  bubble_id: string;
  role: 'user' | 'assistant';
  text: string;
  // Synthesized: composer.createdAt + bubble's position in fullConversationHeadersOnly.
  // Cursor does not store a per-bubble timestamp; the composer's createdAt + ordering
  // index gives a stable, monotonically increasing key for sort + checkpoint logic.
  createdAt: number;
  context: BubbleContext;
}

interface CursorDiskKVRow {
  key: string;
  value: string;
}

function parseBubbleKey(key: string): { composer_id: string; bubble_id: string } | null {
  if (!key.startsWith(BUBBLE_KEY_PREFIX)) return null;
  const rest = key.slice(BUBBLE_KEY_PREFIX.length);
  const colon = rest.indexOf(':');
  if (colon <= 0 || colon === rest.length - 1) return null;
  return {
    composer_id: rest.slice(0, colon),
    bubble_id: rest.slice(colon + 1),
  };
}

function parseComposerKey(key: string): string | null {
  if (!key.startsWith(COMPOSER_KEY_PREFIX)) return null;
  const id = key.slice(COMPOSER_KEY_PREFIX.length);
  return id.length > 0 ? id : null;
}

function parseComposerRow(row: CursorDiskKVRow): ComposerInfo | null {
  const composer_id = parseComposerKey(row.key);
  if (composer_id === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(row.value);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const createdAt = v['createdAt'];
  const headers = v['fullConversationHeadersOnly'];
  if (typeof createdAt !== 'number' || !Array.isArray(headers)) return null;
  const bubbleOrder = new Map<string, number>();
  for (let i = 0; i < headers.length; i += 1) {
    const h = headers[i];
    if (typeof h === 'object' && h !== null) {
      const bid = (h as Record<string, unknown>)['bubbleId'];
      if (typeof bid === 'string') {
        bubbleOrder.set(bid, i);
      }
    }
  }
  return { composer_id, createdAt, bubbleOrder };
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function extractAttachedFiles(v: Record<string, unknown>): string[] {
  const out: string[] = [];
  const arr = v['attachedFileCodeChunksUris'];
  if (!Array.isArray(arr)) return out;
  for (const entry of arr) {
    if (typeof entry !== 'object' || entry === null) continue;
    const path = asString((entry as Record<string, unknown>)['path']);
    if (path !== undefined) out.push(path);
  }
  return out;
}

function extractReferencedFiles(v: Record<string, unknown>): ReferencedFile[] {
  const out: ReferencedFile[] = [];
  const arr = v['codeBlocks'];
  if (!Array.isArray(arr)) return out;
  for (const entry of arr) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const uri = e['uri'];
    if (typeof uri !== 'object' || uri === null) continue;
    const path = asString((uri as Record<string, unknown>)['path']);
    if (path === undefined) continue;
    const ref: ReferencedFile = { path };
    const language = asString(e['languageId']);
    if (language !== undefined) ref.language = language;
    out.push(ref);
  }
  return out;
}

function extractDeletedFiles(v: Record<string, unknown>): string[] {
  const out: string[] = [];
  const arr = v['deletedFiles'];
  if (!Array.isArray(arr)) return out;
  for (const entry of arr) {
    if (typeof entry !== 'object' || entry === null) continue;
    const uri = (entry as Record<string, unknown>)['uri'];
    if (typeof uri !== 'object' || uri === null) continue;
    const path = asString((uri as Record<string, unknown>)['path']);
    if (path !== undefined) out.push(path);
  }
  return out;
}

function parseBubbleRow(
  row: CursorDiskKVRow,
  composers: Map<string, ComposerInfo>,
): ParsedBubble | null {
  const parsedKey = parseBubbleKey(row.key);
  if (parsedKey === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(row.value);
  } catch {
    log.warn('unrecognized_bubble_shape', { key: row.key, reason: 'json_parse' });
    return null;
  }
  if (typeof value !== 'object' || value === null) {
    log.warn('unrecognized_bubble_shape', { key: row.key, reason: 'not_object' });
    return null;
  }
  const v = value as Record<string, unknown>;
  const type = v['type'];
  const text = v['text'];
  if (type !== TYPE_USER && type !== TYPE_ASSISTANT) {
    log.warn('unrecognized_bubble_shape', {
      key: row.key,
      reason: 'unknown_type',
      type: typeof type === 'number' ? type : null,
    });
    return null;
  }
  if (typeof text !== 'string') {
    log.warn('unrecognized_bubble_shape', { key: row.key, reason: 'missing_text' });
    return null;
  }
  const composer = composers.get(parsedKey.composer_id);
  if (composer === undefined) {
    log.warn('unrecognized_bubble_shape', { key: row.key, reason: 'no_composer_row' });
    return null;
  }
  const order = composer.bubbleOrder.get(parsedKey.bubble_id);
  if (order === undefined) {
    log.warn('unrecognized_bubble_shape', {
      key: row.key,
      reason: 'not_in_composer_headers',
    });
    return null;
  }
  return {
    composer_id: parsedKey.composer_id,
    bubble_id: parsedKey.bubble_id,
    role: type === TYPE_USER ? 'user' : 'assistant',
    text,
    createdAt: composer.createdAt + order,
    context: {
      attachedFiles: extractAttachedFiles(v),
      referencedFiles: extractReferencedFiles(v),
      deletedFiles: extractDeletedFiles(v),
    },
  };
}

function dedupReferencedFiles(values: ReferencedFile[]): ReferencedFile[] {
  const seen = new Map<string, ReferencedFile>();
  for (const r of values) {
    const existing = seen.get(r.path);
    if (existing === undefined) {
      seen.set(r.path, r);
    } else if (existing.language === undefined && r.language !== undefined) {
      // Promote a previously-language-less entry to one with language.
      seen.set(r.path, r);
    }
  }
  return [...seen.values()];
}

function buildTurnContext(
  user: ParsedBubble,
  assistantCluster: ParsedBubble[],
): CursorTurnContext | undefined {
  const attached = dedupStrings([
    ...user.context.attachedFiles,
    ...assistantCluster.flatMap((b) => b.context.attachedFiles),
  ]);
  const referenced = dedupReferencedFiles([
    ...user.context.referencedFiles,
    ...assistantCluster.flatMap((b) => b.context.referencedFiles),
  ]);
  const deleted = dedupStrings([
    ...user.context.deletedFiles,
    ...assistantCluster.flatMap((b) => b.context.deletedFiles),
  ]);
  if (attached.length === 0 && referenced.length === 0 && deleted.length === 0) {
    return undefined;
  }
  const out: CursorTurnContext = {};
  if (attached.length > 0) out.attached_files = attached;
  if (referenced.length > 0) out.referenced_files = referenced;
  if (deleted.length > 0) out.deleted_files = deleted;
  return out;
}

function flattenContextFiles(ctx: CursorTurnContext): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (p: string): void => {
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  };
  for (const p of ctx.attached_files ?? []) push(p);
  for (const r of ctx.referenced_files ?? []) push(r.path);
  for (const p of ctx.deleted_files ?? []) push(p);
  return out;
}

async function safeMtimeMs(path: string): Promise<number> {
  try {
    const s = await stat(path);
    return s.mtimeMs;
  } catch {
    return Date.now();
  }
}

export async function extractCursorTurns(
  globalDbPath: string,
  lastSeenBubbleIdPerComposer: Map<string, string>,
): Promise<CursorTurn[]> {
  let db: Database.Database;
  try {
    db = new Database(globalDbPath, { readonly: true, fileMustExist: true });
  } catch (err) {
    log.warn('open_failed', { path: globalDbPath, message: (err as Error).message });
    return [];
  }

  let bubbleRows: CursorDiskKVRow[];
  let composerRows: CursorDiskKVRow[];
  try {
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cursorDiskKV'")
      .get();
    if (tableExists === undefined) {
      log.warn('schema_unrecognized', { path: globalDbPath, reason: 'no_cursorDiskKV_table' });
      db.close();
      return [];
    }
    composerRows = db
      .prepare("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'")
      .all() as CursorDiskKVRow[];
    bubbleRows = db
      .prepare("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'")
      .all() as CursorDiskKVRow[];
  } catch (err) {
    log.warn('query_failed', { path: globalDbPath, message: (err as Error).message });
    db.close();
    return [];
  }
  db.close();

  const composers = new Map<string, ComposerInfo>();
  for (const row of composerRows) {
    const info = parseComposerRow(row);
    if (info !== null) composers.set(info.composer_id, info);
  }

  if (bubbleRows.length === 0) {
    log.warn('no_bubble_keys', { path: globalDbPath });
    return [];
  }

  const mtime = await safeMtimeMs(globalDbPath);

  const byComposer = new Map<string, ParsedBubble[]>();
  for (const row of bubbleRows) {
    const parsed = parseBubbleRow(row, composers);
    if (parsed === null) continue;
    let arr = byComposer.get(parsed.composer_id);
    if (arr === undefined) {
      arr = [];
      byComposer.set(parsed.composer_id, arr);
    }
    arr.push(parsed);
  }

  const turns: CursorTurn[] = [];
  for (const [composer_id, bubbles] of byComposer) {
    bubbles.sort((a, b) => a.createdAt - b.createdAt);

    let startIdx = 0;
    const checkpoint = lastSeenBubbleIdPerComposer.get(composer_id);
    if (checkpoint !== undefined) {
      const ix = bubbles.findIndex((b) => b.bubble_id === checkpoint);
      if (ix < 0) {
        log.warn('checkpoint_not_found', { composer_id, checkpoint });
        continue;
      }
      startIdx = ix + 1;
    }

    let i = startIdx;
    while (i < bubbles.length) {
      const cur = bubbles[i]!;
      if (cur.role === 'assistant') {
        // Orphan assistant — no preceding user. Cursor sometimes writes these
        // for system / synthesized bubbles. Drop with a warn rather than
        // pairing into a malformed turn.
        log.warn('orphan_assistant_bubble', { composer_id, bubble_id: cur.bubble_id });
        i += 1;
        continue;
      }
      // cur is user. Collect every consecutive assistant bubble until we hit
      // the next user bubble (or end of array). Cursor splits a single
      // logical assistant response into multiple type=2 bubbles in many
      // flows — pairing only the first would silently drop the rest.
      const assistantCluster: ParsedBubble[] = [];
      let j = i + 1;
      while (j < bubbles.length && bubbles[j]!.role === 'assistant') {
        assistantCluster.push(bubbles[j]!);
        j += 1;
      }
      if (assistantCluster.length === 0) {
        // User bubble with no assistant response yet — incomplete turn.
        // Leave it for the next pass once Cursor finishes writing.
        break;
      }
      const last = assistantCluster[assistantCluster.length - 1]!;
      const turn: CursorTurn = {
        composer_id,
        user_bubble_id: cur.bubble_id,
        assistant_bubble_id: last.bubble_id,
        assistant_bubble_ids: assistantCluster.map((b) => b.bubble_id),
        user_message: cur.text,
        assistant_message: assistantCluster.map((b) => b.text).join('\n\n'),
        assistant_created_at: last.createdAt,
        mtime,
      };
      const context = buildTurnContext(cur, assistantCluster);
      if (context !== undefined) turn.context = context;
      turns.push(turn);
      i = j;
    }
  }

  turns.sort((a, b) => a.assistant_created_at - b.assistant_created_at);
  return turns;
}

async function backfillLastSeenMap(
  storage: Storage,
  globalDbPath: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const events = await storage.query({ source: `fs:${globalDbPath}` });
  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const evt of events) {
    const md = evt.metadata;
    if (md === undefined) continue;
    const composer_id = md['composer_id'];
    const assistant_bubble_id = md['assistant_bubble_id'];
    if (typeof composer_id === 'string' && typeof assistant_bubble_id === 'string') {
      map.set(composer_id, assistant_bubble_id);
    }
  }
  return map;
}

function workspaceHashFromPath(dbPath: string, prefix: string): string | undefined {
  if (!dbPath.startsWith(prefix)) return undefined;
  const rest = dbPath.slice(prefix.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return undefined;
  return rest.slice(0, slash);
}

function refreshComposerWorkspaceMap(
  workspaceDbPath: string,
  workspacePrefix: string,
  map: Map<string, string>,
): void {
  const workspaceId = workspaceHashFromPath(workspaceDbPath, workspacePrefix);
  if (workspaceId === undefined) return;

  let db: Database.Database;
  try {
    db = new Database(workspaceDbPath, { readonly: true, fileMustExist: true });
  } catch (err) {
    log.warn('workspace_db_open_failed', {
      path: workspaceDbPath,
      message: (err as Error).message,
    });
    return;
  }
  try {
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ItemTable'")
      .get();
    if (tableExists === undefined) return;
    const row = db
      .prepare("SELECT value FROM ItemTable WHERE key = 'composer.composerData'")
      .get() as { value: string } | undefined;
    if (row === undefined) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.value);
    } catch {
      return;
    }
    if (typeof parsed !== 'object' || parsed === null) return;
    const allComposers = (parsed as Record<string, unknown>)['allComposers'];
    if (!Array.isArray(allComposers)) return;
    for (const c of allComposers) {
      if (typeof c === 'object' && c !== null) {
        const id = (c as Record<string, unknown>)['composerId'];
        if (typeof id === 'string') {
          map.set(id, workspaceId);
        }
      }
    }
  } catch (err) {
    log.warn('workspace_inference_failed', {
      path: workspaceDbPath,
      message: (err as Error).message,
    });
  } finally {
    db.close();
  }
}

export interface CursorExtractorOptions {
  globalDbPath?: string;
  workspacePrefix?: string;
}

export interface CursorExtractorHandle {
  stop: () => Promise<void>;
}

export async function startCursorExtractor(
  storage: Storage,
  options: CursorExtractorOptions = {},
): Promise<CursorExtractorHandle> {
  const globalDbPath = options.globalDbPath ?? DEFAULT_GLOBAL_DB;
  const workspacePrefix = options.workspacePrefix ?? DEFAULT_WORKSPACE_PREFIX;

  const lastSeenMap = await backfillLastSeenMap(storage, globalDbPath);
  const composerToWorkspace = new Map<string, string>();

  let processing: Promise<void> = Promise.resolve();
  let stopped = false;
  let debounceTimer: NodeJS.Timeout | null = null;
  const DEBOUNCE_MS = 300;

  function isGlobalDbFamily(p: string): boolean {
    return p === globalDbPath || p === `${globalDbPath}-wal` || p === `${globalDbPath}-shm`;
  }

  function isWorkspaceDb(p: string): boolean {
    return p.startsWith(workspacePrefix) && p.endsWith('state.vscdb');
  }

  async function handleGlobalChange(): Promise<void> {
    const turns = await extractCursorTurns(globalDbPath, lastSeenMap);
    for (const turn of turns) {
      const ws = composerToWorkspace.get(turn.composer_id);
      const metadata: Record<string, unknown> = {
        composer_id: turn.composer_id,
        session_id: turn.composer_id,
        user_bubble_id: turn.user_bubble_id,
        assistant_bubble_id: turn.assistant_bubble_id,
        assistant_bubble_ids: turn.assistant_bubble_ids,
        mtime: turn.mtime,
      };
      if (ws !== undefined) metadata['workspace_id'] = ws;
      if (turn.context !== undefined) {
        metadata['context'] = turn.context;
        const filesReferenced = flattenContextFiles(turn.context);
        if (filesReferenced.length > 0) metadata['files_referenced'] = filesReferenced;
      }
      const candidate = {
        source: `fs:${globalDbPath}`,
        timestamp: new Date(turn.assistant_created_at).toISOString(),
        content: `USER: ${turn.user_message}\n\nASSISTANT: ${turn.assistant_message}`,
        metadata,
      };
      log.info('candidate', { composer_id: turn.composer_id });
      const result = await processCandidate(candidate, storage);
      if (result.accepted) {
        lastSeenMap.set(turn.composer_id, turn.assistant_bubble_id);
      } else {
        log.warn('candidate_rejected', {
          reason: result.reason,
          composer_id: turn.composer_id,
        });
      }
    }
  }

  function handleWorkspaceChange(path: string): void {
    refreshComposerWorkspaceMap(path, workspacePrefix, composerToWorkspace);
  }

  function schedule(work: () => Promise<void> | void): void {
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

  function scheduleGlobalChange(): void {
    if (debounceTimer !== null) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      schedule(() => handleGlobalChange());
    }, DEBOUNCE_MS);
  }

  const globalDbDir = dirname(globalDbPath);
  const watcher: FSWatcher = chokidar.watch([globalDbDir, workspacePrefix], {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: false,
  });

  function dispatch(p: string): void {
    if (isGlobalDbFamily(p)) {
      scheduleGlobalChange();
    } else if (isWorkspaceDb(p)) {
      schedule(() => handleWorkspaceChange(p));
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

  log.info('started', { globalDbPath, workspacePrefix });

  return {
    stop: async () => {
      stopped = true;
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      await watcher.close();
      await processing;
      log.info('stopped', {});
    },
  };
}
