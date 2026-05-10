import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { normalizeEvent } from '../../normalize/index.js';
import type { Storage } from '../../storage/interface.js';
import type { NormalizedContextEvent, SourceRef, TimeRef } from '../../normalize/types.js';
import { noUsefulCluster } from '../../trace/auto-expand.js';
import { buildRecentWorkContext, rankClusters, rankReasonsFor } from '../../trace/index.js';
import type {
  ArtifactHint,
  Cluster,
  Query,
  RecentWorkContextResponse,
  ResponseFormat,
} from '../../trace/types.js';
import { hasTzMarker, isoString, TZ_NAIVE_WARNING } from '../util/iso8601.js';
import { WIRE_SHAPE_CAPS } from '../wire-shape/caps.js';

// V1.6 (item 030) deprecation marker. Removal is gated on item 031 after a
// 1–2 week dogfooding period — keeping the tool callable in the meantime so
// in-flight consumers don't break. Marker is text-only; no behavior change.
export const RECENT_WORK_CONTEXT_DEPRECATION_MARKER =
  '**[DEPRECATED 2026-05-09 — use `find_clusters` + `get_atoms` instead. ' +
  'This tool will be removed in item 031 after a 1-2 week dogfooding period. ' +
  'Migration recipe in description below.]**\n\n' +
  'Migration:\n' +
  "  OLD: get_recent_work_context(window_hours=24, format='minimal')\n" +
  '       // window_hours=24 in the OLD shape was being misused as lookback —\n' +
  '       // it actually controls cluster-gap (the temporal gap allowed between\n' +
  '       // atoms in a single cluster). The default lookback was 4h via the\n' +
  '       // V1.5.7 auto-expand path. Migration uses since= for explicit\n' +
  '       // lookback, NOT window_hours=.\n' +
  '\n' +
  '  NEW: c = find_clusters(since=now-24h)        // explicit 24h lookback\n' +
  "       // (omit since= to get find_clusters' V1.5.7-equivalent no-args\n" +
  '       // semantics: 4h default, auto-expand to 24h if empty.)\n' +
  '       //\n' +
  '       // Inspect c.clusters[]: each has rank, label, source_breakdown,\n' +
  '       // time_range, atom_ids[]. Pick the cluster matching your intent\n' +
  '       // (typically rank-1 for "where did I leave off", but read label +\n' +
  '       // source_breakdown before picking — the resume target may be a\n' +
  '       // sibling).\n' +
  '       picked = c.clusters[0]                   // or whichever matches intent\n' +
  '       //\n' +
  '       // get_atoms accepts ≤50 ids per call. If picked.atom_ids.length > 50,\n' +
  '       // partition into chunks and concat results:\n' +
  '       //   chunks = chunk(picked.atom_ids, 50)\n' +
  "       //   a = flatMap(chunks, ids => get_atoms(ids, format='minimal'))\n" +
  "       a = get_atoms(picked.atom_ids, format='minimal')   // single call if ≤50\n" +
  '\n' +
  '  RESUME-STYLE QUERIES (item 032): for "where did I leave off after a gap":\n' +
  "       - Pass `prefer='newest_first'` to `get_atoms` so the prefix-drop on\n" +
  '         envelope overflow drops the OLDEST atom (and missing IDs) first,\n' +
  '         not the freshest — the freshest is exactly what the resume caller\n' +
  '         needs.\n' +
  '       - No-args `find_clusters()` now auto-expands to 24h when the only\n' +
  "         returned cluster is the calling session's own recent activity\n" +
  '         (single-source-recent), AND demotes that cluster so prior\n' +
  '         multi-source work surfaces at clusters[0].\n' +
  '\n' +
  '---\n\n';

