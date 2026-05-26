import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from '../../echo-home/adapters/atomic-write.js';
import {
  ECHO_HOME_PATHS,
  validateOnboardingState,
  type OnboardedAgentProfile,
  type OnboardingState,
} from '../../echo-home/paths.js';
import { type Capability } from '../../echo-home/roles.js';
import {
  createWizard,
  type CreateWizardOpts,
  type Wizard,
} from '../../echo-home/wizard/run-wizard.js';
import type { WireResult } from '../../echo-home/wizard/wire.js';
import { AGENT_KINDS, type AgentKind } from '../../echo-home/wizard/detect-agents.js';
import type { ProbeOutcome } from '../../echo-home/wizard/probe.js';
import {
  renderDetectedAgents,
  renderDetectedProjects,
  renderProbeOutcomes,
  renderWireResult,
} from '../io/render.js';
import { makeTtyPrompt, type PromptImpl } from '../io/prompt.js';

export const AGENT_CAPABILITIES_BY_KIND: Readonly<Record<AgentKind, readonly Capability[]>> =
  Object.freeze({
    codex: Object.freeze([
      'fs.read',
      'fs.write',
      'git.read',
      'git.write',
      'network',
      'mcp.echo.read',
      'mcp.echo.write',
    ] as const),
    'claude-code': Object.freeze([
      'fs.read',
      'fs.write',
      'git.read',
      'git.write',
      'network',
      'mcp.echo.read',
      'mcp.echo.write',
    ] as const),
    cursor: Object.freeze(['mcp.echo.read'] as const),
  });

type WizardFactory = (opts: CreateWizardOpts) => Wizard;

export interface InitOpts {
  json?: boolean;
  quiet?: boolean;
  color?: boolean;
  stdin?: { isTTY?: boolean };
  stdout?: Pick<NodeJS.WritableStream, 'write'>;
  stderr?: Pick<NodeJS.WritableStream, 'write'>;
  wizardFactory?: WizardFactory;
  prompt?: PromptImpl;
  now?: () => Date;
  packageJsonPath?: string;
}

export type RemediationCopy = Record<
  Exclude<ProbeOutcome, { probed: true }>['reason'],
  (outcome: Extract<ProbeOutcome, { probed: false }>) => string
>;

export function resolveMcpPort(): number {
  const raw = process.env['ECHO_MCP_PORT'];
  if (raw === undefined || raw.length === 0) return 38478;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 0 || n > 65535) return 38478;
  return n;
}

export function readPackageVersion(packageJsonPath?: string): string {
  const resolved =
    packageJsonPath ?? fileURLToPath(new URL('../../../package.json', import.meta.url));
  const parsed = JSON.parse(readFileSync(resolved, 'utf8')) as { version?: unknown };
  if (typeof parsed.version !== 'string') throw new Error(`${resolved}: missing version`);
  return parsed.version;
}

export function buildRemediationCopy(mcpServerUrl: string): RemediationCopy {
  return {
    'cli-unavailable': (outcome) =>
      `${outcome.agent} not found on PATH. Install it and run \`echoctl doctor\` to re-probe.`,
    'auth-required': (outcome) =>
      `${outcome.agent} is not logged in. Run the vendor login command and then \`echoctl doctor\`.`,
    'manual-only': () =>
      'Cursor has no headless CLI. Open Cursor and run any prompt to confirm ECHO MCP is reachable.',
    'mcp-not-configured': () =>
      `Claude Code does not have ECHO MCP configured. Run \`claude mcp add echo ${mcpServerUrl}\` and then \`echoctl doctor\`.`,
    timeout: (outcome) =>
      `${outcome.agent} took longer than 5s to respond. Re-run \`echoctl doctor\` once if this persists.`,
    'unexpected-output': (outcome) =>
      `${outcome.agent} responded but did not echo \`pong\`. Detail: ${(outcome.detail ?? '').slice(0, 200)}. Run \`echoctl doctor\` to retry.`,
  };
}

function writeLine(stream: Pick<NodeJS.WritableStream, 'write'>, line: string): void {
  stream.write(`${line}\n`);
}

function emitJson(opts: InitOpts, payload: unknown, final = false): void {
  if (opts.quiet && !final) return;
  writeLine(opts.stdout ?? process.stdout, JSON.stringify(payload));
}

function emitText(opts: InitOpts, text: string): void {
  if (opts.quiet) return;
  writeLine(opts.stdout ?? process.stdout, text);
}

function isAgentKind(value: string): value is AgentKind {
  return (AGENT_KINDS as readonly string[]).includes(value);
}

function parseAgentSelection(input: string, fallback: readonly AgentKind[]): AgentKind[] {
  if (input.trim().length === 0) return [...fallback];
  const out: AgentKind[] = [];
  for (const token of input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)) {
    if (!isAgentKind(token)) throw new Error(`unknown agent kind: ${token}`);
    out.push(token);
  }
  return out;
}

function readOnboardingState(): OnboardingState {
  const raw = JSON.parse(readFileSync(ECHO_HOME_PATHS.stateOnboarding, 'utf8')) as unknown;
  if (!validateOnboardingState(raw)) {
    throw new Error(`${ECHO_HOME_PATHS.stateOnboarding}: invalid onboarding state`);
  }
  return raw;
}

