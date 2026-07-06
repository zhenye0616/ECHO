// Item 114 — drift sweep v0: the alarm clock (seam decisions 14-16, 20).
//
// Absence sends no notification (decision 14), so understanding-drift can only be
// caught by a CLOCK, never a push: a periodic sweep asks "what statements arrived
// since my last check, and do any contradict a recorded team decision?" The sweep
// keeps its place in line by APPEND order, not event date (decision 16), so a note
// ingested late (daemon down during the meeting → old timestamp, new sequence_id)
// is never skipped. Contradiction interrupts the decision owner behind an
// acknowledge/dismiss card (decision 20); a false alarm costs one click.
//
// Nothing here is persisted as a fact atom — a verdict is a CONCLUSION, recomputed
// fresh, living only in the checkpoint and the Slack card (seam decision 3/6). The
// only durable state is the append-order watermark + per-pair judge/delivery
// checkpoint, which exist for idempotency (judge/deliver at-most-once), not truth.

import { mkdirSync, readFileSync } from 'node:fs';
import { isAbsolute, dirname, join } from 'node:path';
import { atomicWrite } from '../echo-home/adapters/atomic-write.js';
import { ECHO_HOME_PATHS } from '../echo-home/paths.js';
import { createLogger } from '../logging/index.js';
import { parseJson } from '../util/json.js';
import {
  parseBrainName,
  preflightBrain,
  runBrain,
  type BrainName,
} from '../brain/brain.js';
import { getSignalWindow, type SignalWindowEntry } from '../trace/signal-window.js';
import { GRANOLA_SIGNAL_SOURCE, type GranolaSignalType } from './granola-signals.js';
import { normalizeSubject } from '../util/subject.js';
import type { CaptureEvent, Storage } from '../storage/interface.js';

// Packaging boundary (tests/packaging/import-closure.test.ts): this module ships
// in the npm-packed `dist/enrich/**` set (it is registered in the packed daemon's
// startEnrichmentDispatch), but the whole CEO-responder surface —
// `dist/surfaces/ceo-slack-responder/**`, home of `decision-store.ts` +
// `identity.ts` — is deliberately EXCLUDED from the pack. A packed file may not
// runtime-import an excluded one, so the drift worker cannot import
// `queryLatestTeamDecisions` or the identities helpers. Instead it reads the same
// `derived:team-decisions` atoms straight from storage and owns a minimal
// packed-safe identities parser + reverse lookup below. The atoms are the shared
// store, so join semantics are identical to `queryLatestTeamDecisions`.
const TEAM_DECISION_SOURCE = 'derived:team-decisions';

/** The decision fields the drift join + alert card need (subset of the surface's
 *  `TeamDecisionAtom`, read packed-safely from storage). */
export interface DriftDecisionRecord {
  atom_id: string;
  normalized_subject: string;
  subject: string;
  decision: string;
  rationale?: string;
  confirmed_at: string;
  confirmed_by: string;
  dedupe_key: string;
}

/** Owner identity shape (structural subset of the surface's `CofounderIdentity`). */
export interface DriftOwnerIdentity {
  id: string;
  slack_user_id: string;
}

const log = createLogger('enrich.decision-drift');

export const DRIFT_SWEEP_CHECKPOINT_SCHEMA_VERSION = 1;
export const DRIFT_JUDGE_VERSION = 'drift-judge@1';
// Single shared budget for AC3 (malformed-verdict) + AC4 (non-verbatim-quote)
// re-judge attempts at one judge version. Retryable infra errors are NOT counted.
export const DRIFT_JUDGE_MAX_ATTEMPTS = 3;
// Bounded retry budget for PROVEN Slack rejections only (a response was received
// indicating non-acceptance: HTTP 429 / other non-2xx, or a received `ok:false`).
// Mirrors the seed store's 5-attempt retry (granola-intake-seed-store.ts:52-60).
// `retry_count` counts FAILED proven-rejection attempts so far; the pair
// terminalizes on the attempt that increments it to this value — exactly this many
// visible post attempts, with no extra deferred attempt afterward (item 119 AC2).
// Unknown-outcome throws (timeout / reset / DNS) are NOT retried (at-most-once).
export const DRIFT_DELIVERY_MAX_RETRIES = 5;
export const DEFAULT_DRIFT_MAX_ALERTS_PER_TICK = 3;
export const DEFAULT_DRIFT_SWEEP_WORKER_INTERVAL_MS = 300_000;
export const DEFAULT_DRIFT_JUDGE_BRAIN_TIMEOUT_MS = 180_000;

const SIGNAL_STATEMENT_TYPES: ReadonlySet<GranolaSignalType> = new Set([
  'decision',
  'rationale',
  'action',
]);

// ---------------------------------------------------------------------------
// Verdict + judge contract
// ---------------------------------------------------------------------------

export interface DriftVerdict {
  contradicts: boolean;
  quote: string;
  reason: string;
}

export interface DriftJudgeInput {
  decision: {
    subject: string;
    decision: string;
    rationale?: string;
    confirmed_at: string;
    confirmed_by: string;
  };
  statement: {
    signal_type: GranolaSignalType;
    text: string;
    meeting_title: string;
    note_id: string;
  };
  judge_version: string;
}

export type DriftJudge = (input: DriftJudgeInput) => Promise<DriftVerdict>;

/** Thrown when the brain returned but its output was not a well-formed verdict.
 *  Terminal-eligible: counts against DRIFT_JUDGE_MAX_ATTEMPTS (AC3). */
export class DriftJudgeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriftJudgeParseError';
  }
}

/** Thrown for a brain infrastructure failure (process/network/timeout). NOT
 *  terminal and NOT counted against the budget — a transient outage must never
 *  become permanent silent suppression of a contradiction (AC3). */
export class DriftJudgeInfraError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriftJudgeInfraError';
  }
}

// ---------------------------------------------------------------------------
// Alert payload + delivery contract
// ---------------------------------------------------------------------------

