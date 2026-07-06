import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryStorage } from '../../src/storage/memory.js';
import type { CaptureEvent, Storage } from '../../src/storage/interface.js';

// Item 117 — loop observability (stations 1–3) section of `echoctl doctor`.
// Fixture-driven: temp ECHO_HOME, injected storage, fabricated checkpoints /
// seed stores, stubbed process-args + port-owner lookups. The AC6 degradation
// matrix is one `it` per row; each asserts the degradation is scoped and the
// rest of the report still renders (never a crash).

let tmpRoot: string;
let echoHome: string;
let dataDir: string;
let stateDir: string;
let saved: Record<string, string | undefined> = {};

const ENV_KEYS = [
  'ECHO_HOME',
  'ECHO_DATA_DIR',
  'ECHO_MCP_PORT',
  'HOME',
  'ECHO_GRANOLA_INTAKE_ENABLED',
];

async function loadDoctor(): Promise<typeof import('../../src/cli/commands/doctor.js')> {
  const { vi } = await import('vitest');
  vi.resetModules();
  return import('../../src/cli/commands/doctor.js');
}

function writeState(): void {
  mkdirSync(stateDir, { recursive: true });
  const now = '2026-07-05T00:00:00.000Z';
  writeFileSync(
    join(stateDir, 'onboarding.json'),
    `${JSON.stringify(
      {
        schema_version: 1,
        created_at: now,
        last_updated_at: now,
        completed: true,
        profile: 'dogfood',
        agents: [],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(stateDir, 'projects.json'),
    `${JSON.stringify(
      { schema_version: 1, last_refreshed_at: now, default_project: null, projects: [] },
      null,
      2,
    )}\n`,
  );
}

function writeGranolaCheckpoint(body: unknown): void {
  writeFileSync(
    join(stateDir, 'granola-checkpoint.json'),
    typeof body === 'string' ? body : JSON.stringify(body),
  );
}

function writeSignalsCheckpoint(body: unknown): string {
  const path = join(stateDir, 'granola-signals-checkpoint.json');
  writeFileSync(path, typeof body === 'string' ? body : JSON.stringify(body));
  return path;
}

function writeSeedStore(name: string, body: unknown): void {
  writeFileSync(join(stateDir, name), typeof body === 'string' ? body : JSON.stringify(body));
}

function healthyPid(): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, 'daemon.pid'), '4242');
}

function atom(source: string, timestamp: string): Omit<CaptureEvent, 'id'> {
  return { source, timestamp, content: `content for ${source}` };
}

async function seededStorage(): Promise<Storage> {
  const storage = new MemoryStorage();
  await storage.append(atom('api:granola', '2026-07-04T10:00:00.000Z'));
  await storage.append(atom('git:Project_echo', '2026-07-05T09:00:00.000Z'));
  await storage.append(atom('fs:cursor', '2026-07-05T08:00:00.000Z'));
  await storage.append(atom('claude-code:sess', '2026-07-05T07:00:00.000Z'));
  await storage.append(atom('derived:granola-signals', '2026-07-05T06:00:00.000Z'));
  await storage.append(atom('derived:team-decisions', '2026-07-05T05:00:00.000Z'));
  return storage;
}

// A minimal healthy base: daemon reachable + pid-lock + ok adapter/probe. The
// loop section is what each test varies via overrides.
type Overrides = Parameters<
  Awaited<ReturnType<typeof loadDoctor>>['buildDoctorReport']
>[0];

async function buildLoop(overrides: Overrides = {}) {
  const { buildDoctorReport } = await loadDoctor();
  return buildDoctorReport({
    fetch: (async () => new Response('{}', { status: 200 })) as typeof fetch,
    probeAgents: async () => [],
    codexAdapterCheck: async () => ({ status: 'ok', detail: 'ok' }),
    // Serving defaults that produce no degradation unless a test overrides them:
    // listener == pid-lock, packaged-dist, dist newer than src.
    portOwnerLookup: async () => 4242,
    readPidArgv: async () => ['node', '/repo/dist/daemon/index.js'],
    ...overrides,
  });
}

function makeStalenessDirs(order: 'dist-newer' | 'src-newer' | 'missing-dist'): {
  src: string;
  dist: string;
} {
  const src = join(tmpRoot, `src-${Math.random().toString(36).slice(2)}`);
  const dist = join(tmpRoot, `dist-${Math.random().toString(36).slice(2)}`);
  mkdirSync(src, { recursive: true });
  writeFileSync(join(src, 'a.ts'), 'x');
  if (order === 'missing-dist') return { src, dist };
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, 'a.js'), 'x');
  const base = 1_800_000_000; // seconds
  if (order === 'dist-newer') {
    utimesSync(join(src, 'a.ts'), base, base);
    utimesSync(join(dist, 'a.js'), base + 1000, base + 1000);
  } else {
    utimesSync(join(dist, 'a.js'), base, base);
    utimesSync(join(src, 'a.ts'), base + 1000, base + 1000);
  }
  return { src, dist };
}

describe('doctor loop section (item 117)', () => {
  beforeEach(() => {
    saved = {};
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-doctor-loop-'));
    echoHome = join(tmpRoot, 'echo-home');
    dataDir = join(tmpRoot, 'data');
    stateDir = join(echoHome, 'state');
    process.env.HOME = join(tmpRoot, 'home');
    process.env.ECHO_HOME = echoHome;
    process.env.ECHO_DATA_DIR = dataDir;
    process.env.ECHO_MCP_PORT = '39998';
    delete process.env.ECHO_GRANOLA_INTAKE_ENABLED;
    writeState();
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('healthy: all stations green, overall healthy', async () => {
    healthyPid();
    writeGranolaCheckpoint({
      schema_version: 1,
      high_water_mark: '2026-07-05T09:00:00.000Z',
      ingested_note_ids: ['n1', 'n2'],
      last_synced_at: '2026-07-05T09:05:00.000Z',
    });
    const cpPath = writeSignalsCheckpoint({
      schema_version: 1,
      notes: {
        n1: {
          input_fingerprint: 'f',
          extractor_version: 'granola-signals@1',
          last_attempted_at: '2026-07-05T06:00:00.000Z',
          last_success_at: '2026-07-05T06:00:00.000Z',
        },
      },
    });
    const mtime = statSync(cpPath).mtimeMs;
    writeSeedStore('granola-intake-seeds.json', {
      schema_version: 1,
      seeds: {
        k1: {
          candidate_key: 'k1',
          note_id: 'n1',
          channel_id: 'c',
          status: 'posted',
          retry_count: 0,
          created_at: 'x',
          updated_at: 'x',
        },
      },
    });
    const storage = await seededStorage();
    const report = await buildLoop({
      openStorage: () => storage,
      now: () => new Date(mtime + 60_000), // 1 min after checkpoint → not stale
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });

    expect(report.overall).toBe('healthy');
    expect(report.loop.status).toBe('ok');
    expect(report.loop.station1.condition).toBe('ok');
    expect(report.loop.station2.condition).toBe('active');
    expect(report.loop.serving.condition).toBe('ok');
    expect(report.loop.station3.condition).toBe('ok');
    // station 1
    const granola = report.loop.station1.sources.find((s) => s.sourceClass === 'api:granola');
    expect(granola).toMatchObject({ count: 1, newestTimestamp: '2026-07-04T10:00:00.000Z' });
    expect(report.loop.station1.granolaCheckpoint).toMatchObject({
      present: true,
      highWaterMark: '2026-07-05T09:00:00.000Z',
      ingestedNoteCount: 2,
    });
    // station 2
    expect(report.loop.station2.flags).toEqual({ neverRan: false, stale: false });
    expect(report.loop.station2.failingNotes).toEqual([]);
    expect(report.loop.station2.signalAtoms).toEqual({
      count: 1,
      newestTimestamp: '2026-07-05T06:00:00.000Z',
    });
    // serving
    expect(report.loop.serving).toMatchObject({
      classification: 'packaged-dist',
      listeningPid: 4242,
      staleness: 'fresh',
      status: 'ok',
    });
    // station 3
    expect(report.loop.station3.seedStores).toHaveLength(1);
    expect(report.loop.station3.seedStores[0]!.counts).toMatchObject({ posted: 1, pending: 0 });
    expect(report.loop.station3.teamDecisionsCount).toBe(1);
  });

  it('station-2 never-ran: no signals checkpoint, informational, overall still healthy', async () => {
    healthyPid();
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(),
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    expect(report.loop.station2.flags.neverRan).toBe(true);
    expect(report.loop.station2.degradations.some((d) => d.scope === 'station-2:checkpoint')).toBe(
      true,
    );
    expect(report.loop.station2.degradations.every((d) => d.severity === 'soft')).toBe(true);
    expect(report.overall).toBe('healthy');
  });

  it('station-2 stale: checkpoint older than threshold, soft, overall still healthy', async () => {
    healthyPid();
    const cpPath = writeSignalsCheckpoint({ schema_version: 1, notes: {} });
    const mtime = statSync(cpPath).mtimeMs;
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(),
      loopSignalsStaleMs: 60 * 60 * 1000,
      now: () => new Date(mtime + 2 * 60 * 60 * 1000), // 2h later → stale
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    expect(report.loop.station2.flags.stale).toBe(true);
    expect(report.loop.station2.degradations.some((d) => d.scope === 'station-2:stale')).toBe(true);
    expect(report.overall).toBe('healthy');
  });

  it('station-2 failing-notes: never-successful flagged, recovered + never-attempted not flagged', async () => {
    healthyPid();
    const cpPath = writeSignalsCheckpoint({
      schema_version: 1,
      notes: {
        failingActive: {
          input_fingerprint: 'f',
          extractor_version: 'v',
          last_attempted_at: 't',
          last_success_at: '2026-07-05T01:00:00.000Z',
          last_failure_at: '2026-07-05T02:00:00.000Z',
          last_failure_reason: 'brain timeout',
        },
        neverSuccessful: {
          input_fingerprint: 'f',
          extractor_version: 'v',
          last_attempted_at: 't',
          last_failure_at: '2026-07-05T02:00:00.000Z',
        },
        recovered: {
          input_fingerprint: 'f',
          extractor_version: 'v',
          last_attempted_at: 't',
          last_failure_at: '2026-07-05T01:00:00.000Z',
          last_success_at: '2026-07-05T02:00:00.000Z',
        },
        neverAttempted: {
          input_fingerprint: 'f',
          extractor_version: 'v',
          last_attempted_at: 't',
        },
      },
    });
    const mtime = statSync(cpPath).mtimeMs;
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(),
      now: () => new Date(mtime + 60_000),
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    const ids = report.loop.station2.failingNotes.map((n) => n.noteId).sort();
    expect(ids).toEqual(['failingActive', 'neverSuccessful']);
    const active = report.loop.station2.failingNotes.find((n) => n.noteId === 'failingActive');
    expect(active?.lastFailureReason).toBe('brain timeout');
    expect(report.overall).toBe('healthy'); // failing-notes is soft
  });

  it('dist-stale: packaged-dist with newer src downgrades overall (hard)', async () => {
    healthyPid();
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(),
      readPidArgv: async () => ['node', '/repo/dist/daemon/index.js'],
      loopStalenessDirs: makeStalenessDirs('src-newer'),
    });
    expect(report.loop.serving.classification).toBe('packaged-dist');
    expect(report.loop.serving.staleness).toBe('dist-stale');
    expect(report.loop.serving.degradations.some((d) => d.severity === 'hard')).toBe(true);
    expect(report.overall).toBe('degraded');
  });

  it('src-dev-serving: a vite-node dev process serving prod downgrades overall (hard)', async () => {
    healthyPid();
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(),
      readPidArgv: async () => [
        'node',
        '/repo/node_modules/.bin/vite-node',
        '--script',
        '/repo/src/daemon/index.ts',
      ],
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    expect(report.loop.serving.classification).toBe('src-dev');
    expect(report.loop.serving.staleness).toBe('src-dev-serving');
    expect(report.overall).toBe('degraded');
  });

  it('serving passes doctor’s resolved MCP port to the port-owner lookup', async () => {
    healthyPid();
    const received: number[] = [];
    const report = await buildLoop({
      port: '41234', // opt wins over ECHO_MCP_PORT=39998
      openStorage: () => new MemoryStorage(),
      portOwnerLookup: async (port) => {
        received.push(port);
        return 4242;
      },
      readPidArgv: async () => ['node', '/repo/dist/daemon/index.js'],
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    expect(received).toEqual([41234]);
    expect(report.loop.serving.port).toBe(41234);
    expect(report.daemon.port).toBe(41234);
  });

  it('--json shape is stable and includes the loop section', async () => {
    healthyPid();
    const storage = await seededStorage();
    const { runDoctor } = await loadDoctor();
    const out: string[] = [];
    const code = await runDoctor({
      json: true,
      stdout: { write: (s) => (out.push(String(s)), true) },
      fetch: (async () => new Response('{}', { status: 200 })) as typeof fetch,
      probeAgents: async () => [],
      codexAdapterCheck: async () => ({ status: 'ok', detail: 'ok' }),
      openStorage: () => storage,
      portOwnerLookup: async () => 4242,
      readPidArgv: async () => ['node', '/repo/dist/daemon/index.js'],
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    const report = JSON.parse(out.join('')) as {
      loop: {
        station1: { sources: unknown[]; granolaCheckpoint: unknown; status: string };
        station2: { flags: unknown; failingNotes: unknown[]; status: string };
        serving: { classification: string; port: number; staleness: string };
        station3: { seedStores: unknown[]; intakeEnabled: boolean; teamDecisionsCount: number };
        status: string;
      };
    };
    expect(code).toBe(0);
    expect(Object.keys(report.loop).sort()).toEqual([
      'serving',
      'station1',
      'station2',
      'station3',
      'status',
    ]);
    expect(report.loop.serving).toMatchObject({ classification: 'packaged-dist', port: 39998 });
    expect(Array.isArray(report.loop.station1.sources)).toBe(true);
  });

  // ─── Rollup-boundary contract (reviewer rider 1) ──────────────────────────
  // Pins the soft/hard split so a future edit can't silently start downgrading
  // `overall` for the quiet-day case. A report with a missing signals
  // checkpoint (never-ran) AND an empty db AND nothing listening on the port
  // stays overall:healthy, while each station still reports its informational
  // condition.
  it('boundary contract: never-ran + empty-db + no-listener stays overall healthy', async () => {
    healthyPid();
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(), // empty db
      portOwnerLookup: async () => null, // nothing listening
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    expect(report.overall).toBe('healthy');
    expect(report.loop.status).toBe('degraded'); // section flags soft states…
    // …but only via informational conditions, no hard fault:
    expect(report.loop.station2.condition).toBe('never-ran');
    expect(report.loop.serving.condition).toBe('no-listener');
    expect(report.loop.station3.condition).toBe('not-yet-run');
    const allDegradations = [
      ...report.loop.station1.degradations,
      ...report.loop.station2.degradations,
      ...report.loop.serving.degradations,
      ...report.loop.station3.degradations,
    ];
    expect(allDegradations.every((d) => d.severity === 'soft')).toBe(true);
    // station-1 sources still render (empty counts, not an error)
    expect(report.loop.station1.sources.every((s) => s.count === 0)).toBe(true);
  });

  it('condition discriminator: never-ran vs stale vs parse-error are machine-distinct', async () => {
    healthyPid();
    // never-ran (no checkpoint)
    const neverRan = await buildLoop({
      openStorage: () => new MemoryStorage(),
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    expect(neverRan.loop.station2.condition).toBe('never-ran');

    // stale (checkpoint present, aged past threshold)
    const stalePath = writeSignalsCheckpoint({ schema_version: 1, notes: {} });
    const staleMtime = statSync(stalePath).mtimeMs;
    const stale = await buildLoop({
      openStorage: () => new MemoryStorage(),
      loopSignalsStaleMs: 60 * 60 * 1000,
      now: () => new Date(staleMtime + 2 * 60 * 60 * 1000),
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    expect(stale.loop.station2.condition).toBe('stale');

    // parse-error (malformed checkpoint)
    writeSignalsCheckpoint('{ broken');
    const parseError = await buildLoop({
      openStorage: () => new MemoryStorage(),
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    expect(parseError.loop.station2.condition).toBe('checkpoint-unreadable');
    // all three are distinct values a tool can switch on without prose parsing
    expect(
      new Set([
        neverRan.loop.station2.condition,
        stale.loop.station2.condition,
        parseError.loop.station2.condition,
      ]).size,
    ).toBe(3);
  });

  // ─── Read-only contract (remediation: doctor must not create the db) ──────
  it('read-only: a missing db is NOT created; station-1 db-missing soft, overall healthy', async () => {
    healthyPid();
    const dbPath = join(dataDir, 'echo.db');
    expect(existsSync(dbPath)).toBe(false);
    // NOTE: no openStorage injected → exercises the real default open path.
    const report = await buildLoop({
      portOwnerLookup: async () => 4242,
      readPidArgv: async () => ['node', '/repo/dist/daemon/index.js'],
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    // The db must NOT have been materialized by doctor.
    expect(existsSync(dbPath)).toBe(false);
    expect(report.loop.station1.condition).toBe('db-missing');
    const deg = report.loop.station1.degradations.find((d) => d.scope === 'station-1:storage');
    expect(deg?.severity).toBe('soft');
    expect(deg?.detail.toLowerCase()).toContain('not created yet');
    expect(report.loop.station1.sources).toEqual([]);
    // station-2/3 also can't query, but stay soft; overall not downgraded.
    expect(report.loop.station2.degradations.every((d) => d.severity === 'soft')).toBe(true);
    expect(report.overall).toBe('healthy');
  });

  it('read-only: an unreadable (present but corrupt) db is a hard station-1 fault', async () => {
    healthyPid();
    const report = await buildLoop({
      openStorage: () => {
        throw new Error('file is not a database');
      },
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    expect(report.loop.station1.condition).toBe('storage-error');
    const deg = report.loop.station1.degradations.find((d) => d.scope === 'station-1:storage');
    expect(deg?.severity).toBe('hard');
    expect(report.overall).toBe('degraded');
  });

  it('matrix: serving port-owner lookup THROWS → unknown/degraded, rest renders', async () => {
    healthyPid();
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(),
      portOwnerLookup: async () => {
        throw new Error('lsof exploded');
      },
      readPidArgv: async () => ['node', '/repo/dist/daemon/index.js'],
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    expect(report.loop.serving.listeningPid).toBeNull();
    expect(report.loop.serving.classification).toBe('unknown');
    expect(report.loop.serving.condition).toBe('no-listener');
    const deg = report.loop.serving.degradations.find((d) => d.scope === 'serving:port-owner');
    expect(deg?.severity).toBe('soft');
    expect(report.loop.station1.sources.length).toBeGreaterThan(0); // rest renders
    expect(report.overall).toBe('healthy');
  });

  // ─── AC6 degradation matrix — one fixture per row ─────────────────────────

  it('matrix: station-1 granola checkpoint missing → station-1 soft, rest renders', async () => {
    healthyPid();
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(),
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    expect(report.loop.station1.granolaCheckpoint.present).toBe(false);
    const deg = report.loop.station1.degradations.find(
      (d) => d.scope === 'station-1:granola-checkpoint',
    );
    expect(deg?.severity).toBe('soft');
    expect(deg?.remediation).toBeTruthy();
    expect(report.loop.station1.sources.length).toBeGreaterThan(0); // rest renders
    expect(report.overall).toBe('healthy');
  });

  it('matrix: station-1 granola checkpoint malformed → station-1 hard w/ path, rest renders', async () => {
    healthyPid();
    writeGranolaCheckpoint('{ not json');
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(),
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    const deg = report.loop.station1.degradations.find(
      (d) => d.scope === 'station-1:granola-checkpoint',
    );
    expect(deg?.severity).toBe('hard');
    expect(deg?.path).toContain('granola-checkpoint.json');
    expect(report.loop.station1.sources.length).toBeGreaterThan(0);
    // station-2 still renders (never-ran) — rest of report unaffected
    expect(report.loop.station2.flags.neverRan).toBe(true);
    expect(report.overall).toBe('degraded');
  });

  it('matrix: station-1 storage read failure → station-1 hard storage, checkpoint still renders', async () => {
    healthyPid();
    writeGranolaCheckpoint({
      schema_version: 1,
      high_water_mark: 'h',
      ingested_note_ids: ['n1'],
      last_synced_at: '2026-07-05T09:00:00.000Z',
    });
    const report = await buildLoop({
      openStorage: () => {
        throw new Error('db locked');
      },
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    const deg = report.loop.station1.degradations.find((d) => d.scope === 'station-1:storage');
    expect(deg?.severity).toBe('hard');
    expect(deg?.detail).toContain('db locked');
    expect(report.loop.station1.sources).toEqual([]); // could not query
    expect(report.loop.station1.granolaCheckpoint.present).toBe(true); // checkpoint still renders
    expect(report.overall).toBe('degraded');
  });

  it('matrix: station-1 storage query error (not open error) → station-1 hard, rest renders', async () => {
    healthyPid();
    const throwing: Storage = {
      ...new MemoryStorage(),
      query: async () => {
        throw new Error('corrupt row');
      },
    } as unknown as Storage;
    const report = await buildLoop({
      openStorage: () => throwing,
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    const deg = report.loop.station1.degradations.find((d) => d.scope === 'station-1:storage');
    expect(deg?.severity).toBe('hard');
    expect(deg?.detail).toContain('corrupt row');
    expect(report.overall).toBe('degraded');
  });

  it('matrix: station-2 signals checkpoint malformed → station-2 hard, other stations render', async () => {
    healthyPid();
    writeSignalsCheckpoint('{ broken');
    writeGranolaCheckpoint({
      schema_version: 1,
      high_water_mark: 'h',
      ingested_note_ids: [],
      last_synced_at: '2026-07-05T09:00:00.000Z',
    });
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(),
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    const deg = report.loop.station2.degradations.find((d) => d.scope === 'station-2:checkpoint');
    expect(deg?.severity).toBe('hard');
    expect(deg?.path).toContain('granola-signals-checkpoint.json');
    // station-1 still renders
    expect(report.loop.station1.granolaCheckpoint.present).toBe(true);
    expect(report.overall).toBe('degraded');
  });

  it('matrix: station-3 seed store malformed → that store unreadable, other stores render', async () => {
    healthyPid();
    writeSeedStore('granola-intake-seeds.json', {
      schema_version: 1,
      seeds: {
        k1: {
          candidate_key: 'k1',
          note_id: 'n',
          channel_id: 'c',
          status: 'pending',
          retry_count: 0,
          created_at: 'x',
          updated_at: 'x',
        },
      },
    });
    writeSeedStore('granola-intake-seeds.terminal.json', '{ corrupt');
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(),
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    const stores = report.loop.station3.seedStores;
    expect(stores).toHaveLength(2);
    const good = stores.find((s) => s.path.endsWith('granola-intake-seeds.json'));
    const bad = stores.find((s) => s.path.endsWith('granola-intake-seeds.terminal.json'));
    expect(good?.state).toBe('counted');
    expect(good?.counts).toMatchObject({ pending: 1 });
    expect(bad?.state).toBe('unreadable');
    const deg = report.loop.station3.degradations.find((d) => d.scope === 'station-3:seed-store');
    expect(deg?.severity).toBe('hard');
    expect(report.overall).toBe('degraded');
  });

  it('matrix: serving pid-lock disagrees with observed listening pid → hard unknown, no false classify', async () => {
    healthyPid(); // pid-lock is 4242
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(),
      portOwnerLookup: async () => 9999, // different from pid-lock
      readPidArgv: async () => ['node', '/repo/dist/daemon/index.js'],
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    expect(report.loop.serving.classification).toBe('unknown'); // no false classify
    expect(report.loop.serving.pidLockPid).toBe(4242);
    expect(report.loop.serving.listeningPid).toBe(9999);
    const deg = report.loop.serving.degradations.find(
      (d) => d.scope === 'serving:pid-disagreement',
    );
    expect(deg?.severity).toBe('hard');
    // rest renders
    expect(report.loop.station1.sources.length).toBeGreaterThan(0);
    expect(report.overall).toBe('degraded');
  });

  it('matrix: serving argv unreadable after lsof → soft unknown, rest renders', async () => {
    healthyPid();
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(),
      portOwnerLookup: async () => 4242,
      readPidArgv: async () => null, // vanished / unreadable
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    expect(report.loop.serving.classification).toBe('unknown');
    const deg = report.loop.serving.degradations.find((d) => d.scope === 'serving:argv');
    expect(deg?.severity).toBe('soft');
    expect(report.loop.station1.sources.length).toBeGreaterThan(0);
    expect(report.overall).toBe('healthy'); // soft does not downgrade
  });

  it('matrix: src/dist missing → staleness-unknown soft, rest renders', async () => {
    healthyPid();
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(),
      portOwnerLookup: async () => 4242,
      readPidArgv: async () => ['node', '/repo/dist/daemon/index.js'],
      loopStalenessDirs: makeStalenessDirs('missing-dist'),
    });
    expect(report.loop.serving.staleness).toBe('staleness-unknown');
    const deg = report.loop.serving.degradations.find((d) => d.scope === 'serving:staleness');
    expect(deg?.severity).toBe('soft');
    expect(report.overall).toBe('healthy');
  });

  it('human render includes the loop lines and remediation for a degraded station', async () => {
    healthyPid();
    writeGranolaCheckpoint('{ not json'); // forces a hard station-1 degradation
    const { runDoctor } = await loadDoctor();
    const out: string[] = [];
    await runDoctor({
      stdout: { write: (s) => (out.push(String(s)), true) },
      fetch: (async () => new Response('{}', { status: 200 })) as typeof fetch,
      probeAgents: async () => [],
      codexAdapterCheck: async () => ({ status: 'ok', detail: 'ok' }),
      openStorage: () => new MemoryStorage(),
      portOwnerLookup: async () => 4242,
      readPidArgv: async () => ['node', '/repo/dist/daemon/index.js'],
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    const text = out.join('');
    expect(text).toContain('loop station-1 capture [checkpoint-unreadable]:');
    expect(text).toContain('loop station-2 signals [');
    expect(text).toContain('loop serving [');
    expect(text).toContain('loop station-3 packet [');
    expect(text).toContain('[hard] station-1:granola-checkpoint');
    expect(text).toContain('remediation:');
    expect(text).toContain('note:'); // honest limitation notes rendered
  });

  it('intake enabled flag reflects doctor-env only, with a limitation note', async () => {
    healthyPid();
    process.env.ECHO_GRANOLA_INTAKE_ENABLED = 'true';
    const report = await buildLoop({
      openStorage: () => new MemoryStorage(),
      loopStalenessDirs: makeStalenessDirs('dist-newer'),
    });
    expect(report.loop.station3.intakeEnabled).toBe(true);
    expect(report.loop.station3.intakeEnabledNote.toLowerCase()).toContain('doctor-env-only');
  });
});
