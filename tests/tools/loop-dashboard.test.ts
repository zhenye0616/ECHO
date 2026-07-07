import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setEchoHomeRoot } from '../../src/echo-home/paths.js';
import {
  DRIFT_SWEEP_WORKER,
  GRANOLA_INTAKE_BRIDGE_WORKER,
  GRANOLA_SIGNALS_WORKER,
  workerHeartbeatPath,
  type WorkerHeartbeat,
} from '../../src/enrich/worker-heartbeat.js';
import type { DoctorLoopReport } from '../../src/cli/commands/doctor.js';
import {
  computeStatusBody,
  createStatusProvider,
  DEFAULT_LOOP_DASHBOARD_PORT,
  EXPECTED_WORKERS,
  MIN_RECOMPUTE_INTERVAL_MS,
  renderPage,
  resolveDashboardPort,
  startDashboard,
  type AssembleDeps,
  type StatusDocument,
} from '../../tools/loop-dashboard.js';

// Item 122 — live loop dashboard. Fixture-driven (scratch ECHO_HOME, injected
// storage / heartbeat files / loop-report builder). No live daemon required.

const ENV_KEYS = [
  'ECHO_HOME',
  'ECHO_DATA_DIR',
  'ECHO_DB_PATH',
  'ECHO_MCP_PORT',
  'ECHO_LOOP_DASHBOARD_PORT',
  'HOME',
  'ECHO_GRANOLA_INTAKE_ENABLED',
];

let tmpRoot: string;
let echoHome: string;
let dataDir: string;
let stateDir: string;
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  tmpRoot = mkdtempSync(join(tmpdir(), 'echo-loop-dash-'));
  echoHome = join(tmpRoot, 'echo-home');
  dataDir = join(tmpRoot, 'data');
  stateDir = join(echoHome, 'state');
  process.env.HOME = join(tmpRoot, 'home');
  process.env.ECHO_DATA_DIR = dataDir;
  process.env.ECHO_MCP_PORT = '39998';
  process.env.ECHO_DB_PATH = join(dataDir, 'echo.db'); // not created → soft-missing
  delete process.env.ECHO_LOOP_DASHBOARD_PORT;
  delete process.env.ECHO_GRANOLA_INTAKE_ENABLED;
  setEchoHomeRoot(echoHome); // roots ECHO_HOME_PATHS.state at scratch
  mkdirSync(stateDir, { recursive: true });
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k]!;
  }
  rmSync(tmpRoot, { recursive: true, force: true });
});

// ─── fixtures ────────────────────────────────────────────────────────────────

function writeHeartbeat(name: string, hb: WorkerHeartbeat): void {
  writeFileSync(workerHeartbeatPath(name), `${JSON.stringify(hb, null, 2)}\n`);
}

function fakeHeartbeat(name: string, status: WorkerHeartbeat['status'] = 'ok'): WorkerHeartbeat {
  return {
    schema_version: 1,
    worker: name,
    last_tick_at: '2026-07-05T00:00:00.000Z',
    status,
    counters: { processed: 3 },
  };
}

