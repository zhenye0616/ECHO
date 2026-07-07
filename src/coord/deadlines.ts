// 057a AC3 — deadline tracker with reconstruction + two-tier keyspace +
// single mutation lane.
//
// The deadline tracker is structured as a SINGLE-ACTOR SERIAL MUTATION
// LANE: every state-changing operation (event ingest's close-then-open
// transitions, heartbeat fires, boot reconstruction, periodic
// reconciliation) enqueues onto one ordered async queue. No two
// mutations execute concurrently. The lane is the single owner of the
// open-records maps + idempotency cache.
//
// Why a single lane: r1 codex F2 HIGH + r1 codex-ops F5 HIGH + r1 codex-ops
// F6 HIGH (convergent) — JS is single-threaded, but multiple awaitable
// operations CAN interleave between awaits. The lane is a thin promise
// chain that prevents that interleaving for state-mutating tasks.
//
// Boot reconstruction algorithm: FULL LEDGER REPLAY (V1). The r3 design
// tried a 24h `emitted_at` horizon; r4 showed that's unsafe under skewed
// timestamps (a coord atom appended late but with old `emitted_at` would
// be skipped, producing false-clean state). V1 picks full scan; small
// substrate volume makes it cheap.

import { createHash } from 'node:crypto';
import { canonicalizeTimestamp } from '../capture/pipeline.js';
import type { CoordRolesConfig, CoordRoleConfig } from './roles.js';
import {
  COORD_SESSION_ID,
  COORD_SURFACE,
  lookupCoordEventType,
  type CoordTier,
} from './types.js';
import type { ValidatedCoordEmitInput } from './validate.js';
import type {
  CoordAtomIterationRecord,
  EventId,
  Storage,
} from '../storage/interface.js';
import { createLogger } from '../logging/index.js';

const log = createLogger('coord.deadlines');

/** An open record in one of the tier maps. Both tiers share the same
 *  shape — the tier discriminant lives at the map-level (round vs
 *  scheduler), and `key` is `correlation_id` (round) OR `tick_run_id`
 *  (scheduler). */
export interface OpenRecord {
  readonly tier: CoordTier;
  readonly key: string; // correlation_id for round; tick_run_id for scheduler
  readonly subject_role: string;
  readonly event_type: string;
  readonly expected_by: string; // ISO timestamp
  /** The event_type this open record is waiting for (its "closer"). Looked
   *  up from `coord-roles.json` at open time and cached on the record so
   *  the close phase doesn't have to re-read the config. */
  readonly expects: string;
}

function makeOpenMapKey(
  key: string,
  subject_role: string,
  event_type: string,
  expected_by: string,
): string {
  return `${key}|${subject_role}|${event_type}|${expected_by}`;
}

/** sha256 of the tier-aware identity. The expected_by is NOT in the
 *  idempotency key (per spec line 187), so two open records for the same
 *  (key, subject_role, event_type) at different expected_by collapse to
 *  one missed-deadline atom. */
function idempotencyKey(r: OpenRecord): string {
  return createHash('sha256')
    .update(`${r.key}|${r.subject_role}|${r.event_type}|deadline_missed`)
    .digest('hex');
}

/** Look up the role's `expects` value for a given event_type. Returns
 *  `null` when the role+event_type pair has no configured `expects` (i.e.
 *  this event_type does NOT open a deadline). */
function lookupExpects(
  role: CoordRoleConfig | undefined,
  event_type: string,
): string | null {
  if (role === undefined) return null;
  const ev = role.events[event_type];
  return ev?.expects ?? null;
}

function lookupRoleConfig(
  config: CoordRolesConfig,
  subject_role: string,
): CoordRoleConfig | undefined {
  return config.roles.find((r) => r.name === subject_role);
}

/** Single-actor serial mutation lane. Every state-mutating operation on
 *  the tracker enqueues onto this lane so they run one at a time, never
 *  interleaving. Read-only snapshots take a structural copy off the lane
 *  via `currentSnapshot()`. */
