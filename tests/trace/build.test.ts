import { describe, expect, it } from 'vitest';
import type { CaptureEvent } from '../../src/storage/interface.js';
import type { NormalizedContextEvent } from '../../src/normalize/types.js';
import { buildRecentWorkContext } from '../../src/trace/index.js';
import type { Query } from '../../src/trace/types.js';
import { makeAtom, type AtomSpec } from './fixtures/atoms.js';

function asCapture(specs: AtomSpec[]): {
  events: CaptureEvent[];
  normalize: (e: CaptureEvent) => NormalizedContextEvent | null;
} {
  const map = new Map<string, NormalizedContextEvent>();
  const events: CaptureEvent[] = [];
  for (const s of specs) {
    map.set(s.id, makeAtom(s));
    events.push({
      id: s.id,
      source: `fixture:${s.app}`,
      timestamp: s.occurred_at,
      content: '',
    });
  }
  const normalize = (e: CaptureEvent): NormalizedContextEvent | null =>
    map.get(e.id) ?? null;
  return { events, normalize };
}

const QUERY: Query = {
  since: '2026-05-06T05:00:00.000Z',
  until: '2026-05-06T09:00:00.000Z',
};

describe('buildRecentWorkContext', () => {
  it('returns valid response shape with empty input', () => {
    const { events, normalize } = asCapture([]);
    const r = buildRecentWorkContext(events, QUERY, normalize);
    expect(r.schema_version).toBe(1);
    expect(r.tool).toBe('get_recent_work_context');
    expect(r.clusters).toEqual([]);
    expect(r.atoms).toEqual({});
    expect(r.truncation).toEqual({
      atoms_returned: 0,
      atoms_total_in_window: 0,
      clusters_returned: 0,
      clusters_total: 0,
      truncated: false,
    });
    expect(r.warnings).toEqual([]);
    expect(r.query).toEqual({
      since: QUERY.since,
      until: QUERY.until,
      artifact_hint: null,
    });
  });

  it('drops atoms with timestamps outside since/until window', () => {
    const { events, normalize } = asCapture([
      {
        id: 'inside_a',
        app: 'cursor',
        occurred_at: '2026-05-06T07:00:00.000Z',
        artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::a.ts' }],
      },
      {
        id: 'inside_b',
        app: 'cursor',
        occurred_at: '2026-05-06T08:00:00.000Z',
        artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::a.ts' }],
      },
      {
        id: 'before',
        app: 'cursor',
        occurred_at: '2026-05-06T04:00:00.000Z',
        artifacts: [],
      },
      {
        id: 'after',
        app: 'cursor',
        occurred_at: '2026-05-06T10:00:00.000Z',
        artifacts: [],
      },
    ]);
    const r = buildRecentWorkContext(events, QUERY, normalize);
    expect(r.truncation.atoms_total_in_window).toBe(2);
    expect(r.clusters).toHaveLength(1);
    expect(r.clusters[0]!.atom_ids).toEqual(['inside_a', 'inside_b']);
  });

  it('cluster_id is deterministic for same atom set', () => {
    const specs: AtomSpec[] = [
      {
        id: 'a',
        app: 'cursor',
        occurred_at: '2026-05-06T08:00:00.000Z',
        artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::x.ts' }],
      },
      {
        id: 'b',
        app: 'cursor',
        occurred_at: '2026-05-06T08:30:00.000Z',
        artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::x.ts' }],
      },
    ];
    const r1 = buildRecentWorkContext(
      asCapture(specs).events,
      QUERY,
      asCapture(specs).normalize,
    );
    const r2 = buildRecentWorkContext(
      asCapture(specs).events,
      QUERY,
      asCapture(specs).normalize,
    );
    expect(r1.clusters[0]!.cluster_id).toBe(r2.clusters[0]!.cluster_id);
    expect(r1.clusters[0]!.cluster_id).toMatch(/^ctx_[0-9a-f]{8}$/);
  });

  it('atoms are returned inline keyed by id', () => {
    const { events, normalize } = asCapture([
      {
        id: 'a',
        app: 'cursor',
        occurred_at: '2026-05-06T08:00:00.000Z',
        artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::x.ts' }],
      },
      {
        id: 'b',
        app: 'cursor',
        occurred_at: '2026-05-06T08:30:00.000Z',
        artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::x.ts' }],
      },
    ]);
    const r = buildRecentWorkContext(events, QUERY, normalize);
    expect(Object.keys(r.atoms).sort()).toEqual(['a', 'b']);
    expect(r.atoms['a']!.id).toBe('a');
  });

  it('artifact_hint filters to clusters that touch it', () => {
    const { events, normalize } = asCapture([
      {
        id: 'a1',
        app: 'cursor',
        occurred_at: '2026-05-06T07:00:00.000Z',
        artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::hinted.ts' }],
      },
      {
        id: 'a2',
        app: 'cursor',
        occurred_at: '2026-05-06T07:30:00.000Z',
        artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::hinted.ts' }],
      },
      {
        id: 'b1',
        app: 'cursor',
        occurred_at: '2026-05-06T08:00:00.000Z',
        artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::other.ts' }],
      },
      {
        id: 'b2',
        app: 'cursor',
        occurred_at: '2026-05-06T08:30:00.000Z',
        artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::other.ts' }],
      },
    ]);
    const q: Query = {
      ...QUERY,
      artifact_hint: { provider: 'local_fs', type: 'file', id: 'r::hinted.ts' },
    };
    const r = buildRecentWorkContext(events, q, normalize);
    expect(r.clusters).toHaveLength(1);
    expect(r.clusters[0]!.atom_ids.sort()).toEqual(['a1', 'a2']);
    expect(r.clusters[0]!.rank_reason).toContain('matches_artifact_hint');
  });

  it('truncates atoms when total exceeds limit; sets truncated=true', () => {
    const specs: AtomSpec[] = [];
    for (let i = 0; i < 10; i++) {
      specs.push({
        id: `evt_${i}`,
        app: 'cursor',
        occurred_at: `2026-05-06T08:${String(i).padStart(2, '0')}:00.000Z`,
        artifacts: [{ provider: 'local_fs', type: 'file', id: 'r::shared.ts' }],
      });
    }
    const { events, normalize } = asCapture(specs);
    const r = buildRecentWorkContext(events, { ...QUERY, limit: 5 }, normalize);
    expect(r.truncation.truncated).toBe(true);
    expect(r.truncation.atoms_returned).toBe(5);
    expect(r.truncation.atoms_total_in_window).toBe(10);
  });

  it('roundtrips through JSON.parse/stringify without loss', () => {
    const { events, normalize } = asCapture([
      {
        id: 'a',
        app: 'cursor',
        occurred_at: '2026-05-06T08:00:00.000Z',
        artifacts: [
          { provider: 'local_fs', type: 'file', id: 'r::x.ts', label: 'x.ts' },
        ],
        verb: 'edit',
      },
      {
        id: 'b',
        app: 'cursor',
        occurred_at: '2026-05-06T08:30:00.000Z',
        artifacts: [
          { provider: 'local_fs', type: 'file', id: 'r::x.ts', label: 'x.ts' },
        ],
        verb: 'edit',
      },
    ]);
    const r = buildRecentWorkContext(events, QUERY, normalize);
    const parsed = JSON.parse(JSON.stringify(r));
    expect(parsed).toEqual(r);
  });

  it('end-to-end: 3 separate work threads produce 3 clusters with rank 1..3', () => {
    const { events, normalize } = asCapture([
      // Thread 1: shared types.ts
      {
        id: 't1_a',
        app: 'claude_code',
        occurred_at: '2026-05-06T08:00:00.000Z',
        artifacts: [
          { provider: 'local_fs', type: 'file', id: 'r::types.ts', label: 'types.ts' },
        ],
        verb: 'message',
      },
      {
        id: 't1_b',
        app: 'cursor',
        occurred_at: '2026-05-06T08:30:00.000Z',
        artifacts: [
          { provider: 'local_fs', type: 'file', id: 'r::types.ts', label: 'types.ts' },
        ],
        verb: 'edit',
      },
      // Thread 2: shared sqlite.ts (older)
      {
        id: 't2_a',
        app: 'cursor',
        occurred_at: '2026-05-06T05:30:00.000Z',
        artifacts: [
          { provider: 'local_fs', type: 'file', id: 'r::sqlite.ts', label: 'sqlite.ts' },
        ],
        verb: 'edit',
      },
      {
        id: 't2_b',
        app: 'cursor',
        occurred_at: '2026-05-06T06:00:00.000Z',
        artifacts: [
          { provider: 'local_fs', type: 'file', id: 'r::sqlite.ts', label: 'sqlite.ts' },
        ],
        verb: 'edit',
      },
      // Thread 3: lone atom (singleton)
      {
        id: 't3_a',
        app: 'git',
        occurred_at: '2026-05-06T07:00:00.000Z',
        artifacts: [{ provider: 'local', type: 'repo', id: 'local:/echo' }],
        verb: 'commit',
      },
    ]);
    const r = buildRecentWorkContext(events, QUERY, normalize);
    expect(r.clusters).toHaveLength(3);
    expect(r.clusters.map((c) => c.rank)).toEqual([1, 2, 3]);
  });

  it('performance: 500 atoms processed in <500ms', () => {
    const specs: AtomSpec[] = [];
    const baseTs = Date.parse('2026-05-06T05:00:00.000Z');
    for (let i = 0; i < 500; i++) {
      // Distribute across 5 shared files; each file gets ~100 atoms within window
      const fileId = `r::file_${i % 5}.ts`;
      specs.push({
        id: `evt_${i}`,
        app: i % 2 === 0 ? 'cursor' : 'claude_code',
        occurred_at: new Date(baseTs + i * 1000).toISOString(),
        artifacts: [{ provider: 'local_fs', type: 'file', id: fileId }],
      });
    }
    const { events, normalize } = asCapture(specs);
    const start = performance.now();
    const r = buildRecentWorkContext(
      events,
      { ...QUERY, limit: 500 },
      normalize,
    );
    const elapsed = performance.now() - start;
    expect(r.clusters.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500);
  });
});
