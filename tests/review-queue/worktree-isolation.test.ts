/**
 * 050 AC6 — collision-simulation tests for worktree-isolation across the
 * multi-step main writers (reviewers + watcher + merger).
 *
 * The original bug: a parallel codex reviewer launchd-tick committed into the
 * same `.git/index` as an in-flight Claude merger session, sweeping the
 * merger's staged conflict-resolution work into the reviewer's commit (2026-
 * 05-14 14:02 PDT, sha ec2907f). The 050 architectural answer is that every
 * role-tick runs inside its own per-tick `$TMPDIR/echo-<role>-<uuid>`
 * worktree; two unrelated processes cannot collide if they do not share an
 * index.
 *
 * These tests do NOT exercise the full headless launchd wrapper (which
 * invokes `codex exec`, not available in CI). They DO exercise:
 *
 *   - the primitives the wrapper uses (`git worktree add --detach`,
 *     `git worktree list --porcelain`, `git worktree remove --force`,
 *     `git worktree prune`)
 *   - the multi-writer race the wrapper isolates against, using two
 *     in-process worktrees + push-with-retry.sh — both writers' commits
 *     must land on origin/main with no cross-contamination
 *   - the pre-flight GC logic (registered worktrees are never GC'd
 *     regardless of mtime; unregistered $TMPDIR/echo-* orphans older than
 *     60min are removed)
 *   - the AC3 sentinel-file deletion guarantee
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
  tmpdir: string;
  helperRel: string;
}

function setupFixture(): Fixture {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'echo-wt-iso-')));
  const bare = join(base, 'remote.git');
  const repo = join(base, 'repo');
  const tmp = join(base, 'tmp');
  mkdirSync(tmp, { recursive: true });
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
  const helperRel = 'tools/review-queue/push-with-retry.sh';
  const helperSrc = readFileSync(join(process.cwd(), helperRel), 'utf-8');
  writeFileSync(join(repo, helperRel), helperSrc, { mode: 0o755 });
  writeFileSync(join(repo, 'README.md'), '# bootstrap\n');
  execSync('git add -A && git commit -q -m bootstrap', { cwd: repo });
  execSync('git push -q -u origin main', { cwd: repo });
  return { base, bare, repo, tmpdir: tmp, helperRel };
}

function teardown(fx: Fixture) {
  // Best-effort: prune worktrees admin before removing the tree, since
  // /tmp lives outside the repo and stray admin entries would survive.
  try {
    execSync('git worktree prune', { cwd: fx.repo });
  } catch {
    /* ignore */
  }
  rmSync(fx.base, { recursive: true, force: true });
}

/**
 * Create a detached-HEAD worktree under fx.tmpdir, mimicking what
 * `_run_reviewer.sh` does for headless reviewer ticks. Returns the
 * absolute worktree path.
 */
function addRoleWorktree(fx: Fixture, role: string, uuid: string): string {
  const wt = join(fx.tmpdir, `echo-${role}-${uuid}`);
  execSync('git fetch -q origin main', { cwd: fx.repo });
  execSync(`git worktree add -q --detach "${wt}" origin/main`, { cwd: fx.repo });
  // Materialize the helper inside the WT (the bootstrap commit on origin/main
  // already contains it from setupFixture, so this is normally a no-op; kept
  // as a defensive ensure for re-entrancy).
  if (!existsSync(join(wt, fx.helperRel))) {
    mkdirSync(join(wt, 'tools/review-queue'), { recursive: true });
    const helperSrc = readFileSync(join(fx.repo, fx.helperRel), 'utf-8');
    writeFileSync(join(wt, fx.helperRel), helperSrc, { mode: 0o755 });
  }
  return wt;
}

function commitAndPush(wt: string, helperRel: string, file: string, body: string, ctx: string) {
  const dir = join(wt, file.split('/').slice(0, -1).join('/'));
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(wt, file), body);
  execSync(`git add -A && git commit -q -m "${ctx}"`, { cwd: wt });
  return spawnSync('bash', [join(wt, helperRel), ctx], { cwd: wt, encoding: 'utf-8' });
}

