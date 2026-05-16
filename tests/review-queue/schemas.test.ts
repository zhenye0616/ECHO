import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runPython, validatorPath } from './_helpers.js';

function fm(obj: Record<string, unknown>): string {
  const lines: string[] = ['---'];
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(`${k}: []`);
      } else {
        lines.push(`${k}:`);
        for (const item of v) lines.push(`  - ${JSON.stringify(item)}`);
      }
    } else if (v === null) {
      lines.push(`${k}: null`);
    } else if (typeof v === 'string') {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push('---', '', 'body', '');
  return lines.join('\n');
}

function validate(
  schema: 'request' | 'reviewer' | 'combined',
  path: string,
): { code: number; stderr: string } {
  const r = runPython([validatorPath(), schema, path]);
  return { code: r.code, stderr: r.stderr };
}

const ITEM_ID = '2026-05-12-040-example-spec';
const SHA = 'abc1234';

function validRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    item_id: ITEM_ID,
    round: 1,
    spec_commit_sha: SHA,
    artifact_path: `backlog/ready/${ITEM_ID}.md`,
    class: 'narrow',
    requested_at: '2026-05-12T08:00:00Z',
    requested_reviewers: ['codex', 'cursor'],
    // 057b AC7 — canonical uuid4 (version-4 nibble + [89ab] variant byte).
    correlation_id: 'c9b71286-5f67-4a6c-9a5a-ab6ed07ce4ef',
    ...overrides,
  };
}

function validReviewer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    item_id: ITEM_ID,
    round: 1,
    reviewer: 'codex',
    artifact_sha: SHA,
    completed_at: '2026-05-12T09:00:00Z',
    verdict: 'proceed',
    findings: [],
    ...overrides,
  };
}

function validCombined(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    item_id: ITEM_ID,
    round: 1,
    combined_at: '2026-05-12T09:30:00Z',
    codex_response: 'codex.md',
    cursor_response: 'cursor.md',
    combined_verdict: 'proceed',
    escalated_to_founder: false,
    ...overrides,
  };
}

