// 052 AC4 — structural assertion that `tools/sync-skills.sh --check` lives
// inside the FIRST fenced code block under the C5 heading of
// skills/merge-and-cleanup.md, not merely somewhere in the file.
//
// The regression this guards: the literal sliding out of the verify command
// fence into C5 explanatory prose, the package-lock.json regeneration
// sub-block, a remediation sentence, or a future comment — leaving the C5
// section's actual verify chain no longer running the sync check.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO = process.cwd();
const SKILL_PATH = join(REPO, 'skills/merge-and-cleanup.md');

// Anchored heading regexes — NOT regex-permissive. The C5/C6 label must be
// followed by a non-alphanumeric separator (period, space, en-dash, EOL).
// This MUST NOT match AC5, BC5, C50, C5A, etc. — only the literal labels.
const C5_HEADING = /^#+\s+C5(?:[^A-Za-z0-9]|$)/;
const C6_HEADING = /^#+\s+C6(?:[^A-Za-z0-9]|$)/;
// Opening / closing fence: 3 backticks at line start (with optional language tag).
const FENCE = /^[ \t]*```/;

interface ExtractionResult {
  fenceBody: string | null;
  error: string | null;
}

function extractFirstC5CodeFence(text: string): ExtractionResult {
  const lines = text.split('\n');

  let c5Idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (C5_HEADING.test(lines[i])) {
      c5Idx = i;
      break;
    }
  }
  if (c5Idx < 0) return { fenceBody: null, error: 'C5 heading not found' };

  let c6Idx = -1;
  for (let i = c5Idx + 1; i < lines.length; i++) {
    if (C6_HEADING.test(lines[i])) {
      c6Idx = i;
      break;
    }
  }
  if (c6Idx < 0) return { fenceBody: null, error: 'C6 heading not found after C5' };

  // Find first opening fence in the C5..C6 range.
  let openIdx = -1;
  for (let i = c5Idx + 1; i < c6Idx; i++) {
    if (FENCE.test(lines[i])) {
      openIdx = i;
      break;
    }
  }
  if (openIdx < 0) return { fenceBody: null, error: 'No fenced code block found inside C5' };

  // Find matching closing fence after the opening fence, still within C5..C6.
  let closeIdx = -1;
  for (let i = openIdx + 1; i < c6Idx; i++) {
    if (FENCE.test(lines[i])) {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx < 0) {
    return { fenceBody: null, error: 'C5 fenced code block not closed before C6' };
  }

  return { fenceBody: lines.slice(openIdx + 1, closeIdx).join('\n'), error: null };
}

describe('skills/merge-and-cleanup.md — C5 verify block shape', () => {
  it('first fenced code block under C5 contains the literal `tools/sync-skills.sh --check`', () => {
    const text = readFileSync(SKILL_PATH, 'utf-8');
    const result = extractFirstC5CodeFence(text);
    if (result.error) {
      throw new Error(result.error);
    }
    expect(result.fenceBody).not.toBeNull();
    expect(result.fenceBody!.includes('tools/sync-skills.sh --check')).toBe(true);
  });

  it('extraction does not match adjacent heading variants like AC5 or C50', () => {
    // Synthetic content: only AC5 and C50 headings present, no real C5.
    const synthetic = [
      '## AC5. fake',
      '```bash',
      'tools/sync-skills.sh --check',
      '```',
      '## C50. also fake',
      '## C6. real',
    ].join('\n');
    const result = extractFirstC5CodeFence(synthetic);
    expect(result.fenceBody).toBeNull();
    expect(result.error).toBe('C5 heading not found');
  });

  it('reports distinct error when C6 heading is missing after C5', () => {
    const synthetic = [
      '### C5. Verify',
      '```bash',
      'tools/sync-skills.sh --check',
      '```',
      '## something-else',
    ].join('\n');
    const result = extractFirstC5CodeFence(synthetic);
    expect(result.fenceBody).toBeNull();
    expect(result.error).toBe('C6 heading not found after C5');
  });

  it('reports distinct error when no code fence is inside C5', () => {
    const synthetic = [
      '### C5. Verify',
      'just prose with `tools/sync-skills.sh --check` inline',
      '### C6. Next',
    ].join('\n');
    const result = extractFirstC5CodeFence(synthetic);
    expect(result.fenceBody).toBeNull();
    expect(result.error).toBe('No fenced code block found inside C5');
  });
});
