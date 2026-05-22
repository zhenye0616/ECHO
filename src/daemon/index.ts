import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { startClaudeCodeExtractor } from '../capture/extractors/claude-code.js';
import { startCodexExtractor } from '../capture/extractors/codex.js';
import { startCursorExtractor } from '../capture/extractors/cursor.js';
import { CAPTURED_SOURCES } from '../capture/sources.js';
import { startFsWatcher } from '../capture/surfaces/fs-watcher.js';
import { startGitWatcher } from '../capture/surfaces/git-watcher.js';
import { isNonEmptyString } from '../guards.js';
import { flushRecentMcpCallLog } from '../mcp/request-log.js';
import { startMcpServer } from '../mcp/server.js';
import type { Storage } from '../storage/interface.js';
import { MemoryStorage } from '../storage/memory.js';
import { SqliteStorage } from '../storage/sqlite.js';
import { acquirePidLockOrExit, resolveDataDir, startLifecycle } from './lifecycle.js';

function resolveDbPath(): string {
  const dbPath = process.env['ECHO_DB_PATH'];
  if (isNonEmptyString(dbPath)) return resolve(dbPath);
  const dataDir = process.env['ECHO_DATA_DIR'];
  if (isNonEmptyString(dataDir)) return join(resolve(dataDir), 'echo.db');
  return join(homedir(), 'Library', 'Application Support', 'ECHO', 'echo.db');
}

function resolveMcpPort(): number {
  const raw = process.env['ECHO_MCP_PORT'];
  if (raw === undefined || raw.length === 0) return 38478;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 0 || n > 65535) return 38478;
  return n;
}

function createStorage(): { storage: Storage; backend: 'memory' | 'sqlite'; dispose: () => void } {
  if (process.env['ECHO_STORAGE'] === 'memory') {
    return { storage: new MemoryStorage(), backend: 'memory', dispose: () => {} };
  }
  const sqlite = new SqliteStorage(resolveDbPath());
  return { storage: sqlite, backend: 'sqlite', dispose: () => sqlite.close() };
}

const dataDir = resolveDataDir();
acquirePidLockOrExit(dataDir);

const { storage, backend, dispose } = createStorage();

const [fsWatcher, gitWatcher, claudeCodeExtractor, codexExtractor, cursorExtractor, mcp] =
  await Promise.all([
    startFsWatcher(CAPTURED_SOURCES.fs_paths, storage),
    startGitWatcher(CAPTURED_SOURCES.git_repos, storage),
    startClaudeCodeExtractor(storage),
    startCodexExtractor(storage),
    startCursorExtractor(storage),
    startMcpServer(storage, { port: resolveMcpPort() }),
  ]);

await startLifecycle({
  storage,
  storageBackend: backend,
  extraPayload: { mcp_port: mcp.port, mcp_url: mcp.url },
  onShutdown: async () => {
    await mcp.stop();
    try {
      flushRecentMcpCallLog(join(dataDir, 'mcp-shutdown.jsonl'));
    } catch (err) {
      process.stderr.write(`[daemon] mcp-shutdown-flush failed: ${(err as Error).message}\n`);
    }
    await cursorExtractor.stop();
    await codexExtractor.stop();
    await claudeCodeExtractor.stop();
    await gitWatcher.stop();
    await fsWatcher.stop();
    dispose();
  },
});
