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
const INSTALLER = join(REPO, 'tools/install-pre-push-hook.sh');

function sh(cwd: string, cmd: string, args: string[]) {
  const result = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? 0,
  };
}

function gitInit(dir: string): void {
  sh(dir, 'git', ['init', '-q']);
  sh(dir, 'git', ['config', 'user.email', 'test@example.com']);
  sh(dir, 'git', ['config', 'user.name', 'Test']);
  writeFileSync(join(dir, 'seed'), 'seed\n');
  sh(dir, 'git', ['add', 'seed']);
  sh(dir, 'git', ['commit', '-q', '-m', 'seed']);
}

function isExecutable(path: string): boolean {
  return (statSync(path).mode & 0o100) !== 0;
}

let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'echo-prepush-test-'));
});

afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe('tools/install-pre-push-hook.sh', () => {
  it('installs an executable hook that runs the repository secret scan', () => {
    const repo = join(workdir, 'repo');
    mkdirSync(repo);
    gitInit(repo);

    const result = sh(repo, INSTALLER, []);
    const hook = join(repo, '.git/hooks/pre-push');

    expect(result.status).toBe(0);
    expect(existsSync(hook)).toBe(true);
    expect(isExecutable(hook)).toBe(true);
    expect(readFileSync(hook, 'utf8')).toContain('tools/secret-scan.sh history');
  });

  it('is idempotent when hook content and mode already match', () => {
    const repo = join(workdir, 'repo');
    mkdirSync(repo);
    gitInit(repo);
    sh(repo, INSTALLER, []);
    const hook = join(repo, '.git/hooks/pre-push');
    const before = statSync(hook).mtimeMs;

    const result = sh(repo, INSTALLER, []);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('pre-push hook unchanged');
    expect(statSync(hook).mtimeMs).toBe(before);
  });

  it('repairs a matching hook that is not executable', () => {
    const repo = join(workdir, 'repo');
    mkdirSync(repo);
    gitInit(repo);
    sh(repo, INSTALLER, []);
    const hook = join(repo, '.git/hooks/pre-push');
    chmodSync(hook, 0o644);

    const result = sh(repo, INSTALLER, []);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('mode repaired');
    expect(isExecutable(hook)).toBe(true);
  });

  it('refuses to replace different existing hook content by default', () => {
    const repo = join(workdir, 'repo');
    mkdirSync(repo);
    gitInit(repo);
    const hook = join(repo, '.git/hooks/pre-push');
    writeFileSync(hook, '#!/usr/bin/env bash\necho custom\n');

    const result = sh(repo, INSTALLER, []);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('refusing to overwrite existing pre-push hook');
    expect(readFileSync(hook, 'utf8')).toContain('echo custom');
  });

  it('replaces different existing hook content only with --force', () => {
    const repo = join(workdir, 'repo');
    mkdirSync(repo);
    gitInit(repo);
    const hook = join(repo, '.git/hooks/pre-push');
    writeFileSync(hook, '#!/usr/bin/env bash\necho custom\n');

    const result = sh(repo, INSTALLER, ['--force']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('because --force was supplied');
    expect(readFileSync(hook, 'utf8')).not.toContain('echo custom');
    expect(readFileSync(hook, 'utf8')).toContain('tools/secret-scan.sh history');
  });

  it('resolves linked-worktree hooks into the main repository', () => {
    const main = join(workdir, 'main');
    const linked = join(workdir, 'linked');
    mkdirSync(main);
    gitInit(main);
    expect(sh(main, 'git', ['worktree', 'add', '-b', 'feature', linked]).status).toBe(0);

    expect(sh(linked, INSTALLER, []).status).toBe(0);

    expect(existsSync(join(main, '.git/hooks/pre-push'))).toBe(true);
    expect(existsSync(join(linked, '.git/hooks/pre-push'))).toBe(false);
  });

  it('resolves relative core.hooksPath from the repository root', () => {
    const repo = join(workdir, 'repo');
    mkdirSync(repo);
    gitInit(repo);
    sh(repo, 'git', ['config', 'core.hooksPath', 'relative/hooks']);
    const nested = join(repo, 'tools');
    mkdirSync(nested);

    expect(sh(nested, INSTALLER, []).status).toBe(0);

    expect(existsSync(join(repo, 'relative/hooks/pre-push'))).toBe(true);
    expect(existsSync(join(nested, 'relative/hooks/pre-push'))).toBe(false);
  });
});
