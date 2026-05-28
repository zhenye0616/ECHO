import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
  version: string;
};
const hasNpm = spawnSync('npm', ['--version']).status === 0;
const hasBash = spawnSync('bash', ['-c', 'true']).status === 0;
const maybeIt = hasNpm && hasBash ? it : it.skip;
const hasLaunchctl =
  process.platform === 'darwin' && spawnSync('launchctl', ['print', `gui/${process.getuid?.() ?? 501}`]).status === 0;

let tmpRoot: string;

describe('echoctl shell reachability', () => {
  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-shell-reachable-'));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  maybeIt(
    'packs an echoctl binary reachable from bash and exercises transitive doctor imports',
    async () => {
      const build = spawnSync('npm', ['run', 'build:cli'], { cwd: repoRoot, encoding: 'utf8' });
      expect(build.status, build.stderr).toBe(0);
      expect(existsSync(join(repoRoot, 'dist/cli/index.js'))).toBe(true);
      expect(existsSync(join(repoRoot, 'dist/cli/commands/doctor.js'))).toBe(true);

      const pack = spawnSync('npm', ['pack', '--pack-destination', tmpRoot], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      expect(pack.status, pack.stderr).toBe(0);
      const tarball = join(tmpRoot, pack.stdout.trim().split(/\r?\n/).at(-1)!);
      const tarList = spawnSync('tar', ['tf', tarball], { encoding: 'utf8' });
      expect(tarList.status, tarList.stderr).toBe(0);
      const tarEntries = tarList.stdout.split(/\r?\n/);
      expect(tarEntries).toEqual(
        expect.arrayContaining([
          'package/dist/cli/index.js',
          'package/dist/daemon/index.js',
          'package/dist/storage/migrations/0001_initial.sql',
          'package/assets/echo-skills/using-echo-coord.md',
          'package/assets/echo-skills/using-echo-mcp.md',
          'package/assets/echo-roles/reviewer.toml',
          'package/assets/echo-workflows/change-review.toml',
          'package/tools/review-queue/coord-roles.json',
          'package/tools/review-queue/reviewers.json',
          'package/tools/review-queue/schemas/coord-roles.schema.json',
        ]),
      );
      expect(tarEntries.some((entry) => entry.startsWith('package/backlog/'))).toBe(false);
      expect(tarEntries.some((entry) => entry.startsWith('package/raw/'))).toBe(false);
      expect(tarEntries.some((entry) => entry.startsWith('package/wiki/'))).toBe(false);
      expect(tarEntries.some((entry) => entry.startsWith('package/skills/'))).toBe(false);
      expect(tarEntries).not.toContain('package/skills/merge-and-cleanup.md');
      expect(tarEntries).not.toContain('package/skills/process-backlog.md');
      expect(tarEntries.some((entry) => entry.startsWith('package/src/'))).toBe(false);
      expect(tarEntries.some((entry) => entry.startsWith('package/tests/'))).toBe(false);
      expect(tarEntries.some((entry) => /^package\/tools\/review-queue\/.*\.(py|sh)$/.test(entry))).toBe(false);
      expect(tarEntries.some((entry) => /dist\/.*\.test\.(js|d\.ts)$/.test(entry))).toBe(false);
      const prefix = join(tmpRoot, 'prefix');
      const install = spawnSync('npm', ['install', '-g', '--prefix', prefix, tarball], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      expect(install.status, install.stderr).toBe(0);

      const env = {
        ...process.env,
        PATH: `${join(prefix, 'bin')}:${process.env.PATH ?? ''}`,
        ECHO_HOME: join(tmpRoot, 'echo-home'),
        ECHO_MCP_PORT: '39999',
      };
      const version = spawnSync('bash', ['-c', 'echoctl --version'], { env, encoding: 'utf8' });
      expect(version.status, version.stderr).toBe(0);
      expect(version.stdout.trim()).toBe(packageJson.version);

      const doctor = spawnSync('bash', ['-c', 'echoctl doctor --json'], { env, encoding: 'utf8' });
      expect(doctor.status).toBe(1);
      expect(JSON.parse(doctor.stdout)).toMatchObject({ overall: 'broken' });

      const builtin = spawnSync('bash', ['-c', 'echo --version'], { env, encoding: 'utf8' });
      expect(builtin.stdout.trim()).not.toBe(packageJson.version);

      if (!hasLaunchctl) {
        console.warn('skipped: launchctl not available — packaged-daemon smoke requires macOS');
        return;
      }

      const uuid = `${process.pid}-${Date.now()}`;
      const label = `com.echo.daemon.test-${uuid}`;
      const plistPath = join(tmpRoot, `${label}.plist`);
      const daemonHome = join(tmpRoot, 'daemon-home');
      const daemonPort = await findFreePort();
      const logDir = join(tmpRoot, 'daemon-logs');
      const dataDir = join(tmpRoot, 'daemon-data');
      const dbPath = join(dataDir, 'echo.db');
      const overrides = [
        '--label',
        label,
        '--plist-path',
        plistPath,
        '--home',
        daemonHome,
        '--port',
        daemonPort,
        '--log-dir',
        logDir,
        '--data-dir',
        dataDir,
        '--db-path',
        dbPath,
      ];

      const productionBefore = launchctlPrint('com.echo.daemon');
      if (productionBefore.error) {
        console.warn('skipped: launchctl production snapshot unavailable');
        return;
      }
      const productionWasLoaded = productionBefore.status === 0;
      const productionPidBefore = parseLaunchdPid(productionBefore.stdout);
      const productionDataSnapshot = snapshotProductionDataDir(productionWasLoaded);

      try {
        const daemonInstall = spawnSync('bash', ['-c', `echoctl daemon install ${shellArgs(overrides)}`], {
          env,
          encoding: 'utf8',
        });
        expect(daemonInstall.status, daemonInstall.stderr).toBe(0);

        const daemonStop = spawnSync('bash', ['-c', `echoctl daemon stop ${shellArgs(overrides)}`], {
          env,
          encoding: 'utf8',
        });
        expect(daemonStop.status, daemonStop.stderr).toBe(0);

        const daemonStart = spawnSync('bash', ['-c', `echoctl daemon start ${shellArgs(overrides)}`], {
          env,
          encoding: 'utf8',
        });
        expect(daemonStart.status, daemonStart.stderr).toBe(0);

        const initialize = await postMcp(Number(daemonPort), {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'echoctl-pack-smoke', version: packageJson.version },
          },
        });
        expect(initialize.status).toBeGreaterThanOrEqual(200);
        expect(initialize.status).toBeLessThan(300);
        expect(initialize.body).toMatchObject({ jsonrpc: '2.0', id: 1 });

        const status = await waitForDaemonStatus(env, overrides);
        expect(status.status, String(status.stderr ?? '')).toBe(0);
        expect(status.stdout).toContain(daemonHome);
        expect(status.stdout).toContain(`port:        ${daemonPort}`);
        expect(status.stdout).toContain(dataDir);
        expect(status.stdout).toContain(dbPath);

        const logs = spawnSync('bash', ['-c', `echoctl daemon logs ${shellArgs(overrides)} --tail 5`], {
          env,
          encoding: 'utf8',
        });
        expect(logs.status, logs.stderr).toBe(0);
        expect(logs.stdout).toContain(join(logDir, 'echo-daemon.out.log'));

        const requestPath = `backlog/reviews/2026-05-26-076-packaged-echoctl-install-boundary/r1/request.md`;
        const coordInvoke = await postMcp(Number(daemonPort), {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'coord_invoke',
            arguments: {
              role: 'codex',
              request_path: requestPath,
              correlation_id: '11111111-1111-4111-8111-111111111111',
            },
          },
        });
        const coordText = JSON.stringify(coordInvoke.body);
        expect(coordText).toContain('run-codex-reviewer.sh');
        expect(coordText).toContain('isError');
      } finally {
        spawnSync('bash', ['-c', `echoctl daemon stop ${shellArgs(overrides)}`], {
          env,
          encoding: 'utf8',
        });
        spawnSync('bash', ['-c', `echoctl daemon uninstall ${shellArgs(overrides)}`], {
          env,
          encoding: 'utf8',
        });
      }

      await expectLaunchdGone(label);
      const productionAfter = launchctlPrint('com.echo.daemon');
      expect(productionAfter.error).toBeUndefined();
      expect(productionAfter.status === 0).toBe(productionWasLoaded);
      if (productionWasLoaded) {
        expect(parseLaunchdPid(productionAfter.stdout)).toBe(productionPidBefore);
      }
      if (productionDataSnapshot !== null) {
        expect(snapshotProductionDataDir(false)).toEqual(productionDataSnapshot);
      }
    },
    75_000,
  );
});

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function shellArgs(args: readonly string[]): string {
  return args.map(shellQuote).join(' ');
}

