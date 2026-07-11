// Regression tests for tools/sync-skills.sh --check.
//
// The check must be bidirectional: canonical->adapter content drift AND
// orphan adapters (.claude/commands/*.md with no canonical skills/ file).
// The orphan case passed silently until 2026-07-11 (office-hours), and the
// failure hint must not tell the operator to "run the sync" for an orphan —
// syncing only copies canonical->adapter and cannot fix an orphan.
//
// Tests run against a tmpdir fixture via SYNC_SKILLS_ROOT, which also skips
// the global ~/.claude/commands dir so tests never touch the real user home.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(process.cwd(), 'tools', 'sync-skills.sh');

let root: string;

function run(mode: string[]): { status: number | null; out: string } {
  const r = spawnSync('bash', [SCRIPT, ...mode], {
    encoding: 'utf-8',
    env: { ...process.env, SYNC_SKILLS_ROOT: root },
  });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'echo-sync-skills-check-'));
  mkdirSync(join(root, 'skills'), { recursive: true });
  mkdirSync(join(root, '.claude', 'commands'), { recursive: true });
  writeFileSync(join(root, 'skills', 'alpha.md'), 'canonical alpha\n');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('sync-skills.sh --check', () => {
  it('passes on a synced fixture', () => {
    expect(run([]).status).toBe(0); // sync
    const check = run(['--check']);
    expect(check.status).toBe(0);
    expect(check.out).toContain('OK');
  });

  it('fails on canonical->adapter content drift with the sync hint', () => {
    expect(run([]).status).toBe(0);
    writeFileSync(join(root, '.claude', 'commands', 'alpha.md'), 'stale\n');
    const check = run(['--check']);
    expect(check.status).toBe(1);
    expect(check.out).toContain('differs from canonical');
    expect(check.out).toContain('Fix for content drift');
    expect(check.out).not.toContain('Fix for orphan adapters');
  });

  it('fails on an orphan adapter and does NOT prescribe running the sync', () => {
    expect(run([]).status).toBe(0);
    writeFileSync(join(root, '.claude', 'commands', 'zz-orphan.md'), 'orphan\n');
    const check = run(['--check']);
    expect(check.status).toBe(1);
    expect(check.out).toContain('orphan adapter');
    expect(check.out).toContain('Fix for orphan adapters');
    expect(check.out).toContain('promote the adapter to a canonical skill');
    // The generic sync hint must not appear for an orphan-only failure.
    expect(check.out).not.toContain('Fix for content drift');
  });

  it('running the sync after an orphan failure does not clear the orphan', () => {
    writeFileSync(join(root, '.claude', 'commands', 'zz-orphan.md'), 'orphan\n');
    expect(run([]).status).toBe(0); // sync succeeds but cannot remove orphans
    const check = run(['--check']);
    expect(check.status).toBe(1);
    expect(check.out).toContain('orphan adapter');
  });
});