class MutationLane {
  private tail: Promise<unknown> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    // Chain on the existing tail. If the prior task threw, we still want
    // the next task to run — the lane is for ordering, not error
    // propagation. The `.catch` swallows prior errors so they don't
    // poison the chain; each task's own caller observes its result.
    const next = this.tail.then(task, task);
    // Swallow on the stored tail to keep the chain alive after rejections.
    this.tail = next.catch(() => undefined);
    return next;
  }
}

export interface DeadlineTrackerOptions {
  /** Inject a clock so tests can drive deterministic now() values. */
  now?: () => Date;
  /** Override the 1-second heartbeat interval. Tests set it to a
   *  test-only manual tick or a much shorter timer; production never
   *  overrides. */
  heartbeatIntervalMs?: number;
  /** Override the 10-minute reconciliation interval. Tests usually
   *  disable reconciliation by setting `null`. */
  reconciliationIntervalMs?: number | null;
  /** Maximum page size for iterateCoordAtomsByAppendOrder pagination
   *  during reconstruction + reconciliation. Default 5000. */
  replayPageSize?: number;
}

export interface DeadlineSnapshot {
  /** Open deadlines, round-tier. Snapshot only — not live. */
  readonly round: readonly OpenRecord[];
  /** Open deadlines, scheduler-tier. Snapshot only — not live. */
  readonly scheduler: readonly OpenRecord[];
  /** Number of distinct idempotency keys in the in-memory cache. */
  readonly idempotency_cache_size: number;
  /** The last full-replay watermark. 0 if reconstruction has not run. */
  readonly last_replay_watermark: number;
}

export interface DeadlineTrackerHandle {
  /** Stop background timers (heartbeat + reconciliation). */
  stop: () => Promise<void>;
}

/** The single-owner deadline tracker. Lifecycle:
 *
 *    const tracker = new DeadlineTracker(storage, config);
 *    await tracker.reconstruct();   // HARD STARTUP GATE — daemon must
 *                                   // not accept coord_emit until this
 *                                   // resolves
 *    tracker.start();               // starts heartbeat + reconciliation
 *    // ...
 *    await tracker.stop();          // clears timers
 *
 * Production: `startMcpServer` constructs the tracker, awaits
 * `reconstruct`, calls `start`, and the resulting handle is `stop`-ed at
 * server-shutdown time. Tests bypass `start` and call `tick()` directly
 * for deterministic behavior. */
export class DeadlineTracker {
  private readonly roundOpen = new Map<string, OpenRecord>();
  private readonly schedulerOpen = new Map<string, OpenRecord>();
  private readonly idempotencyCache = new Set<string>();
  private readonly lane = new MutationLane();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconciliationTimer: ReturnType<typeof setInterval> | null = null;
  private lastReplayWatermark = 0;
  private readonly now: () => Date;
  private readonly heartbeatIntervalMs: number;
  private readonly reconciliationIntervalMs: number | null;
  private readonly replayPageSize: number;

  constructor(
    private readonly storage: Storage,
    private readonly config: CoordRolesConfig,
    opts: DeadlineTrackerOptions = {},
  ) {
    this.now = opts.now ?? (() => new Date());
    this.heartbeatIntervalMs = opts.heartbeatIntervalMs ?? 1000;
    this.reconciliationIntervalMs =
      opts.reconciliationIntervalMs === undefined ? 10 * 60 * 1000 : opts.reconciliationIntervalMs;
    this.replayPageSize = opts.replayPageSize ?? 5000;
  }