function launchctlPrint(label: string): ReturnType<typeof spawnSync> {
  return spawnSync('launchctl', ['print', `gui/${process.getuid?.() ?? 501}/${label}`], {
    encoding: 'utf8',
  });
}

function launchctlDomainPrint(): ReturnType<typeof spawnSync> {
  return spawnSync('launchctl', ['print', `gui/${process.getuid?.() ?? 501}`], {
    encoding: 'utf8',
  });
}

function launchctlDomainMatches(label: string): { status: number | null; stderr: string; lines: string[] } {
  const current = launchctlDomainPrint();
  return {
    status: current.status,
    stderr: String(current.stderr ?? ''),
    lines: String(current.stdout ?? '')
      .split(/\r?\n/)
      .filter((line) => line.includes(label)),
  };
}

function parseLaunchdPid(stdout: string | Buffer | null): string | null {
  const raw = String(stdout ?? '');
  return /pid\s*=\s*(\d+)/i.exec(raw)?.[1] ?? null;
}

function snapshotProductionDataDir(productionWasLoaded: boolean): { dir?: string; db?: string } | null {
  if (productionWasLoaded) return null;
  const dir = join(process.env.HOME ?? '', 'Library/Application Support/ECHO');
  const db = join(dir, 'echo.db');
  try {
    return {
      dir: existsSync(dir) ? `${statSync(dir).mtimeMs}:${statSync(dir).size}` : 'absent',
      db: existsSync(db) ? `${statSync(db).mtimeMs}:${statSync(db).size}` : 'absent',
    };
  } catch {
    console.warn('skipped: production data snapshot unavailable');
    return null;
  }
}

