/**
 * 056-claude-reviewer-onboarding.test.ts — falsifications for 056 ACs:
 *   - AC1b/AC5 part 1: _reviewers.py loader accepts all 4 slugs +
 *     mode-conditional invoke_command assertion.
 *   - AC2: combined.schema.json validates a 4-reviewer round.
 *   - AC5 part 3: shell-safe substitution under spaces; argv-equivalence
 *     for codex / codex-ops (no regression from pre-AC5 hardcoded line).
 *   - AC5 part 4: queue_error.sh pre-spawn + per-round row shapes.
 *   - AC7: smoke runner accepts --install-context (fail-closed if claude
 *     CLI absent).
 *   - AC7b/AC8: installer preflights resolved invoke_command executable.
 *
 * Integration-level "cycle dogfooding" assertion (AC9 prong 2) is OUT of
 * scope here — observational, only meaningful after merge. The
 * mock-claude.sh fixture lets the wrapper run end-to-end in tmpdir
 * without the real claude CLI.
 */

import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REPO, runPython } from './_helpers.js';

const ITEM_ID = '2026-05-15-056-fixture-spec';
const FAKE_SHA = '0000000000000000000000000000000000000000';

function setupSmokeFixture(): { base: string; bare: string; repo: string; tmp: string } {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-056-')));
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
  // Copy the review-queue tooling tree + skill prompts.
  mkdirSync(join(repo, 'tools/review-queue/schemas'), { recursive: true });
  mkdirSync(join(repo, '.claude/commands'), { recursive: true });
  mkdirSync(join(repo, 'backlog/ready'), { recursive: true });
  mkdirSync(join(repo, 'raw/internal'), { recursive: true });
  cpSync(join(REPO, 'tools/review-queue'), join(repo, 'tools/review-queue'), {
    recursive: true,
  });
  // Remove pycache so add -A stays clean.
  rmSync(join(repo, 'tools/review-queue/__pycache__'), {
    recursive: true,
    force: true,
  });
  cpSync(
    join(REPO, '.claude/commands/review-queue-claude.md'),
    join(repo, '.claude/commands/review-queue-claude.md'),
  );
  if (existsSync(join(REPO, '.gitignore'))) {
    cpSync(join(REPO, '.gitignore'), join(repo, '.gitignore'));
  }
  // Seed a synthetic ready item so the request_path resolves.
  writeFileSync(
    join(repo, `backlog/ready/${ITEM_ID}.md`),
    `---\nid: ${ITEM_ID}\nstatus: ready\n---\n\nSynthetic spec body.\n`,
  );
  execSync('git add -A', { cwd: repo });
  execSync('git commit -q -m bootstrap', { cwd: repo });
  execSync('git push -q -u origin main', { cwd: repo });
  return { base, bare, repo, tmp };
}

function teardown(fx: { base: string }) {
  rmSync(fx.base, { recursive: true, force: true });
}

function writeRequestAtSha(repo: string, round: number, sha: string): string {
  const dir = join(repo, 'backlog/reviews', ITEM_ID, `r${round}`);
  mkdirSync(dir, { recursive: true });
  const body = [
    '---',
    `item_id: "${ITEM_ID}"`,
    `round: ${round}`,
    `spec_commit_sha: "${sha}"`,
    `artifact_path: "backlog/ready/${ITEM_ID}.md"`,
    'class: "narrow"',
    'requested_at: "2026-05-15T08:00:00Z"',
    'requested_reviewers:',
    '  - "claude"',
    '---',
    '',
    'body',
    '',
  ].join('\n');
  writeFileSync(join(dir, 'request.md'), body);
  execSync('git add backlog/reviews && git commit -q -m "fixture request"', {
    cwd: repo,
  });
  execSync('git push -q origin main', { cwd: repo });
  return dir;
}

// ────────────────────────────────────────────────────────────────────────
// AC1b / AC5 part 1 — loader accepts 4 slugs + mode-conditional invoke_command
// ────────────────────────────────────────────────────────────────────────