// A complete, healthy loop report — used by tests that exercise the dashboard's
// timing/single-flight/mapping logic without needing the real doctor plumbing.
function fakeLoopReport(overrides: Partial<DoctorLoopReport> = {}): DoctorLoopReport {
  const base: DoctorLoopReport = {
    station1: {
      status: 'ok',
      condition: 'ok',
      sources: [{ sourceClass: 'api:granola', newestTimestamp: '2026-07-05T00:00:00.000Z', count: 3 }],
      granolaCheckpoint: {
        present: true,
        highWaterMark: '2026-07-05T00:00:00.000Z',
        lastSyncedAt: '2026-07-05T00:00:00.000Z',
        ingestedNoteCount: 2,
        ageMs: 1000,
      },
      degradations: [],
    },
    station2: {
      status: 'ok',
      condition: 'active',
      flags: { neverRan: false, stale: false },
      checkpointMtimeIso: '2026-07-05T00:00:00.000Z',
      checkpointAgeMs: 1000,
      failingNotes: [],
      signalAtoms: { newestTimestamp: '2026-07-05T00:00:00.000Z', count: 5 },
      notes: [],
      degradations: [],
    },
    serving: {
      status: 'ok',
      condition: 'ok',
      port: 38478,
      listeningPid: 4242,
      pidLockPid: 4242,
      classification: 'packaged-dist',
      executingPath: '/repo/dist/daemon/index.js',
      staleness: 'fresh',
      degradations: [],
    },
    station3: {
      status: 'ok',
      condition: 'ok',
      seedStores: [
        {
          path: '/x/granola-intake-seeds.json',
          state: 'counted',
          counts: { pending: 1, posting: 0, posted: 2, failed: 0 },
        },
      ],
      intakeEnabled: false,
      intakeEnabledNote: 'doctor-env-only',
      teamDecisionsCount: 1,
      notes: [],
      degradations: [],
    },
    status: 'ok',
  };
  return { ...base, ...overrides };
}

// A clock the provider + compute share so cache timing is deterministic.
function makeClock(startMs = 0): { now: () => Date; set: (ms: number) => void } {
  let ms = startMs;
  return { now: () => new Date(ms), set: (v) => (ms = v) };
}

const healthyHbReader = (): string => JSON.stringify(fakeHeartbeat('any'));

// ─── AC1: port resolution ────────────────────────────────────────────────────

describe('resolveDashboardPort (AC1)', () => {
  it('precedence: --port flag > env > default', () => {
    expect(resolveDashboardPort(['--port', '4000'], {})).toBe(4000);
    expect(resolveDashboardPort(['--port=4001'], {})).toBe(4001);
    expect(resolveDashboardPort([], { ECHO_LOOP_DASHBOARD_PORT: '4100' })).toBe(4100);
    expect(resolveDashboardPort([], {})).toBe(DEFAULT_LOOP_DASHBOARD_PORT);
    expect(resolveDashboardPort(['--port', '4000'], { ECHO_LOOP_DASHBOARD_PORT: '5000' })).toBe(4000);
  });

  it('an invalid explicit port throws (never a silent default fallback)', () => {
    expect(() => resolveDashboardPort(['--port', '0'], {})).toThrow(/port/i);
    expect(() => resolveDashboardPort(['--port', '99999'], {})).toThrow(/port/i);
    expect(() => resolveDashboardPort(['--port', 'abc'], {})).toThrow(/port/i);
    expect(() => resolveDashboardPort(['--port'], {})).toThrow(/port/i);
    // an invalid ENV port is also fatal, not a silent fallback
    expect(() => resolveDashboardPort([], { ECHO_LOOP_DASHBOARD_PORT: 'abc' })).toThrow(/port/i);
    expect(() => resolveDashboardPort([], { ECHO_LOOP_DASHBOARD_PORT: '70000' })).toThrow(/port/i);
  });
});

// ─── AC2/AC5: document shape ─────────────────────────────────────────────────

describe('/api/status document shape (AC2/AC5)', () => {
  it('is a stable top-level object assembled from the loop report + heartbeats', async () => {
    for (const w of EXPECTED_WORKERS) writeHeartbeat(w, fakeHeartbeat(w));
    const clock = makeClock(1_000);
    const provider = createStatusProvider({ buildLoop: async () => fakeLoopReport(), now: clock.now });
    const doc = await provider.getStatus();

    expect(Object.keys(doc).sort()).toEqual(['cache', 'generated_at', 'heartbeats', 'serving', 'stations']);
    expect(Object.keys(doc.cache).sort()).toEqual(['age_ms', 'computed_at', 'stale']);
    expect(Object.keys(doc.serving).sort()).toEqual(['classification', 'staleness']);
    expect(Object.keys(doc.stations).sort()).toEqual(['1', '2', '3', '4', '6']);

    expect(doc.serving).toEqual({ classification: 'packaged-dist', staleness: 'fresh' });
    expect(doc.stations['1'].status).toBe('ok');
    expect((doc.stations['1'].sources as unknown[]).length).toBe(1);
    expect(doc.stations['4']).toMatchObject({ status: 'ok', teamDecisionsCount: 1 });
    // station 6 is heartbeat-driven
    expect(doc.stations['6'].status).toBe('ok');
    // heartbeats keyed by the expected-worker set
    expect(Object.keys(doc.heartbeats).sort()).toEqual([...EXPECTED_WORKERS].sort());
    expect(typeof doc.generated_at).toBe('string');
    expect(doc.cache.stale).toBe(false);
  });
});

