import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DRIFT_SWEEP_WORKER,
  GRANOLA_INTAKE_BRIDGE_WORKER,
  GRANOLA_SIGNALS_WORKER,
  workerHeartbeatPath,
  writeWorkerHeartbeat,
  type WorkerHeartbeat,
} from '../../src/enrich/worker-heartbeat.js';
import { ECHO_HOME_PATHS, setEchoHomeRoot } from '../../src/echo-home/paths.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import { normalizeSubject } from '../../src/util/subject.js';
import { appendConfirmedDecision } from '../../src/surfaces/ceo-slack-responder/decision-store.js';
import {
  GRANOLA_SIGNAL_SOURCE,
  startGranolaSignalWorker,
  type GranolaSignalExtractor,
} from '../../src/enrich/granola-signals.js';
import {
  DriftJudgeInfraError,
  startDriftSweepWorker,
  type DriftJudge,
} from '../../src/enrich/decision-drift.js';
import {
  startGranolaIntakeBridge,
  type GranolaIntakeConfig,
} from '../../src/enrich/granola-intake-candidates.js';

// Isolated per test: repoint ECHO_HOME at a fresh temp so every heartbeat write
// (the module writer AND the workers driven below) lands in the temp state dir,
// never the real ~/.echo/state.
let homeRoot: string;
const tempDirs: string[] = [];

beforeEach(() => {
  homeRoot = mkdtempSync(join(tmpdir(), 'echo-worker-heartbeat-'));
  tempDirs.push(homeRoot);
  setEchoHomeRoot(homeRoot);
});

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

function readHeartbeat(name: string): WorkerHeartbeat {
  return JSON.parse(readFileSync(workerHeartbeatPath(name), 'utf8')) as WorkerHeartbeat;
}

const enabledDriftEnv = (): NodeJS.ProcessEnv => ({
  ECHO_DRIFT_SWEEP_ENABLED: 'true',
  ECHO_SLACK_BOT_TOKEN: 'xoxb-token',
  ECHO_TEAM_COFUNDER_IDENTITIES: JSON.stringify([{ id: 'alice', slack_user_id: 'U-ALICE' }]),
});

async function seedDriftDecision(store: MemoryStorage, subject: string, decision: string): Promise<void> {
  await appendConfirmedDecision(store, {
    draft_id: `draft-${subject}-${Math.random().toString(36).slice(2)}`,
    subject,
    decision,
    author: 'echo-bot',
    confirmed_by: 'alice',
    confirmed_at: '2026-07-01T00:00:00.000Z',
    source_app: 'claude-code',
  });
}

async function seedDriftStatement(store: MemoryStorage, subject: string, text: string): Promise<void> {
  await store.append({
    source: GRANOLA_SIGNAL_SOURCE,
    timestamp: '2026-07-02T00:00:00.000Z',
    content: text,
    metadata: {
      signal_type: 'decision',
      canonical_subject: normalizeSubject(subject),
      dedupe_key: `granola:signal:${Math.random().toString(36).slice(2)}`,
      note_id: 'note-1',
      meeting_title: 'Tuesday sync',
    },
  });
}

function intakeConfig(): GranolaIntakeConfig {
  return {
    enabled: true,
    lookbackMs: 30 * 24 * 60 * 60 * 1000,
    internalDomains: ['echo.dev'],
    ownerMap: { 'me@echo.dev': 'UOWNER' },
    defaultOwner: 'UDEFAULT',
    channelId: 'C-INTAKE',
    botToken: 'xoxb-token',
    perNoteCap: 3,
    maxRetries: 5,
  };
}

// ---------------------------------------------------------------------------
// AC1 — heartbeat artifact + exported contract
// ---------------------------------------------------------------------------

describe('AC1 — heartbeat contract', () => {
  it('exposes stable worker-name constants', () => {
    expect(GRANOLA_SIGNALS_WORKER).toBe('granola-signals');
    expect(DRIFT_SWEEP_WORKER).toBe('drift-sweep');
    expect(GRANOLA_INTAKE_BRIDGE_WORKER).toBe('granola-intake-bridge');
  });

  it('workerHeartbeatPath is state/worker-heartbeat-<name>.json', () => {
    expect(workerHeartbeatPath(DRIFT_SWEEP_WORKER)).toBe(
      join(ECHO_HOME_PATHS.state, 'worker-heartbeat-drift-sweep.json'),
    );
    expect(workerHeartbeatPath(GRANOLA_SIGNALS_WORKER)).toBe(
      join(ECHO_HOME_PATHS.state, 'worker-heartbeat-granola-signals.json'),
    );
  });

  it('writeWorkerHeartbeat round-trips a valid heartbeat', () => {
    const heartbeat: WorkerHeartbeat = {
      schema_version: 1,
      worker: DRIFT_SWEEP_WORKER,
      last_tick_at: '2026-07-06T00:00:00.000Z',
      status: 'ok',
      counters: { window_size: 2, brain_invocations: 1 },
    };
    writeWorkerHeartbeat(DRIFT_SWEEP_WORKER, heartbeat);
    expect(readHeartbeat(DRIFT_SWEEP_WORKER)).toEqual(heartbeat);
  });
});