  /** Boot reconstruction. Reads the full coord-atom ledger up to a
   *  snapshot watermark, primes the idempotency cache from existing
   *  deadline_missed atoms, replays close-then-open transitions over the
   *  remaining atoms in append order, then fires any record still open
   *  AND past `expected_by` (so a daemon restart after a missed deadline
   *  emits the atom that was lost when the prior daemon went down).
   *
   *  The returned Promise is the HARD STARTUP GATE — the MCP server must
   *  not accept coord_emit calls until this resolves. */
  async reconstruct(): Promise<void> {
    return this.lane.enqueue(async () => {
      const highSeq = await this.storage.getCurrentCoordSequence();
      let pageSeq = 1;
      while (true) {
        const page = await this.storage.iterateCoordAtomsByAppendOrder({
          sinceSeq: pageSeq,
          limit: this.replayPageSize,
        });
        if (page.length === 0) break;
        for (const atom of page) {
          if (atom.sequence_id > highSeq) break;
          this.applyReplayAtom(atom);
        }
        const lastSeq = page[page.length - 1]!.sequence_id;
        // Half-open: next page starts at lastSeq + 1.
        pageSeq = lastSeq + 1;
        if (page.length < this.replayPageSize) break;
      }
      this.lastReplayWatermark = highSeq;

      // Fire any record still open AND past expected_by.
      const nowMs = this.now().getTime();
      const expired: OpenRecord[] = [];
      for (const r of this.roundOpen.values()) {
        if (new Date(r.expected_by).getTime() < nowMs) expired.push(r);
      }
      for (const r of this.schedulerOpen.values()) {
        if (new Date(r.expected_by).getTime() < nowMs) expired.push(r);
      }
      for (const r of expired) {
        await this.fireMissedDeadlineImpl(r);
      }
      log.info('reconstruct_complete', {
        high_seq: highSeq,
        round_open: this.roundOpen.size,
        scheduler_open: this.schedulerOpen.size,
        idempotency_cache_size: this.idempotencyCache.size,
      });
    });
  }

  /** Ingest a validated coord event — applies the close-then-open
   *  transition on the lane. The MCP coord_emit tool calls this AFTER a
   *  successful storage.append. */
  ingest(event: ValidatedCoordEmitInput): Promise<void> {
    return this.lane.enqueue(async () => {
      this.applyTransition(event);
    });
  }

  /** Manually run one heartbeat tick. Tests call this in place of the
   *  interval timer for deterministic behavior. Each tick: snapshot the
   *  open-records maps, fire records whose `expected_by` is past `now()`. */
  tick(): Promise<void> {
    return this.lane.enqueue(async () => {
      const nowMs = this.now().getTime();
      const expired: OpenRecord[] = [];
      // Snapshot first; fire-removal must not interfere with iteration.
      for (const r of this.roundOpen.values()) {
        if (new Date(r.expected_by).getTime() < nowMs) expired.push(r);
      }
      for (const r of this.schedulerOpen.values()) {
        if (new Date(r.expected_by).getTime() < nowMs) expired.push(r);
      }
      for (const r of expired) {
        await this.fireMissedDeadlineImpl(r);
      }
    });
  }

  /** Periodic reconciliation. Re-reads coord atoms appended since the
   *  last_full_replay_watermark up to a fresh getCurrentCoordSequence()
   *  snapshot; replays close-then-open on those atoms; advances the
   *  watermark. Idempotent — running it twice in a row is a no-op. */
  reconcile(): Promise<void> {
    return this.lane.enqueue(async () => {
      const highSeq = await this.storage.getCurrentCoordSequence();
      let pageSeq = this.lastReplayWatermark + 1;
      while (pageSeq <= highSeq) {
        const page = await this.storage.iterateCoordAtomsByAppendOrder({
          sinceSeq: pageSeq,
          limit: this.replayPageSize,
        });
        if (page.length === 0) break;
        for (const atom of page) {
          if (atom.sequence_id > highSeq) break;
          this.applyReplayAtom(atom);
        }
        const lastSeq = page[page.length - 1]!.sequence_id;
        pageSeq = lastSeq + 1;
        if (page.length < this.replayPageSize) break;
      }
      this.lastReplayWatermark = highSeq;
    });
  }

  /** Snapshot the tracker state for the AC6 coord_status read tool.
   *  Takes a structural copy on the lane to avoid mid-mutation reads. */
  currentSnapshot(): Promise<DeadlineSnapshot> {
    return this.lane.enqueue(async () => {
      return {
        round: [...this.roundOpen.values()],
        scheduler: [...this.schedulerOpen.values()],
        idempotency_cache_size: this.idempotencyCache.size,
        last_replay_watermark: this.lastReplayWatermark,
      } satisfies DeadlineSnapshot;
    });
  }

