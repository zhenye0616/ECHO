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
import {
  ECHO_HOME_PATHS,
  validateOnboardingState,
  type InstallProfile,
  type OnboardingState,
} from '../paths.js';
import { readAdapterCache, writeAdapterCache, type AdapterCacheRecord } from './adapter-cache.js';
import type { AgentKind } from './detect-agents.js';
import { renderEchoSection } from './render-echo-section.js';

export interface WireOpts {
  selectedAgents: AgentKind[];
  defaultProjectRepoRoot: string | null;
  mcpServerUrl: string;
  echoVersion: string;
  runtimeVersion?: string | null;
  profile?: InstallProfile;
  repoRoot?: string;
  force?: boolean;
  syncAll?: typeof realSyncAll;
  claudeCodeMcpRegistration?: ClaudeCodeMcpRegisterDeps;
  cache?: {
    read: (kind: AgentKind) => AdapterCacheRecord | null;
    write: (rec: AdapterCacheRecord) => void;
  };
  probeMcpEndpoint?: (url: string) => Promise<McpEndpointProbeResult>;
  now?: Date;
}

export type McpEndpointProbeResult = { ok: true } | { ok: false; error: string };

export async function probeMcpEndpointHttp(
  url: string,
  clientVersion: string,
): Promise<McpEndpointProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch(url, {
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
          clientInfo: { name: 'echoctl-wire', version: clientVersion },
        },
        id: 1,
      }),
      signal: controller.signal,
    });
    if (response.status >= 200 && response.status < 300) return { ok: true };
    return { ok: false, error: `HTTP ${response.status}` };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
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
          runtimeVersion: opts.runtimeVersion ?? null,
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
  endpointProbe: McpEndpointProbeResult | null,
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
      if (endpointProbe?.ok === true) {
        profile.probed_at = nowIso;
        profile.wire_error = null;
      } else if (endpointProbe !== null) {
        profile.wire_error = `mcp endpoint unreachable: ${endpointProbe.error}`;
      } else {
        profile.wire_error = null;
      }
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

export interface MarkCompletedResult {
  completed: boolean;
  unverifiedAgents: string[];
}

export function markOnboardingCompleted(now: Date): MarkCompletedResult {
  const state = readState();
  const unverifiedAgents = state.agents
    .filter(
      (agent) => agent.wired_at !== null && agent.probed_at === null && agent.wire_error === null,
    )
    .map((agent) => agent.id);
  state.completed = unverifiedAgents.length === 0;
  state.last_updated_at = now.toISOString();
  writeState(state);
  return { completed: state.completed, unverifiedAgents };
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
  const installProfile = opts.profile ?? 'dogfood';

  let syncResult: SyncResult;
  try {
    syncResult = await runSyncAll(
      profiles,
      opts.repoRoot === undefined
        ? { profile: installProfile }
        : { repoRoot: opts.repoRoot, profile: installProfile },
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

  const anyWired = opts.selectedAgents.some((kind) =>
    isSuccessfulAgent(agentResult(syncResult, kind)),
  );
  const probeEndpoint =
    opts.probeMcpEndpoint ?? ((url: string) => probeMcpEndpointHttp(url, opts.echoVersion));
  const endpointProbe = anyWired ? await probeEndpoint(opts.mcpServerUrl) : null;

  updateOnboardingState(opts.selectedAgents, syncResult, nowIso, endpointProbe);
  return { syncResult, cacheUpdates, onboardingStateUpdated: true };
}
