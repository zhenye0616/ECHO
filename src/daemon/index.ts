import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { startMcpServer, type McpServerHandle } from '../mcp/server.js';
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

function resolveMcpPort(): number {
  const raw = process.env['ECHO_MCP_PORT'];
  if (raw === undefined || raw.length === 0) return 38478;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 0 || n > 65535) return 38478;
  return n;
}

const useMemory = process.env['ECHO_STORAGE'] === 'memory';
const sqliteStore = useMemory ? null : new SqliteStorage(resolveDbPath());
const storage: Storage = useMemory ? new MemoryStorage() : sqliteStore!;

let mcp: McpServerHandle | null = null;

await startLifecycle({
  storage,
  storageBackend: useMemory ? 'memory' : 'sqlite',
  onShutdown: async () => {
    if (mcp !== null) await mcp.stop();
    if (sqliteStore !== null) sqliteStore.close();
  },
});

mcp = await startMcpServer(storage, { port: resolveMcpPort() });
