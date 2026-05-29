/**
 * 050 AC5 — push-with-retry.sh CWD-agnostic + HEAD:main refspec contract.
 *
 * The helper must produce identical observable outcomes whether invoked from
 * the live main checkout (today's only CWD) or from inside a detached-HEAD
 * worktree created by `git worktree add --detach $TMPDIR/echo-<role>-<uuid>
 * origin/main` (050's new role-tick CWD). Specifically:
 *
 *   (a) identical commit-pushed shape — the worktree's HEAD lands at
 *       origin/main as a fast-forward (or rebased) commit
 *   (b) identical retry behavior under simulated concurrent push — first
 *       attempt loses on non-fast-forward reject, rebases, second attempt
 *       wins
 *   (c) identical exit codes — 0 on success, non-zero on push-retry exhaustion
 *   (d) after a successful push from the detached worktree, `git rev-parse
 *       origin/main` MUST equal the worktree's HEAD. This is the load-bearing
 *       refspec assertion (R4 codex F3) — proves the helper used `HEAD:main`,
 *       not the COMMON repo's branch ref `main`.
 */

import { execSync, spawnSync } from 'node:child_process';
import {
  existsSync,
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

interface Fixture {
  base: string;
  bare: string;
  repo: string;
  helper: string;
}

function git(cwd: string, ...args: string[]): string {
  return execSync(`git ${args.join(' ')}`, { cwd, encoding: 'utf-8' }).trim();
}

function setupFixture(): Fixture {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'echo-pwr-')));
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
  // Copy the helper under test from the project tree.
  const helperSrc = readFileSync(
    join(process.cwd(), 'tools/review-queue/push-with-retry.sh'),
    'utf-8',
  );
  const helper = 'tools/review-queue/push-with-retry.sh';
  writeFileSync(join(repo, helper), helperSrc, { mode: 0o755 });
  writeFileSync(
    join(repo, 'tools/review-queue/_effect-runner.sh'),
    readFileSync(join(process.cwd(), 'tools/review-queue/_effect-runner.sh'), 'utf-8'),
    { mode: 0o755 },
  );
  writeFileSync(join(repo, 'README.md'), '# bootstrap\n');
  execSync('git add -A', { cwd: repo });
  execSync('git commit -q -m bootstrap', { cwd: repo });
  execSync('git push -q -u origin main', { cwd: repo });
  return { base, bare, repo, helper };
}

function teardown(fx: Fixture) {
  rmSync(fx.base, { recursive: true, force: true });
}

function bashHelper(cwd: string, helperAbs: string, context: string) {
  return spawnSync('bash', [helperAbs, context], { cwd, encoding: 'utf-8' });
}