  /** Start background timers. Production-only — tests use `tick()` and
   *  `reconcile()` directly. */
  start(): DeadlineTrackerHandle {
    if (this.heartbeatTimer === null && this.heartbeatIntervalMs > 0) {
      this.heartbeatTimer = setInterval(() => {
        void this.tick();
      }, this.heartbeatIntervalMs);
      // Detach from event loop hold — don't keep node alive just for the
      // heartbeat (the HTTP server is the real loop anchor).
      if (typeof this.heartbeatTimer.unref === 'function') {
        this.heartbeatTimer.unref();
      }
    }
    if (this.reconciliationTimer === null && this.reconciliationIntervalMs !== null) {
      this.reconciliationTimer = setInterval(() => {
        void this.reconcile();
      }, this.reconciliationIntervalMs);
      if (typeof this.reconciliationTimer.unref === 'function') {
        this.reconciliationTimer.unref();
      }
    }
    return {
      stop: async () => {
        if (this.heartbeatTimer !== null) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
        if (this.reconciliationTimer !== null) {
          clearInterval(this.reconciliationTimer);
          this.reconciliationTimer = null;
        }
      },
    };
  }

  // ─── Internal: state transitions (lane-owned, never call directly) ───

  /** Apply a transition for ONE event. Used by both live ingest and
   *  reconstruction replay. The lane wraps higher-level entry points. */
  private applyTransition(event: ValidatedCoordEmitInput): void {
    const tierMap = event.tier === 'round' ? this.roundOpen : this.schedulerOpen;
    const tierKey = event.tier === 'round' ? event.correlation_id : event.tick_run_id;
    const role = lookupRoleConfig(this.config, event.subject_role);

    // Close phase: find records in this tier matching (tierKey, subject_role)
    // whose expects == event.event_type. Multiple may match (different
    // expected_by) — close them all.
    const toClose: string[] = [];
    for (const [mapKey, r] of tierMap.entries()) {
      if (
        r.key === tierKey &&
        r.subject_role === event.subject_role &&
        r.expects === event.event_type
      ) {
        toClose.push(mapKey);
      }
    }
    for (const mapKey of toClose) tierMap.delete(mapKey);

    // Open phase: if event_type has an `expects` configured for this role,
    // insert a new open record. expected_by comes from the event (or the
    // role's default_deadline_sec from now if event.expected_by is absent).
    const expects = lookupExpects(role, event.event_type);
    if (expects !== null) {
      const expectedBy = this.resolveExpectedBy(event, role);
      const open: OpenRecord = {
        tier: event.tier,
        key: tierKey,
        subject_role: event.subject_role,
        event_type: event.event_type,
        expected_by: expectedBy,
        expects,
      };
      const mapKey = makeOpenMapKey(
        tierKey,
        event.subject_role,
        event.event_type,
        expectedBy,
      );
      tierMap.set(mapKey, open);
    }
  }

  /** Parse an `emitted_at` string into epoch ms via the same
   *  canonicalization the capture pipeline uses (naive → UTC). Returns
   *  `null` when the value is unparseable so callers can degrade to a
   *  `this.now()` fallback instead of throwing or propagating NaN.
   *
   *  `canonicalizeTimestamp` throws a RangeError on an unparseable instant
   *  (`new Date(bad).toISOString()`); the try/catch converts that into the
   *  `null` sentinel so a single corrupt ledger row can't poison the
   *  mutation lane. */
  private parseEmittedAtMs(emitted_at: string): number | null {
    try {
      const ms = new Date(canonicalizeTimestamp(emitted_at)).getTime();
      return Number.isNaN(ms) ? null : ms;
    } catch {
      return null;
    }
  }

