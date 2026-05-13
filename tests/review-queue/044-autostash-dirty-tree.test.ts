/**
 * 044-autostash-dirty-tree.test.ts — AC1 fixture test.
 *
 * Exercises the full watcher transaction (Step 1 pull → combine.py → its
 * own subprocess pull → push-with-retry.sh's inner pull → push) under a
 * dirty working tree to falsify the 044 AC1 autostash cure. Before AC1,
 * the dirty journal would have caused `git pull --rebase` to fail with
 * "Your local changes to the following files would be overwritten by
 * merge" — the stash dance the strategist did manually ~15-20 times per
 * 043 cycle. With `rebase.autoStash=true` at all three sites, the cure
 * is verified by absence of `PUSH-RACE-FALLBACK` rows in `queue-errors.md`
 * AND the post-transaction presence of the dirty file.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
  cpSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const ITEM_ID = '2026-05-13-044-autostash-fixture';
const SHA = 'abc1234';

function git(cwd: string, ...args: string[]) {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' });
}

function setupOriginAndClone(): { origin: string; clone: string; advance: string } {
  // 1. Bare origin
  const origin = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-044-origin-')));
  git(origin, 'init', '--bare', '-q', '-b', 'main');

  // 2. Initial working clone — bootstrap + the watcher-pipeline scripts
  const clone = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-044-clone-')));
  git(clone, 'init', '-q', '-b', 'main');
  git(clone, 'config', 'user.email', 'test@example.com');
  git(clone, 'config', 'user.name', 'test');
  git(clone, 'remote', 'add', 'origin', origin);

  // Copy the helper scripts + schemas + reviewers.json so combine.py +
  // push-with-retry.sh can run from inside the fixture.
  const repoRoot = process.cwd();
  for (const rel of ['tools/review-queue', 'tools/blocked.py']) {
    const src = join(repoRoot, rel);
    if (existsSync(src)) {
      mkdirSync(join(clone, rel.split('/').slice(0, -1).join('/')), { recursive: true });
      cpSync(src, join(clone, rel), { recursive: true });
    }
  }
  mkdirSync(join(clone, 'raw/internal'), { recursive: true });

  git(clone, 'add', '-A');
  git(clone, 'commit', '-q', '-m', 'bootstrap');
  git(clone, 'push', '-q', '-u', 'origin', 'main');

  // 3. Round artifacts staged but not yet committed — we'll commit them
  //    after the dirty file is introduced (mirroring the watcher Step 1
  //    arrival order where the round was committed by reviewers + the
  //    watcher tick pulls before combining).
  const roundDir = join(clone, 'backlog/reviews', ITEM_ID, 'r1');
  mkdirSync(roundDir, { recursive: true });
  writeFileSync(
    join(roundDir, 'request.md'),
    [
      '---',
      `item_id: "${ITEM_ID}"`,
      'round: 1',
      `spec_commit_sha: "${SHA}"`,
      `artifact_path: "backlog/ready/${ITEM_ID}.md"`,
      'class: "narrow"',
      'requested_at: "2026-05-12T05:00:00Z"',
      'requested_reviewers:',
      '  - "codex"',
      '  - "cursor"',
      '---',
      '',
      'body',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(roundDir, 'codex.md'),
    [
      '---',
      `item_id: "${ITEM_ID}"`,
      'round: 1',
      'reviewer: "codex"',
      `artifact_sha: "${SHA}"`,
      'completed_at: "2026-05-12T06:00:00Z"',
      'verdict: "proceed"',
      'findings: []',
      '---',
      '',
      'body',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(roundDir, 'cursor.md'),
    [
      '---',
      `item_id: "${ITEM_ID}"`,
      'round: 1',
      'reviewer: "cursor"',
      `artifact_sha: "${SHA}"`,
      'completed_at: "2026-05-12T06:30:00Z"',
      'verdict: "proceed"',
      'findings: []',
      '---',
      '',
      'body',
      '',
    ].join('\n'),
  );
  git(clone, 'add', '-A');
  git(clone, 'commit', '-q', '-m', `review-r1: artifacts on ${ITEM_ID}`);
  git(clone, 'push', '-q', 'origin', 'main');

  // 4. Advance origin via a second clone so the watcher's `git pull
  //    --rebase` actually has work to rebase against (autostash only
  //    matters when there's a non-trivial rebase).
  const advance = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-044-advance-')));
  git(advance, 'clone', '-q', origin, '.');
  git(advance, 'config', 'user.email', 'test2@example.com');
  git(advance, 'config', 'user.name', 'test2');
  writeFileSync(join(advance, 'unrelated.txt'), 'remote-advance\n');
  git(advance, 'add', 'unrelated.txt');
  git(advance, 'commit', '-q', '-m', 'remote advance');
  git(advance, 'push', '-q', 'origin', 'main');

  return { origin, clone, advance };
}

describe('044 AC1 — autostash on every watcher-transaction git pull', () => {
  let fx: { origin: string; clone: string; advance: string };
  beforeEach(() => {
    fx = setupOriginAndClone();
  });
  afterEach(() => {
    rmSync(fx.origin, { recursive: true, force: true });
    rmSync(fx.clone, { recursive: true, force: true });
    rmSync(fx.advance, { recursive: true, force: true });
  });

  it('dirty journal + remote-advanced origin: full transaction succeeds, dirty file preserved, no PUSH-RACE-FALLBACK rows', () => {
    // 1. Introduce dirty journal file BEFORE the watcher transaction —
    //    simulates the canonical 043-cycle pattern (in-the-moment journal
    //    append).
    const dirtyJournalRel = 'raw/internal/mcp-interactions-journal.md';
    const dirtyJournal = join(fx.clone, dirtyJournalRel);
    writeFileSync(dirtyJournal, 'dirty journal content\n');
    git(fx.clone, 'add', dirtyJournalRel);
    // Keep it staged-but-uncommitted so `git status --porcelain` reports
    // it as a "would be overwritten by merge" target for the rebase.
    // (The legacy non-autostash path is what fails here.)

    // 2. Run the watcher Step 1 pull with autostash. This must NOT fail
    //    on the dirty tree; the file must be preserved post-pull.
    const step1 = spawnSync(
      'git',
      ['-c', 'rebase.autoStash=true', 'pull', '--rebase', 'origin', 'main'],
      { cwd: fx.clone, encoding: 'utf-8' },
    );
    expect(step1.status, `step1 stderr: ${step1.stderr}`).toBe(0);
    expect(existsSync(dirtyJournal)).toBe(true);
    expect(readFileSync(dirtyJournal, 'utf-8')).toBe('dirty journal content\n');

    // 3. Run combine.py from inside the fixture clone. combine.py's
    //    `git pull --rebase` subprocess (combine.py:690) is the second
    //    autostash site; push-with-retry.sh:25 is the third.
    //    Before running combine.py, advance origin AGAIN so there's
    //    rebase work waiting for combine.py's inner pull AND for
    //    push-with-retry.sh's inner pull.
    writeFileSync(join(fx.advance, 'unrelated2.txt'), 'remote-advance-2\n');
    git(fx.advance, 'add', 'unrelated2.txt');
    git(fx.advance, 'commit', '-q', '-m', 'remote advance 2');
    git(fx.advance, 'push', '-q', 'origin', 'main');

    // Modify the dirty journal AGAIN so combine.py's subprocess pull
    // also encounters a dirty tree.
    writeFileSync(dirtyJournal, 'dirty journal content v2\n');

    const combine = spawnSync(
      'python3',
      ['tools/review-queue/combine.py', `--repo-root=${fx.clone}`, '--all'],
      { cwd: fx.clone, encoding: 'utf-8' },
    );
    expect(combine.status, `combine stderr: ${combine.stderr}`).toBe(0);

    // 4. combined.md was written + committed + pushed.
    const combinedPath = join(fx.clone, 'backlog/reviews', ITEM_ID, 'r1/combined.md');
    expect(existsSync(combinedPath)).toBe(true);
    const head = git(fx.clone, 'log', '-1', '--pretty=%s').trim();
    expect(head).toMatch(/review-r1: combined on/);

    // Confirm origin has the new commit.
    const remoteHead = git(fx.advance, 'fetch', 'origin', 'main') +
      git(fx.advance, 'log', 'origin/main', '-1', '--pretty=%s').trim();
    expect(remoteHead).toMatch(/review-r1: combined on/);

    // 5. Dirty journal preserved after the full transaction.
    expect(existsSync(dirtyJournal)).toBe(true);
    expect(readFileSync(dirtyJournal, 'utf-8')).toBe('dirty journal content v2\n');

    // 6. queue-errors.md got ZERO new PUSH-RACE-FALLBACK rows during
    //    the transaction (the cure is verified by absence of fallback
    //    rows, not just by transaction success).
    const queueErrors = join(fx.clone, 'raw/internal/queue-errors.md');
    if (existsSync(queueErrors)) {
      const text = readFileSync(queueErrors, 'utf-8');
      expect(text).not.toMatch(/PUSH-RACE-FALLBACK/);
    }
  });
});
