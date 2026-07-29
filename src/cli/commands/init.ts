import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { atomicWrite } from '../../echo-home/adapters/atomic-write.js';
import {
  ECHO_HOME_PATHS,
  setEchoHomeRoot,
  validateOnboardingState,
  type InstallProfile,
  type McpPortSource,
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
import { ensureEchoHome } from '../../echo-home/scaffold.js';
import {
  DaemonCommandError,
  ensureDaemonRunning,
  type DaemonBringupResult,
  type DaemonControlOptions,
} from './daemon.js';
import { claudeCodeMcpAddCommand } from '../../echo-home/adapters/claude-code-mcp.js';
import { parseJson, readJsonFile } from '../../util/json.js';

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
  home?: string;
  port?: string;
  profile?: InstallProfile;
  label?: string;
  answerFile?: string;
  force?: boolean;
  stdin?: { isTTY?: boolean };
  stdout?: Pick<NodeJS.WritableStream, 'write'>;
  stderr?: Pick<NodeJS.WritableStream, 'write'>;
  wizardFactory?: WizardFactory;
  prompt?: PromptImpl;
  now?: () => Date;
  packageJsonPath?: string;
  daemonOptions?: DaemonControlOptions;
  portResolution?: ResolveMcpPortDeps;
}

export type RemediationCopy = Record<
  Exclude<ProbeOutcome, { probed: true }>['reason'],
  (outcome: Extract<ProbeOutcome, { probed: false }>) => string
>;

export interface InitAnswerFile {
  confirm_setup: boolean;
  selected_agents: AgentKind[];
  default_project_repo_root: string | null;
  profile?: InstallProfile;
  repo_root?: string;
}

interface LoadedAnswerFile {
  path: string;
  answers: InitAnswerFile;
}

export const INIT_HELP = `Usage: echoctl init [--json] [--quiet] [--home <path>] [--port <n>] [--profile customer|dogfood] [--label <id>] [--answer-file <path>] [--force]

Options:
  --home <path>          ECHO_HOME for this init run
  --port <n>             MCP server port written to adapter configs and launchd
  --profile <name>       Install profile: customer (default) or dogfood
  --label <id>           launchd label used when ensuring the daemon is running
  --answer-file <path>   non-interactive JSON answers
  --force                Replace existing ECHO marker blocks in adapter configs.
                         Outside-marker content is preserved. Use for upgrade
                         or re-onboarding scenarios.

Answer-file JSON schema:
  {
    "confirm_setup": true,
    "selected_agents": ["codex", "claude-code", "cursor"],
    "profile": "customer",
    "default_project_repo_root": null,
    "repo_root": "/Users/me/Desktop/Project_echo"
  }

Required fields: confirm_setup, selected_agents, default_project_repo_root.
Optional fields: profile, repo_root. repo_root is only needed if init cannot locate ECHO's source tree.`;

const ANSWER_REQUIRED_FIELDS = [
  'confirm_setup',
  'selected_agents',
  'default_project_repo_root',
] as const;
const ANSWER_OPTIONAL_FIELDS = ['profile', 'repo_root'] as const;
const ANSWER_FIELDS = new Set<string>([...ANSWER_REQUIRED_FIELDS, ...ANSWER_OPTIONAL_FIELDS]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

function failAnswerFile(filePath: string, field: string, message: string): never {
  throw new Error(`${filePath}: ${field}: ${message}; see \`echoctl init --help\` for schema`);
}

export function parsePort(value: string, flag = '--port'): number {
  if (!/^[0-9]+$/.test(value)) throw new Error(`invalid ${flag}: ${value}`);
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0 || n > 65535) {
    throw new Error(`invalid ${flag}: ${value}`);
  }
  return n;
}

export const MCP_PORT_PROBE_ORDER = [39478, 38478] as const;
export const DEFAULT_MCP_PORT = 38478;

export interface HealthzProbeOutcome {
  healthy: boolean;
  runtimeVersion: string | null;
}

export interface ResolvedMcpPort {
  port: number;
  source: McpPortSource;
  runtimeVersion: string | null;
}

export interface ResolveMcpPortDeps {
  flagPort?: number;
  env?: Record<string, string | undefined>;
  readRecordedPort?: () => number | null;
  probeHealthz?: (port: number) => Promise<HealthzProbeOutcome>;
  warn?: (line: string) => void;
}

