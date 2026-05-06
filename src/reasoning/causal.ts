// Layer 4: query-time causal-link derivation.
//
// Pure functions over CaptureEvent sequences. Nothing here is stored in the
// database — edges are derived on demand from existing fields:
//   - tool-touch chains: events that mention the same file in time order
//   - state-transition edges: adjacent events whose git_state.head_sha differs
//   - cross-tool task edges: events grouped by (repo_root, idle-window)
//
// Consumers (mcp tools, render-trace, future audit UI) call these to assemble
// reasoning traces for a given event without ECHO having to maintain a
// denormalised graph.

import { laneOf } from '../capture/extractors/_shared.js';
import { FILE_INPUT_REGEX } from '../capture/extractors/_turn_meta.js';
import type { CaptureEvent } from '../storage/interface.js';

export interface ToolTouchEdge {
  /** A path that both events touched. */
  file: string;
  /** Earlier event id (the producer / writer). */
  from_event_id: string;
  /** Later event id (the consumer / reader). */
  to_event_id: string;
  /** ISO timestamps of the two events, for ordering and gap inspection. */
  from_ts: string;
  to_ts: string;
  /** Milliseconds between the two events. */
  gap_ms: number;
}

export interface StateTransitionEdge {
  /** Earlier event id. */
  from_event_id: string;
  /** Later event id. */
  to_event_id: string;
  /** repo_root the transition is scoped to. */
  repo_root: string;
  /** HEAD shas before/after. Either may be undefined if a sample was missing. */
  from_sha?: string;
  to_sha?: string;
  /** Whether the head_sha changed (a commit landed) vs only dirty_count changed. */
  head_changed: boolean;
  from_ts: string;
  to_ts: string;
}

export interface TaskCluster {
  /** Synthetic id: repo_root + earliest timestamp; stable for a given input set. */
  task_id: string;
  repo_root: string;
  /** Earliest event ts in the cluster. */
  started_at: string;
  /** Latest event ts in the cluster. */
  ended_at: string;
  /** Member events in chronological order. */
  event_ids: string[];
  /** Lane breakdown for quick UI summary. */
  by_source: Record<string, number>;
}

const DEFAULT_TASK_IDLE_MS = 60 * 60 * 1000; // 60 minutes

// ─── helpers ────────────────────────────────────────────────────────────────

function safeMd(evt: CaptureEvent): Record<string, unknown> {
  return (evt.metadata ?? {}) as Record<string, unknown>;
}

function repoRoot(evt: CaptureEvent): string | undefined {
  const md = safeMd(evt);
  const r = md['repo_root'];
  return typeof r === 'string' && r.length > 0 ? r : undefined;
}

function tsMs(evt: CaptureEvent): number {
  const t = Date.parse(evt.timestamp);
  return Number.isFinite(t) ? t : 0;
}

function filesTouchedBy(evt: CaptureEvent): string[] {
  const md = safeMd(evt);
  const out = new Set<string>();
  const fr = md['files_referenced'];
  if (Array.isArray(fr)) {
    for (const f of fr) if (typeof f === 'string' && f.length > 0) out.add(f);
  }
  // tool_calls[].args is truncated JSON; pull any file-path-style keys out
  // using the regex that mirrors FILE_INPUT_KEYS, so the two stay in lock-step.
  const tcs = md['tool_calls'];
  if (Array.isArray(tcs)) {
    for (const tc of tcs) {
      if (typeof tc !== 'object' || tc === null) continue;
      const args = (tc as Record<string, unknown>)['args'];
      if (typeof args !== 'string') continue;
      for (const m of args.matchAll(FILE_INPUT_REGEX)) {
        if (m[1] !== undefined && m[1].length > 0) out.add(m[1]);
      }
    }
  }
  return [...out];
}

function gitState(evt: CaptureEvent): { head_sha?: string; dirty_count?: number } {
  const md = safeMd(evt);
  const gs = md['git_state'];
  if (typeof gs !== 'object' || gs === null) return {};
  const obj = gs as Record<string, unknown>;
  const out: { head_sha?: string; dirty_count?: number } = {};
  if (typeof obj['head_sha'] === 'string') out.head_sha = obj['head_sha'];
  if (typeof obj['dirty_count'] === 'number') out.dirty_count = obj['dirty_count'];
  return out;
}

// ─── 4a. tool-touch chains ──────────────────────────────────────────────────

/**
 * For each file referenced across events, emit edges between successive
 * touches. Edges are time-ordered; gap_ms exposes how stale the link is.
 */
export function deriveToolTouchEdges(events: CaptureEvent[]): ToolTouchEdge[] {
  const sorted = [...events].sort((a, b) => tsMs(a) - tsMs(b));
  const lastByFile = new Map<string, CaptureEvent>();
  const edges: ToolTouchEdge[] = [];
  for (const evt of sorted) {
    for (const f of filesTouchedBy(evt)) {
      const prev = lastByFile.get(f);
      if (prev !== undefined && prev.id !== evt.id) {
        edges.push({
          file: f,
          from_event_id: prev.id,
          to_event_id: evt.id,
          from_ts: prev.timestamp,
          to_ts: evt.timestamp,
          gap_ms: tsMs(evt) - tsMs(prev),
        });
      }
      lastByFile.set(f, evt);
    }
  }
  return edges;
}

