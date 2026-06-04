import { spawnSync, execSync } from 'node:child_process';
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
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { REPO } from './_helpers.js';

const ITEM_ID = '2026-06-03-999-readonly-wrapper';
const CORRELATION_ID = '11111111-1111-4111-8111-111111111111';

type Reviewer = 'codex' | 'codex-ops';
type MockMode =
  | 'valid'
  | 'invalid_final'
  | 'rc_nonzero'
  | 'empty_stdout'
  | 'write_denied'
  | 'wrong_binding';
type RequestState = 'selected' | 'none' | 'stale_combined' | 'bind_failed';

interface Fixture {
  base: string;
  bare: string;
  repo: string;
  tmp: string;
  mockBin: string;
  recordDir: string;
  reviewer: Reviewer;
  requestRel: string;
  specSha: string;
}

function git(args: string, cwd: string): string {
  return execSync(`git ${args}`, { cwd, encoding: 'utf-8' }).trim();
}

function writeExecutable(path: string, body: string) {
  writeFileSync(path, body, { mode: 0o755 });
  chmodSync(path, 0o755);
}

function writeMockCodex(path: string) {
  writeExecutable(
    path,
    `#!/usr/bin/env bash
set -euo pipefail
mkdir -p "\${MOCK_CODEX_RECORD_DIR:?}"
{
  printf 'argv:'
  printf ' %s' "$@"
  printf '\\n'
} >> "$MOCK_CODEX_RECORD_DIR/invocations"
cat > "$MOCK_CODEX_RECORD_DIR/stdin-$MOCK_CODEX_REVIEWER-$MOCK_CODEX_MODE"

case "\${MOCK_CODEX_MODE:-valid}" in
  rc_nonzero)
    echo "child crashed before final message" >&2
    exit 7
    ;;
  write_denied)
    echo "Operation not permitted: read-only sandbox denied child write" >&2
    exit 1
    ;;
  empty_stdout)
    exit 0
    ;;
esac

python3 - <<'PY'
import json
import os
from datetime import datetime, timezone

mode = os.environ.get("MOCK_CODEX_MODE", "valid")
item = os.environ["MOCK_CODEX_ITEM_ID"]
sha = os.environ["MOCK_CODEX_ARTIFACT_SHA"]
reviewer = os.environ["MOCK_CODEX_REVIEWER"]
now = datetime.now(timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")

print(json.dumps({"type": "session_started", "text": "noise with --- prompt-looking text"}))
if mode == "valid":
    body = f"""---
item_id: "{item}"
round: 1
reviewer: "{reviewer}"
artifact_sha: "{sha}"
completed_at: '{now}'
verdict: "proceed"
findings: []
---

Mock {reviewer} review from final assistant message.
"""
elif mode == "invalid_final":
    body = "not reviewer markdown"
elif mode == "wrong_binding":
    body = f"""---
item_id: "{item}-other"
round: 1
reviewer: "{reviewer}"
artifact_sha: "{sha}"
completed_at: '{now}'
verdict: "proceed"
findings: []
---

Schema-valid response bound to the wrong request.
"""
else:
    raise SystemExit(f"unknown MOCK_CODEX_MODE={mode}")
print(json.dumps({"type": "assistant_message", "message": body}))
PY
`,
  );
}

function writeRequest(repo: string, reviewer: Reviewer, specSha: string, state: RequestState) {
  if (state === 'none') return;
  const roundDir = join(repo, 'backlog/reviews', ITEM_ID, 'r1');
  mkdirSync(roundDir, { recursive: true });
  const requested = state === 'bind_failed' ? otherReviewer(reviewer) : reviewer;
  writeFileSync(
    join(roundDir, 'request.md'),
    [
      '---',
      `item_id: "${ITEM_ID}"`,
      'round: 1',
      `spec_commit_sha: "${specSha}"`,
      `artifact_path: "backlog/ready/${ITEM_ID}.md"`,
      'class: "narrow"',
      'requested_at: "2026-06-03T20:00:00Z"',
      'requested_reviewers:',
      `  - "${requested}"`,
      `correlation_id: "${CORRELATION_ID}"`,
      '---',
      '',
      'Review this synthetic artifact.',
      '',
    ].join('\n'),
  );
  if (state === 'stale_combined') {
    writeFileSync(join(roundDir, 'combined.md'), '---\ncombined_verdict: "proceed"\n---\n');
  }
}