export const RECENT_WORK_CONTEXT_DESCRIPTION =
  RECENT_WORK_CONTEXT_DEPRECATION_MARKER +
  "Retrieve clusters of related events from the user's captured ECHO memories — " +
  'joined by shared artifacts (files, repos, conversations) within a recent time window. ' +
  'Use when the user asks open-ended questions about recent work across their tools — ' +
  'their own activity, or another agent/app on the same machine ("what is Codex/Claude ' +
  'Code working on?" — answered via `cluster.source_breakdown`, which counts atoms per ' +
  'app inside each cluster). Also: where they left off, or to bring prior context ' +
  '(Cursor + Claude Code + Codex + git) into the current conversation. Returns one ' +
  'cluster per coherent work thread; the AI client decides which to attend to. `cluster.edges[]` is signal-bearing — pairs joined ' +
  'only by scope (repo/workspace) or session (conversation/thread) artifacts are ' +
  'omitted, so `edges.length` is no longer guaranteed to equal C(N, 2); use ' +
  '`cluster.atom_ids[]` for membership. `cluster.open_loop_hints[].resolved` ' +
  'indicates whether the hint has a downstream closure signal in the same window ' +
  '(heuristic — treat as a hint, not a guarantee). ' +
  'DEFAULTS (cost-safer): `limit=20`, `format="minimal"` — every retrieval pays ' +
  "twice through tool-result budgets (the AI client's, then the user's chat), so " +
  'minimal is the right starting point. Three-format ladder by cost ordering: ' +
  '`format:"skeleton"` (cheapest — ids + label + counts only, drops artifacts/' +
  'actors/provenance/cluster-edges/open-loop-hint-bodies; typical < 10k chars ' +
  'even on full-day windows; use for low-budget context-pull / "where did I ' +
  'leave off" / resume calls), `format:"minimal"` (default — atom heads with ' +
  'action.input/output clipped to 500 chars; uncapped sub-collections still ' +
  'pass through, so realistic claude_code days can exceed the consumer 25k ' +
  'budget), `format:"full"` (debug — verbatim atom envelopes, only for offline ' +
  'inspection). `limit` may be raised up to MAX_LIMIT=500 for offline/batch ' +
  'consumers but is rarely the right choice for interactive AI-client paths. ' +
  'Pass `window_hours` to control the maximum temporal ' +
  'gap between atoms in a single cluster; when omitted it is inferred from the ' +
  '(since, until) span (equal to span when ≤ 4h, otherwise min(span, 24h)) — for ' +
  '"where did I leave off after a break" queries, span-equal inference lets a single ' +
  'cluster bridge an overnight gap. `since` and `until` should always carry an explicit ' +
  'timezone (`Z` for UTC or `+HH:MM` offset); naive ISO strings are parsed as local ' +
  'server time, which is rarely what an AI client intends. NO-ARGS RESUME: when ' +
  'called with neither `since` nor `until`, the default 4h window auto-expands to ' +
  '24h on a single retry if the 4h pass returns 0 clusters — covers "where did I ' +
  'leave off after a quiet stretch" without forcing the caller to pre-pick a span. ' +
  'Auto-expand fires a `[AUTO_EXPAND]`-prefixed warning so the implicit widen is visible.';

// Cost-safer defaults (item 025): every retrieval today blew the consumer's
// 25k-char tool-result budget on first try (dogfooding 2026-05-08 entries
// 13:27 PDT and 14:43 PDT) even with explicit `format='minimal'`, `limit=50`.
// The previous defaults (`limit=100`, `format='full'`) were materially more
// expensive than what already overflowed; flipping them shifts the cost
// burden onto callers who explicitly opt into 'full'.
//
// The spec called for DEFAULT_LIMIT=25, but envelope-byte-size measurements on
// a realistic 200-atom multi-file fixture showed 25 atoms produced ~27kB
// envelopes — over the 25k budget the test enforces. Per the spec's explicit
// escape hatch ("If the test fails post-implementation, lower DEFAULT_LIMIT
// further or open a V1.6 follow-up for `format: 'skeleton'` — do NOT silently
// accept a passing-with-warnings response"), we lower to 20: at limit=20 the
// realistic-fixture envelope is ~22k, comfortably under 25k.
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 500;
export const DEFAULT_WINDOW_HOURS = 4;
export const STORAGE_OVERFETCH = 10;

// V1.5.7 polish (2026-05-09): no-args resume auto-expand. The 4h default
// is right for "what just happened" but wrong for "where did I leave off
// after a quiet stretch" — the morning's resume call returned 0 clusters
// because the last activity was ~5h back. When the caller passes neither
// `since` nor `until`, fall through to a single retry at this wider
// window if the 4h pass was empty. The retry only fires on the no-args
// shape: an explicit `since`/`until` is a deliberate window choice we
// must respect.
export const NO_ARGS_AUTO_EXPAND_WINDOW_HOURS = 24;
// V1.5.6: re-export from the shared wire-shape caps table so all three
// retrieval tools see one source of truth. Behavior unchanged from item 025.
export const MINIMAL_CONTENT_CAP = WIRE_SHAPE_CAPS.minimal_action;

