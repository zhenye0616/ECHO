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

interface Fixture {
  base: string;
  bare: string;
  repo: string;
  tmp: string;
  mockBin: string;
  recordDir: string;
  specSha: string;
}

function git(args: string, cwd: string): string {
  return execSync(`git ${args}`, { cwd, encoding: 'utf-8' }).trim();
}

function writeMockCodex(path: string) {
  writeFileSync(
    path,
    `#!/usr/bin/env bash
set -euo pipefail
mkdir -p "\${MOCK_CODEX_RECORD_DIR:?}"
{
  printf 'argv:'
  printf ' %s' "$@"
  printf '\\n'
} >> "$MOCK_CODEX_RECORD_DIR/invocations"
cat > "$MOCK_CODEX_RECORD_DIR/stdin-$MOCK_CODEX_MODE"
python3 - <<'PY'
import json
import os
from datetime import datetime, timezone

mode = os.environ.get("MOCK_CODEX_MODE", "valid")
item = os.environ["MOCK_CODEX_ITEM_ID"]
sha = os.environ["MOCK_CODEX_ARTIFACT_SHA"]
now = datetime.now(timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")

print(json.dumps({"type": "session_started", "text": "noise with --- prompt-looking text"}))
if mode == "valid":
    body = f"""---
item_id: "{item}"
round: 1
reviewer: "codex"
artifact_sha: "{sha}"
completed_at: '{now}'
verdict: "proceed"
findings: []
---

Mock codex review from final assistant message.
"""
elif mode == "invalid_final":
    body = "not reviewer markdown"
else:
    raise SystemExit(f"unknown MOCK_CODEX_MODE={mode}")
print(json.dumps({"type": "assistant_message", "message": body}))
PY
`,
    { mode: 0o755 },
  );
  chmodSync(path, 0o755);
}

function setupFixture(): Fixture {
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
  mkdirSync(join(repo, 'backlog/reviews', ITEM_ID, 'r1'), { recursive: true });
  cpSync(join(REPO, 'tools/review-queue'), join(repo, 'tools/review-queue'), {
    recursive: true,
  });
  rmSync(join(repo, 'tools/review-queue/__pycache__'), { recursive: true, force: true });
  cpSync(
    join(REPO, '.claude/commands/review-queue-codex.md'),
    join(repo, '.claude/commands/review-queue-codex.md'),
  );
  chmodSync(join(repo, 'tools/review-queue/run-codex-reviewer.sh'), 0o755);
  chmodSync(join(repo, 'tools/review-queue/_run_reviewer.sh'), 0o755);
  chmodSync(join(repo, 'tools/review-queue/commit-reviewer-response.sh'), 0o755);
  chmodSync(join(repo, 'tools/review-queue/push-with-retry.sh'), 0o755);

  const mockCodex = join(mockBin, 'codex');
  writeMockCodex(mockCodex);
  const bindingsPath = join(repo, 'tools/review-queue/reviewer-bindings.json');
  const bindings = JSON.parse(readFileSync(bindingsPath, 'utf-8'));
  for (const entry of bindings.bindings as Array<{ reviewer: string; argv?: string[] }>) {
    if (entry.reviewer === 'codex' && entry.argv) {
      entry.argv[0] = mockCodex;
    }
  }
  writeFileSync(bindingsPath, JSON.stringify(bindings, null, 2) + '\n');

  writeFileSync(
    join(repo, `backlog/ready/${ITEM_ID}.md`),
    `---\nid: ${ITEM_ID}\nstatus: ready\n---\n\nSynthetic reviewed artifact.\n`,
  );
  git('add -A', repo);
  git('commit -q -m "bootstrap fixture"', repo);
  git('push -q -u origin main', repo);
  const specSha = git('rev-parse HEAD', repo);

  writeFileSync(
    join(repo, 'backlog/reviews', ITEM_ID, 'r1', 'request.md'),
    [
      '---',
      `item_id: "${ITEM_ID}"`,
      'round: 1',
      `spec_commit_sha: "${specSha}"`,
      `artifact_path: "backlog/ready/${ITEM_ID}.md"`,
      'class: "narrow"',
      'requested_at: "2026-06-03T20:00:00Z"',
      'requested_reviewers:',
      '  - "codex"',
      `correlation_id: "${CORRELATION_ID}"`,
      '---',
      '',
      'Review this synthetic artifact.',
      '',
    ].join('\n'),
  );
  git('add backlog/reviews', repo);
  git('commit -q -m "fixture request"', repo);
  git('push -q origin main', repo);

  return { base, bare, repo, tmp, mockBin, recordDir, specSha };
}

