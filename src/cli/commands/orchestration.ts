import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  DEFAULT_PROJECT_CONFIG,
  loadProjectConfig,
  resolveEchoHomePaths,
  setEchoHomeRoot,
  upsertProjectRegistration,
  writeProjectConfig,
  type ProjectConfig,
} from '../../echo-home/paths.js';

type Writable = Pick<NodeJS.WritableStream, 'write'>;

export interface OrchestrationOpts {
  argv?: readonly string[];
  json?: boolean;
  quiet?: boolean;
  home?: string;
  stdout?: Writable;
  stderr?: Writable;
  now?: () => Date;
}

interface ParsedOrchestrationArgs {
  verb: 'init';
  repo: string;
  home?: string;
  json: boolean;
  quiet: boolean;
  coordRef?: string;
  reviewsRoot?: string;
  reviewers?: string[];
  specDir?: string;
}

class OrchestrationUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrchestrationUsageError';
  }
}

export const ORCHESTRATION_HELP = `Usage: echoctl orchestration init <repo> [options]

Options:
  --home <path>             ECHO_HOME for projects.json registration
  --coord-ref <ref>         Coordination ref to read/write (default: main)
  --reviews-root <path>     Project-relative reviews root (default: backlog/reviews)
  --reviewers <a,b>         Default reviewer roster (default: codex,cursor)
  --spec-dir <path>         Project-relative spec root (default: backlog)
  --json                    Print machine-readable output`;

function writeLine(stream: Writable, line: string): void {
  stream.write(line.endsWith('\n') ? line : `${line}\n`);
}

function expandHome(path: string): string {
  if (path === '~') return homedir();
  if (path.startsWith('~/')) return join(homedir(), path.slice(2));
  return path;
}

function parseNonEmpty(value: string | undefined, flag: string): string | undefined {
  if (value === undefined) return undefined;
  if (value.trim().length === 0) throw new OrchestrationUsageError(`invalid ${flag}`);
  return value;
}

function parseReviewerList(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  const reviewers = value
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  if (reviewers.length === 0) throw new OrchestrationUsageError('invalid --reviewers');
  return reviewers;
}

export function parseOrchestrationArgs(args: readonly string[]): ParsedOrchestrationArgs {
  const parsed = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: true,
    options: {
      home: { type: 'string' },
      'coord-ref': { type: 'string' },
      'reviews-root': { type: 'string' },
      reviewers: { type: 'string' },
      'spec-dir': { type: 'string' },
      json: { type: 'boolean', default: false },
      quiet: { type: 'boolean', default: false },
    },
  });

  const [verb, repo, extra] = parsed.positionals;
  if (verb !== 'init' || repo === undefined || extra !== undefined) {
    throw new OrchestrationUsageError(ORCHESTRATION_HELP);
  }

  return {
    verb,
    repo,
    home: parseNonEmpty(parsed.values.home, '--home'),
    json: parsed.values.json === true,
    quiet: parsed.values.quiet === true,
    coordRef: parseNonEmpty(parsed.values['coord-ref'], '--coord-ref'),
    reviewsRoot: parseNonEmpty(parsed.values['reviews-root'], '--reviews-root'),
    reviewers: parseReviewerList(parsed.values.reviewers),
    specDir: parseNonEmpty(parsed.values['spec-dir'], '--spec-dir'),
  };
}

function resolveGitRoot(repoArg: string): string {
  const candidate = resolve(expandHome(repoArg));
  try {
    return execFileSync('git', ['-C', candidate, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new OrchestrationUsageError(`repo is not a git repository: ${candidate}`);
  }
}

function scaffoldPipeline(repoRoot: string, config: ProjectConfig): void {
  const specRoot = join(repoRoot, config.spec_dir);
  for (const stage of ['proposed', 'ready', 'claimed', 'pending_review', 'complete']) {
    mkdirSync(join(specRoot, stage), { recursive: true });
  }
  mkdirSync(join(repoRoot, config.reviews_root), { recursive: true });
}

function desiredConfig(parsed: ParsedOrchestrationArgs): ProjectConfig {
  return {
    schema_version: 1,
    coord_ref: parsed.coordRef ?? DEFAULT_PROJECT_CONFIG.coord_ref,
    reviews_root: parsed.reviewsRoot ?? DEFAULT_PROJECT_CONFIG.reviews_root,
    reviewers: parsed.reviewers ?? [...DEFAULT_PROJECT_CONFIG.reviewers],
    spec_dir: parsed.specDir ?? DEFAULT_PROJECT_CONFIG.spec_dir,
  };
}

function emitJson(opts: OrchestrationOpts, payload: unknown): void {
  if (opts.quiet) return;
  writeLine(opts.stdout ?? process.stdout, JSON.stringify(payload));
}

function emitText(opts: OrchestrationOpts, line: string): void {
  if (opts.quiet) return;
  writeLine(opts.stdout ?? process.stdout, line);
}

export async function runOrchestration(opts: OrchestrationOpts = {}): Promise<number> {
  const stderr = opts.stderr ?? process.stderr;
  let parsed: ParsedOrchestrationArgs;
  try {
    parsed = parseOrchestrationArgs(opts.argv ?? []);
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
    const repoRoot = resolveGitRoot(parsed.repo);
    const initial = loadProjectConfig(repoRoot);
    const config = initial.existed
      ? initial.config
      : writeProjectConfig(repoRoot, desiredConfig(parsed)).config;
    scaffoldPipeline(repoRoot, config);
    upsertProjectRegistration({
      repoRoot,
      config,
      homeOverride: opts.home ?? parsed.home,
      now: opts.now?.() ?? new Date(),
    });
    const projectsPath = resolveEchoHomePaths(opts.home ?? parsed.home).stateProjects;

    if (opts.json) {
      emitJson(opts, {
        event: initial.existed ? 'orchestration.already_onboarded' : 'orchestration.initialized',
        repo_root: repoRoot,
        project_config_path: initial.path,
        projects_path: projectsPath,
        coord_ref: config.coord_ref,
        reviews_root: config.reviews_root,
        reviewers: config.reviewers,
        spec_dir: config.spec_dir,
      });
    } else if (initial.existed) {
      emitText(opts, `Orchestration already onboarded for ${repoRoot}.`);
    } else {
      emitText(opts, `Initialized orchestration for ${repoRoot}.`);
    }
    return 0;
  } catch (err) {
    writeLine(stderr, (err as Error).message);
    return err instanceof OrchestrationUsageError ? 2 : 1;
  }
}
