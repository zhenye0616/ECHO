import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tmpRoot: string;
let echoHome: string;
let dataDir: string;
let originalEchoHome: string | undefined;
let originalDataDir: string | undefined;
let originalPort: string | undefined;

async function loadDoctor(): Promise<typeof import('../../src/cli/commands/doctor.js')> {
  return import('../../src/cli/commands/doctor.js');
}

function writeState(
  agentReason: 'ok' | 'manual-only' | 'auth-required' = 'ok',
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
        agents: [
          {
            id: agentReason === 'manual-only' ? 'cursor' : 'codex',
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
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-doctor-'));
    echoHome = join(tmpRoot, 'echo-home');
    dataDir = join(tmpRoot, 'data');
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

    const report = JSON.parse(out.join('')) as { overall: string };
    expect(code).toBe(0);
    expect(report.overall).toBe('healthy');
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

    expect(parseDoctorArgs([
      '--home',
      isolatedHome,
      '--port',
      '41235',
      '--label',
      'com.echo.daemon.walkthrough',
    ])).toEqual({
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
});
