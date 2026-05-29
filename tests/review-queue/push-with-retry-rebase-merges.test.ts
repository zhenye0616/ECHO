/**
 * push-with-retry-rebase-merges.test.ts — 051 AC1.
 *
 * Falsifies the 2026-05-14-evening collision: push-with-retry.sh's plain
 * `git pull --rebase` flattens in-flight merge commits, dropping the
 * two-parent shape and producing a corrupted main. AC1 fixes this by
 * switching to `--rebase=merges`, which preserves merge nodes during the
 * rebase replay.
 *
 * Setup:
 *   1. Bare origin.
 *   2. Local clone (the one invoking push-with-retry) holds an in-flight
 *      `git merge --no-ff feature` merge commit on main.
 *   3. A sibling clone has already pushed a non-conflicting commit to
 *      origin/main, putting the local clone in a non-fast-forward state
 *      so push-with-retry.sh must rebase before pushing.
 *
 * Assertion (load-bearing differential): `git rev-parse origin/main^2`
 * succeeds — the merge commit's two-parent shape survives the rebase.
 * Under the buggy `--rebase` default this returns "unknown revision"
 * because the rebase replayed the merge as a single linear commit.
 *
 * NO tree-content / SHA equality assertions — `--rebase=merges` rewrites
 * the rebased second parent onto the new base, and the rebased ^2 tree
 * will include the sibling's commit. Existence of ^2 alone is the
 * minimal falsifying check.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
  cpSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

function git(cwd: string, ...args: string[]) {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' });
}

function setupFixture(): { origin: string; local: string; sibling: string } {
  // Bare origin.
  const origin = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-051-origin-')));
  git(origin, 'init', '--bare', '-q', '-b', 'main');

  // Local clone — this is the one invoking push-with-retry.sh.
  const local = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-051-local-')));
  git(local, 'init', '-q', '-b', 'main');
  git(local, 'config', 'user.email', 'test@example.com');
  git(local, 'config', 'user.name', 'test');
  git(local, 'remote', 'add', 'origin', origin);

  // Copy push-with-retry.sh so it runs from inside the fixture.
  const repoRoot = process.cwd();
  const helperDir = join(local, 'tools/review-queue');
  mkdirSync(helperDir, { recursive: true });
  cpSync(
    join(repoRoot, 'tools/review-queue/push-with-retry.sh'),
    join(helperDir, 'push-with-retry.sh'),
  );
  cpSync(
    join(repoRoot, 'tools/review-queue/_effect-runner.sh'),
    join(helperDir, '_effect-runner.sh'),
  );
  mkdirSync(join(local, 'raw/internal'), { recursive: true });

  // Initial commit on main.
  writeFileSync(join(local, 'README.md'), 'init\n');
  git(local, 'add', '-A');
  git(local, 'commit', '-q', '-m', 'init');
  git(local, 'push', '-q', '-u', 'origin', 'main');

  // Sibling clone — will land a commit on origin/main first to force
  // the local clone into non-fast-forward state.
  const sibling = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-051-sibling-')));
  git(sibling, 'clone', '-q', origin, '.');
  git(sibling, 'config', 'user.email', 'sibling@example.com');
  git(sibling, 'config', 'user.name', 'sibling');

  return { origin, local, sibling };
}

describe('051 AC1 — push-with-retry.sh preserves merge commits via --rebase=merges', () => {
  let fx: { origin: string; local: string; sibling: string };
  beforeEach(() => {
    fx = setupFixture();
  });
  afterEach(() => {
    rmSync(fx.origin, { recursive: true, force: true });
    rmSync(fx.local, { recursive: true, force: true });
    rmSync(fx.sibling, { recursive: true, force: true });
  });

  it('local in-flight merge commit + sibling non-FF push: rebase preserves two-parent shape', () => {
    // 1. Build a 2-commit feature branch locally and merge it with
    //    --no-ff so we get a real merge commit on local main.
    git(fx.local, 'checkout', '-q', '-b', 'feature');
    writeFileSync(join(fx.local, 'feature1.txt'), 'f1\n');
    git(fx.local, 'add', 'feature1.txt');
    git(fx.local, 'commit', '-q', '-m', 'feature commit 1');
    writeFileSync(join(fx.local, 'feature2.txt'), 'f2\n');
    git(fx.local, 'add', 'feature2.txt');
    git(fx.local, 'commit', '-q', '-m', 'feature commit 2');

    git(fx.local, 'checkout', '-q', 'main');
    git(fx.local, 'merge', '--no-ff', '-q', '-m', 'merge feature into main', 'feature');

    // Sanity: local main HEAD has two parents (merge commit shape).
    const localMergeSha = git(fx.local, 'rev-parse', 'HEAD').trim();
    expect(git(fx.local, 'rev-parse', `${localMergeSha}^2`).trim()).not.toBe('');

    // 2. Sibling lands a non-conflicting commit on origin/main first.
    //    This is what forces push-with-retry's first push attempt to be
    //    rejected as non-fast-forward, triggering the rebase path.
    writeFileSync(join(fx.sibling, 'sibling.txt'), 'sib\n');
    git(fx.sibling, 'add', 'sibling.txt');
    git(fx.sibling, 'commit', '-q', '-m', 'sibling non-conflicting commit');
    git(fx.sibling, 'push', '-q', 'origin', 'main');

    // 3. Invoke push-with-retry.sh from the local clone. This exercises
    //    the AC1 codepath: pull --rebase=merges origin main && push.
    const r = spawnSync(
      'bash',
      ['tools/review-queue/push-with-retry.sh', '051-ac1-test'],
      { cwd: fx.local, encoding: 'utf-8' },
    );
    expect(r.status, `push-with-retry stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);

    // 4. The load-bearing assertion: origin/main HEAD is a merge commit
    //    (two parents). `git rev-parse origin/main^2` must succeed and
    //    return a non-empty SHA. Under the buggy `--rebase` default this
    //    returns "unknown revision" because the rebase flattened the
    //    merge into a single linear commit.
    git(fx.local, 'fetch', '-q', 'origin', 'main');
    const secondParent = git(fx.local, 'rev-parse', 'origin/main^2').trim();
    expect(secondParent).toMatch(/^[0-9a-f]{40}$/);

    // 5. Defensive: queue-errors.md has no PUSH-RACE-FALLBACK rows —
    //    the rebase-and-push succeeded on first attempt.
    const qe = join(fx.local, 'raw/internal/queue-errors.md');
    if (existsSync(qe)) {
      expect(execFileSync('cat', [qe], { encoding: 'utf-8' })).not.toMatch(
        /PUSH-RACE-FALLBACK/,
      );
    }
  });
});
