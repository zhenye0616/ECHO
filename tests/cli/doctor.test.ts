import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const REPO = process.cwd();
const INSTALLER = join(REPO, 'tools/install-echo-codex-skills.sh');
const VITE_NODE = join(REPO, 'node_modules/.bin/vite-node');

let tmpRoot: string;
let echoHome: string;
let dataDir: string;
let originalEchoHome: string | undefined;
let originalDataDir: string | undefined;
let originalPort: string | undefined;
let originalHome: string | undefined;

async function loadDoctor(): Promise<typeof import('../../src/cli/commands/doctor.js')> {
  return import('../../src/cli/commands/doctor.js');
}

function writeState(
  agentReason: 'ok' | 'manual-only' | 'auth-required' | 'mcp-not-configured' = 'ok',
  home = echoHome,
): void {
  mkdirSync(join(home, 'state'), { recursive: true });
  const now = '2026-05-26T00:00:00.000Z';
  writeFileSync(
    join(home, 'state/onboarding.json'),
    `${JSON.stringify(
      {
        schema_version: 1,
        created_at: now,
        last_updated_at: now,
        completed: true,
        profile: 'customer',
        agents: [
          {
            id:
              agentReason === 'manual-only'
                ? 'cursor'
                : agentReason === 'mcp-not-configured'
                  ? 'claude-code'
                  : 'codex',
            detected_at: now,
            wired_at: now,
            probed_at: null,
            capabilities: [],
            wire_error: null,
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(home, 'state/projects.json'),
    `${JSON.stringify({ schema_version: 1, last_refreshed_at: now, default_project: null, projects: [] }, null, 2)}\n`,
  );
}

describe('runDoctor', () => {
  beforeEach(() => {
    originalEchoHome = process.env.ECHO_HOME;
    originalDataDir = process.env.ECHO_DATA_DIR;
    originalPort = process.env.ECHO_MCP_PORT;
    originalHome = process.env.HOME;
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-doctor-'));
    echoHome = join(tmpRoot, 'echo-home');
    dataDir = join(tmpRoot, 'data');
    process.env.HOME = join(tmpRoot, 'home');
    process.env.ECHO_HOME = echoHome;
    process.env.ECHO_DATA_DIR = dataDir;
    process.env.ECHO_MCP_PORT = '39998';
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEchoHome === undefined) delete process.env.ECHO_HOME;
    else process.env.ECHO_HOME = originalEchoHome;
    if (originalDataDir === undefined) delete process.env.ECHO_DATA_DIR;
    else process.env.ECHO_DATA_DIR = originalDataDir;
    if (originalPort === undefined) delete process.env.ECHO_MCP_PORT;
    else process.env.ECHO_MCP_PORT = originalPort;
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('emits healthy JSON and sends the MCP initialize headers', async () => {
    writeState();
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'daemon.pid'), '123');
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const { runDoctor } = await loadDoctor();
    const out: string[] = [];

    const code = await runDoctor({
      json: true,
      stdout: {
        write: (s) => {
          out.push(String(s));
          return true;
        },
      },
      fetch: (async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return new Response('{}', { status: 200 });
      }) as typeof fetch,
      probeAgents: async () => [{ agent: 'codex', probed: true, latencyMs: 1 }],
    });

    const report = JSON.parse(out.join('')) as {
      echoHome: { profile: string };
      overall: string;
    };
    expect(code).toBe(0);
    expect(report.overall).toBe('healthy');
    expect(report.echoHome.profile).toBe('customer');
    expect(calls[0]!.init.headers).toMatchObject({
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(calls[0]!.init.body))).toMatchObject({
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', clientInfo: { name: 'echoctl-doctor' } },
    });
  });

  it('documents and honors --home, --port, and --label', async () => {
    const isolatedHome = join(tmpRoot, 'isolated-echo-home');
    writeState('ok', isolatedHome);
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'daemon.pid'), '123');
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const { DOCTOR_HELP, parseDoctorArgs, runDoctor } = await loadDoctor();
    const out: string[] = [];

    expect(
      parseDoctorArgs([
        '--home',
        isolatedHome,
        '--port',
        '41235',
        '--label',
        'com.echo.daemon.walkthrough',
      ]),
    ).toEqual({
      home: isolatedHome,
      port: '41235',
      label: 'com.echo.daemon.walkthrough',
    });
    expect(DOCTOR_HELP).toContain('--home <path>');
    expect(DOCTOR_HELP).toContain('--port <n>');
    expect(DOCTOR_HELP).toContain('--label <id>');
    expect(() => parseDoctorArgs(['--port', '0'])).toThrow('invalid --port: 0');

    const code = await runDoctor({
      json: true,
      home: isolatedHome,
      port: '41235',
      label: 'com.echo.daemon.walkthrough',
      stdout: { write: (s) => (out.push(String(s)), true) },
      fetch: (async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return new Response('{}', { status: 200 });
      }) as typeof fetch,
      probeAgents: async () => [{ agent: 'codex', probed: true, latencyMs: 1 }],
    });

    const report = JSON.parse(out.join('')) as {
      daemon: { port: number };
      echoHome: { root: string };
      overall: string;
    };
    expect(code).toBe(0);
    expect(calls[0]!.url).toBe('http://127.0.0.1:41235/mcp');
    expect(report.daemon.port).toBe(41235);
    expect(report.echoHome.root).toBe(isolatedHome);
    expect(report.overall).toBe('healthy');
  });

  it('rolls unreachable daemon without pid lock to broken and stale pid lock to degraded', async () => {
    writeState();
    const { buildDoctorReport } = await loadDoctor();

    const broken = await buildDoctorReport({
      fetch: (async () => {
        throw new Error('offline');
      }) as typeof fetch,
      probeAgents: async () => [{ agent: 'codex', probed: true, latencyMs: 1 }],
    });
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'daemon.pid'), '123');
    const degraded = await buildDoctorReport({
      fetch: (async () => {
        throw new Error('offline');
      }) as typeof fetch,
      probeAgents: async () => [{ agent: 'codex', probed: true, latencyMs: 1 }],
    });

    expect(broken.overall).toBe('broken');
    expect(degraded.overall).toBe('degraded');
  });

  it('reports Codex adapter drift as degraded with opaque detail and remediation', async () => {
    writeState();
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'daemon.pid'), '123');
    const { buildDoctorReport } = await loadDoctor();

    const report = await buildDoctorReport({
      fetch: (async () => new Response('{}', { status: 200 })) as typeof fetch,
      probeAgents: async () => [{ agent: 'codex', probed: true, latencyMs: 1 }],
      codexAdapterCheck: async () => ({
        status: 'drifted',
        detail: 'DRIFT: ECHO:process-backlog: installed SKILL.md drift',
        remediationCommand: `${REPO}/tools/install-echo-codex-skills.sh`,
      }),
    });

    expect(report.overall).toBe('degraded');
    expect(report.codexAdapter).toMatchObject({
      status: 'drifted',
      detail: expect.stringContaining('ECHO:process-backlog'),
      remediationCommand: expect.stringContaining('install-echo-codex-skills.sh'),
    });
  });

  it('maps Codex adapter child errors to non-empty check-error detail', async () => {
    writeState();
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'daemon.pid'), '123');
    const { buildDoctorReport, codexAdapterReportFromOutcome } = await loadDoctor();
    const mapped = codexAdapterReportFromOutcome(
      { exitCode: 127, signal: null, stdout: '', stderr: '' },
      INSTALLER,
    );

    expect(mapped.status).toBe('check-error');
    expect(mapped.detail).toContain('127');

    const signaled = codexAdapterReportFromOutcome(
      { exitCode: null, signal: 'SIGTERM', stdout: '', stderr: '' },
      INSTALLER,
    );
    expect(signaled.status).toBe('check-error');
    expect(signaled.detail).toContain('SIGTERM');

    const report = await buildDoctorReport({
      fetch: (async () => new Response('{}', { status: 200 })) as typeof fetch,
      probeAgents: async () => [{ agent: 'codex', probed: true, latencyMs: 1 }],
      codexAdapterCheck: async () => mapped,
    });
    expect(report.overall).toBe('degraded');
    expect(report.codexAdapter.detail).not.toBe('');
  });

  it.each(['win32', 'linux'] as const)(
    'treats a reachable manual daemon as healthy on %s',
    async (platform) => {
      writeState();
      const { buildDoctorReport } = await loadDoctor();

      const report = await buildDoctorReport({
        platform,
        fetch: (async () => new Response('{}', { status: 200 })) as typeof fetch,
        probeAgents: async () => [{ agent: 'codex', probed: true, latencyMs: 1 }],
      });

      expect(report.daemon.mcpReachable).toBe(true);
      expect(report.overall).toBe('healthy');
    },
  );

  it('prints exact user-scope claude-code MCP remediation', async () => {
    writeState('mcp-not-configured');
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'daemon.pid'), '123');
    const { runDoctor } = await loadDoctor();
    const out: string[] = [];

    const code = await runDoctor({
      port: '41234',
      stdout: { write: (s) => (out.push(String(s)), true) },
      fetch: (async () => new Response('{}', { status: 200 })) as typeof fetch,
      probeAgents: async () => [
        {
          agent: 'claude-code',
          probed: false,
          reason: 'mcp-not-configured',
          detail: 'No such tool mcp__echo__echo_ping',
        },
      ],
    });

    const text = out.join('');
    expect(code).toBe(1);
    expect(text).toContain('agent claude-code: mcp-not-configured');
    expect(text).toContain('profile=customer');
    expect(text).toContain(
      'claude mcp add --transport http --scope user echo http://127.0.0.1:41234/mcp',
    );
    expect(text).toContain('user-scope ECHO MCP registration');
    expect(text).not.toContain('claude mcp remove echo -s local');
    expect(text).toContain('echoctl doctor');
  });

  it('prints Codex adapter drift in human doctor output', async () => {
    writeState();
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'daemon.pid'), '123');
    const { runDoctor } = await loadDoctor();
    const out: string[] = [];

    const code = await runDoctor({
      stdout: { write: (s) => (out.push(String(s)), true) },
      fetch: (async () => new Response('{}', { status: 200 })) as typeof fetch,
      probeAgents: async () => [{ agent: 'codex', probed: true, latencyMs: 1 }],
      codexAdapterCheck: async () => ({
        status: 'drifted',
        detail: 'DRIFT: ECHO:process-backlog: installed SKILL.md drift',
        remediationCommand: INSTALLER,
      }),
    });

    const text = out.join('');
    expect(code).toBe(1);
    expect(text).toContain('codex-adapter: drifted');
    expect(text).toContain('ECHO:process-backlog');
    expect(text).toContain(INSTALLER);
  });

  it('runs the real doctor command from a non-repo cwd with sparse PATH without false Codex drift', () => {
    const cliHome = join(tmpRoot, 'cli-home');
    const cliEchoHome = join(tmpRoot, 'cli-echo-home');
    const nonRepoCwd = mkdtempSync(join(tmpdir(), 'echo-doctor-cli-nonrepo-'));
    writeState('ok', cliEchoHome);
    const install = spawnSync('bash', [INSTALLER], {
      cwd: REPO,
      encoding: 'utf8',
      env: { ...process.env, HOME: cliHome },
    });
    expect(install.status).toBe(0);

    const sparsePath = '/usr/local/bin:/usr/bin:/bin';
    const doctor = spawnSync(
      VITE_NODE,
      [
        '--script',
        join(REPO, 'src/cli/index.ts'),
        '--json',
        'doctor',
        '--home',
        cliEchoHome,
        '--port',
        '39998',
      ],
      {
        cwd: nonRepoCwd,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: cliHome,
          ECHO_DATA_DIR: join(tmpRoot, 'cli-data'),
          ECHO_MCP_PORT: '39998',
          PATH: sparsePath,
        },
      },
    );

    const report = JSON.parse(doctor.stdout) as {
      codexAdapter: { status: string; detail: string };
    };
    expect(doctor.status).toBe(1);
    expect(report.codexAdapter.status).toBe('ok');
    expect(report.codexAdapter.detail).toContain(
      'OK: all managed Codex ECHO skills match canonical sources',
    );
    rmSync(nonRepoCwd, { recursive: true, force: true });
  }, 45_000);
});
