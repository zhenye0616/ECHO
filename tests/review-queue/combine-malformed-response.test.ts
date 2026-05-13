import { execFileSync, spawnSync } from 'node:child_process';
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
import { REPO, combineScript, runPython } from './_helpers.js';

const ITEM_ID = '2026-05-12-040-watcher-state-executable-test';
const SHA = 'abc1234';

function setupGitRepo(): { root: string; origin: string } {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-combmal-')));
  const origin = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-combmal-origin-')));

  if (spawnSync('git', ['init', '--bare', '-b', 'main', origin], { stdio: 'ignore' }).status !== 0) {
    execFileSync('git', ['init', '--bare', origin]);
    execFileSync('git', ['symbolic-ref', 'HEAD', 'refs/heads/main'], { cwd: origin });
  }
  if (spawnSync('git', ['init', '-b', 'main', root], { stdio: 'ignore' }).status !== 0) {
    execFileSync('git', ['init', root]);
    execFileSync('git', ['symbolic-ref', 'HEAD', 'refs/heads/main'], { cwd: root });
  }
  execFileSync('git', ['config', 'user.email', 'test@echo.local'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'echo-test'], { cwd: root });
  execFileSync('git', ['remote', 'add', 'origin', origin], { cwd: root });

  mkdirSync(join(root, 'tools/review-queue/schemas'), { recursive: true });
  mkdirSync(join(root, 'raw/internal'), { recursive: true });
  for (const rel of [
    'tools/review-queue/combine.py',
    'tools/review-queue/_lib.py',
    'tools/review-queue/push-with-retry.sh',
    'tools/review-queue/schemas/combined.schema.json',
    'tools/review-queue/schemas/reviewer.schema.json',
    'tools/review-queue/schemas/request.schema.json',
  ]) {
    const data = readFileSync(join(REPO, rel));
    writeFileSync(join(root, rel), data);
  }
  execFileSync('chmod', ['+x', join(root, 'tools/review-queue/push-with-retry.sh')]);

  writeFileSync(join(root, 'README.md'), '# isolated test repo\n');
  execFileSync('git', ['add', '-A'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'baseline'], { cwd: root });
  execFileSync('git', ['push', 'origin', 'main'], { cwd: root });
  return { root, origin };
}

