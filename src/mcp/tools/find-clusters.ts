// V1.6 (item 030) — `find_clusters`: cheap, cross-source discovery primitive.
//
// Counterpart to `get_atoms` (which materialises bodies for ids you already
// have). The pair replaces the compound `get_recent_work_context` tool, whose
// >90% of envelope/truncation friction in V1.5 traced back to the all-in-one
// shape: discovery and body fetch shared one tool, so cap tuning could only
// trade off one against the other.
//
// Re-uses the trace cluster builder via `getRecentWorkContext` so the
// no-args 4h→24h auto-expand + TZ-naive warning + storage-cap warning
// machinery is shared. Differences from `get_recent_work_context`'s
// `format='skeleton'` wire shape:
//
//   - atom_ids[] is FULL (un-capped). Skeleton's 50-cap on atom_ids was the
//     load-bearing breakage — atom_ids is the input to `get_atoms`, so
//     silently dropping the tail of a >50-atom cluster would silently lose
//     bodies. The 50-cap stays for `open_loop_hints[]` only.
//   - `result_caps` (renamed from `truncation`) describes RESPONSE-LEVEL
//     budget application. `truncations: string[]` (per-FIELD clipping
//     inside an atom) lives on `get_atoms` results, not here. Different
//     concepts; different names. Spec §1 footnote.
//   - No atoms map — find_clusters is body-less discovery.
//   - Per-cluster `atom_ids_truncated`/`atom_ids_total` flags fire if a
//     single cluster's atom_ids alone would overflow the response budget.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Storage } from '../../storage/interface.js';
import type { Cluster, ResponseFormat } from '../../trace/types.js';
import { isoString } from '../util/iso8601.js';
import {
  getRecentWorkContext,
  MAX_LIMIT,
  SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP,
} from './recent-work-context.js';

const SCHEMA_VERSION = 1;

// Hard interactive ceiling for `JSON.stringify(result)`. Same 25k convention
// used by search/tail/recent-work-context tests. find_clusters is the cheap
// discovery counterpart — staying well under the ceiling is the whole point.
export const FIND_CLUSTERS_RESPONSE_BYTE_CEILING = 25_000;

// Per-cluster atom_ids[] is the load-bearing input to `get_atoms`. If a
// single cluster's atom_ids[] is large enough to dominate the response
// budget on its own (atom UUIDs are ~36 chars, so 200 IDs ≈ 7-8KB), we
// set `atom_ids_truncated: true` AND `atom_ids_total: number` so the
// consumer can either narrow the window OR explicitly accept partial
// coverage. Pre-computed cap: leave headroom for envelope + other
// clusters by capping at half the response ceiling. In practice almost
// no clusters trip this; it's a safety net, not a routine path.
export const PER_CLUSTER_ATOM_IDS_HARD_CAP = 200;

export const FIND_CLUSTERS_DESCRIPTION =
  // discriminator one-liner per item 025 MCP best-practices
  'Use when you need cross-source DISCOVERY of recent work threads — clusters of related events grouped by shared artifacts (files, repos, conversations) — but NOT the atom bodies. Pair with `get_atoms` to materialise bodies for any returned cluster\'s `atom_ids[]`.\n\n' +
  // cost class
  'Cost: cheap. Typical < 10k chars even on full-day windows; the discovery counterpart to the targeted `get_atoms` body fetch. Hard envelope ceiling: 25k chars.\n\n' +
  // params
  'PARAMETERS — IMPORTANT distinction (most-common foot-gun):\n' +
  '  • `window_hours` controls the **maximum cluster-gap** (the temporal gap allowed between atoms in a single cluster), NOT lookback. Default 4h cluster-gap.\n' +
  '  • `since` / `until` control the **lookback window** (which atoms are considered).\n' +
  '  Pass `since=now-24h` for a 24h LOOKBACK; passing `window_hours=24` widens the cluster-gap, which is rarely what you want.\n\n' +
  // no-args resume
  'NO-ARGS RESUME: when called with neither `since` nor `until`, the default 4h lookback auto-expands to 24h on a single retry if the 4h pass returned 0 clusters — covers "where did I leave off after a quiet stretch" without forcing the caller to pre-pick a span. Auto-expand fires a `[AUTO_EXPAND]`-prefixed warning so the implicit widen is visible.\n\n' +
  // shape
  'RETURNS: per-cluster {cluster_id, rank, rank_reason, atom_ids[] (FULL, un-capped — feed straight to `get_atoms`), source_breakdown ({source_app: count}), time_range, label?, open_loop_hints? (capped at ' +
  String(SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP) +
  ')}. No atom bodies. `result_caps` describes response-level budget application; per-cluster `atom_ids_truncated: true` + `atom_ids_total: N` fires if a single cluster\'s atom_ids[] would dominate the ceiling.';

