import chokidar, { type FSWatcher } from 'chokidar';
import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { createLogger } from '../../logging/index.js';
import type { Storage } from '../../storage/interface.js';
import { processCandidate } from '../pipeline.js';

const log = createLogger('capture.surfaces.fs');

const HOME = homedir();
const CURSOR_PREFIX = `${HOME}/Library/Application Support/Cursor/User/workspaceStorage/`;
const CLAUDE_PREFIX = `${HOME}/.claude/projects/`;

export type FsFileKind = 'cursor-workspace' | 'claude-project';

export function classifyKind(absPath: string): FsFileKind | undefined {
  if (absPath.startsWith(CURSOR_PREFIX)) return 'cursor-workspace';
  if (absPath.startsWith(CLAUDE_PREFIX)) return 'claude-project';
  return undefined;
}

function expandTilde(p: string): string {
  if (p === '~') return HOME;
  if (p.startsWith('~/')) return HOME + p.slice(1);
  return p;
}

export interface FsWatcherHandle {
  stop: () => Promise<void>;
}

type EventType = 'add' | 'change' | 'unlink';

interface FsEventContent {
  event_type: EventType;
  path: string;
  mtime?: string;
  size?: number;
}

interface FsEventMetadata extends Record<string, unknown> {
  surface: 'fs';
  file_kind?: FsFileKind;
}

async function emitCandidate(
  event_type: EventType,
  absPath: string,
  storage: Storage,
): Promise<void> {
  log.debug('chokidar_event', { event_type, path: absPath });

  const content: FsEventContent = { event_type, path: absPath };
  if (event_type !== 'unlink') {
    try {
      const s = await stat(absPath);
      content.mtime = s.mtime.toISOString();
      content.size = s.size;
    } catch {
      // file may have been removed between event and stat; emit without stat
    }
  }

  const file_kind = classifyKind(absPath);
  const metadata: FsEventMetadata = { surface: 'fs' };
  if (file_kind !== undefined) metadata.file_kind = file_kind;

  const candidate = {
    source: `fs:${absPath}`,
    timestamp: new Date().toISOString(),
    content: JSON.stringify(content),
    metadata,
  };

  log.info('candidate', { event_type, path: absPath, file_kind });
  const result = await processCandidate(candidate, storage);
  if (!result.accepted) {
    log.debug('rejected', { reason: result.reason, path: absPath });
  }
}

export async function startFsWatcher(
  paths: ReadonlyArray<string>,
  storage: Storage,
): Promise<FsWatcherHandle> {
  const expanded = paths.map(expandTilde);
  const watcher: FSWatcher = chokidar.watch(expanded, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: false,
  });

  watcher.on('add', (p: string) => {
    void emitCandidate('add', p, storage);
  });
  watcher.on('change', (p: string) => {
    void emitCandidate('change', p, storage);
  });
  watcher.on('unlink', (p: string) => {
    void emitCandidate('unlink', p, storage);
  });
  watcher.on('error', (err: unknown) => {
    log.error('watcher_error', { message: (err as Error).message });
  });

  await new Promise<void>((resolve) => {
    watcher.once('ready', () => resolve());
  });

  log.info('started', { paths: expanded });

  return {
    stop: async () => {
      await watcher.close();
      log.info('stopped', {});
    },
  };
}
