import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable } from 'node:stream';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..');
const VITE_NODE_BIN = join(REPO_ROOT, 'node_modules', '.bin', 'vite-node');
const ENTRY = 'src/daemon/index.ts';

interface LogLine {
  level: string;
  source: string;
  message: string;
  payload?: Record<string, unknown>;
}

type DaemonChild = ChildProcessByStdio<null, Readable, Readable>;

interface DaemonProcess {
  child: DaemonChild;
  stdoutLines: string[];
  stderrLines: string[];
  exitInfo: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  parsed(): LogLine[];
  waitFor(predicate: (line: LogLine) => boolean, timeoutMs?: number): Promise<LogLine>;
  waitForStderr(predicate: (line: string) => boolean, timeoutMs?: number): Promise<string>;
}

function spawnDaemon(dataDir: string): DaemonProcess {
  const child = spawn(VITE_NODE_BIN, [ENTRY], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ECHO_DATA_DIR: dataDir,
      ECHO_LOG_LEVEL: 'info',
      ECHO_STORAGE: 'memory',
      ECHO_MCP_PORT: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];

  let stdoutBuf = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    stdoutBuf += chunk;
    let nl: number;
    while ((nl = stdoutBuf.indexOf('\n')) !== -1) {
      stdoutLines.push(stdoutBuf.slice(0, nl));
      stdoutBuf = stdoutBuf.slice(nl + 1);
    }
  });

  let stderrBuf = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    stderrBuf += chunk;
    let nl: number;
    while ((nl = stderrBuf.indexOf('\n')) !== -1) {
      stderrLines.push(stderrBuf.slice(0, nl));
      stderrBuf = stderrBuf.slice(nl + 1);
    }
  });

  const exitInfo = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (resolveExit) => {
      child.once('exit', (code, signal) => resolveExit({ code, signal }));
    },
  );

  function parsed(): LogLine[] {
    const out: LogLine[] = [];
    for (const line of stdoutLines) {
      if (line.length === 0) continue;
      try {
        out.push(JSON.parse(line) as LogLine);
      } catch {
        // ignore non-JSON noise (vite-node banners, etc.)
      }
    }
    return out;
  }

  async function waitFor(
    predicate: (line: LogLine) => boolean,
    timeoutMs = 8000,
  ): Promise<LogLine> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const hit = parsed().find(predicate);
      if (hit !== undefined) return hit;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(
      `waitFor: predicate did not match within ${timeoutMs}ms. stdout:\n${stdoutLines.join('\n')}\nstderr:\n${stderrLines.join('\n')}`,
    );
  }

  async function waitForStderr(
    predicate: (line: string) => boolean,
    timeoutMs = 8000,
  ): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const hit = stderrLines.find(predicate);
      if (hit !== undefined) return hit;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(
      `waitForStderr: predicate did not match within ${timeoutMs}ms. stderr:\n${stderrLines.join('\n')}`,
    );
  }

  return { child, stdoutLines, stderrLines, exitInfo, parsed, waitFor, waitForStderr };
}

describe('daemon lifecycle', () => {
  let dataDir: string;
  const daemons: DaemonProcess[] = [];

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'echo-daemon-test-'));
  });

  afterEach(async () => {
    for (const d of daemons) {
      if (d.child.exitCode === null && d.child.signalCode === null) {
        d.child.kill('SIGKILL');
        await d.exitInfo.catch(() => undefined);
      }
    }
    daemons.length = 0;
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('boots, logs started, then SIGTERM produces stopping/stopped and exit 0', async () => {
    const d = spawnDaemon(dataDir);
    daemons.push(d);

    const started = await d.waitFor(
      (l) => l.source === 'daemon.lifecycle' && l.message === 'started',
    );
    expect(started.level).toBe('info');
    const payload = started.payload!;
    expect(typeof payload['pid']).toBe('number');
    expect(payload['storage_backend']).toBe('memory');
    expect(payload['data_dir']).toBe(dataDir);
    expect(typeof payload['version']).toBe('string');

    expect(existsSync(join(dataDir, 'daemon.pid'))).toBe(true);

    const t0 = Date.now();
    d.child.kill('SIGTERM');

    const stopping = await d.waitFor(
      (l) => l.source === 'daemon.lifecycle' && l.message === 'stopping',
    );
    expect(stopping.level).toBe('info');
    const stopped = await d.waitFor(
      (l) => l.source === 'daemon.lifecycle' && l.message === 'stopped',
    );
    expect(stopped.level).toBe('info');

    const { code } = await d.exitInfo;
    const elapsed = Date.now() - t0;
    expect(code).toBe(0);
    // Shutdown must be bounded but the FS watcher's chokidar.close() adds
    // real cleanup time on macOS FSEvents (typically 2–4s on dirs with content).
    expect(elapsed).toBeLessThan(8000);
    expect(existsSync(join(dataDir, 'daemon.pid'))).toBe(false);
  }, 20000);

  it('SIGINT triggers the same graceful shutdown', async () => {
    const d = spawnDaemon(dataDir);
    daemons.push(d);
    await d.waitFor((l) => l.source === 'daemon.lifecycle' && l.message === 'started');

    d.child.kill('SIGINT');
    await d.waitFor((l) => l.source === 'daemon.lifecycle' && l.message === 'stopping');
    const { code } = await d.exitInfo;
    expect(code).toBe(0);
  }, 20000);

  it('refuses to start when another instance is running', async () => {
    const first = spawnDaemon(dataDir);
    daemons.push(first);
    await first.waitFor((l) => l.source === 'daemon.lifecycle' && l.message === 'started');

    const second = spawnDaemon(dataDir);
    daemons.push(second);

    const { code } = await second.exitInfo;
    expect(code).toBe(1);

    const errLine = second.stderrLines.find((l) => l.includes('already running'));
    expect(errLine).toBeDefined();
    expect(errLine).toMatch(/ECHO daemon already running at PID \d+; refusing to start/);

    expect(first.child.exitCode).toBeNull();
    first.child.kill('SIGTERM');
    await first.exitInfo;
  }, 30000);

  it('overwrites a stale PID file (PID exists in file but process dead)', async () => {
    const stalePid = 0x7fffffff;
    writeFileSync(join(dataDir, 'daemon.pid'), String(stalePid));
    expect(existsSync(join(dataDir, 'daemon.pid'))).toBe(true);

    const d = spawnDaemon(dataDir);
    daemons.push(d);
    const started = await d.waitFor(
      (l) => l.source === 'daemon.lifecycle' && l.message === 'started',
    );

    const writtenPid = Number.parseInt(readFileSync(join(dataDir, 'daemon.pid'), 'utf8'), 10);
    expect(writtenPid).toBe(started.payload!['pid']);
    expect(writtenPid).not.toBe(stalePid);

    d.child.kill('SIGTERM');
    await d.exitInfo;
  }, 20000);
});
