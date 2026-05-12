import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runPython, requestScript } from './_helpers.js';

const ITEM_ID = '2026-05-12-040-example-spec';

function setupFakeRepo(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-req-')));
  mkdirSync(join(root, 'backlog/ready'), { recursive: true });
  writeFileSync(
    join(root, 'backlog/ready', `${ITEM_ID}.md`),
    '---\nid: ' + ITEM_ID + '\n---\nbody\n',
  );
  return root;
}

function runRequest(
  repoRoot: string,
  extra: string[] = [],
  sha: string = 'abc1234',
): { code: number; stdout: string; stderr: string } {
  return runPython([
    requestScript(),
    ITEM_ID,
    '1',
    `--repo-root=${repoRoot}`,
    `--spec-sha=${sha}`,
    ...extra,
  ]);
}

describe('request.py', () => {
  let root: string;
  beforeEach(() => {
    root = setupFakeRepo();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('happy path: writes a valid request.md', () => {
    const r = runRequest(root);
    expect(r.code, r.stderr).toBe(0);
    const expected = join(root, 'backlog/reviews', ITEM_ID, 'r1/request.md');
    expect(r.stdout.trim()).toBe(expected);
    const body = readFileSync(expected, 'utf-8');
    expect(body).toMatch(/spec_commit_sha: abc1234/);
    expect(body).toMatch(/class: narrow/);
    expect(body).toMatch(/- codex/);
    expect(body).toMatch(/- cursor/);
  });

  it('--class=structural-reform is reflected in frontmatter', () => {
    const r = runRequest(root, ['--class=structural-reform']);
    expect(r.code, r.stderr).toBe(0);
    const body = readFileSync(join(root, 'backlog/reviews', ITEM_ID, 'r1/request.md'), 'utf-8');
    expect(body).toMatch(/class: structural-reform/);
  });

  it('item not found: clear error', () => {
    const r = runPython([
      requestScript(),
      '2026-05-12-999-does-not-exist',
      '1',
      `--repo-root=${root}`,
      '--spec-sha=abc1234',
    ]);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/no backlog item/);
  });

  it('race-loser, same SHA: exit 0 (same-SHA idempotency)', () => {
    const first = runRequest(root);
    expect(first.code, first.stderr).toBe(0);
    const second = runRequest(root);
    expect(second.code, second.stderr).toBe(0);
  });

  it('race-loser, different SHA: exit non-zero with bump-or-fix-history message', () => {
    const first = runRequest(root, [], 'abc1234');
    expect(first.code, first.stderr).toBe(0);
    const second = runRequest(root, [], 'deadbee');
    expect(second.code).not.toBe(0);
    expect(second.stderr).toMatch(/different SHA/);
    expect(second.stderr).toMatch(/bump round number/);
  });

  it('requested_reviewers validation: out-of-enum reviewer rejected', () => {
    const r = runRequest(root, ['--reviewers=gemini']);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/gemini/);
    expect(r.stderr).toMatch(/not in current enum/);
    expect(r.stderr).toMatch(/extend the schema/);
  });

  it('frontmatter validates against schemas/request.schema.json', () => {
    runRequest(root);
    const reqPath = join(root, 'backlog/reviews', ITEM_ID, 'r1/request.md');
    const v = runPython([
      join(process.cwd(), 'tools/review-queue/validate.py'),
      'request',
      reqPath,
    ]);
    expect(v.code, v.stderr).toBe(0);
  });
});
