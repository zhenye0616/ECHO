import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AtomIterationRecord,
  CaptureEvent,
  CoordAtomIterationRecord,
  EventId,
  QueryFilter,
  Storage,
} from '../../../src/storage/interface.js';
import { buildSourceAppMap } from '../../../src/mcp/util/source-app.js';
import type { AdapterCacheRecord } from '../../../src/echo-home/wizard/adapter-cache.js';
import type { AgentKind } from '../../../src/echo-home/wizard/detect-agents.js';
import type { SyncResult } from '../../../src/echo-home/adapter-sync.js';

class FakeStore implements Storage {
  constructor(private readonly rows: CaptureEvent[]) {}

  async append(): Promise<EventId> {
    throw new Error('unused');
  }

  async query(filter: QueryFilter = {}): Promise<CaptureEvent[]> {
    return this.rows
      .filter(
        (row) => filter.source_prefix === undefined || row.source.startsWith(filter.source_prefix),
      )
      .filter((row) => filter.since === undefined || row.timestamp >= filter.since)
      .filter((row) => filter.until === undefined || row.timestamp < filter.until)
      .slice(0, filter.limit);
  }

  async count(): Promise<number> {
    return this.rows.length;
  }

  async getByIds(): Promise<CaptureEvent[]> {
    return [];
  }

  async iterateCoordAtomsByAppendOrder(): Promise<CoordAtomIterationRecord[]> {
    return [];
  }

  async getCurrentCoordSequence(): Promise<number> {
    return 0;
  }

  async iterateAtomsByAppendOrder(): Promise<AtomIterationRecord[]> {
    return [];
  }

  async getCurrentSequence(): Promise<number> {
    return 0;
  }
}

let tmpRoot: string;
let echoHome: string;
let originalEchoHome: string | undefined;

async function loadWizard(): Promise<typeof import('../../../src/echo-home/wizard/run-wizard.js')> {
  return import('../../../src/echo-home/wizard/run-wizard.js');
}

async function loadPaths(): Promise<typeof import('../../../src/echo-home/paths.js')> {
  return import('../../../src/echo-home/paths.js');
}

function event(source: string, timestamp: string, repoRoot?: string): CaptureEvent {
  return {
    id: `${source}-${timestamp}`,
    source,
    timestamp,
    content: 'x',
    metadata: repoRoot === undefined ? {} : { repo_root: repoRoot },
  };
}

function successResult(agents: AgentKind[]): SyncResult {
  return {
    skillsPopulated: { ok: true, copied: ['x.md'], skipped: [], targetDir: '/tmp/skills' },
    agents: agents.map((agent) => ({
      agent,
      ok: true as const,
      files_written: [],
      actions: [],
    })),
    roles: { results: [], rolesErrors: [] },
    overallOk: true,
  };
}

async function writeInitialState(): Promise<string> {
  const { ECHO_HOME_PATHS } = await loadPaths();
  mkdirSync(ECHO_HOME_PATHS.state, { recursive: true });
  const state = {
    schema_version: 1,
    created_at: '2026-05-20T00:00:00.000Z',
    last_updated_at: '2026-05-20T00:00:00.000Z',
    completed: false,
    agents: [],
  };
  writeFileSync(ECHO_HOME_PATHS.stateOnboarding, `${JSON.stringify(state, null, 2)}\n`);
  return ECHO_HOME_PATHS.stateOnboarding;
}

function cacheOverride(): {
  read: (kind: AgentKind) => AdapterCacheRecord | null;
  write: (rec: AdapterCacheRecord) => void;
} {
  const cache = new Map<AgentKind, AdapterCacheRecord>();
  return {
    read: (kind) => cache.get(kind) ?? null,
    write: (rec) => {
      cache.set(rec.agent, rec);
    },
  };
}

