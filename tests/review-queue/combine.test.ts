import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { combineScript, runPython } from './_helpers.js';

const ITEM_ID = '2026-05-12-040-example-spec';
const SHA = 'abc1234';

function setupRepo(): string {
  return realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-comb-')));
}

interface Finding {
  severity: string;
  where: string;
  finding: string;
  cross_ref?: { round: number; reviewer: string; finding_index: number };
}

function writeRequest(root: string, round: number, requestedAt: string = '2026-05-12T08:00:00Z') {
  const dir = join(root, 'backlog/reviews', ITEM_ID, `r${round}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'request.md'),
    [
      '---',
      `item_id: "${ITEM_ID}"`,
      `round: ${round}`,
      `spec_commit_sha: "${SHA}"`,
      `artifact_path: "backlog/ready/${ITEM_ID}.md"`,
      'class: "narrow"',
      `requested_at: "${requestedAt}"`,
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
) {
  const lines = [
    '---',
    `item_id: "${ITEM_ID}"`,
    `round: ${round}`,
    `reviewer: "${reviewer}"`,
    `artifact_sha: "${SHA}"`,
    `completed_at: "2026-05-12T09:00:00Z"`,
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
      if (f.cross_ref) {
        lines.push('    cross_ref:');
        lines.push(`      round: ${f.cross_ref.round}`);
        lines.push(`      reviewer: "${f.cross_ref.reviewer}"`);
        lines.push(`      finding_index: ${f.cross_ref.finding_index}`);
      }
    }
  }
  lines.push('---', '', 'body', '');
  writeFileSync(join(roundDir, `${reviewer}.md`), lines.join('\n'));
}

function runCombine(
  root: string,
  extra: string[] = [],
): { code: number; stdout: string; stderr: string } {
  return runPython([combineScript(), `--repo-root=${root}`, '--no-git', '--all', ...extra]);
}

function readCombined(roundDir: string): { fm: Record<string, unknown>; body: string } {
  const text = readFileSync(join(roundDir, 'combined.md'), 'utf-8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('no frontmatter');
  // crude per-line parse — enough for tests
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
  return { fm, body: m[2] };
}

describe('combine.py', () => {
  let root: string;
  beforeEach(() => {
    root = setupRepo();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('no eligible rounds: exits 0, prints status line, writes nothing', () => {
    const r = runCombine(root);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/no rounds to combine/);
    expect(existsSync(join(root, 'backlog/reviews'))).toBe(false);
  });

  it('both responses present, no convergent where: divergent populated, convergent empty', () => {
    const dir = writeRequest(root, 1);
    writeReviewer(dir, 'codex', 1, 'proceed_after_patches', [
      { severity: 'medium', where: '§AC2 race-loser', finding: 'codex says X' },
    ]);
    writeReviewer(dir, 'cursor', 1, 'proceed_after_patches', [
      { severity: 'medium', where: '§AC4 combine logic', finding: 'cursor says Y' },
    ]);
    expect(runCombine(root).code).toBe(0);
    const { fm, body } = readCombined(dir);
    expect(fm.combined_verdict).toBe('proceed_after_patches');
    expect(fm.escalated_to_founder).toBe(false);
    expect(body).toMatch(/Convergent findings/);
    // No row under convergent
    const convSection = body.split('## Divergent findings')[0];
    expect(convSection).not.toMatch(/\| 1 \|/);
    // Two divergent rows
    expect(body).toMatch(/\| codex \|/);
    expect(body).toMatch(/\| cursor \|/);
  });

  it('both responses present, exact-primary convergent: convergent table populated', () => {
    const dir = writeRequest(root, 1);
    writeReviewer(dir, 'codex', 1, 'proceed_after_patches', [
      { severity: 'high', where: '§AC4 combine logic', finding: 'codex says X' },
    ]);
    writeReviewer(dir, 'cursor', 1, 'proceed_after_patches', [
      { severity: 'medium', where: '§AC4 combine logic', finding: 'cursor says Y' },
    ]);
    expect(runCombine(root).code).toBe(0);
    const { body } = readCombined(dir);
    // severity max = HIGH; source = "both (convergent on `§AC4 combine logic`)"
    expect(body).toMatch(/\| 1 \| HIGH \| both \(convergent on `§AC4 combine logic`\)/);
  });

  it('R2 fixture: Cursor 3-section `where` must NOT converge with single-section AC4', () => {
    const dir = writeRequest(root, 1);
    writeReviewer(dir, 'cursor', 1, 'proceed_after_patches', [
      {
        severity: 'high',
        where: '§Implementation Notes "Strategist watcher" + §AC3 + §AC4',
        finding: 'Cursor R2 H1 — strategist /loop body not specced as an AC',
      },
    ]);
    writeReviewer(dir, 'codex', 1, 'proceed_after_patches', [
      { severity: 'medium', where: '§AC4 combine.py polling semantics', finding: 'Codex R2 M2' },
      { severity: 'medium', where: '§AC4 combine logic', finding: 'Codex R2 M3' },
    ]);
    expect(runCombine(root).code).toBe(0);
    const { body } = readCombined(dir);
    const convSection = body.split('## Divergent findings')[0];
    // Convergent section must have NO rows
    expect(convSection).not.toMatch(/\| 1 \|/);
    // All three findings should appear divergent
    expect(body).toMatch(/§Implementation Notes/);
    expect(body).toMatch(/§AC4 combine\.py polling semantics/);
    expect(body).toMatch(/§AC4 combine logic/);
  });

  it('cross_ref override: groups even when primary `where` differs', () => {
    const dir = writeRequest(root, 1);
    writeReviewer(dir, 'codex', 1, 'proceed_after_patches', [
      { severity: 'high', where: '§AC4 polling', finding: 'codex' },
    ]);
    writeReviewer(dir, 'cursor', 1, 'proceed_after_patches', [
      {
        severity: 'medium',
        where: '§Implementation Notes other',
        finding: 'cursor',
        cross_ref: { round: 1, reviewer: 'codex', finding_index: 1 },
      },
    ]);
    expect(runCombine(root).code).toBe(0);
    const { body } = readCombined(dir);
    expect(body).toMatch(/\| 1 \| HIGH \| both \(convergent/);
  });

  it('verdicts crossing {proceed*, pushback}: divergent + escalated_to_founder', () => {
    const dir = writeRequest(root, 1);
    writeReviewer(dir, 'codex', 1, 'pushback', [
      { severity: 'high', where: '§Goal', finding: 'codex pushback' },
    ]);
    writeReviewer(dir, 'cursor', 1, 'proceed_after_patches', [
      { severity: 'low', where: '§AC2', finding: 'cursor minor' },
    ]);
    expect(runCombine(root).code).toBe(0);
    const { fm } = readCombined(dir);
    expect(fm.combined_verdict).toBe('divergent');
    expect(fm.escalated_to_founder).toBe(true);
  });

  it('one response missing, within timeout: no combined.md written', () => {
    const dir = writeRequest(root, 1, '2026-05-12T11:59:00Z');
    writeReviewer(dir, 'codex', 1, 'proceed', []);
    // pin "now" to be inside the timeout window
    const r = runCombine(root, ['--now=2026-05-12T13:00:00Z']);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/no rounds to combine/);
    expect(existsSync(join(dir, 'combined.md'))).toBe(false);
  });

  it('one response missing, past timeout: single_reviewer_timeout + escalated', () => {
    const dir = writeRequest(root, 1, '2026-05-12T05:00:00Z');
    writeReviewer(dir, 'codex', 1, 'proceed', []);
    const r = runCombine(root, ['--now=2026-05-12T08:00:00Z']);
    expect(r.code).toBe(0);
    const { fm } = readCombined(dir);
    expect(fm.combined_verdict).toBe('single_reviewer_timeout');
    expect(fm.escalated_to_founder).toBe(true);
    expect(fm.cursor_response).toBe(null);
  });

  it('both responses missing, past timeout: no_responses + escalated', () => {
    const dir = writeRequest(root, 1, '2026-05-12T05:00:00Z');
    const r = runCombine(root, ['--now=2026-05-12T08:00:00Z']);
    expect(r.code).toBe(0);
    const { fm } = readCombined(dir);
    expect(fm.combined_verdict).toBe('no_responses');
    expect(fm.escalated_to_founder).toBe(true);
    expect(fm.codex_response).toBe(null);
    expect(fm.cursor_response).toBe(null);
  });

  it('combined.md already exists: skip (no race-overwrite)', () => {
    const dir = writeRequest(root, 1);
    writeReviewer(dir, 'codex', 1, 'proceed', []);
    writeReviewer(dir, 'cursor', 1, 'proceed', []);
    expect(runCombine(root).code).toBe(0);
    const first = readFileSync(join(dir, 'combined.md'), 'utf-8');
    // Second run should be a no-op (round already has combined.md)
    const r2 = runCombine(root);
    expect(r2.code).toBe(0);
    expect(r2.stdout).toMatch(/no rounds to combine/);
    const second = readFileSync(join(dir, 'combined.md'), 'utf-8');
    expect(second).toBe(first);
  });

  it('orphan .tmp.* older than 30 min cleaned up; younger left alone', () => {
    const dir = writeRequest(root, 1);
    writeReviewer(dir, 'codex', 1, 'proceed', []);
    writeReviewer(dir, 'cursor', 1, 'proceed', []);
    const staleTmp = join(dir, 'codex.md.deadbeef.tmp');
    const freshTmp = join(dir, 'cursor.md.cafebabe.tmp');
    writeFileSync(staleTmp, 'leftover');
    writeFileSync(freshTmp, 'in-flight');
    // set staleTmp mtime to 31 min ago
    const now = Date.now() / 1000;
    utimesSync(staleTmp, now - 31 * 60, now - 31 * 60);
    utimesSync(freshTmp, now - 60, now - 60);
    expect(runCombine(root).code).toBe(0);
    expect(existsSync(staleTmp)).toBe(false);
    expect(existsSync(freshTmp)).toBe(true);
  });

  // ---------- AC3.5 state-machine fixtures (R4 patch — Codex R4 L1) ----------

  it('AC3.5 (a) — zero patches → convergence (next_round=null implied by proceed verdicts)', () => {
    const dir = writeRequest(root, 1);
    writeReviewer(dir, 'codex', 1, 'proceed', []);
    writeReviewer(dir, 'cursor', 1, 'proceed', []);
    expect(runCombine(root).code).toBe(0);
    const { fm } = readCombined(dir);
    // combine.py leaves next_round null; AC3.5 step 3 (a) preserves it
    // when no patches applied — assertion is structural.
    expect(fm.combined_verdict).toBe('proceed');
    expect(fm.next_round).toBe(null);
    expect(fm.escalated_to_founder).toBe(false);
    // No r2/request.md was created at combine time
    expect(existsSync(join(root, 'backlog/reviews', ITEM_ID, 'r2/request.md'))).toBe(false);
  });

  it('AC3.5 (b) — patches accepted inline, zero deferred-to-followups → verification round needed (default)', () => {
    const dir = writeRequest(root, 1);
    writeReviewer(dir, 'codex', 1, 'proceed_after_patches', [
      { severity: 'high', where: '§AC3', finding: 'load-bearing — strategist must verify' },
    ]);
    writeReviewer(dir, 'cursor', 1, 'proceed_after_patches', [
      { severity: 'high', where: '§AC3', finding: 'same load-bearing finding' },
    ]);
    expect(runCombine(root).code).toBe(0);
    const { fm, body } = readCombined(dir);
    // combine.py records convergence and proceed_after_patches; the watcher
    // (AC3.5 step 3 case b) is responsible for setting next_round = N+1 and
    // running request.py for r2/. combine.py itself leaves next_round=null
    // and the watcher promotes it. This fixture asserts the input shape the
    // watcher will dispatch on: convergent high finding + proceed_after_patches.
    expect(fm.combined_verdict).toBe('proceed_after_patches');
    expect(body).toMatch(/\| 1 \| HIGH \| both \(convergent on `§AC3`\)/);
    // Watcher will write r2/request.md AFTER combine — at this stage it must not exist.
    expect(existsSync(join(root, 'backlog/reviews', ITEM_ID, 'r2/request.md'))).toBe(false);
  });

  it('AC3.5 (c) — explicit waiver: combined.md remains the terminal artifact (next_round=null)', () => {
    // combine.py cannot itself tell apart "verification waived" from "no patches" — both
    // are written with next_round=null and the strategist watcher fills in the explicit
    // waiver line in the disposition step. The structural assertion here mirrors fixture (a):
    // combine.py outputs the same shape; the (a)/(c) distinction is post-combine.
    const dir = writeRequest(root, 1);
    writeReviewer(dir, 'codex', 1, 'proceed_after_patches', [
      { severity: 'low', where: '§AC4 test wording', finding: 'mechanical typo' },
    ]);
    writeReviewer(dir, 'cursor', 1, 'proceed', []);
    expect(runCombine(root).code).toBe(0);
    const { fm } = readCombined(dir);
    expect(fm.combined_verdict).toBe('proceed_after_patches');
    expect(fm.next_round).toBe(null);
    expect(existsSync(join(root, 'backlog/reviews', ITEM_ID, 'r2/request.md'))).toBe(false);
  });
});