function otherReviewer(reviewer: Reviewer): Reviewer {
  return reviewer === 'codex' ? 'codex-ops' : 'codex';
}

function setupFixture(opts: { reviewer?: Reviewer; requestState?: RequestState } = {}): Fixture {
  const reviewer = opts.reviewer ?? 'codex';
  const requestState = opts.requestState ?? 'selected';
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-087b-')));
  const bare = join(base, 'remote.git');
  const repo = join(base, 'repo');
  const tmp = join(base, 'tmp');
  const mockBin = join(base, 'mock-bin');
  const recordDir = join(base, 'records');
  mkdirSync(tmp, { recursive: true });
  mkdirSync(mockBin, { recursive: true });
  mkdirSync(recordDir, { recursive: true });
  execSync(`git init --bare -q -b main "${bare}"`);
  execSync(`git init -q -b main "${repo}"`);
  for (const c of [
    'config user.email test@example.com',
    'config user.name test',
    'config commit.gpgsign false',
    `remote add origin "${bare}"`,
  ]) {
    git(c, repo);
  }

  mkdirSync(join(repo, 'tools/review-queue'), { recursive: true });
  mkdirSync(join(repo, '.claude/commands'), { recursive: true });
  mkdirSync(join(repo, 'backlog/ready'), { recursive: true });
  cpSync(join(REPO, 'tools/review-queue'), join(repo, 'tools/review-queue'), {
    recursive: true,
  });
  rmSync(join(repo, 'tools/review-queue/__pycache__'), { recursive: true, force: true });
  for (const slug of ['codex', 'codex-ops']) {
    cpSync(
      join(REPO, `.claude/commands/review-queue-${slug}.md`),
      join(repo, `.claude/commands/review-queue-${slug}.md`),
    );
    chmodSync(join(repo, `tools/review-queue/run-${slug}-reviewer.sh`), 0o755);
  }
  for (const rel of ['_run_reviewer.sh', 'commit-reviewer-response.sh', 'push-with-retry.sh']) {
    chmodSync(join(repo, 'tools/review-queue', rel), 0o755);
  }

  const mockCodex = join(mockBin, 'codex');
  writeMockCodex(mockCodex);
  const bindingsPath = join(repo, 'tools/review-queue/reviewer-bindings.json');
  const bindings = JSON.parse(readFileSync(bindingsPath, 'utf-8'));
  for (const entry of bindings.bindings as Array<{ reviewer: string; argv?: string[] }>) {
    if ((entry.reviewer === 'codex' || entry.reviewer === 'codex-ops') && entry.argv) {
      entry.argv[0] = mockCodex;
    }
  }
  writeFileSync(bindingsPath, JSON.stringify(bindings, null, 2) + '\n');

  writeExecutable(
    join(repo, 'tools/review-queue/coord-emit.sh'),
    `#!/usr/bin/env bash
set -euo pipefail
mkdir -p "\${MOCK_COORD_RECORD_DIR:?}"
printf '%s\\n' "$*" >> "$MOCK_COORD_RECORD_DIR/coord-events"
`,
  );

  const pushPath = join(repo, 'tools/review-queue/push-with-retry.sh');
  const pushRealPath = join(repo, 'tools/review-queue/push-with-retry.real.sh');
  cpSync(pushPath, pushRealPath);
  chmodSync(pushRealPath, 0o755);
  writeExecutable(
    pushPath,
    `#!/usr/bin/env bash
set -euo pipefail
if [ "\${MOCK_PUSH_FAIL_ON_CAPTURE:-0}" = "1" ] && [[ "\${1:-}" == capture-failed:* ]]; then
  echo "mock push failure for $1" >&2
  exit 42
fi
exec "$(dirname "$0")/push-with-retry.real.sh" "$@"
`,
  );

  writeFileSync(
    join(repo, `backlog/ready/${ITEM_ID}.md`),
    `---\nid: ${ITEM_ID}\nstatus: ready\n---\n\nSynthetic reviewed artifact.\n`,
  );
  git('add -A', repo);
  git('commit -q -m "bootstrap fixture"', repo);
  git('push -q -u origin main', repo);
  const specSha = git('rev-parse HEAD', repo);

  writeRequest(repo, reviewer, specSha, requestState);
  if (requestState !== 'none') {
    git('add backlog/reviews', repo);
    git('commit -q -m "fixture request"', repo);
    git('push -q origin main', repo);
  }

  return {
    base,
    bare,
    repo,
    tmp,
    mockBin,
    recordDir,
    reviewer,
    requestRel: `backlog/reviews/${ITEM_ID}/r1/request.md`,
    specSha,
  };
}

