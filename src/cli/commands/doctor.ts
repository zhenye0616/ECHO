import { execFile } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { resolveDataDir } from '../../daemon/lifecycle.js';
import {
  ECHO_HOME_PATHS,
  setEchoHomeRoot,
  validateOnboardingState,
  validateProjectsState,
  type InstallProfile,
  type OnboardedAgentProfile,
  type OnboardingState,
} from '../../echo-home/paths.js';
import { type AgentKind } from '../../echo-home/wizard/detect-agents.js';
import { probeAgents as realProbeAgents, type ProbeOutcome } from '../../echo-home/wizard/probe.js';
import { renderDoctorReport } from '../io/render.js';
import { buildRemediationCopy, parsePort, readPackageVersion, resolveMcpPort } from './init.js';

export interface DoctorReport {
  daemon: {
    running: boolean;
    port: number;
    mcpReachable: boolean;
    pidLockPath: string;
    pidLockHeld: boolean;
  };
  echoHome: {
    root: string;
    exists: boolean;
    onboardingValid: boolean;
    projectsValid: boolean;
    schemaVersion: 1 | 'mismatch' | 'missing';
    profile: InstallProfile | 'unknown';
  };
  syncLock: { present: boolean; path: string; mtimeIso?: string; cleanupCommand?: string };
  codexAdapter: {
    status: 'ok' | 'drifted' | 'check-error';
    detail?: string;
    remediationCommand?: string;
  };
  agents: {
    kind: AgentKind;
    profile: OnboardedAgentProfile | null;
    probeOutcome: ProbeOutcome | null;
  }[];
  overall: 'healthy' | 'degraded' | 'broken';
}

export interface DoctorOpts {
  json?: boolean;
  quiet?: boolean;
  color?: boolean;
  home?: string;
  port?: string | number;
  label?: string;
  stdout?: Pick<NodeJS.WritableStream, 'write'>;
  stderr?: Pick<NodeJS.WritableStream, 'write'>;
  probeAgents?: typeof realProbeAgents;
  codexAdapterCheck?: () => Promise<DoctorReport['codexAdapter']>;
  fetch?: typeof fetch;
  now?: () => Date;
  platform?: NodeJS.Platform;
}

export const DOCTOR_HELP = `Usage: echoctl doctor [--json] [--quiet] [--home <path>] [--port <n>] [--label <id>]

Options:
  --home <path>   ECHO_HOME for this doctor run
  --port <n>      MCP server port to probe
  --label <id>    accepted for daemon-isolation parity; doctor does not query launchd`;

function writeLine(stream: Pick<NodeJS.WritableStream, 'write'>, line: string): void {
  stream.write(`${line}\n`);
}

export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function isAgentKind(value: string): value is AgentKind {
  return value === 'codex' || value === 'claude-code' || value === 'cursor';
}

function parseNonEmptyOption(value: string | undefined, flag: string): string | undefined {
  if (value === undefined) return undefined;
  if (value.trim().length === 0) throw new Error(`invalid ${flag}: expected non-empty string`);
  return value;
}

export function parseDoctorArgs(
  args: readonly string[],
): Pick<DoctorOpts, 'home' | 'label' | 'port'> {
  const parsed = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: false,
    options: {
      home: { type: 'string' },
      port: { type: 'string' },
      label: { type: 'string' },
    },
  });
  const port = parseNonEmptyOption(parsed.values.port, '--port');
  if (port !== undefined) parsePort(port);
  return {
    home: parseNonEmptyOption(parsed.values.home, '--home'),
    port,
    label: parseNonEmptyOption(parsed.values.label, '--label'),
  };
}

function resolveDoctorPort(port: DoctorOpts['port']): number {
  if (port === undefined) return resolveMcpPort();
  if (typeof port === 'number') return port;
  return parsePort(port);
}

function readValidOnboarding(): OnboardingState | null {
  try {
    const raw = JSON.parse(readFileSync(ECHO_HOME_PATHS.stateOnboarding, 'utf8')) as unknown;
    return validateOnboardingState(raw) ? raw : null;
  } catch {
    return null;
  }
}

const SAFE_SUBPROCESS_PATH = '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin';

function repoRootFromModule(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../../..');
}

function resolveCodexInstallerPath(): string {
  return join(repoRootFromModule(), 'tools/install-echo-codex-skills.sh');
}

export interface CodexAdapterChildOutcome {
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  spawnError?: string;
}

