import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { resolveDataDir, resolveDbPath } from '../../daemon/lifecycle.js';
import {
  ECHO_HOME_PATHS,
  setEchoHomeRoot,
  validateOnboardingState,
  validateProjectsState,
  type InstallProfile,
  type OnboardedAgentProfile,
  type OnboardingState,
} from '../../echo-home/paths.js';
import { type AgentKind } from '../../echo-home/wizard/detect-agents.js';
import { probeAgents as realProbeAgents, type ProbeOutcome } from '../../echo-home/wizard/probe.js';
import { renderDoctorReport } from '../io/render.js';
import { buildRemediationCopy, parsePort, readPackageVersion, resolveMcpPortSync } from './init.js';
import type { Storage } from '../../storage/interface.js';
import { SqliteStorage } from '../../storage/sqlite.js';
import { GRANOLA_SOURCE, granolaCheckpointPath } from '../../capture/surfaces/granola-poller.js';
import {
  GRANOLA_SIGNAL_SOURCE,
  granolaSignalCheckpointPath,
  loadGranolaSignalCheckpoint,
} from '../../enrich/granola-signals.js';
import {
  FileGranolaIntakeSeedStore,
  type GranolaIntakeSeedStatus,
} from '../../enrich/granola-intake-seed-store.js';
import {
  GRANOLA_SIGNALS_WORKER,
  workerHeartbeatPath,
  type WorkerHeartbeat,
} from '../../enrich/worker-heartbeat.js';
import { COORD_SOURCE_PREFIX } from '../../coord/types.js';

export interface DoctorReport {
  daemon: {
    running: boolean;
    port: number;
    mcpReachable: boolean;
    pidLockPath: string;
    pidLockHeld: boolean;
  };
  echoHome: {
    root: string;
    exists: boolean;
    onboardingValid: boolean;
    projectsValid: boolean;
    schemaVersion: 1 | 'mismatch' | 'missing';
    profile: InstallProfile | 'unknown';
  };
  syncLock: { present: boolean; path: string; mtimeIso?: string; cleanupCommand?: string };
  codexAdapter: {
    status: 'ok' | 'drifted' | 'check-error';
    detail?: string;
    remediationCommand?: string;
  };
  agents: {
    kind: AgentKind;
    profile: OnboardedAgentProfile | null;
    probeOutcome: ProbeOutcome | null;
  }[];
  loop: DoctorLoopReport;
  overall: 'healthy' | 'degraded' | 'broken';
}

// ─── Loop observability (item 117) ──────────────────────────────────────────
//
// A read-only health section over stations 1–3 of the team loop, computed at
// doctor runtime entirely from existing artifacts (storage query interface,
// checkpoint files, seed stores, process args). No new daemon code, no new
// endpoints, no watchers — doctor reads what is already on disk.
//
// Severity model (see the "loop rollup" note on computeOverall): every
// degradation carries a `severity`. `hard` faults are genuine failures
// (malformed/unreadable/partial artifact reads, storage read errors, a
// pid-lock↔listener disagreement, an actionable staleness warning) and
// downgrade the top-level `overall` to `degraded`. `soft` states
// (absent/never-run/not-yet-run/empty/nothing-listening) are informational:
// they mark the station's own status + carry remediation for the operator, but
// they never downgrade `overall`. This split is what lets the loop section be
// "included in the overall rollup" without a fresh install (no checkpoints,
// empty db, nothing listening) reporting itself as unhealthy. Each station also
// exposes a machine-readable `condition` discriminator (e.g. never-ran vs stale
// vs checkpoint-unreadable) so tooling can tell the states apart without
// parsing rendered prose; `tests/cli/doctor-loop.test.ts` pins the boundary.

export type LoopStatus = 'ok' | 'degraded';

export interface LoopDegradation {
  scope: string;
  severity: 'soft' | 'hard';
  path?: string;
  detail: string;
  remediation: string;
}

// Result of the read-only storage-open attempt. A `missing` db is a soft
// not-yet-run state (doctor never creates/migrates it); a present-but-broken db
// is a hard error. Distinguishing them is what keeps a fresh install
// overall:healthy while surfacing a genuinely unreadable store as degraded.
type StorageIssue =
  | { kind: 'missing'; dbPath: string }
  | { kind: 'error'; dbPath: string; message: string };

export interface LoopCaptureSourceHealth {
  sourceClass: string;
  newestTimestamp: string | null;
  count: number;
  // AC2: a pinned always-interesting class that has zero atoms in the store is
  // annotated so a 0-count reads as "nothing captured with this class yet"
  // rather than "capture is broken". Omitted for classes actually present in
  // the store (count > 0) — those need no disambiguation.
  annotation?: string;
}

export interface LoopGranolaCheckpoint {
  present: boolean;
  highWaterMark: string | null;
  lastSyncedAt: string | null;
  ingestedNoteCount: number | null;
  ageMs: number | null;
}

// Machine-readable per-station condition discriminators (rider 2): tooling
// reads `condition` instead of parsing rendered prose. `status` stays the
// coarse ok/degraded; `condition` names the dominant state (hard states take
// precedence over soft). The station's full degradation list is still in
// `degradations` (each with its own machine-readable `scope`+`severity`).
export type Station1Condition =
  | 'ok'
  | 'db-missing'
  | 'checkpoint-missing'
  | 'checkpoint-unreadable'
  | 'storage-error';
export type Station2Condition =
  | 'active'
  | 'disabled'
  | 'never-ran'
  | 'stale'
  | 'checkpoint-unreadable'
  | 'storage-error';
export type ServingCondition =
  | 'ok'
  | 'no-listener'
  | 'pid-disagreement'
  | 'argv-unreadable'
  | 'classify-unknown'
  | 'dist-stale'
  | 'src-dev-serving'
  | 'staleness-unknown';
export type Station3Condition = 'ok' | 'not-yet-run' | 'seed-store-unreadable';

export interface LoopStation1 {
  status: LoopStatus;
  condition: Station1Condition;
  sources: LoopCaptureSourceHealth[];
  granolaCheckpoint: LoopGranolaCheckpoint;
  degradations: LoopDegradation[];
}

export interface LoopFailingNote {
  noteId: string;
  lastFailureAt: string;
  lastFailureReason?: string;
}

// AC1: the observed slice of the signal worker's item-120 heartbeat. Present
// (non-null) exactly when a well-formed heartbeat was read; `null` when the
// station fell back to checkpoint-mtime inference (see `LoopStation2.inferred`).
export interface LoopStation2Heartbeat {
  status: WorkerHeartbeat['status'];
  reason: string | null;
  lastTickAt: string;
  lastTickAgeMs: number | null;
}

