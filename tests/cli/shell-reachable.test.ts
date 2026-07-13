import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
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
          'package/README.md',
          'package/LICENSE',
          'package/dist/cli/index.js',
          'package/dist/cli/commands/project.js',
          'package/dist/cli/commands/project.d.ts',
          'package/dist/daemon/index.js',
          'package/dist/storage/migrations/0001_initial.sql',
          'package/docs/echoctl-install.md',
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
      expect(tarEntries.filter((entry) => entry.startsWith('package/docs/')).sort()).toEqual([
        'package/docs/echoctl-install.md',
        'package/docs/install-contracts.md',
        'package/docs/lab-data-handling.md',
      ]);
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
      const logDir = join(tmpRoot, 'daemon-logs');
      const dataDir = join(tmpRoot, 'daemon-data');
      const dbPath = join(dataDir, 'echo.db');
      const overridesFor = (port: string): string[] => [
        '--label',
        label,
        '--plist-path',
        plistPath,
        '--home',
        daemonHome,
        '--port',
        port,
        '--log-dir',
        logDir,
        '--data-dir',
        dataDir,
        '--db-path',
        dbPath,
      ];
      // Resolved by the AC1 bounded-retry install loop below; the finally block
      // and the post-install assertions read these once a candidate port has
      // actually bound+healthed. Empty until then so the finally cleanup can
      // guard against ever targeting the default (production) daemon.
      let daemonPort = '';
      let overrides: string[] = [];

      const productionBefore = launchctlPrint('com.echo.daemon');
      if (productionBefore.error) {
        console.warn('skipped: launchctl production snapshot unavailable');
        return;
      }
      const productionWasLoaded = productionBefore.status === 0;
      const productionPidBefore = parseLaunchdPid(productionBefore.stdout);
      const productionDataSnapshot = snapshotProductionDataDir(productionWasLoaded);

      try {
        // AC1 (item 126): race-safe port allocation. The prior helper bound a
        // free port, closed it, then handed the number to the daemon — a
        // check-then-use (TOCTOU) race: between our close() and the daemon's
        // bind an overlapping worktree run, a stale daemon, or another suite
        // file could steal the port, producing the intermittent "did not become
        // healthy on port N" flake. Serializing the suite would NOT close this
        // race (overlapping unattended runs, stale daemons). So make the
        // daemon's OWN bind+health the allocation signal: try a random candidate
        // port and, if `daemon install` does not reach health, tear the attempt
        // down and retry a fresh candidate. Bounded so a genuinely broken
        // install fails fast instead of looping. A random port in a 10k range
        // collides rarely enough that attempt 1 nearly always wins; the retry is
        // insurance, not the common path. Each real collision costs the daemon's
        // ~10s health deadline, and this test already spends ~40-65s on
        // build:cli + npm pack + global install under full-suite load — so the
        // per-test timeout is raised to 180s (see below) to give the install AND
        // start retries real headroom. Without that headroom, retry exhaustion
        // would trip vitest's timeout as an opaque failure before the crafted
        // expect() messages here could fire.
        //
        // Item 097: `daemon install` auto-derives ECHO_REPO_ROOT from the install
        // cwd's git toplevel when it contains the tools/review-queue/ harness. This
        // test models a PACKAGED install (item 076 boundary) — wrappers are NOT
        // shipped in the tarball — so install from a non-repo cwd (tmpRoot) to keep
        // ECHO_REPO_ROOT omitted. That preserves the packaged-boundary contract the
        // coord_invoke assertion below checks (graceful ENOENT, no harness resolved)
        // AND prevents resolving the real source-repo wrapper, which would
        // fire-and-forget spawn a live codex reviewer tick during the test.
        let lastInstallStderr = '';
        for (let attempt = 1; attempt <= 6 && daemonPort === ''; attempt += 1) {
          const candidate = String(40000 + Math.floor(Math.random() * 10000));
          const candidateOverrides = overridesFor(candidate);
          const attemptInstall = spawnSync(
            'bash',
            ['-c', `echoctl daemon install ${shellArgs(candidateOverrides)}`],
            { env, cwd: tmpRoot, encoding: 'utf8' },
          );
          if (attemptInstall.status === 0) {
            daemonPort = candidate;
            overrides = candidateOverrides;
            break;
          }
          lastInstallStderr = attemptInstall.stderr ?? '';
          // Failed to bind/health on this candidate. `install` already boots the
          // job out on a health failure; uninstall clears the written plist so
          // the next attempt starts from a clean slate on a fresh port.
          spawnSync('bash', ['-c', `echoctl daemon uninstall ${shellArgs(candidateOverrides)}`], {
            env,
            encoding: 'utf8',
          });
        }
        expect(daemonPort, `daemon did not become healthy on any candidate port: ${lastInstallStderr}`).not.toBe('');

        const daemonStop = spawnSync('bash', ['-c', `echoctl daemon stop ${shellArgs(overrides)}`], {
          env,
          encoding: 'utf8',
        });
        expect(daemonStop.status, daemonStop.stderr).toBe(0);

        // AC1 (item 126, review fixup r2): the stop→start reachability check must
        // be as load-tolerant as the install loop above. `echoctl daemon start`
        // re-binds the resolved port and boots itself out if its ~10s health
        // probe (waitForHealthy — NOT CLI-configurable) loses the race under
        // full-suite CPU contention on this shared, chronically-loaded dev box.
        //
        // Retrying `daemon start` DIRECTLY thrashes: launchd's bootout is async,
        // so a retry frequently finds the job transiently "loaded but unhealthy"
        // and start() fast-returns 1 with NO health window — burning the attempt
        // (this is exactly how a reviewer run failed: 5 start attempts, all
        // "loaded but unhealthy"). `daemon restart` instead boots out
        // SYNCHRONOUSLY and then bootstraps, so every retry is a real fresh
        // health window. First attempt stays `start` (exercises the start verb
        // when the machine is healthy-fast); retries use `restart` with a short
        // settle so launchd finishes unloading before the next bootstrap. The
        // assertion is only that the daemon ULTIMATELY serves on the resolved
        // port. Bounded to fail fast (with this crafted message, not an opaque
        // vitest timeout) if the daemon genuinely never becomes healthy.
        let startedOk = false;
        let lastStartStderr = '';
        for (let attempt = 1; attempt <= 8 && !startedOk; attempt += 1) {
          const verb = attempt === 1 ? 'start' : 'restart';
          const daemonStart = spawnSync('bash', ['-c', `echoctl daemon ${verb} ${shellArgs(overrides)}`], {
            env,
            encoding: 'utf8',
          });
          if (daemonStart.status === 0) {
            startedOk = true;
            break;
          }
          lastStartStderr = daemonStart.stderr ?? '';
          // Let launchd finish the (async) unload before the next bootstrap so
          // the retry gets a real health window instead of a loaded-but-unhealthy
          // fast-return.
          await new Promise((settle) => setTimeout(settle, 500));
        }
        expect(
          startedOk,
          `daemon never served on resolved port ${daemonPort} after stop→start/restart retries: ${lastStartStderr}`,
        ).toBe(true);

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
        // Guard: only tear down a daemon we actually installed. If the retry
        // loop never resolved a port, `overrides` is empty and running
        // `daemon stop`/`uninstall` with no --label/--port would target the
        // default (production) daemon — never do that.
        if (daemonPort !== '') {
          spawnSync('bash', ['-c', `echoctl daemon stop ${shellArgs(overrides)}`], {
            env,
            encoding: 'utf8',
          });
          spawnSync('bash', ['-c', `echoctl daemon uninstall ${shellArgs(overrides)}`], {
            env,
            encoding: 'utf8',
          });
        }
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
    // 180s (raised from 75s): this real-daemon smoke spends ~40-65s on
    // build:cli + npm pack + global install plus real launchd bring-up, and it
    // runs on a shared dev machine whose background daemons keep load high — the
    // packed smoke measured 82s even in ISOLATION under that load, and full-suite
    // CPU contention stacks on top. The old 75s cap had no room for that, let
    // alone the AC1 install/start retry insurance (each retry ~10s). 180s gives
    // the base run + retries genuine headroom so exhaustion surfaces as this
    // test's crafted expect() message rather than an opaque vitest timeout; a
    // truly-hung daemon still fails the internal ~10s health waits and surfaces
    // long before 180s.
    180_000,
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