function writeRequest(root: string, round: number): string {
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
      `requested_at: "2026-05-12T08:00:00Z"`,
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

function writeValidReviewer(
  roundDir: string,
  reviewer: 'codex' | 'cursor',
  round: number,
): void {
  writeFileSync(
    join(roundDir, `${reviewer}.md`),
    [
      '---',
      `item_id: "${ITEM_ID}"`,
      `round: ${round}`,
      `reviewer: "${reviewer}"`,
      `artifact_sha: "${SHA}"`,
      `completed_at: "2026-05-12T09:00:00Z"`,
      `verdict: "proceed"`,
      'findings: []',
      '---',
      '',
      'body',
      '',
    ].join('\n'),
  );
}

function writeMalformedCursor(roundDir: string, round: number): void {
  // The canonical 040 R1 failure pattern: `finding:` value starts with `""`.
  writeFileSync(
    join(roundDir, 'cursor.md'),
    [
      '---',
      `item_id: "${ITEM_ID}"`,
      `round: ${round}`,
      `reviewer: "cursor"`,
      `artifact_sha: "${SHA}"`,
      `completed_at: "2026-05-12T09:00:00Z"`,
      `verdict: "proceed_after_patches"`,
      'findings:',
      '  - severity: "low"',
      '    where: "§AC3"',
      '    finding: ""embedded quote and trailing text that breaks YAML"',
      '---',
      '',
      'body',
      '',
    ].join('\n'),
  );
}

function writeMalformedCodex(roundDir: string, round: number): void {
  writeFileSync(
    join(roundDir, 'codex.md'),
    [
      '---',
      `item_id: "${ITEM_ID}"`,
      `round: ${round}`,
      `reviewer: "codex"`,
      `artifact_sha: "${SHA}"`,
      `completed_at: "2026-05-12T09:00:00Z"`,
      `verdict: "proceed_after_patches"`,
      'findings:',
      '  - severity: "high"',
      '    where: "§AC2"',
      '    finding: ""another embedded quote failure"',
      '---',
      '',
      'body',
      '',
    ].join('\n'),
  );
}

function readCombinedRaw(roundDir: string): string {
  return readFileSync(join(roundDir, 'combined.md'), 'utf-8');
}

function readCombinedFrontmatter(roundDir: string): Record<string, unknown> {
  const r = runPython([
    '-c',
    [
      'import json, sys, yaml',
      'text = open(sys.argv[1], "r", encoding="utf-8").read()',
      'fm = text.split("---", 2)[1]',
      'print(json.dumps(yaml.safe_load(fm)))',
    ].join('\n'),
    join(roundDir, 'combined.md'),
  ]);
  if (r.code !== 0) throw new Error(`yaml parse failed: ${r.stderr}`);
  return JSON.parse(r.stdout) as Record<string, unknown>;
}

function gitStatusShort(root: string): string {
  return execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf-8' });
}

function runCombine(root: string): { code: number; stdout: string; stderr: string } {
  return runPython([combineScript(), `--repo-root=${root}`, '--all']);
}

describe('combine.py — malformed-reviewer-response escalation (AC2/AC4)', () => {
  let root: string;
  let origin: string;

  beforeEach(() => {
    const setup = setupGitRepo();
    root = setup.root;
    origin = setup.origin;
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(origin, { recursive: true, force: true });
  });

  it('AC2a: single malformed cursor.md → combined.md with malformed_reviewer_response, queue-errors row appended in same commit, git tree clean', () => {
    const dir = writeRequest(root, 1);
    writeValidReviewer(dir, 'codex', 1);
    writeMalformedCursor(dir, 1);
    // commit the reviewer fixtures so the only untracked work is combine.py's output
    execFileSync('git', ['add', '-A'], { cwd: root });
    execFileSync('git', ['commit', '-m', 'seed reviewer fixtures'], { cwd: root });
    execFileSync('git', ['push', 'origin', 'main'], { cwd: root });

    const r = runCombine(root);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stderr).not.toMatch(/Traceback/);

    const fm = readCombinedFrontmatter(dir);
    expect(fm.combined_verdict).toBe('malformed_reviewer_response');
    expect(fm.escalated_to_founder).toBe(true);
    // String shape — exactly one offender — repo-root-relative path (NOT item-relative).
    expect(fm.offending_response).toBe(
      'backlog/reviews/2026-05-12-040-watcher-state-executable-test/r1/cursor.md',
    );
    expect(typeof fm.parse_error).toBe('string');
    expect(fm.parse_error).toMatch(/malformed YAML/);
    expect(fm.codex_response).toBe('codex.md');
    expect(fm.cursor_response).toBe('cursor.md');
    expect(fm.next_round).toBeNull();

    // queue-errors.md got a MALFORMED-REVIEWER-RESPONSE row for cursor.md
    const queueErrors = readFileSync(join(root, 'raw/internal/queue-errors.md'), 'utf-8');
    expect(queueErrors).toMatch(
      /MALFORMED-REVIEWER-RESPONSE: combine\.py round 2026-05-12-040-watcher-state-executable-test\/r1/,
    );
    expect(queueErrors).toMatch(
      /offending_response=backlog\/reviews\/2026-05-12-040-watcher-state-executable-test\/r1\/cursor\.md/,
    );

    // git status --short is empty — both combined.md AND queue-errors.md were
    // staged in the same commit and pushed; nothing dirty is left in the queue
    // write surface.
    expect(gitStatusShort(root)).toBe('');
  });

  it('AC2b: both codex.md AND cursor.md malformed → offending_response is a length-2 array, both parsed before emit, tree clean', () => {
    const dir = writeRequest(root, 1);
    writeMalformedCodex(dir, 1);
    writeMalformedCursor(dir, 1);
    execFileSync('git', ['add', '-A'], { cwd: root });
    execFileSync('git', ['commit', '-m', 'seed reviewer fixtures'], { cwd: root });
    execFileSync('git', ['push', 'origin', 'main'], { cwd: root });

    const r = runCombine(root);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stderr).not.toMatch(/Traceback/);

    const fm = readCombinedFrontmatter(dir);
    expect(fm.combined_verdict).toBe('malformed_reviewer_response');
    expect(fm.escalated_to_founder).toBe(true);

    // Array shape, length 2, stable iteration order (codex first per REVIEWERS enum).
    expect(Array.isArray(fm.offending_response)).toBe(true);
    expect((fm.offending_response as string[]).length).toBe(2);
    expect((fm.offending_response as string[])[0]).toBe(
      'backlog/reviews/2026-05-12-040-watcher-state-executable-test/r1/codex.md',
    );
    expect((fm.offending_response as string[])[1]).toBe(
      'backlog/reviews/2026-05-12-040-watcher-state-executable-test/r1/cursor.md',
    );

    // parse_error is length-2 list, index-aligned with offending_response.
    expect(Array.isArray(fm.parse_error)).toBe(true);
    expect((fm.parse_error as string[]).length).toBe(2);

    // queue-errors.md got TWO MALFORMED-REVIEWER-RESPONSE rows — combine.py
    // must have parsed (and recorded errors for) BOTH files rather than
    // short-circuiting on the first.
    const queueErrors = readFileSync(join(root, 'raw/internal/queue-errors.md'), 'utf-8');
    const matches = queueErrors.match(
      /MALFORMED-REVIEWER-RESPONSE: combine\.py round 2026-05-12-040-watcher-state-executable-test\/r1/g,
    );
    expect(matches?.length ?? 0).toBe(2);
    expect(queueErrors).toMatch(/offending_response=backlog\/reviews\/.+\/r1\/codex\.md/);
    expect(queueErrors).toMatch(/offending_response=backlog\/reviews\/.+\/r1\/cursor\.md/);

    // Post-combine working tree is clean.
    expect(gitStatusShort(root)).toBe('');
  });
});