describe('050 AC6 — worktree-isolation collision-simulation', () => {
  let fx: Fixture;
  beforeEach(() => {
    fx = setupFixture();
  });
  afterEach(() => {
    teardown(fx);
  });

  it('AC6.1 — two simultaneous reviewer ticks (codex + codex-ops) for the same round: both produce their own <reviewer>.md; no cross-commit sweep; push rebases cleanly', () => {
    const wtCodex = addRoleWorktree(fx, 'codex', 'aaaa1111');
    const wtCodexOps = addRoleWorktree(fx, 'codex-ops', 'bbbb2222');
    // Each tick writes its OWN response file. Same r1 directory.
    const dir = 'backlog/reviews/2026-test/r1';
    const r1 = commitAndPush(
      wtCodex,
      fx.helperRel,
      `${dir}/codex.md`,
      '---\nreviewer: codex\n---\nbody\n',
      'review-r1: codex on test',
    );
    expect(r1.status, r1.stderr).toBe(0);
    // codex-ops must rebase over the codex commit, since it created its
    // worktree pinned to the same origin/main snapshot.
    const r2 = commitAndPush(
      wtCodexOps,
      fx.helperRel,
      `${dir}/codex-ops.md`,
      '---\nreviewer: codex-ops\n---\nbody\n',
      'review-r1: codex-ops on test',
    );
    expect(r2.status, r2.stderr).toBe(0);
    // Both files exist on origin/main. Inspect via the bare repo's tree.
    const treeAfter = execSync(`git ls-tree -r origin/main`, { cwd: fx.repo, encoding: 'utf-8' });
    expect(treeAfter).toMatch(new RegExp(`${dir}/codex.md`));
    expect(treeAfter).toMatch(new RegExp(`${dir}/codex-ops.md`));
    // Neither commit captured the other's file — check the diff of each commit.
    const log = execSync(`git -C "${fx.repo}" log --format="%s%x09%H" origin/main`, {
      encoding: 'utf-8',
    });
    expect(log).toMatch(/review-r1: codex on test/);
    expect(log).toMatch(/review-r1: codex-ops on test/);
    // Check that the codex commit added ONLY codex.md, and the codex-ops
    // commit added ONLY codex-ops.md (no cross-contamination).
    const codexSha = execSync(
      `git -C "${fx.repo}" log --format=%H --grep="^review-r1: codex on test$" -1 origin/main`,
      { encoding: 'utf-8' },
    ).trim();
    const codexOpsSha = execSync(
      `git -C "${fx.repo}" log --format=%H --grep="^review-r1: codex-ops on test$" -1 origin/main`,
      { encoding: 'utf-8' },
    ).trim();
    expect(codexSha, 'codex commit SHA not found by anchored grep').not.toBe('');
    expect(codexOpsSha, 'codex-ops commit SHA not found by anchored grep').not.toBe('');
    const codexFiles = execSync(
      `git -C "${fx.repo}" show --name-only --format="" ${codexSha}`,
      { encoding: 'utf-8' },
    )
      .trim()
      .split('\n')
      .filter(Boolean);
    const codexOpsFiles = execSync(
      `git -C "${fx.repo}" show --name-only --format="" ${codexOpsSha}`,
      { encoding: 'utf-8' },
    )
      .trim()
      .split('\n')
      .filter(Boolean);
    expect(codexFiles).toEqual([`${dir}/codex.md`]);
    expect(codexOpsFiles).toEqual([`${dir}/codex-ops.md`]);
    execSync(`git worktree remove --force "${wtCodex}"`, { cwd: fx.repo });
    execSync(`git worktree remove --force "${wtCodexOps}"`, { cwd: fx.repo });
  });

  it('AC6.2 — reviewer tick during in-flight merger tick (the 2026-05-14 14:02 collision shape): both succeed; neither commit captures the other staged work', () => {
    const wtMerger = addRoleWorktree(fx, 'merger', 'cccc3333');
    const wtReviewer = addRoleWorktree(fx, 'codex', 'dddd4444');
    // Merger stages a multi-file change (simulating C7+C8 — moving an item
    // from pending_review/ to complete/ + populating review_notes).
    mkdirSync(join(wtMerger, 'backlog/pending_review'), { recursive: true });
    mkdirSync(join(wtMerger, 'backlog/complete'), { recursive: true });
    writeFileSync(join(wtMerger, 'backlog/complete/item-X.md'), 'review_notes: populated\n');
    execSync('git add -A && git commit -q -m "merge: item-X"', { cwd: wtMerger });
    // Meanwhile the reviewer tick writes its response in its own WT and pushes.
    const r1 = commitAndPush(
      wtReviewer,
      fx.helperRel,
      'backlog/reviews/2026-test/r2/codex.md',
      'reviewer-content\n',
      'review-r2: codex on test',
    );
    expect(r1.status, r1.stderr).toBe(0);
    // Now the merger pushes. It must rebase over the reviewer commit.
    const pushResult = spawnSync('bash', [join(wtMerger, fx.helperRel), 'merge: item-X'], {
      cwd: wtMerger,
      encoding: 'utf-8',
    });
    expect(pushResult.status, pushResult.stderr).toBe(0);
    // Both commits exist on origin/main; merger commit does NOT include the
    // reviewer's file and vice versa.
    const mergerSha = execSync(
      `git -C "${fx.repo}" log --format=%H --grep="^merge: item-X$" -1 origin/main`,
      { encoding: 'utf-8' },
    ).trim();
    const reviewerSha = execSync(
      `git -C "${fx.repo}" log --format=%H --grep="^review-r2: codex on test$" -1 origin/main`,
      { encoding: 'utf-8' },
    ).trim();
    expect(mergerSha).not.toBe('');
    expect(reviewerSha).not.toBe('');
    const mergerFiles = execSync(
      `git -C "${fx.repo}" show --name-only --format="" ${mergerSha}`,
      { encoding: 'utf-8' },
    )
      .trim()
      .split('\n')
      .filter(Boolean);
    const reviewerFiles = execSync(
      `git -C "${fx.repo}" show --name-only --format="" ${reviewerSha}`,
      { encoding: 'utf-8' },
    )
      .trim()
      .split('\n')
      .filter(Boolean);
    expect(mergerFiles.every((f) => f.startsWith('backlog/complete/'))).toBe(true);
    expect(reviewerFiles).toEqual(['backlog/reviews/2026-test/r2/codex.md']);
    execSync(`git worktree remove --force "${wtMerger}"`, { cwd: fx.repo });
    execSync(`git worktree remove --force "${wtReviewer}"`, { cwd: fx.repo });
  });

  it('AC6.3 — watcher tick during a reviewer tick: identical isolation property; multi-step watcher commits land cleanly; reviewer response commit lands cleanly; no shared-index race', () => {
    const wtWatcher = addRoleWorktree(fx, 'watcher', 'eeee5555');
    const wtReviewer = addRoleWorktree(fx, 'codex', 'ffff6666');
    // Watcher does multi-step writes (combined.md + spec patch + next request).
    mkdirSync(join(wtWatcher, 'backlog/reviews/2026-test/r3'), { recursive: true });
    mkdirSync(join(wtWatcher, 'backlog/reviews/2026-test/r4'), { recursive: true });
    writeFileSync(join(wtWatcher, 'backlog/reviews/2026-test/r3/combined.md'), 'combined\n');
    execSync('git add -A && git commit -q -m "review-r3: combined on test"', { cwd: wtWatcher });
    writeFileSync(
      join(wtWatcher, 'backlog/reviews/2026-test/r4/request.md'),
      'request for r4\n',
    );
    execSync('git add -A && git commit -q -m "review-r3: dispatch r4 on test"', {
      cwd: wtWatcher,
    });
    // In parallel, reviewer pushes its response first.
    const r1 = commitAndPush(
      wtReviewer,
      fx.helperRel,
      'backlog/reviews/2026-test/r3/codex.md',
      'reviewer body\n',
      'review-r3: codex on test',
    );
    expect(r1.status, r1.stderr).toBe(0);
    // Watcher pushes BOTH local commits via one push-with-retry invocation;
    // helper must rebase over the reviewer's r3/codex.md without disturbing it.
    const watchPush = spawnSync(
      'bash',
      [join(wtWatcher, fx.helperRel), 'review-r3: dispatch r4 on test'],
      { cwd: wtWatcher, encoding: 'utf-8' },
    );
    expect(watchPush.status, watchPush.stderr).toBe(0);
    // All three artifacts exist on origin/main.
    const tree = execSync(`git -C "${fx.repo}" ls-tree -r origin/main`, { encoding: 'utf-8' });
    expect(tree).toMatch(/backlog\/reviews\/2026-test\/r3\/codex\.md/);
    expect(tree).toMatch(/backlog\/reviews\/2026-test\/r3\/combined\.md/);
    expect(tree).toMatch(/backlog\/reviews\/2026-test\/r4\/request\.md/);
    execSync(`git worktree remove --force "${wtWatcher}"`, { cwd: fx.repo });
    execSync(`git worktree remove --force "${wtReviewer}"`, { cwd: fx.repo });
  });

  it('AC6.4 — registered worktrees are NEVER GC’d regardless of mtime; only unregistered $TMPDIR/echo-* orphans older than 60min are removed', () => {
    // Create a registered worktree and backdate its mtime to >60min.
    const wtMerger = addRoleWorktree(fx, 'merger', 'gggg7777');
    const wtReviewerCrashed = addRoleWorktree(fx, 'codex', 'hhhh8888');
    // Stamp both to age > 60 minutes.
    const oldStamp = Math.floor((Date.now() - 90 * 60 * 1000) / 1000);
    execSync(`touch -t $(date -r ${oldStamp} +%Y%m%d%H%M.%S) "${wtMerger}"`);
    execSync(`touch -t $(date -r ${oldStamp} +%Y%m%d%H%M.%S) "${wtReviewerCrashed}"`);
    // Also create an UNREGISTERED orphan in the same $TMPDIR ageing scope.
    const orphan = join(fx.tmpdir, 'echo-codex-orphan-iiii9999');
    mkdirSync(orphan);
    execSync(`touch -t $(date -r ${oldStamp} +%Y%m%d%H%M.%S) "${orphan}"`);
    // Now run the pre-flight sequence inline (mirrors _run_reviewer.sh step 0).
    execSync('git worktree prune', { cwd: fx.repo });
    const registered = execSync('git worktree list --porcelain', {
      cwd: fx.repo,
      encoding: 'utf-8',
    })
      .split('\n')
      .filter((l) => l.startsWith('worktree '))
      .map((l) => l.slice('worktree '.length).trim());
    // Both registered worktrees should be in the registered set.
    expect(registered).toContain(wtMerger);
    expect(registered).toContain(wtReviewerCrashed);
    // The pre-flight GC sweep removes $TMPDIR/echo-* with mtime>60min that
    // are NOT in `registered`.
    const findCmd = `find "${fx.tmpdir}" -maxdepth 1 -type d -name 'echo-*' -mmin +60 -print0`;
    const candidates = execSync(findCmd, { encoding: 'utf-8' })
      .split('\0')
      .filter(Boolean);
    for (const c of candidates) {
      if (registered.includes(c)) continue;
      rmSync(c, { recursive: true, force: true });
    }
    // Assertions: registered worktrees survive, orphan is gone.
    expect(existsSync(wtMerger)).toBe(true);
    expect(existsSync(wtReviewerCrashed)).toBe(true);
    expect(existsSync(orphan)).toBe(false);
    // Admin entries also survive for registered worktrees.
    const adminMerger = join(fx.repo, '.git/worktrees', 'echo-merger-gggg7777');
    const adminReviewer = join(fx.repo, '.git/worktrees', 'echo-codex-hhhh8888');
    expect(existsSync(adminMerger)).toBe(true);
    expect(existsSync(adminReviewer)).toBe(true);
    execSync(`git worktree remove --force "${wtMerger}"`, { cwd: fx.repo });
    execSync(`git worktree remove --force "${wtReviewerCrashed}"`, { cwd: fx.repo });
  });

  it('AC6.5 — the deleted sentinel-file is never created by any AC1/AC2/AC3 path; running the role flows leaves $repo/.git clean of the convention', () => {
    // Simulate AC1 reviewer flow + AC2 watcher flow + AC3 merger flow each
    // doing a write+push in their own worktrees, then assert the sentinel
    // file is absent.
    const wtCodex = addRoleWorktree(fx, 'codex', 'jjjj0000');
    const wtWatcher = addRoleWorktree(fx, 'watcher', 'kkkk1111');
    const wtMerger = addRoleWorktree(fx, 'merger', 'llll2222');
    commitAndPush(
      wtCodex,
      fx.helperRel,
      'backlog/reviews/2026-test/r5/codex.md',
      'codex r5\n',
      'review-r5: codex on test',
    );
    commitAndPush(
      wtWatcher,
      fx.helperRel,
      'backlog/reviews/2026-test/r5/combined.md',
      'watcher r5\n',
      'review-r5: combined on test',
    );
    mkdirSync(join(wtMerger, 'backlog/complete'), { recursive: true });
    writeFileSync(join(wtMerger, 'backlog/complete/item-Y.md'), 'y\n');
    execSync('git add -A && git commit -q -m "merge: item-Y"', { cwd: wtMerger });
    spawnSync('bash', [join(wtMerger, fx.helperRel), 'merge: item-Y'], { cwd: wtMerger });
    // 050 AC3 invariant — sentinel file deleted; never created by any flow.
    expect(existsSync(join(fx.repo, '.git/echo-merge-in-progress'))).toBe(false);
    expect(existsSync(join(wtCodex, '.git/echo-merge-in-progress'))).toBe(false);
    expect(existsSync(join(wtWatcher, '.git/echo-merge-in-progress'))).toBe(false);
    expect(existsSync(join(wtMerger, '.git/echo-merge-in-progress'))).toBe(false);
    execSync(`git worktree remove --force "${wtCodex}"`, { cwd: fx.repo });
    execSync(`git worktree remove --force "${wtWatcher}"`, { cwd: fx.repo });
    execSync(`git worktree remove --force "${wtMerger}"`, { cwd: fx.repo });
  });
});