function envMcpPort(env: Record<string, string | undefined>): number | undefined {
  const raw = env['ECHO_MCP_PORT'];
  if (raw === undefined || raw.length === 0) return undefined;
  try {
    return parsePort(raw, 'ECHO_MCP_PORT');
  } catch {
    return undefined;
  }
}

export function readRecordedBoundPort(): number | null {
  if (!existsSync(ECHO_HOME_PATHS.stateOnboarding)) return null;
  try {
    const raw = readJsonFile(ECHO_HOME_PATHS.stateOnboarding);
    if (!isRecord(raw)) return null;
    const port = raw['bound_port'];
    if (typeof port !== 'number' || !Number.isSafeInteger(port) || port <= 0 || port > 65535) {
      return null;
    }
    return port;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  init: Parameters<typeof fetch>[1],
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function extractRuntimeVersion(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const components = payload['components'];
  if (isRecord(components)) {
    const runtime = components['runtime'];
    if (isRecord(runtime)) {
      const details = runtime['details'];
      if (isRecord(details) && typeof details['version'] === 'string') return details['version'];
    }
  }
  return typeof payload['version'] === 'string' ? payload['version'] : null;
}

export async function probeDaemonHealthz(port: number): Promise<HealthzProbeOutcome> {
  let response: Response;
  try {
    response = await fetchWithTimeout(`http://127.0.0.1:${port}/healthz`, { method: 'GET' }, 2000);
  } catch {
    return { healthy: false, runtimeVersion: null };
  }
  if (response.ok) {
    let payload: unknown = null;
    try {
      payload = (await response.json()) as unknown;
    } catch {
      payload = null;
    }
    return { healthy: true, runtimeVersion: extractRuntimeVersion(payload) };
  }
  // Older daemons predate /healthz; a successful MCP initialize still proves liveness.
  try {
    const mcpResponse = await fetchWithTimeout(
      `http://127.0.0.1:${port}/mcp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'echoctl-init', version: readPackageVersion() },
          },
          id: 1,
        }),
      },
      2000,
    );
    return {
      healthy: mcpResponse.status >= 200 && mcpResponse.status < 300,
      runtimeVersion: null,
    };
  } catch {
    return { healthy: false, runtimeVersion: null };
  }
}

export async function resolveMcpPort(deps: ResolveMcpPortDeps = {}): Promise<ResolvedMcpPort> {
  const probe = deps.probeHealthz ?? probeDaemonHealthz;
  if (deps.flagPort !== undefined) {
    const outcome = await probe(deps.flagPort);
    return { port: deps.flagPort, source: 'flag', runtimeVersion: outcome.runtimeVersion };
  }
  const envPort = envMcpPort(deps.env ?? process.env);
  if (envPort !== undefined) {
    const outcome = await probe(envPort);
    return { port: envPort, source: 'env', runtimeVersion: outcome.runtimeVersion };
  }
  const recorded = (deps.readRecordedPort ?? readRecordedBoundPort)();
  if (recorded !== null) {
    const outcome = await probe(recorded);
    return { port: recorded, source: 'record', runtimeVersion: outcome.runtimeVersion };
  }
  for (const candidate of MCP_PORT_PROBE_ORDER) {
    const outcome = await probe(candidate);
    if (outcome.healthy) {
      return { port: candidate, source: 'probe', runtimeVersion: outcome.runtimeVersion };
    }
  }
  const warn = deps.warn ?? ((line: string): void => void process.stderr.write(`${line}\n`));
  warn(
    `echoctl: no live ECHO daemon found on ports ${MCP_PORT_PROBE_ORDER.join(' or ')}; defaulting to ${DEFAULT_MCP_PORT}. Start the daemon (\`echoctl daemon start\`) or set ECHO_MCP_PORT.`,
  );
  return { port: DEFAULT_MCP_PORT, source: 'default', runtimeVersion: null };
}

export function resolveMcpPortSync(): number {
  const envPort = envMcpPort(process.env);
  if (envPort !== undefined) return envPort;
  return readRecordedBoundPort() ?? DEFAULT_MCP_PORT;
}

function parseNonEmptyOption(value: string | undefined, flag: string): string | undefined {
  if (value === undefined) return undefined;
  if (value.trim().length === 0) throw new Error(`invalid ${flag}: expected non-empty string`);
  return value;
}

function parseProfile(value: string | undefined, flag = '--profile'): InstallProfile | undefined {
  if (value === undefined) return undefined;
  if (value === 'customer' || value === 'dogfood') return value;
  throw new Error(`invalid ${flag}: expected customer or dogfood`);
}

export function parseInitArgs(
  args: readonly string[],
): Pick<InitOpts, 'answerFile' | 'force' | 'home' | 'label' | 'port' | 'profile'> {
  const parsed = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: false,
    options: {
      home: { type: 'string' },
      port: { type: 'string' },
      profile: { type: 'string' },
      label: { type: 'string' },
      'answer-file': { type: 'string' },
      force: { type: 'boolean', default: false },
    },
  });
  const port = parseNonEmptyOption(parsed.values.port, '--port');
  if (port !== undefined) parsePort(port);
  return {
    home: parseNonEmptyOption(parsed.values.home, '--home'),
    port,
    profile: parseProfile(parseNonEmptyOption(parsed.values.profile, '--profile')),
    label: parseNonEmptyOption(parsed.values.label, '--label'),
    answerFile: parseNonEmptyOption(parsed.values['answer-file'], '--answer-file'),
    force: parsed.values.force === true,
  };
}

function validateAnswerFile(filePath: string, value: unknown): InitAnswerFile {
  if (!isRecord(value)) failAnswerFile(filePath, 'root', 'expected object');
  for (const key of Object.keys(value)) {
    if (!ANSWER_FIELDS.has(key)) failAnswerFile(filePath, key, 'unknown field');
  }
  for (const field of ANSWER_REQUIRED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) {
      failAnswerFile(filePath, field, 'missing required field');
    }
  }
  if (typeof value['confirm_setup'] !== 'boolean') {
    failAnswerFile(filePath, 'confirm_setup', 'expected boolean');
  }
  if (!Array.isArray(value['selected_agents'])) {
    failAnswerFile(filePath, 'selected_agents', 'expected array of agent kinds');
  }
  const selectedAgents: AgentKind[] = [];
  for (let i = 0; i < value['selected_agents'].length; i++) {
    const agent = value['selected_agents'][i];
    if (typeof agent !== 'string' || !isAgentKind(agent)) {
      failAnswerFile(filePath, `selected_agents[${i}]`, 'expected codex, claude-code, or cursor');
    }
    selectedAgents.push(agent);
  }
  const defaultProject = value['default_project_repo_root'];
  if (defaultProject !== null && typeof defaultProject !== 'string') {
    failAnswerFile(filePath, 'default_project_repo_root', 'expected string or null');
  }
  if (typeof defaultProject === 'string' && defaultProject.trim().length === 0) {
    failAnswerFile(filePath, 'default_project_repo_root', 'expected non-empty string or null');
  }
  const profile = value['profile'];
  if (profile !== undefined && profile !== 'customer' && profile !== 'dogfood') {
    failAnswerFile(filePath, 'profile', 'expected customer or dogfood');
  }
  const repoRoot = value['repo_root'];
  if (repoRoot !== undefined && (typeof repoRoot !== 'string' || repoRoot.trim().length === 0)) {
    failAnswerFile(filePath, 'repo_root', 'expected non-empty string');
  }
  return {
    confirm_setup: value['confirm_setup'],
    selected_agents: selectedAgents,
    default_project_repo_root: defaultProject,
    ...(profile === undefined ? {} : { profile: profile as InstallProfile }),
    ...(repoRoot === undefined ? {} : { repo_root: repoRoot }),
  };
}

function loadAnswerFile(path: string): LoadedAnswerFile {
  const resolvedPath = resolve(path);
  let raw: string;
  try {
    raw = readFileSync(resolvedPath, 'utf8');
  } catch (err) {
    if (isErrnoException(err) && err.code === 'ENOENT') {
      failAnswerFile(resolvedPath, 'file', 'not found');
    }
    failAnswerFile(resolvedPath, 'file', `failed to read: ${(err as Error).message}`);
  }
  try {
    return { path: resolvedPath, answers: validateAnswerFile(resolvedPath, parseJson(raw)) };
  } catch (err) {
    if (err instanceof SyntaxError) {
      failAnswerFile(resolvedPath, 'root', `invalid JSON: ${err.message}`);
    }
    throw err;
  }
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
      `Claude Code could not use the user-scope ECHO MCP registration. Run \`${claudeCodeMcpAddCommand(mcpServerUrl)}\` and then \`echoctl doctor\`.`,
    timeout: (outcome) =>
      `${outcome.agent} took longer than 30s to respond. Re-run \`echoctl doctor\` once if this persists.`,
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
  const raw = readJsonFile(ECHO_HOME_PATHS.stateOnboarding);
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

function readRecordedProfile(): {
  exists: boolean;
  profile: InstallProfile | null;
  validShape: boolean;
} {
  if (!existsSync(ECHO_HOME_PATHS.stateOnboarding)) {
    return { exists: false, profile: null, validShape: true };
  }
  try {
    const raw = readJsonFile(ECHO_HOME_PATHS.stateOnboarding);
    if (!validateOnboardingState(raw)) {
      return { exists: true, profile: null, validShape: false };
    }
    return { exists: true, profile: raw.profile ?? null, validShape: true };
  } catch {
    return { exists: true, profile: null, validShape: false };
  }
}

function resolveInstallProfile(input: {
  cliProfile?: InstallProfile;
  answerProfile?: InstallProfile;
  recordedProfile: InstallProfile | null;
}): InstallProfile {
  return input.cliProfile ?? input.answerProfile ?? input.recordedProfile ?? 'customer';
}

function persistInstallProfile(profile: InstallProfile, now: Date): void {
  const state = readOnboardingState();
  state.profile = profile;
  state.last_updated_at = now.toISOString();
  writeOnboardingState(state);
}

function persistBoundPortRecord(resolved: ResolvedMcpPort, now: Date): void {
  const state = readOnboardingState();
  state.bound_port = resolved.port;
  state.port_source = resolved.source;
  state.runtime_version = resolved.runtimeVersion;
  state.last_updated_at = now.toISOString();
  writeOnboardingState(state);
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

function renderDaemonBringup(result: DaemonBringupResult): string {
  switch (result.action) {
    case 'installed-and-started':
      return `Daemon installed and started on port ${result.port}.`;
    case 'started':
      return `Daemon started on port ${result.port}.`;
    case 'already-running':
      return `Daemon already running on port ${result.port}.`;
  }
}

function daemonFailureCopy(err: DaemonCommandError): string {
  return `daemon ${err.verb} failed: ${err.message}. Run \`echoctl daemon ${err.verb}\` manually with the same --home/--port/--label flags after addressing.`;
}

export async function runInit(opts: InitOpts = {}): Promise<number> {
  const stderr = opts.stderr ?? process.stderr;
  let answerFile: LoadedAnswerFile | null = null;
  let resolvedPort: ResolvedMcpPort;
  let mcpPort: number;
  let installProfile: InstallProfile = 'customer';
  let warnProfileDefault = false;
  try {
    if (opts.home !== undefined) setEchoHomeRoot(opts.home);
    resolvedPort = await resolveMcpPort({
      warn: (line) => writeLine(stderr, line),
      ...(opts.portResolution ?? {}),
      ...(opts.port === undefined ? {} : { flagPort: parsePort(opts.port) }),
    });
    mcpPort = resolvedPort.port;
    if (opts.answerFile !== undefined) answerFile = loadAnswerFile(opts.answerFile);
    const recorded = readRecordedProfile();
    installProfile = resolveInstallProfile({
      cliProfile: opts.profile,
      answerProfile: answerFile?.answers.profile,
      recordedProfile: recorded.profile,
    });
    warnProfileDefault =
      opts.profile === undefined &&
      answerFile?.answers.profile === undefined &&
      recorded.exists &&
      recorded.validShape &&
      recorded.profile === null;
  } catch (err) {
    writeLine(stderr, (err as Error).message);
    return 2;
  }

  if (answerFile === null && opts.stdin?.isTTY !== true && process.stdin.isTTY !== true) {
    writeLine(
      stderr,
      'echoctl init: non-interactive — a TTY is required unless --answer-file <path> is provided.',
    );
    return 2;
  }
  ensureEchoHome();
  persistInstallProfile(installProfile, opts.now?.() ?? new Date());
  if (warnProfileDefault) {
    writeLine(
      stderr,
      'echoctl init: onboarding profile was missing; defaulted to `customer`. Re-run `echoctl init --profile dogfood` to restore the full coordination surface.',
    );
  }

  try {
    const mcpServerUrl = `http://127.0.0.1:${mcpPort}/mcp`;
    const echoVersion = readPackageVersion(opts.packageJsonPath);
    const wizard = (opts.wizardFactory ?? createWizard)({
      mcpServerUrl,
      echoVersion,
      runtimeVersion: resolvedPort.runtimeVersion,
      now: opts.now,
    });
    const prompt = answerFile === null ? (opts.prompt ?? makeTtyPrompt()) : null;
    const color = opts.color ?? false;

    const shouldContinue =
      answerFile?.answers.confirm_setup ??
      (await prompt!.readConfirm('Welcome to ECHO setup. This takes about two minutes.', {
        default: true,
      }));
    if (!shouldContinue) {
      return 0;
    }

    const agents = await wizard.detectAgents();
    if (opts.json) emitJson(opts, { event: 'init.detect-agents', agents });
    else emitText(opts, renderDetectedAgents(agents, { color }));
    const defaultAgents = agents
      .filter((agent) => agent.confidence === 'high' || agent.confidence === 'medium')
      .map((agent) => agent.kind);
    const selectedAgents =
      answerFile?.answers.selected_agents ??
      parseAgentSelection(
        await prompt!.readPrompt('Confirm subset to wire', { default: defaultAgents.join(',') }),
        defaultAgents,
      );

    const projects = await wizard.detectProjects();
    if (opts.json) emitJson(opts, { event: 'init.detect-projects', projects });
    else emitText(opts, renderDetectedProjects(projects, { color }));
    let defaultProjectRepoRoot: string | null;
    if (answerFile !== null) {
      defaultProjectRepoRoot = answerFile.answers.default_project_repo_root;
    } else {
      const projectAnswer = await prompt!.readPrompt('Pick default project', { default: '' });
      const projectIdx = Number.parseInt(projectAnswer, 10);
      defaultProjectRepoRoot =
        Number.isInteger(projectIdx) && projectIdx >= 1 && projectIdx <= projects.length
          ? projects[projectIdx - 1]!.repoRoot
          : null;
    }

    let wire = await wizard.wire({
      selectedAgents,
      defaultProjectRepoRoot,
      profile: installProfile,
      force: opts.force === true,
    });
    if (wire.syncResult.repoRoot !== undefined) {
      let repoRoot: string;
      if (answerFile !== null && answerFile.answers.repo_root === undefined) {
        writeLine(
          stderr,
          `${answerFile.path}: repo_root: required because ECHO could not locate its source tree`,
        );
        return 2;
      }
      if (answerFile !== null) {
        repoRoot = answerFile.answers.repo_root!;
      } else {
        repoRoot = await prompt!.readPrompt(
          'ECHO could not locate its source tree. Pass an explicit path',
        );
      }
      wire = await wizard.wire({
        selectedAgents,
        defaultProjectRepoRoot,
        profile: installProfile,
        repoRoot,
        force: opts.force === true,
      });
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
    let daemonResult: DaemonBringupResult;
    try {
      daemonResult = await ensureDaemonRunning({
        ...opts.daemonOptions,
        label: opts.label ?? opts.daemonOptions?.label,
        home: ECHO_HOME_PATHS.root,
        port: String(mcpPort),
        probeDeadlineMs: opts.daemonOptions?.probeDeadlineMs ?? 30_000,
      });
    } catch (err) {
      if (err instanceof DaemonCommandError) {
        writeLine(stderr, daemonFailureCopy(err));
        return 1;
      }
      throw err;
    }
    if (opts.json) emitJson(opts, { event: 'init.daemon', result: daemonResult });
    else emitText(opts, renderDaemonBringup(daemonResult));
    let runtimeVersion = resolvedPort.runtimeVersion;
    if (runtimeVersion === null) {
      // The daemon may only have come up during bringup; capture its version now.
      const probe = opts.portResolution?.probeHealthz ?? probeDaemonHealthz;
      runtimeVersion = (await probe(mcpPort)).runtimeVersion;
    }
    persistBoundPortRecord(
      { port: mcpPort, source: resolvedPort.source, runtimeVersion },
      opts.now?.() ?? new Date(),
    );
    const completion = await wizard.markCompleted();
    if (opts.json)
      emitJson(
        opts,
        {
          event: 'init.done',
          onboardingStatePath: ECHO_HOME_PATHS.stateOnboarding,
          completed: completion.completed,
          unverified_agents: completion.unverifiedAgents,
        },
        true,
      );
    else if (completion.completed) {
      emitText(
        opts,
        `You're ready. Try \`echoctl run <workflow>\`; onboarding state: ${ECHO_HOME_PATHS.stateOnboarding}; uninstall: echoctl uninstall`,
      );
    } else {
      emitText(
        opts,
        `Setup finished, but onboarding is not marked complete: ${completion.unverifiedAgents.join(', ')} wired without a successful probe or a recorded error. Run \`echoctl doctor\` to verify, then re-run \`echoctl init\`. Onboarding state: ${ECHO_HOME_PATHS.stateOnboarding}`,
      );
    }
    return 0;
  } catch (err) {
    writeLine(stderr, (err as Error).message);
    return 1;
  }
}