export interface LoopStation2 {
  status: LoopStatus;
  condition: Station2Condition;
  flags: { neverRan: boolean; stale: boolean };
  checkpointMtimeIso: string | null;
  checkpointAgeMs: number | null;
  failingNotes: LoopFailingNote[];
  signalAtoms: { newestTimestamp: string | null; count: number } | null;
  // AC1: `true` when disabled/staleness were inferred from checkpoint mtime
  // because no well-formed heartbeat existed; `false` when observed from the
  // item-120 heartbeat. Always present so the report never reports an inferred
  // state as if it were observed.
  inferred: boolean;
  heartbeat: LoopStation2Heartbeat | null;
  notes: string[];
  degradations: LoopDegradation[];
}

export type ServingClassification = 'packaged-dist' | 'src-dev' | 'unknown';
export type ServingStaleness = 'fresh' | 'dist-stale' | 'src-dev-serving' | 'staleness-unknown';

export interface LoopServing {
  status: LoopStatus;
  condition: ServingCondition;
  port: number;
  listeningPid: number | null;
  pidLockPid: number | null;
  classification: ServingClassification;
  executingPath: string | null;
  staleness: ServingStaleness;
  degradations: LoopDegradation[];
}

export interface LoopSeedStoreHealth {
  path: string;
  state: 'counted' | 'not-yet-run' | 'unreadable';
  counts: Record<GranolaIntakeSeedStatus, number> | null;
}

export interface LoopStation3 {
  status: LoopStatus;
  condition: Station3Condition;
  seedStores: LoopSeedStoreHealth[];
  intakeEnabled: boolean;
  intakeEnabledNote: string;
  teamDecisionsCount: number | null;
  notes: string[];
  degradations: LoopDegradation[];
}

export interface DoctorLoopReport {
  station1: LoopStation1;
  station2: LoopStation2;
  serving: LoopServing;
  station3: LoopStation3;
  status: LoopStatus;
}

/** Pinned "always-interesting" capture source classes surfaced by station 1,
 *  keyed by source prefix. These are ALWAYS listed even when they have zero
 *  atoms (annotated, not a bare 0-count) so an operator can see the load-bearing
 *  capture surfaces at a glance. Station 1 unions this with the classes actually
 *  present in the store (AC2: `deriveStoreSourceClasses`).
 *
 *  The former phantom entries `claude-code:` / `codex:` / `cursor:` are gone:
 *  every session extractor emits `fs:`-prefixed atoms, so those three prefixes
 *  read `count: 0` forever by construction (implying broken capture that isn't
 *  broken). `coord:` — 18k+ live coordination events that were silently omitted
 *  — is now pinned. Capture-side prefix attribution (making the extractors emit
 *  per-app prefixes) is a separate, out-of-scope decision. */
export const LOOP_CAPTURE_SOURCE_CLASSES: readonly string[] = [
  GRANOLA_SOURCE, // api:granola
  'git:',
  'fs:',
  COORD_SOURCE_PREFIX, // coord:
];

/** Bound on the recent-window scan used to derive which source classes are
 *  actually present in the store (AC2). Doctor is an occasional diagnostic, not
 *  a hot path; a bounded newest-first scan keeps the query cheap while still
 *  surfacing any class that is actively producing atoms. The pinned set above
 *  guarantees the load-bearing surfaces appear regardless of this window, so a
 *  rarely-written class older than the window is only ever an omission from the
 *  DERIVED set, never from the pinned set. */
export const LOOP_SOURCE_CLASS_DERIVE_SCAN_LIMIT = 5_000;

/** The annotation attached to a pinned class with zero atoms in the store. */
const LOOP_EMPTY_SOURCE_CLASS_ANNOTATION = 'no atoms with this source class in store';

/** derived:team-decisions atoms (station 4 preview count only). */
const LOOP_TEAM_DECISION_SOURCE = 'derived:team-decisions';

/** Named-constant default: station-2 checkpoint older than this is `stale`.
 *  The signal worker ticks every 5 min (DEFAULT_GRANOLA_SIGNAL_WORKER_INTERVAL_MS);
 *  one hour without a checkpoint touch is a conservative staleness floor. */
export const DEFAULT_LOOP_SIGNALS_STALE_MS = 60 * 60 * 1000;

export interface DoctorOpts {
  json?: boolean;
  quiet?: boolean;
  color?: boolean;
  home?: string;
  port?: string | number;
  label?: string;
  stdout?: Pick<NodeJS.WritableStream, 'write'>;
  stderr?: Pick<NodeJS.WritableStream, 'write'>;
  probeAgents?: typeof realProbeAgents;
  codexAdapterCheck?: () => Promise<DoctorReport['codexAdapter']>;
  fetch?: typeof fetch;
  now?: () => Date;
  platform?: NodeJS.Platform;
  // Loop-observability (item 117) seams — all read-only; defaults hit the real
  // artifacts so production doctor needs no wiring.
  openStorage?: () => Storage;
  portOwnerLookup?: (port: number) => Promise<number | null>;
  readPidArgv?: (pid: number) => Promise<string[] | null>;
  loopStalenessDirs?: { src: string; dist: string };
  loopSignalsStaleMs?: number;
}

export const DOCTOR_HELP = `Usage: echoctl doctor [--json] [--quiet] [--home <path>] [--port <n>] [--label <id>]

Options:
  --home <path>   ECHO_HOME for this doctor run
  --port <n>      MCP server port to probe
  --label <id>    accepted for daemon-isolation parity; doctor does not query launchd`;

function writeLine(stream: Pick<NodeJS.WritableStream, 'write'>, line: string): void {
  stream.write(`${line}\n`);
}

export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function isAgentKind(value: string): value is AgentKind {
  return value === 'codex' || value === 'claude-code' || value === 'cursor';
}

function parseNonEmptyOption(value: string | undefined, flag: string): string | undefined {
  if (value === undefined) return undefined;
  if (value.trim().length === 0) throw new Error(`invalid ${flag}: expected non-empty string`);
  return value;
}

export function parseDoctorArgs(
  args: readonly string[],
): Pick<DoctorOpts, 'home' | 'label' | 'port'> {
  const parsed = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: false,
    options: {
      home: { type: 'string' },
      port: { type: 'string' },
      label: { type: 'string' },
    },
  });
  const port = parseNonEmptyOption(parsed.values.port, '--port');
  if (port !== undefined) parsePort(port);
  return {
    home: parseNonEmptyOption(parsed.values.home, '--home'),
    port,
    label: parseNonEmptyOption(parsed.values.label, '--label'),
  };
}

function resolveDoctorPort(port: DoctorOpts['port']): number {
  if (port === undefined) return resolveMcpPortSync();
  if (typeof port === 'number') return port;
  return parsePort(port);
}

function readValidOnboarding(): OnboardingState | null {
  try {
    const raw = JSON.parse(readFileSync(ECHO_HOME_PATHS.stateOnboarding, 'utf8')) as unknown;
    return validateOnboardingState(raw) ? raw : null;
  } catch {
    return null;
  }
}

const SAFE_SUBPROCESS_PATH = '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin';

function repoRootFromModule(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../../..');
}

function resolveCodexInstallerPath(): string {
  return join(repoRootFromModule(), 'tools/install-echo-codex-skills.sh');
}