describe('050 AC5 — push-with-retry.sh CWD-agnostic + HEAD:main refspec', () => {
  let fx: Fixture;
  beforeEach(() => {
    fx = setupFixture();
  });
  afterEach(() => {
    teardown(fx);
  });

  it('(a) commits pushed from the live main checkout land on origin/main as fast-forward', () => {
    writeFileSync(join(fx.repo, 'a.txt'), 'A\n');
    execSync('git add -A && git commit -q -m "A"', { cwd: fx.repo });
    const before = git(fx.repo, 'rev-parse', 'origin/main');
    const r = bashHelper(fx.repo, join(fx.repo, fx.helper), 'unit: live-checkout-push');
    expect(r.status, r.stderr).toBe(0);
    const after = git(fx.repo, 'rev-parse', 'origin/main');
    expect(after).not.toBe(before);
    expect(after).toBe(git(fx.repo, 'rev-parse', 'HEAD'));
  });

  it('(d) commits pushed from a detached-HEAD worktree at $TMPDIR/echo-<role>-<uuid> land on origin/main; rev-parse origin/main matches WT HEAD (HEAD:main refspec is load-bearing)', () => {
    // Create the worktree pinned to origin/main exactly as the 050 wrapper would.
    const wt = join(fx.base, 'echo-codex-aaaa1111');
    execSync('git fetch -q origin main', { cwd: fx.repo });
    execSync(`git worktree add -q --detach "${wt}" origin/main`, { cwd: fx.repo });
    // Worktree must be detached (no current branch).
    expect(git(wt, 'branch', '--show-current')).toBe('');
    // Make a commit in the worktree.
    writeFileSync(join(wt, 'wt-only.txt'), 'from-worktree\n');
    execSync('git add -A && git commit -q -m "from-WT"', { cwd: wt });
    const wtHead = git(wt, 'rev-parse', 'HEAD');
    // Invoke the helper from the worktree CWD. Resolve the helper path via
    // the worktree's toplevel (which the script itself does) — pass an
    // absolute path here so we don't depend on cwd resolution of the script.
    const helperAbs = join(wt, fx.helper);
    // Copy the helper into the worktree's view (it's already present in the
    // common repo's working tree, but the worktree files come from the
    // detached commit; ensure the file exists in the worktree path).
    if (!existsSync(helperAbs)) {
      const helperSrc = readFileSync(join(fx.repo, fx.helper), 'utf-8');
      mkdirSync(join(wt, 'tools/review-queue'), { recursive: true });
      writeFileSync(helperAbs, helperSrc, { mode: 0o755 });
    }
    const r = bashHelper(wt, helperAbs, 'unit: worktree-push');
    expect(r.status, r.stderr).toBe(0);
    // Refspec contract: origin/main now equals the WT's HEAD. This proves
    // `HEAD:main` (not `main`) was the pushed refspec.
    const originMain = git(fx.repo, 'rev-parse', 'origin/main');
    expect(originMain).toBe(wtHead);
    // Cleanup the worktree.
    execSync(`git worktree remove --force "${wt}"`, { cwd: fx.repo });
  });

  it('(b)+(c) under simulated concurrent push, the helper rebases-and-retries; first attempt loses, second wins; exit 0 from both CWDs', () => {
    // Strategy: introduce a non-fast-forward state on origin/main before
    // invoking the helper. The helper's first push will be rejected; its
    // `git pull --rebase` then fast-forwards; the second push wins.
    // Live-checkout CWD path:
    writeFileSync(join(fx.repo, 'a.txt'), 'A\n');
    execSync('git add -A && git commit -q -m "A-local"', { cwd: fx.repo });
    // Make origin advance via a parallel clone.
    const clone = join(fx.base, 'clone');
    execSync(`git clone -q "${fx.bare}" "${clone}"`);
    execSync('git config user.email t@e.c && git config user.name t', { cwd: clone });
    writeFileSync(join(clone, 'b.txt'), 'B\n');
    execSync('git add -A && git commit -q -m "B-remote" && git push -q origin main', {
      cwd: clone,
    });
    // Now repo's main is behind origin/main → push will be rejected on attempt 1.
    const r1 = bashHelper(fx.repo, join(fx.repo, fx.helper), 'unit: retry-from-main');
    expect(r1.status, r1.stderr).toBe(0);
    // origin/main now contains both commits; repo's HEAD matches.
    const om = git(fx.repo, 'rev-parse', 'origin/main');
    const head = git(fx.repo, 'rev-parse', 'HEAD');
    expect(om).toBe(head);

    // Worktree CWD path:
    const wt = join(fx.base, 'echo-codex-bbbb2222');
    execSync('git fetch -q origin main', { cwd: fx.repo });
    execSync(`git worktree add -q --detach "${wt}" origin/main`, { cwd: fx.repo });
    if (!existsSync(join(wt, fx.helper))) {
      const helperSrc = readFileSync(join(fx.repo, fx.helper), 'utf-8');
      mkdirSync(join(wt, 'tools/review-queue'), { recursive: true });
      writeFileSync(join(wt, fx.helper), helperSrc, { mode: 0o755 });
    }
    writeFileSync(join(wt, 'wt-a.txt'), 'WT-A\n');
    execSync('git add -A && git commit -q -m "WT-A"', { cwd: wt });
    // Advance origin again via clone.
    execSync('git pull -q origin main', { cwd: clone });
    writeFileSync(join(clone, 'c.txt'), 'C\n');
    execSync('git add -A && git commit -q -m "C-remote" && git push -q origin main', {
      cwd: clone,
    });
    const r2 = bashHelper(wt, join(wt, fx.helper), 'unit: retry-from-worktree');
    expect(r2.status, r2.stderr).toBe(0);
    // After successful push from WT, origin/main equals WT's HEAD (refspec contract).
    const omFinal = git(fx.repo, 'rev-parse', 'origin/main');
    const wtHead = git(wt, 'rev-parse', 'HEAD');
    expect(omFinal).toBe(wtHead);
    execSync(`git worktree remove --force "${wt}"`, { cwd: fx.repo });
    rmSync(clone, { recursive: true, force: true });
  });

  it('queue-errors.md is written under the toplevel of the invoking CWD on exhaustion (CWD-agnostic path resolution)', () => {
    // Strip the remote so both push attempts fail; helper exits non-zero and
    // appends to <toplevel>/raw/internal/queue-errors.md.
    writeFileSync(join(fx.repo, 'a.txt'), 'A\n');
    execSync('git add -A && git commit -q -m "A"', { cwd: fx.repo });
    execSync('git remote remove origin', { cwd: fx.repo });
    // From the live checkout CWD, log goes under fx.repo.
    const r = bashHelper(fx.repo, join(fx.repo, fx.helper), 'unit: no-remote');
    expect(r.status).not.toBe(0);
    const log = readFileSync(join(fx.repo, 'raw/internal/queue-errors.md'), 'utf-8');
    expect(log).toMatch(/PUSH-RACE-FALLBACK/);
    expect(log).toMatch(/unit: no-remote/);
  });
});
