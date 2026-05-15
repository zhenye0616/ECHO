/**
 * run-reviewer-honors-merge-lock.test.ts — 051 AC2 + AC3.
 *
 * Falsifies the 2026-05-14-morning collision: codex-side reviewer launchd
 * ticks ran `git add` + `git commit` against the live `.git/index` while
 * Claude's merge-and-cleanup session held the merge in flight, capturing
 * BOTH file sets into a single commit. AC2 + AC3 fix this by reading
 * `.git/echo-merge-in-progress` (the same sentinel `merge-and-cleanup.md`
 * writes) before any reviewer-tick git operations, and exiting 0 if the
 * lock is held.
 *
 * Parameterized across REVIEWER_NAME=codex AND REVIEWER_NAME=codex-ops
 * (the two launchd-fired headless reviewers per reviewers.json). Cursor
 * is `mode: ide` and does not invoke _run_reviewer.sh — explicitly out
 * of scope per 051 spec.
 *
 * Two scenarios per reviewer:
 *   1. Lock present: wrapper exits 0; codex stub NOT invoked; log line
 *      "tick skipped: merge in progress" present with holder string.
 *   2. Lock absent: wrapper proceeds past the gate and invokes the
 *      codex stub (via the CODEX_BIN env hook).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
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

function git(cwd: string, ...args: string[]) {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' });
}

type Fixture = {
  repo: string;
  home: string;
  stubInvocations: string;
  stub: string;
  wrapper: string;
};

function setupFixture(): Fixture {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-051-ac2-')));
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-051-home-')));

  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.email', 'test@example.com');
  git(repo, 'config', 'user.name', 'test');

  // Copy review-queue helpers (the wrapper + the python gate + reviewers.json
  // schema files it needs).
  const repoRoot = process.cwd();
  const reviewQueueDir = join(repo, 'tools/review-queue');
  mkdirSync(reviewQueueDir, { recursive: true });
  cpSync(join(repoRoot, 'tools/review-queue'), reviewQueueDir, { recursive: true });

  // Prompt fixtures for BOTH headless reviewers (AC3 parameterization).
  // Without both, the _reviewer_gate.py / [ -f "$PROMPT" ] check at
  // _run_reviewer.sh would short-circuit before the codex stub.
  const cmdDir = join(repo, '.claude/commands');
  mkdirSync(cmdDir, { recursive: true });
  writeFileSync(join(cmdDir, 'review-queue-codex.md'), 'stub prompt codex\n');
  writeFileSync(join(cmdDir, 'review-queue-codex-ops.md'), 'stub prompt codex-ops\n');

  // Initial commit so `git rev-parse` etc. work.
  writeFileSync(join(repo, 'README.md'), 'init\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'init');

  // CODEX stub — appends "CODEX_INVOKED=true\n" to a fixture file when
  // executed. Mirrors the AC2 spec language.
  const stubInvocations = join(home, 'codex-stub-invocations.txt');
  const stub = join(home, 'codex-stub.sh');
  writeFileSync(
    stub,
    `#!/usr/bin/env bash\nprintf 'CODEX_INVOKED=true\\n' >> "${stubInvocations}"\nexit 0\n`,
  );
  chmodSync(stub, 0o755);

  return {
    repo,
    home,
    stubInvocations,
    stub,
    wrapper: join(reviewQueueDir, '_run_reviewer.sh'),
  };
}

function runWrapper(
  fx: Fixture,
  reviewerName: string,
): { code: number; stdout: string; stderr: string } {
  const r = spawnSync('bash', [fx.wrapper], {
    env: {
      ...process.env,
      REVIEWER_NAME: reviewerName,
      ECHO_REVIEW_QUEUE_REPO_ROOT: fx.repo,
      HOME: fx.home,
      CODEX_BIN: fx.stub,
    },
    encoding: 'utf-8',
  });
  return { code: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

function readLog(fx: Fixture, reviewerName: string): string {
  const log = join(fx.home, 'Library/Logs', `echo-review-queue-${reviewerName}.log`);
  return existsSync(log) ? readFileSync(log, 'utf-8') : '';
}

describe.each([['codex'], ['codex-ops']])(
  '051 AC2 + AC3 — _run_reviewer.sh honors echo-merge-in-progress (REVIEWER_NAME=%s)',
  (reviewerName) => {
    let fx: Fixture;
    beforeEach(() => {
      fx = setupFixture();
    });
    afterEach(() => {
      rmSync(fx.repo, { recursive: true, force: true });
      rmSync(fx.home, { recursive: true, force: true });
    });

    it('lock present: exit 0, codex NOT invoked, skip line in log with holder', () => {
      // Write the sentinel into the SHARED .git common dir.
      const gitCommonDir = git(fx.repo, 'rev-parse', '--git-common-dir').trim();
      const absGitDir = gitCommonDir.startsWith('/')
        ? gitCommonDir
        : join(fx.repo, gitCommonDir);
      const holder = 'test-id @ 2026-05-15T00:00:00Z by 12345';
      writeFileSync(join(absGitDir, 'echo-merge-in-progress'), `${holder}\n`);

      const r = runWrapper(fx, reviewerName);
      expect(r.code, `stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);

      // Codex stub NEVER invoked.
      expect(existsSync(fx.stubInvocations)).toBe(false);

      // Log line present with holder.
      const log = readLog(fx, reviewerName);
      expect(log).toMatch(/tick skipped: merge in progress/);
      expect(log).toContain(holder);
    });

    it('lock absent: wrapper passes gate and invokes codex stub via CODEX_BIN', () => {
      const r = runWrapper(fx, reviewerName);
      expect(r.code, `stderr: ${r.stderr}\nstdout: ${r.stdout}`).toBe(0);

      // Codex stub WAS invoked.
      expect(existsSync(fx.stubInvocations)).toBe(true);
      expect(readFileSync(fx.stubInvocations, 'utf-8')).toMatch(/CODEX_INVOKED=true/);

      // Log line shape: "tick start" + "tick end rc=0".
      const log = readLog(fx, reviewerName);
      expect(log).toMatch(/tick start REVIEWER=/);
      expect(log).toMatch(/tick end rc=0/);
      expect(log).not.toMatch(/tick skipped: merge in progress/);
    });
  },
);