function runCodexInstallerCheck(installerPath: string): Promise<CodexAdapterChildOutcome> {
  return new Promise((resolve) => {
    execFile(
      installerPath,
      ['--check'],
      {
        cwd: repoRootFromModule(),
        encoding: 'utf8',
        env: { ...process.env, PATH: SAFE_SUBPROCESS_PATH },
        timeout: 30_000,
      },
      (error, stdout, stderr) => {
        const err = error as
          | (Error & { code?: number | string | null; signal?: string | null })
          | null;
        resolve({
          exitCode: err === null ? 0 : typeof err.code === 'number' ? err.code : null,
          signal: err?.signal ?? null,
          stdout: String(stdout ?? ''),
          stderr: String(stderr ?? ''),
          spawnError: err !== null && typeof err.code === 'string' ? err.message : undefined,
        });
      },
    );
  });
}

function nonEmptyDetail(primary: string, fallback: string): string {
  const detail = primary.trim();
  return detail.length > 0 ? detail : fallback;
}

export function codexAdapterReportFromOutcome(
  outcome: CodexAdapterChildOutcome,
  installerPath: string,
): DoctorReport['codexAdapter'] {
  const remediationCommand = installerPath;
  if (outcome.exitCode === 0) {
    return { status: 'ok', detail: nonEmptyDetail(outcome.stdout, 'Codex adapter check passed') };
  }
  if (outcome.exitCode === 1) {
    return {
      status: 'drifted',
      detail: nonEmptyDetail(outcome.stdout, 'Codex adapter drift detected'),
      remediationCommand,
    };
  }
  const fallback =
    outcome.spawnError ??
    (outcome.signal !== null
      ? `Codex adapter check terminated by signal ${outcome.signal}`
      : `Codex adapter check exited ${outcome.exitCode ?? 'without an exit code'}`);
  return {
    status: 'check-error',
    detail: nonEmptyDetail(outcome.stderr, fallback),
    remediationCommand,
  };
}

export async function checkCodexAdapter(): Promise<DoctorReport['codexAdapter']> {
  const installerPath = resolveCodexInstallerPath();
  return codexAdapterReportFromOutcome(await runCodexInstallerCheck(installerPath), installerPath);
}

function renderCodexAdapterLines(report: DoctorReport): string[] {
  const check = report.codexAdapter;
  const lines = [`codex-adapter: ${check.status}`];
  if (check.detail !== undefined && check.detail.length > 0) lines.push(check.detail);
  if (check.status !== 'ok' && check.remediationCommand !== undefined) {
    lines.push(`remediation: ${check.remediationCommand}`);
  }
  return lines;
}

function renderDoctorWithCodexAdapter(
  report: DoctorReport,
  opts: { color: boolean; remediation: ReturnType<typeof buildRemediationCopy> },
): string {
  return [renderDoctorReport(report, opts), ...renderCodexAdapterLines(report)].join('\n');
}

function stateVersion(): {
  onboardingValid: boolean;
  projectsValid: boolean;
  schemaVersion: 1 | 'mismatch' | 'missing';
  profile: InstallProfile | 'unknown';
  onboarding: OnboardingState | null;
} {
  let onboardingValid = false;
  let projectsValid = false;
  let missing = false;
  let onboarding: OnboardingState | null = null;
  try {
    const raw = JSON.parse(readFileSync(ECHO_HOME_PATHS.stateOnboarding, 'utf8')) as unknown;
    onboardingValid = validateOnboardingState(raw);
    if (onboardingValid) onboarding = raw as OnboardingState;
  } catch {
    missing = true;
  }
  try {
    const raw = JSON.parse(readFileSync(ECHO_HOME_PATHS.stateProjects, 'utf8')) as unknown;
    projectsValid = validateProjectsState(raw);
  } catch {
    missing = true;
  }
  return {
    onboardingValid,
    projectsValid,
    schemaVersion: missing ? 'missing' : onboardingValid && projectsValid ? 1 : 'mismatch',
    profile: onboardingValid ? (onboarding?.profile ?? 'customer') : 'unknown',
    onboarding,
  };
}