// ─── 4b. state-transition edges ─────────────────────────────────────────────

/**
 * Within each repo_root, emit an edge between consecutive events whose
 * git_state head_sha or dirty_count differs. Detects "the world changed
 * between these two turns" without needing a stored DAG.
 */
export function deriveStateTransitionEdges(events: CaptureEvent[]): StateTransitionEdge[] {
  const byRepo = new Map<string, CaptureEvent[]>();
  for (const evt of events) {
    const r = repoRoot(evt);
    if (r === undefined) continue;
    const arr = byRepo.get(r) ?? [];
    arr.push(evt);
    byRepo.set(r, arr);
  }
  const edges: StateTransitionEdge[] = [];
  for (const [repo, arr] of byRepo) {
    arr.sort((a, b) => tsMs(a) - tsMs(b));
    for (let i = 1; i < arr.length; i++) {
      const a = arr[i - 1]!;
      const b = arr[i]!;
      const sa = gitState(a);
      const sb = gitState(b);
      if (sa.head_sha === undefined && sb.head_sha === undefined) continue;
      const headChanged = sa.head_sha !== sb.head_sha;
      const dirtyChanged = sa.dirty_count !== sb.dirty_count;
      if (!headChanged && !dirtyChanged) continue;
      const edge: StateTransitionEdge = {
        from_event_id: a.id,
        to_event_id: b.id,
        repo_root: repo,
        head_changed: headChanged,
        from_ts: a.timestamp,
        to_ts: b.timestamp,
      };
      if (sa.head_sha !== undefined) edge.from_sha = sa.head_sha;
      if (sb.head_sha !== undefined) edge.to_sha = sb.head_sha;
      edges.push(edge);
    }
  }
  return edges;
}

// ─── 4c. cross-tool task clusters ───────────────────────────────────────────

/**
 * Group events by repo_root, splitting whenever two consecutive events are
 * separated by more than `idleMs`. Cheap V1 heuristic; the user can override
 * boundaries later by tagging.
 */
export function deriveTaskClusters(
  events: CaptureEvent[],
  idleMs: number = DEFAULT_TASK_IDLE_MS,
): TaskCluster[] {
  const byRepo = new Map<string, CaptureEvent[]>();
  for (const evt of events) {
    const r = repoRoot(evt);
    if (r === undefined) continue;
    const arr = byRepo.get(r) ?? [];
    arr.push(evt);
    byRepo.set(r, arr);
  }
  const clusters: TaskCluster[] = [];
  for (const [repo, arr] of byRepo) {
    arr.sort((a, b) => tsMs(a) - tsMs(b));
    let cur: CaptureEvent[] = [];
    let lastTs = -Infinity;
    function flush(): void {
      if (cur.length === 0) return;
      const startedAt = cur[0]!.timestamp;
      const endedAt = cur[cur.length - 1]!.timestamp;
      const bySource: Record<string, number> = {};
      for (const e of cur) {
        const lane = laneOf(e);
        bySource[lane] = (bySource[lane] ?? 0) + 1;
      }
      clusters.push({
        task_id: `${repo}@${startedAt}`,
        repo_root: repo,
        started_at: startedAt,
        ended_at: endedAt,
        event_ids: cur.map((e) => e.id),
        by_source: bySource,
      });
      cur = [];
    }
    for (const evt of arr) {
      const t = tsMs(evt);
      if (t - lastTs > idleMs) flush();
      cur.push(evt);
      lastTs = t;
    }
    flush();
  }
  // Stable global order: earliest task first.
  clusters.sort((a, b) => a.started_at.localeCompare(b.started_at));
  return clusters;
}

// ─── convenience: assemble a reasoning trace for one anchor event ───────────

export interface ReasoningTrace {
  anchor_id: string;
  task: TaskCluster | null;
  predecessors: CaptureEvent[];
  successors: CaptureEvent[];
  tool_touch_edges: ToolTouchEdge[];
  state_transitions: StateTransitionEdge[];
}

/**
 * Given an anchor event id, return the task cluster it belongs to plus the
 * tool-touch and state-transition edges within that cluster. Useful for
 * "show me the reasoning trace around this turn" UI/MCP queries.
 */
export function reasoningTraceFor(events: CaptureEvent[], anchorId: string): ReasoningTrace | null {
  const anchor = events.find((e) => e.id === anchorId);
  if (anchor === undefined) return null;
  const clusters = deriveTaskClusters(events);
  const task = clusters.find((c) => c.event_ids.includes(anchorId)) ?? null;
  if (task === null) {
    return {
      anchor_id: anchorId,
      task: null,
      predecessors: [],
      successors: [],
      tool_touch_edges: [],
      state_transitions: [],
    };
  }
  const idSet = new Set(task.event_ids);
  const taskEvents = events.filter((e) => idSet.has(e.id));
  const anchorMs = tsMs(anchor);
  return {
    anchor_id: anchorId,
    task,
    predecessors: taskEvents.filter((e) => tsMs(e) < anchorMs),
    successors: taskEvents.filter((e) => tsMs(e) > anchorMs),
    tool_touch_edges: deriveToolTouchEdges(taskEvents),
    state_transitions: deriveStateTransitionEdges(taskEvents),
  };
}
