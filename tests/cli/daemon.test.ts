import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderLaunchdPlist, runDaemon, type DaemonConfig } from '../../src/cli/commands/daemon.js';

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

function makeSpawnSync(calls: Call[], opts: { loaded?: boolean } = {}) {
  return ((command: string, args: readonly string[]) => {
    const argv = [...args];
    calls.push({ command, args: argv });
    if (command === '/node/v22/bin/node') {
      return { status: 0, stdout: 'v22.1.0\n', stderr: '' };
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
    if (command === 'tail') {
      return { status: 0, stdout: argv.join('\n'), stderr: '' };
    }
    return { status: 0, stdout: '', stderr: '' };
  }) as typeof import('node:child_process').spawnSync;
}

async function runWith(
  argv: string[],
  opts: { loaded?: boolean; health?: boolean; daemonPathOverride?: string } = {},
): Promise<{ code: number; calls: Call[]; stdout: string; stderr: string }> {
  const calls: Call[] = [];
  const code = await runDaemon({
    argv,
    stdout: { write: (s) => (out.push(String(s)), true) },
    stderr: { write: (s) => (err.push(String(s)), true) },
    spawnSync: makeSpawnSync(calls, { loaded: opts.loaded }),
    healthProbe: async () => opts.health ?? true,
    sleep: async () => {},
    getuid: () => 501,
    processExecPath: '/node/v22/bin/node',
    daemonPath: opts.daemonPathOverride ?? daemonPath,
    probeDeadlineMs: 0,
  });
  return { code, calls, stdout: out.join(''), stderr: err.join('') };
}

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
    expect(xml).not.toContain('WorkingDirectory');
    expect(xml).toContain('<string>/node/v22/bin/node</string>');
    expect(xml).toContain('<string>45678</string>');
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
