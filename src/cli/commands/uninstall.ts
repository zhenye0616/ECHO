import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  ECHO_HOME_PATHS,
  validateOnboardingState,
  type OnboardingState,
} from '../../echo-home/paths.js';
import type { AgentKind } from '../../echo-home/wizard/detect-agents.js';
import { makeTtyPrompt, type PromptImpl } from '../io/prompt.js';
import { removeCodexMcpEntry } from '../inverse/codex-config.js';
import { removeCursorMcpEntry } from '../inverse/cursor-config.js';
import { stripEchoMarkers } from '../inverse/markers.js';
import { removeEchoClaudeSkills } from '../inverse/skills.js';

export interface UninstallOpts {
  purgeState?: boolean;
  forcePurge?: boolean;
  yes?: boolean;
  json?: boolean;
  quiet?: boolean;
  prompt?: PromptImpl;
  homeDir?: string;
  stdout?: Pick<NodeJS.WritableStream, 'write'>;
  stderr?: Pick<NodeJS.WritableStream, 'write'>;
}

export interface CleanupConflict {
  agent: AgentKind;
  file: string;
  reason: string;
}

interface CleanupSummary {
  cleanupConflicts: CleanupConflict[];
  actions: string[];
  purged: boolean;
}

function writeLine(stream: Pick<NodeJS.WritableStream, 'write'>, line: string): void {
  stream.write(`${line}\n`);
}

function isAgentKind(value: string): value is AgentKind {
  return value === 'codex' || value === 'claude-code' || value === 'cursor';
}

function readState(): OnboardingState | null {
  try {
    const raw = JSON.parse(readFileSync(ECHO_HOME_PATHS.stateOnboarding, 'utf8')) as unknown;
    return validateOnboardingState(raw) ? raw : null;
  } catch {
    return null;
  }
}

function skillNames(): string[] {
  try {
    return readdirSync(ECHO_HOME_PATHS.skills)
      .filter((entry) => entry.endsWith('.md'))
      .map((entry) => entry.slice(0, -'.md'.length))
      .sort();
  } catch {
    return [];
  }
}

function recordMarker(summary: CleanupSummary, agent: AgentKind, filePath: string): void {
  const result = stripEchoMarkers({ filePath });
  summary.actions.push(`${agent}: markers ${result.action} ${filePath}`);
  if (result.action === 'conflict') {
    summary.cleanupConflicts.push({ agent, file: filePath, reason: result.reason });
  }
}

function recordCodex(summary: CleanupSummary, filePath: string): void {
  const result = removeCodexMcpEntry({ filePath });
  summary.actions.push(`codex: config ${result.action} ${filePath}`);
  if (result.action === 'conflict') {
    summary.cleanupConflicts.push({
      agent: 'codex',
      file: filePath,
      reason: result.reason ?? 'conflict',
    });
  }
}

function recordCursor(summary: CleanupSummary, filePath: string): void {
  const result = removeCursorMcpEntry({ filePath });
  summary.actions.push(`cursor: config ${result.action} ${filePath}`);
  if (result.action === 'conflict') {
    summary.cleanupConflicts.push({
      agent: 'cursor',
      file: filePath,
      reason: result.reason ?? 'conflict',
    });
  }
}

async function confirmed(opts: UninstallOpts, message: string): Promise<boolean> {
  if (opts.yes) return true;
  return await (opts.prompt ?? makeTtyPrompt()).readConfirm(message, { default: false });
}

function emitSummary(opts: UninstallOpts, summary: CleanupSummary): void {
  if (opts.quiet) return;
  const stdout = opts.stdout ?? process.stdout;
  if (opts.json) {
    writeLine(stdout, JSON.stringify({ event: 'uninstall.summary', ...summary }));
    return;
  }
  for (const action of summary.actions) writeLine(stdout, action);
  if (summary.cleanupConflicts.length > 0) {
    writeLine(stdout, 'Cleanup conflicts:');
    for (const conflict of summary.cleanupConflicts) {
      writeLine(stdout, `- ${conflict.agent} ${conflict.file}: ${conflict.reason}`);
    }
  }
  writeLine(
    stdout,
    summary.purged ? 'Removed ECHO state.' : `ECHO state kept at ${ECHO_HOME_PATHS.root}`,
  );
}

export async function runUninstall(opts: UninstallOpts = {}): Promise<number> {
  const home = opts.homeDir ?? homedir();
  const state = readState();
  if (state === null || state.agents.length === 0) {
    if (!opts.quiet)
      writeLine(opts.stdout ?? process.stdout, 'Nothing to uninstall - no onboarding state found');
    return 0;
  }
  const wired = state.agents.filter((agent) => isAgentKind(agent.id) && agent.wired_at !== null);
  if (wired.length === 0) {
    if (!opts.quiet)
      writeLine(opts.stdout ?? process.stdout, 'Nothing to uninstall - no wired agents found');
    return 0;
  }
  if (!opts.yes) {
    const files = wired
      .map((agent) => {
        if (agent.id === 'codex')
          return [join(home, '.codex/AGENTS.md'), join(home, '.codex/config.toml')];
        if (agent.id === 'claude-code')
          return [join(home, '.claude/CLAUDE.md'), join(home, '.claude/commands')];
        return [join(home, '.cursor/mcp.json')];
      })
      .flat();
    writeLine(
      opts.stdout ?? process.stdout,
      `Files to inspect:\n${files.map((file) => `- ${file}`).join('\n')}`,
    );
    if (!(await confirmed(opts, 'Remove ECHO adapter writes?'))) return 0;
  }

  const summary: CleanupSummary = { cleanupConflicts: [], actions: [], purged: false };
  for (const agent of wired) {
    if (agent.id === 'codex') {
      recordMarker(summary, 'codex', join(home, '.codex/AGENTS.md'));
      recordCodex(summary, join(home, '.codex/config.toml'));
    } else if (agent.id === 'claude-code') {
      recordMarker(summary, 'claude-code', join(home, '.claude/CLAUDE.md'));
      const removed = removeEchoClaudeSkills({
        skillNames: skillNames(),
        targetDir: join(home, '.claude/commands'),
      });
      summary.actions.push(
        `claude-code: skills removed=${removed.removed.length} skipped=${removed.skipped.length}`,
      );
      for (const skipped of removed.skipped) {
        if (skipped.reason === 'user-modified' || skipped.reason === 'symlink') {
          summary.cleanupConflicts.push({
            agent: 'claude-code',
            file: join(home, '.claude/commands', skipped.filename),
            reason: skipped.reason,
          });
        }
      }
    } else if (agent.id === 'cursor') {
      recordCursor(summary, join(home, '.cursor/mcp.json'));
    }
  }

  if (opts.purgeState) {
    if (summary.cleanupConflicts.length > 0 && !opts.forcePurge) {
      writeLine(
        opts.stderr ?? process.stderr,
        `refusing --purge-state with cleanup conflicts; resolve manually or re-run with --force-purge`,
      );
      emitSummary(opts, summary);
      return 1;
    }
    if (summary.cleanupConflicts.length > 0 && opts.forcePurge) {
      writeLine(
        opts.stderr ?? process.stderr,
        'WARNING: purging state with residual ECHO config left behind',
      );
    }
    if (await confirmed(opts, 'Permanently remove ~/.echo state?')) {
      if (existsSync(ECHO_HOME_PATHS.root))
        rmSync(ECHO_HOME_PATHS.root, { recursive: true, force: true });
      summary.purged = true;
    }
  }

  emitSummary(opts, summary);
  return summary.cleanupConflicts.length > 0 && !opts.forcePurge ? 1 : 0;
}
