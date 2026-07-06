import { basename } from 'node:path';
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
    `echo-home: exists=${report.echoHome.exists ? 'yes' : 'no'} onboarding=${report.echoHome.onboardingValid ? 'valid' : 'invalid'} projects=${report.echoHome.projectsValid ? 'valid' : 'invalid'} schema=${report.echoHome.schemaVersion} profile=${report.echoHome.profile}`,
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
  lines.push(...renderLoopLines(report));
  if (report.overall !== 'healthy') {
    lines.push('Recommended actions: run `echoctl init` or follow the cleanup hints above.');
  }
  return lines.join('\n');
}

// Loop observability (item 117): a read-only stations 1–3 health block rendered
// through the same doctor pipeline. Reuses the existing plain-line style; every
// degradation prints its severity, scope, detail, and copy-pasteable remediation.
export function renderLoopLines(report: DoctorReport): string[] {
  const loop = report.loop;
  const lines: string[] = [`loop: ${loop.status}`];

  const s1 = loop.station1;
  const cp = s1.granolaCheckpoint;
  lines.push(
    `loop station-1 capture: granola-checkpoint=${cp.present ? 'present' : 'absent'} high_water_mark=${cp.highWaterMark ?? 'none'} last_synced_at=${cp.lastSyncedAt ?? 'none'} ingested_notes=${cp.ingestedNoteCount ?? 'n/a'}`,
  );
  for (const src of s1.sources) {
    lines.push(`  ${src.sourceClass} count=${src.count} newest=${src.newestTimestamp ?? 'none'}`);
  }

  const s2 = loop.station2;
  const flag = s2.flags.neverRan ? 'never-ran' : s2.flags.stale ? 'stale' : 'active';
  const signals =
    s2.signalAtoms === null
      ? 'unavailable'
      : `${s2.signalAtoms.count}@${s2.signalAtoms.newestTimestamp ?? 'none'}`;
  lines.push(
    `loop station-2 signals: ${flag} checkpoint_mtime=${s2.checkpointMtimeIso ?? 'none'} failing_notes=${s2.failingNotes.length} signals=${signals}`,
  );
  for (const note of s2.failingNotes) {
    lines.push(
      `  failing-note ${note.noteId} last_failure_at=${note.lastFailureAt}${note.lastFailureReason !== undefined ? ` reason=${note.lastFailureReason}` : ''}`,
    );
  }

  const sv = loop.serving;
  lines.push(
    `loop serving: class=${sv.classification} listening_pid=${sv.listeningPid ?? 'none'} pid_lock=${sv.pidLockPid ?? 'none'} staleness=${sv.staleness} path=${sv.executingPath ?? 'none'}`,
  );

  const s3 = loop.station3;
  lines.push(
    `loop station-3 packet: intake_enabled=${s3.intakeEnabled} (doctor-env-only) team_decisions=${s3.teamDecisionsCount ?? 'n/a'}`,
  );
  if (s3.seedStores.length === 0) {
    lines.push('  seed-stores: none (not yet run)');
  } else {
    for (const store of s3.seedStores) {
      if (store.state === 'counted' && store.counts !== null) {
        lines.push(
          `  seed-store ${basename(store.path)}: pending=${store.counts.pending} posting=${store.counts.posting} posted=${store.counts.posted} failed=${store.counts.failed}`,
        );
      } else {
        lines.push(`  seed-store ${basename(store.path)}: ${store.state}`);
      }
    }
  }

  const degradations = [
    ...s1.degradations,
    ...s2.degradations,
    ...sv.degradations,
    ...s3.degradations,
  ];
  for (const d of degradations) {
    lines.push(`  [${d.severity}] ${d.scope}: ${d.detail}${d.path !== undefined ? ` (${d.path})` : ''}`);
    lines.push(`    remediation: ${d.remediation}`);
  }
  for (const note of [...s2.notes, ...s3.notes]) {
    lines.push(`  note: ${note}`);
  }
  return lines;
}