const artifactHintSchema = z.object({
  provider: z.string(),
  type: z.string(),
  id: z.string(),
});

const formatSchema = z.enum(['full', 'minimal', 'skeleton']);

// Item 028: caller-controlled head-clip on the surrogate `action.summary` we
// synthesize for skeleton atoms. 200 chars is enough to disambiguate the atom
// in a resume briefing without re-introducing the action.input/output bytes
// minimal mode already caps at 500. V1.5.6: re-exported from the shared
// wire-shape caps table.
export const SKELETON_SUMMARY_CAP = WIRE_SHAPE_CAPS.skeleton_summary;

// V1.5.7 (Gap 4, surfaced 2026-05-08 17:01 PDT v1.5-livetest): per-cluster
// bounds on skeleton-mode arrays. At limit=100 over 48h, the dominant
// cluster carried 273 atoms — atom_ids[] alone (UUIDs × 273) + one
// open_loop_hint per atom blew the consumer 25k budget at 53,413 chars.
// 028's review notes flagged the 3% headroom risk explicitly.
//
// Cap shape: when a cluster's atom_ids or open_loop_hints exceeds the cap,
// keep first N/2 + last N/2 entries and emit a `*_omitted` integer field
// per omission. Mirrors the V1.5.6/V1.5.6.1 elision-bookkeeping pattern
// (bytes_elided, metadata_keys_elided): consumer can detect omission
// programmatically and decide whether to re-query with smaller `limit`
// or hydrate the cluster via a future deep-dive primitive.
export const SKELETON_CLUSTER_ATOM_IDS_CAP = 50;
export const SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP = 30;

export interface SkeletonAtom {
  id: NormalizedContextEvent['id'];
  // Keep the full TimeRef sub-object: its three optional fields are tiny
  // (occurred_at + maybe observed_at + duration_ms) and the AI client needs
  // the timestamp to order atoms across a resume briefing.
  time: TimeRef;
  // Keep the full SourceRef: app + surface + raw_pointer + optional account.
  // raw_pointer is the only realistically heavy field (~80 chars on fs:
  // pointers) but it is the only stable handle for follow-up tail_session /
  // search_memories calls. Drop it and skeleton mode loses its primary
  // affordance for hydration.
  source: SourceRef;
  // 200-char head-clip surrogate. Spec acceptance refers to "action.summary";
  // the underlying NormalizedContextEvent type carries `action.input` /
  // `action.output` instead, so we synthesize a summary by clipping the head
  // of input ?? output. Matches the spec's intent ("a head-clipped action
  // summary") against the actual schema.
  action: {
    kind: NormalizedContextEvent['action']['kind'];
    summary?: string;
  };
}

export interface SkeletonOpenLoopHint {
  atom_id: string;
  resolved: boolean;
}

export interface SkeletonCluster {
  cluster_id: Cluster['cluster_id'];
  rank: Cluster['rank'];
  rank_reason: Cluster['rank_reason'];
  label?: Cluster['label'];
  // Drop anchor_artifacts (ArtifactRef[] body), edges (Edge[] body), and the
  // open_loop_hints text/kind/confidence body. Keep the affordances that make
  // skeleton mode useful for the resume use case: id + label + atom_ids +
  // source_breakdown + time_range + minimal-shape hints.
  //
  // V1.5.7 (Gap 4): atom_ids and open_loop_hints capped per-cluster. When
  // the original exceeded the cap, head + tail kept and an `*_omitted`
  // integer surfaces the dropped count.
  atom_ids: Cluster['atom_ids'];
  source_breakdown: Cluster['source_breakdown'];
  time_range: Cluster['time_range'];
  open_loop_hints: SkeletonOpenLoopHint[];
  /** V1.5.7 (Gap 4): set only when atom_ids was clipped. */
  atom_ids_omitted?: number;
  /** V1.5.7 (Gap 4): set only when open_loop_hints was clipped. */
  open_loop_hints_omitted?: number;
  /** V1.5.7 (Gap 4): true when EITHER atom_ids or open_loop_hints was
   *  clipped — convenience flag so consumers can branch without checking
   *  both omission counters. */
  truncated?: boolean;
}

