import type { NormalizedContextEvent } from '../normalize/types.js';
import { artifactKey } from './cluster.js';
import type { Cluster, Query, RankSignals } from './types.js';

const RECENT_HOURS = 1;

export function rankReasonsFor(
  cluster: Cluster,
  atomsById: Map<string, NormalizedContextEvent>,
  query: Query,
): string[] {
  const signals = signalsFor(cluster, atomsById, query);
  const reasons: string[] = [];
  if (signals.recent_activity) reasons.push('recent_activity');
  if (signals.matches_artifact_hint) reasons.push('matches_artifact_hint');
  if (signals.has_open_loop) reasons.push('has_open_loop');
  if (signals.dense) reasons.push('dense');
  if (signals.cross_tool) reasons.push('cross_tool');
  return reasons;
}

export function signalsFor(
  cluster: Cluster,
  atomsById: Map<string, NormalizedContextEvent>,
  query: Query,
): RankSignals {
  const untilMs = Date.parse(query.until);
  const recentCutoff = untilMs - RECENT_HOURS * 60 * 60 * 1000;
  let recent = false;
  for (const id of cluster.atom_ids) {
    const a = atomsById.get(id);
    if (a === undefined) continue;
    const t = Date.parse(a.time.occurred_at);
    if (!Number.isNaN(t) && t >= recentCutoff && t <= untilMs) {
      recent = true;
      break;
    }
  }

  let touchesHint = false;
  if (query.artifact_hint !== undefined) {
    const hintKey = `${query.artifact_hint.provider}:${query.artifact_hint.type}:${query.artifact_hint.id}`;
    for (const id of cluster.atom_ids) {
      const a = atomsById.get(id);
      if (a === undefined) continue;
      if (a.artifacts.some((art) => artifactKey(art) === hintKey)) {
        touchesHint = true;
        break;
      }
    }
  }

  const hasOpenLoop = cluster.open_loop_hints.length > 0;
  const dense = cluster.atom_ids.length >= 5;
  const distinctApps = Object.keys(cluster.source_breakdown).length;
  const crossTool = distinctApps >= 3;

  return {
    recent_activity: recent,
    matches_artifact_hint: touchesHint,
    has_open_loop: hasOpenLoop,
    dense,
    cross_tool: crossTool,
  };
}

interface SortKey {
  hint: number;
  openLoop: number;
  recent: number;
  size: number;
  negMedianAge: number;
  cluster: Cluster;
}

export function rankClusters(
  clusters: Cluster[],
  atomsById: Map<string, NormalizedContextEvent>,
  query: Query,
): Cluster[] {
  const untilMs = Date.parse(query.until);
  const decorated: SortKey[] = clusters.map((c) => {
    const sig = signalsFor(c, atomsById, query);
    const ages: number[] = [];
    for (const id of c.atom_ids) {
      const a = atomsById.get(id);
      if (a === undefined) continue;
      const t = Date.parse(a.time.occurred_at);
      if (!Number.isNaN(t)) ages.push(untilMs - t);
    }
    ages.sort((x, y) => x - y);
    let median = 0;
    if (ages.length > 0) {
      const mid = Math.floor(ages.length / 2);
      median =
        ages.length % 2 === 0
          ? ((ages[mid - 1] as number) + (ages[mid] as number)) / 2
          : (ages[mid] as number);
    }
    return {
      hint: sig.matches_artifact_hint ? 1 : 0,
      openLoop: sig.has_open_loop ? 1 : 0,
      recent: sig.recent_activity ? 1 : 0,
      size: c.atom_ids.length,
      negMedianAge: -median,
      cluster: c,
    };
  });

  decorated.sort((a, b) => {
    if (a.hint !== b.hint) return b.hint - a.hint;
    if (a.openLoop !== b.openLoop) return b.openLoop - a.openLoop;
    if (a.recent !== b.recent) return b.recent - a.recent;
    if (a.size !== b.size) return b.size - a.size;
    if (a.negMedianAge !== b.negMedianAge) return b.negMedianAge - a.negMedianAge;
    if (a.cluster.cluster_id < b.cluster.cluster_id) return -1;
    if (a.cluster.cluster_id > b.cluster.cluster_id) return 1;
    return 0;
  });

  return decorated.map((d) => d.cluster);
}
