import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import chokidar, { type FSWatcher } from 'chokidar';
import { createLogger } from '../../logging/index.js';
import type { Storage } from '../../storage/interface.js';
import { processCandidate } from '../pipeline.js';

const log = createLogger('capture.cursor');

const HOME = homedir();
const DEFAULT_GLOBAL_DB = `${HOME}/Library/Application Support/Cursor/User/globalStorage/state.vscdb`;
const DEFAULT_WORKSPACE_PREFIX = `${HOME}/Library/Application Support/Cursor/User/workspaceStorage/`;

const BUBBLE_KEY_PREFIX = 'bubbleId:';

export interface CursorTurn {
  composer_id: string;
  user_bubble_id: string;
  assistant_bubble_id: string;
  workspace_id?: string;
  user_message: string;
  assistant_message: string;
  mtime: number;
}

interface ParsedBubble {
  composer_id: string;
  bubble_id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
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

function parseBubbleRow(row: CursorDiskKVRow): ParsedBubble | null {
  const parsedKey = parseBubbleKey(row.key);
  if (parsedKey === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(row.value);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const role = v['role'];
  const text = v['text'];
  const createdAt = v['createdAt'];
  if (role !== 'user' && role !== 'assistant') return null;
  if (typeof text !== 'string') return null;
  if (typeof createdAt !== 'number') return null;
  return {
    composer_id: parsedKey.composer_id,
    bubble_id: parsedKey.bubble_id,
    role,
    text,
    createdAt,
  };
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

  let rows: CursorDiskKVRow[];
  try {
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cursorDiskKV'")
      .get();
    if (tableExists === undefined) {
      log.warn('schema_unrecognized', { path: globalDbPath, reason: 'no_cursorDiskKV_table' });
      db.close();
      return [];
    }
    rows = db
      .prepare("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'")
      .all() as CursorDiskKVRow[];
  } catch (err) {
    log.warn('query_failed', { path: globalDbPath, message: (err as Error).message });
    db.close();
    return [];
  }
  db.close();

  if (rows.length === 0) {
    log.warn('no_bubble_keys', { path: globalDbPath });
    return [];
  }

  const mtime = await safeMtimeMs(globalDbPath);

  const byComposer = new Map<string, ParsedBubble[]>();
  for (const row of rows) {
    const parsed = parseBubbleRow(row);
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
        log.warn('orphan_assistant_bubble', { composer_id, bubble_id: cur.bubble_id });
        i += 1;
        continue;
      }
      const next = bubbles[i + 1];
      if (next === undefined || next.role !== 'assistant') {
        break;
      }
      turns.push({
        composer_id,
        user_bubble_id: cur.bubble_id,
        assistant_bubble_id: next.bubble_id,
        user_message: cur.text,
        assistant_message: next.text,
        mtime,
      });
      i += 2;
    }
  }

  turns.sort((a, b) => a.mtime - b.mtime);
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

  function isWorkspaceDb(p: string): boolean {
    return p.startsWith(workspacePrefix) && p.endsWith('state.vscdb');
  }

  async function handleGlobalChange(): Promise<void> {
    const turns = await extractCursorTurns(globalDbPath, lastSeenMap);
    for (const turn of turns) {
      const ws = composerToWorkspace.get(turn.composer_id);
      const metadata: Record<string, unknown> = {
        composer_id: turn.composer_id,
        user_bubble_id: turn.user_bubble_id,
        assistant_bubble_id: turn.assistant_bubble_id,
        mtime: turn.mtime,
      };
      if (ws !== undefined) metadata['workspace_id'] = ws;
      const candidate = {
        source: `fs:${globalDbPath}`,
        timestamp: new Date(turn.mtime).toISOString(),
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

  const globalDbDir = dirname(globalDbPath);
  const watcher: FSWatcher = chokidar.watch([globalDbDir, workspacePrefix], {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: false,
  });

  function dispatch(p: string): void {
    if (p === globalDbPath) {
      schedule(() => handleGlobalChange());
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
      await watcher.close();
      await processing;
      log.info('stopped', {});
    },
  };
}
