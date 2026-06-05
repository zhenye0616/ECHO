import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, win32 } from 'node:path';
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

export interface DataDirOptions {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
}

function pathResolve(platform: NodeJS.Platform, path: string): string {
  return platform === 'win32' ? win32.resolve(path) : resolve(path);
}

function pathJoin(platform: NodeJS.Platform, ...parts: string[]): string {
  return platform === 'win32' ? win32.join(...parts) : join(...parts);
}

export function resolveDataDir(opts: DataDirOptions = {}): string {
  const envSource = opts.env ?? process.env;
  const platform = opts.platform ?? process.platform;
  const home = opts.homeDir ?? homedir();
  const env = envSource['ECHO_DATA_DIR'];
  if (isNonEmptyString(env)) return pathResolve(platform, env);
  if (platform === 'win32') {
    const base = envSource['LOCALAPPDATA'] ?? envSource['APPDATA'];
    return isNonEmptyString(base)
      ? pathResolve(platform, pathJoin(platform, base, 'ECHO'))
      : pathResolve(platform, pathJoin(platform, home, 'AppData', 'Local', 'ECHO'));
  }
  if (platform === 'darwin') return join(home, 'Library', 'Application Support', 'ECHO');
  const xdgDataHome = envSource['XDG_DATA_HOME'];
  return isNonEmptyString(xdgDataHome)
    ? pathResolve(platform, pathJoin(platform, xdgDataHome, 'ECHO'))
    : pathResolve(platform, pathJoin(platform, home, '.local', 'share', 'ECHO'));
}

export function resolveDbPath(opts: DataDirOptions = {}): string {
  const env = opts.env ?? process.env;
  const platform = opts.platform ?? process.platform;
  const dbPath = env['ECHO_DB_PATH'];
  if (isNonEmptyString(dbPath)) return pathResolve(platform, dbPath);
  return pathJoin(platform, resolveDataDir(opts), 'echo.db');
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
