// Live loop dashboard — a read-only, self-refreshing local page over the team
// loop's health. Last-inch rendering only: it REUSES item 117's in-process
// doctor loop report (`buildLoopReport`) and item 120's worker heartbeat
// artifacts, adding no collectors, no daemon changes, and no persisted state.
// See backlog/complete/2026-07-06-122-live-loop-dashboard.md.
//
// Read-only contract (AC4): the only data sources are (a) `buildLoopReport`,
// whose storage open is existsSync-gated + SELECT-only (item 117's read-only
// contract — a missing db is a soft not-yet-run state, never created), and
// (b) the heartbeat JSON files, read with `readFileSync`. Nothing here writes to
// disk, makes MCP calls, or touches the network beyond serving localhost. We
// deliberately reuse `buildLoopReport` (the loop section) rather than
// `buildDoctorReport` (the full report) so the dashboard never runs the MCP
// probe, the codex-adapter child, or the agent probes.
//
// Serving-code identity + dist staleness come straight from the loop report's
// `serving` section; a `dist-stale`/`src-dev-serving` daemon is therefore
// surfaced on the page exactly as `echoctl doctor` reports it.
//
// Usage:
//   npm run loop:dashboard                     (port 38480)
//   npm run loop:dashboard -- --port 4000
//   ECHO_LOOP_DASHBOARD_PORT=4000 npm run loop:dashboard

import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parsePort, resolveMcpPort } from '../src/cli/commands/init.js';
import {
  buildLoopReport,
  type DoctorLoopReport,
  type DoctorOpts,
  type LoopServing,
  type LoopStation1,
  type LoopStation2,
  type LoopStation3,
} from '../src/cli/commands/doctor.js';
import { resolveDataDir } from '../src/daemon/lifecycle.js';
import { setEchoHomeRoot } from '../src/echo-home/paths.js';
import {
  DRIFT_SWEEP_WORKER,
  GRANOLA_INTAKE_BRIDGE_WORKER,
  GRANOLA_SIGNALS_WORKER,
  workerHeartbeatPath,
  type WorkerHeartbeat,
  type WorkerName,
} from '../src/enrich/worker-heartbeat.js';

// ─── Named constants (AC1/AC2/AC3) ──────────────────────────────────────────

/** Default listen port — adjacent to serve-trace's 38479. The ONLY definition
 *  of the dashboard's default port (AC1: no other named constant may define it). */
export const DEFAULT_LOOP_DASHBOARD_PORT = 38480;

/** Client re-poll cadence (AC3), low end of the 15-30s band. */
export const DEFAULT_POLL_INTERVAL_MS = 15_000;

/** Throttle floor (AC2): a poll within this window of the last computed
 *  document is served from cache instead of triggering a recomputation. */
export const MIN_RECOMPUTE_INTERVAL_MS = 10_000;

/** Upper bound on a single doctor computation (AC2 single-flight + cold-start).
 *  On timeout the doctor-derived sections degrade to `unknown`; heartbeats are
 *  independent file reads and still render. */
export const DOCTOR_COMPUTE_TIMEOUT_MS = 8_000;

/** The expected workers, iterated by name (AC2b) — NOT a `worker-heartbeat-*`
 *  glob, so an expected worker whose file is absent still surfaces as an
 *  `{ error }` entry rather than being silently dropped. */
export const EXPECTED_WORKERS: readonly WorkerName[] = [
  GRANOLA_SIGNALS_WORKER,
  DRIFT_SWEEP_WORKER,
  GRANOLA_INTAKE_BRIDGE_WORKER,
];

// ─── Document contract (AC2 top-level shape) ────────────────────────────────

export type StationStatus = 'ok' | 'degraded' | 'disabled' | 'unknown';

export interface HeartbeatError {
  error: string;
}
export type HeartbeatEntry = WorkerHeartbeat | HeartbeatError;

export type StationEntry = { status: StationStatus } & Record<string, unknown>;

export type StationId = '1' | '2' | '3' | '4' | '6';