describe('review-queue schemas', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'echo-rq-schema-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function write(name: string, obj: Record<string, unknown>): string {
    const p = join(dir, name);
    writeFileSync(p, fm(obj));
    return p;
  }

  it('valid request parses cleanly', () => {
    const p = write('request.md', validRequest());
    expect(validate('request', p).code).toBe(0);
  });

  it('valid reviewer parses cleanly', () => {
    const p = write('codex.md', validReviewer());
    expect(validate('reviewer', p).code).toBe(0);
  });

  it('valid combined parses cleanly', () => {
    const p = write('combined.md', validCombined());
    expect(validate('combined', p).code).toBe(0);
  });

  it('missing required field on request fails with field name', () => {
    const req = validRequest();
    delete (req as Record<string, unknown>).round;
    const p = write('request.md', req);
    const r = validate('request', p);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/round/);
  });

  it('missing required field on reviewer fails with field name', () => {
    const rev = validReviewer();
    delete (rev as Record<string, unknown>).verdict;
    const p = write('codex.md', rev);
    const r = validate('reviewer', p);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/verdict/);
  });

  it('missing required field on combined fails with field name', () => {
    const cmb = validCombined();
    delete (cmb as Record<string, unknown>).combined_verdict;
    const p = write('combined.md', cmb);
    const r = validate('combined', p);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/combined_verdict/);
  });

  it('reviewer enum {codex, cursor}: other reviewer rejected', () => {
    const p = write('reviewer.md', validReviewer({ reviewer: 'gemini' }));
    const r = validate('reviewer', p);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/reviewer/);
  });

  it('reviewer verdict excludes combined-only values', () => {
    for (const v of ['divergent', 'single_reviewer_timeout', 'no_responses']) {
      const p = write('reviewer.md', validReviewer({ verdict: v }));
      expect(validate('reviewer', p).code, `${v} must not validate at reviewer layer`).not.toBe(0);
    }
  });

  it('reviewer verdict accepts the three per-reviewer values', () => {
    for (const v of ['proceed', 'proceed_after_patches', 'pushback']) {
      const p = write('reviewer.md', validReviewer({ verdict: v }));
      expect(validate('reviewer', p).code, `${v} must validate`).toBe(0);
    }
  });

  it('combined verdict accepts all six values', () => {
    for (const v of [
      'proceed',
      'proceed_after_patches',
      'pushback',
      'divergent',
      'single_reviewer_timeout',
      'no_responses',
    ]) {
      const p = write('combined.md', validCombined({ combined_verdict: v }));
      expect(validate('combined', p).code, `${v} must validate at combined layer`).toBe(0);
    }
  });

  it('combined.md allows null codex/cursor_response for single_reviewer_timeout', () => {
    const p = write(
      'combined.md',
      validCombined({
        combined_verdict: 'single_reviewer_timeout',
        escalated_to_founder: true,
        codex_response: null,
      }),
    );
    expect(validate('combined', p).code).toBe(0);
  });

  it('request class enum is {narrow, structural-reform}', () => {
    const bad = write('request.md', validRequest({ class: 'huge-reform' }));
    expect(validate('request', bad).code).not.toBe(0);
    for (const c of ['narrow', 'structural-reform']) {
      const good = write('request.md', validRequest({ class: c }));
      expect(validate('request', good).code, c).toBe(0);
    }
  });

  it('combined: malformed_reviewer_response with string offending_response + string parse_error (AC3)', () => {
    const p = write(
      'combined.md',
      validCombined({
        combined_verdict: 'malformed_reviewer_response',
        escalated_to_founder: true,
        offending_response: 'backlog/reviews/2026-05-12-040-example-spec/r1/cursor.md',
        parse_error: 'malformed YAML at line 11 column 16: ...',
      }),
    );
    expect(validate('combined', p).code).toBe(0);
  });

  it('combined: malformed_reviewer_response with array shapes of length 2 (AC3)', () => {
    const p = write(
      'combined.md',
      validCombined({
        combined_verdict: 'malformed_reviewer_response',
        escalated_to_founder: true,
        offending_response: [
          'backlog/reviews/2026-05-12-040-example-spec/r1/codex.md',
          'backlog/reviews/2026-05-12-040-example-spec/r1/cursor.md',
        ],
        parse_error: ['codex yaml error', 'cursor yaml error'],
      }),
    );
    expect(validate('combined', p).code).toBe(0);
  });

  it('combined: offending_response as length-1 array is rejected (AC3 minItems gate)', () => {
    const p = write(
      'combined.md',
      validCombined({
        combined_verdict: 'malformed_reviewer_response',
        escalated_to_founder: true,
        offending_response: ['backlog/reviews/2026-05-12-040-example-spec/r1/cursor.md'],
        // parse_error stays a string so only the offending_response minItems:2 gate fires.
        parse_error: 'only one error',
      }),
    );
    const r = validate('combined', p);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/offending_response/);
  });

  it('combined: offending_response with item-relative path is rejected (AC3 path-pattern gate)', () => {
    const p = write(
      'combined.md',
      validCombined({
        combined_verdict: 'malformed_reviewer_response',
        escalated_to_founder: true,
        offending_response: 'r1/cursor.md',
        parse_error: 'msg',
      }),
    );
    const r = validate('combined', p);
    expect(r.code).not.toBe(0);
    expect(r.stderr).toMatch(/offending_response/);
  });

  it('combined: offending_response with hyphenated reviewer slug validates (AC5)', () => {
    // 043 AC5: regex widened from [a-z]+ to [a-z][a-z0-9-]+ so hyphenated slugs
    // like "codex-arch" land cleanly. Falsifies the original pre-043 regex.
    const p = write(
      'combined.md',
      validCombined({
        combined_verdict: 'malformed_reviewer_response',
        escalated_to_founder: true,
        offending_response: 'backlog/reviews/2026-05-13-FIXTURE-codex-arch/r1/codex-arch.md',
        parse_error: 'malformed YAML at line 5 column 1',
      }),
    );
    expect(validate('combined', p).code).toBe(0);
  });

  it('requested_reviewers must be a non-empty subset of the reviewer enum', () => {
    // empty
    const empty = write('request.md', validRequest({ requested_reviewers: [] }));
    expect(validate('request', empty).code).not.toBe(0);
    // not in enum
    const gem = write('request.md', validRequest({ requested_reviewers: ['gemini'] }));
    expect(validate('request', gem).code).not.toBe(0);
    // subset = only codex
    const sub = write('request.md', validRequest({ requested_reviewers: ['codex'] }));
    expect(validate('request', sub).code).toBe(0);
  });
});