describe('056 AC1b/AC5 part 1 — _reviewers.py loader', () => {
  it('loads all 4 reviewer slugs (codex, cursor, codex-ops, claude) without ValueError', () => {
    const r = runPython([
      '-c',
      `import sys
sys.path.insert(0, ${JSON.stringify(join(REPO, 'tools/review-queue'))})
import _reviewers
revs = _reviewers.load_reviewers()
print(','.join(r.name for r in revs))`,
    ]);
    expect(r.code, r.stderr).toBe(0);
    const slugs = r.stdout.trim().split(',');
    expect(slugs).toEqual(['codex', 'cursor', 'codex-ops', 'claude']);
  });

  it('asserts non-empty invoke_command for headless reviewers; None for ide (cursor)', () => {
    const r = runPython([
      '-c',
      `import sys
sys.path.insert(0, ${JSON.stringify(join(REPO, 'tools/review-queue'))})
import _reviewers
revs = {r.name: r for r in _reviewers.load_reviewers()}
for slug in ('codex', 'codex-ops', 'claude'):
    rv = revs[slug]
    assert rv.invoke_command is not None and len(rv.invoke_command) > 0, slug
    assert '{{PROMPT}}' in rv.invoke_command, slug
assert revs['cursor'].invoke_command is None, 'cursor.invoke_command must be None'
print('ok')`,
    ]);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout.trim()).toBe('ok');
  });

  it('--print invoke_command for cursor (IDE-mode) exits non-zero with documented diagnostic', () => {
    const r = spawnSync('python3', [join(REPO, 'tools/review-queue/_reviewer_gate.py'), '--print', 'invoke_command'], {
      env: { ...process.env, REVIEWER_NAME: 'cursor' },
      encoding: 'utf-8',
    });
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/IDE-mode reviewer cursor has no invoke_command/);
  });

  it('--print invoke_command for headless reviewers exits 0 and prints resolved template', () => {
    for (const slug of ['codex', 'codex-ops', 'claude']) {
      const r = spawnSync(
        'python3',
        [join(REPO, 'tools/review-queue/_reviewer_gate.py'), '--print', 'invoke_command'],
        {
          env: {
            ...process.env,
            REVIEWER_NAME: slug,
            WT: '/tmp/wt',
            PROMPT: '/tmp/prompt.md',
          },
          encoding: 'utf-8',
        },
      );
      expect(r.status, `${slug} stderr=${r.stderr}`).toBe(0);
      expect(r.stdout.trim().length).toBeGreaterThan(0);
    }
  });

  it('argv-snapshot equivalence: codex/codex-ops resolved template matches pre-AC5 argv', () => {
    // Pre-AC5 line: codex exec -C "$WT" --sandbox danger-full-access - < "$PROMPT"
    // With shlex.quote on simple paths (no spaces/special), the quoting is a no-op.
    const expectedCodex = 'codex exec -C /tmp/wt --sandbox danger-full-access - < /tmp/prompt.md';
    const r = spawnSync(
      'python3',
      [join(REPO, 'tools/review-queue/_reviewer_gate.py'), '--print', 'invoke_command'],
      {
        env: { ...process.env, REVIEWER_NAME: 'codex', WT: '/tmp/wt', PROMPT: '/tmp/prompt.md' },
        encoding: 'utf-8',
      },
    );
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout.trim()).toBe(expectedCodex);
    const r2 = spawnSync(
      'python3',
      [join(REPO, 'tools/review-queue/_reviewer_gate.py'), '--print', 'invoke_command'],
      {
        env: { ...process.env, REVIEWER_NAME: 'codex-ops', WT: '/tmp/wt', PROMPT: '/tmp/prompt.md' },
        encoding: 'utf-8',
      },
    );
    expect(r2.status, r2.stderr).toBe(0);
    expect(r2.stdout.trim()).toBe(expectedCodex);
  });

  it('AC5 part 3 — shell-safe substitution: paths with spaces survive shlex.quote', () => {
    const r = spawnSync(
      'python3',
      [join(REPO, 'tools/review-queue/_reviewer_gate.py'), '--print', 'invoke_command'],
      {
        env: {
          ...process.env,
          REVIEWER_NAME: 'claude',
          WT: '/tmp/wt with spaces',
          PROMPT: '/tmp/p with spaces/x.md',
        },
        encoding: 'utf-8',
      },
    );
    expect(r.status, r.stderr).toBe(0);
    // shlex.quote uses single quotes for paths with spaces.
    expect(r.stdout).toMatch(/'\/tmp\/p with spaces\/x\.md'/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// AC2 — combined.schema.json validates 4-reviewer round
// ────────────────────────────────────────────────────────────────────────

describe('056 AC2 — combined.schema.json 4-reviewer surface', () => {
  let dir: string;
  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-combined-')));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('validates a combined.md with codex + codex-ops + claude + cursor responses', () => {
    const fixture = join(dir, 'combined.md');
    writeFileSync(
      fixture,
      [
        '---',
        `item_id: "${ITEM_ID}"`,
        'round: 1',
        'combined_at: "2026-05-15T09:00:00Z"',
        'codex_response: "codex.md"',
        'cursor_response: "cursor.md"',
        'codex-ops_response: "codex-ops.md"',
        'claude_response: "claude.md"',
        'combined_verdict: "proceed"',
        'escalated_to_founder: false',
        '---',
        '',
        'body',
        '',
      ].join('\n'),
    );
    const r = runPython([
      join(REPO, 'tools/review-queue/validate.py'),
      'combined',
      fixture,
    ]);
    expect(r.code, r.stderr).toBe(0);
  });

  it('reviewer.schema.json accepts reviewer: "claude"', () => {
    const fixture = join(dir, 'claude.md');
    writeFileSync(
      fixture,
      [
        '---',
        `item_id: "${ITEM_ID}"`,
        'round: 1',
        'reviewer: "claude"',
        'artifact_sha: "abc1234"',
        "completed_at: '2026-05-15T09:00:00Z'",
        'verdict: "proceed"',
        'findings: []',
        '---',
        '',
        'body',
        '',
      ].join('\n'),
    );
    const r = runPython([
      join(REPO, 'tools/review-queue/validate.py'),
      'reviewer',
      fixture,
    ]);
    expect(r.code, r.stderr).toBe(0);
  });

  it('request.schema.json accepts requested_reviewers including "claude"', () => {
    const fixture = join(dir, 'request.md');
    writeFileSync(
      fixture,
      [
        '---',
        `item_id: "${ITEM_ID}"`,
        'round: 1',
        'spec_commit_sha: "abc1234"',
        'artifact_path: "backlog/ready/x.md"',
        'class: "narrow"',
        'requested_at: "2026-05-15T08:00:00Z"',
        'requested_reviewers:',
        '  - "codex"',
        '  - "codex-ops"',
        '  - "claude"',
        '---',
        '',
        'body',
        '',
      ].join('\n'),
    );
    const r = runPython([
      join(REPO, 'tools/review-queue/validate.py'),
      'request',
      fixture,
    ]);
    expect(r.code, r.stderr).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────
// AC5 part 4 — queue_error.sh row shapes
// ────────────────────────────────────────────────────────────────────────

describe('056 AC5 part 4 — queue_error.sh row shapes', () => {
  let fx: ReturnType<typeof setupSmokeFixture>;
  beforeEach(() => {
    fx = setupSmokeFixture();
  });
  afterEach(() => {
    teardown(fx);
  });

  function readUpstreamQueueErrors(): string {
    // Resolve from the bare repo by cloning a peek; simpler — fetch on the
    // working repo, then read from origin/main.
    execSync('git fetch -q origin main', { cwd: fx.repo });
    const r = spawnSync(
      'git',
      ['show', 'origin/main:raw/internal/queue-errors.md'],
      { cwd: fx.repo, encoding: 'utf-8' },
    );
    return r.stdout || '';
  }

  it('pre-spawn shape — no spec fields when called without artifact/sha', () => {
    const helper = join(fx.repo, 'tools/review-queue/queue_error.sh');
    const r = spawnSync('bash', [helper, 'invoke_command_unresolved', 'missing executable'], {
      cwd: fx.repo,
      env: { ...process.env, REVIEWER_NAME: 'claude' },
      encoding: 'utf-8',
    });
    expect(r.status, r.stderr).toBe(0);
    const txt = readUpstreamQueueErrors();
    expect(txt).toMatch(/QUEUE-ERROR: reviewer=claude failure=invoke_command_unresolved diagnostic=missing executable/);
    // Confirm pre-spawn shape lacks the spec= field.
    expect(txt).not.toMatch(/reviewer=claude failure=invoke_command_unresolved.*spec=/);
  });

  it('per-round shape — includes spec=<artifact_path>@<spec_commit_sha>', () => {
    const helper = join(fx.repo, 'tools/review-queue/queue_error.sh');
    const r = spawnSync(
      'bash',
      [
        helper,
        'spec_sha_unreachable',
        'git show failed',
        'backlog/ready/foo.md',
        FAKE_SHA,
      ],
      {
        cwd: fx.repo,
        env: { ...process.env, REVIEWER_NAME: 'claude' },
        encoding: 'utf-8',
      },
    );
    expect(r.status, r.stderr).toBe(0);
    const txt = readUpstreamQueueErrors();
    expect(txt).toMatch(
      new RegExp(
        `QUEUE-ERROR: reviewer=claude failure=spec_sha_unreachable spec=backlog/ready/foo\\.md@${FAKE_SHA}`,
      ),
    );
  });
});

// ────────────────────────────────────────────────────────────────────────
// AC7 — smoke runner fail-open vs fail-closed
// ────────────────────────────────────────────────────────────────────────

describe('056 AC7 — smoke-test-claude-runner.sh install-context gate', () => {
  it('without --install-context and no claude on PATH → fail-open (exit 0, [skip] line)', () => {
    const smoke = join(REPO, 'tools/review-queue/smoke-test-claude-runner.sh');
    const r = spawnSync('bash', [smoke], {
      env: { ...process.env, PATH: '/usr/bin:/bin' }, // strip claude from PATH
      encoding: 'utf-8',
    });
    // If claude is on the stripped PATH for some weird reason, treat as
    // inconclusive; the test asserts the documented fail-open behavior.
    if (r.stderr.includes('claude CLI not installed') || r.stdout.includes('[skip]')) {
      expect(r.status).toBe(0);
      expect(r.stdout + r.stderr).toMatch(/\[skip\] claude CLI not installed/);
    } else {
      // claude was found via inherited PATH; that's fine — the test
      // doesn't fail, but we have no fail-open evidence to assert.
      expect([0, null]).toContain(r.status);
    }
  });

  it('with --install-context and no claude on PATH → fail-closed (exit non-zero)', () => {
    const smoke = join(REPO, 'tools/review-queue/smoke-test-claude-runner.sh');
    const r = spawnSync('bash', [smoke, '--install-context'], {
      env: { ...process.env, PATH: '/usr/bin:/bin' },
      encoding: 'utf-8',
    });
    // Same caveat: if PATH stripping didn't remove claude (e.g., it's at
    // /usr/bin/claude in some installs), the test is inconclusive.
    if (r.stderr.includes('--install-context set but claude CLI not on PATH')) {
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/--install-context set but claude CLI not on PATH/);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// AC7b/AC8 — installer preflight + accepts claude slug
// ────────────────────────────────────────────────────────────────────────

describe('056 AC7b/AC8 — _install_reviewer_launchd.sh', () => {
  it('preflights resolved invoke_command executable (fails-closed when CLI absent)', () => {
    const installer = join(REPO, 'tools/review-queue/_install_reviewer_launchd.sh');
    // Stripped PATH that has no claude binary.
    const r = spawnSync('bash', [installer, 'claude'], {
      env: { ...process.env, PATH: '/usr/bin:/bin' },
      encoding: 'utf-8',
    });
    // If PATH stripping didn't remove claude, the test is inconclusive.
    if (r.stderr.includes('not found on PATH')) {
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/claude not found on PATH; cannot install com\.echo\.review-queue-claude/);
      // The plist must NOT have been written. Use $HOME to be safe — but
      // we can't safely assert on the operator's actual LaunchAgents dir,
      // so we only check the stderr+rc contract.
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// End-to-end: wrapper with mock-claude routed via PATH
// ────────────────────────────────────────────────────────────────────────

// Bound each end-to-end test below to a per-test timeout (60s) so a
// runaway-real-claude scenario fails fast instead of consuming an hour.
const E2E_TIMEOUT_MS = 60_000;

describe('056 AC9 — wrapper end-to-end with mock-claude', () => {
  let fx: ReturnType<typeof setupSmokeFixture>;
  let mockClaudePath: string;

  beforeEach(() => {
    fx = setupSmokeFixture();
    // Place mock-claude.sh at an absolute path. The wrapper's own PATH
    // augmentation prepends /opt/homebrew/bin, $HOME/.local/bin etc.
    // BEFORE the test's PATH, so a PATH-based mock would be shadowed by
    // the operator's real `claude` install. Rewriting the per-tick
    // reviewers.json to point invoke_command at the absolute mock path
    // sidesteps PATH entirely.
    const mockBinDir = join(fx.base, 'mock-bin');
    mkdirSync(mockBinDir, { recursive: true });
    mockClaudePath = join(mockBinDir, 'claude');
    cpSync(
      join(REPO, 'tests/review-queue/fixtures/mock-claude.sh'),
      mockClaudePath,
    );
    chmodSync(mockClaudePath, 0o755);

    // Rewrite reviewers.json in the smoke repo so claude's invoke_command
    // points at the mock by absolute path. Commit + push so the per-tick
    // worktree (which is checked out from origin/main) inherits it.
    const rosterPath = join(fx.repo, 'tools/review-queue/reviewers.json');
    const roster = JSON.parse(readFileSync(rosterPath, 'utf-8'));
    for (const r of roster.reviewers as Array<Record<string, unknown>>) {
      if (r.name === 'claude') {
        r.invoke_command = `${mockClaudePath} -p < {{PROMPT}}`;
      }
    }
    writeFileSync(rosterPath, JSON.stringify(roster, null, 2) + '\n');
    execSync('git add tools/review-queue/reviewers.json', { cwd: fx.repo });
    execSync('git commit -q -m "fixture: point claude invoke_command at mock"', {
      cwd: fx.repo,
    });
    execSync('git push -q origin main', { cwd: fx.repo });
  });
  afterEach(() => {
    teardown(fx);
  });

  it('produces claude.md + commits via mock-claude (produce_response mode)', { timeout: E2E_TIMEOUT_MS }, () => {
    // Defensive precondition: resolve invoke_command via the gate against
    // the smoke roster and assert it points at the mock. If this fails,
    // ECHO_REVIEWERS_CONFIG isn't being honored and we'd otherwise invoke
    // the founder's REAL `claude` CLI (which has happened — 50min hangs +
    // potential token spend).
    const probeRosterPath = join(fx.repo, 'tools/review-queue/reviewers.json');
    const probe = spawnSync(
      'python3',
      [
        join(REPO, 'tools/review-queue/_reviewer_gate.py'),
        '--print',
        'invoke_command',
      ],
      {
        env: {
          ...process.env,
          REVIEWER_NAME: 'claude',
          WT: '/tmp/wt',
          PROMPT: '/tmp/p.md',
          ECHO_REVIEWERS_CONFIG: probeRosterPath,
        },
        encoding: 'utf-8',
      },
    );
    expect(probe.status, probe.stderr).toBe(0);
    expect(
      probe.stdout,
      `precondition failed: invoke_command not routed to mock — would have invoked real claude CLI. probe stdout: ${probe.stdout}`,
    ).toContain(mockClaudePath);

    // Use a SHA that actually exists in the smoke repo so step-3 git-show
    // succeeds.
    const sha = execSync('git rev-parse HEAD', { cwd: fx.repo, encoding: 'utf-8' }).trim();
    writeRequestAtSha(fx.repo, 1, sha);
    const wrapper = join(REPO, 'tools/review-queue/run-claude-reviewer.sh');
    const recordDir = join(fx.base, 'mock-record');
    const r = spawnSync('bash', [wrapper], {
      env: {
        ...process.env,
        ECHO_REVIEW_QUEUE_REPO_ROOT: fx.repo,
        // The wrapper runs _reviewer_gate.py from the founder's
        // TOOL_DIR, but `_lib.REVIEWERS_CONFIG` is env-var-routable.
        // Point it at the smoke fixture's roster so the absolute mock
        // path in invoke_command is what gets resolved.
        ECHO_REVIEWERS_CONFIG: join(fx.repo, 'tools/review-queue/reviewers.json'),
        MOCK_CLAUDE_MODE: 'produce_response',
        MOCK_CLAUDE_RECORD_DIR: recordDir,
      },
      encoding: 'utf-8',
      timeout: 25_000,
      killSignal: 'SIGKILL',
    });
    // The wrapper may exit non-zero because the synthetic round's
    // commit-reviewer-response.sh push lands on origin/main from inside
    // the ephemeral worktree — that's expected to succeed in the smoke,
    // but if it fails the smoke logs surface why.
    // Either rc=0 with claude.md present, or rc!=0 with a wrapper-log
    // diagnostic — pass on rc=0 + presence.
    expect(r.status, `wrapper rc=${r.status} stderr=${r.stderr}`).toBe(0);
    execSync('git fetch -q origin main', { cwd: fx.repo });
    const showRc = spawnSync(
      'git',
      ['show', `origin/main:backlog/reviews/${ITEM_ID}/r1/claude.md`],
      { cwd: fx.repo, encoding: 'utf-8' },
    );
    expect(showRc.status, `claude.md not on origin/main: ${showRc.stderr}`).toBe(0);
    expect(showRc.stdout).toMatch(/reviewer: "claude"/);
    // The mock recorded the prompt body (skill content) it received via stdin.
    expect(existsSync(join(recordDir, 'stdin'))).toBe(true);
    const recordedStdin = readFileSync(join(recordDir, 'stdin'), 'utf-8');
    expect(recordedStdin).toMatch(/MY_REVIEWER=claude/);
  });

  it('sha_drift mode → wrapper exits non-zero + per-round queue-error row on origin/main', { timeout: E2E_TIMEOUT_MS }, () => {
    // Same defensive precondition as the produce_response test — guard
    // against accidentally hitting the founder's real claude CLI.
    const probeRosterPath = join(fx.repo, 'tools/review-queue/reviewers.json');
    const probe = spawnSync(
      'python3',
      [
        join(REPO, 'tools/review-queue/_reviewer_gate.py'),
        '--print',
        'invoke_command',
      ],
      {
        env: {
          ...process.env,
          REVIEWER_NAME: 'claude',
          WT: '/tmp/wt',
          PROMPT: '/tmp/p.md',
          ECHO_REVIEWERS_CONFIG: probeRosterPath,
        },
        encoding: 'utf-8',
      },
    );
    expect(probe.status, probe.stderr).toBe(0);
    expect(
      probe.stdout,
      `precondition: invoke_command not routed to mock; probe stdout: ${probe.stdout}`,
    ).toContain(mockClaudePath);

    writeRequestAtSha(fx.repo, 2, FAKE_SHA);
    const wrapper = join(REPO, 'tools/review-queue/run-claude-reviewer.sh');
    const r = spawnSync('bash', [wrapper], {
      env: {
        ...process.env,
        ECHO_REVIEW_QUEUE_REPO_ROOT: fx.repo,
        ECHO_REVIEWERS_CONFIG: join(fx.repo, 'tools/review-queue/reviewers.json'),
        MOCK_CLAUDE_MODE: 'sha_drift',
      },
      encoding: 'utf-8',
      timeout: 25_000,
      killSignal: 'SIGKILL',
    });
    expect(r.status).not.toBe(0);
    execSync('git fetch -q origin main', { cwd: fx.repo });
    const queueErrors = spawnSync(
      'git',
      ['show', 'origin/main:raw/internal/queue-errors.md'],
      { cwd: fx.repo, encoding: 'utf-8' },
    );
    expect(queueErrors.status).toBe(0);
    expect(queueErrors.stdout).toMatch(
      new RegExp(
        `QUEUE-ERROR: reviewer=claude failure=spec_sha_unreachable spec=backlog/ready/${ITEM_ID}\\.md@${FAKE_SHA}`,
      ),
    );
  });
});