function teardown(fx: Fixture) {
  rmSync(fx.base, { recursive: true, force: true });
}

function runWrapper(fx: Fixture, mode: MockMode, extraEnv: Record<string, string> = {}) {
  return spawnSync(join(fx.repo, `tools/review-queue/run-${fx.reviewer}-reviewer.sh`), [], {
    cwd: fx.repo,
    env: {
      ...process.env,
      ECHO_REVIEW_QUEUE_REPO_ROOT: fx.repo,
      ECHO_MCP_URL: 'http://127.0.0.1:1/mcp',
      TMPDIR: fx.tmp,
      PATH: `${fx.mockBin}:${process.env.PATH}`,
      MOCK_CODEX_MODE: mode,
      MOCK_CODEX_RECORD_DIR: fx.recordDir,
      MOCK_CODEX_REVIEWER: fx.reviewer,
      MOCK_CODEX_ITEM_ID: ITEM_ID,
      MOCK_CODEX_ARTIFACT_SHA: fx.specSha,
      MOCK_COORD_RECORD_DIR: fx.recordDir,
      ...extraEnv,
    },
    encoding: 'utf-8',
    timeout: 60_000,
  });
}

function showOrigin(fx: Fixture, path: string): string {
  git('fetch -q origin main', fx.repo);
  return execSync(`git show origin/main:${path}`, { cwd: fx.repo, encoding: 'utf-8' });
}

function originHas(fx: Fixture, path: string): boolean {
  git('fetch -q origin main', fx.repo);
  const r = spawnSync('git', ['cat-file', '-e', `origin/main:${path}`], {
    cwd: fx.repo,
    encoding: 'utf-8',
  });
  return r.status === 0;
}

function readRecord(fx: Fixture, name: string): string {
  const path = join(fx.recordDir, name);
  return existsSync(path) ? readFileSync(path, 'utf-8') : '';
}

function expectNoChildSpawn(fx: Fixture) {
  expect(readRecord(fx, 'invocations')).toBe('');
}

function parseNulDelimited(stdout: Buffer): string[] {
  return stdout.toString('utf-8').split('\0').filter(Boolean);
}

