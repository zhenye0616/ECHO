import { mkdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  DEFAULT_GIT_REPOS,
  mergeGitRepos,
  normalizeRepoPath,
  readCaptureSourcesConfig,
  type CaptureSourcesConfig,
} from '../../capture/sources.js';
import { atomicWrite } from '../../echo-home/adapters/atomic-write.js';
import { ECHO_HOME_PATHS, setEchoHomeRoot } from '../../echo-home/paths.js';
import { ensureEchoHome } from '../../echo-home/scaffold.js';

type Writable = Pick<NodeJS.WritableStream, 'write'>;

export interface ProjectOpts {
  argv?: readonly string[];
  json?: boolean;
  quiet?: boolean;
  home?: string;
  stdout?: Writable;
  stderr?: Writable;
  now?: () => Date;
}

interface ParsedProjectArgs {
  verb: 'add' | 'list' | 'remove';
  path?: string;
  home?: string;
  json: boolean;
  quiet: boolean;
}

class ProjectUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectUsageError';
  }
}

export const PROJECT_HELP = `Usage: echoctl project <verb> [options]

Verbs:
  add <path>      Add a git repo to daemon capture on next restart
  list            List git repos captured by the daemon on next restart
  remove <path>   Remove a user-added git repo from daemon capture

Options:
  --home <path>   ECHO_HOME for this project config operation
  --json          Print machine-readable output`;

function writeLine(stream: Writable, line: string): void {
  stream.write(line.endsWith('\n') ? line : `${line}\n`);
}

function parseNonEmptyOption(value: string | undefined, flag: string): string | undefined {
  if (value === undefined) return undefined;
  if (value.trim().length === 0) throw new ProjectUsageError(`invalid ${flag}: expected path`);
  return value;
}

export function parseProjectArgs(args: readonly string[]): ParsedProjectArgs {
  const parsed = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: true,
    options: {
      home: { type: 'string' },
      json: { type: 'boolean', default: false },
      quiet: { type: 'boolean', default: false },
    },
  });

  const [verb, path, extra] = parsed.positionals;
  if (verb !== 'add' && verb !== 'list' && verb !== 'remove') {
    throw new ProjectUsageError(PROJECT_HELP);
  }
  if (extra !== undefined) throw new ProjectUsageError(PROJECT_HELP);
  if (verb === 'list' && path !== undefined) throw new ProjectUsageError(PROJECT_HELP);
  if ((verb === 'add' || verb === 'remove') && path === undefined) {
    throw new ProjectUsageError(PROJECT_HELP);
  }

  return {
    verb,
    path,
    home: parseNonEmptyOption(parsed.values.home, '--home'),
    json: parsed.values.json === true,
    quiet: parsed.values.quiet === true,
  };
}

function expandHome(path: string): string {
  if (path === '~') return homedir();
  if (path.startsWith('~/')) return join(homedir(), path.slice(2));
  return path;
}

function resolveRepoArg(path: string): string {
  return resolve(expandHome(path));
}

function usage(message: string): never {
  throw new ProjectUsageError(message);
}

function assertGitRepo(repoRoot: string): void {
  let repoStat: ReturnType<typeof statSync>;
  try {
    repoStat = statSync(repoRoot);
  } catch {
    usage(`project path does not exist: ${repoRoot}`);
  }
  if (!repoStat.isDirectory()) usage(`project path is not a directory: ${repoRoot}`);

  try {
    const gitStat = statSync(join(repoRoot, '.git'));
    if (!gitStat.isDirectory()) usage(`project path is not a git repo: ${repoRoot}`);
  } catch (err) {
    const code = err instanceof Error && 'code' in err ? (err as NodeJS.ErrnoException).code : '';
    if (code === 'ENOENT') usage(`project path is not a git repo: ${repoRoot}`);
    throw err;
  }
}

function configPath(): string {
  return ECHO_HOME_PATHS.stateCaptureSources;
}

function readUserRepos(): string[] {
  return readCaptureSourcesConfig(configPath())?.git_repos ?? [];
}

function containsRepo(repos: ReadonlyArray<string>, repoRoot: string): boolean {
  const normalized = normalizeRepoPath(repoRoot);
  return repos.some((repo) => normalizeRepoPath(repo) === normalized);
}

