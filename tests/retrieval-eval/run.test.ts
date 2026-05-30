import { describe, expect, it } from 'vitest';
import { formatMarkdown, runRetrievalEval } from '../../tools/retrieval-eval/run.js';

describe('retrieval eval runner', () => {
  it('runs the full committed suite and distinguishes expected current failures', async () => {
    const summary = await runRetrievalEval();

    expect(summary.corpus_mode).toBe('full-suite');
    expect(summary.case_count).toBe(6);
    expect(summary.fixture_count).toBeGreaterThanOrEqual(19);
    expect(summary.aggregate.total_variants).toBe(12);
    expect(summary.aggregate.expected_fail_matched).toBe(3);
    expect(summary.aggregate.expected_fail_mismatched).toBe(0);
    expect(summary.aggregate.unexpected_failures).toBe(0);
    expect(summary.aggregate.exit_code).toBe(1);
  });

  it('focused runs use the same fixture universe and filter only scoring/output', async () => {
    const full = await runRetrievalEval();
    const focused = await runRetrievalEval({ caseId: 'signal-vs-noise-alias' });

    expect(focused.corpus_mode).toBe('focused-full-corpus');
    expect(focused.focused_case).toBe('signal-vs-noise-alias');
    expect(focused.case_count).toBe(1);
    expect(focused.fixture_count).toBe(full.fixture_count);
    expect(focused.cases[0]!.variants).toHaveLength(2);
  });

  it('emits review-useful Markdown with corpus mode, failures, warnings, and recipe', async () => {
    const summary = await runRetrievalEval({ caseId: 'stale-source-degraded-warning' });
    const markdown = formatMarkdown(summary);

    expect(markdown).toContain('Corpus mode: focused-full-corpus');
    expect(markdown).toContain('stale-source-degraded-warning');
    expect(markdown).toContain('eval:eval_source_gap');
    expect(markdown).toContain('discovery:search_memories -> hydrate:get_atoms');
  });
});
