import { describe, expect, it } from 'vitest';
import {
  findClusters,
  FIND_CLUSTERS_RESPONSE_BYTE_CEILING,
} from '../../src/mcp/tools/find-clusters.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import { normalizeEvent } from '../../src/normalize/index.js';
import { buildRecentWorkContext } from '../../src/trace/index.js';
import type { CaptureEvent } from '../../src/storage/interface.js';

// V1.6 (item 030) — find_clusters tests.
//
// Acceptance #1 contract: same inputs → same set of clusters when each
// cluster is identified by the FULL sorted `atom_ids[]` set from the
// trace builder's un-clipped cluster membership, AND ranks match.
// Explicitly NOT comparing against `buildSkeletonResponse` (which clips
// atom_ids[] at 50 — the very thing find_clusters fixes).

const PROJECT_ECHO = '/Users/redacted/Desktop/Project_echo';

function claudeCodeTurn(
  i: number,
  filePath: string,
  ts: string,
): Omit<CaptureEvent, 'id'> {
  // Mirror the shape claude_code/extractor produces: a USER+ASSISTANT pair
  // bag with a `files_referenced` artifact keying the cluster.
  return {
    source: `fs:/Users/redacted/.claude/projects/-Users-redacted-Desktop-Project-echo/sess-${i}.jsonl`,
    timestamp: ts,
    content: `USER: question ${i}\n\nASSISTANT: working on ${filePath}`,
    metadata: {
      surface: 'claude_code',
      files_referenced: [filePath],
      cwd: PROJECT_ECHO,
      session_id: `sess-${i}`,
      turn_index: 0,
    },
  };
}

function gitCommit(
  i: number,
  filePath: string,
  ts: string,
): Omit<CaptureEvent, 'id'> {
  return {
    source: `git:${PROJECT_ECHO}`,
    timestamp: ts,
    content: `commit ${i}: edit ${filePath}`,
    metadata: {
      surface: 'git',
      files_referenced: [filePath],
      sha: `c0ffee${i.toString().padStart(2, '0')}`,
    },
  };
}

