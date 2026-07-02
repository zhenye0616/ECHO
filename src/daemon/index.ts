import { join } from 'node:path';
import { startClaudeCodeExtractor } from '../capture/extractors/claude-code.js';
import { startCodexExtractor } from '../capture/extractors/codex.js';
import { startCursorExtractor } from '../capture/extractors/cursor.js';
import { applyGitReposFromCaptureConfig, CAPTURED_SOURCES } from '../capture/sources.js';
import { startFsWatcher } from '../capture/surfaces/fs-watcher.js';
import { startGitWatcher } from '../capture/surfaces/git-watcher.js';
import { startGranolaPoller } from '../capture/surfaces/granola-poller.js';
import { startEnrichmentDispatch } from '../enrich/dispatch.js';
import { startGranolaIntakeBridge } from '../enrich/granola-intake-candidates.js';
import { ensureEchoHome } from '../echo-home/scaffold.js';
import { createLogger } from '../logging/index.js';
import { flushRecentMcpCallLog } from '../mcp/request-log.js';
import { startMcpServer } from '../mcp/server.js';
import type { Storage } from '../storage/interface.js';
import { MemoryStorage } from '../storage/memory.js';
import { SqliteStorage } from '../storage/sqlite.js';
import {
  acquirePidLockOrExit,
  resolveDataDir,
  resolveDbPath,
  startLifecycle,
} from './lifecycle.js';

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

// Last-resort guard: a stray rejection escaping any capture surface or
// fire-and-forget path must not kill the daemon. Surfaces own their local
// catch-and-log (handler_error); this only catches what they miss. Log via
// the structured logger and keep running.
const daemonLog = createLogger('daemon');
process.on('unhandledRejection', (reason: unknown) => {
  daemonLog.error('unhandled_rejection', {
    message: reason instanceof Error ? reason.message : String(reason),
  });
});

const dataDir = resolveDataDir();
acquirePidLockOrExit(dataDir);

const echoHomeLog = createLogger('daemon.echo-home');
try {
  const result = ensureEchoHome();
  if (result.created_dirs.length > 0 || result.created_files.length > 0) {
    echoHomeLog.info('echo_home_initialized', {
      root: result.root,
      created_dirs: result.created_dirs,
      created_files: result.created_files,
    });
  }
} catch (err) {
  echoHomeLog.error('echo_home_init_failed', { message: (err as Error).message });
}

const { storage, backend, dispose } = createStorage();
const gitRepos = applyGitReposFromCaptureConfig();

const [
  fsWatcher,
  gitWatcher,
  granolaPoller,
  enrichment,
  claudeCodeExtractor,
  codexExtractor,
  cursorExtractor,
  mcp,
] = await Promise.all([
  startFsWatcher(CAPTURED_SOURCES.fs_paths, storage),
  startGitWatcher(gitRepos, storage),
  Promise.resolve(startGranolaPoller(storage)),
  startEnrichmentDispatch(storage),
  startClaudeCodeExtractor(storage),
  startCodexExtractor(storage),
  startCursorExtractor(storage),
  startMcpServer(storage, { port: resolveMcpPort() }),
]);

// Granola→Slack intake bridge (item 109). Off by default; enabled-but-
// misconfigured fails closed inside startGranolaIntakeBridge (structured
// config error logged, zero seed records claimed). Debounced after signal
// extraction via runSignalsFirst so seeds are built from fresh signal atoms.
const granolaIntake = startGranolaIntakeBridge(storage, {
  runSignalsFirst: () => enrichment.granolaSignals.run(),
});

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
    await granolaIntake.stop();
    await enrichment.stop();
    await granolaPoller.stop();
    await gitWatcher.stop();
    await fsWatcher.stop();
    dispose();
  },
});
