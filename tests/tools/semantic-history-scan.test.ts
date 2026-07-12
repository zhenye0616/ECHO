import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(process.cwd(), 'tools/semantic-history-scan.mjs');

let workdir: string;
let repo: string;

function git(args: string[]): void {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
}

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'echo-semantic-history-test-'));
  repo = join(workdir, 'repo');
  mkdirSync(repo);
  git(['init', '-q']);
  git(['config', 'user.email', 'test@example.com']);
  git(['config', 'user.name', 'Test']);
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe('tools/semantic-history-scan.mjs', () => {
  it('emits reproducible detector definitions and counts without matched values', () => {
    const historicalId = ['not_', 'HISTORY123'].join('');
    const trackedId = ['not_', 'TRACKED456'].join('');
    const privateEmail = ['person', '@company.invalid'].join('');
    writeFileSync(
      join(repo, 'evidence.txt'),
      `${historicalId}\n${['', 'Users', 'alice', 'private', 'file.txt'].join('/')}\n${privateEmail}\ntest@example.com\n`,
    );
    git(['add', 'evidence.txt']);
    git(['commit', '-q', '-m', 'historical']);
    writeFileSync(join(repo, 'evidence.txt'), `${trackedId}\n`);
    git(['add', 'evidence.txt']);
    git(['commit', '-q', '-m', 'tracked']);

    const result = spawnSync('node', [SCRIPT, '--ref', 'HEAD'], { cwd: repo, encoding: 'utf8' });

    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as {
      input_sha: string;
      diff_content_sha256: string;
      path_exclusions: string[];
      detectors: {
        live_looking_note_ids: {
          history_distinct: number;
          tracked_distinct: number;
          history_only: number;
          regex: string;
        };
        absolute_user_paths: { history_distinct: number };
        non_example_emails: { history_distinct: number; exclusions: string[] };
      };
    };
    expect(report.detectors.live_looking_note_ids).toMatchObject({
      history_distinct: 2,
      tracked_distinct: 1,
      history_only: 1,
    });
    expect(report.detectors.live_looking_note_ids.regex).toContain('not_');
    expect(report.detectors.absolute_user_paths.history_distinct).toBe(1);
    expect(report.detectors.non_example_emails.history_distinct).toBe(1);
    expect(report.detectors.non_example_emails.exclusions).toContain('example\\.com');
    expect(report.input_sha).toMatch(/^[a-f0-9]{40}$/);
    expect(report.diff_content_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.path_exclusions).toContain('tests/tools/semantic-history-scan.test.ts');
    expect(result.stdout).not.toContain(historicalId);
    expect(result.stdout).not.toContain(trackedId);
    expect(result.stdout).not.toContain(privateEmail);
  });
});
