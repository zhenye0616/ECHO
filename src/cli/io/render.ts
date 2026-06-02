import type { DetectedAgent } from '../../echo-home/wizard/detect-agents.js';
import type { DetectedProject } from '../../echo-home/wizard/detect-projects.js';
import type { ProbeOutcome } from '../../echo-home/wizard/probe.js';
import type { WireResult } from '../../echo-home/wizard/wire.js';
import type { DoctorReport } from '../commands/doctor.js';
import type { buildRemediationCopy } from '../commands/init.js';

function status(ok: boolean, color: boolean): string {
  if (!color) return ok ? 'OK' : 'WARN';
  return ok ? '\x1b[32mOK\x1b[0m' : '\x1b[33mWARN\x1b[0m';
}

export function renderDetectedAgents(
  agents: readonly DetectedAgent[],
  opts: { color: boolean },
): string {
  if (agents.length === 0) return 'No agents detected.';
  return agents
    .map((agent, i) => {
      const signals = agent.signals;
      const activity = signals.atomActivity?.count ?? 0;
      return `${i + 1}. ${agent.kind} (${agent.confidence}) config=${signals.configFile.exists ? 'yes' : 'no'} activity=${activity} ${status(agent.confidence !== 'none', opts.color)}`;
    })
    .join('\n');
}

export function renderDetectedProjects(
  projects: readonly DetectedProject[],
  opts: { color: boolean },
): string {
  void opts;
  if (projects.length === 0) return 'No recent projects detected.';
  return projects
    .map((project, i) => `${i + 1}. ${project.repoRoot} (${project.atomCount} events)`)
    .join('\n');
}

export function renderWireResult(result: WireResult, opts: { color: boolean }): string {
  void opts;
  const lines = ['Wire result:'];
  if (result.syncResult.syncLock !== undefined) lines.push(result.syncResult.syncLock.message);
  if (result.syncResult.repoRoot !== undefined) lines.push(result.syncResult.repoRoot.message);
  if (result.syncResult.directorySymlink !== undefined) {
    lines.push(result.syncResult.directorySymlink.message);
  }
  for (const agent of result.syncResult.agents) {
    if (agent.ok) {
      lines.push(`- ${agent.agent}: ok (${agent.actions.map((a) => a.action).join(', ')})`);
    } else {
      const conflict = agent.conflicts[0];
      const err = agent.errors[0];
      lines.push(`- ${agent.agent}: conflict ${conflict?.kind ?? err?.message ?? 'unknown'}`);
      if (conflict !== undefined && 'unifiedDiff' in conflict && conflict.unifiedDiff) {
        lines.push(conflict.unifiedDiff);
      }
    }
  }
  return lines.join('\n');
}

export function renderProbeOutcomes(
  outcomes: readonly ProbeOutcome[],
  opts: { color: boolean; remediation: ReturnType<typeof buildRemediationCopy> },
): string {
  if (outcomes.length === 0) return 'No probes run.';
  return outcomes
    .map((outcome) => {
      if (outcome.probed)
        return `${outcome.agent}: ${status(true, opts.color)} ${outcome.latencyMs}ms`;
      const copy = opts.remediation[outcome.reason](outcome);
      return `${outcome.agent}: ${status(false, opts.color)} ${outcome.reason}\n${copy}`;
    })
    .join('\n');
}

export function renderDoctorReport(
  report: DoctorReport,
  opts: { color: boolean; remediation: ReturnType<typeof buildRemediationCopy> },
): string {
  const lines = [`ECHO doctor: ${report.overall}`];
  lines.push(
    `daemon: reachable=${report.daemon.mcpReachable ? 'yes' : 'no'} pid-lock=${report.daemon.pidLockHeld ? 'yes' : 'no'} port=${report.daemon.port}`,
  );
  lines.push(
    `echo-home: exists=${report.echoHome.exists ? 'yes' : 'no'} onboarding=${report.echoHome.onboardingValid ? 'valid' : 'invalid'} projects=${report.echoHome.projectsValid ? 'valid' : 'invalid'} schema=${report.echoHome.schemaVersion}`,
  );
  lines.push(`sync-lock: ${report.syncLock.present ? report.syncLock.cleanupCommand : 'absent'}`);
  for (const agent of report.agents) {
    if (agent.probeOutcome === null) {
      lines.push(`agent ${agent.kind}: not wired`);
    } else if (agent.probeOutcome.probed) {
      lines.push(`agent ${agent.kind}: ok`);
    } else {
      lines.push(`agent ${agent.kind}: ${agent.probeOutcome.reason}`);
      lines.push(opts.remediation[agent.probeOutcome.reason](agent.probeOutcome));
    }
  }
  if (report.overall !== 'healthy') {
    lines.push('Recommended actions: run `echoctl init` or follow the cleanup hints above.');
  }
  return lines.join('\n');
}
