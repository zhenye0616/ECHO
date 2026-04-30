import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { CAPTURED_SOURCES } from '../capture/sources.js';
import { startFsWatcher } from '../capture/surfaces/fs-watcher.js';
import type { Storage } from '../storage/interface.js';
import { MemoryStorage } from '../storage/memory.js';
import { SqliteStorage } from '../storage/sqlite.js';
import { startLifecycle } from './lifecycle.js';

function resolveDbPath(): string {
  const env = process.env['ECHO_DB_PATH'];
  if (env !== undefined && env.length > 0) return resolve(env);
  const dataDir = process.env['ECHO_DATA_DIR'];
  if (dataDir !== undefined && dataDir.length > 0) {
    return join(resolve(dataDir), 'echo.db');
  }
  return join(homedir(), 'Library', 'Application Support', 'ECHO', 'echo.db');
}

const useMemory = process.env['ECHO_STORAGE'] === 'memory';
const sqliteStore = useMemory ? null : new SqliteStorage(resolveDbPath());
const storage: Storage = useMemory ? new MemoryStorage() : sqliteStore!;

const fsWatcher = await startFsWatcher(CAPTURED_SOURCES.fs_paths, storage);

await startLifecycle({
  storage,
  storageBackend: useMemory ? 'memory' : 'sqlite',
  onShutdown: async () => {
    await fsWatcher.stop();
    if (sqliteStore !== null) sqliteStore.close();
  },
});