function teardown(fx: Fixture) {
  rmSync(fx.base, { recursive: true, force: true });
}

function runWrapper(fx: Fixture, mode: 'valid' | 'invalid_final') {
  return spawnSync(join(fx.repo, 'tools/review-queue/run-codex-reviewer.sh'), [], {
    cwd: fx.repo,
    env: {
      ...process.env,
      ECHO_REVIEW_QUEUE_REPO_ROOT: fx.repo,
      ECHO_MCP_URL: 'http://127.0.0.1:1/mcp',
      TMPDIR: fx.tmp,
      PATH: `${fx.mockBin}:${process.env.PATH}`,
      MOCK_CODEX_MODE: mode,
      MOCK_CODEX_RECORD_DIR: fx.recordDir,
      MOCK_CODEX_ITEM_ID: ITEM_ID,
      MOCK_CODEX_ARTIFACT_SHA: fx.specSha.slice(0, 7),
    },
    encoding: 'utf-8',
    timeout: 60_000,
  });
}

function showOrigin(fx: Fixture, path: string): string {
  git('fetch -q origin main', fx.repo);
  return execSync(`git show origin/main:${path}`, { cwd: fx.repo, encoding: 'utf-8' });
}

describe('087b reviewer read-only wrapper publisher', () => {
  const fixtures: Fixture[] = [];
  afterEach(() => {
    while (fixtures.length) teardown(fixtures.pop()!);
  });

  it('publishes codex.md from the parsed final assistant JSON event, not raw stdout noise', () => {
    const fx = setupFixture();
    fixtures.push(fx);

    const r = runWrapper(fx, 'valid');
    expect(r.status, `stdout=${r.stdout}\nstderr=${r.stderr}`).toBe(0);

    const response = showOrigin(fx, `backlog/reviews/${ITEM_ID}/r1/codex.md`);
    expect(response).toContain('reviewer: "codex"');
    expect(response).toContain('Mock codex review from final assistant message.');
    expect(response).not.toContain('session_started');
    expect(response).not.toContain('prompt-looking text');

    const invocations = readFileSync(join(fx.recordDir, 'invocations'), 'utf-8');
    expect(invocations).toContain('--sandbox read-only');
    expect(invocations).toContain('--json');
    expect(invocations).not.toContain('danger-full-access');
  });

  it('commits a capture-failed marker and skips the round on the next origin-backed scan', () => {
    const fx = setupFixture();
    fixtures.push(fx);

    const first = runWrapper(fx, 'invalid_final');
    expect(first.status, `stdout=${first.stdout}\nstderr=${first.stderr}`).not.toBe(0);

    const marker = showOrigin(fx, `backlog/reviews/${ITEM_ID}/r1/codex.capture-failed`);
    expect(marker).toContain('failure_class: "schema_invalid"');
    const errors = showOrigin(fx, 'raw/internal/queue-errors.md');
    expect(errors).toContain('CAPTURE-FAIL: reviewer=codex failure=schema_invalid');
    expect(errors).toContain('diagnostic=');

    const before = readFileSync(join(fx.recordDir, 'invocations'), 'utf-8');
    const second = runWrapper(fx, 'valid');
    expect(second.status, `stdout=${second.stdout}\nstderr=${second.stderr}`).toBe(0);
    const after = readFileSync(join(fx.recordDir, 'invocations'), 'utf-8');
    expect(after).toBe(before);
    expect(existsSync(join(fx.repo, `backlog/reviews/${ITEM_ID}/r1/codex.md`))).toBe(false);
  });
});