const formatSchema = z.enum(['skeleton']);

export interface FindClustersParams {
  since?: string;
  until?: string;
  window_hours?: number;
  format?: 'skeleton';
}

export interface FindClustersCluster {
  cluster_id: string;
  rank: number;
  rank_reason: string[];
  /** FULL atom_ids[] — load-bearing input to `get_atoms`. Capped only by
   *  the per-cluster hard cap (very rarely fires). When the cap fires,
   *  `atom_ids_truncated: true` + `atom_ids_total: N` are set. */
  atom_ids: string[];
  /** Set ONLY when this cluster's atom_ids[] was clipped by the
   *  per-cluster hard cap. */
  atom_ids_truncated?: true;
  /** Set ONLY when atom_ids_truncated is true. The original count. */
  atom_ids_total?: number;
  source_breakdown: Record<string, number>;
  time_range: { from: string; to: string };
  label?: string;
  /** Body-less open-loop hints. Capped at SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP
   *  (head+tail). Useful for "is anything still open in this cluster?" without
   *  paying for hint text bodies. */
  open_loop_hints: { atom_id: string; resolved: boolean }[];
  /** Set when open_loop_hints[] was clipped by its cap. */
  open_loop_hints_omitted?: number;
}

export interface FindClustersResult {
  schema_version: 1;
  tool: 'find_clusters';
  query: {
    since: string;
    until: string;
    window_hours: number;
    format: 'skeleton';
  };
  clusters: FindClustersCluster[];
  /** RESPONSE-LEVEL budget application — distinct from per-FIELD clipping
   *  inside an atom (which lives in `truncations: string[]` on `get_atoms`
   *  results). Two different concepts; two different names. */
  result_caps: {
    clusters_returned: number;
    clusters_total: number;
    atoms_returned: number;
    atoms_total_in_window: number;
    truncated: boolean;
  };
  warnings: string[];
}

function clipOpenLoopHintsArray<T>(
  arr: readonly T[],
  cap: number,
): { kept: T[]; omitted: number } {
  if (arr.length <= cap) return { kept: [...arr], omitted: 0 };
  const headN = Math.floor(cap / 2);
  const tailN = cap - headN;
  return {
    kept: [...arr.slice(0, headN), ...arr.slice(arr.length - tailN)],
    omitted: arr.length - cap,
  };
}

