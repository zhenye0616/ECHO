import { createHash } from 'node:crypto';
import type { CaptureEvent } from '../storage/interface.js';
import type { ArtifactRef, NormalizedContextEvent } from '../normalize/types.js';
import {
  artifactKey,
  buildGraph,
  connectedComponents,
  DEFAULT_WINDOW_HOURS,
} from './cluster.js';
import { enrichHints } from './hints.js';
import { heuristicLabel } from './labels.js';
import { rankClusters, rankReasonsFor } from './rank.js';
import type {
  Cluster,
  Query,
  RecentWorkContextResponse,
} from './types.js';

export type {
  ArtifactHint,
  ArtifactKey,
  Cluster,
  Confidence,
  Edge,
  EdgeKind,
  Graph,
  OpenLoopHintEnriched,
  OpenLoopHintKind,
  Query,
  QueryEcho,
  RankSignals,
  RawCluster,
  RecentWorkContextResponse,
  Truncation,
} from './types.js';
export {
  artifactKey,
  buildGraph,
  connectedComponents,
  DEFAULT_WINDOW_HOURS,
} from './cluster.js';
export { rankClusters, rankReasonsFor } from './rank.js';
export { heuristicLabel } from './labels.js';
export { enrichHints } from './hints.js';

const SCHEMA_VERSION = 1;

export function buildRecentWorkContext(
  events: CaptureEvent[],
  query: Query,
  normalize: (event: CaptureEvent) => NormalizedContextEvent | null,
): RecentWorkContextResponse {
  const sinceMs = Date.parse(query.since);
  const untilMs = Date.parse(query.until);
  const limit = query.limit ?? 100;
  const windowHours = query.window_hours ?? DEFAULT_WINDOW_HOURS;

  // 1. Normalize and filter to window
  const atoms: NormalizedContextEvent[] = [];
  for (const e of events) {
    const a = normalize(e);
    if (a === null) continue;
    const t = Date.parse(a.time.occurred_at);
    if (Number.isNaN(t)) continue;
    if (t < sinceMs || t > untilMs) continue;
    atoms.push(a);
  }
  const atomsById = new Map(atoms.map((a) => [a.id, a]));
  const atomsTotalInWindow = atoms.length;

  // 2. Graph + components
  const graph = buildGraph(atoms, windowHours);
  const rawClusters = connectedComponents(graph);

  // 3. Compute cluster fields
  let clusters: Cluster[] = rawClusters.map((rc) => {
    const clusterAtoms = rc.atom_ids
      .map((id) => atomsById.get(id))
      .filter((a): a is NormalizedContextEvent => a !== undefined);
    const cluster_id = makeClusterId(rc.atom_ids);
    const label = heuristicLabel(clusterAtoms);
    const open_loop_hints = enrichHints(clusterAtoms);
    const anchor_artifacts = topArtifacts(clusterAtoms, 3);
    const source_breakdown = countByApp(clusterAtoms);
    const time_range = computeTimeRange(clusterAtoms);
    const cluster: Cluster = {
      cluster_id,
      rank: 0,
      rank_reason: [],
      anchor_artifacts,
      atom_ids: rc.atom_ids,
      edges: rc.edges,
      open_loop_hints,
      source_breakdown,
      time_range,
    };
    if (label !== undefined) cluster.label = label;
    return cluster;
  });

  // 4. Filter by artifact_hint if provided
  if (query.artifact_hint !== undefined) {
    const hintKey = `${query.artifact_hint.provider}:${query.artifact_hint.type}:${query.artifact_hint.id}`;
    clusters = clusters.filter((c) => {
      for (const id of c.atom_ids) {
        const a = atomsById.get(id);
        if (a === undefined) continue;
        if (a.artifacts.some((art) => artifactKey(art) === hintKey)) return true;
      }
      return false;
    });
  }

  // 5. Rank
  clusters = rankClusters(clusters, atomsById, query);
  clusters.forEach((c, i) => {
    c.rank = i + 1;
    c.rank_reason = rankReasonsFor(c, atomsById, query);
  });

  const clustersTotal = clusters.length;

  // 6. Truncate by atom limit (lowest-rank cluster atoms drop first)
  const truncated = truncate(clusters, atomsById, limit);

  // 7. Build atoms map (only those still referenced)
  const atomsMap: Record<string, NormalizedContextEvent> = {};
  for (const c of truncated.clusters) {
    for (const id of c.atom_ids) {
      const a = atomsById.get(id);
      if (a !== undefined) atomsMap[id] = a;
    }
  }

  const response: RecentWorkContextResponse = {
    schema_version: SCHEMA_VERSION,
    tool: 'get_recent_work_context',
    query: {
      since: query.since,
      until: query.until,
      artifact_hint: query.artifact_hint ?? null,
    },
    clusters: truncated.clusters,
    atoms: atomsMap,
    truncation: {
      atoms_returned: truncated.atomsReturned,
      atoms_total_in_window: atomsTotalInWindow,
      clusters_returned: truncated.clusters.length,
      clusters_total: clustersTotal,
      truncated: truncated.didTruncate,
    },
    warnings: [],
  };
  return response;
}

