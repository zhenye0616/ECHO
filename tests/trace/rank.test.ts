import { describe, expect, it } from 'vitest';
import type { NormalizedContextEvent } from '../../src/normalize/types.js';
import { rankClusters, rankReasonsFor } from '../../src/trace/rank.js';
import type { Cluster, Query } from '../../src/trace/types.js';
import { makeAtom } from './fixtures/atoms.js';

function buildAtomMap(
  atoms: NormalizedContextEvent[],
): Map<string, NormalizedContextEvent> {
  return new Map(atoms.map((a) => [a.id, a]));
}

function makeCluster(opts: {
  id: string;
  atom_ids: string[];
  open_loop_hints?: Cluster['open_loop_hints'];
  source_breakdown?: Record<string, number>;
}): Cluster {
  return {
    cluster_id: opts.id,
    rank: 0,
    rank_reason: [],
    anchor_artifacts: [],
    atom_ids: opts.atom_ids,
    edges: [],
    open_loop_hints: opts.open_loop_hints ?? [],
    source_breakdown: opts.source_breakdown ?? {},
    time_range: { from: '', to: '' },
  };
}

const QUERY: Query = {
  since: '2026-05-06T05:00:00.000Z',
  until: '2026-05-06T09:00:00.000Z',
};

describe('rankReasonsFor', () => {
  it('fires recent_activity when an atom is within the last 1h of query.until', () => {
    const a = makeAtom({
      id: 'evt_recent',
      app: 'cursor',
      occurred_at: '2026-05-06T08:30:00.000Z',
      artifacts: [],
    });
    const c = makeCluster({ id: 'ctx_1', atom_ids: ['evt_recent'] });
    expect(rankReasonsFor(c, buildAtomMap([a]), QUERY)).toContain('recent_activity');
  });

  it('does NOT fire recent_activity when all atoms are older than 1h', () => {
    const a = makeAtom({
      id: 'evt_old',
      app: 'cursor',
      occurred_at: '2026-05-06T06:00:00.000Z',
      artifacts: [],
    });
    const c = makeCluster({ id: 'ctx_1', atom_ids: ['evt_old'] });
    expect(rankReasonsFor(c, buildAtomMap([a]), QUERY)).not.toContain(
      'recent_activity',
    );
  });

  it('fires matches_artifact_hint when cluster touches the hint artifact', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'cursor',
      occurred_at: '2026-05-06T08:30:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::a.ts' }],
    });
    const c = makeCluster({ id: 'ctx_1', atom_ids: ['evt_a'] });
    const q: Query = {
      ...QUERY,
      artifact_hint: { provider: 'local_fs', type: 'file', id: 'r::a.ts' },
    };
    expect(rankReasonsFor(c, buildAtomMap([a]), q)).toContain('matches_artifact_hint');
  });

  it('fires has_open_loop when cluster has any enriched hints', () => {
    const c = makeCluster({
      id: 'ctx_1',
      atom_ids: [],
      open_loop_hints: [
        {
          atom_id: 'evt_a',
          kind: 'contains_todo',
          text: 'TODO: x',
          confidence: 'high',
          resolved: false,
        },
      ],
    });
    expect(rankReasonsFor(c, new Map(), QUERY)).toContain('has_open_loop');
  });

  it('fires dense when cluster has ≥5 atoms', () => {
    const c = makeCluster({
      id: 'ctx_1',
      atom_ids: ['1', '2', '3', '4', '5'],
    });
    expect(rankReasonsFor(c, new Map(), QUERY)).toContain('dense');
  });

  it('fires cross_tool when source_breakdown has ≥3 distinct apps', () => {
    const c = makeCluster({
      id: 'ctx_1',
      atom_ids: [],
      source_breakdown: { cursor: 1, claude_code: 1, git: 1 },
    });
    expect(rankReasonsFor(c, new Map(), QUERY)).toContain('cross_tool');
  });
});

describe('rankClusters', () => {
  it('artifact_hint match dominates ordering', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'cursor',
      occurred_at: '2026-05-06T07:00:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::a.ts' }],
    });
    const b = makeAtom({
      id: 'evt_b',
      app: 'cursor',
      occurred_at: '2026-05-06T08:30:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::b.ts' }],
    });
    const cA = makeCluster({ id: 'ctx_a', atom_ids: ['evt_a'] });
    const cB = makeCluster({ id: 'ctx_b', atom_ids: ['evt_b'] });
    const map = buildAtomMap([a, b]);
    const q: Query = {
      ...QUERY,
      artifact_hint: { provider: 'local_fs', type: 'file', id: 'r::a.ts' },
    };
    const sorted = rankClusters([cB, cA], map, q);
    expect(sorted.map((c) => c.cluster_id)).toEqual(['ctx_a', 'ctx_b']);
  });

  it('without hint: open-loop cluster ranks above non-open-loop of same size', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'claude_code',
      occurred_at: '2026-05-06T08:30:00.000Z',
      artifacts: [],
    });
    const b = makeAtom({
      id: 'evt_b',
      app: 'cursor',
      occurred_at: '2026-05-06T08:30:00.000Z',
      artifacts: [],
    });
    const cWithLoop = makeCluster({
      id: 'ctx_loop',
      atom_ids: ['evt_a'],
      open_loop_hints: [
        {
          atom_id: 'evt_a',
          kind: 'ends_with_question',
          text: 'q?',
          confidence: 'high',
          resolved: false,
        },
      ],
    });
    const cNoLoop = makeCluster({ id: 'ctx_plain', atom_ids: ['evt_b'] });
    const sorted = rankClusters([cNoLoop, cWithLoop], buildAtomMap([a, b]), QUERY);
    expect(sorted[0]!.cluster_id).toBe('ctx_loop');
  });

  it('ties: larger cluster ranks higher', () => {
    const ts = '2026-05-06T08:30:00.000Z';
    const atoms = [
      makeAtom({
        id: 'a1',
        app: 'cursor',
        occurred_at: ts,
        artifacts: [],
      }),
      makeAtom({
        id: 'a2',
        app: 'cursor',
        occurred_at: ts,
        artifacts: [],
      }),
      makeAtom({
        id: 'a3',
        app: 'cursor',
        occurred_at: ts,
        artifacts: [],
      }),
      makeAtom({
        id: 'b1',
        app: 'cursor',
        occurred_at: ts,
        artifacts: [],
      }),
    ];
    const big = makeCluster({ id: 'ctx_big', atom_ids: ['a1', 'a2', 'a3'] });
    const small = makeCluster({ id: 'ctx_small', atom_ids: ['b1'] });
    const sorted = rankClusters([small, big], buildAtomMap(atoms), QUERY);
    expect(sorted[0]!.cluster_id).toBe('ctx_big');
  });
});
