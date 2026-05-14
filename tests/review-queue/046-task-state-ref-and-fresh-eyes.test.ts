import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runPython, validatorPath } from './_helpers.js';

// 046 AC3 — task_state_ref schema extension + reviewer fresh-eyes enforcement.

const ITEM_ID = '2026-05-13-046-context-fatigue-via-role-typed-state';
const SHA = 'abc1234';

function buildFile(frontmatter: Record<string, unknown>, body: string): string {
  const lines: string[] = ['---'];
  for (const [k, v] of Object.entries(frontmatter)) {
    if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(`${k}: []`);
      } else {
        lines.push(`${k}:`);
        for (const item of v) lines.push(`  - ${JSON.stringify(item)}`);
      }
    } else if (typeof v === 'string') {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    } else if (typeof v === 'boolean') {
      lines.push(`${k}: ${v ? 'true' : 'false'}`);
    } else {
      lines.push(`${k}: ${String(v)}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n') + body;
}

function validate(
  schema: 'request' | 'reviewer' | 'combined',
  path: string,
): { code: number; stderr: string } {
  const r = runPython([validatorPath(), schema, path]);
  return { code: r.code, stderr: r.stderr };
}

function validRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    item_id: ITEM_ID,
    round: 1,
    spec_commit_sha: SHA,
    artifact_path: `backlog/ready/${ITEM_ID}.md`,
    class: 'narrow',
    requested_at: '2026-05-13T08:00:00Z',
    requested_reviewers: ['codex', 'codex-ops'],
    ...overrides,
  };
}

function validReviewer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    item_id: ITEM_ID,
    round: 1,
    reviewer: 'codex',
    artifact_sha: SHA,
    completed_at: '2026-05-13T09:00:00Z',
    verdict: 'proceed',
    findings: [],
    ...overrides,
  };
}

describe('046 — request.md task_state_ref extension', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'echo-046-req-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  function write(name: string, frontmatter: Record<string, unknown>): string {
    const p = join(dir, name);
    writeFileSync(p, buildFile(frontmatter, 'body\n'));
    return p;
  }

  it('request without task_state_ref still validates (backwards-compat)', () => {
    const p = write('request.md', validRequest());
    expect(validate('request', p).code).toBe(0);
  });

  it('request with task_state_ref validates when shape matches', () => {
    const p = write('request.md', validRequest({ task_state_ref: ITEM_ID }));
    expect(validate('request', p).code).toBe(0);
  });

  it('request with malformed task_state_ref rejected', () => {
    const p = write('request.md', validRequest({ task_state_ref: 'not-a-task-id' }));
    const r = validate('request', p);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/task_state_ref/);
  });
});

describe('046 — reviewer fresh-eyes enforcement', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'echo-046-rev-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  function writeRev(
    frontmatter: Record<string, unknown>,
    body: string,
    name = 'codex.md',
  ): string {
    const p = join(dir, name);
    writeFileSync(p, buildFile(frontmatter, body));
    return p;
  }

  it('NEGATIVE: reviewer body that names task_state_ref as a critique target validates', () => {
    const body =
      'My finding: AC3 says `task_state_ref` shouldn\'t leak into reviewer responses; ' +
      'the substring `backlog/task-state/` will currently false-positive in any naive ' +
      'substring scan, so the validator needs field-aware detection.\n';
    const p = writeRev(validReviewer(), body);
    expect(validate('reviewer', p).code).toBe(0);
  });

  it('NEGATIVE: reviewer body with single required-block name quoted as example validates', () => {
    const body =
      "Nit: the spec text could be clearer that the `## current_thesis` block must come " +
      'first. Otherwise LGTM.\n';
    const p = writeRev(validReviewer(), body);
    expect(validate('reviewer', p).code).toBe(0);
  });

  it('NEGATIVE: two of the six markers is below the threshold and validates', () => {
    const body =
      'Two minor doc nits: ensure the `## current_thesis` and `## locked_decisions` headings ' +
      'use the same casing throughout the spec.\n';
    const p = writeRev(validReviewer(), body);
    expect(validate('reviewer', p).code).toBe(0);
  });

  it('POSITIVE: reviewer body with three required-block headings is rejected', () => {
    const body =
      '## current_thesis\n' +
      'verbatim copy of pointer here\n\n' +
      '## locked_decisions\n' +
      '- item A\n\n' +
      '## open_questions\n' +
      '- item B\n';
    const p = writeRev(validReviewer(), body);
    const r = validate('reviewer', p);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/REVIEWER_FRESH_EYES_VIOLATION/);
  });

  it('POSITIVE: consumed_task_state: true is explicitly rejected', () => {
    const p = writeRev(validReviewer({ consumed_task_state: true }), 'body\n');
    const r = validate('reviewer', p);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/REVIEWER_FRESH_EYES_VIOLATION/);
    expect(r.stderr).toMatch(/consumed_task_state/);
  });

  it('consumed_task_state: false (or omitted) validates', () => {
    const omitted = writeRev(validReviewer(), 'body\n', 'a.md');
    expect(validate('reviewer', omitted).code).toBe(0);
    const explicitFalse = writeRev(validReviewer({ consumed_task_state: false }), 'body\n', 'b.md');
    expect(validate('reviewer', explicitFalse).code).toBe(0);
  });
});