function writeOnboardingState(state: OnboardingState): void {
  mkdirSync(dirname(ECHO_HOME_PATHS.stateOnboarding), { recursive: true });
  atomicWrite({
    filePath: ECHO_HOME_PATHS.stateOnboarding,
    content: `${JSON.stringify(state, null, 2)}\n`,
    secretSensitive: false,
  });
}

function successfulAgents(result: WireResult, selected: readonly AgentKind[]): AgentKind[] {
  const ok = new Set(
    result.syncResult.agents.filter((agent) => agent.ok).map((agent) => agent.agent),
  );
  return selected.filter((agent) => ok.has(agent));
}

export function populateCapabilitiesForWiredAgents(
  result: WireResult,
  selectedAgents: readonly AgentKind[],
): void {
  const successful = new Set(successfulAgents(result, selectedAgents));
  if (successful.size === 0) return;
  const state = readOnboardingState();
  let changed = false;
  for (const profile of state.agents as OnboardedAgentProfile[]) {
    if (!isAgentKind(profile.id) || !successful.has(profile.id)) continue;
    const capabilities = [...AGENT_CAPABILITIES_BY_KIND[profile.id]];
    if (JSON.stringify(profile.capabilities) !== JSON.stringify(capabilities)) {
      profile.capabilities = capabilities;
      changed = true;
    }
  }
  if (changed) writeOnboardingState(state);
}

function topLevelFailure(result: WireResult): string | null {
  if (result.syncResult.syncLock !== undefined) return result.syncResult.syncLock.message;
  if (result.syncResult.directorySymlink !== undefined) {
    return result.syncResult.directorySymlink.message;
  }
  return null;
}

export async function runInit(opts: InitOpts = {}): Promise<number> {
  const stderr = opts.stderr ?? process.stderr;
  if (opts.stdin?.isTTY !== true && process.stdin.isTTY !== true) {
    writeLine(
      stderr,
      'echoctl init: non-interactive — a TTY is required. Pipe-driven onboarding via an answer file is a future item.',
    );
    return 2;
  }

  try {
    const mcpServerUrl = `http://127.0.0.1:${resolveMcpPort()}/mcp`;
    const echoVersion = readPackageVersion(opts.packageJsonPath);
    const wizard = (opts.wizardFactory ?? createWizard)({
      mcpServerUrl,
      echoVersion,
      now: opts.now,
    });
    const prompt = opts.prompt ?? makeTtyPrompt();
    const color = opts.color ?? false;

    if (
      !(await prompt.readConfirm('Welcome to ECHO setup. This takes about two minutes.', {
        default: true,
      }))
    ) {
      return 0;
    }

    const agents = await wizard.detectAgents();
    if (opts.json) emitJson(opts, { event: 'init.detect-agents', agents });
    else emitText(opts, renderDetectedAgents(agents, { color }));
    const defaultAgents = agents
      .filter((agent) => agent.confidence === 'high' || agent.confidence === 'medium')
      .map((agent) => agent.kind);
    const selectedAgents = parseAgentSelection(
      await prompt.readPrompt('Confirm subset to wire', { default: defaultAgents.join(',') }),
      defaultAgents,
    );

    const projects = await wizard.detectProjects();
    if (opts.json) emitJson(opts, { event: 'init.detect-projects', projects });
    else emitText(opts, renderDetectedProjects(projects, { color }));
    const projectAnswer = await prompt.readPrompt('Pick default project', { default: '' });
    const projectIdx = Number.parseInt(projectAnswer, 10);
    const defaultProjectRepoRoot =
      Number.isInteger(projectIdx) && projectIdx >= 1 && projectIdx <= projects.length
        ? projects[projectIdx - 1]!.repoRoot
        : null;

    let wire = await wizard.wire({ selectedAgents, defaultProjectRepoRoot });
    if (wire.syncResult.repoRoot !== undefined) {
      const repoRoot = await prompt.readPrompt(
        'ECHO could not locate its source tree. Pass an explicit path',
      );
      wire = await wizard.wire({ selectedAgents, defaultProjectRepoRoot, repoRoot });
      if (wire.syncResult.repoRoot !== undefined) {
        writeLine(stderr, wire.syncResult.repoRoot.message);
        return 1;
      }
    }
    if (opts.json) emitJson(opts, { event: 'init.wire', result: wire });
    else emitText(opts, renderWireResult(wire, { color }));
    const failure = topLevelFailure(wire);
    if (failure !== null) {
      writeLine(stderr, failure);
      return 1;
    }

    populateCapabilitiesForWiredAgents(wire, selectedAgents);
    const probes = await wizard.probe(selectedAgents);
    if (opts.json) emitJson(opts, { event: 'init.probe', outcomes: probes });
    else {
      emitText(
        opts,
        renderProbeOutcomes(probes, { color, remediation: buildRemediationCopy(mcpServerUrl) }),
      );
    }
    await wizard.markCompleted();
    if (opts.json)
      emitJson(
        opts,
        { event: 'init.done', onboardingStatePath: ECHO_HOME_PATHS.stateOnboarding },
        true,
      );
    else {
      emitText(
        opts,
        `You're ready. Try \`echoctl run <workflow>\`; onboarding state: ${ECHO_HOME_PATHS.stateOnboarding}; uninstall: echoctl uninstall`,
      );
    }
    return 0;
  } catch (err) {
    writeLine(stderr, (err as Error).message);
    return 1;
  }
}