async function probeMcp(fetchImpl: typeof fetch, port: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}/mcp`, {
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
          clientInfo: { name: 'echoctl-doctor', version: readPackageVersion() },
        },
        id: 1,
      }),
      signal: controller.signal,
    });
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function computeOverall(report: DoctorReport): 'healthy' | 'degraded' | 'broken' {
  if (
    !report.echoHome.exists ||
    report.echoHome.schemaVersion === 'mismatch' ||
    report.echoHome.schemaVersion === 'missing'
  ) {
    return 'broken';
  }
  if (!report.daemon.pidLockHeld && !report.daemon.mcpReachable) return 'broken';
  if (report.daemon.pidLockHeld && !report.daemon.mcpReachable) return 'degraded';
  if (report.syncLock.present) return 'degraded';
  if (report.codexAdapter.status !== 'ok') return 'degraded';
  for (const agent of report.agents) {
    const outcome = agent.probeOutcome;
    if (agent.profile?.wired_at === null || outcome === null) continue;
    if (!outcome.probed && outcome.reason !== 'manual-only') return 'degraded';
  }
  return 'healthy';
}

export async function buildDoctorReport(opts: DoctorOpts = {}): Promise<DoctorReport> {
  if (opts.home !== undefined) setEchoHomeRoot(opts.home);
  const port = resolveDoctorPort(opts.port);
  const platform = opts.platform ?? process.platform;
  const dataDir = resolveDataDir({ platform });
  const pidLockPath =
    platform === 'win32' ? win32.join(dataDir, 'daemon.pid') : join(dataDir, 'daemon.pid');
  const pidLockHeld = existsSync(pidLockPath);
  const mcpReachable = await probeMcp(opts.fetch ?? fetch, port);
  const echoHomeExists = existsSync(ECHO_HOME_PATHS.root);
  const state = echoHomeExists
    ? stateVersion()
    : {
        onboardingValid: false,
        projectsValid: false,
        schemaVersion: 'missing' as const,
        profile: 'unknown' as const,
        onboarding: null,
      };

  const syncLockPath = join(ECHO_HOME_PATHS.state, 'adapter-sync.lock');
  const syncLock: DoctorReport['syncLock'] = { present: false, path: syncLockPath };
  if (existsSync(syncLockPath)) {
    const mtimeIso = (opts.now?.() ?? statSync(syncLockPath).mtime).toISOString();
    syncLock.present = true;
    syncLock.mtimeIso = mtimeIso;
    syncLock.cleanupCommand = `rm -- ${shellQuote(syncLockPath)}`;
  }

  const probe = opts.probeAgents ?? realProbeAgents;
  const codexAdapter = await (opts.codexAdapterCheck ?? checkCodexAdapter)();
  const onboarding = state.onboarding ?? readValidOnboarding();
  const agents: DoctorReport['agents'] = [];
  if (onboarding !== null) {
    for (const profile of onboarding.agents) {
      if (!isAgentKind(profile.id)) continue;
      const probeOutcome =
        profile.wired_at === null ? null : ((await probe([profile.id]))[0] ?? null);
      agents.push({ kind: profile.id, profile, probeOutcome });
    }
  }

  const report: DoctorReport = {
    daemon: {
      running: mcpReachable,
      port,
      mcpReachable,
      pidLockPath,
      pidLockHeld,
    },
    echoHome: {
      root: ECHO_HOME_PATHS.root,
      exists: echoHomeExists,
      onboardingValid: state.onboardingValid,
      projectsValid: state.projectsValid,
      schemaVersion: state.schemaVersion,
      profile: state.profile,
    },
    syncLock,
    codexAdapter,
    agents,
    overall: 'broken',
  };
  report.overall = computeOverall(report);
  return report;
}

export async function runDoctor(opts: DoctorOpts = {}): Promise<number> {
  const stderr = opts.stderr ?? process.stderr;
  let port: number;
  try {
    if (opts.home !== undefined) setEchoHomeRoot(opts.home);
    if (opts.label !== undefined) parseNonEmptyOption(opts.label, '--label');
    port = resolveDoctorPort(opts.port);
  } catch (err) {
    writeLine(stderr, (err as Error).message);
    return 2;
  }

  try {
    const report = await buildDoctorReport({ ...opts, home: undefined, port });
    if (!opts.quiet) {
      if (opts.json) writeLine(opts.stdout ?? process.stdout, JSON.stringify(report));
      else
        writeLine(
          opts.stdout ?? process.stdout,
          renderDoctorWithCodexAdapter(report, {
            color: opts.color ?? false,
            remediation: buildRemediationCopy(`http://127.0.0.1:${port}/mcp`),
          }),
        );
    }
    return report.overall === 'healthy' ? 0 : 1;
  } catch (err) {
    writeLine(stderr, (err as Error).message);
    return 1;
  }
}