export interface StatusDocument {
  generated_at: string;
  cache: { stale: boolean; age_ms: number; computed_at: string };
  serving: {
    classification: LoopServing['classification'];
    staleness: LoopServing['staleness'];
  };
  stations: Record<StationId, StationEntry>;
  heartbeats: Record<string, HeartbeatEntry>;
}

/** The document minus the cache envelope — what a single computation produces.
 *  The single-flight cache layer stamps the `cache` field on serve. */
export type StatusBody = Omit<StatusDocument, 'cache'>;

// ─── Port resolution (AC1) ──────────────────────────────────────────────────

/**
 * Precedence: `--port <n>` flag → `ECHO_LOOP_DASHBOARD_PORT` env → default
 * 38480. A present-but-invalid port (non-numeric, <1, or >65535, or a `--port`
 * flag with no value) throws — the caller turns that into a fatal one-line
 * stderr diagnostic + non-zero exit. We NEVER silently fall back to the default
 * on an invalid explicit port (AC1).
 */
export function resolveDashboardPort(
  argv: readonly string[],
  env: NodeJS.ProcessEnv,
): number {
  let sawFlag = false;
  let flagValue: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === '--port') {
      sawFlag = true;
      flagValue = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--port=')) {
      sawFlag = true;
      flagValue = arg.slice('--port='.length);
    }
  }

  if (sawFlag) {
    if (flagValue === undefined || flagValue === '' || flagValue.startsWith('--')) {
      throw new Error('invalid --port: expected a port number in 1-65535');
    }
    return parsePort(flagValue, '--port');
  }

  const envRaw = env['ECHO_LOOP_DASHBOARD_PORT'];
  if (envRaw !== undefined && envRaw !== '') {
    return parsePort(envRaw, 'ECHO_LOOP_DASHBOARD_PORT');
  }

  return DEFAULT_LOOP_DASHBOARD_PORT;
}

// ─── Heartbeats (AC2b) ──────────────────────────────────────────────────────

type ReadFile = (path: string) => string;
const defaultReadFile: ReadFile = (path) => readFileSync(path, 'utf8');

/** Read one worker's heartbeat. A missing OR malformed file becomes an
 *  `{ error }` entry — never a throw (AC2b). */
export function readHeartbeat(name: string, readFile: ReadFile = defaultReadFile): HeartbeatEntry {
  const path = workerHeartbeatPath(name);
  let raw: string;
  try {
    raw = readFile(path);
  } catch (err) {
    return { error: `heartbeat unavailable: ${(err as Error).message}` };
  }
  try {
    return JSON.parse(raw) as WorkerHeartbeat;
  } catch (err) {
    return { error: `heartbeat malformed: ${(err as Error).message}` };
  }
}

/** Build the heartbeats map by iterating the expected-worker set (AC2b). */
export function buildHeartbeats(readFile: ReadFile = defaultReadFile): Record<string, HeartbeatEntry> {
  const map: Record<string, HeartbeatEntry> = {};
  for (const name of EXPECTED_WORKERS) map[name] = readHeartbeat(name, readFile);
  return map;
}

// ─── Doctor loop report → stations ──────────────────────────────────────────

interface LoopCtx {
  port: number;
  platform: NodeJS.Platform;
  pidLockPath: string;
  pidLockHeld: boolean;
}

/** Mirror of `buildDoctorReport`'s serving-context computation (all read-only):
 *  the port is the MCP daemon port used for serving-code detection, NOT the
 *  dashboard's own listen port. */
function resolveLoopCtx(opts: DoctorOpts): LoopCtx {
  const platform = opts.platform ?? process.platform;
  const port = opts.port !== undefined ? parsePort(String(opts.port)) : resolveMcpPort();
  const dataDir = resolveDataDir({ platform });
  const pidLockPath =
    platform === 'win32' ? win32.join(dataDir, 'daemon.pid') : join(dataDir, 'daemon.pid');
  const pidLockHeld = existsSync(pidLockPath);
  return { port, platform, pidLockPath, pidLockHeld };
}