export interface CodexAdapterChildOutcome {
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  spawnError?: string;
}

function runCodexInstallerCheck(installerPath: string): Promise<CodexAdapterChildOutcome> {
  return new Promise((resolve) => {
    execFile(
      installerPath,
      ['--check'],
      {
        cwd: repoRootFromModule(),
        encoding: 'utf8',
        env: { ...process.env, PATH: SAFE_SUBPROCESS_PATH },
        timeout: 30_000,
      },
      (error, stdout, stderr) => {
        const err = error as
          | (Error & { code?: number | string | null; signal?: string | null })
          | null;
        resolve({
          exitCode: err === null ? 0 : typeof err.code === 'number' ? err.code : null,
          signal: err?.signal ?? null,
          stdout: String(stdout ?? ''),
          stderr: String(stderr ?? ''),
          spawnError: err !== null && typeof err.code === 'string' ? err.message : undefined,
        });
      },
    );
  });
}

function nonEmptyDetail(primary: string, fallback: string): string {
  const detail = primary.trim();
  return detail.length > 0 ? detail : fallback;
}

export function codexAdapterReportFromOutcome(
  outcome: CodexAdapterChildOutcome,
  installerPath: string,
): DoctorReport['codexAdapter'] {
  const remediationCommand = installerPath;
  if (outcome.exitCode === 0) {
    return { status: 'ok', detail: nonEmptyDetail(outcome.stdout, 'Codex adapter check passed') };
  }
  if (outcome.exitCode === 1) {
    return {
      status: 'drifted',
      detail: nonEmptyDetail(outcome.stdout, 'Codex adapter drift detected'),
      remediationCommand,
    };
  }
  const fallback =
    outcome.spawnError ??
    (outcome.signal !== null
      ? `Codex adapter check terminated by signal ${outcome.signal}`
      : `Codex adapter check exited ${outcome.exitCode ?? 'without an exit code'}`);
  return {
    status: 'check-error',
    detail: nonEmptyDetail(outcome.stderr, fallback),
    remediationCommand,
  };
}

export async function checkCodexAdapter(): Promise<DoctorReport['codexAdapter']> {
  const installerPath = resolveCodexInstallerPath();
  return codexAdapterReportFromOutcome(await runCodexInstallerCheck(installerPath), installerPath);
}

function renderCodexAdapterLines(report: DoctorReport): string[] {
  const check = report.codexAdapter;
  const lines = [`codex-adapter: ${check.status}`];
  if (check.detail !== undefined && check.detail.length > 0) lines.push(check.detail);
  if (check.status !== 'ok' && check.remediationCommand !== undefined) {
    lines.push(`remediation: ${check.remediationCommand}`);
  }
  return lines;
}

function renderDoctorWithCodexAdapter(
  report: DoctorReport,
  opts: { color: boolean; remediation: ReturnType<typeof buildRemediationCopy> },
): string {
  return [renderDoctorReport(report, opts), ...renderCodexAdapterLines(report)].join('\n');
}

function stateVersion(): {
  onboardingValid: boolean;
  projectsValid: boolean;
  schemaVersion: 1 | 'mismatch' | 'missing';
  profile: InstallProfile | 'unknown';
  onboarding: OnboardingState | null;
} {
  let onboardingValid = false;
  let projectsValid = false;
  let missing = false;
  let onboarding: OnboardingState | null = null;
  try {
    const raw = JSON.parse(readFileSync(ECHO_HOME_PATHS.stateOnboarding, 'utf8')) as unknown;
    onboardingValid = validateOnboardingState(raw);
    if (onboardingValid) onboarding = raw as OnboardingState;
  } catch {
    missing = true;
  }
  try {
    const raw = JSON.parse(readFileSync(ECHO_HOME_PATHS.stateProjects, 'utf8')) as unknown;
    projectsValid = validateProjectsState(raw);
  } catch {
    missing = true;
  }
  return {
    onboardingValid,
    projectsValid,
    schemaVersion: missing ? 'missing' : onboardingValid && projectsValid ? 1 : 'mismatch',
    profile: onboardingValid ? (onboarding?.profile ?? 'customer') : 'unknown',
    onboarding,
  };
}

async function probeMcp(fetchImpl: typeof fetch, port: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'echoctl-doctor', version: readPackageVersion() },
        },
        id: 1,
      }),
      signal: controller.signal,
    });
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Loop-section builders (item 117) ───────────────────────────────────────

function stationStatus(degradations: readonly LoopDegradation[]): LoopStatus {
  return degradations.length > 0 ? 'degraded' : 'ok';
}

function hasScope(degradations: readonly LoopDegradation[], scope: string): boolean {
  return degradations.some((d) => d.scope === scope);
}

// Shared soft/hard degradation for a null storage handle. `missing` → soft
// not-yet-run (does not downgrade overall); `error` → hard unreadable.
function storageDegradation(scope: string, issue: StorageIssue): LoopDegradation {
  if (issue.kind === 'missing') {
    return {
      scope,
      severity: 'soft',
      path: issue.dbPath,
      detail: 'atom db not created yet — no capture has been recorded (daemon has not written the store).',
      remediation:
        'Start the ECHO daemon (install script / `echoctl daemon start`) so capture begins, then re-run `echoctl doctor`.',
    };
  }
  return {
    scope,
    severity: 'hard',
    path: issue.dbPath,
    detail: `atom db unreadable: ${issue.message}`,
    remediation:
      'Ensure the ECHO daemon is running and the atom db is not locked/corrupt, then re-run `echoctl doctor`.',
  };
}

function station1Condition(degradations: readonly LoopDegradation[]): Station1Condition {
  const storage = degradations.find((d) => d.scope === 'station-1:storage');
  if (storage?.severity === 'hard') return 'storage-error';
  if (storage !== undefined) return 'db-missing'; // soft = missing db
  const cp = degradations.find((d) => d.scope === 'station-1:granola-checkpoint');
  if (cp?.severity === 'hard') return 'checkpoint-unreadable';
  if (cp !== undefined) return 'checkpoint-missing';
  return 'ok';
}

function station2Condition(
  degradations: readonly LoopDegradation[],
  flags: { neverRan: boolean; stale: boolean; disabled: boolean },
): Station2Condition {
  const cp = degradations.find((d) => d.scope === 'station-2:checkpoint');
  if (cp?.severity === 'hard') return 'checkpoint-unreadable';
  if (degradations.some((d) => d.scope === 'station-2:storage' && d.severity === 'hard')) {
    return 'storage-error';
  }
  // Observed disabled (from the heartbeat) outranks the inferred never-ran/stale
  // states — it is a certain signal, not a mtime guess.
  if (flags.disabled) return 'disabled';
  if (flags.neverRan) return 'never-ran';
  if (flags.stale) return 'stale';
  return 'active';
}