function writeConfig(gitRepos: ReadonlyArray<string>, now: Date): CaptureSourcesConfig {
  const config: CaptureSourcesConfig = {
    schema_version: 1,
    updated_at: now.toISOString(),
    git_repos: mergeGitRepos([], gitRepos),
  };
  mkdirSync(dirname(configPath()), { recursive: true });
  atomicWrite({
    filePath: configPath(),
    content: `${JSON.stringify(config, null, 2)}\n`,
    secretSensitive: false,
  });
  return config;
}

function emitJson(opts: ProjectOpts, payload: unknown): void {
  if (opts.quiet) return;
  writeLine(opts.stdout ?? process.stdout, JSON.stringify(payload));
}

function emitText(opts: ProjectOpts, line: string): void {
  if (opts.quiet) return;
  writeLine(opts.stdout ?? process.stdout, line);
}

function effectiveRepos(userRepos: ReadonlyArray<string>): string[] {
  return mergeGitRepos(DEFAULT_GIT_REPOS, userRepos);
}

function addProject(repoRoot: string, opts: ProjectOpts): void {
  assertGitRepo(repoRoot);
  const userRepos = readUserRepos();
  if (containsRepo(effectiveRepos(userRepos), repoRoot)) {
    usage(`project already captured: ${repoRoot}`);
  }
  const config = writeConfig([...userRepos, repoRoot], (opts.now ?? (() => new Date()))());
  if (opts.json) {
    emitJson(opts, {
      event: 'project.added',
      config_path: configPath(),
      repo_root: repoRoot,
      git_repos: effectiveRepos(config.git_repos),
    });
    return;
  }
  emitText(
    opts,
    `Added ${repoRoot}. Restart the daemon for capture to take effect: \`echoctl daemon restart\`.`,
  );
}

function listProjects(opts: ProjectOpts): void {
  const repos = effectiveRepos(readUserRepos());
  if (opts.json) {
    emitJson(opts, {
      event: 'project.list',
      config_path: configPath(),
      git_repos: repos,
    });
    return;
  }
  emitText(opts, 'Git capture repositories:');
  for (const repo of repos) emitText(opts, `- ${repo}`);
}

function removeProject(repoRoot: string, opts: ProjectOpts): void {
  const userRepos = readUserRepos();
  const normalized = normalizeRepoPath(repoRoot);
  const kept = userRepos.filter((repo) => normalizeRepoPath(repo) !== normalized);
  if (kept.length === userRepos.length) {
    if (containsRepo(DEFAULT_GIT_REPOS, repoRoot)) {
      usage(`project is a built-in capture repo and cannot be removed here: ${repoRoot}`);
    }
    usage(`project not captured: ${repoRoot}`);
  }
  const config = writeConfig(kept, (opts.now ?? (() => new Date()))());
  if (opts.json) {
    emitJson(opts, {
      event: 'project.removed',
      config_path: configPath(),
      repo_root: repoRoot,
      git_repos: effectiveRepos(config.git_repos),
    });
    return;
  }
  emitText(
    opts,
    `Removed ${repoRoot}. Restart the daemon for capture changes to take effect: \`echoctl daemon restart\`.`,
  );
}

export async function runProject(opts: ProjectOpts = {}): Promise<number> {
  const stderr = opts.stderr ?? process.stderr;
  let parsed: ParsedProjectArgs;
  try {
    parsed = parseProjectArgs(opts.argv ?? []);
    const home = opts.home ?? parsed.home;
    if (home !== undefined) setEchoHomeRoot(home);
    opts = {
      ...opts,
      json: opts.json === true || parsed.json,
      quiet: opts.quiet === true || parsed.quiet,
    };
  } catch (err) {
    writeLine(stderr, (err as Error).message);
    return 2;
  }

  try {
    ensureEchoHome();
    if (parsed.verb === 'list') {
      listProjects(opts);
    } else {
      const repoRoot = resolveRepoArg(parsed.path!);
      if (parsed.verb === 'add') addProject(repoRoot, opts);
      else removeProject(repoRoot, opts);
    }
    return 0;
  } catch (err) {
    writeLine(stderr, (err as Error).message);
    return err instanceof ProjectUsageError ? 2 : 1;
  }
}
