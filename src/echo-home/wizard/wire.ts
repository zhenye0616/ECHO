import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  syncAll as realSyncAll,
  type AdapterSyncProfile,
  type AgentResult,
  type SyncConflict,
  type SyncResult,
} from '../adapter-sync.js';
import type { ClaudeCodeMcpRegisterDeps } from '../adapters/claude-code-mcp.js';
import { atomicWrite } from '../adapters/atomic-write.js';
import { ECHO_HOME_PATHS, validateOnboardingState, type OnboardingState } from '../paths.js';
import { readAdapterCache, writeAdapterCache, type AdapterCacheRecord } from './adapter-cache.js';
import type { AgentKind } from './detect-agents.js';
import { renderEchoSection } from './render-echo-section.js';

export interface WireOpts {
  selectedAgents: AgentKind[];
  defaultProjectRepoRoot: string | null;
  mcpServerUrl: string;
  echoVersion: string;
  repoRoot?: string;
  force?: boolean;
  syncAll?: typeof realSyncAll;
  claudeCodeMcpRegistration?: ClaudeCodeMcpRegisterDeps;
  cache?: {
    read: (kind: AgentKind) => AdapterCacheRecord | null;
    write: (rec: AdapterCacheRecord) => void;
  };
  now?: Date;
}

export interface WireResult {
  syncResult: SyncResult;
  cacheUpdates: Array<{
    agent: AgentKind;
    action: 'written' | 'unchanged' | 'failed';
    error?: string;
  }>;
  onboardingStateUpdated: boolean;
}

const MARKER_AGENTS = new Set<AgentKind>(['codex', 'claude-code']);

function readState(): OnboardingState {
  const raw = JSON.parse(readFileSync(ECHO_HOME_PATHS.stateOnboarding, 'utf8')) as unknown;
  if (!validateOnboardingState(raw)) {
    throw new Error(
      `${ECHO_HOME_PATHS.stateOnboarding}: invalid onboarding state schema_version or shape`,
    );
  }
  return raw;
}

function writeState(state: OnboardingState): void {
  mkdirSync(dirname(ECHO_HOME_PATHS.stateOnboarding), { recursive: true });
  atomicWrite({
    filePath: ECHO_HOME_PATHS.stateOnboarding,
    content: `${JSON.stringify(state, null, 2)}\n`,
    secretSensitive: false,
  });
}

function conflictMessage(conflict: SyncConflict): string {
  if (conflict.kind === 'config') return `conflict on ${conflict.filePath}: config`;
  if (conflict.kind === 'marker') return `conflict on ${conflict.filePath}: marker`;
  if (conflict.kind === 'target-symlink') return `conflict on ${conflict.filePath}: target-symlink`;
  return `conflict on ${conflict.filePath}: marker block malformed; manual intervention required`;
}

function agentResult(syncResult: SyncResult, kind: AgentKind): AgentResult | undefined {
  return syncResult.agents.find((a) => a.agent === kind);
}

function isSuccessfulAgent(result: AgentResult | undefined): boolean {
  return result?.ok === true;
}

function buildProfiles(
  opts: WireOpts,
  nowIso: string,
  cache: NonNullable<WireOpts['cache']>,
): { profiles: AdapterSyncProfile[]; rendered: Map<AgentKind, string | null> } {
  const profiles: AdapterSyncProfile[] = [];
  const rendered = new Map<AgentKind, string | null>();

  for (const kind of opts.selectedAgents) {
    const prior = cache.read(kind);
    const echoSection = MARKER_AGENTS.has(kind)
      ? renderEchoSection({
          agent: kind,
          mcpServerUrl: opts.mcpServerUrl,
          echoVersion: opts.echoVersion,
          defaultProjectRepoRoot: opts.defaultProjectRepoRoot,
          renderedAt: nowIso,
        })
      : undefined;
    rendered.set(kind, echoSection ?? null);
    const mcpServerConfig =
      kind === 'codex' || kind === 'cursor' || kind === 'claude-code'
        ? { url: opts.mcpServerUrl }
        : undefined;
    profiles.push({
      kind,
      echoSection,
      previousEchoSection: prior?.echoSection ?? undefined,
      mcpServerConfig,
      previousMcpServerConfig: prior?.mcpServerConfig ?? undefined,
      claudeCodeMcpRegistration:
        kind === 'claude-code' ? opts.claudeCodeMcpRegistration : undefined,
      force: opts.force === true,
    });
  }

  return { profiles, rendered };
}

