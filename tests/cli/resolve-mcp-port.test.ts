import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HealthzProbeOutcome } from '../../src/cli/commands/init.js';

let tmpRoot: string;
let echoHome: string;
let originalEchoHome: string | undefined;
let originalPort: string | undefined;

async function loadInit(): Promise<typeof import('../../src/cli/commands/init.js')> {
  return import('../../src/cli/commands/init.js');
}

function healthy(version: string | null): HealthzProbeOutcome {
  return { healthy: true, runtimeVersion: version };
}

const down: HealthzProbeOutcome = { healthy: false, runtimeVersion: null };

function probeStub(outcomes: Record<number, HealthzProbeOutcome>): {
  calls: number[];
  probe: (port: number) => Promise<HealthzProbeOutcome>;
} {
  const calls: number[] = [];
  return {
    calls,
    probe: async (port: number): Promise<HealthzProbeOutcome> => {
      calls.push(port);
      return outcomes[port] ?? down;
    },
  };
}

function writeOnboardingRecord(extra: Record<string, unknown>): void {
  mkdirSync(join(echoHome, 'state'), { recursive: true });
  writeFileSync(
    join(echoHome, 'state/onboarding.json'),
    `${JSON.stringify(
      {
        schema_version: 1,
        created_at: '2026-05-26T00:00:00.000Z',
        last_updated_at: '2026-05-26T00:00:00.000Z',
        completed: true,
        agents: [],
        ...extra,
      },
      null,
      2,
    )}\n`,
  );
}

describe('resolveMcpPort', () => {
  beforeEach(() => {
    originalEchoHome = process.env.ECHO_HOME;
    originalPort = process.env.ECHO_MCP_PORT;
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-resolve-port-'));
    echoHome = join(tmpRoot, 'echo-home');
    process.env.ECHO_HOME = echoHome;
    delete process.env.ECHO_MCP_PORT;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEchoHome === undefined) delete process.env.ECHO_HOME;
    else process.env.ECHO_HOME = originalEchoHome;
    if (originalPort === undefined) delete process.env.ECHO_MCP_PORT;
    else process.env.ECHO_MCP_PORT = originalPort;
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('prefers an explicit flag port over env and record', async () => {
    const { resolveMcpPort } = await loadInit();
    const { calls, probe } = probeStub({ 40001: healthy('9.9.9') });
    const resolved = await resolveMcpPort({
      flagPort: 40001,
      env: { ECHO_MCP_PORT: '41111' },
      readRecordedPort: () => 39478,
      probeHealthz: probe,
    });
    expect(resolved).toEqual({ port: 40001, source: 'flag', runtimeVersion: '9.9.9' });
    expect(calls).toEqual([40001]);
  });

  it('uses a valid ECHO_MCP_PORT before the record', async () => {
    const { resolveMcpPort } = await loadInit();
    const { calls, probe } = probeStub({ 41111: healthy('1.0.0') });
    const resolved = await resolveMcpPort({
      env: { ECHO_MCP_PORT: '41111' },
      readRecordedPort: () => 39478,
      probeHealthz: probe,
    });
    expect(resolved).toEqual({ port: 41111, source: 'env', runtimeVersion: '1.0.0' });
    expect(calls).toEqual([41111]);
  });

  it('falls through an invalid ECHO_MCP_PORT to the recorded bound_port', async () => {
    const { resolveMcpPort } = await loadInit();
    const { probe } = probeStub({});
    const resolved = await resolveMcpPort({
      env: { ECHO_MCP_PORT: 'not-a-port' },
      readRecordedPort: () => 39478,
      probeHealthz: probe,
    });
    expect(resolved.port).toBe(39478);
    expect(resolved.source).toBe('record');
  });

  it('reads bound_port from the onboarding record on disk when env is unset', async () => {
    writeOnboardingRecord({ bound_port: 39478 });
    const { resolveMcpPort } = await loadInit();
    const { calls, probe } = probeStub({ 39478: healthy('0.1.0-beta.5') });
    const resolved = await resolveMcpPort({ probeHealthz: probe });
    expect(resolved).toEqual({ port: 39478, source: 'record', runtimeVersion: '0.1.0-beta.5' });
    expect(calls).toEqual([39478]);
  });

  it('ignores a record without bound_port and probes candidates instead', async () => {
    writeOnboardingRecord({});
    const { resolveMcpPort } = await loadInit();
    const { calls, probe } = probeStub({ 39478: healthy('0.1.0-beta.5') });
    const resolved = await resolveMcpPort({ probeHealthz: probe });
    expect(resolved).toEqual({ port: 39478, source: 'probe', runtimeVersion: '0.1.0-beta.5' });
    expect(calls).toEqual([39478]);
  });

  it('probes 39478 before 38478 and picks the first healthy port', async () => {
    const { resolveMcpPort } = await loadInit();
    const { calls, probe } = probeStub({ 38478: healthy('0.1.0-beta.1') });
    const resolved = await resolveMcpPort({
      readRecordedPort: () => null,
      probeHealthz: probe,
    });
    expect(resolved).toEqual({ port: 38478, source: 'probe', runtimeVersion: '0.1.0-beta.1' });
    expect(calls).toEqual([39478, 38478]);
  });

  it('defaults to 38478 with a warning when no live daemon is found', async () => {
    const { resolveMcpPort } = await loadInit();
    const { calls, probe } = probeStub({});
    const warnings: string[] = [];
    const resolved = await resolveMcpPort({
      readRecordedPort: () => null,
      probeHealthz: probe,
      warn: (line) => warnings.push(line),
    });
    expect(resolved).toEqual({ port: 38478, source: 'default', runtimeVersion: null });
    expect(calls).toEqual([39478, 38478]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('no live ECHO daemon');
    expect(warnings[0]).toContain('38478');
  });

  it('keeps the resolved port even when its healthz probe is unhealthy for env source', async () => {
    const { resolveMcpPort } = await loadInit();
    const { probe } = probeStub({});
    const resolved = await resolveMcpPort({
      env: { ECHO_MCP_PORT: '41111' },
      probeHealthz: probe,
    });
    expect(resolved).toEqual({ port: 41111, source: 'env', runtimeVersion: null });
  });
});

describe('resolveMcpPortSync', () => {
  beforeEach(() => {
    originalEchoHome = process.env.ECHO_HOME;
    originalPort = process.env.ECHO_MCP_PORT;
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-resolve-port-sync-'));
    echoHome = join(tmpRoot, 'echo-home');
    process.env.ECHO_HOME = echoHome;
    delete process.env.ECHO_MCP_PORT;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEchoHome === undefined) delete process.env.ECHO_HOME;
    else process.env.ECHO_HOME = originalEchoHome;
    if (originalPort === undefined) delete process.env.ECHO_MCP_PORT;
    else process.env.ECHO_MCP_PORT = originalPort;
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('prefers env, then the recorded bound_port, then 38478', async () => {
    writeOnboardingRecord({ bound_port: 39478 });
    const { resolveMcpPortSync } = await loadInit();
    expect(resolveMcpPortSync()).toBe(39478);
    process.env.ECHO_MCP_PORT = '41111';
    expect(resolveMcpPortSync()).toBe(41111);
  });

  it('falls back to 38478 without a record', async () => {
    const { resolveMcpPortSync } = await loadInit();
    expect(resolveMcpPortSync()).toBe(38478);
  });
});
