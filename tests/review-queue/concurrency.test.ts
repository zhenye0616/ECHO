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
import { combineScript, requestScript, runPython } from './_helpers.js';

const ITEM_ID = '2026-05-12-041-concurrency-spec';
const SHA = 'abc1234';
const SHA_B = 'deadbee';

function setupRepo(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-conc-')));
  mkdirSync(join(root, 'backlog/ready'), { recursive: true });
  writeFileSync(join(root, 'backlog/ready', `${ITEM_ID}.md`), `---\nid: ${ITEM_ID}\n---\nbody\n`);
  return root;
}

function runRequest(root: string, extra: string[] = []): { code: number; stderr: string } {
  const r = runPython([
    requestScript(),
    ITEM_ID,
    '1',
    `--repo-root=${root}`,
    `--spec-sha=${SHA}`,
    ...extra,
  ]);
  return { code: r.code, stderr: r.stderr };
}

describe('review-queue concurrency + timeout', () => {
  let root: string;
  beforeEach(() => {
    root = setupRepo();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('two request.py invocations same SHA: both succeed (idempotent)', () => {
    expect(runRequest(root).code, 'first').toBe(0);
    expect(runRequest(root).code, 'second').toBe(0);
  });

  it('two request.py invocations, different SHA: second fails with clear error', () => {
    expect(runRequest(root).code, 'first').toBe(0);
    const second = runPython([
      requestScript(),
      ITEM_ID,
      '1',
      `--repo-root=${root}`,
      `--spec-sha=${SHA_B}`,
    ]);
    expect(second.code).not.toBe(0);
    expect(second.stderr).toMatch(/different SHA/);
  });

  it('two reviewer.md atomic-link writes to same path: only one wins', () => {
    // Simulate via two os.link writers to the same final path
    const dir = join(root, 'race');
    mkdirSync(dir);
    const final = join(dir, 'codex.md');
    const tmpA = join(dir, 'codex.md.aaa.tmp');
    const tmpB = join(dir, 'codex.md.bbb.tmp');
    writeFileSync(tmpA, 'A wins\n');
    writeFileSync(tmpB, 'B wins\n');
    const r = runPython([
      '-c',
      `import os, sys;
` +
        `final = sys.argv[1]; a = sys.argv[2]; b = sys.argv[3];
` +
        `os.link(a, final);
` +
        `try:
    os.link(b, final);
    print('B-WON-UNEXPECTED');
except FileExistsError:
    print('B-LOST');
`,
      final,
      tmpA,
      tmpB,
    ]);
    expect(r.stdout.trim()).toBe('B-LOST');
    expect(readFileSync(final, 'utf-8')).toBe('A wins\n');
  });

  it('orphan .tmp.* older than 30 min is cleaned up by combine.py', () => {
    const dir = join(root, 'backlog/reviews', ITEM_ID, 'r1');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'request.md'),
      [
        '---',
        `item_id: "${ITEM_ID}"`,
        'round: 1',
        `spec_commit_sha: "${SHA}"`,
        `artifact_path: "backlog/ready/${ITEM_ID}.md"`,
        'class: "narrow"',
        'requested_at: "2026-05-12T08:00:00Z"',
        'requested_reviewers:',
        '  - "codex"',
        '  - "cursor"',
        '---',
        '',
        'body',
        '',
      ].join('\n'),
    );
    const stale = join(dir, 'codex.md.deadbeef.tmp');
    writeFileSync(stale, 'orphan');
    // Set mtime 31 min in the past
    const past = Date.now() / 1000 - 31 * 60;
    execSync(`touch -t $(date -r ${Math.floor(past)} +%Y%m%d%H%M.%S) "${stale}"`);
    // Reviewers both still missing — single_reviewer_timeout or no_responses
    const r = runPython([
      combineScript(),
      `--repo-root=${root}`,
      '--no-git',
      '--all',
      '--now=2026-05-12T11:00:00Z',
    ]);
    expect(r.code, r.stderr).toBe(0);
    expect(existsSync(stale)).toBe(false);
  });

  it('push-with-retry.sh exits non-zero and appends to queue-errors.md when push fails', () => {
    // Use a tmp git repo with no remote → both push attempts fail.
    const repo = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-push-')));
    mkdirSync(join(repo, 'raw/internal'), { recursive: true });
    execSync('git init -q', { cwd: repo });
    execSync('git config user.email "test@example.com"', { cwd: repo });
    execSync('git config user.name "test"', { cwd: repo });
    execSync('git commit --allow-empty -q -m bootstrap', { cwd: repo });
    const helperSrc = readFileSync(
      join(process.cwd(), 'tools/review-queue/push-with-retry.sh'),
      'utf-8',
    );
    mkdirSync(join(repo, 'tools/review-queue'), { recursive: true });
    writeFileSync(join(repo, 'tools/review-queue/push-with-retry.sh'), helperSrc, { mode: 0o755 });
    const r = spawnSync(
      'bash',
      ['tools/review-queue/push-with-retry.sh', 'review-r1: codex on test'],
      {
        cwd: repo,
        encoding: 'utf-8',
      },
    );
    expect(r.status).not.toBe(0);
    const log = readFileSync(join(repo, 'raw/internal/queue-errors.md'), 'utf-8');
    expect(log).toMatch(/PUSH-RACE-FALLBACK/);
    expect(log).toMatch(/review-r1: codex on test/);
    rmSync(repo, { recursive: true, force: true });
  });

  it('missing-reviewer timeout: partial_responses + auto-disposition (044 AC4 — single-missing-proceed)', () => {
    const dir = join(root, 'backlog/reviews', ITEM_ID, 'r1');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'request.md'),
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
      join(dir, 'codex.md'),
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
    const r = runPython([
      combineScript(),
      `--repo-root=${root}`,
      '--no-git',
      '--all',
      '--now=2026-05-12T08:00:00Z',
    ]);
    expect(r.code).toBe(0);
    const combined = readFileSync(join(dir, 'combined.md'), 'utf-8');
    expect(combined).toMatch(/combined_verdict: partial_responses/);
    // 044 AC4: single-missing AND present-proceed → escalated_to_founder false
    expect(combined).toMatch(/escalated_to_founder: false/);
  });

  it('same-SHA idempotency is checked by reading the existing file, not by treating FileExistsError as success', () => {
    // First write, then poke the existing file to a different SHA, then re-run request.py with
    // the original SHA — it must STILL exit 0 (the file's SHA matches the original we re-passed).
    expect(runRequest(root).code, 'first').toBe(0);
    const reqPath = join(root, 'backlog/reviews', ITEM_ID, 'r1/request.md');
    const text = readFileSync(reqPath, 'utf-8');
    const tampered = text.replace(`spec_commit_sha: ${SHA}`, `spec_commit_sha: ${SHA_B}`);
    writeFileSync(reqPath, tampered);
    // Re-running with original SHA must NOW fail (existing != original)
    const second = runRequest(root);
    expect(second.code).not.toBe(0);
    expect(second.stderr).toMatch(/different SHA/);
  });
});