// ─── AC2/AC5: throttle + single-flight + cold-start ──────────────────────────

describe('cache + single-flight (AC2/AC5)', () => {
  it('serves fresh cache within the throttle window, then stale-serves while recomputing', async () => {
    let calls = 0;
    const clock = makeClock(0);
    const provider = createStatusProvider({
      buildLoop: async () => {
        calls += 1;
        return fakeLoopReport();
      },
      readHeartbeatFile: healthyHbReader,
      now: clock.now,
    });

    const first = await provider.getStatus(); // cold compute
    expect(calls).toBe(1);
    expect(first.cache.stale).toBe(false);

    clock.set(1_000); // within MIN_RECOMPUTE_INTERVAL_MS → fresh cache, no recompute
    const cached = await provider.getStatus();
    expect(calls).toBe(1);
    expect(cached.cache.stale).toBe(false);
    expect(cached.cache.age_ms).toBe(1_000);

    clock.set(MIN_RECOMPUTE_INTERVAL_MS + 5_000); // past throttle → warm stale-serve + bg recompute
    const stale = await provider.getStatus();
    expect(stale.cache.stale).toBe(true);
    // allow the background recompute (single-flight) to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toBe(2);
  });

  it('cold-start: two concurrent polls spawn exactly one computation and both get a document', async () => {
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const provider = createStatusProvider({
      buildLoop: async () => {
        calls += 1;
        await gate;
        return fakeLoopReport();
      },
      readHeartbeatFile: healthyHbReader,
      now: makeClock(0).now,
    });

    const a = provider.getStatus();
    const b = provider.getStatus();
    expect(calls).toBe(1); // single-flight, even before any document exists
    release();
    const [da, db] = await Promise.all([a, b]);
    expect(calls).toBe(1);
    expect(da.stations['1'].status).toBe('ok');
    expect(db.stations['1'].status).toBe('ok');
  });

  it('cold-start timeout → contract-shaped degraded document, never undefined/throw', async () => {
    let calls = 0;
    const provider = createStatusProvider({
      buildLoop: async () => {
        calls += 1;
        return new Promise<DoctorLoopReport>(() => {}); // never resolves → times out
      },
      readHeartbeatFile: healthyHbReader,
      now: makeClock(0).now,
      timeoutMs: 20,
    });
    const [a, b] = await Promise.all([provider.getStatus(), provider.getStatus()]);
    expect(calls).toBe(1);
    for (const doc of [a, b]) {
      expect(doc).toBeDefined();
      expect(doc.serving.classification).toBe('unknown');
      expect(doc.stations['1'].status).toBe('unknown');
      expect(doc.stations['4'].status).toBe('unknown');
    }
  });
});

// ─── AC2b: expected-worker iteration, never a dropped key ────────────────────

