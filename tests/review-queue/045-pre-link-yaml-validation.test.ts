/**
 * 045-pre-link-yaml-validation.test.ts — AC1 fixture tests.
 *
 * Validates the shared pre-link YAML gate at
 * `tools/review-queue/validate_response_yaml.py` (the AC1 helper). The
 * helper IS the executable boundary; the three reviewer slash commands'
 * INVOCATION of it is verified separately via a prose-grep test.
 *
 * The clean-tree assertion replaces an earlier `git status --porcelain`
 * shape (which would have been dirty-by-construction when the fixture
 * stages a synthetic queue-errors.md row). The corrected shape compares
 * the post-helper state to the pre-helper staged baseline via
 * `git diff --exit-code -- raw/internal/queue-errors.md`.
 */
import { execFileSync, spawnSync } from 'node:child_process';
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
import { REPO } from './_helpers.js';

const HELPER_REL = 'tools/review-queue/validate_response_yaml.py';
const REVIEWER_PROMPTS = [
  '.claude/commands/review-queue-codex.md',
  '.claude/commands/review-queue-cursor.md',
  '.claude/commands/review-queue-codex-ops.md',
];

function runHelper(path: string): { status: number; stderr: string; stdout: string } {
  const r = spawnSync(join(REPO, HELPER_REL), [path], {
    cwd: REPO,
    encoding: 'utf-8',
  });
  return {
    status: typeof r.status === 'number' ? r.status : 1,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
}

describe('045 AC1 — pre-link reviewer-response YAML validation gate', () => {
  let dir: string;

  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-045-ac1-')));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('AC1a — valid response YAML: exit 0, stderr empty', () => {
    const path = join(dir, 'codex.md');
    writeFileSync(
      path,
      [
        '---',
        'item_id: "2026-05-13-045-queue-reliability-friction-cluster"',
        'round: 1',
        'reviewer: "codex"',
        'artifact_sha: "abc1234"',
        'completed_at: "2026-05-13T22:00:00Z"',
        'verdict: "proceed"',
        'findings: []',
        '---',
        '',
        'body',
        '',
      ].join('\n'),
    );
    const r = runHelper(path);
    expect(r.status, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('AC1b — malformed YAML (embedded `""` literal): exit non-zero, stderr names line/column', () => {
    // Replicates the canonical failure surfaced 2026-05-12 02:33 PDT: a
    // `finding:` value starting with `""` parses as an empty YAML scalar +
    // trailing unquoted text, raising yaml.parser.ParserError mid-frontmatter.
    const path = join(dir, 'codex.md');
    writeFileSync(
      path,
      [
        '---',
        'item_id: "2026-05-13-045-queue-reliability-friction-cluster"',
        'round: 1',
        'reviewer: "codex"',
        'artifact_sha: "abc1234"',
        'completed_at: "2026-05-13T22:00:00Z"',
        'verdict: "proceed_after_patches"',
        'findings:',
        '  - severity: "low"',
        '    where: "§AC1"',
        '    finding: ""embedded quote that breaks the parser"',
        '---',
        '',
        'body',
        '',
      ].join('\n'),
    );
    const r = runHelper(path);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/malformed YAML.*line \d+/i);
    expect(r.stdout).toBe('');
  });

  it('AC1c — schema violation (verdict not in enum): exit non-zero, stderr names the offending field', () => {
    // `completed_at: datetime.datetime(...)` not-a-string is one shape of
    // schema violation; verdict-not-in-enum is another. We use the enum
    // form because the validator's required-field + enum diagnostics name
    // the violating field path explicitly (matches the AC1c contract
    // "stderr contains the schema violation path").
    const path = join(dir, 'codex.md');
    writeFileSync(
      path,
      [
        '---',
        'item_id: "2026-05-13-045-queue-reliability-friction-cluster"',
        'round: 1',
        'reviewer: "codex"',
        'artifact_sha: "abc1234"',
        'completed_at: "2026-05-13T22:00:00Z"',
        // Not in the reviewer.schema.json verdict enum:
        'verdict: "looks_fine_to_me"',
        'findings: []',
        '---',
        '',
        'body',
        '',
      ].join('\n'),
    );
    const r = runHelper(path);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/schema violation at verdict/);
    expect(r.stdout).toBe('');
  });

  it('AC1d — clean-tree: helper does not mutate queue-errors.md against the pre-helper staged baseline', () => {
    // Stage a synthetic queue-errors.md row in an isolated git repo, then
    // run the helper against a malformed-YAML fixture. The helper MUST NOT
    // mutate queue-errors.md (pre-link retries are stderr-only; only
    // terminal failure writes the PRE-LINK-INVALID row, and that's the
    // reviewer prompt's responsibility, not the helper's).
    const repo = realpathSync(mkdtempSync(join(tmpdir(), 'echo-rq-045-ac1d-')));
    try {
      // Bootstrap an isolated git repo with the helper + validator + schema
      // copied in, so the helper's `tools/review-queue/validate.py` resolution
      // works from the new cwd.
      execFileSync('git', ['init', '-q', '-b', 'main', repo]);
      execFileSync('git', ['config', 'user.email', 'test@echo.local'], { cwd: repo });
      execFileSync('git', ['config', 'user.name', 'echo-test'], { cwd: repo });
      mkdirSync(join(repo, 'tools/review-queue/schemas'), { recursive: true });
      mkdirSync(join(repo, 'raw/internal'), { recursive: true });
      for (const rel of [
        'tools/review-queue/validate_response_yaml.py',
        'tools/review-queue/validate.py',
        'tools/review-queue/_lib.py',
        'tools/review-queue/schemas/reviewer.schema.json',
      ]) {
        writeFileSync(join(repo, rel), readFileSync(join(REPO, rel)));
      }
      execFileSync('chmod', ['+x', join(repo, 'tools/review-queue/validate_response_yaml.py')]);

      // Stage a synthetic baseline queue-errors.md row.
      const errorsRel = 'raw/internal/queue-errors.md';
      const baseline = '2026-05-13T22:00:00Z BASELINE: synthetic row from AC1d fixture\n';
      writeFileSync(join(repo, errorsRel), baseline);
      execFileSync('git', ['add', errorsRel], { cwd: repo });
      const stagedBlobBefore = execFileSync('git', ['rev-parse', `:${errorsRel}`], {
        cwd: repo,
        encoding: 'utf-8',
      }).trim();
      expect(stagedBlobBefore).toMatch(/^[0-9a-f]{40}$/);

      // Write a malformed reviewer response to a non-canonical path (the
      // helper takes the path as an argument; it doesn't care that it lives
      // outside backlog/reviews/).
      const reviewer = join(repo, 'codex.md.fixture.tmp');
      writeFileSync(
        reviewer,
        [
          '---',
          'item_id: "2026-05-13-045-queue-reliability-friction-cluster"',
          'round: 1',
          'reviewer: "codex"',
          'artifact_sha: "abc1234"',
          'completed_at: "2026-05-13T22:00:00Z"',
          'verdict: "proceed_after_patches"',
          'findings:',
          '  - severity: "low"',
          '    where: "§AC1"',
          '    finding: ""embedded quote that breaks the parser"',
          '---',
          '',
          'body',
          '',
        ].join('\n'),
      );

      // Invoke the helper from the isolated repo's cwd. Expect non-zero
      // (malformed YAML) AND zero working-tree mutation against the staged
      // baseline.
      const r = spawnSync(join(repo, 'tools/review-queue/validate_response_yaml.py'), [reviewer], {
        cwd: repo,
        encoding: 'utf-8',
      });
      expect(r.status).not.toBe(0);

      // git diff --exit-code returns 0 iff no unstaged diff exists relative
      // to the staged baseline. The helper MUST NOT have mutated
      // queue-errors.md.
      const diff = spawnSync('git', ['diff', '--exit-code', '--', errorsRel], {
        cwd: repo,
        encoding: 'utf-8',
      });
      expect(diff.status, `diff stdout: ${diff.stdout}`).toBe(0);

      // The staged blob SHA must be unchanged.
      const stagedBlobAfter = execFileSync('git', ['rev-parse', `:${errorsRel}`], {
        cwd: repo,
        encoding: 'utf-8',
      }).trim();
      expect(stagedBlobAfter).toBe(stagedBlobBefore);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it('AC1-prompt-grep — all three reviewer slash commands invoke validate_response_yaml.py in their Step 5 prose', () => {
    for (const rel of REVIEWER_PROMPTS) {
      const path = join(REPO, rel);
      expect(existsSync(path), `missing prompt file: ${rel}`).toBe(true);
      const text = readFileSync(path, 'utf-8');
      expect(text, `${rel} missing validate_response_yaml.py reference`).toMatch(
        /validate_response_yaml\.py/,
      );
    }
  });
});