function emptyFailedSyncResult(message: string): SyncResult {
  return {
    skillsPopulated: { ok: false, sourceDir: '', targetDir: '', error: message },
    agents: [],
    roles: { results: [], rolesErrors: [] },
    overallOk: false,
  };
}

function topLevelSentinel(syncResult: SyncResult): boolean {
  return (
    syncResult.syncLock !== undefined ||
    syncResult.repoRoot !== undefined ||
    syncResult.directorySymlink !== undefined
  );
}

function updateOnboardingState(
  selectedAgents: AgentKind[],
  syncResult: SyncResult,
  nowIso: string,
): void {
  const state = readState();
  state.last_updated_at = nowIso;

  for (const kind of selectedAgents) {
    let profile = state.agents.find((agent) => agent.id === kind);
    if (profile === undefined) {
      profile = {
        id: kind,
        detected_at: nowIso,
        wired_at: null,
        probed_at: null,
        capabilities: [],
        wire_error: null,
      };
      state.agents.push(profile);
    }

    const result = agentResult(syncResult, kind);
    if (result?.ok === true) {
      profile.wired_at = nowIso;
      profile.wire_error = null;
    } else if (result?.ok === false) {
      if (result.errors[0] !== undefined) {
        profile.wire_error = result.errors[0].message;
      } else if (result.conflicts[0] !== undefined) {
        profile.wire_error = conflictMessage(result.conflicts[0]);
      } else {
        profile.wire_error = 'unknown wire failure';
      }
    }
  }

  writeState(state);
}

function updateProbeTimestamps(
  outcomes: Array<{ agent: AgentKind; probed: boolean }>,
  nowIso: string,
): void {
  const state = readState();
  state.last_updated_at = nowIso;
  for (const outcome of outcomes) {
    if (!outcome.probed) continue;
    let profile = state.agents.find((agent) => agent.id === outcome.agent);
    if (profile === undefined) {
      profile = {
        id: outcome.agent,
        detected_at: nowIso,
        wired_at: null,
        probed_at: null,
        capabilities: [],
        wire_error: null,
      };
      state.agents.push(profile);
    }
    profile.probed_at = nowIso;
  }
  writeState(state);
}

export function markOnboardingCompleted(now: Date): void {
  const state = readState();
  state.completed = true;
  state.last_updated_at = now.toISOString();
  writeState(state);
}

export function readOnboardingStateSnapshot(): OnboardingState | null {
  try {
    return readState();
  } catch {
    return null;
  }
}

export function updateProbedAgents(
  outcomes: Array<{ agent: AgentKind; probed: boolean }>,
  now: Date,
): void {
  updateProbeTimestamps(outcomes, now.toISOString());
}

export async function wire(opts: WireOpts): Promise<WireResult> {
  const now = opts.now ?? new Date();
  const nowIso = now.toISOString();
  const cache = opts.cache ?? { read: readAdapterCache, write: writeAdapterCache };
  const { profiles, rendered } = buildProfiles(opts, nowIso, cache);
  const runSyncAll = opts.syncAll ?? realSyncAll;

  let syncResult: SyncResult;
  try {
    syncResult = await runSyncAll(
      profiles,
      opts.repoRoot === undefined ? undefined : { repoRoot: opts.repoRoot },
    );
  } catch (err) {
    return {
      syncResult: emptyFailedSyncResult((err as Error).message),
      cacheUpdates: [],
      onboardingStateUpdated: false,
    };
  }

  if (topLevelSentinel(syncResult)) {
    return { syncResult, cacheUpdates: [], onboardingStateUpdated: false };
  }

  const cacheUpdates: WireResult['cacheUpdates'] = [];
  for (const kind of opts.selectedAgents) {
    const result = agentResult(syncResult, kind);
    if (!isSuccessfulAgent(result)) continue;
    const mcpServerConfig =
      kind === 'codex' || kind === 'cursor' || kind === 'claude-code'
        ? { url: opts.mcpServerUrl }
        : null;
    cache.write({
      schema_version: 1,
      agent: kind,
      last_written_at: nowIso,
      echoSection: rendered.get(kind) ?? null,
      mcpServerConfig,
    });
    cacheUpdates.push({ agent: kind, action: 'written' });
  }

  updateOnboardingState(opts.selectedAgents, syncResult, nowIso);
  return { syncResult, cacheUpdates, onboardingStateUpdated: true };
}