// ---------------------------------------------------------------------------
// AC5 — heartbeat writes never harm the worker
// ---------------------------------------------------------------------------

describe('AC5 — best-effort writer', () => {
  const heartbeat: WorkerHeartbeat = {
    schema_version: 1,
    worker: DRIFT_SWEEP_WORKER,
    last_tick_at: '2026-07-06T00:00:00.000Z',
    status: 'ok',
  };

  it('overwrites a pre-existing malformed heartbeat with valid JSON', () => {
    mkdirSync(ECHO_HOME_PATHS.state, { recursive: true });
    writeFileSync(workerHeartbeatPath(DRIFT_SWEEP_WORKER), 'not json {{{', 'utf8');
    expect(() => writeWorkerHeartbeat(DRIFT_SWEEP_WORKER, heartbeat)).not.toThrow();
    expect(readHeartbeat(DRIFT_SWEEP_WORKER)).toEqual(heartbeat);
  });

  it('writes into a fresh ECHO_HOME with no state/ directory', () => {
    expect(existsSync(ECHO_HOME_PATHS.state)).toBe(false); // beforeEach did not create it
    writeWorkerHeartbeat(DRIFT_SWEEP_WORKER, heartbeat);
    expect(readHeartbeat(DRIFT_SWEEP_WORKER)).toEqual(heartbeat);
  });

  it('swallows an atomicWrite failure (symlinked target) without throwing', () => {
    mkdirSync(ECHO_HOME_PATHS.state, { recursive: true });
    // atomicWrite refuses to write through a symlink → AtomicWriteError.
    symlinkSync(join(homeRoot, 'nowhere', 'x.json'), workerHeartbeatPath(DRIFT_SWEEP_WORKER));
    expect(() => writeWorkerHeartbeat(DRIFT_SWEEP_WORKER, heartbeat)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AC2/AC3/AC4 — workers emit heartbeats at tick end and on boot disable
// ---------------------------------------------------------------------------

describe('AC2 — granola signal worker heartbeats', () => {
  it('an ok tick writes status:ok with counters and a fresh last_tick_at', async () => {
    const store = new MemoryStorage(); // no raw granola notes → notes_seen 0
    const extractFn: GranolaSignalExtractor = async () => [];
    const handle = await startGranolaSignalWorker(store, {
      extractFn,
      checkpointPath: join(homeRoot, 'signals-cp.json'),
      runOnStart: false,
      now: () => '2026-07-06T02:00:00.000Z',
    });
    const result = await handle.run();
    await handle.stop();
    expect(result.status).toBe('ok');
    const hb = readHeartbeat(GRANOLA_SIGNALS_WORKER);
    expect(hb.status).toBe('ok');
    expect(hb.worker).toBe('granola-signals');
    expect(hb.last_tick_at).toBe('2026-07-06T02:00:00.000Z');
    expect(hb.counters).toMatchObject({ notes_seen: 0, notes_extracted: 0, signal_atoms_written: 0 });
  });

  it('a brain_unavailable tick writes status:degraded (not healthy)', async () => {
    const handle = await startGranolaSignalWorker(new MemoryStorage(), {
      preflight: async () => {
        throw new Error('brain down');
      },
      checkpointPath: join(homeRoot, 'signals-cp.json'),
      runOnStart: false,
    });
    const result = await handle.run();
    await handle.stop();
    expect(result).toEqual({ status: 'skipped', reason: 'brain_unavailable' });
    const hb = readHeartbeat(GRANOLA_SIGNALS_WORKER);
    expect(hb.status).toBe('degraded');
    expect(hb.reason).toContain('brain');
  });
});

describe('AC3 — granola signal worker boot disable', () => {
  it('a config-parse disable writes a status:disabled heartbeat without throwing', async () => {
    const handle = await startGranolaSignalWorker(new MemoryStorage(), {
      // No extractFn → boot resolves brain config; a relative context repo path
      // is a config-parse error, the permanent-disable path.
      env: { ECHO_GRANOLA_SIGNAL_CONTEXT_REPO_PATH: 'relative/not/absolute' },
      runOnStart: false,
    });
    expect(handle.enabled).toBe(false);
    const hb = readHeartbeat(GRANOLA_SIGNALS_WORKER);
    expect(hb.status).toBe('disabled');
    expect(hb.reason && hb.reason.length).toBeGreaterThan(0);
  });
});

describe('AC4 — drift sweep degraded heartbeat', () => {
  it('an all-retryable stall writes a status:degraded heartbeat', async () => {
    const store = new MemoryStorage();
    await seedDriftDecision(store, 'Database choice', 'Use SQLite for V1');
    await seedDriftStatement(store, 'Database choice', 'switch to Postgres');
    const infraFailJudge: DriftJudge = async () => {
      throw new DriftJudgeInfraError('model timeout');
    };
    const handle = await startDriftSweepWorker(store, {
      env: enabledDriftEnv(),
      judge: infraFailJudge,
      checkpointPath: join(homeRoot, 'drift-cp.json'),
      runOnStart: false,
      now: () => '2026-07-06T03:00:00.000Z',
    });
    const result = await handle.run();
    await handle.stop();
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.degraded).toBe(true);
      expect(result.retryable_failures).toBeGreaterThan(0);
    }
    const hb = readHeartbeat(DRIFT_SWEEP_WORKER);
    expect(hb.status).toBe('degraded');
    expect(hb.last_tick_at).toBe('2026-07-06T03:00:00.000Z');
  });

  it('a healthy tick writes status:ok', async () => {
    const store = new MemoryStorage();
    await seedDriftDecision(store, 'Database choice', 'Use SQLite for V1');
    await seedDriftStatement(store, 'Database choice', 'sticking with SQLite');
    const noContradictionJudge: DriftJudge = async () => ({
      contradicts: false,
      quote: '',
      reason: 'consistent',
    });
    const handle = await startDriftSweepWorker(store, {
      env: enabledDriftEnv(),
      judge: noContradictionJudge,
      checkpointPath: join(homeRoot, 'drift-cp.json'),
      runOnStart: false,
      now: () => '2026-07-06T03:30:00.000Z',
    });
    const result = await handle.run();
    await handle.stop();
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.degraded).toBe(false);
    expect(readHeartbeat(DRIFT_SWEEP_WORKER).status).toBe('ok');
  });
});

describe('AC3 — drift sweep boot disable', () => {
  it('the disabled-by-flag path writes a status:disabled heartbeat with a reason', async () => {
    const handle = await startDriftSweepWorker(new MemoryStorage(), { env: {} });
    expect(handle.enabled).toBe(false);
    const hb = readHeartbeat(DRIFT_SWEEP_WORKER);
    expect(hb.status).toBe('disabled');
    expect(hb.reason).toContain('ECHO_DRIFT_SWEEP_ENABLED');
  });

  it('the config-error path writes a status:disabled heartbeat carrying the reason', async () => {
    const handle = await startDriftSweepWorker(new MemoryStorage(), {
      env: { ECHO_DRIFT_SWEEP_ENABLED: 'true' }, // enabled but no token/identities
    });
    expect(handle.enabled).toBe(false);
    const hb = readHeartbeat(DRIFT_SWEEP_WORKER);
    expect(hb.status).toBe('disabled');
    expect(hb.reason).toContain('missing required config');
  });
});

describe('AC2/AC3 — granola intake bridge heartbeats', () => {
  it('an ok tick writes status:ok with counters', async () => {
    const store = new MemoryStorage(); // no notes → notes_seen 0
    const handle = startGranolaIntakeBridge(store, {
      config: intakeConfig(),
      classify: async () => [],
      postSeed: async () => ({ ts: 'ts-1' }),
      seedStorePath: join(homeRoot, 'seeds.json'),
      runOnStart: false,
      now: () => '2026-07-06T04:00:00.000Z',
    });
    const result = await handle.run();
    await handle.stop();
    expect(result.status).toBe('ok');
    const hb = readHeartbeat(GRANOLA_INTAKE_BRIDGE_WORKER);
    expect(hb.status).toBe('ok');
    expect(hb.worker).toBe('granola-intake-bridge');
    expect(hb.last_tick_at).toBe('2026-07-06T04:00:00.000Z');
    expect(hb.counters).toMatchObject({ notes_seen: 0, candidates: 0, posted: 0 });
  });

  it('a disabled-by-flag boot writes a status:disabled heartbeat', () => {
    const handle = startGranolaIntakeBridge(new MemoryStorage(), { env: {} });
    expect(handle.enabled).toBe(false);
    const hb = readHeartbeat(GRANOLA_INTAKE_BRIDGE_WORKER);
    expect(hb.status).toBe('disabled');
    expect(hb.reason).toContain('ECHO_GRANOLA_INTAKE_ENABLED');
  });

  it('a config-error boot writes a status:disabled heartbeat', () => {
    const handle = startGranolaIntakeBridge(new MemoryStorage(), {
      env: { ECHO_GRANOLA_INTAKE_ENABLED: 'true' }, // enabled but missing token/channel
    });
    expect(handle.enabled).toBe(false);
    expect(readHeartbeat(GRANOLA_INTAKE_BRIDGE_WORKER).status).toBe('disabled');
  });
});
