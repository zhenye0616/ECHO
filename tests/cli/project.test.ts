import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_GIT_REPOS, type CaptureSourcesConfig } from '../../src/capture/sources.js';

let tmpRoot: string;
let echoHome: string;
let repoRoot: string;
let out: string[];
let err: string[];
let originalEchoHome: string | undefined;

async function loadProject(): Promise<typeof import('../../src/cli/commands/project.js')> {
  return import('../../src/cli/commands/project.js');
}

function makeRepo(name: string): string {
  const repo = join(tmpRoot, name);
  mkdirSync(join(repo, '.git'), { recursive: true });
  return repo;
}

function readConfig(): CaptureSourcesConfig {
  return JSON.parse(
    readFileSync(join(echoHome, 'state/capture-sources.json'), 'utf8'),
  ) as CaptureSourcesConfig;
}

async function runProject(
  argv: string[],
  opts: { json?: boolean; now?: Date } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const { runProject: run } = await loadProject();
  const code = await run({
    argv,
    json: opts.json,
    home: echoHome,
    now: opts.now === undefined ? () => new Date('2026-05-28T00:00:00.000Z') : () => opts.now!,
    stdout: { write: (s) => (out.push(String(s)), true) },
    stderr: { write: (s) => (err.push(String(s)), true) },
  });
  return { code, stdout: out.join(''), stderr: err.join('') };
}

describe('echoctl project', () => {
  beforeEach(() => {
    originalEchoHome = process.env.ECHO_HOME;
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-project-cli-'));
    echoHome = join(tmpRoot, 'echo-home');
    repoRoot = makeRepo('repo');
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

  it('adds a git repo, persists it atomically, and lists it back', async () => {
    const added = await runProject(['add', repoRoot]);

    expect(added.code).toBe(0);
    expect(added.stdout).toBe(
      `Added ${repoRoot}. Restart the daemon for capture to take effect: \`echoctl daemon restart\`.\n`,
    );
    expect(readConfig()).toEqual({
      schema_version: 1,
      updated_at: '2026-05-28T00:00:00.000Z',
      git_repos: [repoRoot],
    });

    out = [];
    err = [];
    const listed = await runProject(['list'], { json: true });
    const payload = JSON.parse(listed.stdout) as { git_repos: string[] };
    expect(listed.code).toBe(0);
    expect(payload.git_repos).toEqual([...DEFAULT_GIT_REPOS, repoRoot]);
  });

  it('rejects non-existent paths and non-git directories', async () => {
    const missing = await runProject(['add', join(tmpRoot, 'missing')]);
    expect(missing.code).toBe(2);
    expect(missing.stderr).toContain('project path does not exist');

    out = [];
    err = [];
    const notGit = join(tmpRoot, 'not-git');
    mkdirSync(notGit, { recursive: true });
    const rejected = await runProject(['add', notGit]);
    expect(rejected.code).toBe(2);
    expect(rejected.stderr).toContain('project path is not a git repo');
    expect(existsSync(join(echoHome, 'state/capture-sources.json'))).toBe(false);
  });

  it('rejects duplicate adds against the effective capture set', async () => {
    expect((await runProject(['add', repoRoot])).code).toBe(0);

    out = [];
    err = [];
    const duplicate = await runProject(['add', `${repoRoot}/`]);

    expect(duplicate.code).toBe(2);
    expect(duplicate.stderr).toContain(`project already captured: ${repoRoot}`);
    expect(readConfig().git_repos).toEqual([repoRoot]);
  });

  it('prints project list JSON in the expected shape', async () => {
    expect((await runProject(['add', repoRoot])).code).toBe(0);
    out = [];
    err = [];

    const listed = await runProject(['list', '--json']);
    const payload = JSON.parse(listed.stdout) as {
      event: string;
      config_path: string;
      git_repos: string[];
    };

    expect(listed.code).toBe(0);
    expect(payload).toEqual({
      event: 'project.list',
      config_path: join(echoHome, 'state/capture-sources.json'),
      git_repos: [...DEFAULT_GIT_REPOS, repoRoot],
    });
  });

  it('removes user-added repos and rejects unknown paths', async () => {
    expect((await runProject(['add', repoRoot])).code).toBe(0);
    out = [];
    err = [];

    const removed = await runProject(['remove', repoRoot]);
    expect(removed.code).toBe(0);
    expect(readConfig().git_repos).toEqual([]);
    expect(removed.stdout).toContain(`Removed ${repoRoot}. Restart the daemon`);

    out = [];
    err = [];
    const unknown = await runProject(['remove', join(tmpRoot, 'unknown')]);
    expect(unknown.code).toBe(2);
    expect(unknown.stderr).toContain('project not captured');
  });

  it('requires .git to be a directory', async () => {
    const fileGit = join(tmpRoot, 'file-git');
    mkdirSync(fileGit, { recursive: true });
    writeFileSync(join(fileGit, '.git'), 'gitdir: ../actual\n');

    const rejected = await runProject(['add', fileGit]);

    expect(rejected.code).toBe(2);
    expect(rejected.stderr).toContain('project path is not a git repo');
  });
});
