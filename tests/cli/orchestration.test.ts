import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tmpRoot: string;
let echoHome: string;
let repoRoot: string;
let out: string[];
let err: string[];
let originalEchoHome: string | undefined;

async function loadOrchestration(): Promise<
  typeof import('../../src/cli/commands/orchestration.js')
> {
  return import('../../src/cli/commands/orchestration.js');
}

function makeRepo(): string {
  const repo = join(tmpRoot, 'repo');
  mkdirSync(repo, { recursive: true });
  execSync('git init -q -b main', { cwd: repo });
  execSync('git config user.email test@example.com', { cwd: repo });
  execSync('git config user.name test', { cwd: repo });
  writeFileSync(join(repo, 'README.md'), '# repo\n');
  execSync('git add README.md && git commit -q -m bootstrap', { cwd: repo });
  return realpathSync(repo);
}

async function runOrchestration(argv: string[]): Promise<{
  code: number;
  stdout: string;
  stderr: string;
}> {
  const { runOrchestration: run } = await loadOrchestration();
  const code = await run({
    argv,
    home: echoHome,
    now: () => new Date('2026-06-13T10:00:00.000Z'),
    stdout: { write: (s) => (out.push(String(s)), true) },
    stderr: { write: (s) => (err.push(String(s)), true) },
  });
  return { code, stdout: out.join(''), stderr: err.join('') };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('echoctl orchestration init', () => {
  beforeEach(() => {
    originalEchoHome = process.env.ECHO_HOME;
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-orchestration-cli-'));
    echoHome = join(tmpRoot, 'echo-home');
    repoRoot = makeRepo();
    out = [];
    err = [];
    process.env.ECHO_HOME = echoHome;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEchoHome === undefined) delete process.env.ECHO_HOME;
    else process.env.ECHO_HOME = originalEchoHome;
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('scaffolds the backlog pipeline, writes project config, and registers the repo', async () => {
    const result = await runOrchestration(['init', repoRoot]);

    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toBe(`Initialized orchestration for ${repoRoot}.\n`);
    for (const rel of [
      'backlog/proposed',
      'backlog/ready',
      'backlog/claimed',
      'backlog/pending_review',
      'backlog/complete',
      'backlog/reviews',
    ]) {
      expect(existsSync(join(repoRoot, rel))).toBe(true);
    }
    expect(readJson(join(repoRoot, '.echo/project.json'))).toEqual({
      schema_version: 1,
      coord_ref: 'main',
      reviews_root: 'backlog/reviews',
      reviewers: ['codex', 'cursor'],
      spec_dir: 'backlog',
    });
    const projects = readJson<{ projects: Array<{ repo_root: string; coord_ref: string }> }>(
      join(echoHome, 'state/projects.json'),
    );
    expect(projects.projects).toHaveLength(1);
    expect(projects.projects[0]).toMatchObject({
      repo_root: resolve(repoRoot),
      coord_ref: 'main',
    });
  });

  it('is idempotent and does not clobber an existing project config', async () => {
    expect((await runOrchestration(['init', repoRoot])).code).toBe(0);
    writeFileSync(
      join(repoRoot, '.echo/project.json'),
      `${JSON.stringify(
        {
          schema_version: 1,
          coord_ref: 'refs/heads/echo/coord',
          reviews_root: 'coord/reviews',
          reviewers: ['codex', 'codex-ops'],
          spec_dir: 'specs',
        },
        null,
        2,
      )}\n`,
    );
    out = [];
    err = [];

    const second = await runOrchestration(['init', repoRoot, '--coord-ref', 'main']);

    expect(second.code, second.stderr).toBe(0);
    expect(second.stdout).toBe(`Orchestration already onboarded for ${repoRoot}.\n`);
    expect(readJson(join(repoRoot, '.echo/project.json'))).toMatchObject({
      coord_ref: 'refs/heads/echo/coord',
      reviews_root: 'coord/reviews',
      reviewers: ['codex', 'codex-ops'],
      spec_dir: 'specs',
    });
    const projects = readJson<{ projects: unknown[] }>(join(echoHome, 'state/projects.json'));
    expect(projects.projects).toHaveLength(1);
    expect(existsSync(join(repoRoot, 'specs/proposed'))).toBe(true);
    expect(existsSync(join(repoRoot, 'coord/reviews'))).toBe(true);
  });

  it('accepts custom coord_ref, reviews_root, reviewers, and spec_dir on first init', async () => {
    const result = await runOrchestration([
      'init',
      repoRoot,
      '--coord-ref',
      'refs/heads/echo/coord',
      '--reviews-root',
      'coord/reviews',
      '--reviewers',
      'codex,codex-ops',
      '--spec-dir',
      'specs',
    ]);

    expect(result.code, result.stderr).toBe(0);
    expect(readJson(join(repoRoot, '.echo/project.json'))).toMatchObject({
      coord_ref: 'refs/heads/echo/coord',
      reviews_root: 'coord/reviews',
      reviewers: ['codex', 'codex-ops'],
      spec_dir: 'specs',
    });
    expect(existsSync(join(repoRoot, 'specs/ready'))).toBe(true);
    expect(existsSync(join(repoRoot, 'coord/reviews'))).toBe(true);
  });

  it('rejects non-git repositories', async () => {
    const notRepo = join(tmpRoot, 'not-repo');
    mkdirSync(notRepo, { recursive: true });

    const result = await runOrchestration(['init', notRepo]);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('repo is not a git repository');
  });
});