  /** Resolve the effective `expected_by` for a new open record.
   *
   *  129 — the time base is the event's own `emitted_at`, NOT tracker-now.
   *  On live ingest `emitted_at ≈ now`, so behavior is effectively
   *  unchanged; on replay this makes the resolved deadline byte-identical
   *  across daemon restarts. Previously every `reconstruct()` recomputed
   *  open deadlines off restart-now, so a daemon that restarted within the
   *  window (routine) silently re-baselined every open deadline and the
   *  `deadline_missed` detector could never fire in production.
   *
   *  Parseability chain (AC4): `emitted_at` is ISO-pinned at BOTH entry
   *  points — live via `validate.ts` (`isNonEmptyString` + `ISO_RE` gate
   *  before this code runs) and on replay via `applyReplayAtom` setting
   *  `emitted_at = atom.timestamp`. The `?? this.now()` fallback below only
   *  fires for an unparseable `emitted_at` (a corrupt ledger row), so a
   *  garbage value degrades to tracker-now rather than throwing or NaN-ing
   *  into `Math.min`.
   *
   *  Skew posture (AC3): anchoring the DEADLINE on `emitted_at` is the
   *  OPPOSITE of the 057a r4 rejected design. r4 rejected using an
   *  `emitted_at` HORIZON to SKIP replay atoms — unsafe, because a
   *  late-appended atom carrying an old `emitted_at` would be dropped,
   *  producing false-clean state. Here a late/old `emitted_at` yields a
   *  truthfully-EXPIRED deadline that fires promptly, never a
   *  silently-fresh one.
   *
   *  - If the event carries `expected_by` (already ISO), clamp it to the
   *    role's `max_deadline_sec` ceiling (`emitted_at + max`).
   *  - If the event omits `expected_by`, apply `default_deadline_sec`
   *    from the role's config (`emitted_at + default`).
   *  - If the role has no config entry for this event_type, fall back to
   *    `event.expected_by` if set, else `emitted_at + 600s` (defensive —
   *    this branch only fires if applyTransition was called with an event
   *    whose subject_role's role entry is missing this event_type, which
   *    means we shouldn't be opening a deadline for it anyway. Guards
   *    against a malformed registry / coord-roles.json divergence.). */
  private resolveExpectedBy(
    event: ValidatedCoordEmitInput,
    role: CoordRoleConfig | undefined,
  ): string {
    const eventConfig = role?.events[event.event_type];
    const baseMs = this.parseEmittedAtMs(event.emitted_at) ?? this.now().getTime();
    if (event.expected_by !== undefined) {
      const requested = new Date(event.expected_by).getTime();
      if (eventConfig !== undefined) {
        const max = baseMs + eventConfig.max_deadline_sec * 1000;
        const clamped = Math.min(requested, max);
        return new Date(clamped).toISOString();
      }
      return canonicalizeTimestamp(event.expected_by);
    }
    if (eventConfig !== undefined) {
      return new Date(baseMs + eventConfig.default_deadline_sec * 1000).toISOString();
    }
    return new Date(baseMs + 600 * 1000).toISOString();
  }

  /** Replay a single durable coord atom during reconstruction /
   *  reconciliation. Handles two atom shapes:
   *    - Regular coord event: extract the ValidatedCoordEmitInput shape
   *      from `metadata.coord` and call `applyTransition`.
   *    - `coord:deadline_missed` atom: extract idempotency_key from
   *      metadata and add to the cache (cross-restart "already fired"
   *      signal). */
  private applyReplayAtom(atom: CoordAtomIterationRecord): void {
    const md = atom.metadata as { coord?: Record<string, unknown> } | undefined;
    const coord = md?.coord;
    if (coord === undefined || typeof coord !== 'object') return;
    const event_type = (coord as { event_type?: unknown }).event_type;
    if (typeof event_type !== 'string') return;

    if (event_type === 'deadline_missed') {
      const idempotency_key = (coord as { idempotency_key?: unknown }).idempotency_key;
      if (typeof idempotency_key === 'string' && idempotency_key.length > 0) {
        this.idempotencyCache.add(idempotency_key);
      }
      return;
    }

    // Skip atoms whose event_type isn't in the registry (forward-compat
    // posture for readers per AC5).
    const registryEntry = lookupCoordEventType(event_type);
    if (registryEntry === null) return;

    // Reconstruct a ValidatedCoordEmitInput shape from the atom metadata.
    const subject_role = (coord as { subject_role?: unknown }).subject_role;
    const schema_version = (coord as { schema_version?: unknown }).schema_version;
    if (typeof subject_role !== 'string') return;
    if (typeof schema_version !== 'number') return;

    const expected_by = (coord as { expected_by?: unknown }).expected_by;
    const payload = (coord as { payload?: unknown }).payload;

    let event: ValidatedCoordEmitInput;
    if (registryEntry.tier === 'round') {
      const correlation_id = (coord as { correlation_id?: unknown }).correlation_id;
      if (typeof correlation_id !== 'string') return;
      const out: ValidatedCoordEmitInput = {
        tier: 'round',
        event_type,
        schema_version,
        subject_role,
        correlation_id,
        emitted_at: atom.timestamp,
      };
      if (typeof expected_by === 'string')
        (out as { expected_by?: string }).expected_by = expected_by;
      if (payload !== undefined && payload !== null && typeof payload === 'object')
        (out as { payload?: Record<string, unknown> }).payload = payload as Record<string, unknown>;
      event = out;
    } else {
      const tick_run_id = (coord as { tick_run_id?: unknown }).tick_run_id;
      if (typeof tick_run_id !== 'string') return;
      const out: ValidatedCoordEmitInput = {
        tier: 'scheduler',
        event_type,
        schema_version,
        subject_role,
        tick_run_id,
        emitted_at: atom.timestamp,
      };
      if (typeof expected_by === 'string')
        (out as { expected_by?: string }).expected_by = expected_by;
      if (payload !== undefined && payload !== null && typeof payload === 'object')
        (out as { payload?: Record<string, unknown> }).payload = payload as Record<string, unknown>;
      event = out;
    }
    this.applyTransition(event);
  }

