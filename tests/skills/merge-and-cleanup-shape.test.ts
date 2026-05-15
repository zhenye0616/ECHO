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

// 054 AC2 — structural assertions for the §C3 pause-contract change and the
// §C3.5 cross-vendor consult section. Mirrors the C5/C6 pattern: anchored
// regex extraction, no EOF fallback, synthetic tests independent of canonical.

const C3_HEADING = /^#+\s+C3(?:[^A-Za-z0-9]|$)/;
const C3_5_HEADING = /^#+\s+C3\.5(?:[^A-Za-z0-9]|$)/;
const C4_HEADING = /^#+\s+C4(?:[^A-Za-z0-9]|$)/;
const POST_REVIEW_HEADING = /^#+\s+Post-review\s+handling(?:[^A-Za-z0-9]|$)/i;
const CONSULT_FAILURE_HEADING = /^#+\s+Consult-failure\s+recovery(?:[^A-Za-z0-9]|$)/i;
const PROMPT_SUBHEADING = /^#+\s+.*prompt/i;

interface BlockResult { block: string | null; error: string | null; }

function extractBetween(text: string, startRe: RegExp, endRe: RegExp,
                       startLabel: string, endLabel: string): BlockResult {
  const lines = text.split('\n');
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (startRe.test(lines[i])) { startIdx = i; break; }
  }
  if (startIdx < 0) return { block: null, error: `${startLabel} heading not found` };
  let endIdx = -1;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (endRe.test(lines[i])) { endIdx = i; break; }
  }
  if (endIdx < 0) return { block: null, error: `${endLabel} heading not found after ${startLabel}` };
  return { block: lines.slice(startIdx + 1, endIdx).join('\n'), error: null };
}

// Join `\`-continuation lines into single logical lines.
function joinContinuations(text: string): string[] {
  const lines = text.split('\n');
  const out: string[] = [];
  let buf = '';
  for (const ln of lines) {
    if (ln.endsWith('\\')) { buf += ln.slice(0, -1) + ' '; continue; }
    out.push(buf + ln); buf = '';
  }
  if (buf) out.push(buf);
  return out;
}

function findCodexExecLine(block: string): string | null {
  const logical = joinContinuations(block);
  for (const ln of logical) {
    if (ln.includes('codex exec')) return ln;
  }
  return null;
}

describe('skills/merge-and-cleanup.md — §C3 pause contract (054 AC2a)', () => {
  it('§C3 surfaces c3.5 / continue / abort branches within 30 lines of <<<<<<<', () => {
    const text = readFileSync(SKILL_PATH, 'utf-8');
    const res = extractBetween(text, C3_HEADING, C3_5_HEADING, 'C3', 'C3.5');
    if (res.error) throw new Error(res.error);
    const lines = res.block!.split('\n');
    const conflictIdx = lines.findIndex((l) => l.includes('<<<<<<<'));
    expect(conflictIdx).toBeGreaterThanOrEqual(0);
    const window = lines.slice(Math.max(0, conflictIdx - 30), conflictIdx + 30).join('\n');
    expect(window).toMatch(/c3\.5/i);
    expect(window).toMatch(/`continue`/);
    expect(window).toMatch(/`abort`/);
  });

  it('reports distinct error when C3.5 heading is missing after C3', () => {
    const synthetic = ['### C3. fake', '<<<<<<< blah', '### C4. next'].join('\n');
    const res = extractBetween(synthetic, C3_HEADING, C3_5_HEADING, 'C3', 'C3.5');
    expect(res.error).toBe('C3.5 heading not found after C3');
  });

  it('reports distinct error when §C3 lacks the c3.5 branch', () => {
    const synthetic = [
      '### C3. Surface',
      '<<<<<<< marker mention',
      'Resolve in editor and reply `continue` or reply `abort`.',
      '### C3.5. consult',
    ].join('\n');
    const res = extractBetween(synthetic, C3_HEADING, C3_5_HEADING, 'C3', 'C3.5');
    expect(res.error).toBeNull();
    // The block lacks `c3.5` near the marker — assertion would fail in real test.
    expect(/c3\.5/i.test(res.block!)).toBe(false);
  });
});

