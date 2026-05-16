// 057a AC1 — per-tier coord-event input validation.
//
// AC1 contract (per spec body):
//   - Validate event_type against the registry. Reject unknown.
//   - Validate schema_version against the registry. Reject unknown.
//   - Reject cross-tier fields (round-tier events MUST carry
//     correlation_id and MUST NOT carry tick_run_id; scheduler-tier
//     events MUST carry tick_run_id and MUST NOT carry correlation_id).
//   - Validate subject_role policy per registry: self-attestation events
//     require subject_role == emitter_role; invocation events require
//     subject_role in coord-roles.json but may differ from emitter_role
//     (r1 codex F1 HIGH).
//   - Validate emitted_at is a non-empty ISO-shaped string (the daemon
//     canonicalizes later via `src/capture/pipeline.ts:17-44` pattern).
//   - `payload` and `expected_by` are optional pass-through fields.

import type { CoordRolesConfig } from './roles.js';
import { isKnownRole } from './identity.js';
import {
  COORD_EVENT_TYPE_REGISTRY,
  lookupCoordEventType,
  type CoordEventTypeEntry,
  type CoordTier,
} from './types.js';

export class CoordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoordValidationError';
  }
}

/** Common shape for the validated coord_emit input. The tier-discriminated
 *  fields (correlation_id vs tick_run_id) are surfaced as a union so
 *  consumers (the deadline tracker, the emit path) can narrow on `tier`. */
export type ValidatedCoordEmitInput =
  | {
      tier: 'round';
      event_type: string;
      schema_version: number;
      subject_role: string;
      correlation_id: string;
      emitted_at: string;
      expected_by?: string;
      payload?: Record<string, unknown>;
    }
  | {
      tier: 'scheduler';
      event_type: string;
      schema_version: number;
      subject_role: string;
      tick_run_id: string;
      emitted_at: string;
      expected_by?: string;
      payload?: Record<string, unknown>;
    };

