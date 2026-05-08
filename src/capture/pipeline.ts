import type { CaptureEvent, EventId, Storage } from '../storage/interface.js';
import { gate, type RejectionReason } from './gate.js';

export type PipelineResult =
  | { accepted: true; id: EventId }
  | { accepted: false; reason: RejectionReason };

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
