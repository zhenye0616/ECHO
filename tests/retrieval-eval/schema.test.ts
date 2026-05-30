import { describe, expect, it } from 'vitest';
import { validateFixtureEvent, validateRetrievalCase } from '../../eval/retrieval/schema.js';

describe('retrieval eval schema', () => {
  it('rejects an expected-fail variant without structured expected_failure', () => {
    const result = validateRetrievalCase({
      id: 'bad',
      priority: 'P0',
      intent: 'bad case',
      repo_path: '$EVAL_REPO',
      time_window: {
        since: '2026-05-29T00:00:00.000Z',
        until: '2026-05-30T00:00:00.000Z',
      },
      reference_now: '2026-05-30T00:00:00.000Z',
      fixture_files: ['eval/retrieval/fixtures/core.jsonl'],
      query_variants: [
        { id: 'natural', query: 'x', baseline_status: 'expected_fail_current_behavior' },
        { id: 'control', query: 'y', baseline_status: 'pass' },
      ],
      tool_recipe: [
        {
          step_id: 'discovery',
          tool: 'search_memories',
          kind: 'discovery',
          primary_discovery: true,
          params: { query: '$query' },
        },
      ],
      required_sources: [],
      required_primary: ['a'],
      required_context: [],
      acceptable_context: [],
      noise: [],
      forbidden_noise: [],
      must_warn: [],
      canonical_answer_facts: ['fact'],
      budgets: { per_call_bytes: 25000, total_bytes: 50000, max_calls: 3 },
      provenance: [{ kind: 'note', ref: 'x' }],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('expected_failure');
  });

  it('rejects unsupported placeholders and unconstrained hydration collections', () => {
    const result = validateRetrievalCase({
      id: 'bad-placeholder',
      priority: 'P1',
      intent: 'bad case',
      repo_path: '$EVAL_REPO',
      time_window: {
        since: '2026-05-29T00:00:00.000Z',
        until: '2026-05-30T00:00:00.000Z',
      },
      reference_now: '2026-05-30T00:00:00.000Z',
      fixture_files: ['eval/retrieval/fixtures/core.jsonl'],
      query_variants: [
        { id: 'natural', query: 'x', baseline_status: 'pass' },
        { id: 'control', query: 'y', baseline_status: 'pass' },
      ],
      tool_recipe: [
        {
          step_id: 'discovery',
          tool: 'search_memories',
          kind: 'discovery',
          primary_discovery: true,
          params: { query: '$case.bad' },
        },
        {
          step_id: 'hydrate',
          tool: 'get_atoms',
          kind: 'hydration',
          params: { atom_ids: '$steps.discovery.matches[*].id' },
        },
      ],
      required_sources: [],
      required_primary: [],
      required_context: [],
      acceptable_context: [],
      noise: [],
      forbidden_noise: [],
      must_warn: [],
      canonical_answer_facts: ['fact'],
      budgets: { per_call_bytes: 25000, total_bytes: 50000, max_calls: 3 },
      provenance: [{ kind: 'note', ref: 'x' }],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('unsupported placeholder');
    expect(result.errors.join('\n')).toContain('ids_limit <= 50 or paginate');
  });

  it('validates fixture event shape and explicit timezone timestamps', () => {
    const result = validateFixtureEvent({
      fixture_ref: 'ref',
      source: 'git:$EVAL_REPO',
      timestamp: '2026-05-29T00:00:00.000Z',
      content: 'content',
    });
    expect(result.ok).toBe(true);

    const bad = validateFixtureEvent({
      fixture_ref: 'ref',
      source: 'git:$EVAL_REPO',
      timestamp: '2026-05-29T00:00:00',
      content: 'content',
    });
    expect(bad.ok).toBe(false);
  });
});