interface RawInput {
  event_type?: unknown;
  schema_version?: unknown;
  subject_role?: unknown;
  correlation_id?: unknown;
  tick_run_id?: unknown;
  emitted_at?: unknown;
  expected_by?: unknown;
  payload?: unknown;
  // Caller-supplied `source` is IGNORED (r1 codex Q5 HIGH non-trust posture)
  // but we accept the field on input so older callers don't break — it's
  // dropped before the atom is appended.
  source?: unknown;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

/** Validate a coord_emit input against the registry + roster. Returns a
 *  typed `ValidatedCoordEmitInput` discriminated by tier, or throws
 *  `CoordValidationError` with a clear message.
 *
 *  Arguments:
 *    rawInput      — unknown shape from the MCP tool boundary
 *    emitterRole   — server-derived role (from X-Echo-Role) — used to
 *                    enforce self_attestation subject_role == emitter_role.
 *    config        — coord-roles.json roster, for subject_role membership.
 */
export function validateCoordEmitInput(
  rawInput: unknown,
  emitterRole: string,
  config: CoordRolesConfig,
): ValidatedCoordEmitInput {
  if (!isPlainObject(rawInput)) {
    throw new CoordValidationError('coord_emit: input must be a JSON object');
  }
  const input = rawInput as RawInput;

  if (!isNonEmptyString(input.event_type)) {
    throw new CoordValidationError('coord_emit: event_type must be a non-empty string');
  }
  const eventType = input.event_type;
  const registryEntry: CoordEventTypeEntry | null = lookupCoordEventType(eventType);
  if (registryEntry === null) {
    const known = Object.keys(COORD_EVENT_TYPE_REGISTRY).join(', ');
    throw new CoordValidationError(
      `coord_emit: unknown event_type '${eventType}' (known: ${known})`,
    );
  }

  if (typeof input.schema_version !== 'number' || !Number.isInteger(input.schema_version)) {
    throw new CoordValidationError('coord_emit: schema_version must be an integer');
  }
  if (input.schema_version !== registryEntry.schema_version) {
    throw new CoordValidationError(
      `coord_emit: unknown schema_version ${input.schema_version} for event_type '${eventType}' (registry expects ${registryEntry.schema_version})`,
    );
  }

  if (!isNonEmptyString(input.subject_role)) {
    throw new CoordValidationError('coord_emit: subject_role must be a non-empty string');
  }
  const subjectRole = input.subject_role;
  if (!isKnownRole(subjectRole, config)) {
    const known = config.roles.map((r) => r.name).join(', ');
    throw new CoordValidationError(
      `coord_emit: subject_role '${subjectRole}' is not in coord-roles.json (known: ${known})`,
    );
  }

  // Daemon-emitted events use a separate code path (the deadline tracker
  // appends `deadline_missed` atoms directly via fireMissedDeadline);
  // they should NEVER come through the user-facing coord_emit input
  // surface. Reject explicitly so a buggy caller can't impersonate the
  // daemon by emitting `deadline_missed`.
  if (registryEntry.subject_role_policy === 'daemon_emitted') {
    throw new CoordValidationError(
      `coord_emit: event_type '${eventType}' is daemon-emitted only and cannot be supplied by callers`,
    );
  }

  if (
    registryEntry.subject_role_policy === 'self_attestation' &&
    subjectRole !== emitterRole
  ) {
    throw new CoordValidationError(
      `coord_emit: self-attestation event '${eventType}' requires subject_role == emitter_role; got subject_role='${subjectRole}' but emitter_role='${emitterRole}'`,
    );
  }
  // Invocation events: subject_role may differ from emitter_role; the
  // `isKnownRole` check above is the only gate.

  if (!isNonEmptyString(input.emitted_at)) {
    throw new CoordValidationError('coord_emit: emitted_at must be a non-empty string');
  }
  if (!ISO_RE.test(input.emitted_at)) {
    throw new CoordValidationError(
      `coord_emit: emitted_at must be ISO 8601 (got '${input.emitted_at}')`,
    );
  }
  const emittedAt = input.emitted_at;

  let expectedBy: string | undefined;
  if (input.expected_by !== undefined) {
    if (!isNonEmptyString(input.expected_by) || !ISO_RE.test(input.expected_by)) {
      throw new CoordValidationError(
        `coord_emit: expected_by must be ISO 8601 if set (got '${String(input.expected_by)}')`,
      );
    }
    expectedBy = input.expected_by;
  }

  let payload: Record<string, unknown> | undefined;
  if (input.payload !== undefined) {
    if (!isPlainObject(input.payload)) {
      throw new CoordValidationError('coord_emit: payload must be a JSON object if set');
    }
    payload = input.payload;
  }

  // Tier-discriminated input. Round-tier: correlation_id required + tick_run_id forbidden.
  // Scheduler-tier: tick_run_id required + correlation_id forbidden. (r4 codex F1 MED.)
  const tier: CoordTier = registryEntry.tier;
  if (tier === 'round') {
    if (!isNonEmptyString(input.correlation_id)) {
      throw new CoordValidationError(
        `coord_emit: round-tier event '${eventType}' requires correlation_id (non-empty string)`,
      );
    }
    if (input.tick_run_id !== undefined) {
      throw new CoordValidationError(
        `coord_emit: round-tier event '${eventType}' must not carry tick_run_id (cross-tier field)`,
      );
    }
    const out: ValidatedCoordEmitInput = {
      tier: 'round',
      event_type: eventType,
      schema_version: registryEntry.schema_version,
      subject_role: subjectRole,
      correlation_id: input.correlation_id,
      emitted_at: emittedAt,
    };
    if (expectedBy !== undefined) (out as { expected_by?: string }).expected_by = expectedBy;
    if (payload !== undefined) (out as { payload?: Record<string, unknown> }).payload = payload;
    return out;
  }
  // tier === 'scheduler'
  if (!isNonEmptyString(input.tick_run_id)) {
    throw new CoordValidationError(
      `coord_emit: scheduler-tier event '${eventType}' requires tick_run_id (non-empty string)`,
    );
  }
  if (input.correlation_id !== undefined) {
    throw new CoordValidationError(
      `coord_emit: scheduler-tier event '${eventType}' must not carry correlation_id (cross-tier field)`,
    );
  }
  const out: ValidatedCoordEmitInput = {
    tier: 'scheduler',
    event_type: eventType,
    schema_version: registryEntry.schema_version,
    subject_role: subjectRole,
    tick_run_id: input.tick_run_id,
    emitted_at: emittedAt,
  };
  if (expectedBy !== undefined) (out as { expected_by?: string }).expected_by = expectedBy;
  if (payload !== undefined) (out as { payload?: Record<string, unknown> }).payload = payload;
  return out;
}