function servingCondition(
  degradations: readonly LoopDegradation[],
  staleness: ServingStaleness,
): ServingCondition {
  if (hasScope(degradations, 'serving:pid-disagreement')) return 'pid-disagreement';
  if (hasScope(degradations, 'serving:argv')) return 'argv-unreadable';
  if (hasScope(degradations, 'serving:port-owner')) return 'no-listener';
  if (staleness === 'dist-stale') return 'dist-stale';
  if (staleness === 'src-dev-serving') return 'src-dev-serving';
  if (hasScope(degradations, 'serving:classify')) return 'classify-unknown';
  if (staleness === 'staleness-unknown') return 'staleness-unknown';
  return 'ok';
}

function station3Condition(
  degradations: readonly LoopDegradation[],
  seedStores: readonly LoopSeedStoreHealth[],
): Station3Condition {
  if (hasScope(degradations, 'station-3:seed-store')) return 'seed-store-unreadable';
  if (seedStores.length === 0) return 'not-yet-run';
  return 'ok';
}

function loopHasHardFault(loop: DoctorLoopReport): boolean {
  const all = [
    ...loop.station1.degradations,
    ...loop.station2.degradations,
    ...loop.serving.degradations,
    ...loop.station3.degradations,
  ];
  return all.some((d) => d.severity === 'hard');
}

