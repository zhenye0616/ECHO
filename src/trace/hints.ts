import type { NormalizedContextEvent } from '../normalize/types.js';
import type { Confidence, OpenLoopHintEnriched, OpenLoopHintKind } from './types.js';

const FOLLOWUP_RE = /\b(follow up|come back to|will do later)\b/i;
const TODO_RE = /\b(TODO|FIXME)[:\s][^\n]*/;

const KIND_CONFIDENCE: Record<OpenLoopHintKind, Confidence> = {
  ends_with_question: 'high',
  unresolved_assistant_q: 'medium',
  contains_todo: 'high',
  explicit_followup: 'medium',
};

const KNOWN_KINDS: OpenLoopHintKind[] = [
  'ends_with_question',
  'unresolved_assistant_q',
  'contains_todo',
  'explicit_followup',
];

export function enrichHints(
  atoms: NormalizedContextEvent[],
): OpenLoopHintEnriched[] {
  const out: OpenLoopHintEnriched[] = [];
  for (const atom of atoms) {
    const hints = atom.open_loop_hints;
    if (hints === undefined || hints.length === 0) continue;
    const input = atom.action.input ?? '';
    const output = atom.action.output ?? '';
    for (const raw of hints) {
      if (!isKnownKind(raw)) continue;
      const text = extractHintText(raw, input, output);
      if (text === undefined || text.length === 0) continue;
      out.push({
        atom_id: atom.id,
        kind: raw,
        text,
        confidence: KIND_CONFIDENCE[raw],
      });
    }
  }
  return out;
}

function isKnownKind(s: string): s is OpenLoopHintKind {
  return (KNOWN_KINDS as string[]).includes(s);
}

function extractHintText(
  kind: OpenLoopHintKind,
  input: string,
  output: string,
): string | undefined {
  switch (kind) {
    case 'ends_with_question':
      return lastQuestion(input);
    case 'unresolved_assistant_q':
      return lastQuestion(output);
    case 'contains_todo': {
      const m = TODO_RE.exec(`${input}\n${output}`);
      return m === null ? undefined : (m[0] as string).trim();
    }
    case 'explicit_followup': {
      const combined = `${input}\n${output}`;
      const m = FOLLOWUP_RE.exec(combined);
      if (m === null) return undefined;
      return surroundingPhrase(combined, m.index, (m[0] as string).length);
    }
  }
}

function lastQuestion(text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) return undefined;
  if (!trimmed.endsWith('?')) return undefined;
  const sentences = trimmed.split(/(?<=[.?!])\s+/);
  const last = sentences[sentences.length - 1];
  if (last === undefined) return undefined;
  return last.trim();
}

function surroundingPhrase(
  source: string,
  matchStart: number,
  matchLen: number,
): string {
  // Take the line containing the match, trimmed
  const before = source.lastIndexOf('\n', matchStart - 1);
  const after = source.indexOf('\n', matchStart + matchLen);
  const start = before === -1 ? 0 : before + 1;
  const end = after === -1 ? source.length : after;
  return source.slice(start, end).trim();
}
