// 052 AC3 — tools/install-pre-commit-hook.sh installer tests.
//
// Each test seeds a fresh tmp git repo, runs the installer, and asserts the
// resolved hook landed in the correct location with the correct content and
// mode. Covers the five scenarios from AC3:
//   1. Fresh install (no existing hook)
//   2. Idempotent re-install (no rewrite, executable preserved)
//   3. Mode-repair re-install (chmod -x first, installer repairs)
//   4. Content-differs re-install (overwrites, prints warning)
//   5. Linked-worktree scenario (writes into main repo's hooks dir)
//   6. Relative core.hooksPath from nested cwd (resolves against repo root,
//      not the cwd of invocation — codex R2 F-B / codex-ops R2 F-B).

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = process.cwd();
const INSTALLER = join(REPO, 'tools/install-pre-commit-hook.sh');

function sh(
  cwd: string,
  cmd: string,
  args: string[],
): { stdout: string; stderr: string; status: number } {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf-8' });
  return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', status: r.status ?? 0 };
}

function gitInit(dir: string): void {
  sh(dir, 'git', ['init', '-q']);
  sh(dir, 'git', ['config', 'user.email', 'test@test']);
  sh(dir, 'git', ['config', 'user.name', 'test']);
  writeFileSync(join(dir, 'seed'), 'seed\n');
  sh(dir, 'git', ['add', 'seed']);
  sh(dir, 'git', ['commit', '-q', '-m', 'seed']);
}

function isExecutableForUser(path: string): boolean {
  const m = statSync(path).mode;
  // 0o100 = owner-execute bit.
  return (m & 0o100) !== 0;
}

let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'echo-precommit-test-'));
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe('install-pre-commit-hook.sh', () => {
  it('fresh install: writes hook, marks executable', () => {
    const repo = join(workdir, 'repo');
    mkdirSync(repo);
    gitInit(repo);

    const r = sh(repo, INSTALLER, []);
    expect(r.status).toBe(0);
    const hookPath = join(repo, '.git/hooks/pre-commit');
    expect(existsSync(hookPath)).toBe(true);
    expect(isExecutableForUser(hookPath)).toBe(true);
    const body = readFileSync(hookPath, 'utf-8');
    expect(body).toContain('tools/sync-skills.sh --check');
    expect(body).toContain('git rev-parse --show-toplevel');
    expect(r.stdout).toContain('pre-commit hook installed at');
  });

  it('idempotent re-install: no rewrite, executable preserved, mtime unchanged', () => {
    const repo = join(workdir, 'repo');
    mkdirSync(repo);
    gitInit(repo);
    sh(repo, INSTALLER, []);
    const hookPath = join(repo, '.git/hooks/pre-commit');
    const mtimeBefore = statSync(hookPath).mtimeMs;

    // Sleep briefly so any rewrite would produce a measurably different mtime.
    spawnSync('sleep', ['0.1']);

    const r = sh(repo, INSTALLER, []);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('pre-commit hook unchanged');
    expect(isExecutableForUser(hookPath)).toBe(true);
    const mtimeAfter = statSync(hookPath).mtimeMs;
    expect(mtimeAfter).toBe(mtimeBefore);
  });

  it('mode-repair re-install: chmod -x first, installer repairs mode in place', () => {
    const repo = join(workdir, 'repo');
    mkdirSync(repo);
    gitInit(repo);
    sh(repo, INSTALLER, []);
    const hookPath = join(repo, '.git/hooks/pre-commit');
    chmodSync(hookPath, 0o644); // strip executable
    expect(isExecutableForUser(hookPath)).toBe(false);

    const r = sh(repo, INSTALLER, []);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('mode repaired');
    expect(r.stdout).toContain('was non-executable');
    expect(isExecutableForUser(hookPath)).toBe(true);
  });

  it('content-differs re-install: overwrites with warning', () => {
    const repo = join(workdir, 'repo');
    mkdirSync(repo);
    gitInit(repo);
    mkdirSync(join(repo, '.git/hooks'), { recursive: true });
    const hookPath = join(repo, '.git/hooks/pre-commit');
    writeFileSync(hookPath, '#!/usr/bin/env bash\necho "custom"\n');
    chmodSync(hookPath, 0o755);

    const r = sh(repo, INSTALLER, []);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('pre-commit hook installed at');
    expect(r.stdout).toContain('was overwritten');
    expect(isExecutableForUser(hookPath)).toBe(true);
    const newBody = readFileSync(hookPath, 'utf-8');
    expect(newBody).toContain('tools/sync-skills.sh --check');
    expect(newBody).not.toContain('echo "custom"');
  });

  it('linked-worktree: hook resolves into the main repo hooks dir', () => {
    const mainRepo = join(workdir, 'main');
    const linkedWt = join(workdir, 'linked');
    mkdirSync(mainRepo);
    gitInit(mainRepo);
    const wt = sh(mainRepo, 'git', ['worktree', 'add', '-b', 'feat', linkedWt]);
    expect(wt.status).toBe(0);

    const r = sh(linkedWt, INSTALLER, []);
    expect(r.status).toBe(0);
    const mainHook = join(mainRepo, '.git/hooks/pre-commit');
    expect(existsSync(mainHook)).toBe(true);
    expect(isExecutableForUser(mainHook)).toBe(true);
    // The linked worktree's .git is a pointer file, not a directory; no
    // separate hooks/pre-commit should have been created beside it.
    expect(existsSync(join(linkedWt, '.git/hooks/pre-commit'))).toBe(false);
  });

  it('relative core.hooksPath from nested cwd: resolves against repo root, not cwd', () => {
    const repo = join(workdir, 'repo');
    mkdirSync(repo);
    gitInit(repo);
    sh(repo, 'git', ['config', 'core.hooksPath', 'relative/hooks']);
    const nested = join(repo, 'tools');
    mkdirSync(nested);

    const r = sh(nested, INSTALLER, []);
    expect(r.status).toBe(0);
    const expectedHook = join(repo, 'relative/hooks/pre-commit');
    expect(existsSync(expectedHook)).toBe(true);
    expect(isExecutableForUser(expectedHook)).toBe(true);
    // The naive-installer failure mode would have written to
    // <repo>/tools/relative/hooks/pre-commit; guard against that.
    const naiveMisplacement = join(nested, 'relative/hooks/pre-commit');
    expect(existsSync(naiveMisplacement)).toBe(false);
  });
});