type LoopReportBuilder = (opts: DoctorOpts, ctx: LoopCtx) => Promise<DoctorLoopReport>;

export interface AssembleDeps {
  /** Injectable loop-report builder (default: the real 117 `buildLoopReport`). */
  buildLoop?: LoopReportBuilder;
  /** Read-only DoctorOpts seams (openStorage, now, loopStalenessDirs, port,
   *  portOwnerLookup, readPidArgv, home, …) forwarded to `buildLoopReport`. */
  doctorOpts?: DoctorOpts;
  /** Injectable heartbeat file reader (default: `readFileSync`). */
  readHeartbeatFile?: ReadFile;
  /** Clock for `generated_at` (default: `Date`). */
  now?: () => Date;
  /** Per-computation timeout (default: DOCTOR_COMPUTE_TIMEOUT_MS). */
  timeoutMs?: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('doctor computation timed out')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e as Error);
      },
    );
  });
}

/** Run the loop report, fail-soft. Returns `null` on timeout OR any failure —
 *  the caller renders that as `unknown` doctor sections (AC2 fail-soft). */
async function computeLoopReport(deps: AssembleDeps): Promise<DoctorLoopReport | null> {
  const build = deps.buildLoop ?? buildLoopReport;
  const opts = deps.doctorOpts ?? {};
  if (opts.home !== undefined) setEchoHomeRoot(opts.home);
  const ctx = resolveLoopCtx(opts);
  try {
    return await withTimeout(build(opts, ctx), deps.timeoutMs ?? DOCTOR_COMPUTE_TIMEOUT_MS);
  } catch {
    return null;
  }
}

function mapStation1(s: LoopStation1): StationEntry {
  return {
    status: s.status,
    condition: s.condition,
    sources: s.sources,
    granolaCheckpoint: s.granolaCheckpoint,
    degradations: s.degradations,
  };
}

function mapStation2(s: LoopStation2): StationEntry {
  return {
    status: s.status,
    condition: s.condition,
    flags: s.flags,
    checkpointMtimeIso: s.checkpointMtimeIso,
    checkpointAgeMs: s.checkpointAgeMs,
    signalAtoms: s.signalAtoms,
    failingNotes: s.failingNotes,
    notes: s.notes,
    degradations: s.degradations,
  };
}

function mapStation3(s: LoopStation3): StationEntry {
  return {
    status: s.status,
    condition: s.condition,
    seedStores: s.seedStores,
    intakeEnabled: s.intakeEnabled,
    intakeEnabledNote: s.intakeEnabledNote,
    notes: s.notes,
    degradations: s.degradations,
  };
}

// Station 4 (record) is the team-decisions preview count, which the 117 loop
// report carries on station3. A count of 0 is expected today (not a fault);
// `null` means the count was unavailable (db not open) → `unknown`.
function mapStation4(s: LoopStation3): StationEntry {
  return { status: s.teamDecisionsCount === null ? 'unknown' : 'ok', teamDecisionsCount: s.teamDecisionsCount };
}

// Station 6 (drift) has no 117 doctor section — its health IS the drift-sweep
// heartbeat (120), including the disabled reason + last sweep counters.
function mapStation6(hb: HeartbeatEntry): StationEntry {
  if ('error' in hb) return { status: 'unknown', error: hb.error };
  return {
    status: hb.status,
    reason: hb.reason ?? null,
    lastTickAt: hb.last_tick_at,
    counters: hb.counters ?? {},
  };
}

const UNKNOWN_DOCTOR_DETAIL = 'doctor loop report unavailable (timed out or failed)';

