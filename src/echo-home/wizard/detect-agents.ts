import { statSync } from 'node:fs';
import { homedir as osHomedir } from 'node:os';
import { join } from 'node:path';
import { buildSourceAppMap, type SourceApp } from '../../mcp/util/source-app.js';
import { resolveDbPath } from '../../daemon/lifecycle.js';
import type { Storage } from '../../storage/interface.js';
import {
  openExistingAtomStoreReadOnly,
  type ReadOnlyWizardStorage,
} from './atom-store-readonly.js';

export type AgentKind = 'codex' | 'claude-code' | 'cursor';
export type AgentConfidence = 'high' | 'medium' | 'none';

export interface DetectedAgentSignals {
  configFile: { path: string; exists: boolean; readableMode: boolean };
  atomActivity: { count: number; lastSeen: string | null } | null;
  atomCountSaturated: boolean;
}

export interface DetectedAgent {
  kind: AgentKind;
  confidence: AgentConfidence;
  signals: DetectedAgentSignals;
}

export interface DetectAgentsDeps {
  homedir?: string;
  atomStore?: Storage | null;
  now?: Date;
}

export const AGENT_KINDS: readonly AgentKind[] = ['codex', 'claude-code', 'cursor'] as const;

const CONFIG_PATHS: Record<AgentKind, string> = {
  codex: '.codex/config.toml',
  'claude-code': '.claude/CLAUDE.md',
  cursor: '.cursor/mcp.json',
};

const SOURCE_APP_BY_AGENT: Record<AgentKind, SourceApp> = {
  codex: 'codex',
  'claude-code': 'claude_code',
  cursor: 'cursor',
};

const ACTIVITY_LIMIT = 50_000;
const WINDOW_DAYS = 30;

function isoDaysBefore(now: Date, days: number): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function probeConfigFile(home: string, kind: AgentKind): DetectedAgentSignals['configFile'] {
  const path = join(home, CONFIG_PATHS[kind]);
  try {
    const stat = statSync(path);
    return { path, exists: true, readableMode: (stat.mode & 0o400) !== 0 };
  } catch {
    return { path, exists: false, readableMode: false };
  }
}

function confidenceFor(signals: DetectedAgentSignals): AgentConfidence {
  const hasConfig = signals.configFile.exists;
  const atomCount = signals.atomActivity?.count ?? 0;
  if (hasConfig && atomCount > 0) return 'high';
  if (hasConfig) return 'medium';
  if (atomCount > 0) return 'medium';
  return 'none';
}

function confidenceRank(confidence: AgentConfidence): number {
  if (confidence === 'high') return 0;
  if (confidence === 'medium') return 1;
  return 2;
}

function maybeClose(store: Storage | null, shouldClose: boolean): void {
  if (!shouldClose || store === null) return;
  const close = (store as Partial<ReadOnlyWizardStorage>).close;
  if (typeof close === 'function') close.call(store);
}

function resolveAtomStore(atomStore: Storage | null | undefined): {
  store: Storage | null;
  shouldClose: boolean;
} {
  if (atomStore !== undefined) return { store: atomStore, shouldClose: false };
  return { store: openExistingAtomStoreReadOnly(resolveDbPath()), shouldClose: true };
}

export async function detectAgents(deps: DetectAgentsDeps = {}): Promise<DetectedAgent[]> {
  const home = deps.homedir ?? osHomedir();
  const now = deps.now ?? new Date();
  const { store, shouldClose } = resolveAtomStore(deps.atomStore);
  const sourceMap = buildSourceAppMap();

  try {
    const out: DetectedAgent[] = [];
    for (const kind of AGENT_KINDS) {
      const configFile = probeConfigFile(home, kind);
      let atomActivity: DetectedAgentSignals['atomActivity'] = null;
      let atomCountSaturated = false;
      if (store !== null) {
        const rows = await store.query({
          source_prefix: sourceMap[SOURCE_APP_BY_AGENT[kind]],
          since: isoDaysBefore(now, WINDOW_DAYS),
          until: now.toISOString(),
          limit: ACTIVITY_LIMIT,
        });
        atomActivity = {
          count: rows.length,
          lastSeen:
            rows.length === 0
              ? null
              : rows.reduce((max, row) => (row.timestamp > max ? row.timestamp : max), ''),
        };
        atomCountSaturated = rows.length === ACTIVITY_LIMIT;
      }
      const signals: DetectedAgentSignals = { configFile, atomActivity, atomCountSaturated };
      out.push({ kind, confidence: confidenceFor(signals), signals });
    }
    return out.sort((a, b) => {
      const rank = confidenceRank(a.confidence) - confidenceRank(b.confidence);
      if (rank !== 0) return rank;
      return a.kind.localeCompare(b.kind);
    });
  } finally {
    maybeClose(store, shouldClose);
  }
}
