import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REPO } from './_helpers.js';

const ITEM_ID = '2026-05-12-041-reviewer-background-execution';

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

function setupRepo(): { root: string; origin: string } {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-commit-')));
  const origin = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-origin-')));

  // Bare origin on main.
  if (spawnSync('git', ['init', '--bare', '-b', 'main', origin], { stdio: 'ignore' }).status !== 0) {
    execFileSync('git', ['init', '--bare', origin]);
    execFileSync('git', ['symbolic-ref', 'HEAD', 'refs/heads/main'], { cwd: origin });
  }

  // Working repo on main.
  if (spawnSync('git', ['init', '-b', 'main', root], { stdio: 'ignore' }).status !== 0) {
    execFileSync('git', ['init', root]);
    execFileSync('git', ['symbolic-ref', 'HEAD', 'refs/heads/main'], { cwd: root });
  }

  execFileSync('git', ['config', 'user.email', 'test@echo.local'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'echo-test'], { cwd: root });
  execFileSync('git', ['remote', 'add', 'origin', origin], { cwd: root });

  // Copy the helper + validator + schema + push-with-retry so the helper can
  // operate against this isolated repo via git rev-parse --show-toplevel.
  mkdirSync(join(root, 'tools/review-queue/schemas'), { recursive: true });
  mkdirSync(join(root, 'raw/internal'), { recursive: true });
  for (const rel of [
    'tools/review-queue/commit-reviewer-response.sh',
    'tools/review-queue/validate.py',
    'tools/review-queue/_lib.py',
    'tools/review-queue/push-with-retry.sh',
    'tools/review-queue/_effect-runner.sh',
    'tools/review-queue/schemas/reviewer.schema.json',
  ]) {
    const data = readFileSync(join(REPO, rel));
    writeFileSync(join(root, rel), data);
  }
  execFileSync('chmod', ['+x', join(root, 'tools/review-queue/commit-reviewer-response.sh')]);
  execFileSync('chmod', ['+x', join(root, 'tools/review-queue/push-with-retry.sh')]);

  // Baseline commit so push-with-retry has a fast-forward target.
  writeFileSync(join(root, 'README.md'), '# isolated test repo\n');
  execFileSync('git', ['add', '-A'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'baseline'], { cwd: root });
  execFileSync('git', ['push', 'origin', 'main'], { cwd: root });

  return { root, origin };
}

function writeReviewerResponse(
  root: string,
  reviewer: 'codex' | 'cursor',
  round: number,
  variant: 'valid' | 'malformed',
): string {
  const dir = join(root, 'backlog/reviews', ITEM_ID, `r${round}`);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${reviewer}.md`);
  let content: string;
  if (variant === 'valid') {
    content = [
      '---',
      `item_id: "${ITEM_ID}"`,
      `round: ${round}`,
      `reviewer: "${reviewer}"`,
      `artifact_sha: "abc1234"`,
      `completed_at: "2026-05-12T09:00:00Z"`,
      `verdict: "proceed"`,
      'findings: []',
      '---',
      '',
      'body',
      '',
    ].join('\n');
  } else {
    // Missing required `verdict` field — should fail validation.
    content = [
      '---',
      `item_id: "${ITEM_ID}"`,
      `round: ${round}`,
      `reviewer: "${reviewer}"`,
      `artifact_sha: "abc1234"`,
      `completed_at: "2026-05-12T09:00:00Z"`,
      'findings: []',
      '---',
      '',
      'malformed body — missing verdict',
      '',
    ].join('\n');
  }
  writeFileSync(path, content);
  return path;
}

function runHelper(root: string, args: string[]): RunResult {
  const r = spawnSync(join(root, 'tools/review-queue/commit-reviewer-response.sh'), args, {
    cwd: root,
    encoding: 'utf-8',
  });
  return {
    status: typeof r.status === 'number' ? r.status : 1,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
}

describe('commit-reviewer-response.sh', () => {
  let root: string;
  let origin: string;

  beforeEach(() => {
    const setup = setupRepo();
    root = setup.root;
    origin = setup.origin;
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(origin, { recursive: true, force: true });
  });

  it('valid response: validates, commits, and pushes to origin', () => {
    const path = writeReviewerResponse(root, 'codex', 1, 'valid');
    const r = runHelper(root, [path, 'codex', '1', ITEM_ID]);
    expect(r.status).toBe(0);

    // The file should still be at the canonical path (not quarantined).
    expect(existsSync(path)).toBe(true);

    // HEAD commit message matches contract.
    const headMsg = execFileSync('git', ['log', '-1', '--pretty=%s'], {
      cwd: root,
      encoding: 'utf-8',
    }).trim();
    expect(headMsg).toBe(`review-r1: codex on ${ITEM_ID}`);

    // The commit must have been pushed (origin/main and HEAD point at the same SHA).
    const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf-8',
    }).trim();
    const remoteSha = execFileSync('git', ['rev-parse', 'origin/main'], {
      cwd: root,
      encoding: 'utf-8',
    }).trim();
    expect(remoteSha).toBe(headSha);
  });

  it('malformed response: quarantines file, appends queue-errors row, exits non-zero, never commits', () => {
    const path = writeReviewerResponse(root, 'cursor', 1, 'malformed');
    const baselineSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf-8',
    }).trim();

    const r = runHelper(root, [path, 'cursor', '1', ITEM_ID]);
    expect(r.status).not.toBe(0);

    // Original path must be gone (renamed) so the canonical poll regenerates next tick.
    expect(existsSync(path)).toBe(false);

    // The quarantine sibling must exist with the .invalid.<ISO-ts> suffix.
    const dir = join(root, 'backlog/reviews', ITEM_ID, 'r1');
    const siblings = readdirSync(dir);
    const quarantined = siblings.filter((f) => f.startsWith('cursor.md.invalid.'));
    expect(quarantined.length).toBe(1);

    // queue-errors.md got a VALIDATION-FAIL row.
    const queueErrors = readFileSync(join(root, 'raw/internal/queue-errors.md'), 'utf-8');
    expect(queueErrors).toMatch(/VALIDATION-FAIL: cursor r1/);
    expect(queueErrors).toMatch(ITEM_ID);

    // No new commit on main.
    const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf-8',
    }).trim();
    expect(headSha).toBe(baselineSha);
  });
});
