import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  ECHO_HOME_PATHS,
  validateOnboardingState,
  validateProjectsState,
} from '../../echo-home/paths.js';
import { loadRolesFromDir } from '../../echo-home/roles.js';
import type { AgentKind } from '../../echo-home/wizard/detect-agents.js';
import {
  dispatchWorkflow,
  type DispatchOutcome,
  type DispatchSpawn,
} from '../workflow/dispatch.js';
import { listWorkflows, loadWorkflow } from '../workflow/load.js';
import { matchRolesToAgents } from '../workflow/match.js';

export interface RunOpts {
  workflowName: string;
  projectFlag?: string;
  agentOverrides?: ReadonlyMap<string, AgentKind>;
  json?: boolean;
  quiet?: boolean;
  workflowsDir?: string;
  rolesDir?: string;
  stateOnboardingPath?: string;
  stateProjectsPath?: string;
  spawn?: DispatchSpawn;
  timeoutMs?: number;
  now?: () => Date;
  cwd?: string;
  stdout?: Pick<NodeJS.WritableStream, 'write'>;
  stderr?: Pick<NodeJS.WritableStream, 'write'>;
  signalGate?: {
    beforeNextSpawn?: () => Promise<void>;
    beforeExitDerivation?: () => Promise<void>;
  };
}

function writeLine(stream: Pick<NodeJS.WritableStream, 'write'>, line: string): void {
  stream.write(`${line}\n`);
}

function workflowNames(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((entry) => /^[a-z][a-z0-9-]*\.toml$/.test(entry))
    .map((entry) => entry.slice(0, -'.toml'.length))
    .sort();
}

