/**
 * 102 B2 — push-with-retry.sh AC5/AC8 no-silent-misconfiguration guardrail.
 *
 * The spec (AC5) requires: "if coord_ref is non-default but a helper would
 * still target the default branch, fail loudly — never silently write to the
 * default branch." push-with-retry.sh resolves its push target from
 * ECHO_REVIEW_QUEUE_COORD_REF (exported by _run_reviewer.sh / combine.py).
 * When that env var is UNSET, the helper must consult .echo/project.json: if
 * the project declares a NON-DEFAULT coord_ref, an unset env var means a
 * caller failed to propagate it, and silently pushing to the default branch
 * 'main' is the forbidden failure. The guardrail makes that case exit non-zero
 * with a descriptive message BEFORE any push.
 *
 * These tests assert the guardrail fires on the misconfig case and does NOT
 * false-positive on the legitimate cases (env var set; config==default; no
 * config at all).
 */

import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface Fixture {
  base: string;
  repo: string;
  helperAbs: string;
}

function git(cwd: string, ...args: string[]): string {
  return execSync(`git ${args.join(' ')}`, { cwd, encoding: 'utf-8' }).trim();
}

function setupFixture(): Fixture {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'echo-pwr-guardrail-')));
  const bare = join(base, 'remote.git');
  const repo = join(base, 'repo');
  execSync(`git init --bare -q -b main "${bare}"`);
  execSync(`git init -q -b main "${repo}"`);
  for (const c of [
    'config user.email test@example.com',
    'config user.name test',
    'config commit.gpgsign false',
    `remote add origin "${bare}"`,
  ]) {
    execSync(`git ${c}`, { cwd: repo });
  }
  mkdirSync(join(repo, 'tools/review-queue'), { recursive: true });
  mkdirSync(join(repo, 'raw/internal'), { recursive: true });
  const helper = 'tools/review-queue/push-with-retry.sh';
  writeFileSync(
    join(repo, helper),
    readFileSync(join(process.cwd(), helper), 'utf-8'),
    { mode: 0o755 },
  );
  writeFileSync(
    join(repo, 'tools/review-queue/_effect-runner.sh'),
    readFileSync(join(process.cwd(), 'tools/review-queue/_effect-runner.sh'), 'utf-8'),
    { mode: 0o755 },
  );
  writeFileSync(join(repo, 'README.md'), '# bootstrap\n');
  execSync('git add -A', { cwd: repo });
  execSync('git commit -q -m bootstrap', { cwd: repo });
  execSync('git push -q -u origin main', { cwd: repo });
  return { base, repo, helperAbs: join(repo, helper) };
}

function writeProjectConfig(repo: string, coordRef: string): void {
  mkdirSync(join(repo, '.echo'), { recursive: true });
  writeFileSync(
    join(repo, '.echo/project.json'),
    JSON.stringify(
      {
        schema_version: 1,
        coord_ref: coordRef,
        reviews_root: 'backlog/reviews',
        reviewers: ['codex'],
        spec_dir: 'backlog',
      },
      null,
      2,
    ),
  );
}

function runHelper(repo: string, helperAbs: string, env: Record<string, string | undefined>) {
  // Strip ECHO_REVIEW_QUEUE_COORD_REF unless the test sets it, so the parent
  // process env never leaks the propagation channel into the unset-case tests.
  const childEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k === 'ECHO_REVIEW_QUEUE_COORD_REF') continue;
    if (v !== undefined) childEnv[k] = v;
  }
  for (const [k, v] of Object.entries(env)) {
    if (v !== undefined) childEnv[k] = v;
  }
  return spawnSync('bash', [helperAbs, 'unit: b2-guardrail'], {
    cwd: repo,
    encoding: 'utf-8',
    env: childEnv,
  });
}

describe('102 B2 — push-with-retry.sh no-silent-misconfiguration guardrail', () => {
  let fx: Fixture;
  beforeEach(() => {
    fx = setupFixture();
  });
  afterEach(() => {
    rmSync(fx.base, { recursive: true, force: true });
  });

  it('FAILS LOUD when config declares a non-default coord_ref but the env var is unset', () => {
    writeProjectConfig(fx.repo, 'echo/coord');
    writeFileSync(join(fx.repo, 'x.txt'), 'x\n');
    execSync('git add -A && git commit -q -m "x"', { cwd: fx.repo });
    const mainBefore = git(fx.repo, 'rev-parse', 'origin/main');

    const r = runHelper(fx.repo, fx.helperAbs, { ECHO_REVIEW_QUEUE_COORD_REF: undefined });

    expect(r.status).toBe(2);
    expect(r.stderr).toContain('no-silent-misconfiguration guardrail');
    expect(r.stderr).toContain("coord_ref='echo/coord'");
    // The default branch must be untouched — the whole point of the guardrail.
    execSync('git fetch -q origin main', { cwd: fx.repo });
    expect(git(fx.repo, 'rev-parse', 'origin/main')).toBe(mainBefore);
  });

  it('does NOT fire when the env var IS set (propagation succeeded)', () => {
    writeProjectConfig(fx.repo, 'echo/coord');
    execSync('git checkout -q -b echo/coord', { cwd: fx.repo });
    execSync('git push -q origin HEAD:echo/coord', { cwd: fx.repo });
    writeFileSync(join(fx.repo, 'c.txt'), 'c\n');
    execSync('git add -A && git commit -q -m "c"', { cwd: fx.repo });
    const head = git(fx.repo, 'rev-parse', 'HEAD');

    const r = runHelper(fx.repo, fx.helperAbs, { ECHO_REVIEW_QUEUE_COORD_REF: 'echo/coord' });

    expect(r.status, r.stderr).toBe(0);
    execSync('git fetch -q origin echo/coord', { cwd: fx.repo });
    expect(git(fx.repo, 'rev-parse', 'FETCH_HEAD')).toBe(head);
  });

  it('does NOT fire when config coord_ref is the default branch and the env var is unset', () => {
    writeProjectConfig(fx.repo, 'main');
    writeFileSync(join(fx.repo, 'm.txt'), 'm\n');
    execSync('git add -A && git commit -q -m "m"', { cwd: fx.repo });
    const head = git(fx.repo, 'rev-parse', 'HEAD');

    const r = runHelper(fx.repo, fx.helperAbs, { ECHO_REVIEW_QUEUE_COORD_REF: undefined });

    expect(r.status, r.stderr).toBe(0);
    execSync('git fetch -q origin main', { cwd: fx.repo });
    expect(git(fx.repo, 'rev-parse', 'origin/main')).toBe(head);
  });

  it('does NOT fire when there is no .echo/project.json (env var unset → defaults to main)', () => {
    writeFileSync(join(fx.repo, 'n.txt'), 'n\n');
    execSync('git add -A && git commit -q -m "n"', { cwd: fx.repo });
    const head = git(fx.repo, 'rev-parse', 'HEAD');

    const r = runHelper(fx.repo, fx.helperAbs, { ECHO_REVIEW_QUEUE_COORD_REF: undefined });

    expect(r.status, r.stderr).toBe(0);
    execSync('git fetch -q origin main', { cwd: fx.repo });
    expect(git(fx.repo, 'rev-parse', 'origin/main')).toBe(head);
  });
});
