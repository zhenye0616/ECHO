import { describe, expect, it } from 'vitest';
import { runRetrievalEval } from '../../tools/retrieval-eval/run.js';

describe('retrieval eval scoring', () => {
  it('classifies the signal-vs-noise alias gap as an expected current failure', async () => {
    const summary = await runRetrievalEval({ caseId: 'signal-vs-noise-alias' });
    const [natural, control] = summary.cases[0]!.variants;

    expect(natural!.result_status).toBe('expected_fail_matched');
    expect(natural!.missing_primary_refs).toEqual([
      'sig-primary-claude',
      'sig-primary-codex',
      'sig-decision-git',
    ]);
    expect(natural!.forbidden_noise_refs).toEqual(['sig-forbidden-cursor-warning']);

    expect(control!.result_status).toBe('pass');
    expect(control!.failed_metrics).toEqual([]);
    expect(control!.top_evidence_refs).toEqual([
      'sig-decision-git',
      'sig-primary-codex',
      'sig-primary-claude',
    ]);
  });

  it('records eval-derived source-gap warnings separately from tool warnings', async () => {
    const summary = await runRetrievalEval({ caseId: 'stale-source-degraded-warning' });
    for (const variant of summary.cases[0]!.variants) {
      expect(variant.result_status).toBe('pass');
      expect(variant.observed_warnings).toContainEqual(
        expect.objectContaining({ code: 'eval_source_gap', origin: 'eval', ref: 'cursor' }),
      );
    }
  });

  it('scores newest-first hydration and reports clipped hydration as legible loss', async () => {
    const summary = await runRetrievalEval({ caseId: 'resume-after-clear-newest-first' });
    for (const variant of summary.cases[0]!.variants) {
      expect(variant.result_status).toBe('pass');
      expect(variant.top_evidence_refs.slice(0, 3)).toEqual([
        'resume-newest-primary',
        'resume-context-git',
        'resume-context-codex',
      ]);
      expect(variant.observed_warnings).toContainEqual(
        expect.objectContaining({ code: 'eval_truncated_hydration', origin: 'eval' }),
      );
    }
  });
});