describe('heartbeats iterate the expected-worker set (AC2b)', () => {
  it('an expected worker with no file surfaces as { error }, not a dropped key', async () => {
    writeHeartbeat(GRANOLA_SIGNALS_WORKER, fakeHeartbeat(GRANOLA_SIGNALS_WORKER));
    writeHeartbeat(GRANOLA_INTAKE_BRIDGE_WORKER, fakeHeartbeat(GRANOLA_INTAKE_BRIDGE_WORKER));
    // drift-sweep heartbeat intentionally omitted
    const doc = await createStatusProvider({ buildLoop: async () => fakeLoopReport(), now: makeClock(0).now }).getStatus();

    expect(Object.keys(doc.heartbeats).sort()).toEqual([...EXPECTED_WORKERS].sort());
    const drift = doc.heartbeats[DRIFT_SWEEP_WORKER] as { error?: string };
    expect(typeof drift.error).toBe('string');
    // and station 6 (drift) reflects the missing heartbeat as unknown
    expect(doc.stations['6'].status).toBe('unknown');
  });

  it('a malformed heartbeat file is an { error } entry, never a crash', async () => {
    writeFileSync(workerHeartbeatPath(GRANOLA_SIGNALS_WORKER), '{ not json');
    for (const w of [DRIFT_SWEEP_WORKER, GRANOLA_INTAKE_BRIDGE_WORKER]) writeHeartbeat(w, fakeHeartbeat(w));
    const doc = await createStatusProvider({ buildLoop: async () => fakeLoopReport(), now: makeClock(0).now }).getStatus();
    const sig = doc.heartbeats[GRANOLA_SIGNALS_WORKER] as { error?: string };
    expect(typeof sig.error).toBe('string');
  });
});

// ─── AC3/AC5: fail-soft doctor, heartbeats still render, distinguishable states ─

describe('fail-soft doctor + distinguishable states (AC3/AC5)', () => {
  it('a doctor failure degrades doctor sections to unknown while heartbeats still render', async () => {
    writeHeartbeat(DRIFT_SWEEP_WORKER, {
      schema_version: 1,
      worker: DRIFT_SWEEP_WORKER,
      last_tick_at: '2026-07-05T00:00:00.000Z',
      status: 'disabled',
      reason: 'permanently disabled at boot',
      counters: { sweeps: 0 },
    });
    const doc = await createStatusProvider({
      buildLoop: async () => {
        throw new Error('doctor blew up');
      },
      now: makeClock(0).now,
    }).getStatus();

    expect(doc.stations['1'].status).toBe('unknown');
    expect(doc.serving.classification).toBe('unknown');
    // station 6 is independent of the doctor computation
    expect(doc.stations['6'].status).toBe('disabled');
    expect(doc.stations['6'].reason).toBe('permanently disabled at boot');
  });

  it('degraded and disabled are distinct statuses on the same document', async () => {
    writeHeartbeat(DRIFT_SWEEP_WORKER, {
      schema_version: 1,
      worker: DRIFT_SWEEP_WORKER,
      last_tick_at: '2026-07-05T00:00:00.000Z',
      status: 'disabled',
    });
    const degradedReport = fakeLoopReport({
      station1: {
        ...fakeLoopReport().station1,
        status: 'degraded',
        condition: 'checkpoint-unreadable',
        degradations: [
          { scope: 'station-1:granola-checkpoint', severity: 'hard', detail: 'malformed', remediation: 'x' },
        ],
      },
    });
    const doc = await createStatusProvider({ buildLoop: async () => degradedReport, now: makeClock(0).now }).getStatus();
    expect(doc.stations['1'].status).toBe('degraded');
    expect(doc.stations['6'].status).toBe('disabled');
    expect(doc.stations['1'].status).not.toBe(doc.stations['6'].status);
  });

  it('the page renders distinct visual classes for ok/degraded/disabled/unknown', () => {
    const html = renderPage();
    expect(html).toContain('<title>ECHO loop dashboard</title>');
    for (const cls of ['.card.degraded', '.card.disabled', '.card.unknown', '.chip.disabled', '.chip.unknown']) {
      expect(html).toContain(cls);
    }
    // no external requests: no http(s) URLs, no CDN references
    expect(html).not.toMatch(/https?:\/\/(?!127\.0\.0\.1)/);
  });
});

// ─── AC1/AC3: the HTTP server serves the page and the endpoint ───────────────

