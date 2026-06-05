import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { combineScript, dispatchScript, runPython } from './_helpers.js';

// AC3 fixture preamble: tmpdir must mirror `request.py find_artifact()`'s
// search path, since the helper invokes request.py transitively on (b). The
// stub backlog item file need not be a valid spec; find_artifact() only
// checks existence.

const ITEM_ID = '2026-05-12-040-example-spec';
const R1_SHA = 'aaaa111';
const R2_SHA = 'bbbb222';

interface Finding {
  severity: string;
  where: string;
  finding: string;
}

function setupRepo(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-watch-')));
  mkdirSync(join(root, 'backlog/ready'), { recursive: true });
  writeFileSync(
    join(root, 'backlog/ready', `${ITEM_ID}.md`),
    `---\nid: ${ITEM_ID}\n---\nbody\n`,
  );
  return root;
}

function writeRequest(root: string, round: number, sha: string = R1_SHA, stage = 'ready'): string {
  const dir = join(root, 'backlog/reviews', ITEM_ID, `r${round}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'request.md'),
    [
      '---',
      `item_id: "${ITEM_ID}"`,
      `round: ${round}`,
      `spec_commit_sha: "${sha}"`,
      `artifact_path: "backlog/${stage}/${ITEM_ID}.md"`,
      'class: "narrow"',
      'requested_at: "2026-05-12T08:00:00Z"',
      'requested_reviewers:',
      '  - "codex"',
      '  - "cursor"',
      '---',
      '',
      'body',
      '',
    ].join('\n'),
  );
  return dir;
}

function writeReviewer(
  roundDir: string,
  reviewer: 'codex' | 'cursor',
  round: number,
  verdict: string,
  findings: Finding[],
  sha: string = R1_SHA,
): void {
  const lines = [
    '---',
    `item_id: "${ITEM_ID}"`,
    `round: ${round}`,
    `reviewer: "${reviewer}"`,
    `artifact_sha: "${sha}"`,
    'completed_at: "2026-05-12T09:00:00Z"',
    `verdict: "${verdict}"`,
  ];
  if (findings.length === 0) {
    lines.push('findings: []');
  } else {
    lines.push('findings:');
    for (const f of findings) {
      lines.push(`  - severity: "${f.severity}"`);
      lines.push(`    where: ${JSON.stringify(f.where)}`);
      lines.push(`    finding: ${JSON.stringify(f.finding)}`);
    }
  }
  lines.push('---', '', 'body', '');
  writeFileSync(join(roundDir, `${reviewer}.md`), lines.join('\n'));
}

function runCombine(root: string) {
  return runPython([combineScript(), `--repo-root=${root}`, '--no-git', '--all']);
}

function runDispatch(root: string, args: string[]) {
  return runPython([dispatchScript(), `--repo-root=${root}`, ITEM_ID, ...args]);
}

function readFrontmatter(path: string): Record<string, unknown> {
  const text = readFileSync(path, 'utf-8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`no frontmatter at ${path}`);
  const fm: Record<string, unknown> = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    let val: unknown = kv[2].trim();
    if (val === 'null') val = null;
    else if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (typeof val === 'string' && /^-?\d+$/.test(val)) val = Number(val);
    else if (typeof val === 'string') val = val.replace(/^['"](.*)['"]$/, '$1');
    fm[kv[1]] = val;
  }
  return fm;
}

function readBody(path: string): string {
  const text = readFileSync(path, 'utf-8');
  const m = text.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return m ? m[1] : text;
}

describe('dispatch-next-round.py (AC3.5 watcher post-combine state machine)', () => {
  let root: string;
  beforeEach(() => {
    root = setupRepo();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('(b) positive — load-bearing convergent finding: writes r2/request.md and sets next_round=2', () => {
    const r1 = writeRequest(root, 1, R1_SHA);
    writeReviewer(r1, 'codex', 1, 'proceed_after_patches', [
      { severity: 'high', where: '§AC3', finding: 'load-bearing — verify next round' },
    ]);
    writeReviewer(r1, 'cursor', 1, 'proceed_after_patches', [
      { severity: 'high', where: '§AC3', finding: 'same load-bearing finding' },
    ]);
    expect(runCombine(root).code).toBe(0);
    const combinedPath = join(r1, 'combined.md');
    const bodyBefore = readBody(combinedPath);

    const r = runDispatch(root, [
      '1',
      '--verdict=proceed_after_patches',
      '--patches-applied=true',
      '--class=narrow',
      '--focus-hints=Verify: §AC3 load-bearing finding',
      `--spec-sha=${R1_SHA}`,
    ]);
    expect(r.code, r.stderr).toBe(0);

    // (1) r2/request.md exists at the passed-through SHA
    const r2Request = join(root, 'backlog/reviews', ITEM_ID, 'r2/request.md');
    expect(existsSync(r2Request)).toBe(true);
    const r2Fm = readFrontmatter(r2Request);
    expect(r2Fm.spec_commit_sha).toBe(R1_SHA);
    expect(r2Fm.round).toBe(2);
    expect(r2Fm.item_id).toBe(ITEM_ID);

    // (2) r1/combined.md frontmatter next_round=2; body unchanged
    const r1Fm = readFrontmatter(combinedPath);
    expect(r1Fm.next_round).toBe(2);
    expect(r1Fm.combined_verdict).toBe('proceed_after_patches');
    expect(readBody(combinedPath)).toBe(bodyBefore);
  });

  it('(a) negative — proceed + no patches: no r2/request.md; next_round stays null; exit 0', () => {
    const r1 = writeRequest(root, 1, R1_SHA);
    writeReviewer(r1, 'codex', 1, 'proceed', []);
    writeReviewer(r1, 'cursor', 1, 'proceed', []);
    expect(runCombine(root).code).toBe(0);

    const r = runDispatch(root, [
      '1',
      '--verdict=proceed',
      '--patches-applied=false',
      '--class=narrow',
      '--focus-hints=',
    ]);
    expect(r.code, r.stderr).toBe(0);

    expect(existsSync(join(root, 'backlog/reviews', ITEM_ID, 'r2/request.md'))).toBe(false);
    const r1Fm = readFrontmatter(join(r1, 'combined.md'));
    expect(r1Fm.next_round).toBe(null);
  });

  it('(b) race-loser — idempotent at same SHA; exit 2 at different SHA', () => {
    const r1 = writeRequest(root, 1, R1_SHA);
    writeReviewer(r1, 'codex', 1, 'proceed_after_patches', [
      { severity: 'high', where: '§AC3', finding: 'load-bearing' },
    ]);
    writeReviewer(r1, 'cursor', 1, 'proceed_after_patches', [
      { severity: 'high', where: '§AC3', finding: 'same' },
    ]);
    expect(runCombine(root).code).toBe(0);

    const first = runDispatch(root, [
      '1',
      '--verdict=proceed_after_patches',
      '--patches-applied=true',
      '--class=narrow',
      '--focus-hints=verify AC3',
      `--spec-sha=${R1_SHA}`,
    ]);
    expect(first.code, first.stderr).toBe(0);

    const r2Request = join(root, 'backlog/reviews', ITEM_ID, 'r2/request.md');
    const firstBytes = readFileSync(r2Request, 'utf-8');

    // Re-invoke at the same SHA — idempotent no-op.
    const second = runDispatch(root, [
      '1',
      '--verdict=proceed_after_patches',
      '--patches-applied=true',
      '--class=narrow',
      '--focus-hints=verify AC3',
      `--spec-sha=${R1_SHA}`,
    ]);
    expect(second.code, second.stderr).toBe(0);
    expect(readFileSync(r2Request, 'utf-8')).toBe(firstBytes);
    // No temp leak in r2/
    const r2Dir = join(root, 'backlog/reviews', ITEM_ID, 'r2');
    const r2Files = readdirSync(r2Dir);
    expect(r2Files.some((n) => n.endsWith('.tmp'))).toBe(false);

    // Re-invoke at a different SHA — race-loser exit 2.
    const third = runDispatch(root, [
      '1',
      '--verdict=proceed_after_patches',
      '--patches-applied=true',
      '--class=narrow',
      '--focus-hints=verify AC3',
      `--spec-sha=${R2_SHA}`,
    ]);
    expect(third.code).toBe(2);
    expect(third.stderr).toMatch(/different SHA/);
  });

  it('(c) explicit waiver — appends rationale line to body; next_round stays null', () => {
    const r1 = writeRequest(root, 1, R1_SHA);
    writeReviewer(r1, 'codex', 1, 'proceed_after_patches', [
      { severity: 'low', where: '§AC4 wording', finding: 'mechanical typo' },
    ]);
    writeReviewer(r1, 'cursor', 1, 'proceed', []);
    expect(runCombine(root).code).toBe(0);

    const r = runDispatch(root, [
      '1',
      '--verdict=proceed_after_patches',
      '--patches-applied=false',
      '--class=narrow',
      '--focus-hints=typo-only patch; no falsifiable claim',
    ]);
    expect(r.code, r.stderr).toBe(0);

    const combinedPath = join(r1, 'combined.md');
    const fm = readFrontmatter(combinedPath);
    expect(fm.next_round).toBe(null);
    expect(readBody(combinedPath)).toMatch(
      /verification waived; rationale: typo-only patch; no falsifiable claim/,
    );

    // Idempotent: re-invoking does not duplicate the line.
    const r2 = runDispatch(root, [
      '1',
      '--verdict=proceed_after_patches',
      '--patches-applied=false',
      '--class=narrow',
      '--focus-hints=typo-only patch; no falsifiable claim',
    ]);
    expect(r2.code, r2.stderr).toBe(0);
    const bodyAfter = readBody(combinedPath);
    const occurrences = bodyAfter.match(/verification waived; rationale:/g) || [];
    expect(occurrences.length).toBe(1);
  });

  it('proposed-stage proceed_after_patches + patches_applied=false routes to verification round', () => {
    mkdirSync(join(root, 'backlog/proposed'), { recursive: true });
    writeFileSync(
      join(root, 'backlog/proposed', `${ITEM_ID}.md`),
      `---\nid: ${ITEM_ID}\n---\nproposed body\n`,
    );
    const r1 = writeRequest(root, 1, R1_SHA, 'proposed');
    writeReviewer(r1, 'codex', 1, 'proceed_after_patches', [
      { severity: 'low', where: '§AC4 wording', finding: 'mechanical typo' },
    ]);
    writeReviewer(r1, 'cursor', 1, 'proceed', []);
    expect(runCombine(root).code).toBe(0);

    const r = runDispatch(root, [
      '1',
      '--verdict=proceed_after_patches',
      '--patches-applied=false',
      '--class=narrow',
      '--focus-hints=Verify proposed-stage patch before promotion',
      `--spec-sha=${R1_SHA}`,
    ]);
    expect(r.code, r.stderr).toBe(0);

    const r2Request = join(root, 'backlog/reviews', ITEM_ID, 'r2/request.md');
    expect(existsSync(r2Request)).toBe(true);
    const r2Body = readFileSync(r2Request, 'utf-8');
    expect(r2Body).toMatch(new RegExp(`artifact_path: backlog/proposed/${ITEM_ID}\\.md`));
    const r1Fm = readFrontmatter(join(r1, 'combined.md'));
    expect(r1Fm.next_round).toBe(2);
    expect(readBody(join(r1, 'combined.md'))).not.toMatch(/verification waived; rationale:/);
  });
});