function makeClusterId(atomIds: string[]): string {
  const sorted = [...atomIds].sort();
  const payload = `${SCHEMA_VERSION}${sorted.join(',')}`;
  const digest = createHash('sha256').update(payload, 'utf8').digest('hex');
  return `ctx_${digest.slice(0, 8)}`;
}

function topArtifacts(
  atoms: NormalizedContextEvent[],
  n: number,
): ArtifactRef[] {
  const counts = new Map<string, { count: number; ref: ArtifactRef }>();
  for (const atom of atoms) {
    const seen = new Set<string>();
    for (const art of atom.artifacts) {
      const key = artifactKey(art);
      if (seen.has(key)) continue;
      seen.add(key);
      const cur = counts.get(key);
      if (cur === undefined) counts.set(key, { count: 1, ref: art });
      else cur.count += 1;
    }
  }
  const entries = Array.from(counts.entries());
  entries.sort((a, b) => {
    if (b[1].count !== a[1].count) return b[1].count - a[1].count;
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return 0;
  });
  return entries.slice(0, n).map((e) => e[1].ref);
}

function countByApp(atoms: NormalizedContextEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of atoms) {
    out[a.source.app] = (out[a.source.app] ?? 0) + 1;
  }
  return out;
}

function computeTimeRange(atoms: NormalizedContextEvent[]): {
  from: string;
  to: string;
} {
  if (atoms.length === 0) return { from: '', to: '' };
  let minTs = atoms[0]!.time.occurred_at;
  let maxTs = atoms[0]!.time.occurred_at;
  for (const a of atoms) {
    if (a.time.occurred_at < minTs) minTs = a.time.occurred_at;
    if (a.time.occurred_at > maxTs) maxTs = a.time.occurred_at;
  }
  return { from: minTs, to: maxTs };
}

interface TruncResult {
  clusters: Cluster[];
  didTruncate: boolean;
  atomsReturned: number;
}

function truncate(
  clusters: Cluster[],
  atomsById: Map<string, NormalizedContextEvent>,
  limit: number,
): TruncResult {
  let total = 0;
  for (const c of clusters) total += c.atom_ids.length;
  if (total <= limit) {
    return { clusters, didTruncate: false, atomsReturned: total };
  }

  // Drop atoms from lowest-rank clusters first; if a cluster ends up empty, drop it.
  // Within a cluster we drop by oldest atom first.
  const reversed = [...clusters].reverse(); // lowest rank first
  let toDrop = total - limit;
  const droppedFromCluster = new Map<string, Set<string>>();
  for (const c of reversed) {
    if (toDrop <= 0) break;
    const ordered = [...c.atom_ids].sort((a, b) => {
      const ta = atomsById.get(a)?.time.occurred_at ?? '';
      const tb = atomsById.get(b)?.time.occurred_at ?? '';
      if (ta < tb) return -1;
      if (ta > tb) return 1;
      return 0;
    });
    const dropped = new Set<string>();
    for (const id of ordered) {
      if (toDrop <= 0) break;
      dropped.add(id);
      toDrop--;
    }
    if (dropped.size > 0) droppedFromCluster.set(c.cluster_id, dropped);
  }

  const out: Cluster[] = [];
  let returned = 0;
  for (const c of clusters) {
    const dropped = droppedFromCluster.get(c.cluster_id);
    if (dropped === undefined || dropped.size === 0) {
      out.push(c);
      returned += c.atom_ids.length;
      continue;
    }
    const keptIds = c.atom_ids.filter((id) => !dropped.has(id));
    if (keptIds.length === 0) continue;
    const keptSet = new Set(keptIds);
    const trimmed: Cluster = {
      ...c,
      atom_ids: keptIds,
      edges: c.edges.filter((e) => keptSet.has(e.from) && keptSet.has(e.to)),
    };
    out.push(trimmed);
    returned += keptIds.length;
  }
  return { clusters: out, didTruncate: true, atomsReturned: returned };
}
