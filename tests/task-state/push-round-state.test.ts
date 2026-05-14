// 046 AC4 — push-round-state.sh blob-lease test (codex R4 F1).
//
// Sets up a tmpdir + bare-origin + two clones (writer A, writer B). Both
// writers read the same base blob. A pushes a different round-state
// rewrite first. B's `push-round-state.sh` invocation MUST:
//   - exit non-zero
//   - leave `raw/internal/queue-errors.md` with a ROUND_STATE_WRITE_CAS_ABORT_PUSH row
//   - that row's commit MUST be on local main AND on origin/main

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const PUSH_SCRIPT_REL = 'tools/task-state/push-round-state.sh';
const PUSH_HELPER_REL = 'tools/review-queue/push-with-retry.sh';
const REPO = process.cwd();
const TASK = '2026-05-13-046-context-fatigue-via-role-typed-state';
const POINTER_REL = `backlog/task-state/${TASK}/round-state.md`;

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' });
}

function runPushScript(
  cwd: string,
  taskId: string,
  baseBlob: string,
): { code: number; stdout: string; stderr: string } {
  const r = spawnSync('bash', [join(cwd, PUSH_SCRIPT_REL), taskId, baseBlob], {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    code: typeof r.status === 'number' ? r.status : 1,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
}

function writePointerFile(repoRoot: string, body: string): void {
  const dir = join(repoRoot, 'backlog', 'task-state', TASK);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'round-state.md'), body);
}

function copyHelperScripts(targetRoot: string): void {
  // The scripts live in production REPO; copy them to the clone roots so
  // bash invocations resolve $REPO_ROOT/tools/task-state/... correctly.
  for (const rel of [PUSH_SCRIPT_REL, PUSH_HELPER_REL]) {
    const src = join(REPO, rel);
    const dst = join(targetRoot, rel);
    mkdirSync(join(dst, '..'), { recursive: true });
    writeFileSync(dst, readFileSync(src, 'utf-8'), { mode: 0o755 });
  }
}

function initRepo(repoRoot: string): void {
  git(repoRoot, ['init', '-q', '-b', 'main']);
  git(repoRoot, ['config', 'user.email', 'test@example.com']);
  git(repoRoot, ['config', 'user.name', 'Tester']);
  git(repoRoot, ['config', 'commit.gpgsign', 'false']);
}

const sampleRoundStateBase = `current_round: r1

## current_thesis
base thesis

## locked_decisions
- d1

## open_questions
- q1

## dont_touch
- nothing

## canonical_anchors

- spec: backlog/ready/x.md
`;

describe('046 AC4 — push-round-state.sh blob-lease', () => {
  let workRoot: string;
  beforeEach(() => {
    workRoot = mkdtempSync(join(tmpdir(), 'echo-046-push-rs-'));
  });
  afterEach(() => {
    rmSync(workRoot, { recursive: true, force: true });
  });

  it('B aborts when A lands a competing round-state rewrite first; queue-errors row is committed locally and on origin', () => {
    // Lay out: bare-origin, two clones A and B.
    const origin = join(workRoot, 'origin.git');
    const cloneA = join(workRoot, 'A');
    const cloneB = join(workRoot, 'B');
    mkdirSync(origin);
    mkdirSync(cloneA);
    mkdirSync(cloneB);

    // Seed origin via a temp local repo that then pushes.
    const seed = join(workRoot, 'seed');
    mkdirSync(seed);
    initRepo(seed);
    writePointerFile(seed, sampleRoundStateBase);
    git(seed, ['add', '-A']);
    git(seed, ['commit', '-q', '-m', 'seed r1']);
    git(seed, ['init', '--bare', '-q', '-b', 'main', origin]);
    git(seed, ['remote', 'add', 'origin', origin]);
    git(seed, ['push', '-q', 'origin', 'main']);

    // Clone A
    git(workRoot, ['clone', '-q', origin, 'A']);
    git(cloneA, ['config', 'user.email', 'a@example.com']);
    git(cloneA, ['config', 'user.name', 'A']);
    git(cloneA, ['config', 'commit.gpgsign', 'false']);
    git(cloneA, ['checkout', '-q', 'main']);
    copyHelperScripts(cloneA);
    // Clone B
    git(workRoot, ['clone', '-q', origin, 'B']);
    git(cloneB, ['config', 'user.email', 'b@example.com']);
    git(cloneB, ['config', 'user.name', 'B']);
    git(cloneB, ['config', 'commit.gpgsign', 'false']);
    git(cloneB, ['checkout', '-q', 'main']);
    copyHelperScripts(cloneB);

    // Both A and B read the same base blob SHA from HEAD.
    const baseBlobA = git(cloneA, ['rev-parse', `HEAD:${POINTER_REL}`]).trim();
    const baseBlobB = git(cloneB, ['rev-parse', `HEAD:${POINTER_REL}`]).trim();
    expect(baseBlobB).toBe(baseBlobA);

    // A writes its rewrite and pushes first via the helper.
    writePointerFile(
      cloneA,
      sampleRoundStateBase.replace('base thesis', 'A wins'),
    );
    const aResult = runPushScript(cloneA, TASK, baseBlobA);
    expect(aResult.code, aResult.stderr).toBe(0);

    // Now B writes its competing rewrite and attempts the helper.
    writePointerFile(
      cloneB,
      sampleRoundStateBase.replace('base thesis', 'B should lose'),
    );
    const bResult = runPushScript(cloneB, TASK, baseBlobB);
    expect(bResult.code, `expected non-zero exit, got ${bResult.code}; stderr=${bResult.stderr}`).not.toBe(0);

    // queue-errors.md must contain the abort row in B's local tree.
    const queueErrorsPathB = join(cloneB, 'raw', 'internal', 'queue-errors.md');
    expect(existsSync(queueErrorsPathB)).toBe(true);
    const queueErrorsBodyB = readFileSync(queueErrorsPathB, 'utf-8');
    expect(queueErrorsBodyB).toMatch(/ROUND_STATE_WRITE_CAS_ABORT_PUSH/);
    expect(queueErrorsBodyB).toContain(TASK);

    // The abort row commit must be on B's local main.
    const bLog = git(cloneB, ['log', '-1', '--format=%s', 'main']).trim();
    expect(bLog).toMatch(/round-state CAS push abort/);

    // And on origin/main (pushed via push-with-retry.sh).
    // Pull from origin into seed to verify cross-clone visibility.
    git(seed, ['fetch', '-q', 'origin']);
    const originLog = git(seed, ['log', '-1', '--format=%s', 'origin/main']).trim();
    expect(originLog).toMatch(/round-state CAS push abort/);
    // And that A's round-state rewrite is the one that landed (B did not replace it).
    const finalBlob = git(seed, ['show', `origin/main:${POINTER_REL}`]);
    expect(finalBlob).toContain('A wins');
    expect(finalBlob).not.toContain('B should lose');
  });
});