describe('createWizard', () => {
  beforeEach(() => {
    originalEchoHome = process.env.ECHO_HOME;
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-073-run-wizard-'));
    echoHome = join(tmpRoot, 'echo-home');
    process.env.ECHO_HOME = echoHome;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEchoHome === undefined) delete process.env.ECHO_HOME;
    else process.env.ECHO_HOME = originalEchoHome;
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('runs detect → projects → wire → probe → summary → markCompleted', async () => {
    const statePath = await writeInitialState();
    const sources = buildSourceAppMap();
    const store = new FakeStore([
      event(`${sources.codex}a`, '2026-05-25T00:00:00.000Z', '/repo/echo'),
    ]);
    const home = join(tmpRoot, 'home');
    mkdirSync(join(home, '.codex'), { recursive: true });
    writeFileSync(join(home, '.codex/config.toml'), '');
    const { createWizard } = await loadWizard();
    const wizard = createWizard({
      mcpServerUrl: 'http://127.0.0.1:38478',
      echoVersion: '0.0.0',
      detectAgentsDeps: { homedir: home, atomStore: store },
      detectProjectsDeps: { atomStore: store },
      wireDepsOverride: {
        cache: cacheOverride(),
        syncAll: async () => successResult(['codex']),
        probeMcpEndpoint: async () => ({ ok: true as const }),
      },
      probeDeps: {
        spawn: async () => ({
          exitCode: 0,
          stdout: '{"pong":true,"ts":"2026-05-25T10:00:00.000Z"}',
          stderr: '',
          timedOut: false,
        }),
      },
      now: () => new Date('2026-05-25T10:00:00.000Z'),
    });
    expect(await wizard.detectAgents()).toHaveLength(3);
    expect(await wizard.detectProjects()).toHaveLength(1);
    await wizard.wire({ selectedAgents: ['codex'], defaultProjectRepoRoot: '/repo/echo' });
    await wizard.probe(['codex']);
    const summary = await wizard.summary();
    expect(summary.detected).not.toBeNull();
    expect(summary.projects).not.toBeNull();
    expect(summary.wired).not.toBeNull();
    expect(summary.probed).not.toBeNull();
    await wizard.markCompleted();
    const state = JSON.parse(readFileSync(statePath, 'utf8')) as { completed: boolean };
    expect(state.completed).toBe(true);
  });

  it('summary before any step returns null step results and a state snapshot', async () => {
    await writeInitialState();
    const { createWizard } = await loadWizard();
    const wizard = createWizard({ mcpServerUrl: 'x', echoVersion: '0.0.0' });
    await expect(wizard.summary()).resolves.toMatchObject({
      detected: null,
      projects: null,
      wired: null,
      probed: null,
      onboardingStateSnapshot: { completed: false },
    });
  });

  it('agent probe mutates probed_at only for successful outcomes when the endpoint is down', async () => {
    const statePath = await writeInitialState();
    const { createWizard } = await loadWizard();
    const wizard = createWizard({
      mcpServerUrl: 'x',
      echoVersion: '0.0.0',
      wireDepsOverride: {
        cache: cacheOverride(),
        syncAll: async () => successResult(['codex', 'cursor']),
        probeMcpEndpoint: async () => ({ ok: false as const, error: 'refused' }),
      },
      probeDeps: {
        spawn: async () => ({
          exitCode: 0,
          stdout: '{"pong":true,"ts":"2026-05-25T10:00:00.000Z"}',
          stderr: '',
          timedOut: false,
        }),
      },
      now: () => new Date('2026-05-25T10:00:00.000Z'),
    });
    await wizard.wire({ selectedAgents: ['codex', 'cursor'], defaultProjectRepoRoot: null });
    await wizard.probe(['codex', 'cursor']);
    const state = JSON.parse(readFileSync(statePath, 'utf8')) as {
      agents: Array<{ id: string; probed_at: string | null; wire_error: string | null }>;
    };
    expect(state.agents.find((agent) => agent.id === 'codex')!.probed_at).toBe(
      '2026-05-25T10:00:00.000Z',
    );
    const cursor = state.agents.find((agent) => agent.id === 'cursor')!;
    expect(cursor.probed_at).toBeNull();
    expect(cursor.wire_error).toContain('mcp endpoint unreachable');
  });

  it('endpoint probe success during wire stamps probed_at for cursor', async () => {
    const statePath = await writeInitialState();
    const { createWizard } = await loadWizard();
    const wizard = createWizard({
      mcpServerUrl: 'x',
      echoVersion: '0.0.0',
      wireDepsOverride: {
        cache: cacheOverride(),
        syncAll: async () => successResult(['cursor']),
        probeMcpEndpoint: async () => ({ ok: true as const }),
      },
      now: () => new Date('2026-05-25T10:00:00.000Z'),
    });
    await wizard.wire({ selectedAgents: ['cursor'], defaultProjectRepoRoot: null });
    const state = JSON.parse(readFileSync(statePath, 'utf8')) as {
      agents: Array<{ id: string; probed_at: string | null }>;
    };
    expect(state.agents.find((agent) => agent.id === 'cursor')!.probed_at).toBe(
      '2026-05-25T10:00:00.000Z',
    );
  });

  it('markCompleted is idempotent and advances last_updated_at', async () => {
    const statePath = await writeInitialState();
    const dates = [new Date('2026-05-25T10:00:00.000Z'), new Date('2026-05-25T10:01:00.000Z')];
    const { createWizard } = await loadWizard();
    const wizard = createWizard({
      mcpServerUrl: 'x',
      echoVersion: '0.0.0',
      now: () => dates.shift() ?? new Date('2026-05-25T10:01:00.000Z'),
    });
    await wizard.markCompleted();
    await wizard.markCompleted();
    const state = JSON.parse(readFileSync(statePath, 'utf8')) as {
      completed: boolean;
      last_updated_at: string;
    };
    expect(state.completed).toBe(true);
    expect(state.last_updated_at).toBe('2026-05-25T10:01:00.000Z');
  });

  it('supports all-none detection followed by wire([])', async () => {
    await writeInitialState();
    let profileCount = -1;
    const { createWizard } = await loadWizard();
    const wizard = createWizard({
      mcpServerUrl: 'x',
      echoVersion: '0.0.0',
      detectAgentsDeps: { homedir: join(tmpRoot, 'empty'), atomStore: new FakeStore([]) },
      wireDepsOverride: {
        cache: cacheOverride(),
        syncAll: async (profiles) => {
          profileCount = profiles.length;
          return successResult([]);
        },
      },
    });
    const detected = await wizard.detectAgents();
    expect(detected.every((agent) => agent.confidence === 'none')).toBe(true);
    await wizard.wire({ selectedAgents: [], defaultProjectRepoRoot: null });
    expect(profileCount).toBe(0);
  });
});