export interface DriftAlertPayload {
  pair_key: string;
  decision_dedupe_key: string;
  statement_dedupe_key: string;
  judge_version: string;
  owner_cofounder_id: string;
  owner_slack_user_id: string;
  decision_subject: string;
  decision_text: string;
  confirmed_at: string;
  confirmed_by: string;
  quote: string;
  reason: string;
  meeting_title: string;
  note_id: string;
  meeting_url?: string;
}

/** Posts one drift alert card. Default implementation is the daemon-side Slack
 *  post path (postGranolaIntakeSeed pattern) — no Socket Mode. Injectable for
 *  tests. Throws on delivery failure. */
export type DriftAlertPoster = (payload: DriftAlertPayload) => Promise<void>;

/** Thrown when the Slack post received an HTTP *response* that indicates
 *  non-acceptance (a non-2xx status such as 429, or a received `body.ok !== true`).
 *  This is a PROVEN rejection — a response actually arrived, so Slack provably did
 *  NOT deliver — and is therefore safe to retry via the non-terminal
 *  `delivery-deferred` state, bounded by {@link DRIFT_DELIVERY_MAX_RETRIES} (AC1).
 *  Mirrors AC3's DriftJudgeParseError/DriftJudgeInfraError terminal-vs-retryable
 *  split. Any OTHER throw from the poster (network timeout, post-send connection
 *  reset, DNS/socket error, any untyped error) is an UNKNOWN outcome — Slack may
 *  have accepted the card — and must NOT become this type: it stays at-most-once
 *  terminal with zero retries. */
export class DriftDeliveryRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriftDeliveryRejectedError';
  }
}

// ---------------------------------------------------------------------------
// Checkpoint
// ---------------------------------------------------------------------------

/** Total terminal + non-terminal per-pair states. The AC1 watermark advances
 *  only past pairs in a TERMINAL state; `delivery-deferred` and `delivery-intent`
 *  are non-terminal and hold the watermark behind their statement. */
export type DriftPairState =
  | 'judged-no-contradiction' // terminal: valid verdict, contradicts:false
  | 'terminal-judge-failed' // terminal: malformed/non-verbatim after MAX attempts
  | 'delivered' // terminal: judged-and-delivered
  | 'delivery-failed' // terminal: post failed OR ambiguous crash around post
  | 'delivery-deferred' // NON-terminal: over the per-tick cap; drains later
  | 'delivery-intent'; // NON-terminal: intent written, outcome not yet recorded

export interface DriftPairCheckpoint {
  decision_dedupe_key: string;
  statement_dedupe_key: string;
  judge_version: string;
  state: DriftPairState;
  updated_at: string;
  failure_reason?: string;
  /** Number of FAILED proven-rejection post attempts so far (item 119 AC2).
   *  Additive OPTIONAL field: {@link DRIFT_SWEEP_CHECKPOINT_SCHEMA_VERSION} stays
   *  1 because this is backward-compatible — an old checkpoint written before this
   *  field parses unchanged (loadDriftSweepCheckpoint casts pair values loosely)
   *  and a pair with no `retry_count` is treated as 0. Increments ONLY on an
   *  observed proven-rejection attempt in deliverPair; a cap-overflow deferral
   *  (AC6) and an unknown-outcome failure never touch it. */
  retry_count?: number;
  /** Present for `delivery-deferred` / `delivery-intent`: the verdict payload so a
   *  later tick can DELIVER without re-judging (judge at-most-once, AC3). */
  pending_alert?: DriftAlertPayload;
}

export interface DriftSweepCheckpoint {
  schema_version: typeof DRIFT_SWEEP_CHECKPOINT_SCHEMA_VERSION;
  /** Next append-order scan boundary (`getSignalWindow({cursor:{sinceSeq}})`). */
  watermark: number;
  pairs: Record<string, DriftPairCheckpoint>;
}

const TERMINAL_STATES: ReadonlySet<DriftPairState> = new Set<DriftPairState>([
  'judged-no-contradiction',
  'terminal-judge-failed',
  'delivered',
  'delivery-failed',
]);

function isTerminal(state: DriftPairState): boolean {
  return TERMINAL_STATES.has(state);
}

class DriftSweepCheckpointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriftSweepCheckpointError';
  }
}

export function driftSweepCheckpointPath(): string {
  return join(ECHO_HOME_PATHS.state, 'drift-sweep-checkpoint.json');
}

function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function emptyCheckpoint(): DriftSweepCheckpoint {
  return { schema_version: DRIFT_SWEEP_CHECKPOINT_SCHEMA_VERSION, watermark: 1, pairs: {} };
}