export interface SkeletonResponse {
  schema_version: RecentWorkContextResponse['schema_version'];
  tool: RecentWorkContextResponse['tool'];
  query: RecentWorkContextResponse['query'];
  truncation: RecentWorkContextResponse['truncation'];
  warnings: RecentWorkContextResponse['warnings'];
  clusters: SkeletonCluster[];
  atoms: Record<string, SkeletonAtom>;
}

export function applySkeletonAtom(atom: NormalizedContextEvent): SkeletonAtom {
  // Source for the surrogate summary: prefer action.input (the user/originator
  // turn) over action.output (the assistant reply) — the resume use case is
  // "what did I do," not "what did the assistant say back." Falls through to
  // output only when input is missing (rare; e.g., assistant-only atoms).
  const summarySrc = atom.action.input ?? atom.action.output;
  const summary =
    summarySrc !== undefined && summarySrc.length > 0
      ? summarySrc.slice(0, SKELETON_SUMMARY_CAP)
      : undefined;
  const skeleton: SkeletonAtom = {
    id: atom.id,
    time: atom.time,
    source: atom.source,
    action: { kind: atom.action.kind },
  };
  if (summary !== undefined) {
    skeleton.action.summary = summary;
  }
  return skeleton;
}

/** Head + tail clip on an array. When `arr.length <= cap`, returns the
 *  array verbatim with omitted=0. Otherwise keeps `floor(cap/2)` from the
 *  front and `ceil(cap/2)` from the back; reports the dropped count. */
function clipArray<T>(arr: readonly T[], cap: number): { kept: T[]; omitted: number } {
  if (arr.length <= cap) return { kept: [...arr], omitted: 0 };
  const headN = Math.floor(cap / 2);
  const tailN = cap - headN;
  return {
    kept: [...arr.slice(0, headN), ...arr.slice(arr.length - tailN)],
    omitted: arr.length - cap,
  };
}

export function applySkeletonCluster(cluster: Cluster): SkeletonCluster {
  // V1.5.7 (Gap 4): per-cluster bounds. Pre-fix, a 273-atom dominant cluster
  // at limit=100 produced a 53,413-char skeleton response (>25k consumer
  // budget). Cap atom_ids and open_loop_hints to head+tail; surface the
  // omission count so the consumer can choose to re-query narrower.
  const aIds = clipArray(cluster.atom_ids, SKELETON_CLUSTER_ATOM_IDS_CAP);
  const hints = clipArray(cluster.open_loop_hints, SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP);
  const skeleton: SkeletonCluster = {
    cluster_id: cluster.cluster_id,
    rank: cluster.rank,
    rank_reason: cluster.rank_reason,
    atom_ids: aIds.kept,
    source_breakdown: cluster.source_breakdown,
    time_range: cluster.time_range,
    open_loop_hints: hints.kept.map((h) => ({
      atom_id: h.atom_id,
      resolved: h.resolved,
    })),
  };
  if (cluster.label !== undefined) {
    skeleton.label = cluster.label;
  }
  if (aIds.omitted > 0) skeleton.atom_ids_omitted = aIds.omitted;
  if (hints.omitted > 0) skeleton.open_loop_hints_omitted = hints.omitted;
  if (aIds.omitted > 0 || hints.omitted > 0) skeleton.truncated = true;
  return skeleton;
}

export interface RecentWorkContextParams {
  since?: string;
  until?: string;
  artifact_hint?: ArtifactHint;
  limit?: number;
  window_hours?: number;
  format?: ResponseFormat;
}

export function truncateForMinimal(s: string | undefined): string | undefined {
  if (s === undefined) return undefined;
  if (s.length <= MINIMAL_CONTENT_CAP) return s;
  const dropped = s.length - MINIMAL_CONTENT_CAP;
  return (
    s.slice(0, MINIMAL_CONTENT_CAP) +
    `… [truncated; ${dropped} chars omitted; fetch full atom via search_memories]`
  );
}

