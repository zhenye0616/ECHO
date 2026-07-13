import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const hasNpm = spawnSync('npm', ['--version']).status === 0;
const maybeIt = hasNpm ? it : it.skip;

let tmpRoot: string;

describe('packaged daemon boot from the real tarball', () => {
  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-packaged-boot-'));
  });

  afterEach(() => {
    // The packaged daemon receives SIGTERM in the test's finally block and can
    // still be releasing SQLite/filesystem handles when teardown begins.
    // Retry only transient removal failures; durable cleanup errors still fail.
    rmSync(tmpRoot, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  });

  // This test exercises the ERR_MODULE_NOT_FOUND class for real: it installs the
  // npm-packed tarball into a prefix OUTSIDE the repo tree (its own node_modules,
  // no dev-layout symlinks) and launches the packaged daemon entrypoint under
  // production module resolution with no mocks. If any tarball-shipped module —
  // e.g. the daemon's dynamic import of the ceo-slack-responder propose-decision
  // tool and its transitive chain — fails to resolve, the daemon dies before it
  // logs `started` and the test fails on the captured import error.
  maybeIt(
    'reaches daemon health from the installed tarball with no unresolved imports',
    async () => {
      const build = spawnSync('npm', ['run', 'build:cli'], { cwd: repoRoot, encoding: 'utf8' });
      expect(build.status, build.stderr).toBe(0);

      const pack = spawnSync('npm', ['pack', '--pack-destination', tmpRoot], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      expect(pack.status, pack.stderr).toBe(0);
      const tarball = join(tmpRoot, pack.stdout.trim().split(/\r?\n/).at(-1)!);

      const prefix = join(tmpRoot, 'prefix');
      const install = spawnSync('npm', ['install', '-g', '--prefix', prefix, tarball], {
        cwd: tmpRoot,
        encoding: 'utf8',
      });
      expect(install.status, install.stderr).toBe(0);

      // Locate the installed package cross-platform (Unix: <prefix>/lib/node_modules,
      // Windows: <prefix>/node_modules) via npm's own resolution.
      const globalRoot = spawnSync('npm', ['root', '-g', '--prefix', prefix], {
        cwd: tmpRoot,
        encoding: 'utf8',
      });
      expect(globalRoot.status, globalRoot.stderr).toBe(0);
      const daemonEntry = join(globalRoot.stdout.trim(), 'echoctl', 'dist', 'daemon', 'index.js');
      expect(existsSync(daemonEntry), `packaged daemon entry missing: ${daemonEntry}`).toBe(true);

      const port = await findFreePort();
      const env = {
        ...process.env,
        ECHO_HOME: join(tmpRoot, 'echo-home'),
        ECHO_DATA_DIR: join(tmpRoot, 'echo-data'),
        ECHO_MCP_PORT: port,
        ECHO_STORAGE: 'memory',
      };

      const boot = await bootDaemon(daemonEntry, env, tmpRoot);
      try {
        // (1) No uncaught module-resolution crash on stderr. This is the failure
        // the Windows path hits directly: the daemon's optional-module guard
        // matches a forward-slash path, so on Windows a missing module escapes
        // the guard and kills the process before `started`.
        expect(
          boot.importError,
          `packaged daemon crashed on a module resolution error:\n${boot.stderr}\n${boot.stdout}`,
        ).toBe(false);
        // (2) The daemon fully booted.
        expect(
          boot.started,
          `packaged daemon never logged "started":\n${boot.stderr}\n${boot.stdout}`,
        ).toBe(true);
        // (3) The dynamic-import target and its transitive chain were actually
        // present and loaded — no `propose_decision_skipped` swallow. Without
        // this, the test is vacuous on platforms where the optional-module guard
        // catches the ERR_MODULE_NOT_FOUND (macOS/Linux forward-slash paths):
        // the daemon would still reach `started` with the module absent. This
        // assertion makes the packaged import closure the real subject on every
        // platform, not just Windows.
        expect(
          boot.stdout.includes('propose_decision_skipped'),
          `packaged daemon could not resolve the propose-decision import closure (module_not_found swallowed):\n${boot.stdout}`,
        ).toBe(false);
      } finally {
        await boot.stop();
      }
    },
    180_000,
  );
});

interface BootResult {
  started: boolean;
  importError: boolean;
  stdout: string;
  stderr: string;
  stop: () => Promise<void>;
}

// Launch the packaged daemon and resolve once it either logs the lifecycle
// `started` event (healthy) or exits (crashed). Health is detected from the
// structured stdout log line, so no platform-specific service manager (launchd)
// is involved — the same signal works on macOS, Linux, and Windows CI.
function bootDaemon(entry: string, env: NodeJS.ProcessEnv, cwd: string): Promise<BootResult> {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [entry], { cwd, env });
    let stdout = '';
    let stderr = '';
    let settled = false;
    let resolveClosed: () => void;
    const closed = new Promise<void>((resolve) => {
      resolveClosed = resolve;
    });

    const stop = async (): Promise<void> => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');

      const exitedGracefully = await Promise.race([
        closed.then(() => true),
        new Promise<false>((resolve) => setTimeout(() => resolve(false), 5_000)),
      ]);
      if (!exitedGracefully && child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
        await closed;
      }
    };

    const finish = (started: boolean, importError: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ started, importError, stdout, stderr, stop });
    };

    const importError = (): boolean =>
      /ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|Cannot find module/.test(stderr);

    const sawStarted = (): boolean => {
      for (const line of stdout.split(/\r?\n/)) {
        if (line.trim() === '') continue;
        try {
          const parsed = JSON.parse(line) as { source?: unknown; message?: unknown };
          if (parsed.source === 'daemon.lifecycle' && parsed.message === 'started') return true;
        } catch {
          // non-JSON lines (native module warnings, etc.) are not the signal.
        }
      }
      return false;
    };

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
      if (sawStarted()) finish(true, false);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', () => finish(false, importError()));
    child.on('close', () => {
      resolveClosed();
      finish(false, importError());
    });

    const timer = setTimeout(() => finish(sawStarted(), importError()), 60_000);
  });
}

function canListen(port: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const server = createServer();
    server.once('error', () => resolvePromise(false));
    server.once('listening', () => server.close(() => resolvePromise(true)));
    server.listen(port, '127.0.0.1');
  });
}

async function findFreePort(): Promise<string> {
  const start = 40000 + Math.floor(Math.random() * 10000);
  for (let i = 0; i < 10000; i += 1) {
    const port = 40000 + ((start + i - 40000) % 10000);
    if (await canListen(port)) return String(port);
  }
  throw new Error('no free TCP port found in 40000-49999');
}
