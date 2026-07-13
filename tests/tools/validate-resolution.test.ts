import { describe, expect, it } from 'vitest';
import { escapeMarkdownTableCell } from '../../tools/validate-resolution.js';

describe('validate-resolution Markdown rendering', () => {
  it('escapes repeated backslashes before pipes and normalizes all newline forms', () => {
    expect(escapeMarkdownTableCell('a\\\\b||c\r\nd\re\nf')).toBe('a\\\\\\\\b\\|\\|c ⏎ d ⏎ e ⏎ f');
  });

  it('preserves the output bound after escaping', () => {
    expect(escapeMarkdownTableCell('\\'.repeat(240))).toHaveLength(240);
  });

  it('returns an empty cell for undefined input', () => {
    expect(escapeMarkdownTableCell(undefined)).toBe('');
  });
});
