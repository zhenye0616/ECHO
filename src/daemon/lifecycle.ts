import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isNonEmptyString } from '../guards.js';
import { createLogger } from '../logging/index.js';
import { MemoryStorage } from '../storage/memory.js';
import type { Storage } from '../storage/interface.js';

const log = createLogger('daemon.lifecycle');

let shuttingDown = false;
let pidLockPath: string | null = null;
let signalsBound = false;
let keepAlive: NodeJS.Timeout | null = null;
let onShutdownHook: (() => void | Promise<void>) | null = null;

export function resolveDataDir(): string {
  const env = process.env['ECHO_DATA_DIR'];
  if (isNonEmptyString(env)) return resolve(env);
  return join(homedir(), 'Library', 'Application Support', 'ECHO');
}

export function resolveDbPath(): string {
  const dbPath = process.env['ECHO_DB_PATH'];
  if (isNonEmptyString(dbPath)) return resolve(dbPath);
  const dataDir = process.env['ECHO_DATA_DIR'];
  if (isNonEmptyString(dataDir)) return join(resolve(dataDir), 'echo.db');
  return join(homedir(), 'Library', 'Application Support', 'ECHO', 'echo.db');
}

export function acquirePidLockOrExit(dataDir: string): void {
  if (pidLockPath !== null) return;
  pidLockPath = acquirePidLock(dataDir);
}

function readVersion(): string {
  const here = fileURLToPath(import.meta.url);
  const pkgPath = join(dirname(here), '..', '..', 'package.json');
  const raw = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: unknown };
  return typeof raw.version === 'string' ? raw.version : '0.0.0';
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquirePidLock(dataDir: string): string {
  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, 'daemon.pid');
  if (existsSync(path)) {
    const raw = readFileSync(path, 'utf8').trim();
    const existing = Number.parseInt(raw, 10);
    if (Number.isInteger(existing) && existing !== process.pid && isProcessAlive(existing)) {
      process.stderr.write(`ECHO daemon already running at PID ${existing}; refusing to start\n`);
      process.exit(1);
    }
  }
  writeFileSync(path, String(process.pid));
  return path;
}

function releasePidLock(): void {
  if (pidLockPath === null) return;
  try {
    unlinkSync(pidLockPath);
  } catch {
    // best effort: ENOENT (already gone) or EACCES (permissions) — neither is recoverable here
  }
  pidLockPath = null;
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info('stopping', { signal });
  if (onShutdownHook !== null) {
    try {
      await onShutdownHook();
    } catch (err) {
      log.error('shutdown_hook_failed', { message: (err as Error).message });
    }
  }
  releasePidLock();
  if (keepAlive !== null) {
    clearInterval(keepAlive);
    keepAlive = null;
  }
  log.info('stopped', {});
}

export interface LifecycleOptions {
  storage?: Storage;
  storageBackend?: string;
  extraPayload?: Record<string, unknown>;
  onShutdown?: () => void | Promise<void>;
}

export interface LifecycleHandle {
  storage: Storage;
  dataDir: string;
}

export async function startLifecycle(options: LifecycleOptions = {}): Promise<LifecycleHandle> {
  const dataDir = resolveDataDir();
  if (pidLockPath === null) {
    pidLockPath = acquirePidLock(dataDir);
  }

  const storage: Storage = options.storage ?? new MemoryStorage();
  const storageBackend = options.storageBackend ?? 'memory';
  onShutdownHook = options.onShutdown ?? null;

  if (keepAlive === null) {
    keepAlive = setInterval(() => {
      // no-op; keeps the event loop alive until shutdown clears it
    }, 0x7fffffff);
  }

  log.info('started', {
    pid: process.pid,
    version: readVersion(),
    storage_backend: storageBackend,
    data_dir: dataDir,
    ...(options.extraPayload ?? {}),
  });

  if (!signalsBound) {
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
    signalsBound = true;
  }

  return { storage, dataDir };
}
