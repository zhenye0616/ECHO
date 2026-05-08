// Single wire-shape projection point for the atom-shape MCP retrieval
// tools (search_memories, tail_session). Both call `projectMatch` so that
// adding a new cap, a new elided field, or a new metadata convention
// touches one file instead of N retrieval tools. Closes Bug A1, Bug A2,
// and the tail-session content-cap reach-gap surfaced 2026-05-08.
//
// Why a separate projector for matches (vs the cluster-shape projector
// inside recent-work-context.ts): the trace tool returns
// NormalizedContextEvent atoms (post-`normalizeEvent`) inside cluster
// envelopes; the search/tail tools return raw CaptureEvent rows directly.
// Different shapes, different surface area, different lifecycle stage.
// Sharing a caps table (./caps.ts) is the right unit of reuse; sharing a
// projector function is not.

import type { CaptureEvent } from '../../storage/interface.js';
import { WIRE_SHAPE_CAPS } from './caps.js';
import { clipMetadataValues, clipString } from './clip.js';

export interface ProjectedMatch {
  id: string;
  source: string;
  timestamp: string;
  /** Capped at WIRE_SHAPE_CAPS.match_content. When clipped, the format is
   *  head + elision marker + tail; `bytes_elided` carries the dropped count. */
  content: string;
  /** Set only when `content` was clipped. Original size reconstruction:
   *  retained-content-bytes - marker-bytes + bytes_elided. */
  bytes_elided?: number;
  /** Per-key clipped: any individual metadata value whose JSON-stringified
   *  form exceeds WIRE_SHAPE_CAPS.metadata_value is replaced by
   *  `{__elided: true, original_size: N}`. Other keys pass through verbatim. */
  metadata?: Record<string, unknown>;
  /** Set only when one or more metadata values were clipped. */
  metadata_bytes_elided?: number;
  /** Set only when one or more metadata values were clipped. Names the
   *  affected keys so the consumer can hydrate selectively if needed. */
  metadata_keys_elided?: string[];
}

/** Project a raw CaptureEvent (storage row) onto the consumer-budget-safe
 *  wire shape. Caller-agnostic: search_memories and tail_session both call
 *  this to enforce the same envelope discipline. */
export function projectMatch(e: CaptureEvent): ProjectedMatch {
  const content = clipString(e.content, WIRE_SHAPE_CAPS.match_content);
  const m: ProjectedMatch = {
    id: e.id,
    source: e.source,
    timestamp: e.timestamp,
    content: content.value,
  };
  if (content.bytes_elided > 0) m.bytes_elided = content.bytes_elided;
  if (e.metadata !== undefined) {
    const md = clipMetadataValues(e.metadata, WIRE_SHAPE_CAPS.metadata_value);
    m.metadata = md.metadata;
    if (md.bytes_elided > 0) m.metadata_bytes_elided = md.bytes_elided;
    if (md.keys_elided.length > 0) m.metadata_keys_elided = md.keys_elided;
  }
  return m;
}