function applyMinimal(atom: NormalizedContextEvent): NormalizedContextEvent {
  const input = truncateForMinimal(atom.action.input);
  const output = truncateForMinimal(atom.action.output);
  if (input === atom.action.input && output === atom.action.output) {
    return atom;
  }
  const nextAction: NormalizedContextEvent['action'] = { ...atom.action };
  if (input === undefined) delete nextAction.input;
  else nextAction.input = input;
  if (output === undefined) delete nextAction.output;
  else nextAction.output = output;
  return { ...atom, action: nextAction };
}

function clampLimit(input: number | undefined): number {
  if (input === undefined) return DEFAULT_LIMIT;
  const floored = Math.floor(input);
  return Math.min(Math.max(1, floored), MAX_LIMIT);
}

// V1.5.7 (Gap 6): TZ-marker check now lives in src/mcp/util/iso8601.ts so
// search_memories (and any future since/until-bearing tool) shares the
// same validation. Re-exported here for backward compatibility with any
// consumer that already imported `hasTzMarker` from this module.
export { hasTzMarker } from '../util/iso8601.js';

// Span-driven default for window_hours. When the caller passes an explicit
// value, that wins. Otherwise: short spans (≤4h) reuse the span exactly so a
// 1h "what did I just do" query produces a tight 1h cluster cap; longer spans
// cap at 24h to prevent week-long mega-clusters but still let overnight gaps
// resolve into a single cluster.
export function inferWindowHours(
  sinceMs: number,
  untilMs: number,
  explicit: number | undefined,
): number {
  if (explicit !== undefined) return explicit;
  const spanHours = (untilMs - sinceMs) / 3_600_000;
  // Degenerate input (NaN dates, since >= until, zero span) falls back to the
  // 4h baseline rather than 0, so a malformed query still produces a usable
  // (if narrow) cluster cap instead of suppressing all edges.
  if (!Number.isFinite(spanHours) || spanHours <= 0) return DEFAULT_WINDOW_HOURS;
  if (spanHours <= 4) return spanHours;
  return Math.min(spanHours, 24);
}

// Single-pass query + trace build. Extracted so the no-args auto-expand
// path can call it twice (4h, then 24h) without duplicating the storage
// query / cap-warning logic.
async function runRecentWorkContextPass(
  storage: Storage,
  since: string,
  until: string,
  limit: number,
  windowHours: number,
  format: ResponseFormat,
  artifactHint: ArtifactHint | undefined,
): Promise<RecentWorkContextResponse> {
  const storageCap = limit * STORAGE_OVERFETCH;
  const events = await storage.query({
    since,
    until,
    limit: storageCap,
    // Raw fs-watcher change events (`metadata.surface === 'fs'`) normalize to
    // null and thus consume the storage cap without contributing to the trace
    // input. Filtering them at the storage-query layer (P1) keeps the cap budget
    // available for real conversation/git atoms. The conversation atoms riding
    // the same `fs:/Users/...` source prefix carry richer per-extractor metadata
    // (no `surface: 'fs'`), so they are unaffected.
    exclude_metadata_surface: ['fs'],
  });

  const query: Query = {
    since,
    until,
    limit,
    window_hours: windowHours,
    format,
  };
  if (artifactHint !== undefined) {
    query.artifact_hint = artifactHint;
  }

  const response = buildRecentWorkContext(events, query, normalizeEvent);

  // Storage-cap silent-truncation guard. When the storage query returned
  // exactly `limit * STORAGE_OVERFETCH` rows, additional in-window atoms may
  // have been silently dropped at the storage layer; surface a single warning
  // so the consumer can raise `limit` or narrow `(since, until)`.
  if (events.length === storageCap) {
    response.warnings.push(
      'storage cap hit (events.length === limit * STORAGE_OVERFETCH); ' +
        'atoms in window may be silently truncated. ' +
        'Raise limit or narrow (since, until) to retain them.',
    );
  }

  return response;
}