describe('find_clusters', () => {
  it('returns FULL atom_ids per cluster — fails the skeleton-wire 50-cap when cluster size > 50 (the load-bearing fix)', async () => {
    // Build a cluster of >50 atoms by funneling them all through the SAME
    // file artifact within the cluster-gap window. The trace builder will
    // group them into one component; the skeleton-wire 50-cap at the
    // existing rwc tool would clip atom_ids[] at 50 — find_clusters MUST
    // emit the FULL set.
    const store = new MemoryStorage();
    const sharedFile = `${PROJECT_ECHO}/src/big.ts`;
    const N = 75;
    for (let i = 0; i < N; i++) {
      const ts = `2026-05-09T10:${(i % 60).toString().padStart(2, '0')}:${(
        Math.floor(i / 60)
      )
        .toString()
        .padStart(2, '0')}.000Z`;
      await store.append(claudeCodeTurn(i, sharedFile, ts));
    }

    const r = await findClusters(store, {
      since: '2026-05-09T09:00:00.000Z',
      until: '2026-05-09T12:00:00.000Z',
    });

    // One dominant cluster bridging all atoms (same file, same window).
    const bigCluster = r.clusters.find((c) => c.atom_ids.length >= N);
    expect(bigCluster).toBeDefined();
    // Load-bearing: the FULL atom_ids set, not the skeleton-clipped 50.
    expect(bigCluster!.atom_ids.length).toBe(N);
    // No atom_ids_truncated flag — N=75 is below the per-cluster hard cap (200).
    expect(bigCluster!.atom_ids_truncated).toBeUndefined();
  });

  it('graph-membership equality with the un-clipped trace builder (acceptance #1)', async () => {
    // Same fixture. Compare find_clusters output to the trace builder's
    // raw output directly, using sorted atom_ids[] as the cluster
    // identity (NOT cluster_id strings, NOT skeleton-wire shape).
    const store = new MemoryStorage();
    const fileA = `${PROJECT_ECHO}/src/a.ts`;
    const fileB = `${PROJECT_ECHO}/src/b.ts`;
    // Cluster A: 5 claude_code turns + 1 git commit, all on fileA
    for (let i = 0; i < 5; i++) {
      await store.append(
        claudeCodeTurn(
          100 + i,
          fileA,
          `2026-05-09T10:${i.toString().padStart(2, '0')}:00.000Z`,
        ),
      );
    }
    await store.append(
      gitCommit(1, fileA, '2026-05-09T10:30:00.000Z'),
    );
    // Cluster B: 3 claude_code turns on fileB, separate file → separate component
    for (let i = 0; i < 3; i++) {
      await store.append(
        claudeCodeTurn(
          200 + i,
          fileB,
          `2026-05-09T11:${i.toString().padStart(2, '0')}:00.000Z`,
        ),
      );
    }

    const since = '2026-05-09T09:00:00.000Z';
    const until = '2026-05-09T12:00:00.000Z';

    // Reference: raw trace builder (no skeleton, no atom-limit clipping).
    const events = await store.query({
      since,
      until,
      limit: 1000,
      exclude_metadata_surface: ['fs'],
    });
    const referenceRwc = buildRecentWorkContext(
      events,
      { since, until, limit: 500, format: 'full' },
      normalizeEvent,
    );

    const r = await findClusters(store, { since, until });

    // Cluster identity = sorted atom_ids set.
    const refIdentities = referenceRwc.clusters.map((c) => ({
      key: [...c.atom_ids].sort().join(','),
      rank: c.rank,
      size: c.atom_ids.length,
    }));
    const ourIdentities = r.clusters.map((c) => ({
      key: [...c.atom_ids].sort().join(','),
      rank: c.rank,
      size: c.atom_ids.length,
    }));

    // Graph-membership: same set of identity keys.
    expect(new Set(ourIdentities.map((c) => c.key))).toEqual(
      new Set(refIdentities.map((c) => c.key)),
    );
    // Ranks of corresponding clusters match (look up by identity key).
    const refByKey = new Map(refIdentities.map((c) => [c.key, c.rank]));
    for (const our of ourIdentities) {
      expect(our.rank).toBe(refByKey.get(our.key));
    }
  });

  it('cost target — < 10k chars envelope on a 24h-lookback, multi-cluster fixture', async () => {
    // Realistic-density: 5 active clusters, ~20 atoms each, across 24h.
    const store = new MemoryStorage();
    const baseHour = 10;
    for (let cluster = 0; cluster < 5; cluster++) {
      const file = `${PROJECT_ECHO}/src/feature_${cluster}.ts`;
      for (let i = 0; i < 20; i++) {
        const minute = i % 60;
        const second = i;
        const ts = `2026-05-09T${(baseHour + cluster).toString().padStart(2, '0')}:${minute
          .toString()
          .padStart(2, '0')}:${(second % 60).toString().padStart(2, '0')}.000Z`;
        await store.append(claudeCodeTurn(cluster * 100 + i, file, ts));
      }
    }

    const r = await findClusters(store, {
      since: '2026-05-09T00:00:00.000Z',
      until: '2026-05-10T00:00:00.000Z',
    });

    // The hard envelope ceiling for find_clusters is 25k; the cost target
    // for typical 24h lookback is < 10k.
    const envelopeBytes = JSON.stringify(r).length;
    expect(envelopeBytes).toBeLessThan(10_000);
    // At least some clusters returned.
    expect(r.clusters.length).toBeGreaterThan(0);
  });

  it('no-args 4h→24h auto-expand: empty-4h fixture returns the older content with [AUTO_EXPAND] warning', async () => {
    // Base content at 6h ago (outside 4h, inside 24h). With no since/until,
    // the 4h pass returns 0 clusters; the 24h retry catches it.
    const now = new Date('2026-05-09T20:00:00.000Z');
    const sixHoursAgo = '2026-05-09T14:00:00.000Z';
    const store = new MemoryStorage();
    await store.append(claudeCodeTurn(1, `${PROJECT_ECHO}/src/x.ts`, sixHoursAgo));
    await store.append(
      claudeCodeTurn(2, `${PROJECT_ECHO}/src/x.ts`, sixHoursAgo.replace('00.000', '30.000')),
    );

    const r = await findClusters(store, {}, now);

    expect(r.clusters.length).toBeGreaterThan(0);
    expect(r.warnings.some((w) => w.includes('[AUTO_EXPAND]'))).toBe(true);
  });

  it('result_caps mirrors the trace builder truncation summary (renamed from `truncation`)', async () => {
    const store = new MemoryStorage();
    const file = `${PROJECT_ECHO}/src/y.ts`;
    for (let i = 0; i < 8; i++) {
      await store.append(
        claudeCodeTurn(i, file, `2026-05-09T10:${i.toString().padStart(2, '0')}:00.000Z`),
      );
    }
    const r = await findClusters(store, {
      since: '2026-05-09T09:00:00.000Z',
      until: '2026-05-09T12:00:00.000Z',
    });
    expect(r.result_caps.clusters_returned).toBe(r.clusters.length);
    expect(r.result_caps.atoms_returned).toBe(
      r.clusters.reduce((s, c) => s + c.atom_ids.length, 0),
    );
    expect(typeof r.result_caps.clusters_total).toBe('number');
    expect(typeof r.result_caps.atoms_total_in_window).toBe('number');
    expect(typeof r.result_caps.truncated).toBe('boolean');
  });

  it('per-cluster atom_ids hard cap fires only when cluster size exceeds PER_CLUSTER_ATOM_IDS_HARD_CAP (safety net, not routine)', async () => {
    const store = new MemoryStorage();
    const sharedFile = `${PROJECT_ECHO}/src/giant.ts`;
    // Build a cluster of >200 atoms (above PER_CLUSTER_ATOM_IDS_HARD_CAP).
    const N = 250;
    for (let i = 0; i < N; i++) {
      // Distribute across an hour to stay within cluster-gap
      const totalSeconds = i * 14;
      const minute = Math.floor(totalSeconds / 60);
      const second = totalSeconds % 60;
      const ts = `2026-05-09T10:${minute
        .toString()
        .padStart(2, '0')}:${second.toString().padStart(2, '0')}.000Z`;
      await store.append(claudeCodeTurn(i, sharedFile, ts));
    }

    const r = await findClusters(store, {
      since: '2026-05-09T09:00:00.000Z',
      until: '2026-05-09T12:00:00.000Z',
    });

    const giant = r.clusters.find((c) => c.atom_ids_truncated === true);
    expect(giant).toBeDefined();
    expect(giant!.atom_ids_total).toBe(N);
    // Cap engaged but kept head + tail.
    expect(giant!.atom_ids.length).toBe(200);
  });

  it('REGRESSION (post-build review): per-cluster atom_ids cap firing lifts result_caps.truncated to true', async () => {
    // Codex flagged: previously result_caps.truncated only mirrored the
    // upstream rwc.truncation.truncated, so a per-cluster atom_ids hard
    // cap firing produced atom_ids_truncated:true on the cluster but
    // result_caps.truncated:false — consumers checking the top-level
    // signal couldn't detect the partial coverage.
    const store = new MemoryStorage();
    const sharedFile = `${PROJECT_ECHO}/src/giant-truncation.ts`;
    const N = 250; // > PER_CLUSTER_ATOM_IDS_HARD_CAP (200)
    for (let i = 0; i < N; i++) {
      const totalSeconds = i * 14;
      const minute = Math.floor(totalSeconds / 60);
      const second = totalSeconds % 60;
      const ts = `2026-05-09T10:${minute
        .toString()
        .padStart(2, '0')}:${second.toString().padStart(2, '0')}.000Z`;
      await store.append(claudeCodeTurn(i, sharedFile, ts));
    }

    const r = await findClusters(store, {
      since: '2026-05-09T09:00:00.000Z',
      until: '2026-05-09T12:00:00.000Z',
    });

    // Per-cluster cap fired AND that gets surfaced at result_caps.truncated.
    expect(r.clusters.some((c) => c.atom_ids_truncated === true)).toBe(true);
    expect(r.result_caps.truncated).toBe(true);
  });

  it('REGRESSION (post-build review): response-level envelope ceiling actually enforced — trailing clusters trimmed when total exceeds 25k', async () => {
    // Cursor + Codex flagged: FIND_CLUSTERS_RESPONSE_BYTE_CEILING was
    // declared but never applied. Build many clusters with high
    // open-loop-hint density (each "?" turn contributes a hint) so the
    // un-trimmed envelope exceeds 25k. (Pure atom_ids inflation can't
    // cross 25k under MAX_LIMIT=500 + per-cluster-cap=200 — but
    // realistic question-heavy sessions across many files do.)
    const store = new MemoryStorage();
    const CLUSTERS = 10;
    const ATOMS_PER_CLUSTER = 60;
    for (let cluster = 0; cluster < CLUSTERS; cluster++) {
      const file = `${PROJECT_ECHO}/src/qheavy_${cluster}.ts`;
      const hour = 10 + cluster;
      for (let i = 0; i < ATOMS_PER_CLUSTER; i++) {
        const totalSeconds = i * 14;
        const minute = Math.floor(totalSeconds / 60);
        const second = totalSeconds % 60;
        const ts = `2026-05-09T${hour.toString().padStart(2, '0')}:${minute
          .toString()
          .padStart(2, '0')}:${second.toString().padStart(2, '0')}.000Z`;
        const t = claudeCodeTurn(cluster * 1000 + i, file, ts);
        // Question-ending content → triggers open_loop_hints, which
        // (unlike atom_ids) can grow per cluster up to the hint cap.
        t.content = `USER: still confused about ${file}?\n\nASSISTANT: not sure either, what about iteration ${i}?`;
        await store.append(t);
      }
    }

    const r = await findClusters(store, {
      since: '2026-05-09T00:00:00.000Z',
      until: '2026-05-10T00:00:00.000Z',
    });

    // Hard ceiling actually enforced.
    const envelopeBytes = JSON.stringify(r).length;
    expect(envelopeBytes).toBeLessThanOrEqual(FIND_CLUSTERS_RESPONSE_BYTE_CEILING);
    // Some clusters were dropped to fit.
    expect(r.clusters.length).toBeLessThan(CLUSTERS);
    // The signal is surfaced at result_caps.truncated.
    expect(r.result_caps.truncated).toBe(true);
    // Warning surfaced so the consumer knows what happened.
    expect(
      r.warnings.some((w) => w.includes('[FIND_CLUSTERS_RESPONSE_CAP]')),
    ).toBe(true);
  });

  it('open_loop_hints stays capped at SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP (50-cap reused)', async () => {
    // Synthesize many open-loop hints by using "?" turn endings (the
    // ends_with_question hint trigger). Cluster size doesn't have to
    // exceed the per-cluster cap to test hint capping.
    const store = new MemoryStorage();
    const file = `${PROJECT_ECHO}/src/q.ts`;
    for (let i = 0; i < 60; i++) {
      // 60 question-ending turns → 60 raw open-loop hints
      const ts = `2026-05-09T10:${i.toString().padStart(2, '0')}:00.000Z`;
      const turn = claudeCodeTurn(i, file, ts);
      turn.content = `USER: still confused?\n\nASSISTANT: not sure either, what do you think?`;
      await store.append(turn);
    }
    const r = await findClusters(store, {
      since: '2026-05-09T09:00:00.000Z',
      until: '2026-05-09T12:00:00.000Z',
    });
    // At least one cluster has the hints clipped down at the 30-cap (the
    // existing SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP).
    const clipped = r.clusters.find((c) => (c.open_loop_hints_omitted ?? 0) > 0);
    expect(clipped).toBeDefined();
    expect(clipped!.open_loop_hints.length).toBeLessThanOrEqual(30);
  });
});
