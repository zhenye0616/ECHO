// 057b AC7 — daemon-side coord atom emitter (internal attribution).
//
// The daemon writes a small set of coord atoms directly — bypassing the
// `coord_emit` MCP tool's X-Echo-Role identity gate because the daemon IS
// the authenticated emitter (it owns the process boundary; there's no
// header to spoof). This module codifies the pattern:
//   - source field      = `coord:<subject_role>` (per-role coord_status() bucket)
//   - metadata.coord.emitter_role = "daemon" (separates daemon-written
//                                              from wrapper-written atoms)
//   - metadata.coord.subject_role = <reviewer> (the role being tracked)
//
// Why a dedicated module (r2 codex-ops F2 HIGH): the daemon-attribution
// model is load-bearing for replay correctness, and coord_invoke needs to
// emit `reviewer_invoked` SYNCHRONOUSLY BEFORE the spawned child can
// emit anything (r5 codex-ops F1 HIGH causality). Putting the pattern in
// one auditable place keeps the contract self-consistent.
//
// 057a's `src/coord/deadlines.ts` writes `coord:deadline_missed` atoms
// inline via its own append path; this module does NOT modify it (Out of
// Scope says 057a substrate is consumed as-is). Both code paths produce
// the same source-attribution shape (`coord:<subject_role>`); the
// daemon-emitter attribution metadata is added by callers of this
// helper. A future consolidation pass can migrate 057a's inline append
// to this module — out of scope for 057b.

import type { DeadlineTracker } from './deadlines.js';
import { COORD_SESSION_ID, COORD_SOURCE_PREFIX, COORD_SURFACE } from './types.js';
import type { ValidatedCoordEmitInput } from './validate.js';
import { canonicalizeTimestamp } from '../capture/pipeline.js';
import type { EventId, Storage } from '../storage/interface.js';

/** Marker value for the `metadata.coord.emitter_role` field on atoms
 *  written by the daemon (as opposed to wrappers that emit via curl
 *  to the `coord_emit` MCP tool). Used by future consumers + by AC8
 *  attribution tests. */
export const DAEMON_EMITTER_ROLE = 'daemon';

export interface InternalReviewerInvokedArgs {
  subject_role: string;
  correlation_id: string;
  request_path: string;
  /** Optional override; defaults to "now" in ISO. */
  emitted_at?: string;
}

/** Append a `coord:reviewer_invoked` atom with daemon attribution AND
 *  feed the validated shape into the deadline tracker so the pre-spawn
 *  deadline opens BEFORE this function returns.
 *
 *  Causality contract (r5 codex-ops F1 HIGH): the storage.append + tracker
 *  ingest happen synchronously in this order. Callers (`coord_invoke`)
 *  spawn the child AFTER the awaited result of this call resolves. The
 *  child's eventual `tick_start` therefore cannot precede the
 *  `reviewer_invoked` atom in replay order.
 */
export async function emitReviewerInvoked(
  storage: Storage,
  deadlines: DeadlineTracker | null,
  args: InternalReviewerInvokedArgs,
): Promise<EventId> {
  const emittedAt = canonicalizeTimestamp(args.emitted_at ?? new Date().toISOString());
  const source = `${COORD_SOURCE_PREFIX}${args.subject_role}`;
  const metadata: Record<string, unknown> = {
    surface: COORD_SURFACE,
    session_id: COORD_SESSION_ID,
    coord: {
      event_type: 'reviewer_invoked',
      schema_version: 1,
      tier: 'round',
      subject_role: args.subject_role,
      correlation_id: args.correlation_id,
      emitter_role: DAEMON_EMITTER_ROLE,
      payload: { request_path: args.request_path },
    },
  };
  const id = await storage.append({
    source,
    timestamp: emittedAt,
    content: JSON.stringify({
      event_type: 'reviewer_invoked',
      tier: 'round',
      subject_role: args.subject_role,
    }),
    metadata,
  });
  if (deadlines !== null) {
    const validated: ValidatedCoordEmitInput = {
      tier: 'round',
      event_type: 'reviewer_invoked',
      schema_version: 1,
      subject_role: args.subject_role,
      correlation_id: args.correlation_id,
      emitted_at: emittedAt,
    };
    try {
      await deadlines.ingest(validated);
    } catch {
      // Tracker ingest must not fail the caller — the durable atom is
      // already appended. Periodic reconciliation closes any tracker skew.
    }
  }
  return id;
}
