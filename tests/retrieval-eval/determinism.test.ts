import { describe, expect, it } from 'vitest';
import { loadCases, loadFixtureEvents, runRetrievalEval } from '../../tools/retrieval-eval/run.js';

describe('retrieval eval determinism', () => {
  it('keeps statuses and fixture refs stable across random MemoryStorage IDs', async () => {
    const first = await runRetrievalEval();
    const second = await runRetrievalEval();

    const project = (summary: Awaited<ReturnType<typeof runRetrievalEval>>) =>
      summary.cases.map((c) => ({
        id: c.id,
        variants: c.variants.map((v) => ({
          id: v.variant_id,
          status: v.result_status,
          failed: v.failed_metrics,
          top: v.top_evidence_refs,
        })),
      }));

    expect(project(second)).toEqual(project(first));
  });

  it('does not depend on the caller home directory for source-app fixture rewriting', async () => {
    const a = await runRetrievalEval({ homeDir: '/tmp/echo-eval-home-a' });
    const b = await runRetrievalEval({ homeDir: '/tmp/echo-eval-home-b' });

    expect(a.aggregate).toEqual(b.aggregate);
    expect(a.cases.map((c) => c.variants.map((v) => v.top_evidence_refs))).toEqual(
      b.cases.map((c) => c.variants.map((v) => v.top_evidence_refs)),
    );
  });

  it('commits duplicate raw timestamps only after deterministic disambiguation', async () => {
    const cases = await loadCases(process.cwd());
    const fixtures = await loadFixtureEvents(process.cwd(), cases);
    const duplicateRaw = fixtures.filter(
      (event) => event.metadata?.original_timestamp === '2026-05-29T23:53:00.000Z',
    );

    expect(duplicateRaw.map((event) => event.fixture_ref).sort()).toEqual([
      'resume-context-codex',
      'resume-context-git',
    ]);
    expect(new Set(duplicateRaw.map((event) => event.timestamp)).size).toBe(2);
  });
});
