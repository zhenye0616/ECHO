import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AdapterSyncProfile,
  SyncConflict,
  SyncResult,
} from '../../../src/echo-home/adapter-sync.js';
import type { AgentKind } from '../../../src/echo-home/wizard/detect-agents.js';
import type { AdapterCacheRecord } from '../../../src/echo-home/wizard/adapter-cache.js';

let tmpRoot: string;
let echoHome: string;
let originalEchoHome: string | undefined;

async function loadWire(): Promise<typeof import('../../../src/echo-home/wizard/wire.js')> {
  return import('../../../src/echo-home/wizard/wire.js');
}

async function loadPaths(): Promise<typeof import('../../../src/echo-home/paths.js')> {
  return import('../../../src/echo-home/paths.js');
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

function sha(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function successResult(agents: AgentKind[]): SyncResult {
  return {
    skillsPopulated: {
      ok: true,
      copied: ['process-backlog.md'],
      skipped: [],
      targetDir: '/tmp/skills',
    },
    agents: agents.map((agent) => ({
      agent,
      ok: true as const,
      files_written: [`/${agent}`],
      actions: [{ file: `/${agent}`, action: 'write' }],
    })),
    roles: { results: [], rolesErrors: [] },
    overallOk: true,
  };
}

function conflict(kind: 'config' | 'marker', filePath: string): SyncConflict {
  if (kind === 'config') return { kind, filePath };
  return {
    kind,
    filePath,
    currentInside: 'user',
    proposedInside: 'echo',
    unifiedDiff: '-user\n+echo\n',
  };
}

function makeCache(seed: AdapterCacheRecord[] = []): {
  records: Map<AgentKind, AdapterCacheRecord>;
  writes: AdapterCacheRecord[];
  cache: {
    read: (kind: AgentKind) => AdapterCacheRecord | null;
    write: (rec: AdapterCacheRecord) => void;
  };
} {
  const records = new Map<AgentKind, AdapterCacheRecord>();
  for (const rec of seed) records.set(rec.agent, rec);
  const writes: AdapterCacheRecord[] = [];
  return {
    records,
    writes,
    cache: {
      read: (kind) => records.get(kind) ?? null,
      write: (rec) => {
        writes.push(rec);
        records.set(rec.agent, rec);
      },
    },
  };
}

describe('wire', () => {
  beforeEach(() => {
    originalEchoHome = process.env.ECHO_HOME;
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-073-wire-'));
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

  it('builds profiles with no previous cache and writes cache records after success', async () => {
    await writeInitialState();
    const cache = makeCache();
    const seen: AdapterSyncProfile[][] = [];
    const { wire } = await loadWire();
    const result = await wire({
      selectedAgents: ['codex', 'claude-code'],
      defaultProjectRepoRoot: '/repo/echo',
      mcpServerUrl: 'http://127.0.0.1:38478',
      echoVersion: '0.0.0',
      probeMcpEndpoint: async () => ({ ok: true as const }),
      now: new Date('2026-05-25T10:00:00.000Z'),
      cache: cache.cache,
      syncAll: async (profiles) => {
        seen.push(profiles);
        return successResult(['codex', 'claude-code']);
      },
    });
    expect(result.cacheUpdates).toHaveLength(2);
    expect(cache.writes.map((rec) => rec.agent)).toEqual(['codex', 'claude-code']);
    expect(seen[0]![0]!.previousEchoSection).toBeUndefined();
    expect(seen[0]![0]!.mcpServerConfig).toEqual({ url: 'http://127.0.0.1:38478' });
    expect(seen[0]![1]!.mcpServerConfig).toEqual({ url: 'http://127.0.0.1:38478' });
    expect(cache.writes[1]!.mcpServerConfig).toEqual({ url: 'http://127.0.0.1:38478' });
  });

  it('registers claude-code MCP through the wire sync profile', async () => {
    await writeInitialState();
    const calls: Array<{ cmd: string; args: string[]; timeoutMs: number }> = [];
    const cache = makeCache();
    const claudeInstructions = join(tmpRoot, 'client-home/.claude/CLAUDE.md');
    const claudeCommands = join(tmpRoot, 'client-home/.claude/commands');
    const { wire } = await loadWire();
    const { syncAll } = await import('../../../src/echo-home/adapter-sync.js');

    const result = await wire({
      selectedAgents: ['claude-code'],
      defaultProjectRepoRoot: null,
      mcpServerUrl: 'http://127.0.0.1:41234/mcp',
      echoVersion: '0.0.0',
      probeMcpEndpoint: async () => ({ ok: true as const }),
      cache: cache.cache,
      claudeCodeMcpRegistration: {
        timeoutMs: 5,
        spawn: async (cmd, args, opts) => {
          calls.push({ cmd, args, timeoutMs: opts.timeoutMs });
          return { exitCode: 0, stdout: '', stderr: '', timedOut: false };
        },
      },
      syncAll: async (profiles, syncOpts) =>
        syncAll(
          profiles.map((profile): AdapterSyncProfile => {
            if (profile.kind !== 'claude-code') return profile;
            return {
              ...profile,
              paths: { instructionsFile: claudeInstructions, commandsDir: claudeCommands },
            };
          }),
          syncOpts,
        ),
    });

    const claude = result.syncResult.agents[0]!;
    expect(calls).toEqual([
      {
        cmd: 'claude',
        args: [
          'mcp',
          'add',
          '--transport',
          'http',
          '--scope',
          'user',
          'echo',
          'http://127.0.0.1:41234/mcp',
        ],
        timeoutMs: 5,
      },
    ]);
    expect(claude.ok).toBe(true);
    if (claude.ok) {
      expect(claude.actions.some((action) => action.action === 'mcp-add')).toBe(true);
    }
    expect(cache.writes[0]!.mcpServerConfig).toEqual({ url: 'http://127.0.0.1:41234/mcp' });
  });

  it('does not update cache for a conflicting agent but updates successful siblings', async () => {
    const path = await writeInitialState();
    const cache = makeCache();
    const { wire } = await loadWire();
    const result = await wire({
      selectedAgents: ['codex', 'claude-code'],
      defaultProjectRepoRoot: '/repo/echo',
      mcpServerUrl: 'http://127.0.0.1:38478',
      echoVersion: '0.0.0',
      probeMcpEndpoint: async () => ({ ok: true as const }),
      now: new Date('2026-05-25T10:00:00.000Z'),
      cache: cache.cache,
      syncAll: async () => ({
        ...successResult([]),
        agents: [
          {
            agent: 'codex',
            ok: false,
            conflicts: [conflict('config', '/tmp/config.toml')],
            errors: [],
            files_written: [],
          },
          {
            agent: 'claude-code',
            ok: true,
            files_written: ['/tmp/claude'],
            actions: [{ file: '/tmp/claude', action: 'write' }],
          },
        ],
        overallOk: false,
      }),
    });
    expect(result.cacheUpdates.map((u) => u.agent)).toEqual(['claude-code']);
    expect(cache.writes.map((rec) => rec.agent)).toEqual(['claude-code']);
    const state = JSON.parse(readFileSync(path, 'utf8')) as {
      agents: Array<Record<string, unknown>>;
    };
    expect(state.agents.find((agent) => agent.id === 'codex')!.wire_error).toContain('conflict');
  });

  it('passes prior cache values into AdapterSyncProfile previous fields', async () => {
    await writeInitialState();
    const cache = makeCache([
      {
        schema_version: 1,
        agent: 'codex',
        last_written_at: '2026-05-20T00:00:00.000Z',
        echoSection: 'old section',
        mcpServerConfig: { url: 'old' },
      },
    ]);
    const seen: AdapterSyncProfile[] = [];
    const { wire } = await loadWire();
    await wire({
      selectedAgents: ['codex'],
      defaultProjectRepoRoot: '/repo/echo',
      mcpServerUrl: 'http://127.0.0.1:38478',
      echoVersion: '0.0.0',
      probeMcpEndpoint: async () => ({ ok: true as const }),
      cache: cache.cache,
      syncAll: async (profiles) => {
        seen.push(...profiles);
        return successResult(['codex']);
      },
    });
    expect(seen[0]!.previousEchoSection).toBe('old section');
    expect(seen[0]!.previousMcpServerConfig).toEqual({ url: 'old' });
  });

  it('writes only desired mcp server config to cache after successful sync', async () => {
    await writeInitialState();
    const cache = makeCache([
      {
        schema_version: 1,
        agent: 'codex',
        last_written_at: '2026-05-20T00:00:00.000Z',
        echoSection: 'old section',
        mcpServerConfig: { url: 'http://old:1234/mcp', enabled: true },
      },
    ]);
    const { wire } = await loadWire();
    await wire({
      selectedAgents: ['codex'],
      defaultProjectRepoRoot: '/repo/echo',
      mcpServerUrl: 'http://127.0.0.1:38478',
      echoVersion: '0.0.0',
      probeMcpEndpoint: async () => ({ ok: true as const }),
      cache: cache.cache,
      syncAll: async () => successResult(['codex']),
    });
    expect(cache.writes[0]!.mcpServerConfig).toEqual({ url: 'http://127.0.0.1:38478' });
  });

  it('preserves existing detected_at while updating wired_at', async () => {
    const path = await writeInitialState();
    const raw = JSON.parse(readFileSync(path, 'utf8')) as {
      agents: Array<Record<string, unknown>>;
    };
    raw.agents.push({
      id: 'codex',
      detected_at: '2026-05-20T00:00:00.000Z',
      wired_at: null,
      probed_at: null,
      capabilities: [],
      wire_error: null,
    });
    writeFileSync(path, `${JSON.stringify(raw, null, 2)}\n`);
    const { wire } = await loadWire();
    await wire({
      selectedAgents: ['codex'],
      defaultProjectRepoRoot: null,
      mcpServerUrl: 'http://127.0.0.1:38478',
      echoVersion: '0.0.0',
      probeMcpEndpoint: async () => ({ ok: true as const }),
      now: new Date('2026-05-25T10:00:00.000Z'),
      syncAll: async () => successResult(['codex']),
    });
    const state = JSON.parse(readFileSync(path, 'utf8')) as {
      agents: Array<Record<string, unknown>>;
    };
    expect(state.agents[0]!.detected_at).toBe('2026-05-20T00:00:00.000Z');
    expect(state.agents[0]!.wired_at).toBe('2026-05-25T10:00:00.000Z');
  });

  it('throws when onboarding state schema_version is unsupported', async () => {
    const path = await writeInitialState();
    writeFileSync(path, JSON.stringify({ schema_version: 2 }));
    const { wire } = await loadWire();
    await expect(
      wire({
        selectedAgents: ['codex'],
        defaultProjectRepoRoot: null,
        mcpServerUrl: 'http://127.0.0.1:38478',
        echoVersion: '0.0.0',
        probeMcpEndpoint: async () => ({ ok: true as const }),
        syncAll: async () => successResult(['codex']),
      }),
    ).rejects.toThrow('invalid onboarding state');
  });

  it('clears wire_error on a later ok result', async () => {
    const path = await writeInitialState();
    const raw = JSON.parse(readFileSync(path, 'utf8')) as {
      agents: Array<Record<string, unknown>>;
    };
    raw.agents.push({
      id: 'codex',
      detected_at: '2026-05-20T00:00:00.000Z',
      wired_at: null,
      probed_at: null,
      capabilities: [],
      wire_error: 'old failure',
    });
    writeFileSync(path, `${JSON.stringify(raw, null, 2)}\n`);
    const { wire } = await loadWire();
    await wire({
      selectedAgents: ['codex'],
      defaultProjectRepoRoot: null,
      mcpServerUrl: 'http://127.0.0.1:38478',
      echoVersion: '0.0.0',
      probeMcpEndpoint: async () => ({ ok: true as const }),
      syncAll: async () => successResult(['codex']),
    });
    const state = JSON.parse(readFileSync(path, 'utf8')) as {
      agents: Array<Record<string, unknown>>;
    };
    expect(state.agents[0]!.wire_error).toBeNull();
  });

  it('records AdapterError messages as wire_error', async () => {
    const path = await writeInitialState();
    const { wire } = await loadWire();
    await wire({
      selectedAgents: ['codex'],
      defaultProjectRepoRoot: null,
      mcpServerUrl: 'http://127.0.0.1:38478',
      echoVersion: '0.0.0',
      probeMcpEndpoint: async () => ({ ok: true as const }),
      syncAll: async () => ({
        ...successResult([]),
        agents: [
          {
            agent: 'codex',
            ok: false,
            conflicts: [],
            errors: [{ code: 'EACCES', file: '/x', operation: 'write', message: 'nope' }],
            files_written: [],
          },
        ],
        overallOk: false,
      }),
    });
    const state = JSON.parse(readFileSync(path, 'utf8')) as {
      agents: Array<Record<string, unknown>>;
    };
    expect(state.agents[0]!.wire_error).toBe('nope');
  });

  it('builds cursor-only profiles without rendering an echo section', async () => {
    await writeInitialState();
    const seen: AdapterSyncProfile[] = [];
    const { wire } = await loadWire();
    await wire({
      selectedAgents: ['cursor'],
      defaultProjectRepoRoot: '/repo/echo',
      mcpServerUrl: 'http://127.0.0.1:38478',
      echoVersion: '0.0.0',
      probeMcpEndpoint: async () => ({ ok: true as const }),
      syncAll: async (profiles) => {
        seen.push(...profiles);
        return successResult(['cursor']);
      },
    });
    expect(seen[0]!.echoSection).toBeUndefined();
    expect(seen[0]!.mcpServerConfig).toEqual({ url: 'http://127.0.0.1:38478' });
  });

  it('wraps unexpected syncAll throws without mutating state or cache', async () => {
    const path = await writeInitialState();
    const before = sha(path);
    const cache = makeCache();
    const { wire } = await loadWire();
    const result = await wire({
      selectedAgents: ['codex'],
      defaultProjectRepoRoot: null,
      mcpServerUrl: 'http://127.0.0.1:38478',
      echoVersion: '0.0.0',
      probeMcpEndpoint: async () => ({ ok: true as const }),
      cache: cache.cache,
      syncAll: async () => {
        throw new Error('boom');
      },
    });
    expect(result.onboardingStateUpdated).toBe(false);
    expect(result.syncResult.skillsPopulated.ok).toBe(false);
    expect(cache.writes).toEqual([]);
    expect(sha(path)).toBe(before);
  });

  it('uses the same injected now for renderedAt and cache last_written_at', async () => {
    await writeInitialState();
    const cache = makeCache();
    let section = '';
    const { wire } = await loadWire();
    await wire({
      selectedAgents: ['codex'],
      defaultProjectRepoRoot: '/repo/echo',
      mcpServerUrl: 'http://127.0.0.1:38478',
      echoVersion: '0.0.0',
      probeMcpEndpoint: async () => ({ ok: true as const }),
      now: new Date('2026-05-25T10:00:00.000Z'),
      cache: cache.cache,
      syncAll: async (profiles) => {
        section = profiles[0]!.echoSection!;
        return successResult(['codex']);
      },
    });
    expect(section).toContain('rendered-at: 2026-05-25T10:00:00.000Z');
    expect(cache.writes[0]!.last_written_at).toBe('2026-05-25T10:00:00.000Z');
  });

  it.each([
    [
      'syncLock',
      { syncLock: { code: 'RETRY_CONFLICT', file: '/lock', operation: 'link', message: 'locked' } },
    ],
    [
      'repoRoot',
      { repoRoot: { code: 'UNKNOWN', file: '/repo', operation: 'stat', message: 'no repo' } },
    ],
    [
      'directorySymlink',
      { directorySymlink: { code: 'EEXIST', file: '/dir', operation: 'stat', message: 'symlink' } },
    ],
  ] as const)(
    'short-circuits cache and onboarding writes for top-level %s sentinel',
    async (_name, extra) => {
      const path = await writeInitialState();
      const before = sha(path);
      const cache = makeCache();
      const { wire } = await loadWire();
      const result = await wire({
        selectedAgents: ['codex'],
        defaultProjectRepoRoot: null,
        mcpServerUrl: 'http://127.0.0.1:38478',
        echoVersion: '0.0.0',
        probeMcpEndpoint: async () => ({ ok: true as const }),
        cache: cache.cache,
        syncAll: async () => ({
          ...successResult([]),
          ...extra,
          agents: [],
          overallOk: false,
        }),
      });
      expect(result.cacheUpdates).toEqual([]);
      expect(result.onboardingStateUpdated).toBe(false);
      expect(cache.writes).toEqual([]);
      expect(sha(path)).toBe(before);
    },
  );

  it('stamps probed_at for every successfully wired agent when the endpoint probe succeeds', async () => {
    const path = await writeInitialState();
    const probedUrls: string[] = [];
    const { wire } = await loadWire();
    await wire({
      selectedAgents: ['codex', 'claude-code', 'cursor'],
      defaultProjectRepoRoot: null,
      mcpServerUrl: 'http://127.0.0.1:39478/mcp',
      echoVersion: '0.0.0',
      now: new Date('2026-05-25T10:00:00.000Z'),
      syncAll: async () => successResult(['codex', 'claude-code', 'cursor']),
      probeMcpEndpoint: async (url) => {
        probedUrls.push(url);
        return { ok: true as const };
      },
    });
    expect(probedUrls).toEqual(['http://127.0.0.1:39478/mcp']);
    const state = JSON.parse(readFileSync(path, 'utf8')) as {
      agents: Array<{ id: string; probed_at: string | null; wire_error: string | null }>;
    };
    for (const id of ['codex', 'claude-code', 'cursor']) {
      const agent = state.agents.find((entry) => entry.id === id)!;
      expect(agent.probed_at).toBe('2026-05-25T10:00:00.000Z');
      expect(agent.wire_error).toBeNull();
    }
  });

  it('records a truthful wire_error and leaves probed_at null when the endpoint probe fails', async () => {
    const path = await writeInitialState();
    const { wire } = await loadWire();
    await wire({
      selectedAgents: ['cursor'],
      defaultProjectRepoRoot: null,
      mcpServerUrl: 'http://127.0.0.1:39478/mcp',
      echoVersion: '0.0.0',
      syncAll: async () => successResult(['cursor']),
      probeMcpEndpoint: async () => ({ ok: false as const, error: 'connect ECONNREFUSED' }),
    });
    const state = JSON.parse(readFileSync(path, 'utf8')) as {
      agents: Array<{ id: string; probed_at: string | null; wire_error: string | null }>;
    };
    const cursor = state.agents.find((entry) => entry.id === 'cursor')!;
    expect(cursor.probed_at).toBeNull();
    expect(cursor.wire_error).toContain('mcp endpoint unreachable');
    expect(cursor.wire_error).toContain('connect ECONNREFUSED');
  });

  it('skips the endpoint probe when no agent wires successfully', async () => {
    await writeInitialState();
    let probeCalls = 0;
    const { wire } = await loadWire();
    await wire({
      selectedAgents: ['codex'],
      defaultProjectRepoRoot: null,
      mcpServerUrl: 'http://127.0.0.1:39478/mcp',
      echoVersion: '0.0.0',
      syncAll: async () => ({
        ...successResult([]),
        agents: [
          {
            agent: 'codex',
            ok: false,
            conflicts: [conflict('config', '/tmp/config.toml')],
            errors: [],
            files_written: [],
          },
        ],
        overallOk: false,
      }),
      probeMcpEndpoint: async () => {
        probeCalls += 1;
        return { ok: true as const };
      },
    });
    expect(probeCalls).toBe(0);
  });

  it('passes runtimeVersion through to the rendered echo section', async () => {
    await writeInitialState();
    let section = '';
    const { wire } = await loadWire();
    await wire({
      selectedAgents: ['codex'],
      defaultProjectRepoRoot: '/repo/echo',
      mcpServerUrl: 'http://127.0.0.1:39478/mcp',
      echoVersion: '0.1.0-beta.5',
      runtimeVersion: '0.1.0-beta.5',
      now: new Date('2026-05-25T10:00:00.000Z'),
      syncAll: async (profiles) => {
        section = profiles[0]!.echoSection!;
        return successResult(['codex']);
      },
      probeMcpEndpoint: async () => ({ ok: true as const }),
    });
    expect(section).toContain('runtime-version: 0.1.0-beta.5');
  });
});

describe('markOnboardingCompleted', () => {
  beforeEach(() => {
    originalEchoHome = process.env.ECHO_HOME;
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-073-completed-'));
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

  function agentEntry(overrides: Record<string, unknown>): Record<string, unknown> {
    return {
      id: 'cursor',
      detected_at: '2026-05-20T00:00:00.000Z',
      wired_at: '2026-05-20T00:00:00.000Z',
      probed_at: null,
      capabilities: [],
      wire_error: null,
      ...overrides,
    };
  }

  async function seedAgents(agents: Array<Record<string, unknown>>): Promise<string> {
    const path = await writeInitialState();
    const state = JSON.parse(readFileSync(path, 'utf8')) as { agents: unknown[] };
    state.agents.push(...agents);
    writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`);
    return path;
  }

  it('refuses to set completed while a wired agent has no probe and no error', async () => {
    const path = await seedAgents([agentEntry({})]);
    const { markOnboardingCompleted } = await loadWire();
    const result = markOnboardingCompleted(new Date('2026-05-25T10:00:00.000Z'));
    expect(result.completed).toBe(false);
    expect(result.unverifiedAgents).toEqual(['cursor']);
    const state = JSON.parse(readFileSync(path, 'utf8')) as { completed: boolean };
    expect(state.completed).toBe(false);
  });

  it('sets completed when every wired agent is probed or has a recorded error', async () => {
    const path = await seedAgents([
      agentEntry({ id: 'codex', probed_at: '2026-05-25T09:00:00.000Z' }),
      agentEntry({ id: 'cursor', wire_error: 'mcp endpoint unreachable: refused' }),
    ]);
    const { markOnboardingCompleted } = await loadWire();
    const result = markOnboardingCompleted(new Date('2026-05-25T10:00:00.000Z'));
    expect(result).toEqual({ completed: true, unverifiedAgents: [] });
    const state = JSON.parse(readFileSync(path, 'utf8')) as { completed: boolean };
    expect(state.completed).toBe(true);
  });

  it('drops completed back to false when an unverified wired agent exists', async () => {
    const path = await seedAgents([agentEntry({ id: 'claude-code' })]);
    const state = JSON.parse(readFileSync(path, 'utf8')) as { completed: boolean };
    state.completed = true;
    writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`);
    const { markOnboardingCompleted } = await loadWire();
    const result = markOnboardingCompleted(new Date('2026-05-25T10:00:00.000Z'));
    expect(result.completed).toBe(false);
    expect(result.unverifiedAgents).toEqual(['claude-code']);
    const after = JSON.parse(readFileSync(path, 'utf8')) as { completed: boolean };
    expect(after.completed).toBe(false);
  });
});