export function loadDriftSweepCheckpoint(
  filePath = driftSweepCheckpointPath(),
): DriftSweepCheckpoint {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (err) {
    if (isErrnoException(err) && err.code === 'ENOENT') return emptyCheckpoint();
    throw new DriftSweepCheckpointError(`checkpoint read failed: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = parseJson(raw);
  } catch (err) {
    throw new DriftSweepCheckpointError(`checkpoint JSON invalid: ${(err as Error).message}`);
  }
  if (
    !isPlainObject(parsed) ||
    parsed['schema_version'] !== DRIFT_SWEEP_CHECKPOINT_SCHEMA_VERSION ||
    typeof parsed['watermark'] !== 'number' ||
    !Number.isFinite(parsed['watermark']) ||
    !isPlainObject(parsed['pairs'])
  ) {
    throw new DriftSweepCheckpointError('checkpoint schema invalid');
  }
  const pairs: Record<string, DriftPairCheckpoint> = {};
  for (const [pairKey, value] of Object.entries(parsed['pairs'])) {
    if (!isPlainObject(value)) {
      throw new DriftSweepCheckpointError(`checkpoint pair ${pairKey} invalid`);
    }
    // Loose cast (backward-compatible, AC4): pair values are not field-validated,
    // so a checkpoint written before the additive optional `retry_count` field
    // parses unchanged — such a pair reads `retry_count` as undefined, treated as 0
    // everywhere it is consumed. Schema version stays 1 for the same reason.
    pairs[pairKey] = value as unknown as DriftPairCheckpoint;
  }
  return {
    schema_version: DRIFT_SWEEP_CHECKPOINT_SCHEMA_VERSION,
    watermark: parsed['watermark'],
    pairs,
  };
}

export function writeDriftSweepCheckpoint(
  checkpoint: DriftSweepCheckpoint,
  filePath = driftSweepCheckpointPath(),
): void {
  mkdirSync(dirname(filePath), { recursive: true });
  atomicWrite({ filePath, content: `${JSON.stringify(checkpoint, null, 2)}\n` });
}

// ---------------------------------------------------------------------------
// Config (AC6 fail-closed)
// ---------------------------------------------------------------------------

export interface DriftSweepConfig {
  enabled: boolean;
  botToken: string;
  identities: DriftOwnerIdentity[];
  maxAlertsPerTick: number;
}

/** Packed-safe parse of `ECHO_TEAM_COFUNDER_IDENTITIES` (mirror of the surface's
 *  `parseCofounderIdentities`, kept here because that module is not packed). */
export function parseDriftOwnerIdentities(raw: string | undefined): DriftOwnerIdentity[] {
  if (raw === undefined || raw.trim() === '') return [];
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error('ECHO_TEAM_COFUNDER_IDENTITIES must be a JSON array');
  return parsed.map((value) => {
    if (!isPlainObject(value)) throw new Error('cofounder identity must be an object');
    const id = value['id'];
    const slackUserId = value['slack_user_id'];
    if (typeof id !== 'string' || id.trim() === '') {
      throw new Error('cofounder identity id is required');
    }
    if (typeof slackUserId !== 'string' || slackUserId.trim() === '') {
      throw new Error('cofounder identity slack_user_id is required');
    }
    return { id: id.trim(), slack_user_id: slackUserId.trim() };
  });
}

/** AC5 reverse lookup: decision owner-of-record (`confirmed_by` cofounder id) →
 *  Slack user id. `null` when blank or absent from the identities config. */
export function cofounderIdToSlackUserId(
  identities: readonly DriftOwnerIdentity[],
  cofounderId: string,
): string | null {
  const id = cofounderId.trim();
  if (id === '') return null;
  return identities.find((identity) => identity.id === id)?.slack_user_id ?? null;
}

export class DriftSweepConfigError extends Error {
  constructor(
    message: string,
    public readonly missing: string[],
  ) {
    super(message);
    this.name = 'DriftSweepConfigError';
  }
}

function parseBooleanFlag(raw: string | undefined): boolean {
  if (raw === undefined || raw.trim() === '') return false;
  const value = raw.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Load sweep config. Fail-closed (AC6): OFF by default behind
 * `ECHO_DRIFT_SWEEP_ENABLED`. When enabled but the Slack bot token is missing OR
 * no cofounder identities are configured (owner map unresolvable), throw a
 * structured {@link DriftSweepConfigError} so the worker returns a DISABLED
 * handle instead of ever crashing the daemon.
 */
export function loadDriftSweepConfig(env: NodeJS.ProcessEnv = process.env): DriftSweepConfig {
  const enabled = parseBooleanFlag(env['ECHO_DRIFT_SWEEP_ENABLED']);
  const botToken = (env['ECHO_SLACK_BOT_TOKEN'] ?? env['SLACK_BOT_TOKEN'] ?? '').trim();
  const identities = parseDriftOwnerIdentities(env['ECHO_TEAM_COFUNDER_IDENTITIES']);
  const maxAlertsPerTick = parsePositiveInt(
    env['ECHO_DRIFT_SWEEP_MAX_ALERTS_PER_TICK'],
    DEFAULT_DRIFT_MAX_ALERTS_PER_TICK,
  );

  if (enabled) {
    const missing: string[] = [];
    if (botToken === '') missing.push('ECHO_SLACK_BOT_TOKEN');
    if (identities.length === 0) missing.push('ECHO_TEAM_COFUNDER_IDENTITIES');
    if (missing.length > 0) {
      throw new DriftSweepConfigError(
        `drift sweep is enabled but missing required config: ${missing.join(', ')}`,
        missing,
      );
    }
  }
  return { enabled, botToken, identities, maxAlertsPerTick };
}

// ---------------------------------------------------------------------------
// Statement extraction + join
// ---------------------------------------------------------------------------

interface DriftStatement {
  sequence_id: number;
  statement_dedupe_key: string;
  canonical_subject: string;
  signal_type: GranolaSignalType;
  content: string;
  meeting_title: string;
  note_id: string;
  meeting_url?: string;
}

function metaString(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function eventToDecisionRecord(event: CaptureEvent): DriftDecisionRecord | null {
  if (event.source !== TEAM_DECISION_SOURCE) return null;
  const md = event.metadata;
  const subject = metaString(md, 'subject');
  const decision = metaString(md, 'decision') ?? event.content;
  const confirmedBy = metaString(md, 'confirmed_by');
  const draftId = metaString(md, 'draft_id');
  if (subject === undefined || decision.trim() === '' || confirmedBy === undefined || draftId === undefined) {
    return null;
  }
  const normalizedSubject = metaString(md, 'normalized_subject') ?? normalizeSubject(subject);
  const dedupeKey = metaString(md, 'dedupe_key') ?? `team-decision:${normalizedSubject}`;
  const rationale = metaString(md, 'rationale');
  return {
    atom_id: event.id,
    normalized_subject: normalizedSubject,
    subject,
    decision,
    ...(rationale !== undefined ? { rationale } : {}),
    confirmed_at: metaString(md, 'confirmed_at') ?? event.timestamp,
    confirmed_by: confirmedBy,
    dedupe_key: dedupeKey,
  };
}

function compareDecisionRecency(a: DriftDecisionRecord, b: DriftDecisionRecord): number {
  const delta = Date.parse(a.confirmed_at) - Date.parse(b.confirmed_at);
  if (delta !== 0) return delta;
  return a.atom_id.localeCompare(b.atom_id);
}

/**
 * Packed-safe mirror of the surface's `queryLatestTeamDecisions` (AC2's named
 * decision side of the join): latest confirmed decision per `dedupe_key`. Reads
 * the SAME `derived:team-decisions` atoms, so the join is byte-identical to what
 * the CEO responder would compute — this only avoids the excluded import.
 */
async function readLatestDecisions(storage: Storage): Promise<DriftDecisionRecord[]> {
  const events = await storage.query({ source: TEAM_DECISION_SOURCE, order: 'asc' });
  const latest = new Map<string, DriftDecisionRecord>();
  for (const event of events) {
    const record = eventToDecisionRecord(event);
    if (record === null) continue;
    const current = latest.get(record.dedupe_key);
    if (current === undefined || compareDecisionRecency(record, current) > 0) {
      latest.set(record.dedupe_key, record);
    }
  }
  return [...latest.values()];
}

/** A window entry is an eligible drift STATEMENT iff it is a granola signal atom
 *  of a statement type carrying a subject + dedupe key. All other company-scope
 *  atoms (team decisions, raw granola) are never blocking (AC1 terminal-total). */
function toStatement(entry: SignalWindowEntry): DriftStatement | null {
  if (entry.source !== GRANOLA_SIGNAL_SOURCE) return null;
  const signalType = metaString(entry.metadata, 'signal_type');
  if (signalType === undefined || !SIGNAL_STATEMENT_TYPES.has(signalType as GranolaSignalType)) {
    return null;
  }
  const canonicalSubject = metaString(entry.metadata, 'canonical_subject');
  const statementDedupeKey = metaString(entry.metadata, 'dedupe_key');
  if (canonicalSubject === undefined || statementDedupeKey === undefined) return null;
  const meetingUrl = metaString(entry.metadata, 'meeting_url') ?? metaString(entry.metadata, 'web_url');
  return {
    sequence_id: entry.sequence_id,
    statement_dedupe_key: statementDedupeKey,
    canonical_subject: canonicalSubject,
    signal_type: signalType as GranolaSignalType,
    content: entry.content,
    meeting_title: metaString(entry.metadata, 'meeting_title') ?? 'Untitled meeting',
    note_id: metaString(entry.metadata, 'note_id') ?? 'unknown-note',
    ...(meetingUrl !== undefined ? { meeting_url: meetingUrl } : {}),
  };
}

export function driftPairKey(
  decisionDedupeKey: string,
  statementDedupeKey: string,
  judgeVersion: string,
): string {
  return `${decisionDedupeKey}::${statementDedupeKey}::${judgeVersion}`;
}

/** AC4 — the verbatim-quote check is CODE, not a prompt instruction. */
export function quoteAppearsVerbatim(statementContent: string, quote: string): boolean {
  const q = quote.trim();
  if (q === '') return false;
  return statementContent.includes(q);
}

// ---------------------------------------------------------------------------
// Per-pair judge loop (AC3 + AC4 shared budget)
// ---------------------------------------------------------------------------

type JudgeResolution =
  | { kind: 'retryable'; reason: string }
  | { kind: 'no-contradiction' }
  | { kind: 'terminal-failed'; reason: string }
  | { kind: 'contradiction'; verdict: DriftVerdict };

async function judgePair(
  judge: DriftJudge,
  input: DriftJudgeInput,
  statementContent: string,
  maxAttempts: number,
  onBrainInvocation: () => void,
): Promise<JudgeResolution> {
  let attempts = 0;
  let lastReason = 'exhausted judge attempts';
  while (attempts < maxAttempts) {
    let verdict: DriftVerdict;
    try {
      onBrainInvocation();
      verdict = await judge(input);
    } catch (err) {
      if (err instanceof DriftJudgeParseError) {
        attempts += 1;
        lastReason = `malformed verdict: ${err.message}`;
        log.warn('drift_judge_malformed', {
          judge_version: input.judge_version,
          attempt: attempts,
          message: err.message,
        });
        continue;
      }
      // Infra / any non-parse error: retryable, NOT counted, leave unjudged.
      return { kind: 'retryable', reason: err instanceof Error ? err.message : String(err) };
    }

    if (!verdict.contradicts) return { kind: 'no-contradiction' };

    if (!quoteAppearsVerbatim(statementContent, verdict.quote)) {
      attempts += 1;
      lastReason = 'verdict quote not verbatim in statement';
      log.warn('drift_verdict_rejected', {
        judge_version: input.judge_version,
        attempt: attempts,
      });
      continue;
    }
    return { kind: 'contradiction', verdict };
  }
  return { kind: 'terminal-failed', reason: lastReason };
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export interface DriftSweepWorkerOptions {
  checkpointPath?: string;
  judge?: DriftJudge;
  post?: DriftAlertPoster;
  identities?: readonly DriftOwnerIdentity[];
  botToken?: string;
  maxAlertsPerTick?: number;
  judgeVersion?: string;
  now?: () => string;
  workerIntervalMs?: number;
  runOnStart?: boolean;
  /** Chaining hook (AC1): awaited before each pass so the sweep reads freshly
   *  extracted signal atoms. Wired to the granola signal worker in dispatch. */
  runSignalsFirst?: () => Promise<unknown>;
  env?: NodeJS.ProcessEnv;
}

export type DriftSweepResult =
  | {
      status: 'ok';
      window_size: number;
      statements_seen: number;
      brain_invocations: number;
      contradictions: number;
      delivered: number;
      deferred: number;
      delivery_failed: number;
      judge_failed: number;
      watermark: number;
    }
  | { status: 'skipped'; reason: 'in_flight' | 'disabled' }
  | { status: 'error'; reason: string; message: string };

export interface DriftSweepWorkerHandle {
  enabled: boolean;
  configError?: DriftSweepConfigError;
  run: () => Promise<DriftSweepResult>;
  stop: () => Promise<void>;
}

export interface DriftSweepRuntime {
  judge: DriftJudge;
  post: DriftAlertPoster;
  identities: readonly DriftOwnerIdentity[];
  checkpointPath: string;
  maxAlertsPerTick: number;
  judgeVersion: string;
  now: () => string;
}

export async function runDriftSweepOnce(
  storage: Storage,
  runtime: DriftSweepRuntime,
): Promise<DriftSweepResult> {
  let checkpoint: DriftSweepCheckpoint;
  try {
    checkpoint = loadDriftSweepCheckpoint(runtime.checkpointPath);
  } catch (err) {
    log.error('checkpoint_read_failed', { message: (err as Error).message });
    return { status: 'error', reason: 'checkpoint_failed', message: (err as Error).message };
  }

  let window: SignalWindowEntry[];
  let decisions: DriftDecisionRecord[];
  try {
    window = await getSignalWindow(storage, {
      cursor: { sinceSeq: checkpoint.watermark },
      scope: 'company',
    });
    decisions = await readLatestDecisions(storage);
  } catch (err) {
    log.error('sweep_read_failed', { message: (err as Error).message });
    return { status: 'error', reason: 'read_failed', message: (err as Error).message };
  }

  const decisionBySubject = new Map<string, DriftDecisionRecord>();
  for (const decision of decisions) decisionBySubject.set(decision.normalized_subject, decision);

  const persist = (): void => writeDriftSweepCheckpoint(checkpoint, runtime.checkpointPath);

  let brainInvocations = 0;
  let contradictions = 0;
  let delivered = 0;
  let deferred = 0;
  let deliveryFailed = 0;
  let judgeFailed = 0;
  let deliveredThisTick = 0;
  // sequence_ids of statements whose pairs are NOT all terminal after this tick.
  const blockingSeqs: number[] = [];
  let maxSeq = 0;

  for (const entry of window) {
    if (entry.sequence_id > maxSeq) maxSeq = entry.sequence_id;
    const statement = toStatement(entry);
    if (statement === null) continue; // non-statement atoms never block (AC1)

    const decision = decisionBySubject.get(statement.canonical_subject);
    if (decision === undefined) continue; // AC2 no-match: skipped silently, terminal

    const pairKey = driftPairKey(
      decision.dedupe_key,
      statement.statement_dedupe_key,
      runtime.judgeVersion,
    );
    const existing = checkpoint.pairs[pairKey];

    // Already-terminal pair: nothing to do, does not block.
    if (existing !== undefined && isTerminal(existing.state)) continue;

    // Recovery (AC5): intent written but outcome never recorded (crash mid-post)
    // → promote to delivery-failed WITHOUT calling Slack again. Now terminal.
    if (existing !== undefined && existing.state === 'delivery-intent') {
      existing.state = 'delivery-failed';
      existing.failure_reason = 'ambiguous crash around post boundary';
      existing.updated_at = runtime.now();
      delete existing.pending_alert;
      persist();
      deliveryFailed += 1;
      log.error('drift_delivery_failed', {
        pair_key: pairKey,
        judge_version: runtime.judgeVersion,
        reason: 'ambiguous_crash_recovered',
      });
      continue;
    }

    // Deferred pair from a prior tick (AC6 overflow drain): already judged, just
    // needs delivery. Re-use its stored payload — never re-judge (AC3).
    if (existing !== undefined && existing.state === 'delivery-deferred') {
      const payload = existing.pending_alert;
      if (payload === undefined) {
        // Defensive: a deferred pair with no payload cannot be delivered; make it
        // terminal so it can never stall the watermark.
        existing.state = 'delivery-failed';
        existing.failure_reason = 'deferred pair missing payload';
        existing.updated_at = runtime.now();
        persist();
        deliveryFailed += 1;
        continue;
      }
      if (deliveredThisTick >= runtime.maxAlertsPerTick) {
        blockingSeqs.push(statement.sequence_id); // still capped this tick
        continue;
      }
      const outcome = await deliverPair(runtime, checkpoint, pairKey, existing, payload, persist);
      if (outcome === 'delivered') {
        deliveredThisTick += 1;
        delivered += 1;
      } else if (outcome === 'delivery-deferred') {
        // Proven-rejection retry (AC1): still non-terminal → holds the watermark.
        deferred += 1;
        blockingSeqs.push(statement.sequence_id);
      } else {
        deliveryFailed += 1;
      }
      continue;
    }

    // No checkpoint yet → judge this pair (AC3/AC4).
    const resolution = await judgePair(
      runtime.judge,
      {
        decision: {
          subject: decision.subject,
          decision: decision.decision,
          ...(decision.rationale !== undefined ? { rationale: decision.rationale } : {}),
          confirmed_at: decision.confirmed_at,
          confirmed_by: decision.confirmed_by,
        },
        statement: {
          signal_type: statement.signal_type,
          text: statement.content,
          meeting_title: statement.meeting_title,
          note_id: statement.note_id,
        },
        judge_version: runtime.judgeVersion,
      },
      statement.content,
      DRIFT_JUDGE_MAX_ATTEMPTS,
      () => {
        brainInvocations += 1;
      },
    );

    if (resolution.kind === 'retryable') {
      // Non-terminal: leave unjudged, no checkpoint entry, block the watermark so
      // a transient outage is retried next tick (AC3).
      blockingSeqs.push(statement.sequence_id);
      log.warn('drift_judge_retryable', {
        pair_key: pairKey,
        judge_version: runtime.judgeVersion,
        reason: resolution.reason,
      });
      continue;
    }

    if (resolution.kind === 'no-contradiction') {
      checkpoint.pairs[pairKey] = {
        decision_dedupe_key: decision.dedupe_key,
        statement_dedupe_key: statement.statement_dedupe_key,
        judge_version: runtime.judgeVersion,
        state: 'judged-no-contradiction',
        updated_at: runtime.now(),
      };
      persist(); // AC3: checkpoint written atomically as last step of judging
      continue;
    }

    if (resolution.kind === 'terminal-failed') {
      checkpoint.pairs[pairKey] = {
        decision_dedupe_key: decision.dedupe_key,
        statement_dedupe_key: statement.statement_dedupe_key,
        judge_version: runtime.judgeVersion,
        state: 'terminal-judge-failed',
        updated_at: runtime.now(),
        failure_reason: resolution.reason,
      };
      persist();
      judgeFailed += 1;
      // Durable operator-visible evidence (AC3): pair keys, judge version, reason.
      log.error('drift_judge_failed', {
        pair_key: pairKey,
        decision_dedupe_key: decision.dedupe_key,
        statement_dedupe_key: statement.statement_dedupe_key,
        judge_version: runtime.judgeVersion,
        reason: resolution.reason,
        attempts: DRIFT_JUDGE_MAX_ATTEMPTS,
      });
      continue;
    }

    // Surviving contradiction (AC5).
    contradictions += 1;
    const ownerSlack = cofounderIdToSlackUserId(runtime.identities, decision.confirmed_by);
    if (ownerSlack === null) {
      // Per-decision unresolved owner: terminal delivery-failed, operator-visible.
      // (A globally-empty owner map is caught at config load; this is one decision
      // whose confirmed_by is absent from the map.)
      checkpoint.pairs[pairKey] = {
        decision_dedupe_key: decision.dedupe_key,
        statement_dedupe_key: statement.statement_dedupe_key,
        judge_version: runtime.judgeVersion,
        state: 'delivery-failed',
        updated_at: runtime.now(),
        failure_reason: `owner unresolved for confirmed_by=${decision.confirmed_by}`,
      };
      persist();
      deliveryFailed += 1;
      log.error('drift_delivery_failed', {
        pair_key: pairKey,
        judge_version: runtime.judgeVersion,
        reason: 'owner_unresolved',
        confirmed_by: decision.confirmed_by,
      });
      continue;
    }

    const payload: DriftAlertPayload = {
      pair_key: pairKey,
      decision_dedupe_key: decision.dedupe_key,
      statement_dedupe_key: statement.statement_dedupe_key,
      judge_version: runtime.judgeVersion,
      owner_cofounder_id: decision.confirmed_by,
      owner_slack_user_id: ownerSlack,
      decision_subject: decision.subject,
      decision_text: decision.decision,
      confirmed_at: decision.confirmed_at,
      confirmed_by: decision.confirmed_by,
      quote: resolution.verdict.quote.trim(),
      reason: resolution.verdict.reason,
      meeting_title: statement.meeting_title,
      note_id: statement.note_id,
      ...(statement.meeting_url !== undefined ? { meeting_url: statement.meeting_url } : {}),
    };

    // AC6 blast-radius cap: over-cap contradictions defer (non-terminal), never
    // dropped. Persist the payload so the drain delivers later without re-judging.
    if (deliveredThisTick >= runtime.maxAlertsPerTick) {
      checkpoint.pairs[pairKey] = {
        decision_dedupe_key: decision.dedupe_key,
        statement_dedupe_key: statement.statement_dedupe_key,
        judge_version: runtime.judgeVersion,
        state: 'delivery-deferred',
        updated_at: runtime.now(),
        pending_alert: payload,
      };
      persist();
      deferred += 1;
      blockingSeqs.push(statement.sequence_id); // non-terminal → holds watermark
      log.warn('drift_alert_deferred', {
        pair_key: pairKey,
        judge_version: runtime.judgeVersion,
      });
      continue;
    }

    const record: DriftPairCheckpoint = {
      decision_dedupe_key: decision.dedupe_key,
      statement_dedupe_key: statement.statement_dedupe_key,
      judge_version: runtime.judgeVersion,
      state: 'delivery-intent',
      updated_at: runtime.now(),
      pending_alert: payload,
    };
    checkpoint.pairs[pairKey] = record;
    const outcome = await deliverPair(runtime, checkpoint, pairKey, record, payload, persist);
    if (outcome === 'delivered') {
      deliveredThisTick += 1;
      delivered += 1;
    } else if (outcome === 'delivery-deferred') {
      // Proven-rejection retry (AC1): still non-terminal → holds the watermark.
      deferred += 1;
      blockingSeqs.push(statement.sequence_id);
    } else {
      deliveryFailed += 1;
    }
  }

  // AC1 watermark advance: only past the point where every eligible statement is
  // terminal. If any statement blocks (retryable/deferred/intent-recovered-late),
  // hold at the earliest blocker; else advance past the whole window.
  if (window.length > 0) {
    checkpoint.watermark = blockingSeqs.length > 0 ? Math.min(...blockingSeqs) : maxSeq + 1;
  }
  persist();

  log.info('drift_sweep_ok', {
    window_size: window.length,
    brain_invocations: brainInvocations,
    contradictions,
    delivered,
    deferred,
    delivery_failed: deliveryFailed,
    judge_failed: judgeFailed,
    watermark: checkpoint.watermark,
  });

  return {
    status: 'ok',
    window_size: window.length,
    statements_seen: window.filter((e) => toStatement(e) !== null).length,
    brain_invocations: brainInvocations,
    contradictions,
    delivered,
    deferred,
    delivery_failed: deliveryFailed,
    judge_failed: judgeFailed,
    watermark: checkpoint.watermark,
  };
}

/**
 * Delivery with a classified failure split (item 119 AC1): the `delivery-intent`
 * record is persisted HERE, unconditionally, before the post — the caller only
 * mutates memory. Post; on success record `delivered` (terminal). On failure,
 * classify:
 *  - a {@link DriftDeliveryRejectedError} is a PROVEN rejection (a Slack response
 *    was received indicating non-acceptance — 429 / `ok:false`) → safe to retry:
 *    increment `retry_count` and return to the NON-terminal `delivery-deferred`
 *    state (keeping `pending_alert`), so the existing drain re-attempts next tick,
 *    bounded by {@link DRIFT_DELIVERY_MAX_RETRIES}. The pair terminalizes to
 *    `delivery-failed` exactly on the attempt that reaches the budget (AC2).
 *  - any OTHER throw is an UNKNOWN outcome (network timeout, post-send reset,
 *    DNS/socket error, any untyped error — Slack MAY have accepted the card) →
 *    straight to terminal `delivery-failed` with ZERO retries, at-most-once like
 *    the ambiguous-crash recovery path, because re-posting could double-alert.
 * A crash between the intent write and the post outcome leaves a durable
 * `delivery-intent`, recovered to `delivery-failed` next tick with no second post.
 */
async function deliverPair(
  runtime: DriftSweepRuntime,
  checkpoint: DriftSweepCheckpoint,
  pairKey: string,
  record: DriftPairCheckpoint,
  payload: DriftAlertPayload,
  persist: () => void,
): Promise<'delivered' | 'delivery-failed' | 'delivery-deferred'> {
  // Ensure the intent is durable before the post. Unconditional: on the
  // first-delivery path the caller has only mutated the in-memory map, so a
  // state-equality guard here would skip the write and a crash mid-post would
  // re-judge + re-post next tick (reviewer-proven at-most-once violation).
  record.state = 'delivery-intent';
  record.pending_alert = payload;
  record.updated_at = runtime.now();
  persist();
  try {
    await runtime.post(payload);
  } catch (err) {
    if (err instanceof DriftDeliveryRejectedError) {
      // PROVEN rejection: a response was received, so Slack provably did not
      // deliver — retrying is safe. Count this failed attempt; terminalize only
      // when it reaches the budget (AC2 — exactly MAX visible attempts, no extra
      // deferral afterward), otherwise defer (non-terminal) for the next tick.
      const retryCount = (record.retry_count ?? 0) + 1;
      record.retry_count = retryCount;
      record.failure_reason = err.message;
      record.updated_at = runtime.now();
      if (retryCount >= DRIFT_DELIVERY_MAX_RETRIES) {
        record.state = 'delivery-failed';
        delete record.pending_alert;
        checkpoint.pairs[pairKey] = record;
        persist();
        log.error('drift_delivery_failed', {
          pair_key: pairKey,
          judge_version: record.judge_version,
          reason: record.failure_reason,
          retry_count: retryCount,
        });
        return 'delivery-failed';
      }
      // Keep `pending_alert` so the drain re-delivers without re-judging (AC3).
      record.state = 'delivery-deferred';
      checkpoint.pairs[pairKey] = record;
      persist();
      log.warn('drift_delivery_retry', {
        pair_key: pairKey,
        judge_version: record.judge_version,
        reason: record.failure_reason,
        retry_count: retryCount,
      });
      return 'delivery-deferred';
    }
    // Unknown outcome: Slack may have accepted the card. At-most-once — terminal
    // with zero retries; record evidence so unattended network loss is visible.
    record.state = 'delivery-failed';
    record.failure_reason = err instanceof Error ? err.message : String(err);
    record.updated_at = runtime.now();
    delete record.pending_alert;
    checkpoint.pairs[pairKey] = record;
    persist();
    log.error('drift_delivery_failed', {
      pair_key: pairKey,
      judge_version: record.judge_version,
      reason: record.failure_reason,
      retry_count: record.retry_count ?? 0,
    });
    return 'delivery-failed';
  }
  record.state = 'delivered';
  record.updated_at = runtime.now();
  delete record.pending_alert;
  checkpoint.pairs[pairKey] = record;
  persist();
  log.info('drift_alert_delivered', {
    pair_key: pairKey,
    judge_version: record.judge_version,
    owner: payload.owner_slack_user_id,
  });
  return 'delivered';
}

// ---------------------------------------------------------------------------
// Default brain judge + Slack poster
// ---------------------------------------------------------------------------

interface DriftBrainConfig {
  brain: BrainName;
  contextRepoPath: string;
  timeoutMs: number;
  env: NodeJS.ProcessEnv;
}

function resolveDriftBrainConfig(env: NodeJS.ProcessEnv): DriftBrainConfig {
  const brain = parseBrainName(env['ECHO_DRIFT_SWEEP_BRAIN'] ?? env['ECHO_CEO_BRAIN']);
  const contextRepoPath =
    env['ECHO_DRIFT_SWEEP_CONTEXT_REPO_PATH'] ??
    env['ECHO_CEO_CONTEXT_REPO_PATH'] ??
    process.cwd();
  if (!isAbsolute(contextRepoPath)) {
    throw new Error('ECHO_DRIFT_SWEEP_CONTEXT_REPO_PATH must be absolute when set');
  }
  return {
    brain,
    contextRepoPath,
    timeoutMs: parsePositiveInt(
      env['ECHO_DRIFT_SWEEP_BRAIN_TIMEOUT_MS'],
      DEFAULT_DRIFT_JUDGE_BRAIN_TIMEOUT_MS,
    ),
    env,
  };
}

export function buildDriftJudgePrompt(input: DriftJudgeInput): string {
  return [
    'You are a drift detector. Decide whether a newly captured meeting STATEMENT',
    'contradicts a RECORDED TEAM DECISION.',
    '',
    'Return STRICT JSON only, no prose, exactly this shape:',
    '{"contradicts": boolean, "quote": string, "reason": string}',
    '',
    'Rules:',
    '- "contradicts" is true ONLY if the statement is logically incompatible with',
    '  the decision (reverses, overrides, or violates it). Merely related or',
    '  elaborating statements are NOT contradictions.',
    '- "quote" MUST be an exact verbatim substring copied from the statement text',
    '  below that shows the contradiction. Never paraphrase. If not contradicting,',
    '  return an empty string.',
    '- "reason" is one sentence explaining the verdict.',
    '',
    JSON.stringify(input, null, 2),
  ].join('\n');
}

export function parseDriftVerdict(answer: string): DriftVerdict {
  let parsed: unknown;
  try {
    parsed = parseJson(answer.trim());
  } catch (err) {
    throw new DriftJudgeParseError(`verdict JSON invalid: ${(err as Error).message}`);
  }
  if (!isPlainObject(parsed)) throw new DriftJudgeParseError('verdict is not an object');
  const contradicts = parsed['contradicts'];
  const quote = parsed['quote'];
  const reason = parsed['reason'];
  if (typeof contradicts !== 'boolean') {
    throw new DriftJudgeParseError('verdict.contradicts must be boolean');
  }
  if (typeof quote !== 'string') throw new DriftJudgeParseError('verdict.quote must be string');
  if (typeof reason !== 'string') throw new DriftJudgeParseError('verdict.reason must be string');
  return { contradicts, quote, reason };
}

function defaultJudgeFromBrain(config: DriftBrainConfig): DriftJudge {
  return async (input) => {
    const result = await runBrain(buildDriftJudgePrompt(input), {
      brain: config.brain,
      contextRepoPath: config.contextRepoPath,
      timeoutMs: config.timeoutMs,
      env: config.env,
    });
    if (!result.ok || result.answer === undefined) {
      // Infra failure — retryable, NOT counted against the attempt budget.
      throw new DriftJudgeInfraError(result.reason ?? result.outcome);
    }
    return parseDriftVerdict(result.answer);
  };
}

interface SlackPostResponse {
  ok?: boolean;
  error?: string;
  ts?: string;
}

/** Daemon-side Slack card post (postGranolaIntakeSeed pattern; no Socket Mode).
 *  DMs the decision owner (channel = their slack_user_id) with a Block Kit card
 *  carrying the decision, contradicting quote, meeting provenance, and
 *  Acknowledge/Dismiss buttons whose value is the pair key. */
export async function postDriftAlertCard(
  botToken: string,
  payload: DriftAlertPayload,
): Promise<void> {
  const provenance = payload.meeting_url !== undefined
    ? `<${payload.meeting_url}|${payload.meeting_title}>`
    : payload.meeting_title;
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: payload.owner_slack_user_id,
      text: `Possible drift from a decision you confirmed: ${payload.decision_subject}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: [
              '*Possible drift from a decision you confirmed*',
              `*${payload.decision_subject}*: ${payload.decision_text}`,
              `_Confirmed ${payload.confirmed_at} by ${payload.confirmed_by}_`,
              '',
              `*Contradicting statement* (from ${provenance}):`,
              `> ${payload.quote}`,
              `_${payload.reason}_`,
            ].join('\n'),
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Acknowledge' },
              style: 'primary',
              action_id: 'echo_drift_acknowledge',
              value: payload.pair_key,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Dismiss' },
              style: 'danger',
              action_id: 'echo_drift_dismiss',
              value: payload.pair_key,
            },
          ],
        },
      ],
    }),
  });
  // Classify a received non-2xx BEFORE parsing the body (AC1, r2 codex-ops): a 429
  // — or any non-2xx — with a missing, empty, or non-JSON body is still a PROVEN
  // rejection (a response arrived, so Slack provably did not deliver). It must
  // become a typed DriftDeliveryRejectedError (retryable), never throw inside
  // response.json() and fall through as an untyped unknown-outcome terminal.
  if (!response.ok) {
    throw new DriftDeliveryRejectedError(
      `Slack drift alert post rejected: HTTP ${response.status}`,
    );
  }
  const body = (await response.json()) as SlackPostResponse;
  if (body.ok !== true) {
    // A received `ok:false` (2xx transport, application-level rejection) is equally
    // a proven rejection → retryable.
    throw new DriftDeliveryRejectedError(
      `Slack drift alert post rejected: ${body.error ?? 'ok:false'}`,
    );
  }
}

