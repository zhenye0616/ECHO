import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  formatUptime,
  getDaemonUptimeSeconds,
  renderLaunchdPlist,
  runDaemon,
  type DaemonConfig,
} from '../../src/cli/commands/daemon.js';

let tmpRoot: string;
let packageRoot: string;
let daemonPath: string;
let plistPath: string;
let logDir: string;
let dataDir: string;
let dbPath: string;
let out: string[];
let err: string[];

interface Call {
  command: string;
  args: string[];
}

interface MockCommandResult {
  status?: number | null;
  stdout?: string;
  stderr?: string;
  error?: NodeJS.ErrnoException;
}

function writeRuntimePackage(): void {
  daemonPath = join(packageRoot, 'dist/daemon/index.js');
  mkdirSync(dirname(daemonPath), { recursive: true });
  writeFileSync(daemonPath, 'console.log("daemon");\n');
  const migrationsDir = join(packageRoot, 'dist/storage/migrations');
  mkdirSync(migrationsDir, { recursive: true });
  writeFileSync(join(migrationsDir, '001-init.sql'), 'select 1;\n');
  mkdirSync(join(packageRoot, 'tools/review-queue/schemas'), { recursive: true });
  writeFileSync(join(packageRoot, 'tools/review-queue/coord-roles.json'), '{}\n');
  writeFileSync(join(packageRoot, 'tools/review-queue/reviewers.json'), '{}\n');
  writeFileSync(join(packageRoot, 'tools/review-queue/schemas/coord-roles.schema.json'), '{}\n');
}

function config(overrides: Partial<DaemonConfig> = {}): DaemonConfig {
  return {
    label: 'com.echo.daemon.test-unit',
    plistPath,
    logDir,
    home: join(tmpRoot, 'home'),
    port: 45678,
    dataDir,
    dbPath,
    nodePath: '/node/v22/bin/node',
    daemonPath,
    ...overrides,
  };
}

function writePlist(overrides: Partial<DaemonConfig> = {}): void {
  mkdirSync(dirname(plistPath), { recursive: true });
  writeFileSync(plistPath, renderLaunchdPlist(config(overrides)));
}

function installArgs(extra: string[] = []): string[] {
  return [
    'install',
    '--plist-path',
    plistPath,
    '--home',
    join(tmpRoot, 'home'),
    '--port',
    '45678',
    '--log-dir',
    logDir,
    '--data-dir',
    dataDir,
    '--db-path',
    dbPath,
    ...extra,
  ];
}

function makeHarnessRepo(path: string): string {
  mkdirSync(join(path, 'tools', 'review-queue'), { recursive: true });
  return path;
}

function readInstalledPlist(): string {
  return readFileSync(plistPath, 'utf8');
}

function makeSpawnSync(
  calls: Call[],
  opts: { loaded?: boolean; etime?: string; psStatus?: number; git?: MockCommandResult } = {},
) {
  return ((command: string, args: readonly string[]) => {
    const argv = [...args];
    calls.push({ command, args: argv });
    if (command === '/node/v22/bin/node') {
      return { status: 0, stdout: 'v22.1.0\n', stderr: '' };
    }
    if (command === 'git' && argv.join(' ') === 'rev-parse --show-toplevel') {
      const git = opts.git ?? { status: 1, stdout: '', stderr: 'not a git repository\n' };
      return {
        status: git.status ?? null,
        stdout: git.stdout ?? '',
        stderr: git.stderr ?? '',
        error: git.error,
      };
    }
    if (command === 'plutil') {
      return { status: 0, stdout: `${argv[1]}: OK\n`, stderr: '' };
    }
    if (command === 'launchctl' && argv[0] === 'print') {
      return opts.loaded
        ? { status: 0, stdout: 'pid = 12345\nstate = running\n', stderr: '' }
        : { status: 3, stdout: '', stderr: 'not loaded\n' };
    }
    if (command === 'launchctl') {
      return { status: 0, stdout: '', stderr: '' };
    }
    if (command === 'ps') {
      return opts.psStatus === undefined || opts.psStatus === 0
        ? { status: 0, stdout: `${opts.etime ?? '1:02:03'}\n`, stderr: '' }
        : { status: opts.psStatus, stdout: '', stderr: 'no such process\n' };
    }
    if (command === 'tail') {
      return { status: 0, stdout: argv.join('\n'), stderr: '' };
    }
    return { status: 0, stdout: '', stderr: '' };
  }) as typeof import('node:child_process').spawnSync;
}