describe('087b reviewer read-only wrapper publisher', () => {
  const fixtures: Fixture[] = [];
  afterEach(() => {
    while (fixtures.length) teardown(fixtures.pop()!);
  });

  it.each<Reviewer>(['codex', 'codex-ops'])(
    'publishes %s.md from the parsed final assistant JSON event, not raw stdout noise',
    (reviewer) => {
      const fx = setupFixture({ reviewer });
      fixtures.push(fx);

      const r = runWrapper(fx, 'valid');
      expect(r.status, `stdout=${r.stdout}\nstderr=${r.stderr}`).toBe(0);

      const response = showOrigin(fx, `backlog/reviews/${ITEM_ID}/r1/${reviewer}.md`);
      expect(response).toContain(`reviewer: "${reviewer}"`);
      expect(response).toContain(`artifact_sha: "${fx.specSha}"`);
      expect(response).toContain(`Mock ${reviewer} review from final assistant message.`);
      expect(response).not.toContain('session_started');
      expect(response).not.toContain('prompt-looking text');

      const invocations = readRecord(fx, 'invocations');
      expect(invocations).toContain('--sandbox read-only');
      expect(invocations).toContain('--json');
      expect(invocations).not.toContain('danger-full-access');
      expect(readRecord(fx, 'coord-events')).toContain('--payload={"outcome":"completed"}');
    },
  );

  it.each<[MockMode, string, string]>([
    ['rc_nonzero', 'rc_nonzero', 'child crashed before final message'],
    ['empty_stdout', 'empty_stdout', 'child stdout was empty'],
    ['write_denied', 'rc_nonzero', 'Operation not permitted'],
    ['invalid_final', 'schema_invalid', 'no frontmatter block found'],
  ])('turns %s capture into a durable terminal marker with diagnostics', (mode, failure, diagnostic) => {
    const fx = setupFixture();
    fixtures.push(fx);

    const r = runWrapper(fx, mode);
    expect(r.status, `stdout=${r.stdout}\nstderr=${r.stderr}`).not.toBe(0);

    const marker = showOrigin(fx, `backlog/reviews/${ITEM_ID}/r1/codex.capture-failed`);
    expect(marker).toContain(`failure_class: "${failure}"`);
    expect(marker).toContain('rc:');
    const errors = showOrigin(fx, 'raw/internal/queue-errors.md');
    expect(errors).toContain(`CAPTURE-FAIL: reviewer=codex failure=${failure}`);
    expect(errors).toContain(diagnostic);
    expect(readRecord(fx, 'coord-events')).toContain(
      '--payload={"outcome":"terminal_capture_failure"}',
    );
  });

  it('skips a failed capture round on the next fresh origin-backed scan', () => {
    const fx = setupFixture();
    fixtures.push(fx);

    const first = runWrapper(fx, 'invalid_final');
    expect(first.status, `stdout=${first.stdout}\nstderr=${first.stderr}`).not.toBe(0);
    expect(originHas(fx, `backlog/reviews/${ITEM_ID}/r1/codex.capture-failed`)).toBe(true);

    const before = readRecord(fx, 'invocations');
    const second = runWrapper(fx, 'valid');
    expect(second.status, `stdout=${second.stdout}\nstderr=${second.stderr}`).toBe(0);
    expect(readRecord(fx, 'invocations')).toBe(before);
    expect(originHas(fx, `backlog/reviews/${ITEM_ID}/r1/codex.md`)).toBe(false);
  });

  it('closes the coord lifecycle and does not reselect after capture-failure marker push fails', () => {
    const fx = setupFixture();
    fixtures.push(fx);

    const r = runWrapper(fx, 'invalid_final', { MOCK_PUSH_FAIL_ON_CAPTURE: '1' });
    expect(r.status, `stdout=${r.stdout}\nstderr=${r.stderr}`).toBe(42);
    expect(originHas(fx, `backlog/reviews/${ITEM_ID}/r1/codex.capture-failed`)).toBe(false);
    const before = readRecord(fx, 'invocations');

    const second = runWrapper(fx, 'valid');
    expect(second.status, `stdout=${second.stdout}\nstderr=${second.stderr}`).toBe(0);
    expect(readRecord(fx, 'invocations')).toBe(before);
    expect(originHas(fx, `backlog/reviews/${ITEM_ID}/r1/codex.md`)).toBe(false);

    const events = readRecord(fx, 'coord-events');
    expect(events).toContain('tick_start');
    expect(events).toContain('--payload={"outcome":"terminal_capture_failure"}');
  });

  it('rejects a schema-valid response that is bound to the wrong selected request', () => {
    const fx = setupFixture();
    fixtures.push(fx);

    const r = runWrapper(fx, 'wrong_binding');
    expect(r.status, `stdout=${r.stdout}\nstderr=${r.stderr}`).not.toBe(0);
    expect(originHas(fx, `backlog/reviews/${ITEM_ID}/r1/codex.md`)).toBe(false);
    const marker = showOrigin(fx, `backlog/reviews/${ITEM_ID}/r1/codex.capture-failed`);
    expect(marker).toContain('failure_class: "request_binding_mismatch"');
    const errors = showOrigin(fx, 'raw/internal/queue-errors.md');
    expect(errors).toContain('request binding mismatch');
    expect(readRecord(fx, 'coord-events')).toContain(
      '--payload={"outcome":"terminal_capture_failure"}',
    );
  });

  it('classifies no-candidate before spawning the child', () => {
    const fx = setupFixture({ requestState: 'none' });
    fixtures.push(fx);

    const r = runWrapper(fx, 'valid');
    expect(r.status, `stdout=${r.stdout}\nstderr=${r.stderr}`).toBe(0);
    expectNoChildSpawn(fx);
  });

  it('classifies stale_combined before spawning the child with the selected correlation id', () => {
    const fx = setupFixture({ requestState: 'stale_combined' });
    fixtures.push(fx);

    const r = runWrapper(fx, 'valid', {
      ECHO_COORD_REQUEST_PATH: fx.requestRel,
      ECHO_COORD_CORRELATION_ID: CORRELATION_ID,
    });
    expect(r.status, `stdout=${r.stdout}\nstderr=${r.stderr}`).toBe(0);
    expectNoChildSpawn(fx);
    const events = readRecord(fx, 'coord-events');
    expect(events).toContain(`--correlation-id=${CORRELATION_ID}`);
    expect(events).toContain('--payload={"outcome":"stale_combined"}');
  });

  it('classifies bind_failed before spawning the child with the selected correlation id', () => {
    const fx = setupFixture({ requestState: 'bind_failed' });
    fixtures.push(fx);

    const r = runWrapper(fx, 'valid', {
      ECHO_COORD_REQUEST_PATH: fx.requestRel,
      ECHO_COORD_CORRELATION_ID: CORRELATION_ID,
    });
    expect(r.status, `stdout=${r.stdout}\nstderr=${r.stderr}`).toBe(1);
    expectNoChildSpawn(fx);
    const events = readRecord(fx, 'coord-events');
    expect(events).toContain(`--correlation-id=${CORRELATION_ID}`);
    expect(events).toContain('--payload={"outcome":"bind_failed"}');
  });

  it('legacy ECHO_REVIEWERS_CONFIG cannot synthesize full-access codex bindings', () => {
    const base = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-087b-legacy-')));
    fixtures.push({
      base,
      bare: '',
      repo: '',
      tmp: '',
      mockBin: '',
      recordDir: '',
      reviewer: 'codex',
      requestRel: '',
      specSha: '',
    });
    const legacyPath = join(base, 'reviewers.json');
    writeFileSync(
      legacyPath,
      JSON.stringify(
        {
          reviewers: [
            {
              name: 'codex',
              mode: 'headless',
              required: true,
              timeout_hours: null,
              slash_command: 'review-queue-codex',
              invoke_command: 'codex exec -C {{WT}} --sandbox danger-full-access - < {{PROMPT}}',
            },
            {
              name: 'codex-ops',
              mode: 'headless',
              required: true,
              timeout_hours: null,
              slash_command: 'review-queue-codex-ops',
              invoke_command: 'codex exec -C {{WT}} --sandbox danger-full-access - < {{PROMPT}}',
            },
          ],
        },
        null,
        2,
      ),
    );

    for (const reviewer of ['codex', 'codex-ops'] as const) {
      const argv = spawnSync(
        'python3',
        [join(REPO, 'tools/review-queue/_reviewer_gate.py'), '--print', 'argv_nul'],
        {
          cwd: REPO,
          env: {
            ...process.env,
            REVIEWER_NAME: reviewer,
            WT: '/tmp/wt',
            ECHO_REVIEWERS_CONFIG: legacyPath,
          },
        },
      );
      expect(argv.status, argv.stderr.toString()).toBe(0);
      const resolved = parseNulDelimited(argv.stdout as Buffer);
      expect(resolved).toContain('--sandbox');
      expect(resolved).toContain('read-only');
      expect(resolved).not.toContain('danger-full-access');

      const policy = spawnSync(
        'python3',
        [join(REPO, 'tools/review-queue/_reviewer_gate.py'), '--print', 'commit_policy'],
        {
          cwd: REPO,
          env: {
            ...process.env,
            REVIEWER_NAME: reviewer,
            WT: '/tmp/wt',
            ECHO_REVIEWERS_CONFIG: legacyPath,
          },
          encoding: 'utf-8',
        },
      );
      expect(policy.status, policy.stderr).toBe(0);
      expect(policy.stdout.trim()).toBe('wrapper');
    }
  });
});
