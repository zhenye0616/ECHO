import { describe, it, expect } from 'vitest';
import {
  deriveStateTransitionEdges,
  deriveTaskClusters,
  deriveToolTouchEdges,
  reasoningTraceFor,
} from '../../src/reasoning/causal.js';
import type { CaptureEvent } from '../../src/storage/interface.js';

let _id = 0;
function evt(opts: {
  source: string;
  ts: string;
  metadata?: Record<string, unknown>;
}): CaptureEvent {
  _id += 1;
  return {
    id: `e${_id}`,
    source: opts.source,
    timestamp: opts.ts,
    content: '',
    metadata: opts.metadata ?? {},
  };
}

describe('deriveToolTouchEdges', () => {
  it('emits an edge for two events touching the same file', () => {
    const a = evt({
      source: 'fs:/Users/x/.claude/projects/p/a.jsonl',
      ts: '2026-05-01T10:00:00Z',
      metadata: { repo_root: '/r', files_referenced: ['/r/foo.ts'] },
    });
    const b = evt({
      source: 'fs:/Users/x/.codex/sessions/2026/05/01/rollout-x.jsonl',
      ts: '2026-05-01T10:05:00Z',
      metadata: { repo_root: '/r', files_referenced: ['/r/foo.ts'] },
    });
    const edges = deriveToolTouchEdges([a, b]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      file: '/r/foo.ts',
      from_event_id: a.id,
      to_event_id: b.id,
    });
    expect(edges[0]?.gap_ms).toBe(5 * 60 * 1000);
  });

  it('does not emit an edge when no file is shared', () => {
    const a = evt({
      source: 'fs:p/a.jsonl', ts: '2026-05-01T10:00:00Z',
      metadata: { repo_root: '/r', files_referenced: ['/r/x.ts'] },
    });
    const b = evt({
      source: 'fs:p/b.jsonl', ts: '2026-05-01T10:05:00Z',
      metadata: { repo_root: '/r', files_referenced: ['/r/y.ts'] },
    });
    expect(deriveToolTouchEdges([a, b])).toHaveLength(0);
  });

  it('chains 3 events touching the same file in time order (A→B, B→C)', () => {
    const a = evt({ source: 'fs:a.jsonl', ts: '2026-05-01T10:00:00Z',
      metadata: { repo_root: '/r', files_referenced: ['/r/f.ts'] } });
    const b = evt({ source: 'fs:b.jsonl', ts: '2026-05-01T10:01:00Z',
      metadata: { repo_root: '/r', files_referenced: ['/r/f.ts'] } });
    const c = evt({ source: 'fs:c.jsonl', ts: '2026-05-01T10:02:00Z',
      metadata: { repo_root: '/r', files_referenced: ['/r/f.ts'] } });
    const edges = deriveToolTouchEdges([a, b, c]);
    expect(edges.map((e) => `${e.from_event_id}->${e.to_event_id}`)).toEqual([
      `${a.id}->${b.id}`, `${b.id}->${c.id}`,
    ]);
  });

  it('finds files inside tool_calls[].args (regex pull)', () => {
    const a = evt({ source: 'fs:a.jsonl', ts: '2026-05-01T10:00:00Z',
      metadata: { repo_root: '/r',
        tool_calls: [{ name: 'Read', args: '{"file_path":"/r/secret.ts"}' }] } });
    const b = evt({ source: 'fs:b.jsonl', ts: '2026-05-01T10:01:00Z',
      metadata: { repo_root: '/r', files_referenced: ['/r/secret.ts'] } });
    expect(deriveToolTouchEdges([a, b])).toHaveLength(1);
  });
});

