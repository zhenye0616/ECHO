import { execFileSync } from 'node:child_process';
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
import { runPython } from './_helpers.js';

const ITEM_ID = '2026-06-03-088-proposed-stage-pipeline';
const PROMOTE = join(process.cwd(), 'tools/review-queue/promote.py');

function git(root: string, args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf-8' }).trim();
}

function setupRepo(withOrigin = false): { root: string; origin?: string } {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'echo-promote-')));
  git(root, ['init', '-b', 'main']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'ECHO Test']);
  mkdirSync(join(root, 'backlog/proposed'), { recursive: true });
  mkdirSync(join(root, 'backlog/ready'), { recursive: true });
  mkdirSync(join(root, 'backlog/reviews', ITEM_ID, 'r1'), { recursive: true });
  mkdirSync(join(root, 'raw/internal'), { recursive: true });
  writeProposed(root, '- original');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'seed proposed spec']);
  const origin = withOrigin ? `${root}-origin.git` : undefined;
  if (origin) {
    git(root, ['init', '--bare', origin]);
    git(root, ['remote', 'add', 'origin', origin]);
    git(root, ['push', '-u', 'origin', 'main']);
  }
  return { root, origin };
}

function writeProposed(root: string, bodyLine: string): void {
  writeFileSync(
    join(root, 'backlog/proposed', `${ITEM_ID}.md`),
    [
      '---',
      `id: ${ITEM_ID}`,
      'title: Proposed stage pipeline',
      'priority: HIGH',
      'created: 2026-06-03',
      'blocked_by: []',
      'requested_reviewers: ["codex","codex-ops"]',
      '---',
      '',
      '# Spec',
      '',
      bodyLine,
      '',
    ].join('\n'),
  );
}

function writeRequest(root: string, sha: string): void {
  writeFileSync(
    join(root, 'backlog/reviews', ITEM_ID, 'r1/request.md'),
    [
      '---',
      `item_id: ${ITEM_ID}`,
      'round: 1',
      `spec_commit_sha: ${sha}`,
      `artifact_path: backlog/proposed/${ITEM_ID}.md`,
      'class: narrow',
      'requested_at: 2026-06-03T00:00:00Z',
      'requested_reviewers: ["codex","codex-ops"]',
      'correlation_id: 123e4567-e89b-42d3-a456-426614174000',
      '---',
      '',
      'body',
      '',
    ].join('\n'),
  );
}

function writeCombined(root: string, body: string): void {
  writeFileSync(
    join(root, 'backlog/reviews', ITEM_ID, 'r1/combined.md'),
    [
      '---',
      `item_id: ${ITEM_ID}`,
      'round: 1',
      'combined_at: 2026-06-03T01:00:00Z',
      'codex_response: backlog/reviews/x/r1/codex.md',
      'cursor_response: null',
      'codex-ops_response: backlog/reviews/x/r1/codex-ops.md',
      'next_round: null',
      'combined_verdict: proceed',
      'escalated_to_founder: false',
      '---',
      '',
      body,
      '',
    ].join('\n'),
  );
}

function runPromote(root: string, args: string[]) {
  return runPython([PROMOTE, ...args, `--repo-root=${root}`]);
}

