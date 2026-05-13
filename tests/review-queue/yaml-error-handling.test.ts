import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runPython, validatorPath } from './_helpers.js';

describe('validate.py — malformed YAML rejection (AC1)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'echo-rq-yaml-err-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('AC1a: cursor.md with embedded `""` literal (the real 040 R1 incident) is rejected cleanly', () => {
    // Replicates the canonical failure surfaced 2026-05-12 02:33 PDT:
    // a `finding:` value starting with `""` parses as an empty YAML scalar +
    // trailing unquoted text, raising yaml.parser.ParserError mid-frontmatter.
    const content = [
      '---',
      'item_id: "2026-05-12-040-watcher-state-executable-test"',
      'round: 1',
      'reviewer: "cursor"',
      'artifact_sha: "abc1234"',
      'completed_at: "2026-05-12T09:00:00Z"',
      'verdict: "proceed_after_patches"',
      'findings:',
      '  - severity: "low"',
      '    where: "§AC3"',
      '    finding: ""embedded quote and trailing text that breaks YAML"',
      '---',
      '',
      'body',
      '',
    ].join('\n');
    const path = join(dir, 'cursor.md');
    writeFileSync(path, content);

    const r = runPython([validatorPath(), 'reviewer', path]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/malformed YAML.*line \d+/i);
    expect(r.stdout).toBe('');
  });

  it('AC1b: cursor.md with a stray tab inside a flow mapping is rejected cleanly', () => {
    // A different YAML failure mode (ScannerError on a tab character inside a
    // flow-style mapping) — proves AC1a is not only catching ParserError.
    const content = [
      '---',
      'item_id: "2026-05-12-040-watcher-state-executable-test"',
      'round: 1',
      'reviewer: "cursor"',
      'artifact_sha: "abc1234"',
      'completed_at: "2026-05-12T09:00:00Z"',
      'verdict: "proceed"',
      'findings:',
      '  - severity: "low"',
      // Tab inside the flow mapping after `where:` — YAML disallows tabs as indentation
      // and rejects this with a ScannerError. The escape \t in TS source emits a literal tab.
      '    where: {\tfoo: bar}',
      '    finding: "tab-inside-flow-mapping"',
      '---',
      '',
      'body',
      '',
    ].join('\n');
    const path = join(dir, 'cursor.md');
    writeFileSync(path, content);

    const r = runPython([validatorPath(), 'reviewer', path]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/malformed YAML.*line \d+/i);
    expect(r.stdout).toBe('');
  });
});
