import { createLogger } from '../logging/index.js';
import type { CaptureEvent, EventId, Storage } from '../storage/interface.js';
import { gate, type RejectionReason } from './gate.js';

const log = createLogger('capture.pipeline');

/** Gate rejections plus the pipeline's own post-gate canonicalization
 *  rejection: the gate only requires a non-empty timestamp string, so an
 *  unparseable instant (e.g. "n/a") is detected here, not there. */
export type PipelineRejectionReason = RejectionReason | 'invalid_timestamp';

export type PipelineResult =
  | { accepted: true; id: EventId }
  | { accepted: false; reason: PipelineRejectionReason };

// Single capture-pipeline chokepoint that all surfaces flow through. Surfaces
// emit timestamps in any ISO 8601 TZ form (git-watcher uses `±HH:MM` from
// `git log %aI`; JSONL extractors use `Z`); we normalize to canonical `Z` here
// so storage's lex-compare WHERE clauses across mixed forms stop silently
// dropping events from time windows. Naive (TZ-less) inputs are assumed UTC
// (N1 policy) — a defensive stance for future surfaces; current surfaces don't
// emit naive timestamps.
const TZ_MARKER_RE = /Z$|[+-]\d{2}(?::?\d{2})?$/;

export function canonicalizeTimestamp(ts: string): string {
  const withTz = TZ_MARKER_RE.test(ts) ? ts : ts + 'Z';
  return new Date(withTz).toISOString();
}

export async function processCandidate(event: unknown, storage: Storage): Promise<PipelineResult> {
  const result = gate(event);
  if (!result.accepted) {
    return { accepted: false, reason: result.reason };
  }

  const validated = event as {
    source: string;
    timestamp: string;
    content: string;
    metadata?: Record<string, unknown>;
  };

  // Guard canonicalization: the gate only checks for a non-empty string, so
  // an unparseable instant would otherwise throw RangeError AFTER gate-accept
  // — poisoning extractor batch loops (offset never advances past the bad
  // line) and watcher emit paths. Reject like a gate rejection instead so
  // callers' existing "rejected turns are dropped while offset advances"
  // semantics apply.
  const withTz = TZ_MARKER_RE.test(validated.timestamp)
    ? validated.timestamp
    : validated.timestamp + 'Z';
  if (Number.isNaN(new Date(withTz).getTime())) {
    log.warn('rejected', { reason: 'invalid_timestamp', source: validated.source });
    return { accepted: false, reason: 'invalid_timestamp' };
  }

  const toAppend: Omit<CaptureEvent, 'id'> = {
    source: validated.source,
    timestamp: canonicalizeTimestamp(validated.timestamp),
    content: validated.content,
  };
  if (validated.metadata !== undefined) {
    toAppend.metadata = validated.metadata;
  }

  const id = await storage.append(toAppend);
  return { accepted: true, id };
}
