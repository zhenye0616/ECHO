import { describe, expect, it } from 'vitest';
import { collectFixtureRefs, validateRetrievalCase } from '../../eval/retrieval/schema.js';
import { loadCases, loadFixtureEvents } from '../../tools/retrieval-eval/run.js';

describe('retrieval eval cases', () => {
  it('loads the six committed seed cases and validates label refs', async () => {
    const cases = await loadCases(process.cwd());
    const fixtures = await loadFixtureEvents(process.cwd(), cases);
    const fixtureRefs = collectFixtureRefs(fixtures);

    expect(cases.map((c) => c.id).sort()).toEqual([
      'generated-label-circular-retrieval',
      'neutrality-axis-alias',
      'resume-after-clear-newest-first',
      'signal-vs-noise-alias',
      'stale-source-degraded-warning',
      'what-shipped-today-needs-artifacts',
    ]);

    for (const c of cases) {
      expect(c.query_variants.length).toBeGreaterThanOrEqual(2);
      const result = validateRetrievalCase(c, fixtureRefs);
      expect(result.errors).toEqual([]);
    }
  });

  it('keeps P0 cases primary-labeled and includes cross-tool plus warning cases', async () => {
    const cases = await loadCases(process.cwd());
    const p0Cases = cases.filter((c) => c.priority === 'P0');
    expect(p0Cases.length).toBeGreaterThanOrEqual(4);
    expect(p0Cases.every((c) => c.required_primary.length > 0)).toBe(true);

    const crossToolCases = cases.filter((c) => c.required_sources.length >= 2);
    expect(crossToolCases.length).toBeGreaterThanOrEqual(2);

    const warningCases = cases.filter((c) => c.must_warn.length > 0);
    expect(warningCases.map((c) => c.id).sort()).toEqual([
      'resume-after-clear-newest-first',
      'stale-source-degraded-warning',
    ]);
  });
});