export async function getRecentWorkContext(
  storage: Storage,
  params: RecentWorkContextParams,
  now: Date = new Date(),
): Promise<RecentWorkContextResponse> {
  const limit = clampLimit(params.limit);
  const windowMs = DEFAULT_WINDOW_HOURS * 60 * 60 * 1000;
  const until = params.until ?? now.toISOString();
  const since = params.since ?? new Date(Date.parse(until) - windowMs).toISOString();
  // Default flipped to 'minimal' (item 025): full content envelopes routinely
  // exceed the consumer's 25k-char tool-result budget on first call.
  const format: ResponseFormat = params.format ?? 'minimal';

  const sinceMs = Date.parse(since);
  const untilMs = Date.parse(until);
  const windowHours = inferWindowHours(sinceMs, untilMs, params.window_hours);

  let response = await runRecentWorkContextPass(
    storage,
    since,
    until,
    limit,
    windowHours,
    format,
    params.artifact_hint,
  );

  // V1.5.7 polish (2026-05-09) + item 032 (2026-05-10): no-args auto-expand
  // with generalized trigger predicate. The 4h default is right for
  // "what just happened" but wrong for "where did I leave off after a
  // quiet stretch." When the caller passed neither `since` nor `until`
  // AND `noUsefulCluster(4h)` is true (either 0 clusters — the historic
  // "empty" trigger — OR every returned cluster is single-source-recent,
  // i.e. the calling AI client's own session noise from the last 5
  // minutes), retry once at 24h. Annotate the warning with the trigger
  // label so the consumer can see why the implicit widen fired. When the
  // trigger is `single-source-recent`, re-rank the 24h clusters with
  // `demoteSingleSourceRecent=true` so prior multi-source work surfaces
  // at clusters[0] regardless of the noise cluster's other rank signals
  // (matches_artifact_hint, has_open_loop, recent_activity, size, age).
  // See item 032 AC1 + R2-2 for the strict-partition rationale.
  const isNoArgsShape = params.since === undefined && params.until === undefined;
  if (isNoArgsShape && NO_ARGS_AUTO_EXPAND_WINDOW_HOURS > DEFAULT_WINDOW_HOURS) {
    const nowMs = now.getTime();
    const atomsByIdFor = (r: RecentWorkContextResponse): Map<string, NormalizedContextEvent> =>
      new Map(Object.entries(r.atoms));
    const fourHourClustersAreUseless = noUsefulCluster(
      response.clusters,
      atomsByIdFor(response),
      nowMs,
    );
    if (fourHourClustersAreUseless) {
      // Identify the trigger label BEFORE the retry. `empty` and
      // `single-source-recent` both satisfy `noUsefulCluster` (empty is
      // vacuously true); the consumer distinguishes them via the warning.
      const trigger: 'empty' | 'single-source-recent' =
        response.clusters.length === 0 ? 'empty' : 'single-source-recent';

      const expandedWindowMs = NO_ARGS_AUTO_EXPAND_WINDOW_HOURS * 60 * 60 * 1000;
      const expandedSince = new Date(Date.parse(until) - expandedWindowMs).toISOString();
      const expandedSinceMs = Date.parse(expandedSince);
      const expandedWindowHours = inferWindowHours(expandedSinceMs, untilMs, params.window_hours);
      response = await runRecentWorkContextPass(
        storage,
        expandedSince,
        until,
        limit,
        expandedWindowHours,
        format,
        params.artifact_hint,
      );

      // Apply the rank demotion ONLY when the single-source-recent trigger
      // fired. The empty trigger needs no demotion by construction (no
      // single-source-recent cluster existed in the 4h pass; the 24h set
      // is ranked in normal order). Single-source-recent trigger means
      // the 24h set may contain BOTH the noise cluster AND the prior
      // multi-source work — strict partition is the demo-bar guarantee.
      if (trigger === 'single-source-recent') {
        const atomsById24h = atomsByIdFor(response);
        const queryEcho: Query = {
          since: response.query.since,
          until: response.query.until,
          limit,
          window_hours: response.query.window_hours,
          format,
        };
        if (params.artifact_hint !== undefined) {
          queryEcho.artifact_hint = params.artifact_hint;
        }
        const reranked = rankClusters(response.clusters, atomsById24h, queryEcho, {
          demoteSingleSourceRecent: true,
          nowMs,
        });
        reranked.forEach((c, i) => {
          c.rank = i + 1;
          c.rank_reason = rankReasonsFor(c, atomsById24h, queryEcho);
        });
        response.clusters = reranked;
      }

      response.warnings.push(
        `[AUTO_EXPAND] ${trigger} no-args call: 4h default ${
          trigger === 'empty'
            ? 'returned 0 clusters'
            : "returned only single-source-recent clusters (likely the calling session's own activity)"
        }; auto-expanded to ${NO_ARGS_AUTO_EXPAND_WINDOW_HOURS}h. ` +
          'Pass explicit `since`/`until` to suppress this fallback.',
      );
    }
  }

  // Surface a single warning when the caller passed naive (TZ-less) timestamps.
  // Naive strings are accepted by the schema regex but Date.parse interprets
  // them as local server time, which is rarely intended by an AI client.
  // Idempotent — one warning per request even if both inputs are naive.
  if (
    (params.since !== undefined && !hasTzMarker(params.since)) ||
    (params.until !== undefined && !hasTzMarker(params.until))
  ) {
    response.warnings.push(TZ_NAIVE_WARNING);
  }

  if (format === 'minimal') {
    const minimalAtoms: Record<string, NormalizedContextEvent> = {};
    for (const [id, atom] of Object.entries(response.atoms)) {
      minimalAtoms[id] = applyMinimal(atom);
    }
    return { ...response, atoms: minimalAtoms };
  }

  // Skeleton transform is applied by the MCP registration layer at the wire
  // boundary (`buildSkeletonResponse` returns a SkeletonResponse, which is a
  // structurally distinct shape from RecentWorkContextResponse). Keeping the
  // transform out of `getRecentWorkContext` lets non-MCP callers (e.g.
  // tools/validate-resolution.ts) keep the strong RecentWorkContextResponse
  // return type without conditional narrowing.

  return response;
}