async function runWith(
  argv: string[],
  opts: {
    loaded?: boolean;
    health?: boolean;
    daemonPathOverride?: string;
    etime?: string;
    psStatus?: number;
    json?: boolean;
    platform?: NodeJS.Platform;
    cwd?: string;
    git?: MockCommandResult;
  } = {},
): Promise<{ code: number; calls: Call[]; stdout: string; stderr: string }> {
  const calls: Call[] = [];
  const code = await runDaemon({
    argv,
    json: opts.json,
    stdout: { write: (s) => (out.push(String(s)), true) },
    stderr: { write: (s) => (err.push(String(s)), true) },
    spawnSync: makeSpawnSync(calls, {
      loaded: opts.loaded,
      etime: opts.etime,
      psStatus: opts.psStatus,
      git: opts.git,
    }),
    healthProbe: async () => opts.health ?? true,
    sleep: async () => {},
    getuid: () => 501,
    platform: opts.platform ?? 'darwin',
    processExecPath: '/node/v22/bin/node',
    daemonPath: opts.daemonPathOverride ?? daemonPath,
    probeDeadlineMs: 0,
    cwd: opts.cwd,
  });
  return { code, calls, stdout: out.join(''), stderr: err.join('') };
}

describe('daemon uptime helpers', () => {
  it('formats uptime using compact day, hour, minute, and second units', () => {
    expect(formatUptime(0)).toBe('0s');
    expect(formatUptime(47)).toBe('47s');
    expect(formatUptime(7 * 60 + 5)).toBe('7m 5s');
    expect(formatUptime(2 * 3_600 + 14 * 60 + 33)).toBe('2h 14m 33s');
    expect(formatUptime(3 * 86_400 + 5 * 3_600 + 22 * 60 + 9)).toBe('3d 5h 22m');
  });

  it('reads daemon uptime from ps etime output', async () => {
    const calls: Call[] = [];
    await expect(
      getDaemonUptimeSeconds(12345, {
        spawnSync: makeSpawnSync(calls, { etime: '3-05:22:09' }),
      }),
    ).resolves.toBe(3 * 86_400 + 5 * 3_600 + 22 * 60 + 9);

    expect(calls).toContainEqual({
      command: 'ps',
      args: ['-o', 'etime=', '-p', '12345'],
    });
    await expect(
      getDaemonUptimeSeconds(12345, {
        spawnSync: makeSpawnSync([], { etime: '2:14:33' }),
      }),
    ).resolves.toBe(2 * 3_600 + 14 * 60 + 33);
    await expect(
      getDaemonUptimeSeconds(12345, {
        spawnSync: makeSpawnSync([], { etime: '00:47' }),
      }),
    ).resolves.toBe(47);
  });

  it('returns null when ps fails or etime is malformed', async () => {
    await expect(
      getDaemonUptimeSeconds(12345, {
        spawnSync: makeSpawnSync([], { psStatus: 1 }),
      }),
    ).resolves.toBeNull();
    await expect(
      getDaemonUptimeSeconds(12345, {
        spawnSync: makeSpawnSync([], { etime: 'not-time' }),
      }),
    ).resolves.toBeNull();
    await expect(getDaemonUptimeSeconds(0)).resolves.toBeNull();
  });
});