describe('dashboard server (AC1/AC3)', () => {
  it('GET / serves the HTML page and GET /api/status serves the JSON document', async () => {
    for (const w of EXPECTED_WORKERS) writeHeartbeat(w, fakeHeartbeat(w));
    const provider = createStatusProvider({ buildLoop: async () => fakeLoopReport(), now: makeClock(0).now });
    const server = await startDashboard(0, provider);
    const addr = server.address();
    const port = typeof addr === 'object' && addr !== null ? addr.port : 0;
    try {
      const pageRes = await fetch(`http://127.0.0.1:${port}/`);
      expect(pageRes.status).toBe(200);
      expect(pageRes.headers.get('content-type')).toContain('text/html');
      expect(await pageRes.text()).toContain('ECHO loop dashboard');

      const apiRes = await fetch(`http://127.0.0.1:${port}/api/status`);
      expect(apiRes.status).toBe(200);
      expect(apiRes.headers.get('content-type')).toContain('application/json');
      const doc = (await apiRes.json()) as StatusDocument;
      expect(Object.keys(doc.stations).sort()).toEqual(['1', '2', '3', '4', '6']);

      const notFound = await fetch(`http://127.0.0.1:${port}/nope`);
      expect(notFound.status).toBe(404);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});

// ─── AC4: strictly read-only ─────────────────────────────────────────────────

function snapshotDir(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else out.set(relative(dir, p), createHash('sha256').update(readFileSync(p)).digest('hex'));
    }
  };
  walk(dir);
  return out;
}

describe('strictly read-only (AC4)', () => {
  it('a full status-compute cycle over the shipped in-process path leaves ECHO_HOME byte-identical', async () => {
    // Fabricate every read input the cycle touches EXCEPT the atom db (absent →
    // buildLoopReport's existsSync-gated open never runs, never creates it).
    writeFileSync(
      join(stateDir, 'granola-checkpoint.json'),
      JSON.stringify({
        schema_version: 1,
        high_water_mark: '2026-07-05T09:00:00.000Z',
        ingested_note_ids: ['n1'],
        last_synced_at: '2026-07-05T09:00:00.000Z',
      }),
    );
    writeFileSync(join(stateDir, 'granola-signals-checkpoint.json'), JSON.stringify({ schema_version: 1, notes: {} }));
    writeFileSync(
      join(stateDir, 'granola-intake-seeds.json'),
      JSON.stringify({ schema_version: 1, seeds: {} }),
    );
    for (const w of EXPECTED_WORKERS) writeHeartbeat(w, fakeHeartbeat(w));

    // staleness dirs live OUTSIDE the snapshotted tree; mtime reads are read-only.
    const sdir = join(tmpRoot, 'srcx');
    const ddir = join(tmpRoot, 'distx');
    mkdirSync(sdir, { recursive: true });
    mkdirSync(ddir, { recursive: true });
    writeFileSync(join(sdir, 'a.ts'), 'x');
    writeFileSync(join(ddir, 'a.js'), 'x');

    const dbPath = process.env.ECHO_DB_PATH!;
    expect(existsSync(dbPath)).toBe(false);

    const before = snapshotDir(echoHome);

    // NO buildLoop injection → exercises the real 117 buildLoopReport path.
    const deps: AssembleDeps = {
      doctorOpts: {
        home: echoHome,
        port: '38478',
        now: () => new Date('2026-07-05T09:01:00.000Z'),
        loopStalenessDirs: { src: sdir, dist: ddir },
        portOwnerLookup: async () => null,
        readPidArgv: async () => null,
        loopSignalsStaleMs: 60 * 60 * 1000,
      },
      now: () => new Date('2026-07-05T09:01:00.000Z'),
    };
    const body = await computeStatusBody(deps);

    // The cycle produced a real document (station 1 present; db-absent is soft).
    expect(body.stations['1'].status).toBeDefined();
    // The atom db must NOT have been materialized.
    expect(existsSync(dbPath)).toBe(false);
    // And ECHO_HOME is byte-identical.
    const after = snapshotDir(echoHome);
    expect([...after.entries()].sort()).toEqual([...before.entries()].sort());
  });
});