  /** The ONLY function in the daemon that appends `coord:deadline_missed`
   *  atoms. (a) Compute idempotency key; (b) if cache hit, SKIP append
   *  AND REMOVE the open record (cache-hit-also-terminal — r2 codex-ops
   *  F1 HIGH); (c) otherwise, append one atom through the storage's
   *  single-writer path; (d) insert key into cache; (e) remove from open
   *  map. Both branches end at (e), so every code path is terminal for
   *  R. */
  private async fireMissedDeadlineImpl(r: OpenRecord): Promise<void> {
    const idKey = idempotencyKey(r);
    const tierMap = r.tier === 'round' ? this.roundOpen : this.schedulerOpen;
    const mapKey = makeOpenMapKey(r.key, r.subject_role, r.event_type, r.expected_by);

    if (this.idempotencyCache.has(idKey)) {
      // Already fired (this process OR a prior daemon process via
      // reconstruction's cache priming). Terminal-remove the open record
      // anyway so coord_status() doesn't show a stale "still open" entry.
      tierMap.delete(mapKey);
      return;
    }

    // Append the deadline_missed atom. The atom's metadata.coord carries
    // BOTH `opened_event_type` (the event that opened this record — e.g.
    // 'reviewer_invoked') and `expected_event_type` (the event that
    // should have closed it — e.g. 'tick_start'), per r2 codex F3 MED.
    const nowIso = this.now().toISOString();
    const metadata: Record<string, unknown> = {
      surface: COORD_SURFACE,
      session_id: COORD_SESSION_ID,
      coord: {
        event_type: 'deadline_missed',
        schema_version: 1,
        tier: r.tier,
        subject_role: r.subject_role,
        // Tier-discriminated key field, mirroring the original atom shape.
        ...(r.tier === 'round' ? { correlation_id: r.key } : { tick_run_id: r.key }),
        opened_event_type: r.event_type,
        expected_event_type: r.expects,
        expected_by: r.expected_by,
        idempotency_key: idKey,
      },
    };
    try {
      const appendedId: EventId = await this.storage.append({
        source: `coord:${r.subject_role}`,
        timestamp: nowIso,
        content: JSON.stringify({
          event_type: 'deadline_missed',
          tier: r.tier,
          subject_role: r.subject_role,
          opened_event_type: r.event_type,
          expected_event_type: r.expects,
        }),
        metadata,
      });
      log.info('deadline_missed', {
        atom_id: appendedId,
        tier: r.tier,
        subject_role: r.subject_role,
        opened_event_type: r.event_type,
        expected_event_type: r.expects,
        key: r.key,
        expected_by: r.expected_by,
      });
    } catch (err) {
      // Storage append failed — don't poison the cache (so a retry on the
      // next heartbeat will re-attempt). Re-throw to surface the failure;
      // the heartbeat task absorbs the error via the lane's catch path.
      log.warn('deadline_missed_append_failed', {
        error: (err as Error).message,
        tier: r.tier,
        subject_role: r.subject_role,
        key: r.key,
      });
      throw err;
    }
    this.idempotencyCache.add(idKey);
    tierMap.delete(mapKey);
  }
}
