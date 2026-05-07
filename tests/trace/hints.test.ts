import { describe, expect, it } from 'vitest';
import { enrichHints } from '../../src/trace/hints.js';
import { makeAtom } from './fixtures/atoms.js';

describe('enrichHints', () => {
  it('returns empty array for atoms with no hints', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'cursor',
      occurred_at: '2026-05-06T08:00:00.000Z',
      artifacts: [],
    });
    expect(enrichHints([a])).toEqual([]);
  });

  it('ends_with_question pulls last question from input with high confidence', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'claude_code',
      occurred_at: '2026-05-06T08:00:00.000Z',
      artifacts: [],
      input: 'I am stuck. Should I use approach A or approach B?',
      output: 'Lets think about it.',
      hints: ['ends_with_question'],
    });
    const out = enrichHints([a]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      atom_id: 'evt_a',
      kind: 'ends_with_question',
      text: 'Should I use approach A or approach B?',
      confidence: 'high',
    });
  });

  it('unresolved_assistant_q pulls last question from output with medium confidence', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'claude_code',
      occurred_at: '2026-05-06T08:00:00.000Z',
      artifacts: [],
      input: 'help me',
      output: 'Did you want me to also wire up the second tool?',
      hints: ['unresolved_assistant_q'],
    });
    const out = enrichHints([a]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      atom_id: 'evt_a',
      kind: 'unresolved_assistant_q',
      confidence: 'medium',
    });
    expect(out[0]!.text).toContain('wire up the second tool');
  });

  it('contains_todo extracts the TODO snippet with high confidence', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'cursor',
      occurred_at: '2026-05-06T08:00:00.000Z',
      artifacts: [],
      input: '',
      output: 'looks good\n// TODO: handle the empty-state case here\nrest',
      hints: ['contains_todo'],
    });
    const out = enrichHints([a]);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe('contains_todo');
    expect(out[0]!.text).toMatch(/TODO/);
    expect(out[0]!.confidence).toBe('high');
  });

  it('explicit_followup extracts the surrounding line with medium confidence', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'claude_code',
      occurred_at: '2026-05-06T08:00:00.000Z',
      artifacts: [],
      input: 'lets follow up on the migration tomorrow',
      output: '',
      hints: ['explicit_followup'],
    });
    const out = enrichHints([a]);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe('explicit_followup');
    expect(out[0]!.confidence).toBe('medium');
    expect(out[0]!.text).toContain('follow up');
  });

  it('multiple hints on one atom enrich into multiple results', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'claude_code',
      occurred_at: '2026-05-06T08:00:00.000Z',
      artifacts: [],
      input: 'should I commit this?',
      output: 'TODO: revisit threshold',
      hints: ['ends_with_question', 'contains_todo'],
    });
    const out = enrichHints([a]);
    expect(out).toHaveLength(2);
    expect(out.map((h) => h.kind).sort()).toEqual([
      'contains_todo',
      'ends_with_question',
    ]);
  });

  it('drops a hint when the corresponding text cannot be extracted', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'cursor',
      occurred_at: '2026-05-06T08:00:00.000Z',
      artifacts: [],
      input: '',
      output: '',
      hints: ['ends_with_question'],
    });
    expect(enrichHints([a])).toEqual([]);
  });

  it('ignores unknown hint kinds', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'cursor',
      occurred_at: '2026-05-06T08:00:00.000Z',
      artifacts: [],
      input: 'hi?',
      output: 'hi',
      hints: ['some_future_kind'],
    });
    expect(enrichHints([a])).toEqual([]);
  });

  it('processes multiple atoms preserving order', () => {
    const a = makeAtom({
      id: 'evt_a',
      app: 'claude_code',
      occurred_at: '2026-05-06T08:00:00.000Z',
      artifacts: [],
      input: 'Q1?',
      output: '',
      hints: ['ends_with_question'],
    });
    const b = makeAtom({
      id: 'evt_b',
      app: 'claude_code',
      occurred_at: '2026-05-06T08:30:00.000Z',
      artifacts: [],
      input: '',
      output: 'TODO: do X',
      hints: ['contains_todo'],
    });
    const out = enrichHints([a, b]);
    expect(out.map((h) => h.atom_id)).toEqual(['evt_a', 'evt_b']);
  });
});