function readJsonFileStrict(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function queryClassHealth(
  storage: Storage,
  sourceClass: string,
  pinned: boolean,
): Promise<LoopCaptureSourceHealth> {
  const rows = await storage.query({ source_prefix: sourceClass, order: 'desc' });
  const health: LoopCaptureSourceHealth = {
    sourceClass,
    newestTimestamp: rows[0]?.timestamp ?? null,
    count: rows.length,
  };
  // AC2: only a PINNED class can be listed with zero atoms (derived classes are
  // present by construction). Annotate that zero so it does not read as broken.
  if (pinned && rows.length === 0) health.annotation = LOOP_EMPTY_SOURCE_CLASS_ANNOTATION;
  return health;
}

/** AC2: map a raw `source` string to its capture "class" key. `api:granola`
 *  keeps its two-segment granularity (matching the pinned constant + the
 *  historical station-1 row); every other source collapses to the prefix up to
 *  and including its first `:` (e.g. `git:Project_echo` → `git:`,
 *  `coord:signals` → `coord:`, `derived:team-decisions` → `derived:`). A source
 *  with no `:` maps to itself. */
function sourceClassOf(source: string): string {
  if (source === GRANOLA_SOURCE || source.startsWith(`${GRANOLA_SOURCE}:`)) return GRANOLA_SOURCE;
  const idx = source.indexOf(':');
  return idx >= 0 ? source.slice(0, idx + 1) : source;
}

/** AC2: the distinct source classes actually present in the store, from a
 *  bounded newest-first scan (see `LOOP_SOURCE_CLASS_DERIVE_SCAN_LIMIT`). */
async function deriveStoreSourceClasses(storage: Storage): Promise<Set<string>> {
  const rows = await storage.query({
    order: 'desc',
    limit: LOOP_SOURCE_CLASS_DERIVE_SCAN_LIMIT,
  });
  const classes = new Set<string>();
  for (const row of rows) classes.add(sourceClassOf(row.source));
  return classes;
}

async function queryExactHealth(
  storage: Storage,
  source: string,
): Promise<{ newestTimestamp: string | null; count: number }> {
  const rows = await storage.query({ source, order: 'desc' });
  return { newestTimestamp: rows[0]?.timestamp ?? null, count: rows.length };
}

async function buildLoopStation1(
  storage: Storage | null,
  storageIssue: StorageIssue | null,
  dbPath: string,
  now: Date,
): Promise<LoopStation1> {
  const degradations: LoopDegradation[] = [];
  const sources: LoopCaptureSourceHealth[] = [];

  if (storage === null) {
    degradations.push(
      storageDegradation('station-1:storage', storageIssue ?? { kind: 'error', dbPath, message: 'unknown error' }),
    );
  } else {
    try {
      // AC2: the row set is the pinned always-interesting classes UNIONED with
      // the classes actually present in the store. Pinned classes keep their
      // fixed order and lead; any derived-but-not-pinned class (e.g. `derived:`)
      // follows in sorted order. Pinned-and-empty rows carry an annotation.
      const pinned = LOOP_CAPTURE_SOURCE_CLASSES;
      const pinnedSet = new Set(pinned);
      const derived = await deriveStoreSourceClasses(storage);
      const derivedOnly = [...derived].filter((c) => !pinnedSet.has(c)).sort();
      for (const sourceClass of pinned) {
        sources.push(await queryClassHealth(storage, sourceClass, true));
      }
      for (const sourceClass of derivedOnly) {
        sources.push(await queryClassHealth(storage, sourceClass, false));
      }
    } catch (err) {
      degradations.push({
        scope: 'station-1:storage',
        severity: 'hard',
        path: dbPath,
        detail: `storage query failed: ${(err as Error).message}`,
        remediation: 'Ensure the ECHO daemon is running and the atom db is readable, then re-run `echoctl doctor`.',
      });
    }
  }

  const cpPath = granolaCheckpointPath();
  let granolaCheckpoint: LoopGranolaCheckpoint = {
    present: false,
    highWaterMark: null,
    lastSyncedAt: null,
    ingestedNoteCount: null,
    ageMs: null,
  };
  if (!existsSync(cpPath)) {
    degradations.push({
      scope: 'station-1:granola-checkpoint',
      severity: 'soft',
      path: cpPath,
      detail: 'Granola checkpoint not found — the poller has not synced yet.',
      remediation: 'Confirm GRANOLA_API_KEY is set and the daemon Granola poller is enabled.',
    });
  } else {
    try {
      const raw = readJsonFileStrict(cpPath) as Record<string, unknown>;
      const highWaterMark = typeof raw['high_water_mark'] === 'string' ? raw['high_water_mark'] : null;
      const lastSyncedAt = typeof raw['last_synced_at'] === 'string' ? raw['last_synced_at'] : null;
      const ingested = Array.isArray(raw['ingested_note_ids']) ? raw['ingested_note_ids'].length : null;
      const ageMs =
        lastSyncedAt !== null ? now.getTime() - new Date(lastSyncedAt).getTime() : null;
      granolaCheckpoint = {
        present: true,
        highWaterMark,
        lastSyncedAt,
        ingestedNoteCount: ingested,
        ageMs: ageMs !== null && Number.isFinite(ageMs) ? ageMs : null,
      };
    } catch (err) {
      granolaCheckpoint = {
        present: true,
        highWaterMark: null,
        lastSyncedAt: null,
        ingestedNoteCount: null,
        ageMs: null,
      };
      degradations.push({
        scope: 'station-1:granola-checkpoint',
        severity: 'hard',
        path: cpPath,
        detail: `Granola checkpoint unreadable/malformed: ${(err as Error).message}`,
        remediation: `Inspect ${cpPath}; if corrupt, stop the daemon and remove it so the poller rebuilds from its high-water mark.`,
      });
    }
  }

  return {
    status: stationStatus(degradations),
    condition: station1Condition(degradations),
    sources,
    granolaCheckpoint,
    degradations,
  };
}

// AC1: observed-first semantics. When the granola-signals worker's item-120
// heartbeat is present, disable/degraded state and liveness are OBSERVED from it
// (`inferred: false`). Only when the heartbeat is missing/malformed does the
// station fall back to checkpoint-mtime inference (`inferred: true`) — the old
// behavior, where an in-process permanent-disable could only be guessed at.
const STATION2_OBSERVED_NOTE =
  'Disable/degraded state + liveness are observed from the `granola-signals` worker heartbeat (item 120) when present. A missing/malformed heartbeat falls back to checkpoint-mtime inference (reported with `inferred: true`); in that mode an in-process permanent-disable is not directly observable — check daemon startup logs for `granola-signals` config errors.';
const STATION2_SUPERSEDE_NOTE =
  'signal-atom count includes superseded extraction runs (supersede is logical latest-wins; atoms are append-only).';

/** AC1: read + validate the granola-signals worker heartbeat (item 120). A
 *  missing OR malformed file yields `null` — the caller then falls back to
 *  checkpoint-mtime inference. A malformed heartbeat is NOT a hard fault (unlike
 *  a malformed checkpoint): heartbeats are best-effort atomic overwrites, so a
 *  stale/partial one just means "cannot observe right now, infer instead". */
function readSignalsHeartbeat(now: Date): LoopStation2Heartbeat | null {
  const path = workerHeartbeatPath(GRANOLA_SIGNALS_WORKER);
  if (!existsSync(path)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const hb = raw as Partial<WorkerHeartbeat>;
  const status = hb.status;
  if (status !== 'ok' && status !== 'degraded' && status !== 'disabled') return null;
  if (typeof hb.last_tick_at !== 'string' || hb.last_tick_at.length === 0) return null;
  const tickMs = new Date(hb.last_tick_at).getTime();
  const lastTickAgeMs = Number.isFinite(tickMs) ? now.getTime() - tickMs : null;
  return {
    status,
    reason: typeof hb.reason === 'string' ? hb.reason : null,
    lastTickAt: hb.last_tick_at,
    lastTickAgeMs,
  };
}

async function buildLoopStation2(
  storage: Storage | null,
  storageIssue: StorageIssue | null,
  dbPath: string,
  now: Date,
  staleMs: number,
): Promise<LoopStation2> {
  const degradations: LoopDegradation[] = [];
  const notes = [STATION2_OBSERVED_NOTE, STATION2_SUPERSEDE_NOTE];
  const cpPath = granolaSignalCheckpointPath();

  const heartbeat = readSignalsHeartbeat(now);
  const inferred = heartbeat === null;

  let neverRan = false;
  let stale = false;
  let disabled = false;
  let checkpointMtimeIso: string | null = null;
  let checkpointAgeMs: number | null = null;
  const failingNotes: LoopFailingNote[] = [];

  // Checkpoint read — ALWAYS attempted (both observed + inferred paths) for
  // per-note failure entries + the mtime display + a malformed-file hard fault.
  // The liveness/never-ran/stale DECISION is made afterward, heartbeat-first.
  const checkpointPresent = existsSync(cpPath);
  let checkpointReadOk = false;
  if (checkpointPresent) {
    try {
      const mtimeMs = statSync(cpPath).mtimeMs;
      checkpointMtimeIso = new Date(mtimeMs).toISOString();
      checkpointAgeMs = now.getTime() - mtimeMs;
      const checkpoint = loadGranolaSignalCheckpoint(cpPath);
      checkpointReadOk = true;
      for (const [noteId, entry] of Object.entries(checkpoint.notes)) {
        const lastFailureAt = entry.last_failure_at;
        const lastSuccessAt = entry.last_success_at;
        const failing =
          lastFailureAt !== undefined &&
          (lastSuccessAt === undefined || lastFailureAt > lastSuccessAt);
        if (failing) {
          failingNotes.push({
            noteId,
            lastFailureAt: lastFailureAt!,
            ...(entry.last_failure_reason !== undefined
              ? { lastFailureReason: entry.last_failure_reason }
              : {}),
          });
        }
      }
      if (failingNotes.length > 0) {
        degradations.push({
          scope: 'station-2:failing-notes',
          severity: 'soft',
          path: cpPath,
          detail: `${failingNotes.length} note(s) failing extraction: ${failingNotes.map((n) => n.noteId).join(', ')}`,
          remediation:
            'Inspect the failing notes; a permanently-bad note aborts its own extraction, not the tick.',
        });
      }
    } catch (err) {
      degradations.push({
        scope: 'station-2:checkpoint',
        severity: 'hard',
        path: cpPath,
        detail: `signal-worker checkpoint unreadable/malformed: ${(err as Error).message}`,
        remediation: `Inspect ${cpPath}; if corrupt, stop the daemon and remove it so the worker rebuilds per-note state.`,
      });
    }
  }

  if (heartbeat !== null) {
    // OBSERVED (AC1): disable/degraded + liveness come from the heartbeat's
    // last-tick timestamp, NOT checkpoint mtime. A fresh heartbeat on a quiet
    // day (nothing extracted → old checkpoint) reports healthy.
    const hbPath = workerHeartbeatPath(GRANOLA_SIGNALS_WORKER);
    if (heartbeat.status === 'disabled') {
      disabled = true;
      degradations.push({
        scope: 'station-2:disabled',
        severity: 'soft',
        path: hbPath,
        detail: `signal-worker is disabled (observed): ${heartbeat.reason ?? 'no reason recorded'}.`,
        remediation:
          'Re-enable the `granola-signals` worker (check ECHO_GRANOLA_SIGNAL_BRAIN / config) and restart the daemon.',
      });
    } else {
      if (heartbeat.status === 'degraded') {
        // The f19dc419 silent-brain-down class: worker alive + ticking, but its
        // last tick could not do its job. Surfaced, never read as healthy.
        degradations.push({
          scope: 'station-2:degraded',
          severity: 'soft',
          path: hbPath,
          detail: `signal-worker last tick was degraded (observed): ${heartbeat.reason ?? 'no reason recorded'}.`,
          remediation:
            'Check the `granola-signals` brain/judge availability; a degraded tick means the worker ran but could not extract.',
        });
      }
      stale = heartbeat.lastTickAgeMs !== null && heartbeat.lastTickAgeMs > staleMs;
      if (stale) {
        degradations.push({
          scope: 'station-2:stale',
          severity: 'soft',
          path: hbPath,
          detail: `signal-worker last tick was ${Math.round((heartbeat.lastTickAgeMs ?? 0) / 60000)} min ago (observed via heartbeat).`,
          remediation:
            'Confirm the daemon is running; the `granola-signals` worker ticks every 5 min, so a gap this long means it stalled or the daemon stopped.',
        });
      }
    }
  } else {
    // INFERRED FALLBACK (missing/malformed heartbeat): the prior behavior —
    // staleness/never-ran guessed from checkpoint mtime, reported inferred:true.
    if (!checkpointPresent) {
      neverRan = true;
      degradations.push({
        scope: 'station-2:checkpoint',
        severity: 'soft',
        path: cpPath,
        detail: 'signal-worker checkpoint not found — the worker has not run (or is disabled).',
        remediation:
          'Check daemon startup logs for `granola-signals` config errors (e.g. an invalid ECHO_GRANOLA_SIGNAL_BRAIN).',
      });
    } else if (checkpointReadOk && checkpointAgeMs !== null) {
      stale = checkpointAgeMs > staleMs;
      if (stale) {
        degradations.push({
          scope: 'station-2:stale',
          severity: 'soft',
          path: cpPath,
          detail: `signal-worker checkpoint is stale (${Math.round(checkpointAgeMs / 60000)} min since last activity).`,
          remediation:
            'Check daemon startup logs for `granola-signals` config errors; a config-parse typo permanently disables the worker at boot.',
        });
      }
    }
  }

  let signalAtoms: { newestTimestamp: string | null; count: number } | null = null;
  if (storage === null) {
    degradations.push(
      storageDegradation('station-2:storage', storageIssue ?? { kind: 'error', dbPath, message: 'unknown error' }),
    );
  } else {
    try {
      signalAtoms = await queryExactHealth(storage, GRANOLA_SIGNAL_SOURCE);
    } catch (err) {
      degradations.push({
        scope: 'station-2:storage',
        severity: 'hard',
        path: dbPath,
        detail: `signal-atom query failed: ${(err as Error).message}`,
        remediation: 'Ensure the ECHO daemon is running and the atom db is readable, then re-run `echoctl doctor`.',
      });
    }
  }

  return {
    status: stationStatus(degradations),
    condition: station2Condition(degradations, { neverRan, stale, disabled }),
    flags: { neverRan, stale },
    checkpointMtimeIso,
    checkpointAgeMs,
    failingNotes,
    inferred,
    heartbeat,
    signalAtoms,
    notes,
    degradations,
  };
}

function defaultPortOwnerLookup(port: number): Promise<number | null> {
  return new Promise((resolve) => {
    execFile(
      'lsof',
      ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'],
      { encoding: 'utf8', timeout: 5000, env: { ...process.env, PATH: SAFE_SUBPROCESS_PATH } },
      (error, stdout) => {
        // lsof exits non-zero when nothing is listening — treat as "no owner".
        if (error !== null) {
          resolve(null);
          return;
        }
        const first = String(stdout)
          .split(/\s+/)
          .map((s) => s.trim())
          .filter(Boolean)[0];
        const pid = first !== undefined ? Number.parseInt(first, 10) : Number.NaN;
        resolve(Number.isInteger(pid) ? pid : null);
      },
    );
  });
}

function defaultReadPidArgv(pid: number): Promise<string[] | null> {
  return new Promise((resolve) => {
    execFile(
      'ps',
      ['-ww', '-o', 'command=', '-p', String(pid)],
      { encoding: 'utf8', timeout: 5000, env: { ...process.env, PATH: SAFE_SUBPROCESS_PATH } },
      (error, stdout) => {
        if (error !== null) {
          resolve(null);
          return;
        }
        const line = String(stdout).trim();
        if (line.length === 0) {
          resolve(null);
          return;
        }
        resolve(line.split(/\s+/).filter(Boolean));
      },
    );
  });
}

const SERVING_SCRIPT_EXT = ['.js', '.mjs', '.cjs', '.ts'];

function isScriptToken(token: string): boolean {
  return SERVING_SCRIPT_EXT.some((ext) => token.endsWith(ext));
}

export function classifyServingArgv(argv: readonly string[]): {
  classification: ServingClassification;
  executingPath: string | null;
} {
  const scriptToken =
    argv.find((t) => (t.includes('/dist/') || t.includes('/src/')) && isScriptToken(t)) ??
    argv.find((t) => isScriptToken(t)) ??
    null;
  const joined = argv.join(' ');
  if (scriptToken !== null && scriptToken.includes('/dist/')) {
    return { classification: 'packaged-dist', executingPath: scriptToken };
  }
  if (joined.includes('vite-node') || (scriptToken !== null && scriptToken.includes('/src/'))) {
    return { classification: 'src-dev', executingPath: scriptToken };
  }
  return { classification: 'unknown', executingPath: scriptToken };
}

function newestMtimeMs(dir: string): number | null {
  let topReadable = true;
  let newest: number | null = null;
  const stack = [dir];
  let first = true;
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      if (first) topReadable = false;
      first = false;
      continue;
    }
    first = false;
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const p = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(p);
      } else {
        try {
          const m = statSync(p).mtimeMs;
          if (newest === null || m > newest) newest = m;
        } catch {
          // skip unreadable file
        }
      }
    }
  }
  return topReadable ? newest : null;
}