function findGitRoot(start: string): string | null {
  let cur = resolve(start);
  for (;;) {
    if (existsSync(join(cur, '.git'))) return cur;
    const parent = dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

function readDefaultProject(path: string): string | null {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    if (!validateProjectsState(raw)) return null;
    return typeof raw.default_project === 'string' && raw.default_project.length > 0
      ? raw.default_project
      : null;
  } catch {
    return null;
  }
}

function resolveProjectRoot(opts: RunOpts): string | null {
  if (opts.projectFlag !== undefined && opts.projectFlag.length > 0)
    return resolve(opts.projectFlag);
  const gitRoot = findGitRoot(opts.cwd ?? process.cwd());
  if (gitRoot !== null) return gitRoot;
  return readDefaultProject(opts.stateProjectsPath ?? ECHO_HOME_PATHS.stateProjects);
}

function readOnboarded(path: string) {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  if (!validateOnboardingState(raw)) throw new Error(`${path}: invalid onboarding state`);
  return raw.agents;
}

function renderOutcomes(outcomes: readonly DispatchOutcome[], opts: RunOpts): void {
  if (opts.quiet) return;
  const stdout = opts.stdout ?? process.stdout;
  if (opts.json) {
    writeLine(stdout, JSON.stringify({ event: 'run.outcomes', outcomes }));
    return;
  }
  for (const outcome of outcomes) {
    if (outcome.error !== undefined) {
      writeLine(stdout, `${outcome.step.role}: ${outcome.error}`);
    } else {
      writeLine(stdout, `${outcome.step.role}: exit ${outcome.spawn?.exitCode ?? -1}`);
    }
    const spawn = outcome.spawn;
    if (spawn?.stdout !== undefined && spawn.stdout.length > 0) {
      writeLine(stdout, '');
      stdout.write(spawn.stdout.endsWith('\n') ? spawn.stdout : `${spawn.stdout}\n`);
    }
    if (spawn?.stderr !== undefined && spawn.stderr.length > 0 && spawn.exitCode !== 0) {
      writeLine(stdout, '');
      writeLine(stdout, 'stderr:');
      stdout.write(spawn.stderr.endsWith('\n') ? spawn.stderr : `${spawn.stderr}\n`);
    }
  }
}

export function computeExitCode(
  outcomes: readonly DispatchOutcome[],
  receivedSignal: { current: 'SIGINT' | 'SIGTERM' | null },
): number {
  if (receivedSignal.current === 'SIGTERM') return 143;
  if (receivedSignal.current === 'SIGINT') return 130;
  for (const outcome of outcomes) {
    if (outcome.error === 'interrupted' && outcome.signal === 'SIGTERM') return 143;
    if (outcome.error === 'interrupted' && outcome.signal === 'SIGINT') return 130;
  }
  return outcomes.every(
    (outcome) => outcome.spawn !== null && outcome.spawn.exitCode === 0 && !outcome.spawn.timedOut,
  )
    ? 0
    : 1;
}

export async function runRun(opts: RunOpts): Promise<number> {
  const stderr = opts.stderr ?? process.stderr;
  try {
    const projectRoot = resolveProjectRoot(opts);
    if (projectRoot === null) {
      writeLine(
        stderr,
        'no project context - pass `--project <path>` or run from a git repository or run `echoctl init` to pick a default',
      );
      return 1;
    }
    const workflowsDir = opts.workflowsDir ?? ECHO_HOME_PATHS.workflows;
    const installed = workflowNames(workflowsDir);
    if (installed.length === 0) {
      writeLine(
        stderr,
        'no workflows installed. The 075 backlog item ships the first one; until then, `echoctl run` has nothing to dispatch.',
      );
      return 1;
    }
    const workflowPath = join(workflowsDir, `${opts.workflowName}.toml`);
    if (!existsSync(workflowPath)) {
      writeLine(
        stderr,
        `no workflow \`${opts.workflowName}\` - installed workflows: ${installed.join(', ')}`,
      );
      return 1;
    }
    const workflow = loadWorkflow(workflowPath);
    listWorkflows(workflowsDir);
    const roles = loadRolesFromDir(opts.rolesDir ?? ECHO_HOME_PATHS.roles, {
      skillsRoot: ECHO_HOME_PATHS.skills,
      assertDefaults: true,
    });
    const onboarded = readOnboarded(opts.stateOnboardingPath ?? ECHO_HOME_PATHS.stateOnboarding);
    const matches = matchRolesToAgents({
      steps: workflow.steps,
      roles,
      onboarded,
      override: opts.agentOverrides,
    });
    const unmatched = matches.filter((match) => match.reason !== 'matched');
    if (unmatched.length > 0) {
      if (opts.json && !opts.quiet) {
        writeLine(opts.stdout ?? process.stdout, JSON.stringify({ event: 'run.matches', matches }));
      }
      for (const match of unmatched) {
        writeLine(stderr, `${match.role}: ${match.reason}`);
      }
      return 1;
    }

    const controller = new AbortController();
    const receivedSignal: { current: 'SIGINT' | 'SIGTERM' | null } = { current: null };
    const onSig = (sig: 'SIGINT' | 'SIGTERM') => (): void => {
      receivedSignal.current = sig;
      controller.abort();
    };
    const onSigInt = onSig('SIGINT');
    const onSigTerm = onSig('SIGTERM');
    process.on('SIGINT', onSigInt);
    process.on('SIGTERM', onSigTerm);
    try {
      const outcomes = await dispatchWorkflow({
        workflow,
        matches,
        spawn: opts.spawn,
        timeoutMs: opts.timeoutMs,
        projectRoot,
        signal: controller.signal,
        receivedSignal,
        signalGate:
          opts.signalGate?.beforeNextSpawn === undefined
            ? undefined
            : { beforeNextSpawn: opts.signalGate.beforeNextSpawn },
      });
      renderOutcomes(outcomes, opts);
      await (opts.signalGate?.beforeExitDerivation?.() ?? Promise.resolve());
      return computeExitCode(outcomes, receivedSignal);
    } finally {
      process.off('SIGINT', onSigInt);
      process.off('SIGTERM', onSigTerm);
    }
  } catch (err) {
    writeLine(stderr, (err as Error).message);
    return 1;
  }
}