describe('echoctl daemon', () => {
  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-daemon-cli-'));
    packageRoot = join(tmpRoot, 'pkg');
    plistPath = join(tmpRoot, 'launchd/test.plist');
    logDir = join(tmpRoot, 'logs');
    dataDir = join(tmpRoot, 'data');
    dbPath = join(dataDir, 'echo.db');
    out = [];
    err = [];
    writeRuntimePackage();
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('renders XML-safe plist values without a source WorkingDirectory', () => {
    const xml = renderLaunchdPlist(config({ home: join(tmpRoot, 'home & "quoted"') }));
    expect(xml).toContain('home &amp; &quot;quoted&quot;');
    expect(xml).toContain('<key>ECHO_DATA_DIR</key>');
    expect(xml).toContain('<key>ECHO_DB_PATH</key>');
    expect(xml).not.toContain('<key>ECHO_REPO_ROOT</key>');
    expect(xml).not.toContain('WorkingDirectory');
    expect(xml).toContain('<string>/node/v22/bin/node</string>');
    expect(xml).toContain('<string>45678</string>');
  });

  it('install persists an explicit absolute repo root and XML-escapes it', async () => {
    const repoRoot = makeHarnessRepo(join(tmpRoot, 'repo & "quoted"'));
    const { code } = await runWith(installArgs(['--repo-root', repoRoot]));

    expect(code).toBe(0);
    const xml = readInstalledPlist();
    expect(xml).toContain('<key>ECHO_REPO_ROOT</key>');
    expect(xml).toContain('repo &amp; &quot;quoted&quot;');
    expect(xml).not.toContain(`<string>${repoRoot}</string>`);
  });

  it('install derives repo root from the cwd git toplevel when the harness marker exists', async () => {
    const repoRoot = makeHarnessRepo(join(tmpRoot, 'repo'));
    const cwd = join(repoRoot, 'nested', 'dir');
    mkdirSync(cwd, { recursive: true });
    const { code } = await runWith(installArgs(), {
      cwd,
      git: { status: 0, stdout: `${repoRoot}\n`, stderr: '' },
    });

    expect(code).toBe(0);
    const xml = readInstalledPlist();
    expect(xml).toContain('<key>ECHO_REPO_ROOT</key>');
    expect(xml).toContain(`<string>${repoRoot}</string>`);
  });

  it('install omits repo root silently when git is unavailable for cwd derivation', async () => {
    const cwd = join(tmpRoot, 'not-git');
    mkdirSync(cwd, { recursive: true });
    const enoent = Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' });
    const { code, stderr } = await runWith(installArgs(), {
      cwd,
      git: { status: null, stdout: '', stderr: '', error: enoent },
    });

    expect(code).toBe(0);
    expect(stderr).not.toContain('repo-root');
    expect(readInstalledPlist()).not.toContain('<key>ECHO_REPO_ROOT</key>');
  });

  it('install omits an auto-derived git toplevel that lacks the reviewer harness marker', async () => {
    const repoRoot = join(tmpRoot, 'unrelated-repo');
    mkdirSync(repoRoot, { recursive: true });
    const { code, stderr } = await runWith(installArgs(), {
      cwd: repoRoot,
      git: { status: 0, stdout: `${repoRoot}\n`, stderr: '' },
    });

    expect(code).toBe(0);
    expect(stderr).not.toContain('repo-root');
    expect(readInstalledPlist()).not.toContain('<key>ECHO_REPO_ROOT</key>');
  });

  it('install resolves a relative explicit repo root against the install cwd', async () => {
    const cwd = join(tmpRoot, 'installer-cwd');
    const repoRoot = makeHarnessRepo(join(cwd, 'relative-harness'));
    mkdirSync(cwd, { recursive: true });
    const { code } = await runWith(installArgs(['--repo-root', 'relative-harness']), { cwd });

    expect(code).toBe(0);
    const xml = readInstalledPlist();
    expect(xml).toContain('<key>ECHO_REPO_ROOT</key>');
    expect(xml).toContain(`<string>${repoRoot}</string>`);
  });

  it.each([
    ['non-existent directory', () => join(tmpRoot, 'missing-repo-root')],
    [
      'directory without reviewer harness',
      () => {
        const path = join(tmpRoot, 'repo-without-harness');
        mkdirSync(path, { recursive: true });
        return path;
      },
    ],
  ])('install rejects explicit repo root pointing at a %s and writes no plist', async (_label, makeRoot) => {
    const badRoot = makeRoot();
    const { code, stderr } = await runWith(installArgs(['--repo-root', badRoot]));

    expect(code).toBe(2);
    expect(stderr).toContain('invalid --repo-root');
    expect(existsSync(plistPath)).toBe(false);
  });

  it('install uses only the overridden launchd label and writes a linted plist before bootout', async () => {
    const { code, calls, stdout } = await runWith([
      'install',
      '--label',
      'com.echo.daemon.test-abc',
      '--plist-path',
      plistPath,
      '--home',
      join(tmpRoot, 'home'),
      '--port',
      '45678',
      '--log-dir',
      logDir,
      '--data-dir',
      dataDir,
      '--db-path',
      dbPath,
    ], { loaded: true });

    expect(code).toBe(0);
    expect(stdout).toContain('com.echo.daemon.test-abc');
    expect(calls.map((c) => `${c.command} ${c.args.join(' ')}`)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('plutil -lint'),
        expect.stringContaining('launchctl bootout gui/501/com.echo.daemon.test-abc'),
        expect.stringContaining(`launchctl bootstrap gui/501 ${plistPath}`),
      ]),
    );
    expect(calls.some((c) => c.args.includes('gui/501/com.echo.daemon'))).toBe(false);
  });

  it('restart preflight failure aborts before bootout or bootstrap', async () => {
    writePlist({ daemonPath: join(tmpRoot, 'missing/dist/daemon/index.js') });
    const { code, calls, stderr } = await runWith(['restart', '--plist-path', plistPath]);

    expect(code).toBe(2);
    expect(stderr).toContain('daemon binary missing');
    expect(calls.some((c) => c.command === 'launchctl' && c.args[0] === 'bootout')).toBe(false);
    expect(calls.some((c) => c.command === 'launchctl' && c.args[0] === 'bootstrap')).toBe(false);
  });

  it('recovery-load start preflight failure aborts before bootstrap', async () => {
    writePlist({ daemonPath: join(tmpRoot, 'missing/dist/daemon/index.js') });
    const { code, calls, stderr } = await runWith([
      'start',
      '--label',
      'com.echo.daemon.test-unit',
      '--plist-path',
      plistPath,
    ]);

    expect(code).toBe(2);
    expect(stderr).toContain('daemon binary missing');
    expect(calls.some((c) => c.command === 'launchctl' && c.args[0] === 'bootout')).toBe(false);
    expect(calls.some((c) => c.command === 'launchctl' && c.args[0] === 'bootstrap')).toBe(false);
  });

  it('restart bootouts failed replacement after probe timeout', async () => {
    writePlist();
    const { code, calls, stderr } = await runWith(
      ['restart', '--label', 'com.echo.daemon.test-unit', '--plist-path', plistPath],
      { health: false },
    );
    const launchctlCalls = calls
      .filter((c) => c.command === 'launchctl')
      .map((c) => c.args.join(' '));

    expect(code).toBe(1);
    expect(stderr).toContain('did not become healthy');
    expect(launchctlCalls).toEqual([
      'bootout gui/501/com.echo.daemon.test-unit',
      `bootstrap gui/501 ${plistPath}`,
      'bootout gui/501/com.echo.daemon.test-unit',
    ]);
  });

  it('start refuses to no-op when the label is loaded but unhealthy', async () => {
    const { code, calls, stderr } = await runWith(['start'], { loaded: true, health: false });

    expect(code).toBe(1);
    expect(stderr).toContain('loaded but unhealthy');
    expect(calls.some((c) => c.command === 'launchctl' && c.args[0] === 'bootout')).toBe(false);
    expect(calls.some((c) => c.command === 'launchctl' && c.args[0] === 'bootstrap')).toBe(false);
  });

  it('start is a no-op when the label is already loaded and healthy', async () => {
    const { code, calls, stdout } = await runWith(['start'], { loaded: true, health: true });

    expect(code).toBe(0);
    expect(stdout).toContain('already running');
    expect(calls.some((c) => c.command === 'launchctl' && c.args[0] === 'bootout')).toBe(false);
    expect(calls.some((c) => c.command === 'launchctl' && c.args[0] === 'bootstrap')).toBe(false);
  });

  it.each(['win32', 'linux'] as const)(
    'status reports manual-daemon mode and never calls launchctl on %s',
    async (platform) => {
      const { code, calls, stdout } = await runWith(['status'], {
        platform,
        health: true,
        json: true,
      });

      expect(code).toBe(0);
      expect(calls.some((c) => c.command === 'launchctl')).toBe(false);
      expect(JSON.parse(stdout)).toMatchObject({
        daemon: 'manual',
        mode: 'manual-daemon',
        launchd: false,
        health: 'healthy',
      });
    },
  );

  it.each(['win32', 'linux'] as const)(
    'start and stop are clean manual-daemon no-ops on %s',
    async (platform) => {
      const started = await runWith(['start'], { platform });
      out = [];
      err = [];
      const stopped = await runWith(['stop'], { platform });

      expect(started.code).toBe(0);
      expect(stopped.code).toBe(0);
      expect(started.stdout).toContain('Manual daemon mode (no launchd)');
      expect(stopped.stdout).toContain('Manual daemon mode (no launchd)');
      expect(started.calls.some((c) => c.command === 'launchctl')).toBe(false);
      expect(stopped.calls.some((c) => c.command === 'launchctl')).toBe(false);
    },
  );

  it('status reports loaded-but-unhealthy as exit 2 with health broken', async () => {
    writePlist();
    const { code, stdout } = await runWith(
      ['status', '--label', 'com.echo.daemon.test-unit', '--plist-path', plistPath],
      { loaded: true, health: false },
    );

    expect(code).toBe(2);
    expect(stdout).toContain('health:      broken');
    expect(stdout).toContain(`data-dir:    ${dataDir}`);
    expect(stdout).toContain(`db-path:     ${dbPath}`);
    expect(stdout).toContain('uptime:      1h 2m 3s');
    expect(stdout).not.toContain('uptime:      unknown');
  });

  it('status json keeps formatted uptime and exposes raw uptime seconds', async () => {
    writePlist();
    const { code, stdout } = await runWith(
      ['status', '--label', 'com.echo.daemon.test-unit', '--plist-path', plistPath],
      { loaded: true, health: true, etime: '00:47', json: true },
    );

    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({
      daemon: 'running',
      pid: 12345,
      uptime: '47s',
      uptime_seconds: 47,
      health: 'healthy',
    });
  });

  it('logs uses the overridden log directory', async () => {
    const { code, calls, stdout } = await runWith(['logs', '--log-dir', logDir, '--tail', '5']);

    expect(code).toBe(0);
    expect(calls).toContainEqual({
      command: 'tail',
      args: ['-n', '5', join(logDir, 'echo-daemon.out.log'), join(logDir, 'echo-daemon.err.log')],
    });
    expect(stdout).toContain(join(logDir, 'echo-daemon.out.log'));
  });

  it('logs reads stdout and stderr paths back from the installed plist', async () => {
    const installedLogDir = join(tmpRoot, 'installed-logs');
    writePlist({ logDir: installedLogDir });
    const { code, calls, stdout } = await runWith(['logs', '--plist-path', plistPath, '--tail', '5']);

    expect(code).toBe(0);
    expect(calls).toContainEqual({
      command: 'tail',
      args: [
        '-n',
        '5',
        join(installedLogDir, 'echo-daemon.out.log'),
        join(installedLogDir, 'echo-daemon.err.log'),
      ],
    });
    expect(stdout).toContain(join(installedLogDir, 'echo-daemon.out.log'));
  });

  it('stop and restart use bootout/bootstrap, never kill or kickstart', async () => {
    writePlist();
    await runWith(['stop', '--label', 'com.echo.daemon.test-unit']);
    const stopCalls = out.join('');
    out = [];
    err = [];
    const restarted = await runWith([
      'restart',
      '--label',
      'com.echo.daemon.test-unit',
      '--plist-path',
      plistPath,
    ]);

    expect(stopCalls).toContain('stopped');
    expect(restarted.calls.some((c) => c.command === 'kill')).toBe(false);
    expect(restarted.calls.some((c) => c.args.includes('kickstart'))).toBe(false);
    expect(restarted.calls.some((c) => c.command === 'launchctl' && c.args[0] === 'bootout')).toBe(
      true,
    );
    expect(
      restarted.calls.some((c) => c.command === 'launchctl' && c.args[0] === 'bootstrap'),
    ).toBe(true);
  });
});