function computeStaleness(
  classification: ServingClassification,
  dirs: { src: string; dist: string },
): { staleness: ServingStaleness; degradation: LoopDegradation | null } {
  const srcNewest = newestMtimeMs(dirs.src);
  const distNewest = newestMtimeMs(dirs.dist);
  if (srcNewest === null || distNewest === null) {
    return {
      staleness: 'staleness-unknown',
      degradation: {
        scope: 'serving:staleness',
        severity: 'soft',
        detail: `cannot compare src/dist mtimes (src=${dirs.src} dist=${dirs.dist}); one is missing or unreadable.`,
        remediation: 'Run `npm run build:cli` to (re)build dist, then re-run `echoctl doctor`.',
      },
    };
  }
  const srcNewer = srcNewest > distNewest;
  if (classification === 'packaged-dist' && srcNewer) {
    return {
      staleness: 'dist-stale',
      degradation: {
        scope: 'serving:staleness',
        severity: 'hard',
        detail: 'serving packaged dist, but src/ is newer than dist/ — the daemon is running stale code.',
        remediation: 'Run `npm run build:cli`, then restart the daemon (daemon install script).',
      },
    };
  }
  if (classification === 'src-dev') {
    return {
      staleness: 'src-dev-serving',
      degradation: {
        scope: 'serving:staleness',
        severity: 'hard',
        detail: 'an unsupervised src-dev (vite-node) process is serving the production port.',
        remediation: 'Run `npm run build:cli` and restart the supervised daemon (daemon install script).',
      },
    };
  }
  return { staleness: 'fresh', degradation: null };
}

