// 057a AC1 + AC5 — coord event type registry.
//
// Single source of truth for: event_type → tier classification, schema_version,
// subject_role policy (self-attestation vs invocation). Adding a new event
// type means one registry entry; the validator + tracker + status display
// all derive behavior from this registry.
//
// AC1 (per spec body):
//   - "tier classification + subject_role policy lives in the registry at
//     src/coord/types.ts"
//   - "Adding a new event type means one registry entry; the validator +
//     tracker + status display all derive behavior from the registry."
//
// AC5 (schema versioning):
//   - "Schema-version registry in src/coord/types.ts. Each event type
//     carries a schema_version. Consumers that encounter an unknown
//     event_type or schema_version MUST ignore (forward-compat)."
//
// NOTE: the `expects` value (which event closes a given opener) lives in
// `tools/review-queue/coord-roles.json`, NOT in this registry — r5 codex F1
// MED slot-universe single-source-of-truth rule. The registry knows tier
// classification + subject_role policy; coord-roles.json owns SLA + slot
// universe (the `role.events.<event_type>.expects` value).

/** Tier classification — round-tier events are keyed by `correlation_id`
 *  (group session round); scheduler-tier events are keyed by `tick_run_id`
 *  (launchd-tick reviewer health). The two tiers have separate open-record
 *  maps in the AC3 deadline tracker, so a wrapper's scheduler-health
 *  events do not collide with its in-round reviewer events. */
export type CoordTier = 'round' | 'scheduler';

/** subject_role policy — whether `subject_role` MUST equal the
 *  emitter_role (self-attestation events like `tick_start`, `tick_end`)
 *  or MAY differ (invocation events like `reviewer_invoked` where the
 *  emitter is the orchestrator and `subject_role` is the target
 *  reviewer whose deadline is opened). Daemon-emitted `deadline_missed`
 *  events carry the original record's subject_role. */
export type SubjectRolePolicy = 'self_attestation' | 'invocation' | 'daemon_emitted';

export interface CoordEventTypeEntry {
  readonly tier: CoordTier;
  readonly subject_role_policy: SubjectRolePolicy;
  readonly schema_version: number;
}

/** Registry — every coord event_type known to the daemon. Unknown
 *  event_types are rejected by `validateCoordEmitInput` (AC1's
 *  non-forward-compat path for incoming writes); the forward-compat
 *  posture in AC5 ("consumers that encounter an unknown event_type
 *  MUST ignore") applies to READERS (e.g. a future coord-aware
 *  consumer that boots against an older daemon's registry — it
 *  silently skips events it doesn't recognize). */
export const COORD_EVENT_TYPE_REGISTRY: Readonly<Record<string, CoordEventTypeEntry>> = Object.freeze(
  {
    // Round-tier — opened by orchestrator (claude-strategist), closed by reviewer.
    reviewer_invoked: {
      tier: 'round',
      subject_role_policy: 'invocation',
      schema_version: 1,
    },
    // Round-tier — emitted by reviewer wrapper at tick start.
    tick_start: {
      tier: 'round',
      subject_role_policy: 'self_attestation',
      schema_version: 1,
    },
    // Round-tier — emitted by reviewer wrapper at tick end.
    tick_end: {
      tier: 'round',
      subject_role_policy: 'self_attestation',
      schema_version: 1,
    },
    // Round-tier — invocation event for a reviewer that failed to bind
    // (e.g. wrapper-side launch failure detected by orchestrator).
    tick_failed_to_bind: {
      tier: 'round',
      subject_role_policy: 'invocation',
      schema_version: 1,
    },
    // Scheduler-tier — emitted by reviewer wrapper at the start of a
    // launchd-driven scheduler tick.
    scheduler_health: {
      tier: 'scheduler',
      subject_role_policy: 'self_attestation',
      schema_version: 1,
    },
    // Scheduler-tier — emitted by reviewer wrapper at the end of a
    // launchd-driven scheduler tick (closes scheduler_health).
    scheduler_health_done: {
      tier: 'scheduler',
      subject_role_policy: 'self_attestation',
      schema_version: 1,
    },
    // Daemon-emitted, both tiers — appended by the AC3 deadline tracker's
    // `fireMissedDeadline` path when an open record passes its `expected_by`.
    // Carries the original opener's subject_role in the atom payload.
    // Note: daemon emission bypasses the `subject_role == emitter_role`
    // self-attestation check — see SubjectRolePolicy 'daemon_emitted'.
    deadline_missed: {
      tier: 'round', // tier is recorded per-atom in metadata.coord.tier; this default is overridden at emit time
      subject_role_policy: 'daemon_emitted',
      schema_version: 1,
    },
  },
);

/** Lookup helper — narrow `unknown` to a registered event_type without
 *  hand-coding the union everywhere. Returns `null` for unknown types
 *  (the caller decides whether to reject — AC1 rejects at coord_emit,
 *  AC5 readers MAY silently skip). */
export function lookupCoordEventType(eventType: string): CoordEventTypeEntry | null {
  // hasOwnProperty guard so prototype-chain pollution can't sneak a hit.
  if (!Object.prototype.hasOwnProperty.call(COORD_EVENT_TYPE_REGISTRY, eventType)) {
    return null;
  }
  return COORD_EVENT_TYPE_REGISTRY[eventType] ?? null;
}

/** The set of currently-known coord event_type strings. Used by
 *  `coord_status`'s slot-universe construction (AC6) where the lookup
 *  walks `coord-roles.json` first and the registry only confirms tier
 *  classification, not the slot identity. */
export const KNOWN_COORD_EVENT_TYPES: readonly string[] = Object.freeze(
  Object.keys(COORD_EVENT_TYPE_REGISTRY),
);

/** The `metadata.surface` value all coord atoms carry. The
 *  non-pollution invariants in AC1 default-exclude this surface from
 *  `search_memories` and `find_clusters`; `wait_for_new_turns` honors
 *  the explicit `source_prefix="coord:"` opt-in (AC4). */
export const COORD_SURFACE = 'coord';

/** The `metadata.session_id` value coord atoms carry. Distinct from
 *  reviewer-session ids so a search-by-session won't accidentally pull
 *  coord atoms into a reviewer's surface. */
export const COORD_SESSION_ID = 'echo:coord';

/** The source-prefix that ALL coord atoms share: `coord:<role>`. Use this
 *  prefix in `wait_for_new_turns(source_prefix="coord:")` (AC4) or in
 *  `search_memories(source_prefix="coord:<role>:")` to forensically
 *  retrieve coord atoms. */
export const COORD_SOURCE_PREFIX = 'coord:';