describe('skills/merge-and-cleanup.md — §C3.5 contract (054 AC2b)', () => {
  it('§C3.5 contains OPTIONAL marker, codex-exec recipe with 5 required substrings, founder-explicit + strategist-recommended triggers, verdict header strings, and pwd -P canonicalization mention', () => {
    const text = readFileSync(SKILL_PATH, 'utf-8');
    const res = extractBetween(text, C3_5_HEADING, C4_HEADING, 'C3.5', 'C4');
    if (res.error) throw new Error(res.error);
    const block = res.block!;
    expect(block).toContain('OPTIONAL');
    const execLine = findCodexExecLine(block);
    expect(execLine).not.toBeNull();
    expect(execLine!).toContain('codex exec');
    expect(execLine!).toMatch(/MERGER_WT/);
    expect(execLine!).toContain('--sandbox read-only');
    expect(execLine!).toMatch(/>>?\s*"?\$?MERGER_WT[^\s]*\.c3\.5-stdout/);
    expect(execLine!).toMatch(/2>>?\s*"?\$?MERGER_WT[^\s]*\.c3\.5-stderr/);
    expect(block.toLowerCase()).toContain('founder-explicit');
    expect(block.toLowerCase()).toContain('strategist-recommended');
    expect(block).toContain('verdict:');
    expect(block).toContain('reviewer:');
    expect(block).toContain('consult_cwd:');
    expect(block).toContain('proceed-as-proposed');
    expect(block).toContain('proceed-with-modifications');
    expect(block).toContain('pushback');
    expect(block).toContain('pwd -P');
  });

  it('§C3.5 prompt-template subsection has ≥6 items, mentions $MERGER_WT, and item (vi) names consult_cwd + pwd -P', () => {
    const text = readFileSync(SKILL_PATH, 'utf-8');
    const res = extractBetween(text, C3_5_HEADING, C4_HEADING, 'C3.5', 'C4');
    const block = res.block!;
    // Locate prompt subheading (any depth) and extract until next sibling-or-deeper heading.
    const lines = block.split('\n');
    let promptIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (PROMPT_SUBHEADING.test(lines[i])) { promptIdx = i; break; }
    }
    expect(promptIdx).toBeGreaterThanOrEqual(0);
    let endIdx = lines.length;
    for (let i = promptIdx + 1; i < lines.length; i++) {
      if (/^#+\s+/.test(lines[i])) { endIdx = i; break; }
    }
    const promptBlock = lines.slice(promptIdx + 1, endIdx).join('\n');
    const items = promptBlock.match(/^\s*(?:[-*]|\d+\.)\s+/gm) || [];
    expect(items.length).toBeGreaterThanOrEqual(6);
    expect(promptBlock).toMatch(/MERGER_WT/);
    expect(promptBlock).toContain('consult_cwd');
    expect(promptBlock).toContain('pwd -P');
  });

  it('§C3.5 Post-review handling subsection has exactly 3 entries with action prose for each verdict', () => {
    const text = readFileSync(SKILL_PATH, 'utf-8');
    const res = extractBetween(text, C3_5_HEADING, C4_HEADING, 'C3.5', 'C4');
    const block = res.block!;
    const lines = block.split('\n');
    let prIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (POST_REVIEW_HEADING.test(lines[i])) { prIdx = i; break; }
    }
    expect(prIdx).toBeGreaterThanOrEqual(0);
    let endIdx = lines.length;
    for (let i = prIdx + 1; i < lines.length; i++) {
      if (/^#+\s+/.test(lines[i])) { endIdx = i; break; }
    }
    const prBlock = lines.slice(prIdx + 1, endIdx).join('\n');
    // Three top-level list entries (one per verdict) with ≥30 chars action prose each.
    for (const verdict of ['proceed-as-proposed', 'proceed-with-modifications', 'pushback']) {
      const re = new RegExp(`(?:^|\\n)[ \\t]*[-*]\\s+\\*?\\*?${verdict}\\*?\\*?[^\\n]{30,}`);
      expect(re.test(prBlock)).toBe(true);
    }
  });

  it('§C3.5 Consult-failure recovery subsection names all 4 failure-mode signatures', () => {
    const text = readFileSync(SKILL_PATH, 'utf-8');
    const res = extractBetween(text, C3_5_HEADING, C4_HEADING, 'C3.5', 'C4');
    const block = res.block!;
    const lines = block.split('\n');
    let cfIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (CONSULT_FAILURE_HEADING.test(lines[i])) { cfIdx = i; break; }
    }
    expect(cfIdx).toBeGreaterThanOrEqual(0);
    let endIdx = lines.length;
    for (let i = cfIdx + 1; i < lines.length; i++) {
      if (/^#+\s+/.test(lines[i])) { endIdx = i; break; }
    }
    const cfBlock = lines.slice(cfIdx + 1, endIdx).join('\n');
    // (i) not found OR 127
    expect(/not found|127/.test(cfBlock)).toBe(true);
    // (ii) exit + non-zero within 50 chars of each other
    const ii = cfBlock.match(/exit[\s\S]{0,50}non-zero|non-zero[\s\S]{0,50}exit/);
    expect(ii).not.toBeNull();
    // (iii) malformed OR unparsable
    expect(/malformed|unparsable/.test(cfBlock)).toBe(true);
    // (iv) consult_cwd + (does not match | mismatch | !=)
    expect(cfBlock).toContain('consult_cwd');
    expect(/does not match|mismatch|!=/.test(cfBlock)).toBe(true);
  });

  it('synthetic: missing C3.5 heading reports distinct error', () => {
    const synthetic = ['### C3. real', 'body', '### C4. next'].join('\n');
    const res = extractBetween(synthetic, C3_5_HEADING, C4_HEADING, 'C3.5', 'C4');
    expect(res.error).toBe('C3.5 heading not found');
  });

  it('synthetic: missing C4 after C3.5 reports distinct error', () => {
    const synthetic = ['### C3.5. consult', 'body', '## something-else'].join('\n');
    const res = extractBetween(synthetic, C3_5_HEADING, C4_HEADING, 'C3.5', 'C4');
    expect(res.error).toBe('C4 heading not found after C3.5');
  });

  it('synthetic: codex-exec line missing $MERGER_WT fails', () => {
    const block = '```bash\ncodex exec --sandbox read-only - < x > x.c3.5-stdout 2> x.c3.5-stderr\n```';
    const line = findCodexExecLine(block);
    expect(line).not.toBeNull();
    expect(/MERGER_WT/.test(line!)).toBe(false);
  });

  it('synthetic: codex-exec line missing .c3.5-stdout fails', () => {
    const block = '```bash\ncodex exec -C "$MERGER_WT" --sandbox read-only - < x 2> x.c3.5-stderr\n```';
    const line = findCodexExecLine(block);
    expect(line).not.toBeNull();
    expect(/>>?\s*"?\$?MERGER_WT[^\s]*\.c3\.5-stdout/.test(line!)).toBe(false);
  });

  it('synthetic: codex-exec line missing .c3.5-stderr fails', () => {
    const block = '```bash\ncodex exec -C "$MERGER_WT" --sandbox read-only - < x > x.c3.5-stdout\n```';
    const line = findCodexExecLine(block);
    expect(line).not.toBeNull();
    expect(/2>>?\s*"?\$?MERGER_WT[^\s]*\.c3\.5-stderr/.test(line!)).toBe(false);
  });

  it('synthetic: continuation-backslash line-join works for multi-line codex-exec recipe', () => {
    const block = '```bash\ncodex exec -C "$MERGER_WT" --sandbox read-only - < "$MERGER_WT/.c3.5-prompt.md" \\\n    > "$MERGER_WT/.c3.5-stdout" 2> "$MERGER_WT/.c3.5-stderr"\n```';
    const line = findCodexExecLine(block);
    expect(line).not.toBeNull();
    expect(line!).toContain('codex exec');
    expect(line!).toMatch(/MERGER_WT/);
    expect(line!).toContain('--sandbox read-only');
    expect(line!).toMatch(/>\s*"?\$?MERGER_WT[^\s]*\.c3\.5-stdout/);
    expect(line!).toMatch(/2>\s*"?\$?MERGER_WT[^\s]*\.c3\.5-stderr/);
  });

  it('synthetic: Post-review handling with only 2 verdict entries fails third-verdict check', () => {
    const prBlock = [
      '- **proceed-as-proposed** — Codex endorsed; apply your resolution and reply `continue` now please.',
      '- **proceed-with-modifications** — Codex agreed but with refinements you need to fold; then reply `continue`.',
    ].join('\n');
    const re = new RegExp(`(?:^|\\n)[ \\t]*[-*]\\s+\\*?\\*?pushback\\*?\\*?[^\\n]{30,}`);
    expect(re.test(prBlock)).toBe(false);
  });

  it('synthetic: Consult-failure recovery missing failure mode (iv) fails consult_cwd signature', () => {
    const cfBlock = [
      '- (i) not found / 127 — surface stderr.',
      '- (ii) exit non-zero — surface stderr.',
      '- (iii) malformed response — surface stdout excerpt.',
    ].join('\n');
    expect(cfBlock).not.toContain('consult_cwd');
  });
});

describe('skills/merge-and-cleanup.md — review_notes + commit-body audit-trail (054 AC2c)', () => {
  it('§C6 review_notes template contains the C3.5 cross-vendor consult line', () => {
    const text = readFileSync(SKILL_PATH, 'utf-8');
    const c6Heading = /^#+\s+C6(?:[^A-Za-z0-9]|$)/;
    const c7Heading = /^#+\s+C7(?:[^A-Za-z0-9]|$)/;
    const res = extractBetween(text, c6Heading, c7Heading, 'C6', 'C7');
    if (res.error) throw new Error(res.error);
    expect(res.block).toContain('C3.5 cross-vendor consult:');
  });

  it('§C8 commit-body HEREDOC contains the Cross-vendor consult signpost', () => {
    const text = readFileSync(SKILL_PATH, 'utf-8');
    const c8Heading = /^#+\s+C8(?:[^A-Za-z0-9]|$)/;
    const c9Heading = /^#+\s+C9(?:[^A-Za-z0-9]|$)/;
    const res = extractBetween(text, c8Heading, c9Heading, 'C8', 'C9');
    if (res.error) throw new Error(res.error);
    expect(res.block).toContain('Cross-vendor consult:');
  });
});
