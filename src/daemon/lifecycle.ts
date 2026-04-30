import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '../logging/index.js';
import { MemoryStorage } from '../storage/memory.js';
import type { Storage } from '../storage/interface.js';

const log = createLogger('daemon.lifecycle');

const STORAGE_BACKEND = 'memory';

let shuttingDown = false;
let pidLockPath: string | null = null;
let signalsBound = false;
let keepAlive: NodeJS.Timeout | null = null;

function resolveDataDir(): string {
  const env = process.env['ECHO_DATA_DIR'];
  if (env !== undefined && env.length > 0) return resolve(env);
  return join(homedir(), 'Library', 'Application Support', 'ECHO');
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
    if (existsSync(pidLockPath)) unlinkSync(pidLockPath);
  } catch {
    // best effort — log already emitted by caller
  }
  pidLockPath = null;
}

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info('stopping', { signal });
  releasePidLock();
  if (keepAlive !== null) {
    clearInterval(keepAlive);
    keepAlive = null;
  }
  log.info('stopped', {});
}

export interface LifecycleHandle {
  storage: Storage;
  dataDir: string;
}

export async function startLifecycle(): Promise<LifecycleHandle> {
  const dataDir = resolveDataDir();
  pidLockPath = acquirePidLock(dataDir);

  const storage: Storage = new MemoryStorage();

  if (keepAlive === null) {
    keepAlive = setInterval(() => {
      // no-op; keeps the event loop alive until shutdown clears it
    }, 0x7fffffff);
  }

  log.info('started', {
    pid: process.pid,
    version: readVersion(),
    storage_backend: STORAGE_BACKEND,
    data_dir: dataDir,
  });

  if (!signalsBound) {
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    signalsBound = true;
  }

  return { storage, dataDir };
}