function disabledHandle(configError?: DriftSweepConfigError): DriftSweepWorkerHandle {
  return {
    enabled: false,
    ...(configError !== undefined ? { configError } : {}),
    run: async () => ({ status: 'skipped', reason: 'disabled' }),
    stop: async () => {},
  };
}

/**
 * Start the clocked drift sweep worker (AC1 + AC6). Fail-closed: OFF by default;
 * enabled-but-misconfigured returns a DISABLED handle carrying the structured
 * config error, never throwing. On the enabled path: interval + single-flight +
 * `runSignalsFirst` chaining so the sweep reads fresh signal atoms.
 */
export async function startDriftSweepWorker(
  storage: Storage,
  options: DriftSweepWorkerOptions = {},
): Promise<DriftSweepWorkerHandle> {
  const env = options.env ?? process.env;

  let config: DriftSweepConfig;
  try {
    config = loadDriftSweepConfig(env);
  } catch (err) {
    if (err instanceof DriftSweepConfigError) {
      log.error('config_error', { missing: err.missing, message: err.message });
      return disabledHandle(err);
    }
    throw err;
  }

  if (!config.enabled) return disabledHandle();

  const identities = options.identities ?? config.identities;
  const botToken = options.botToken ?? config.botToken;

  let judge = options.judge;
  if (judge === undefined) {
    try {
      const brainConfig = resolveDriftBrainConfig(env);
      await preflightBrain(brainConfig.brain, brainConfig.env);
      judge = defaultJudgeFromBrain(brainConfig);
    } catch (err) {
      log.error('disabled', { reason: (err as Error).message });
      return disabledHandle();
    }
  }

  const post =
    options.post ?? ((payload: DriftAlertPayload) => postDriftAlertCard(botToken, payload));

  const runtime: DriftSweepRuntime = {
    judge,
    post,
    identities,
    checkpointPath: options.checkpointPath ?? driftSweepCheckpointPath(),
    maxAlertsPerTick: options.maxAlertsPerTick ?? config.maxAlertsPerTick,
    judgeVersion: options.judgeVersion ?? DRIFT_JUDGE_VERSION,
    now: options.now ?? (() => new Date().toISOString()),
  };

  const workerIntervalMs = options.workerIntervalMs ?? DEFAULT_DRIFT_SWEEP_WORKER_INTERVAL_MS;
  const runOnStart = options.runOnStart ?? true;
  let stopped = false;
  let inFlight: Promise<DriftSweepResult> | null = null;

  async function run(): Promise<DriftSweepResult> {
    if (stopped) return { status: 'skipped', reason: 'disabled' };
    if (inFlight !== null) {
      log.warn('worker_skipped_in_flight', {});
      return { status: 'skipped', reason: 'in_flight' };
    }
    inFlight = (async () => {
      if (options.runSignalsFirst !== undefined) {
        try {
          await options.runSignalsFirst();
        } catch (err) {
          log.warn('signals_first_failed', { message: (err as Error).message });
        }
      }
      return runDriftSweepOnce(storage, runtime);
    })();
    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  }

  const interval = setInterval(() => {
    void run().catch((err: unknown) => {
      log.error('handler_error', { message: (err as Error).message });
    });
  }, workerIntervalMs);
  interval.unref();

  if (runOnStart) {
    void run().catch((err: unknown) => {
      log.error('handler_error', { message: (err as Error).message });
    });
  }

  log.info('started', {
    worker_interval_ms: workerIntervalMs,
    max_alerts_per_tick: runtime.maxAlertsPerTick,
    checkpoint_path: runtime.checkpointPath,
  });

  return {
    enabled: true,
    run,
    stop: async () => {
      stopped = true;
      clearInterval(interval);
      if (inFlight !== null) await inFlight.catch(() => ({ status: 'error' }));
      log.info('stopped', {});
    },
  };
}