function unknownStations(heartbeats: Record<string, HeartbeatEntry>): Record<StationId, StationEntry> {
  const skeleton: StationEntry = { status: 'unknown', detail: UNKNOWN_DOCTOR_DETAIL };
  return {
    '1': { ...skeleton },
    '2': { ...skeleton },
    '3': { ...skeleton },
    '4': { status: 'unknown', teamDecisionsCount: null, detail: UNKNOWN_DOCTOR_DETAIL },
    // Station 6 is heartbeat-driven and independent of the doctor computation.
    '6': mapStation6(heartbeats[DRIFT_SWEEP_WORKER] ?? { error: 'no heartbeat' }),
  };
}

/** Assemble one status body (AC2). Fail-soft: never rejects — a doctor failure
 *  degrades the doctor-derived sections to `unknown` while heartbeats (read
 *  independently) still render. */
export async function computeStatusBody(deps: AssembleDeps = {}): Promise<StatusBody> {
  const now = deps.now ?? (() => new Date());
  const heartbeats = buildHeartbeats(deps.readHeartbeatFile ?? defaultReadFile);
  const loop = await computeLoopReport(deps);
  const generatedAt = now().toISOString();

  if (loop === null) {
    return {
      generated_at: generatedAt,
      serving: { classification: 'unknown', staleness: 'staleness-unknown' },
      stations: unknownStations(heartbeats),
      heartbeats,
    };
  }

  return {
    generated_at: generatedAt,
    serving: { classification: loop.serving.classification, staleness: loop.serving.staleness },
    stations: {
      '1': mapStation1(loop.station1),
      '2': mapStation2(loop.station2),
      '3': mapStation3(loop.station3),
      '4': mapStation4(loop.station3),
      '6': mapStation6(heartbeats[DRIFT_SWEEP_WORKER] ?? { error: 'no heartbeat' }),
    },
    heartbeats,
  };
}

// ─── Single-flight throttled provider (AC2) ─────────────────────────────────

export interface StatusProvider {
  getStatus(): Promise<StatusDocument>;
}

function stamp(body: StatusBody, stale: boolean, ageMs: number, computedAtMs: number): StatusDocument {
  return {
    ...body,
    cache: {
      stale,
      age_ms: Math.max(0, ageMs),
      computed_at: new Date(computedAtMs).toISOString(),
    },
  };
}

/**
 * A throttled, single-flight provider over `computeStatusBody`. At most one
 * computation is ever in flight (AC2). Two cases when a recompute is due:
 *   - warm (a prior body exists): serve the cached body immediately with
 *     `cache.stale: true`; the recompute continues in the background.
 *   - cold (no body yet): JOIN the one in-flight computation. Because
 *     `computeStatusBody` is fail-soft (never rejects), the joiner always
 *     receives a contract-shaped document — never `undefined`, a 500, or a
 *     stall — even when the underlying computation times out.
 */
export function createStatusProvider(deps: AssembleDeps = {}): StatusProvider {
  const now = deps.now ?? (() => new Date());
  const minInterval = MIN_RECOMPUTE_INTERVAL_MS;
  let cached: StatusBody | null = null;
  let computedAt = 0;
  let inFlight: Promise<StatusBody> | null = null;

  function ensureCompute(): Promise<StatusBody> {
    if (inFlight === null) {
      inFlight = computeStatusBody(deps).then((body) => {
        cached = body;
        computedAt = now().getTime();
        inFlight = null;
        return body;
      });
    }
    return inFlight;
  }

  async function getStatus(): Promise<StatusDocument> {
    const nowMs = now().getTime();
    // Fresh within the throttle window — serve cache as-is.
    if (cached !== null && nowMs - computedAt < minInterval) {
      return stamp(cached, false, nowMs - computedAt, computedAt);
    }
    const pending = ensureCompute();
    if (cached !== null) {
      // Warm: immediate stale cache; background recompute is single-flight and
      // never rejects, so the floating promise is safe to ignore.
      return stamp(cached, true, nowMs - computedAt, computedAt);
    }
    // Cold: join the single in-flight computation.
    const body = await pending;
    return stamp(body, false, now().getTime() - computedAt, computedAt);
  }

  return { getStatus };
}