async function buildLoopServing(
  port: number,
  pidLockPath: string,
  pidLockHeld: boolean,
  portOwnerLookup: (port: number) => Promise<number | null>,
  readPidArgv: (pid: number) => Promise<string[] | null>,
  stalenessDirs: { src: string; dist: string },
): Promise<LoopServing> {
  const degradations: LoopDegradation[] = [];
  const daemonRemediation =
    'Confirm which process owns the port; rebuild with `npm run build:cli` and restart the supervised daemon (daemon install script).';

  let pidLockPid: number | null = null;
  if (pidLockHeld) {
    try {
      const parsed = Number.parseInt(readFileSync(pidLockPath, 'utf8').trim(), 10);
      pidLockPid = Number.isInteger(parsed) ? parsed : null;
    } catch {
      pidLockPid = null;
    }
  }

  let listeningPid: number | null = null;
  try {
    listeningPid = await portOwnerLookup(port);
  } catch {
    listeningPid = null;
  }

  let classification: ServingClassification = 'unknown';
  let executingPath: string | null = null;

  if (listeningPid === null) {
    degradations.push({
      scope: 'serving:port-owner',
      severity: 'soft',
      detail: `no process is listening on port ${port} (or the port-owner lookup is unavailable).`,
      remediation: daemonRemediation,
    });
  } else if (pidLockPid !== null && pidLockPid !== listeningPid) {
    // pid-lock ≠ observed listener: the classic B6 "which daemon" fault.
    degradations.push({
      scope: 'serving:pid-disagreement',
      severity: 'hard',
      detail: `daemon pid-lock pid ${pidLockPid} disagrees with the observed listening pid ${listeningPid}; not classifying on unverified evidence.`,
      remediation: daemonRemediation,
    });
  } else {
    const argv = await readPidArgv(listeningPid);
    if (argv === null || argv.length === 0) {
      degradations.push({
        scope: 'serving:argv',
        severity: 'soft',
        detail: `could not read argv for listening pid ${listeningPid} (vanished, empty, or unreadable); serving code unverified.`,
        remediation: daemonRemediation,
      });
    } else {
      const classified = classifyServingArgv(argv);
      classification = classified.classification;
      executingPath = classified.executingPath;
      if (classification === 'unknown') {
        degradations.push({
          scope: 'serving:classify',
          severity: 'soft',
          detail: `listening pid ${listeningPid} argv did not match packaged-dist or src-dev; serving code unknown.`,
          remediation: daemonRemediation,
        });
      }
    }
  }

  const { staleness, degradation: stalenessDegradation } = computeStaleness(
    classification,
    stalenessDirs,
  );
  if (stalenessDegradation !== null) degradations.push(stalenessDegradation);

  return {
    status: stationStatus(degradations),
    condition: servingCondition(degradations, staleness),
    port,
    listeningPid,
    pidLockPid,
    classification,
    executingPath,
    staleness,
    degradations,
  };
}

const STATION3_INTAKE_ENV_NOTE =
  'intake enabled/disabled is read from doctor\'s own ECHO_GRANOLA_INTAKE_ENABLED env, which may differ from the launchd daemon env that actually runs the loop — treat as doctor-env-only.';
const STATION3_TEAM_DECISIONS_NOTE =
  'derived:team-decisions count of 0 is expected today (informational, not a fault).';