async function postMcp(port: number, payload: unknown): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const line = text.split(/\r?\n/).find((entry) => entry.startsWith('data: '));
  const body = JSON.parse(line === undefined ? text : line.slice(6)) as unknown;
  return { status: response.status, body };
}

async function waitForDaemonStatus(
  env: NodeJS.ProcessEnv,
  overrides: readonly string[],
): Promise<ReturnType<typeof spawnSync>> {
  let last = spawnSync('bash', ['-c', `echoctl daemon status ${shellArgs(overrides)}`], {
    env,
    encoding: 'utf8',
  });
  for (let i = 0; i < 40 && last.status !== 0; i += 1) {
    await new Promise((resolvePoll) => setTimeout(resolvePoll, 250));
    last = spawnSync('bash', ['-c', `echoctl daemon status ${shellArgs(overrides)}`], {
      env,
      encoding: 'utf8',
    });
  }
  return last;
}

async function findFreePort(): Promise<string> {
  const start = 40000 + Math.floor(Math.random() * 10000);
  for (let i = 0; i < 10000; i += 1) {
    const port = 40000 + ((start + i - 40000) % 10000);
    if (await canListen(port)) return String(port);
  }
  throw new Error('no free TCP port found in 40000-49999');
}

function canListen(port: number): Promise<boolean> {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.once('error', () => resolvePort(false));
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolvePort(true));
    });
  });
}

async function expectLaunchdGone(label: string): Promise<void> {
  for (let i = 0; i < 100; i += 1) {
    const current = launchctlDomainMatches(label);
    if (current.status === 0 && current.lines.length === 0) return;
    await new Promise((resolvePoll) => setTimeout(resolvePoll, 100));
  }
  const current = launchctlDomainMatches(label);
  expect(current.status, current.stderr).toBe(0);
  expect(current.lines).toEqual([]);
}