// ─── HTTP server (AC1 localhost-only, AC2 endpoint, AC3 page) ────────────────

function pathname(url: string | undefined): string {
  try {
    return new URL(url ?? '/', 'http://127.0.0.1').pathname;
  } catch {
    return '/';
  }
}

export function createDashboardServer(provider: StatusProvider): Server {
  return createServer((req, res) => {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('method not allowed');
      return;
    }
    const path = pathname(req.url);
    if (path === '/' || path === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderPage());
      return;
    }
    if (path === '/api/status') {
      void provider.getStatus().then(
        (doc) => {
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          });
          res.end(JSON.stringify(doc));
        },
        () => {
          // getStatus is fail-soft; this is defensive so a poll never gets a 500
          // or a hang (AC2). Emit a contract-shaped all-unknown document.
          const heartbeats = buildHeartbeats();
          const body: StatusBody = {
            generated_at: new Date().toISOString(),
            serving: { classification: 'unknown', staleness: 'staleness-unknown' },
            stations: unknownStations(heartbeats),
            heartbeats,
          };
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          });
          res.end(JSON.stringify(stamp(body, false, 0, Date.now())));
        },
      );
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
  });
}

/** Bind 127.0.0.1 ONLY (AC1) — never a routable interface. */
export function startDashboard(port: number, provider: StatusProvider): Promise<Server> {
  const server = createDashboardServer(provider);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server);
    });
  });
}

// ─── The page (AC3) — one self-contained HTML doc, zero external requests ────

