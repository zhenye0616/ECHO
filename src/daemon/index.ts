import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { CAPTURED_SOURCES } from '../capture/sources.js';
import { startFsWatcher } from '../capture/surfaces/fs-watcher.js';
import { isNonEmptyString } from '../guards.js';
import type { Storage } from '../storage/interface.js';
import { MemoryStorage } from '../storage/memory.js';
import { SqliteStorage } from '../storage/sqlite.js';
import { startLifecycle } from './lifecycle.js';

function resolveDbPath(): string {
  const dbPath = process.env['ECHO_DB_PATH'];
  if (isNonEmptyString(dbPath)) return resolve(dbPath);
  const dataDir = process.env['ECHO_DATA_DIR'];
  if (isNonEmptyString(dataDir)) return join(resolve(dataDir), 'echo.db');
  return join(homedir(), 'Library', 'Application Support', 'ECHO', 'echo.db');
}

function createStorage(): { storage: Storage; backend: 'memory' | 'sqlite'; dispose: () => void } {
  if (process.env['ECHO_STORAGE'] === 'memory') {
    return { storage: new MemoryStorage(), backend: 'memory', dispose: () => {} };
  }
  const sqlite = new SqliteStorage(resolveDbPath());
  return { storage: sqlite, backend: 'sqlite', dispose: () => sqlite.close() };
}

const { storage, backend, dispose } = createStorage();

const fsWatcher = await startFsWatcher(CAPTURED_SOURCES.fs_paths, storage);

await startLifecycle({
  storage,
  storageBackend: backend,
  onShutdown: async () => {
    await fsWatcher.stop();
    dispose();
  },
});
