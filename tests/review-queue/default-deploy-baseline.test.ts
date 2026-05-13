/**
 * default-deploy-baseline.test.ts — 043 AC7 + AC7b.
 *
 * Regression guard: the default codex+cursor deploy must produce byte-
 * identical combined.md output across 043's refactor. The fixture is held
 * inline (not extracted from a pinned SHA) so the test is self-contained;
 * any future change to combine.py's default-deploy output trips this test
 * and forces a deliberate update.
 */
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { combineScript, runPython } from './_helpers.js';

const ITEM_ID = '2026-05-12-040-baseline-fixture';
const SHA = 'abc1234';

function setupRoot(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-base-')));
}

function writeFixture(
  root: string,
  reviewers: { name: string; verdict: string }[],
  requestedAt = '2026-05-12T08:00:00Z',
) {
  const dir = join(root, 'backlog/reviews', ITEM_ID, 'r1');
  mkdirSync(dir, { recursive: true });
  const lines = [
    '---',
    `item_id: "${ITEM_ID}"`,
    'round: 1',
    `spec_commit_sha: "${SHA}"`,
    `artifact_path: "backlog/ready/${ITEM_ID}.md"`,
    'class: "narrow"',
    `requested_at: "${requestedAt}"`,
    'requested_reviewers:',
  ];
  for (const r of reviewers) lines.push(`  - "${r.name}"`);
  lines.push('---', '', 'body', '');
  writeFileSync(join(dir, 'request.md'), lines.join('\n'));
  for (const r of reviewers) {
    if (r.verdict === '__missing__') continue;
    writeFileSync(
      join(dir, `${r.name}.md`),
      [
        '---',
        `item_id: "${ITEM_ID}"`,
        'round: 1',
        `reviewer: "${r.name}"`,
        `artifact_sha: "${SHA}"`,
        'completed_at: "2026-05-12T09:00:00Z"',
        `verdict: "${r.verdict}"`,
        'findings: []',
        '---',
        '',
        'body',
        '',
      ].join('\n'),
    );
  }
  return dir;
}

function readCombinedStripped(dir: string): string {
  const text = readFileSync(join(dir, 'combined.md'), 'utf-8');
  // Strip the non-deterministic combined_at line so the comparison is byte
  // identical (per AC7).
  return text.replace(/combined_at: ['"].*?['"]\n/, 'combined_at: "<STRIPPED>"\n');
}

describe('043 AC7 — default-deploy baseline (codex + cursor happy path)', () => {
  let root: string;
  beforeEach(() => {
    root = setupRoot();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('AC7: codex+cursor both proceed → byte-identical combined.md', () => {
    const dir = writeFixture(root, [
      { name: 'codex', verdict: 'proceed' },
      { name: 'cursor', verdict: 'proceed' },
    ]);
    const r = runPython([
      combineScript(),
      `--repo-root=${root}`,
      '--no-git',
      '--all',
    ]);
    expect(r.code, r.stderr).toBe(0);
    // The exact expected output. This locks down combine.py's default-deploy
    // output structure — any drift (field reorder, body text change, "both"
    // wording change for convergent findings) trips this assertion.
    const expected = [
      '---',
      'item_id: 2026-05-12-040-baseline-fixture',
      'round: 1',
      'combined_at: "<STRIPPED>"',
      'codex_response: codex.md',
      'cursor_response: cursor.md',
      'codex-ops_response: null',
      'patch_commit_sha: null',
      'next_round: null',
      'combined_verdict: proceed',
      'escalated_to_founder: false',
      '---',
      '',
      '# Combined findings',
      '',
      '',
      '## Convergent findings',
      '',
      '| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |',
      '|---|---|---|---|---|---|',
      '',
      '## Divergent findings (single-reviewer or non-overlapping primary `where`)',
      '',
      '| # | Severity | Source | Where | Disposition | Patch SHA / rationale |',
      '|---|---|---|---|---|---|',
      '',
      '## Convergence call',
      '',
      '_Strategist writes after dispositioning (AC3.5 step 3): `claim-ready after R<N>` OR `needs R<N+1> — focus_hints: ...`._',
      '',
      '',
    ].join('\n');
    expect(readCombinedStripped(dir)).toBe(expected);
  });

  it('AC7b: codex absent past 2h timeout, cursor proceed → partial_responses + auto-disposition (044 AC4)', () => {
    // R4 HIGH #1 regression test — proves codex-absent-past-timeout still
    // emits the renamed `partial_responses` verdict. 044 AC4 then flipped
    // the escalation flag to false for the single-missing-proceed sub-case
    // (strategist watcher autonomously dispositions).
    const dir = writeFixture(
      root,
      [
        { name: 'codex', verdict: '__missing__' },
        { name: 'cursor', verdict: 'proceed' },
      ],
      '2026-05-12T05:00:00Z',
    );
    const r = runPython([
      combineScript(),
      `--repo-root=${root}`,
      '--no-git',
      '--all',
      '--now=2026-05-12T08:00:00Z',
    ]);
    expect(r.code, r.stderr).toBe(0);
    const text = readFileSync(join(dir, 'combined.md'), 'utf-8');
    expect(text).toMatch(/combined_verdict: partial_responses/);
    expect(text).toMatch(/escalated_to_founder: false/);
    expect(text).toMatch(/codex_response: null/);
    expect(text).toMatch(/cursor_response: cursor\.md/);
    expect(text).toMatch(/cursor: proceed/); // body enumerates present verdicts
  });
});