describe('deriveStateTransitionEdges', () => {
  it('emits an edge when head_sha changes between consecutive same-repo events', () => {
    const a = evt({ source: 'fs:a.jsonl', ts: '2026-05-01T10:00:00Z',
      metadata: { repo_root: '/r', git_state: { head_sha: 'aaa', captured_at: 't1', fresh: true } } });
    const b = evt({ source: 'fs:b.jsonl', ts: '2026-05-01T10:01:00Z',
      metadata: { repo_root: '/r', git_state: { head_sha: 'bbb', captured_at: 't2', fresh: true } } });
    const edges = deriveStateTransitionEdges([a, b]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      from_event_id: a.id, to_event_id: b.id,
      head_changed: true, from_sha: 'aaa', to_sha: 'bbb',
    });
  });

  it('skips when nothing changed', () => {
    const a = evt({ source: 'fs:a.jsonl', ts: '2026-05-01T10:00:00Z',
      metadata: { repo_root: '/r', git_state: { head_sha: 'aaa', dirty_count: 0, captured_at: 't', fresh: true } } });
    const b = evt({ source: 'fs:b.jsonl', ts: '2026-05-01T10:01:00Z',
      metadata: { repo_root: '/r', git_state: { head_sha: 'aaa', dirty_count: 0, captured_at: 't', fresh: true } } });
    expect(deriveStateTransitionEdges([a, b])).toHaveLength(0);
  });

  it('emits dirty-only edge when head stays but dirty_count flips', () => {
    const a = evt({ source: 'fs:a.jsonl', ts: '2026-05-01T10:00:00Z',
      metadata: { repo_root: '/r', git_state: { head_sha: 'aaa', dirty_count: 0, captured_at: 't', fresh: true } } });
    const b = evt({ source: 'fs:b.jsonl', ts: '2026-05-01T10:01:00Z',
      metadata: { repo_root: '/r', git_state: { head_sha: 'aaa', dirty_count: 3, captured_at: 't', fresh: true } } });
    const edges = deriveStateTransitionEdges([a, b]);
    expect(edges).toHaveLength(1);
    expect(edges[0]?.head_changed).toBe(false);
  });

  it('does not cross repo boundaries', () => {
    const a = evt({ source: 'fs:a.jsonl', ts: '2026-05-01T10:00:00Z',
      metadata: { repo_root: '/r1', git_state: { head_sha: 'aaa', captured_at: 't', fresh: true } } });
    const b = evt({ source: 'fs:b.jsonl', ts: '2026-05-01T10:01:00Z',
      metadata: { repo_root: '/r2', git_state: { head_sha: 'bbb', captured_at: 't', fresh: true } } });
    expect(deriveStateTransitionEdges([a, b])).toHaveLength(0);
  });
});

describe('deriveTaskClusters', () => {
  it('groups events in the same repo within the idle window into one task', () => {
    const a = evt({ source: 'fs:a', ts: '2026-05-01T10:00:00Z', metadata: { repo_root: '/r' } });
    const b = evt({ source: 'fs:b', ts: '2026-05-01T10:30:00Z', metadata: { repo_root: '/r' } });
    const clusters = deriveTaskClusters([a, b]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.event_ids).toEqual([a.id, b.id]);
  });

  it('splits when idle window is exceeded', () => {
    const a = evt({ source: 'fs:a', ts: '2026-05-01T10:00:00Z', metadata: { repo_root: '/r' } });
    const b = evt({ source: 'fs:b', ts: '2026-05-01T13:00:00Z', metadata: { repo_root: '/r' } });
    const clusters = deriveTaskClusters([a, b], 60 * 60 * 1000);
    expect(clusters).toHaveLength(2);
  });

  it('separates by repo even within the time window', () => {
    const a = evt({ source: 'fs:a', ts: '2026-05-01T10:00:00Z', metadata: { repo_root: '/r1' } });
    const b = evt({ source: 'fs:b', ts: '2026-05-01T10:05:00Z', metadata: { repo_root: '/r2' } });
    expect(deriveTaskClusters([a, b])).toHaveLength(2);
  });

  it('counts events by lane (cc/codex/git/cursor)', () => {
    const cc = evt({ source: 'fs:/Users/x/.claude/projects/p/a.jsonl', ts: '2026-05-01T10:00:00Z',
      metadata: { repo_root: '/r' } });
    const cx = evt({ source: 'fs:/Users/x/.codex/sessions/2026/05/01/rollout-x.jsonl', ts: '2026-05-01T10:05:00Z',
      metadata: { repo_root: '/r' } });
    const git = evt({ source: 'git:/r', ts: '2026-05-01T10:10:00Z', metadata: { repo_root: '/r' } });
    const clusters = deriveTaskClusters([cc, cx, git]);
    expect(clusters[0]?.by_source).toEqual({ cc: 1, codex: 1, git: 1 });
  });
});

describe('reasoningTraceFor', () => {
  it('returns the cluster, predecessors, successors, and edges around an anchor', () => {
    const e1 = evt({ source: 'fs:a', ts: '2026-05-01T10:00:00Z',
      metadata: { repo_root: '/r', files_referenced: ['/r/x.ts'],
        git_state: { head_sha: 'aaa', captured_at: 't', fresh: true } } });
    const anchor = evt({ source: 'fs:b', ts: '2026-05-01T10:05:00Z',
      metadata: { repo_root: '/r', files_referenced: ['/r/x.ts'],
        git_state: { head_sha: 'aaa', captured_at: 't', fresh: true } } });
    const e3 = evt({ source: 'git:/r', ts: '2026-05-01T10:10:00Z',
      metadata: { repo_root: '/r',
        git_state: { head_sha: 'bbb', captured_at: 't', fresh: true } } });
    const trace = reasoningTraceFor([e1, anchor, e3], anchor.id);
    expect(trace).not.toBeNull();
    expect(trace?.predecessors.map((e) => e.id)).toEqual([e1.id]);
    expect(trace?.successors.map((e) => e.id)).toEqual([e3.id]);
    expect(trace?.tool_touch_edges).toHaveLength(1);
    expect(trace?.state_transitions).toHaveLength(1);
  });

  it('returns null when anchor id is not in the events array', () => {
    expect(reasoningTraceFor([], 'missing')).toBeNull();
  });
});