describe('promote.py', () => {
  let root: string;
  let origin: string | undefined;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    if (origin) rmSync(origin, { recursive: true, force: true });
  });

  beforeEach(() => {
    root = '';
    origin = undefined;
  });

  it('stage-only promotion stamps ready_content_sha and moves proposed to ready without committing', () => {
    ({ root } = setupRepo());
    const sha = git(root, ['rev-parse', 'HEAD']);
    writeRequest(root, sha);
    writeCombined(root, '## Convergence call\n\n**claim-ready after R1.**');

    const r = runPromote(root, ['promote', ITEM_ID, '--round=1', '--mode=stage-only']);
    expect(r.code, r.stderr).toBe(0);
    expect(existsSync(join(root, 'backlog/proposed', `${ITEM_ID}.md`))).toBe(false);
    const ready = join(root, 'backlog/ready', `${ITEM_ID}.md`);
    expect(existsSync(ready)).toBe(true);
    expect(readFileSync(ready, 'utf-8')).toMatch(/^ready_content_sha: [0-9a-f]{64}$/m);

    const again = runPromote(root, ['promote', ITEM_ID, '--round=1', '--mode=stage-only']);
    expect(again.code, again.stderr).toBe(0);
    expect(again.stdout).toMatch(/already ready/);
  });

  it('refuses crash-after-combine before disposition placeholder state', () => {
    ({ root } = setupRepo());
    const sha = git(root, ['rev-parse', 'HEAD']);
    writeRequest(root, sha);
    writeCombined(root, '| Disposition |\n| _strategist fills_ |');

    const r = runPromote(root, ['promote', ITEM_ID, '--round=1', '--mode=stage-only']);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/not terminal-promotable/);
    expect(existsSync(join(root, 'backlog/proposed', `${ITEM_ID}.md`))).toBe(true);
    expect(existsSync(join(root, 'backlog/ready', `${ITEM_ID}.md`))).toBe(false);
  });

  it('refuses promotion when current proposed content differs from reviewed SHA', () => {
    ({ root } = setupRepo());
    const sha = git(root, ['rev-parse', 'HEAD']);
    writeRequest(root, sha);
    writeCombined(root, '## Convergence call\n\n**claim-ready after R1.**');
    writeProposed(root, '- changed after request');

    const r = runPromote(root, ['promote', ITEM_ID, '--round=1', '--mode=stage-only']);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/differs from terminal request/);
    expect(existsSync(join(root, 'backlog/proposed', `${ITEM_ID}.md`))).toBe(true);
    expect(existsSync(join(root, 'backlog/ready', `${ITEM_ID}.md`))).toBe(false);
    expect(readFileSync(join(root, 'raw/internal/queue-errors.md'), 'utf-8')).toMatch(
      /PROMOTE_CONTENT_IDENTITY_MISMATCH/,
    );
  });

  it('bounces stale ready items back to proposed and removes ready_content_sha', () => {
    ({ root } = setupRepo());
    const sha = git(root, ['rev-parse', 'HEAD']);
    writeRequest(root, sha);
    writeCombined(root, '## Convergence call\n\n**claim-ready after R1.**');
    expect(runPromote(root, ['promote', ITEM_ID, '--round=1', '--mode=stage-only']).code).toBe(0);
    const ready = join(root, 'backlog/ready', `${ITEM_ID}.md`);
    writeFileSync(ready, readFileSync(ready, 'utf-8').replace('- original', '- stale edit'));

    const r = runPromote(root, ['bounce', ITEM_ID, '--mode=stage-only']);
    expect(r.code, r.stderr).toBe(0);
    expect(existsSync(ready)).toBe(false);
    const proposed = join(root, 'backlog/proposed', `${ITEM_ID}.md`);
    expect(existsSync(proposed)).toBe(true);
    expect(readFileSync(proposed, 'utf-8')).not.toMatch(/^ready_content_sha:/m);
    expect(readFileSync(join(root, 'raw/internal/queue-errors.md'), 'utf-8')).toMatch(
      /STALE_READY_BOUNCED/,
    );
  });

  it('commit-push mode publishes the ready boundary to origin/main', () => {
    ({ root, origin } = setupRepo(true));
    const sha = git(root, ['rev-parse', 'HEAD']);
    writeRequest(root, sha);
    writeCombined(root, '## Convergence call\n\n**claim-ready after R1.**');
    git(root, ['add', 'backlog/reviews']);
    git(root, ['commit', '-m', 'terminal review']);
    git(root, ['push', 'origin', 'main']);

    const r = runPromote(root, ['promote', ITEM_ID, '--round=1', '--mode=commit-push']);
    expect(r.code, r.stderr).toBe(0);
    expect(() =>
      execFileSync('git', ['--git-dir', origin!, 'cat-file', '-e', `main:backlog/ready/${ITEM_ID}.md`]),
    ).not.toThrow();
  });
});