export function renderPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ECHO loop dashboard</title>
<style>
  :root {
    --bg: #0f1115; --panel: #171a21; --panel2: #1e222b; --border: #2a2f3a;
    --fg: #e6e9ef; --muted: #9aa3b2;
    --ok: #35c46a; --degraded: #f2b134; --hard: #ef4444; --disabled: #7a8494; --unknown: #ef4444;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg);
    font: 14px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  header { padding: 16px 20px; border-bottom: 1px solid var(--border);
    display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
  header h1 { font-size: 16px; margin: 0; letter-spacing: .3px; }
  .meta { color: var(--muted); font-size: 12px; }
  .stale { color: var(--degraded); font-weight: 600; }
  #serving { margin-left: auto; font-size: 12px; }
  main { padding: 18px 20px; display: grid; gap: 14px;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
  .card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
    padding: 14px 16px; border-left: 5px solid var(--border); }
  .card.ok { border-left-color: var(--ok); }
  .card.degraded { border-left-color: var(--degraded); }
  .card.disabled { border-left-color: var(--disabled); }
  .card.unknown { border-left-color: var(--unknown); box-shadow: 0 0 0 1px var(--unknown) inset; }
  .card h2 { font-size: 13px; margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
  .chip { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
    padding: 2px 8px; border-radius: 999px; color: #0b0d11; }
  .chip.ok { background: var(--ok); }
  .chip.degraded { background: var(--degraded); }
  .chip.disabled { background: var(--disabled); color: #fff; }
  .chip.unknown { background: var(--unknown); color: #fff; }
  .kv { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; font-size: 12.5px; }
  .kv dt { color: var(--muted); white-space: nowrap; }
  .kv dd { margin: 0; }
  .rows { margin: 6px 0 0; font-size: 12px; }
  .row { display: flex; justify-content: space-between; gap: 10px; padding: 1px 0; }
  .row .k { color: var(--muted); }
  .deg { margin-top: 8px; font-size: 12px; }
  .deg .d { padding: 4px 8px; border-radius: 6px; margin-top: 4px; background: var(--panel2); }
  .deg .d.hard { border-left: 3px solid var(--hard); }
  .deg .d.soft { border-left: 3px solid var(--degraded); }
  .foot { color: var(--muted); font-size: 11px; margin-top: 8px; }
  .hb { font-size: 12px; margin-top: 6px; }
  #error { display: none; background: var(--hard); color: #fff; padding: 6px 20px; font-size: 12px; }
  #error.show { display: block; }
  code { background: var(--panel2); padding: 1px 5px; border-radius: 4px; }
</style>
</head>
<body>
<header>
  <h1>ECHO loop dashboard</h1>
  <span class="meta" id="generated">loading…</span>
  <span class="meta" id="cache"></span>
  <span class="meta" id="serving"></span>
</header>
<div id="error"></div>
<main id="stations"></main>
<script>
"use strict";
var POLL_MS = ${DEFAULT_POLL_INTERVAL_MS};
var STATION_TITLES = { "1": "1 · Capture", "2": "2 · Signals", "3": "3 · Packet", "4": "4 · Record", "6": "6 · Drift" };
var WORKER_FOR_STATION = { "2": "${GRANOLA_SIGNALS_WORKER}", "3": "${GRANOLA_INTAKE_BRIDGE_WORKER}", "6": "${DRIFT_SWEEP_WORKER}" };

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
function ageMs(ts, nowIso) {
  if (!ts) return null;
  var d = Date.parse(ts); if (isNaN(d)) return null;
  return Date.parse(nowIso) - d;
}
function fmtAge(ms) {
  if (ms == null) return "—";
  var s = Math.round(ms / 1000);
  if (s < 90) return s + "s ago";
  var m = Math.round(s / 60); if (m < 90) return m + "m ago";
  var h = Math.round(m / 60); if (h < 48) return h + "h ago";
  return Math.round(h / 24) + "d ago";
}
function row(k, v) { return '<div class="row"><span class="k">' + esc(k) + '</span><span>' + esc(v) + "</span></div>"; }
function chip(status) { return '<span class="chip ' + esc(status) + '">' + esc(status) + "</span>"; }

function degradations(list) {
  if (!list || !list.length) return "";
  var out = '<div class="deg">';
  for (var i = 0; i < list.length; i++) {
    var d = list[i];
    out += '<div class="d ' + esc(d.severity) + '"><strong>' + esc(d.scope) + "</strong> — " + esc(d.detail) + "</div>";
  }
  return out + "</div>";
}

function heartbeatLine(hb) {
  if (!hb) return "";
  if (hb.error) return '<div class="hb">worker heartbeat: ' + chip("unknown") + " " + esc(hb.error) + "</div>";
  var counters = hb.counters && Object.keys(hb.counters).length
    ? " · " + Object.keys(hb.counters).map(function (k) { return k + "=" + hb.counters[k]; }).join(" ") : "";
  return '<div class="hb">worker <code>' + esc(hb.worker) + "</code> " + chip(hb.status)
    + (hb.reason ? " · " + esc(hb.reason) : "")
    + " · tick " + esc(hb.last_tick_at) + counters + "</div>";
}

function stationBody(id, st, doc) {
  var body = "";
  var hb = WORKER_FOR_STATION[id] ? doc.heartbeats[WORKER_FOR_STATION[id]] : null;
  if (id === "1") {
    var srcs = st.sources || [];
    var rows = "";
    for (var i = 0; i < srcs.length; i++) {
      rows += row(srcs[i].sourceClass, srcs[i].count + " atoms · " + fmtAge(ageMs(srcs[i].newestTimestamp, doc.generated_at)));
    }
    body += '<div class="rows">' + (rows || row("sources", "none")) + "</div>";
    var cp = st.granolaCheckpoint;
    if (cp) body += '<div class="foot">granola checkpoint: ' + (cp.present ? fmtAge(cp.ageMs) : "not synced yet") + "</div>";
  } else if (id === "2") {
    if (st.signalAtoms) body += '<div class="rows">' + row("signal atoms", st.signalAtoms.count + " · " + fmtAge(ageMs(st.signalAtoms.newestTimestamp, doc.generated_at))) + "</div>";
    if (st.failingNotes && st.failingNotes.length) body += '<div class="foot">' + st.failingNotes.length + " note(s) failing extraction</div>";
    body += heartbeatLine(hb);
    body += '<div class="foot" title="checkpoint mtime staleness is a soft caveat, not a hard fault">checkpoint mtime staleness is informational, not a fault</div>';
  } else if (id === "3") {
    var stores = st.seedStores || [];
    var rows3 = "";
    for (var j = 0; j < stores.length; j++) {
      var c = stores[j].counts;
      var label = stores[j].path.split("/").pop();
      rows3 += row(label, c ? ("pending=" + c.pending + " posted=" + c.posted + " failed=" + c.failed) : stores[j].state);
    }
    body += '<div class="rows">' + (rows3 || row("seed stores", "none yet")) + "</div>";
    body += heartbeatLine(hb);
  } else if (id === "4") {
    body += '<div class="rows">' + row("team decisions", st.teamDecisionsCount == null ? "unavailable" : st.teamDecisionsCount) + "</div>";
  } else if (id === "6") {
    if (st.error) body += '<div class="foot">' + esc(st.error) + "</div>";
    else {
      body += '<div class="rows">' + row("last sweep", esc(st.lastTickAt || "—")) + (st.reason ? row("reason", st.reason) : "");
      if (st.counters) for (var ck in st.counters) body += row(ck, st.counters[ck]);
      body += "</div>";
    }
  }
  if (st.detail) body += '<div class="foot">' + esc(st.detail) + "</div>";
  body += degradations(st.degradations);
  return body;
}

function render(doc) {
  document.getElementById("error").className = "";
  document.getElementById("generated").textContent = "generated " + new Date(doc.generated_at).toLocaleTimeString();
  var cacheEl = document.getElementById("cache");
  if (doc.cache && doc.cache.stale) { cacheEl.className = "meta stale"; cacheEl.textContent = "cached (" + Math.round(doc.cache.age_ms / 1000) + "s old, refreshing…)"; }
  else { cacheEl.className = "meta"; cacheEl.textContent = "live"; }
  var sv = doc.serving || {};
  var svBad = sv.staleness === "dist-stale" || sv.staleness === "src-dev-serving";
  var svEl = document.getElementById("serving");
  svEl.className = "meta" + (svBad ? " stale" : "");
  svEl.textContent = "serving: " + esc(sv.classification) + " / " + esc(sv.staleness);

  var order = ["1", "2", "3", "4", "6"];
  var host = document.getElementById("stations");
  host.innerHTML = "";
  for (var i = 0; i < order.length; i++) {
    var id = order[i];
    var st = doc.stations[id] || { status: "unknown" };
    var card = document.createElement("section");
    card.className = "card " + st.status;
    card.innerHTML = "<h2>" + esc(STATION_TITLES[id]) + " " + chip(st.status) + "</h2>" + stationBody(id, st, doc);
    host.appendChild(card);
  }
}

function poll() {
  fetch("/api/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(render).catch(function (e) {
    var el = document.getElementById("error");
    el.className = "show";
    el.textContent = "failed to reach /api/status: " + e;
  });
}
poll();
setInterval(poll, POLL_MS);
</script>
</body>
</html>
`;
}

// ─── CLI entry ──────────────────────────────────────────────────────────────

export async function main(
  argv: readonly string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const port = resolveDashboardPort(argv, env);
  const provider = createStatusProvider({});
  const server = await startDashboard(port, provider);
  process.stdout.write(
    `ECHO loop dashboard\n  ready at  http://127.0.0.1:${port}/\n  press Ctrl-C to stop\n`,
  );

  let stopping = false;
  const shutdown = (): void => {
    if (stopping) return;
    stopping = true;
    server.close(() => process.exit(0));
    server.closeAllConnections();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// House entry guard (item 121): run the server only when this module is the
// process entry point, never on import. Holds ONLY under `vite-node --script`
// (which sets argv[1] to the resolved script path); the `loop:dashboard` npm
// script therefore uses `--script`, matching item 121 / `eval:retrieval`.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err: unknown) => {
    process.stderr.write(`${(err as Error).message}\n`);
    process.exit(1);
  });
}