function projectCluster(c: Cluster): FindClustersCluster {
  const hints = clipOpenLoopHintsArray(
    c.open_loop_hints,
    SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP,
  );
  // Per-cluster atom_ids hard cap. Keep head+tail so the consumer still
  // sees both ends of the cluster (relevant when the consumer paginates
  // get_atoms over the slice). Atom IDs are ~36 chars — even at the cap
  // this is ~7-8KB per cluster, well under the response ceiling.
  let atomIds: string[];
  let atomIdsTruncated: true | undefined;
  let atomIdsTotal: number | undefined;
  if (c.atom_ids.length <= PER_CLUSTER_ATOM_IDS_HARD_CAP) {
    atomIds = [...c.atom_ids];
  } else {
    const headN = Math.floor(PER_CLUSTER_ATOM_IDS_HARD_CAP / 2);
    const tailN = PER_CLUSTER_ATOM_IDS_HARD_CAP - headN;
    atomIds = [
      ...c.atom_ids.slice(0, headN),
      ...c.atom_ids.slice(c.atom_ids.length - tailN),
    ];
    atomIdsTruncated = true;
    atomIdsTotal = c.atom_ids.length;
  }

  const out: FindClustersCluster = {
    cluster_id: c.cluster_id,
    rank: c.rank,
    rank_reason: c.rank_reason,
    atom_ids: atomIds,
    source_breakdown: c.source_breakdown,
    time_range: c.time_range,
    open_loop_hints: hints.kept.map((h) => ({
      atom_id: h.atom_id,
      resolved: h.resolved,
    })),
  };
  if (c.label !== undefined) out.label = c.label;
  if (atomIdsTruncated !== undefined) out.atom_ids_truncated = atomIdsTruncated;
  if (atomIdsTotal !== undefined) out.atom_ids_total = atomIdsTotal;
  if (hints.omitted > 0) out.open_loop_hints_omitted = hints.omitted;
  return out;
}

export async function findClusters(
  storage: Storage,
  params: FindClustersParams,
  now: Date = new Date(),
): Promise<FindClustersResult> {
  // Re-use getRecentWorkContext for: no-args 4h→24h auto-expand,
  // TZ-naive warning, storage-cap warning, exclude_metadata_surface=['fs'].
  // Pass MAX_LIMIT so the trace-builder's atom-limit truncation does NOT
  // silently drop atom_ids from low-rank clusters — find_clusters' contract
  // is FULL atom_ids per returned cluster.
  //
  // `format: 'skeleton'` is passed through as a marker for the query echo,
  // even though we don't use the skeleton wire shape ourselves — atoms
  // map is computed but discarded; cost is bounded by MAX_LIMIT events.
  const format: ResponseFormat = params.format ?? 'skeleton';
  const rwc = await getRecentWorkContext(
    storage,
    {
      ...(params.since !== undefined ? { since: params.since } : {}),
      ...(params.until !== undefined ? { until: params.until } : {}),
      ...(params.window_hours !== undefined
        ? { window_hours: params.window_hours }
        : {}),
      limit: MAX_LIMIT,
      format,
    },
    now,
  );

  const clusters = rwc.clusters.map(projectCluster);
  const atomsReturned = clusters.reduce((sum, c) => sum + c.atom_ids.length, 0);

  return {
    schema_version: SCHEMA_VERSION,
    tool: 'find_clusters',
    query: {
      since: rwc.query.since,
      until: rwc.query.until,
      window_hours: rwc.query.window_hours,
      format,
    },
    clusters,
    result_caps: {
      clusters_returned: clusters.length,
      clusters_total: rwc.truncation.clusters_total,
      atoms_returned: atomsReturned,
      atoms_total_in_window: rwc.truncation.atoms_total_in_window,
      truncated: rwc.truncation.truncated,
    },
    warnings: rwc.warnings,
  };
}

const findClustersOutputSchema = {
  schema_version: z.literal(1),
  tool: z.literal('find_clusters'),
  query: z.object({
    since: z.string(),
    until: z.string(),
    window_hours: z.number(),
    format: z.literal('skeleton'),
  }),
  clusters: z.array(z.record(z.string(), z.unknown())),
  result_caps: z.object({
    clusters_returned: z.number(),
    clusters_total: z.number(),
    atoms_returned: z.number(),
    atoms_total_in_window: z.number(),
    truncated: z.boolean(),
  }),
  warnings: z.array(z.string()),
};

export function registerFindClusters(server: McpServer, storage: Storage): void {
  server.registerTool(
    'find_clusters',
    {
      description: FIND_CLUSTERS_DESCRIPTION,
      inputSchema: {
        since: isoString.optional(),
        until: isoString.optional(),
        window_hours: z.number().min(0.1).max(168).optional(),
        format: formatSchema.optional(),
      },
      outputSchema: findClustersOutputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      const params = input as FindClustersParams;
      const result = await findClusters(storage, params);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    },
  );
}