// Item 028: build a skeleton-mode response by replacing every atom with its
// stripped variant and every cluster with its stripped variant. The return
// type intentionally widens to the union — the MCP tool serializer is
// permissive (z.record on outputSchema bodies), so a skeleton response with
// flatter atoms/clusters validates against the same outputSchema.
export function buildSkeletonResponse(response: RecentWorkContextResponse): SkeletonResponse {
  const skeletonAtoms: Record<string, SkeletonAtom> = {};
  for (const [id, atom] of Object.entries(response.atoms)) {
    skeletonAtoms[id] = applySkeletonAtom(atom);
  }
  return {
    schema_version: response.schema_version,
    tool: response.tool,
    query: response.query,
    truncation: response.truncation,
    warnings: response.warnings,
    clusters: response.clusters.map(applySkeletonCluster),
    atoms: skeletonAtoms,
  };
}

// outputSchema for get_recent_work_context. Mirror the FULL top-level key set
// of `RecentWorkContextResponse` (`src/trace/types.ts:78-87`) so the SDK can
// validate every real response without rejecting on a missing `schema_version`
// or `tool` field. Deeply nested cluster/atom/edge bodies use permissive
// `z.record` / `z.array(z.unknown())` because their internal contract is
// still moving (items 016–022 reshape them); locking the agent into deep
// validation here would lock V1.5/V1.6 trace work behind a schema migration.
// This scoping is intentional: exact on top-level keys, permissive on bodies.
const recentWorkContextOutputSchema = {
  schema_version: z.literal(1),
  tool: z.literal('get_recent_work_context'),
  query: z.record(z.string(), z.unknown()),
  clusters: z.array(z.record(z.string(), z.unknown())),
  atoms: z.record(z.string(), z.record(z.string(), z.unknown())),
  truncation: z.record(z.string(), z.unknown()),
  warnings: z.array(z.string()),
};

export function registerRecentWorkContext(server: McpServer, storage: Storage): void {
  server.registerTool(
    'get_recent_work_context',
    {
      description: RECENT_WORK_CONTEXT_DESCRIPTION,
      inputSchema: {
        since: isoString.optional(),
        until: isoString.optional(),
        artifact_hint: artifactHintSchema.optional(),
        limit: z.number().optional(),
        window_hours: z.number().min(0.1).max(168).optional(),
        format: formatSchema.optional(),
      },
      outputSchema: recentWorkContextOutputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      const params = input as RecentWorkContextParams;
      const full = await getRecentWorkContext(storage, params);
      // Apply skeleton at the wire boundary so the in-process function
      // signature stays narrow. SkeletonResponse and RecentWorkContextResponse
      // both serialize to a JSON object that validates against the permissive
      // outputSchema (top-level keys are exact; inner bodies are z.record /
      // z.array(z.unknown()), so a flatter atom/cluster body still passes).
      const result: RecentWorkContextResponse | SkeletonResponse =
        params.format === 'skeleton' ? buildSkeletonResponse(full) : full;
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    },
  );
}
