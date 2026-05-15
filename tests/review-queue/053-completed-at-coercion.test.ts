/**
 * 053-completed-at-coercion.test.ts — AC3 for item
 * 2026-05-14-053-reviewer-completed-at-coercion.
 *
 * AC3.1 — direct unit-test of `_coerce_completed_at` for four tz subcases.
 * AC3.2 — hermetic end-to-end pipeline test (validate_response_yaml.py →
 *         commit-reviewer-response.sh → combine.py) in an isolated temp
 *         git repo with a stubbed local "origin", confirming an
 *         UNQUOTED-YAML `completed_at` passes the full pipeline with no
 *         quarantine triggered.
 * AC3.3 — on-disk source bytes of the unquoted-fixture reviewer file are
 *         byte-identical before vs. after the pipeline (the coercion is
 *         in-memory only).
 *
 * Production-repo-safety guards (codex R2 F1 + codex-ops R2 F4 +
 * codex R3 F3 + codex R4 F2 + codex R5 F1):
 *   - Pre-test snapshot of ~/Desktop/Project_echo HEAD + porcelain status
 *     + ls-remote refs/heads/main (validated 40-hex non-empty).
 *   - Post-test re-snapshot inside `afterEach` that runs on every exit
 *     path (success, mid-pipeline assertion failure, exception).
 *   - Origin-URL assertion inside AC3.2 setup: temp checkout's origin
 *     MUST point at a file:// / local-path origin (never github.com).
 *   - Push-stub: file-replacement at $CHECKOUT/tools/review-queue/push-with-retry.sh
 *     (the PATH-stub approach is forbidden because commit-reviewer-response.sh
 *     resolves PUSH_HELPER via git rev-parse --show-toplevel to an absolute
 *     path).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pythonInvocation, REPO } from './_helpers.js';

const PROD_REPO = join(homedir(), 'Desktop/Project_echo');
const FIXTURE_ITEM_ID = '2026-05-14-053-reviewer-completed-at-coercion';

interface ProdSnapshot {
  head: string;
  status: string;
  remoteMain: string;
}

function captureProdSnapshot(label: string): ProdSnapshot {
  let head: string;
  let status: string;
  try {
    head = execFileSync('git', ['-C', PROD_REPO, 'rev-parse', 'HEAD'], {
      encoding: 'utf-8',
    }).trim();
    status = execFileSync('git', ['-C', PROD_REPO, 'status', '--porcelain'], {
      encoding: 'utf-8',
    });
  } catch (err) {
    throw new Error(
      `AC3.2 cannot verify production-remote safety (${label}) — local git failed: ` +
        (err as Error).message,
    );
  }
  let stdout: string;
  try {
    stdout = execFileSync('git', ['-C', PROD_REPO, 'ls-remote', 'origin', 'refs/heads/main'], {
      encoding: 'utf-8',
    });
  } catch (err) {
    throw new Error(
      `AC3.2 cannot verify production-remote safety (${label}) — ls-remote failed; refusing to run: ` +
        (err as Error).message,
    );
  }
  const remoteMain = (stdout.split(/\s+/)[0] || '').trim();
  if (!/^[a-f0-9]{40}$/.test(remoteMain)) {
    throw new Error(
      `AC3.2 cannot verify production-remote safety (${label}) — pre-snapshot ls-remote returned ` +
        `invalid SHA ${JSON.stringify(remoteMain)}; refusing to run`,
    );
  }
  return { head, status, remoteMain };
}

function pyArgs(...rest: string[]): { cmd: string; args: string[] } {
  const py = pythonInvocation();
  return { cmd: py.cmd, args: [...py.args, ...rest] };
}

// ----------------------------------------------------------------------------
// AC3.1 — direct unit-test of _coerce_completed_at
// ----------------------------------------------------------------------------

describe('053 AC3.1 — _coerce_completed_at helper direct unit-test', () => {
  function callHelper(pythonExpr: string): string {
    const { cmd, args } = pyArgs(
      '-c',
      [
        'import sys, datetime',
        `sys.path.insert(0, ${JSON.stringify(join(REPO, 'tools/review-queue'))})`,
        'from validate import _coerce_completed_at',
        `print(_coerce_completed_at(${pythonExpr}), end="")`,
      ].join('\n'),
    );
    const r = spawnSync(cmd, args, { encoding: 'utf-8' });
    expect(r.status, `stderr: ${r.stderr}`).toBe(0);
    return r.stdout;
  }

  it('UTC tz-aware datetime → 2026-05-12T23:56:42Z', () => {
    expect(
      callHelper(
        'datetime.datetime(2026,5,12,23,56,42,tzinfo=datetime.timezone.utc)',
      ),
    ).toBe('2026-05-12T23:56:42Z');
  });

  it('-07:00 tz-aware (PDT) → 2026-05-12T23:56:42Z (UTC conversion applied)', () => {
    expect(
      callHelper(
        'datetime.datetime(2026,5,12,16,56,42,tzinfo=datetime.timezone(datetime.timedelta(hours=-7)))',
      ),
    ).toBe('2026-05-12T23:56:42Z');
  });

  it('+09:00 tz-aware (JST) → 2026-05-12T23:56:42Z (day-boundary crossing handled)', () => {
    expect(
      callHelper(
        'datetime.datetime(2026,5,13,8,56,42,tzinfo=datetime.timezone(datetime.timedelta(hours=9)))',
      ),
    ).toBe('2026-05-12T23:56:42Z');
  });

  it('naive (tzinfo=None) datetime → 2026-05-12T23:56:42Z (assumed-UTC fallthrough)', () => {
    expect(callHelper('datetime.datetime(2026,5,12,23,56,42)')).toBe(
      '2026-05-12T23:56:42Z',
    );
  });
});

// ----------------------------------------------------------------------------
// AC3.2 — hermetic end-to-end pipeline + AC3.3 source-bytes-unchanged
// ----------------------------------------------------------------------------

describe('053 AC3.2 — hermetic end-to-end pipeline with unquoted completed_at', () => {
  let work: string;
  let origin: string;
  let checkout: string;
  let prodPre: ProdSnapshot;

  beforeEach(() => {
    prodPre = captureProdSnapshot('pre');

    work = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-053-')));
    origin = join(work, 'origin.git');
    checkout = join(work, 'checkout');

    // 1. Bare origin (default branch main).
    execFileSync('git', ['-c', 'init.defaultBranch=main', 'init', '--bare', '-q', origin]);

    // 2. Working checkout, explicitly on `main` (codex-ops R2 F3 — `-b main`
    //    is REQUIRED on hosts where system git defaults to master).
    execFileSync('git', ['-c', 'init.defaultBranch=main', 'init', '-b', 'main', '-q', checkout]);

    // 3. LOCAL git identity (codex R2 F2 + codex-ops R2 F3 — REQUIRED so
    //    commit-reviewer-response.sh's `git commit` does not abort.).
    execFileSync('git', ['-C', checkout, 'config', 'user.email', 'test@echo.local']);
    execFileSync('git', ['-C', checkout, 'config', 'user.name', 'ECHO Test Harness']);

    execFileSync('git', ['-C', checkout, 'remote', 'add', 'origin', origin]);

    // 4. Origin-URL assertion (codex R2 F1 — defense-in-depth).
    const originUrl = execFileSync('git', ['-C', checkout, 'remote', 'get-url', 'origin'], {
      encoding: 'utf-8',
    }).trim();
    expect(originUrl).not.toMatch(/github\.com/);
    expect(originUrl === origin || originUrl.startsWith('file://')).toBe(true);

    // 5. Seed initial commit + push so origin/main ref exists.
    writeFileSync(join(checkout, '.gitkeep'), 'init\n');
    execFileSync('git', ['-C', checkout, 'add', '.gitkeep']);
    execFileSync('git', ['-C', checkout, 'commit', '-q', '-m', 'init']);
    execFileSync('git', ['-C', checkout, 'push', '-q', 'origin', 'main']);

    // 6. Copy tools/review-queue/ into the checkout — all helpers + schemas
    //    + reviewers.json (codex R3 F2 — reviewers.json is required for
    //    _reviewers.py at combine.py module-load).
    mkdirSync(join(checkout, 'tools/review-queue/schemas'), { recursive: true });
    for (const rel of [
      'tools/review-queue/validate.py',
      'tools/review-queue/validate_response_yaml.py',
      'tools/review-queue/commit-reviewer-response.sh',
      'tools/review-queue/combine.py',
      'tools/review-queue/_lib.py',
      'tools/review-queue/_reviewers.py',
      'tools/review-queue/dispatch-next-round.py',
      'tools/review-queue/request.py',
      'tools/review-queue/reviewers.json',
    ]) {
      copyFileSync(join(REPO, rel), join(checkout, rel));
    }
    for (const s of readdirSync(join(REPO, 'tools/review-queue/schemas'))) {
      copyFileSync(
        join(REPO, 'tools/review-queue/schemas', s),
        join(checkout, 'tools/review-queue/schemas', s),
      );
    }
    chmodSync(join(checkout, 'tools/review-queue/validate_response_yaml.py'), 0o755);
    chmodSync(join(checkout, 'tools/review-queue/commit-reviewer-response.sh'), 0o755);

    // 7. Replace push-with-retry.sh with the local-origin stub (codex R3 F1).
    const stubPath = join(checkout, 'tools/review-queue/push-with-retry.sh');
    writeFileSync(
      stubPath,
      [
        '#!/usr/bin/env bash',
        '# 053 AC3.2 test stub — pushes to the temp-local origin, NEVER github.com.',
        'set -euo pipefail',
        `git push -q "${origin}" HEAD:main`,
        '',
      ].join('\n'),
    );
    chmodSync(stubPath, 0o755);

    // 8. Commit the tools copy so the checkout HEAD is clean before the
    //    pipeline mutates anything (commit-reviewer-response.sh's
    //    `git pull --rebase` is fine on a dirty tree thanks to autoStash,
    //    but starting clean isolates the test to the response-side changes).
    execFileSync('git', ['-C', checkout, 'add', 'tools/review-queue']);
    execFileSync('git', ['-C', checkout, 'commit', '-q', '-m', 'seed: tools/review-queue']);
    execFileSync('git', ['-C', checkout, 'push', '-q', 'origin', 'main']);
  });

  afterEach(() => {
    // Production-repo-untouched re-snapshot. MUST run on EVERY exit path
    // (codex-ops R2 F4) — afterEach fires for happy-path success, assertion
    // failure mid-pipeline, and exception thrown by any inner call.
    try {
      const prodPost = captureProdSnapshot('post');
      expect(prodPost.head, 'production repo HEAD changed during 053 AC3.2').toBe(prodPre.head);
      expect(prodPost.status, 'production repo working-tree changed during 053 AC3.2').toBe(
        prodPre.status,
      );
      expect(
        prodPost.remoteMain,
        'production repo origin/main SHA changed during 053 AC3.2 — possible leaked push',
      ).toBe(prodPre.remoteMain);
    } finally {
      if (work) rmSync(work, { recursive: true, force: true });
    }
  });

  it('AC3.2 — unquoted completed_at flows through validate_response_yaml → commit-reviewer-response → combine without quarantine', () => {
    const roundRel = `backlog/reviews/${FIXTURE_ITEM_ID}/r1`;
    const roundAbs = join(checkout, roundRel);
    mkdirSync(roundAbs, { recursive: true });

    // Single-reviewer eligibility (codex R3 F2 shape (a)): the fixture
    // request.md lists exactly one reviewer so combine.py will produce a
    // combined.md after that one response lands.
    const requestPath = join(roundAbs, 'request.md');
    writeFileSync(
      requestPath,
      [
        '---',
        `item_id: "${FIXTURE_ITEM_ID}"`,
        'round: 1',
        'spec_commit_sha: "abcdef1234567890abcdef1234567890abcdef12"',
        `artifact_path: "backlog/ready/${FIXTURE_ITEM_ID}.md"`,
        'class: "narrow"',
        'requested_at: "2026-05-14T00:00:00Z"',
        'requested_reviewers:',
        '  - codex',
        '---',
        '',
        'fixture request — single-reviewer eligibility.',
        '',
      ].join('\n'),
    );

    // The reviewer response with an UNQUOTED ISO 8601 completed_at — the
    // exact failure shape 053 spec'd to fix. PyYAML auto-parses this to
    // datetime.datetime; without 053's coercion it fails the schema's
    // type=string contract.
    const reviewerPath = join(roundAbs, 'codex.md');
    const reviewerContent = [
      '---',
      `item_id: "${FIXTURE_ITEM_ID}"`,
      'round: 1',
      'reviewer: "codex"',
      'artifact_sha: "abcdef1"',
      'completed_at: 2026-05-12T23:56:42Z',
      'verdict: "proceed"',
      'findings: []',
      '---',
      '',
      'fixture response with UNQUOTED completed_at — 053 coercion target.',
      '',
    ].join('\n');
    writeFileSync(reviewerPath, reviewerContent);

    // AC3.3 — capture bytes BEFORE pipeline.
    const bytesBefore = readFileSync(reviewerPath);

    // Stage + commit the fixture request + codex.md before invoking the
    // pipeline, mirroring the steady-state shape (the response is committed
    // by commit-reviewer-response.sh, but request.md is committed earlier
    // by the strategist). Without the request commit, combine.py's
    // git-aware path is unaffected (the request file just needs to exist on
    // disk for the eligible-round scan).
    execFileSync('git', ['-C', checkout, 'add', requestPath]);
    execFileSync('git', ['-C', checkout, 'commit', '-q', '-m', `seed: r1 request for ${FIXTURE_ITEM_ID}`]);
    execFileSync('git', ['-C', checkout, 'push', '-q', 'origin', 'main']);

    // Pipeline stage 1 — validate_response_yaml.py (pre-link gate).
    const validateRel = 'tools/review-queue/validate_response_yaml.py';
    const r1 = spawnSync(join(checkout, validateRel), [reviewerPath], {
      cwd: checkout,
      encoding: 'utf-8',
    });
    expect(r1.status, `stage1 stderr: ${r1.stderr}`).toBe(0);

    // Pipeline stage 2 — commit-reviewer-response.sh.
    const commitRel = 'tools/review-queue/commit-reviewer-response.sh';
    const r2 = spawnSync(join(checkout, commitRel), [reviewerPath, 'codex', '1', FIXTURE_ITEM_ID], {
      cwd: checkout,
      encoding: 'utf-8',
    });
    expect(r2.status, `stage2 stdout: ${r2.stdout}\nstage2 stderr: ${r2.stderr}`).toBe(0);

    // No quarantine sibling (codex R4 F1 — anchored on the actual
    // <reviewer>.md.invalid.<ts> rename produced by commit-reviewer-response.sh
    // lines 77-84).
    const roundSiblings = readdirSync(roundAbs);
    for (const f of roundSiblings) {
      expect(
        f.startsWith('codex.md.invalid.'),
        `unexpected quarantine sibling produced: ${f}`,
      ).toBe(false);
    }

    // No new VALIDATION-FAIL row in queue-errors.md. Under the hermetic
    // setup the file does not pre-exist; if it now exists it MUST NOT
    // contain a VALIDATION-FAIL row referencing this round.
    const queueErrors = join(checkout, 'raw/internal/queue-errors.md');
    try {
      const txt = readFileSync(queueErrors, 'utf-8');
      expect(
        txt.includes(`VALIDATION-FAIL: codex r1 on ${FIXTURE_ITEM_ID}`),
        `queue-errors.md contains VALIDATION-FAIL row — coercion did not absorb the unquoted timestamp:\n${txt}`,
      ).toBe(false);
    } catch {
      // ENOENT is the expected default: the file does not exist post-pipeline.
    }

    // Response file lands at the expected path.
    expect(readdirSync(roundAbs)).toContain('codex.md');

    // Pipeline stage 3 — combine.py for the eligible round.
    const py = pyArgs(
      join(checkout, 'tools/review-queue/combine.py'),
      '--repo-root',
      checkout,
      '--no-git',
      '--all',
    );
    const env = {
      ...process.env,
      ECHO_REVIEW_QUEUE_REPO_ROOT: checkout,
    };
    const r3 = spawnSync(py.cmd, py.args, { cwd: checkout, encoding: 'utf-8', env });
    expect(r3.status, `stage3 stdout: ${r3.stdout}\nstage3 stderr: ${r3.stderr}`).toBe(0);

    // combined.md exists and is well-formed.
    const combinedPath = join(roundAbs, 'combined.md');
    const combinedTxt = readFileSync(combinedPath, 'utf-8');
    const fmMatch = combinedTxt.match(/^---\n([\s\S]*?)\n---\n/);
    expect(fmMatch, 'combined.md missing frontmatter').not.toBeNull();
    expect(fmMatch![1]).toMatch(/combined_verdict:\s*['"]?[a-z_]+['"]?/);
    expect(fmMatch![1]).not.toMatch(/combined_verdict:\s*['"]?malformed_reviewer_response['"]?/);

    // AC3.3 — bytes-on-disk unchanged. After validate + commit + combine,
    // re-read the reviewer file and assert byte-identity with the pre-
    // pipeline snapshot. Pins the "coercion is in-memory only" architectural
    // invariant into the test surface.
    const bytesAfter = readFileSync(reviewerPath);
    expect(bytesAfter.equals(bytesBefore), 'AC3.3: reviewer file source bytes mutated during pipeline').toBe(
      true,
    );
  });
});

// ----------------------------------------------------------------------------
// AC4 — guard that quoted-string completed_at still passes (regression watch
// against AC2's coercion accidentally short-circuiting the happy path).
// ----------------------------------------------------------------------------

describe('053 AC4 — quoted-string completed_at unaffected by AC2 coercion', () => {
  let dir: string;

  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-053-ac4-')));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('quoted completed_at still passes validate_response_yaml.py', () => {
    const path = join(dir, 'codex.md');
    writeFileSync(
      path,
      [
        '---',
        `item_id: "${FIXTURE_ITEM_ID}"`,
        'round: 1',
        'reviewer: "codex"',
        'artifact_sha: "abcdef1"',
        "completed_at: '2026-05-12T23:56:42Z'",
        'verdict: "proceed"',
        'findings: []',
        '---',
        '',
        'body',
        '',
      ].join('\n'),
    );
    const r = spawnSync(join(REPO, 'tools/review-queue/validate_response_yaml.py'), [path], {
      cwd: REPO,
      encoding: 'utf-8',
    });
    expect(r.status, `stderr: ${r.stderr}`).toBe(0);
  });
});