function parseIntakeEnabledFlag(raw: string | undefined): boolean {
  if (raw === undefined || raw.trim() === '') return false;
  const value = raw.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

async function buildLoopStation3(
  storage: Storage | null,
  storageIssue: StorageIssue | null,
  dbPath: string,
  env: NodeJS.ProcessEnv,
): Promise<LoopStation3> {
  const degradations: LoopDegradation[] = [];
  const seedStores: LoopSeedStoreHealth[] = [];
  const notes = [STATION3_INTAKE_ENV_NOTE, STATION3_TEAM_DECISIONS_NOTE];

  const stateDir = ECHO_HOME_PATHS.state;
  let seedFiles: string[] = [];
  try {
    seedFiles = readdirSync(stateDir)
      .filter((name) => /^granola-intake-seeds.*\.json$/.test(name))
      .sort();
  } catch {
    seedFiles = [];
  }
  if (seedFiles.length === 0) {
    notes.push('no intake seed stores found yet (not yet run).');
  }
  for (const name of seedFiles) {
    const filePath = join(stateDir, name);
    try {
      const records = await new FileGranolaIntakeSeedStore(filePath).list();
      const counts: Record<GranolaIntakeSeedStatus, number> = {
        pending: 0,
        posting: 0,
        posted: 0,
        failed: 0,
      };
      for (const record of records) counts[record.status] += 1;
      seedStores.push({ path: filePath, state: 'counted', counts });
    } catch (err) {
      seedStores.push({ path: filePath, state: 'unreadable', counts: null });
      degradations.push({
        scope: 'station-3:seed-store',
        severity: 'hard',
        path: filePath,
        detail: `intake seed store unreadable/malformed: ${(err as Error).message}`,
        remediation: `Inspect ${filePath}; if corrupt, stop the daemon and remove it so the bridge rebuilds seed state.`,
      });
    }
  }

  let teamDecisionsCount: number | null = null;
  if (storage === null) {
    // team-decisions count is a preview; keep it soft (missing or error) — a
    // hard storage fault already surfaces at station-1.
    const detail =
      storageIssue?.kind === 'missing'
        ? 'derived:team-decisions count unavailable: atom db not created yet.'
        : `derived:team-decisions count unavailable: ${storageIssue?.message ?? 'storage unreadable'}`;
    degradations.push({
      scope: 'station-3:storage',
      severity: 'soft',
      path: dbPath,
      detail,
      remediation: 'Ensure the ECHO daemon is running and the atom db is readable, then re-run `echoctl doctor`.',
    });
  } else {
    try {
      teamDecisionsCount = (await queryExactHealth(storage, LOOP_TEAM_DECISION_SOURCE)).count;
    } catch (err) {
      degradations.push({
        scope: 'station-3:storage',
        severity: 'soft',
        path: dbPath,
        detail: `derived:team-decisions count query failed: ${(err as Error).message}`,
        remediation: 'Ensure the ECHO daemon is running and the atom db is readable, then re-run `echoctl doctor`.',
      });
    }
  }

  return {
    status: stationStatus(degradations),
    condition: station3Condition(degradations, seedStores),
    seedStores,
    intakeEnabled: parseIntakeEnabledFlag(env['ECHO_GRANOLA_INTAKE_ENABLED']),
    intakeEnabledNote: STATION3_INTAKE_ENV_NOTE,
    teamDecisionsCount,
    notes,
    degradations,
  };
}

function closeStorage(storage: Storage | null): void {
  if (storage !== null && 'close' in storage && typeof (storage as { close?: unknown }).close === 'function') {
    try {
      (storage as { close: () => void }).close();
    } catch {
      // best effort
    }
  }
}

export async function buildLoopReport(
  opts: DoctorOpts,
  ctx: { port: number; platform: NodeJS.Platform; pidLockPath: string; pidLockHeld: boolean },
): Promise<DoctorLoopReport> {
  const now = opts.now?.() ?? new Date();
  const dbPath = resolveDbPath({ platform: ctx.platform });
  const staleMs = opts.loopSignalsStaleMs ?? DEFAULT_LOOP_SIGNALS_STALE_MS;
  const stalenessDirs = opts.loopStalenessDirs ?? {
    src: join(repoRootFromModule(), 'src'),
    dist: join(repoRootFromModule(), 'dist'),
  };
  const portOwnerLookup = opts.portOwnerLookup ?? defaultPortOwnerLookup;
  const readPidArgv = opts.readPidArgv ?? defaultReadPidArgv;

  // Read-only contract (AC1/AC2): doctor never creates or migrates the atom db.
  // `SqliteStorage`'s constructor mkdirs + creates + migrates, so the DEFAULT
  // open is gated on the db file already existing — a missing db is a soft
  // not-yet-run state, never a silently-created empty store. An injected
  // `openStorage` (tests) is trusted as-is; a present-but-unreadable db is a
  // hard error.
  let storage: Storage | null = null;
  let storageIssue: StorageIssue | null = null;
  if (opts.openStorage !== undefined) {
    try {
      storage = opts.openStorage();
    } catch (err) {
      storageIssue = { kind: 'error', dbPath, message: (err as Error).message };
    }
  } else if (!existsSync(dbPath)) {
    storageIssue = { kind: 'missing', dbPath };
  } else {
    try {
      storage = new SqliteStorage(dbPath);
    } catch (err) {
      storageIssue = { kind: 'error', dbPath, message: (err as Error).message };
    }
  }

  try {
    const station1 = await buildLoopStation1(storage, storageIssue, dbPath, now);
    const station2 = await buildLoopStation2(storage, storageIssue, dbPath, now, staleMs);
    const serving = await buildLoopServing(
      ctx.port,
      ctx.pidLockPath,
      ctx.pidLockHeld,
      portOwnerLookup,
      readPidArgv,
      stalenessDirs,
    );
    const station3 = await buildLoopStation3(storage, storageIssue, dbPath, process.env);
    const status: LoopStatus =
      station1.status === 'degraded' ||
      station2.status === 'degraded' ||
      serving.status === 'degraded' ||
      station3.status === 'degraded'
        ? 'degraded'
        : 'ok';
    return { station1, station2, serving, station3, status };
  } finally {
    closeStorage(storage);
  }
}

export function computeOverall(report: DoctorReport): 'healthy' | 'degraded' | 'broken' {
  if (
    !report.echoHome.exists ||
    report.echoHome.schemaVersion === 'mismatch' ||
    report.echoHome.schemaVersion === 'missing'
  ) {
    return 'broken';
  }
  if (!report.daemon.pidLockHeld && !report.daemon.mcpReachable) return 'broken';
  if (report.daemon.pidLockHeld && !report.daemon.mcpReachable) return 'degraded';
  if (report.syncLock.present) return 'degraded';
  if (report.codexAdapter.status !== 'ok') return 'degraded';
  for (const agent of report.agents) {
    const outcome = agent.probeOutcome;
    if (agent.profile?.wired_at === null || outcome === null) continue;
    if (!outcome.probed && outcome.reason !== 'manual-only') return 'degraded';
  }
  // Loop rollup: only HARD loop faults downgrade a report that is otherwise
  // healthy (see the severity model on DoctorLoopReport). Soft loop states
  // (absent/never-run/empty/nothing-listening) are informational and never
  // reach here as a downgrade.
  if (loopHasHardFault(report.loop)) return 'degraded';
  return 'healthy';
}

export async function buildDoctorReport(opts: DoctorOpts = {}): Promise<DoctorReport> {
  if (opts.home !== undefined) setEchoHomeRoot(opts.home);
  const port = resolveDoctorPort(opts.port);
  const platform = opts.platform ?? process.platform;
  const dataDir = resolveDataDir({ platform });
  const pidLockPath =
    platform === 'win32' ? win32.join(dataDir, 'daemon.pid') : join(dataDir, 'daemon.pid');
  const pidLockHeld = existsSync(pidLockPath);
  const mcpReachable = await probeMcp(opts.fetch ?? fetch, port);
  const echoHomeExists = existsSync(ECHO_HOME_PATHS.root);
  const state = echoHomeExists
    ? stateVersion()
    : {
        onboardingValid: false,
        projectsValid: false,
        schemaVersion: 'missing' as const,
        profile: 'unknown' as const,
        onboarding: null,
      };

  const syncLockPath = join(ECHO_HOME_PATHS.state, 'adapter-sync.lock');
  const syncLock: DoctorReport['syncLock'] = { present: false, path: syncLockPath };
  if (existsSync(syncLockPath)) {
    const mtimeIso = (opts.now?.() ?? statSync(syncLockPath).mtime).toISOString();
    syncLock.present = true;
    syncLock.mtimeIso = mtimeIso;
    syncLock.cleanupCommand = `rm -- ${shellQuote(syncLockPath)}`;
  }

  const probe = opts.probeAgents ?? realProbeAgents;
  const codexAdapter = await (opts.codexAdapterCheck ?? checkCodexAdapter)();
  const onboarding = state.onboarding ?? readValidOnboarding();
  const agents: DoctorReport['agents'] = [];
  if (onboarding !== null) {
    for (const profile of onboarding.agents) {
      if (!isAgentKind(profile.id)) continue;
      const probeOutcome =
        profile.wired_at === null ? null : ((await probe([profile.id]))[0] ?? null);
      agents.push({ kind: profile.id, profile, probeOutcome });
    }
  }

  const loop = await buildLoopReport(opts, { port, platform, pidLockPath, pidLockHeld });

  const report: DoctorReport = {
    daemon: {
      running: mcpReachable,
      port,
      mcpReachable,
      pidLockPath,
      pidLockHeld,
    },
    echoHome: {
      root: ECHO_HOME_PATHS.root,
      exists: echoHomeExists,
      onboardingValid: state.onboardingValid,
      projectsValid: state.projectsValid,
      schemaVersion: state.schemaVersion,
      profile: state.profile,
    },
    syncLock,
    codexAdapter,
    agents,
    loop,
    overall: 'broken',
  };
  report.overall = computeOverall(report);
  return report;
}

export async function runDoctor(opts: DoctorOpts = {}): Promise<number> {
  const stderr = opts.stderr ?? process.stderr;
  let port: number;
  try {
    if (opts.home !== undefined) setEchoHomeRoot(opts.home);
    if (opts.label !== undefined) parseNonEmptyOption(opts.label, '--label');
    port = resolveDoctorPort(opts.port);
  } catch (err) {
    writeLine(stderr, (err as Error).message);
    return 2;
  }

  try {
    const report = await buildDoctorReport({ ...opts, home: undefined, port });
    if (!opts.quiet) {
      if (opts.json) writeLine(opts.stdout ?? process.stdout, JSON.stringify(report));
      else
        writeLine(
          opts.stdout ?? process.stdout,
          renderDoctorWithCodexAdapter(report, {
            color: opts.color ?? false,
            remediation: buildRemediationCopy(`http://127.0.0.1:${port}/mcp`),
          }),
        );
    }
    return report.overall === 'healthy' ? 0 : 1;
  } catch (err) {
    writeLine(stderr, (err as Error).message);
    return 1;
  }
}
