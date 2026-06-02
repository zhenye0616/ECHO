import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { resolveDataDir } from '../../daemon/lifecycle.js';
import {
  ECHO_HOME_PATHS,
  setEchoHomeRoot,
  validateOnboardingState,
  validateProjectsState,
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
  };
  syncLock: { present: boolean; path: string; mtimeIso?: string; cleanupCommand?: string };
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
  fetch?: typeof fetch;
  now?: () => Date;
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

export function parseDoctorArgs(args: readonly string[]): Pick<DoctorOpts, 'home' | 'label' | 'port'> {
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

function stateVersion(): {
  onboardingValid: boolean;
  projectsValid: boolean;
  schemaVersion: 1 | 'mismatch' | 'missing';
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
  const pidLockPath = join(resolveDataDir(), 'daemon.pid');
  const pidLockHeld = existsSync(pidLockPath);
  const mcpReachable = await probeMcp(opts.fetch ?? fetch, port);
  const echoHomeExists = existsSync(ECHO_HOME_PATHS.root);
  const state = echoHomeExists
    ? stateVersion()
    : {
        onboardingValid: false,
        projectsValid: false,
        schemaVersion: 'missing' as const,
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
    },
    syncLock,
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
          renderDoctorReport(report, {
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
