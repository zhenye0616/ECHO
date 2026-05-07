import { describe, expect, it } from 'vitest';
import {
  artifactKey,
  buildGraph,
  connectedComponents,
} from '../../src/trace/cluster.js';
import { makeAtom } from './fixtures/atoms.js';

describe('artifactKey', () => {
  it('joins provider:type:id', () => {
    expect(
      artifactKey({ provider: 'local_fs', type: 'file', id: 'abc' }),
    ).toBe('local_fs:file:abc');
  });
});

describe('buildGraph + connectedComponents', () => {
  it('returns empty graph and zero clusters for empty input', () => {
    const g = buildGraph([]);
    expect(g.nodes).toEqual([]);
    expect(g.edges).toEqual([]);
    expect(connectedComponents(g)).toEqual([]);
  });

  it('single atom forms a single cluster with no edges', () => {
    const a = makeAtom({
      id: 'evt_001',
      app: 'cursor',
      occurred_at: '2026-05-06T10:00:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::a.ts' }],
    });
    const g = buildGraph([a]);
    expect(g.nodes).toEqual(['evt_001']);
    expect(g.edges).toEqual([]);
    const cs = connectedComponents(g);
    expect(cs).toHaveLength(1);
    expect(cs[0]!.atom_ids).toEqual(['evt_001']);
  });

  it('two atoms sharing an artifact within window form one cluster with one edge', () => {
    const a = makeAtom({
      id: 'evt_001',
      app: 'cursor',
      occurred_at: '2026-05-06T10:00:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::a.ts' }],
    });
    const b = makeAtom({
      id: 'evt_002',
      app: 'claude_code',
      occurred_at: '2026-05-06T10:30:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::a.ts' }],
    });
    const g = buildGraph([a, b], 4);
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0]).toMatchObject({
      from: 'evt_001',
      to: 'evt_002',
      kind: 'shared_artifact',
      artifact_ids: ['local_fs:file:r::a.ts'],
      confidence: 'high',
    });
    const cs = connectedComponents(g);
    expect(cs).toHaveLength(1);
    expect(cs[0]!.atom_ids).toEqual(['evt_001', 'evt_002']);
  });

  it('two atoms 5h apart sharing an artifact get NO edge with default 4h window', () => {
    const a = makeAtom({
      id: 'evt_001',
      app: 'cursor',
      occurred_at: '2026-05-06T05:00:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::a.ts' }],
    });
    const b = makeAtom({
      id: 'evt_002',
      app: 'cursor',
      occurred_at: '2026-05-06T10:01:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::a.ts' }],
    });
    const g = buildGraph([a, b], 4);
    expect(g.edges).toEqual([]);
    const cs = connectedComponents(g);
    // disjoint → 2 clusters
    expect(cs).toHaveLength(2);
  });

  it('window_hours is configurable: 6h includes the 5h-apart pair', () => {
    const a = makeAtom({
      id: 'evt_001',
      app: 'cursor',
      occurred_at: '2026-05-06T05:00:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::a.ts' }],
    });
    const b = makeAtom({
      id: 'evt_002',
      app: 'cursor',
      occurred_at: '2026-05-06T10:00:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::a.ts' }],
    });
    const g = buildGraph([a, b], 6);
    expect(g.edges).toHaveLength(1);
  });

  it('atoms with no shared artifacts produce disjoint clusters', () => {
    const a = makeAtom({
      id: 'evt_001',
      app: 'cursor',
      occurred_at: '2026-05-06T10:00:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::a.ts' }],
    });
    const b = makeAtom({
      id: 'evt_002',
      app: 'cursor',
      occurred_at: '2026-05-06T10:30:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::b.ts' }],
    });
    const g = buildGraph([a, b]);
    expect(g.edges).toEqual([]);
    expect(connectedComponents(g)).toHaveLength(2);
  });

  it('atoms with empty artifacts arrays form singleton clusters', () => {
    const a = makeAtom({
      id: 'evt_001',
      app: 'cursor',
      occurred_at: '2026-05-06T10:00:00.000Z',
      artifacts: [],
    });
    const b = makeAtom({
      id: 'evt_002',
      app: 'claude_code',
      occurred_at: '2026-05-06T10:01:00.000Z',
      artifacts: [],
    });
    const g = buildGraph([a, b]);
    expect(g.edges).toEqual([]);
    expect(connectedComponents(g)).toHaveLength(2);
  });

  it('three atoms in a chain via shared file form one cluster', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'cursor',
      occurred_at: '2026-05-06T08:00:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::a.ts' }],
    });
    const b = makeAtom({
      id: 'evt_b',
      app: 'claude_code',
      occurred_at: '2026-05-06T08:30:00.000Z',
      artifacts: [
        { provider: 'local_fs', type: 'file', id: 'r::a.ts' },
        { provider: 'claude_code', type: 'conversation', id: 'claude_code:s1' },
      ],
    });
    const c = makeAtom({
      id: 'evt_c',
      app: 'claude_code',
      occurred_at: '2026-05-06T09:00:00.000Z',
      artifacts: [
        { provider: 'claude_code', type: 'conversation', id: 'claude_code:s1' },
      ],
    });
    const g = buildGraph([a, b, c], 4);
    expect(g.edges).toHaveLength(2);
    const cs = connectedComponents(g);
    expect(cs).toHaveLength(1);
    expect(cs[0]!.atom_ids).toEqual(['evt_a', 'evt_b', 'evt_c']);
    expect(cs[0]!.edges).toHaveLength(2);
  });

  it('two disjoint pairs form two distinct clusters', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'cursor',
      occurred_at: '2026-05-06T08:00:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::x.ts' }],
    });
    const b = makeAtom({
      id: 'evt_b',
      app: 'cursor',
      occurred_at: '2026-05-06T08:30:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::x.ts' }],
    });
    const c = makeAtom({
      id: 'evt_c',
      app: 'cursor',
      occurred_at: '2026-05-06T09:00:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::y.ts' }],
    });
    const d = makeAtom({
      id: 'evt_d',
      app: 'cursor',
      occurred_at: '2026-05-06T09:30:00.000Z',
      artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::y.ts' }],
    });
    const g = buildGraph([a, b, c, d]);
    const cs = connectedComponents(g);
    expect(cs).toHaveLength(2);
    expect(cs.map((c) => c.atom_ids)).toEqual([
      ['evt_a', 'evt_b'],
      ['evt_c', 'evt_d'],
    ]);
  });

  it('multiple shared artifacts between two atoms produces one edge with merged artifact_ids', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'cursor',
      occurred_at: '2026-05-06T08:00:00.000Z',
      artifacts: [
        { provider: 'local_fs', type: 'file', id: 'r::a.ts' },
        { provider: 'local_fs', type: 'file', id: 'r::b.ts' },
      ],
    });
    const b = makeAtom({
      id: 'evt_b',
      app: 'cursor',
      occurred_at: '2026-05-06T08:30:00.000Z',
      artifacts: [
        { provider: 'local_fs', type: 'file', id: 'r::a.ts' },
        { provider: 'local_fs', type: 'file', id: 'r::b.ts' },
      ],
    });
    const g = buildGraph([a, b]);
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0]!.artifact_ids).toEqual([
      'local_fs:file:r::a.ts',
      'local_fs:file:r::b.ts',
    ]);
  });
});
