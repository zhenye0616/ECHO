import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  type PendingDecisionsResult,
  type PendingDecisionsSourceState,
} from './internal/decision-card-types.js';
import {
  DEFAULT_ACTIVE_ITEM_SCAN_LIMIT,
  projectPlaybookDecisions,
} from './internal/decision-source-playbook.js';
import { assertAbsoluteRepoPath, normaliseRepoPath } from '../util/repo-path.js';

const SCHEMA_VERSION = 1;
const DEFAULT_REFRESH_WINDOW_MS = 60_000;
const DEFAULT_FETCH_TIMEOUT_MS = 1_200;

export interface PendingDecisionsParams {
  repo_path: string;
}

export interface GitRunOptions {
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
}

export interface GitRunResult {
  ok: boolean;
  stdout: string;
  timedOut?: boolean;
}

export type GitRunner = (repoRoot: string, args: readonly string[], options: GitRunOptions) => Promise<GitRunResult>;

export interface RegisterPendingDecisionsDeps {
  now?: () => Date;
  git?: GitRunner;
  refreshWindowMs?: number;
  fetchTimeoutMs?: number;
  scanLimit?: number;
}

interface RefreshCacheEntry {
  lastAttemptMs: number;
  lastSuccessIso: string | null;
}

const refreshCache = new Map<string, RefreshCacheEntry>();

export function resetPendingDecisionsGitCache(): void {
  refreshCache.clear();
}

export async function pendingDecisions(
  params: PendingDecisionsParams,
  deps: RegisterPendingDecisionsDeps = {},
): Promise<PendingDecisionsResult> {
  assertAbsoluteRepoPath('pending_decisions', params.repo_path);
  const repoRoot = normaliseRepoPath(params.repo_path);
  const projection = projectPlaybookDecisions(repoRoot, {
    scanLimit: deps.scanLimit ?? DEFAULT_ACTIVE_ITEM_SCAN_LIMIT,
  });
  const sourceState = await buildSourceState(repoRoot, projection, deps);
  const result: PendingDecisionsResult = {
    schema_version: SCHEMA_VERSION,
    tool: 'pending_decisions',
    decisions: projection.decisions,
    source_breakdown: projection.source_breakdown,
    source_state: sourceState,
  };
  if (projection.partial) {
    result.result_caps = {
      decisions_returned: projection.decisions.length,
      decisions_total: projection.decisions.length,
      scanned_items: projection.scanned_items,
      partial: true,
    };
  }
  return result;
}

async function buildSourceState(
  repoRoot: string,
  projection: { scanned_items: number; partial: boolean },
  deps: RegisterPendingDecisionsDeps,
): Promise<PendingDecisionsSourceState> {
  const now = deps.now?.() ?? new Date();
  const git = deps.git ?? runGit;
  const refreshWindowMs = deps.refreshWindowMs ?? DEFAULT_REFRESH_WINDOW_MS;
  const fetchTimeoutMs = deps.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  await maybeRefreshUpstream(repoRoot, now, git, refreshWindowMs, fetchTimeoutMs);

  const localHead = (await git(repoRoot, ['rev-parse', 'HEAD'], { timeoutMs: fetchTimeoutMs })).stdout.trim();
  const upstreamHeadResult = await git(repoRoot, ['rev-parse', '--verify', 'origin/main'], { timeoutMs: fetchTimeoutMs });
  const upstreamHead = upstreamHeadResult.ok ? upstreamHeadResult.stdout.trim() : null;
  const behindResult = upstreamHead === null
    ? { ok: false, stdout: '0' }
    : await git(repoRoot, ['rev-list', '--count', 'HEAD..origin/main'], { timeoutMs: fetchTimeoutMs });
  const dirtyResult = await git(repoRoot, ['status', '--porcelain', '--', 'backlog'], { timeoutMs: fetchTimeoutMs });
  const upstreamCheckedAt = await upstreamCheckedAtIso(repoRoot, git, fetchTimeoutMs);
  const checkedMs = upstreamCheckedAt === null ? 0 : Date.parse(upstreamCheckedAt);
  const upstreamStale = upstreamCheckedAt === null || !Number.isFinite(checkedMs) || now.getTime() - checkedMs > refreshWindowMs;

  return {
    local_head: localHead.length > 0 ? localHead : 'unknown',
    upstream_head: upstreamHead,
    behind: behindResult.ok ? Number.parseInt(behindResult.stdout.trim(), 10) || 0 : 0,
    upstream_checked_at: upstreamCheckedAt,
    upstream_stale: upstreamStale,
    dirty: dirtyResult.ok && dirtyResult.stdout.trim().length > 0,
    scanned_items: projection.scanned_items,
    partial: projection.partial,
  };
}

async function maybeRefreshUpstream(
  repoRoot: string,
  now: Date,
  git: GitRunner,
  refreshWindowMs: number,
  fetchTimeoutMs: number,
): Promise<void> {
  const existing = refreshCache.get(repoRoot);
  if (existing !== undefined && now.getTime() - existing.lastAttemptMs < refreshWindowMs) return;
  const entry: RefreshCacheEntry = {
    lastAttemptMs: now.getTime(),
    lastSuccessIso: existing?.lastSuccessIso ?? null,
  };
  refreshCache.set(repoRoot, entry);

  const result = await git(repoRoot, ['fetch', 'origin', 'main'], {
    timeoutMs: fetchTimeoutMs,
    env: {
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: 'echo',
      SSH_ASKPASS: 'echo',
      GIT_SSH_COMMAND: 'ssh -oBatchMode=yes',
    },
  });
  if (result.ok) {
    entry.lastSuccessIso = now.toISOString();
  }
}

async function upstreamCheckedAtIso(repoRoot: string, git: GitRunner, timeoutMs: number): Promise<string | null> {
  const cached = refreshCache.get(repoRoot)?.lastSuccessIso;
  if (cached !== undefined && cached !== null) return cached;
  const commonDirResult = await git(repoRoot, ['rev-parse', '--git-common-dir'], { timeoutMs });
  if (!commonDirResult.ok) return null;
  const commonDirRaw = commonDirResult.stdout.trim();
  const commonDir = isAbsolute(commonDirRaw) ? commonDirRaw : resolve(repoRoot, commonDirRaw);
  const candidates = [
    resolve(commonDir, 'refs/remotes/origin/main'),
    resolve(commonDir, 'logs/refs/remotes/origin/main'),
  ];
  let newest = 0;
  for (const candidate of candidates) {
    try {
      const s = await stat(candidate);
      newest = Math.max(newest, s.mtimeMs);
    } catch {
      // Packed refs or missing reflog: no filesystem freshness proof.
    }
  }
  return newest > 0 ? new Date(newest).toISOString() : null;
}

async function runGit(repoRoot: string, args: readonly string[], options: GitRunOptions): Promise<GitRunResult> {
  return await new Promise((resolvePromise) => {
    execFile(
      'git',
      [...args],
      {
        cwd: repoRoot,
        timeout: options.timeoutMs,
        killSignal: 'SIGKILL',
        env: { ...process.env, ...options.env },
        encoding: 'utf8',
      },
      (error, stdout) => {
        if (error !== null) {
          const err = error as NodeJS.ErrnoException & { killed?: boolean; signal?: string };
          resolvePromise({
            ok: false,
            stdout: typeof stdout === 'string' ? stdout : '',
            timedOut: err.killed === true || err.signal === 'SIGKILL',
          });
          return;
        }
        resolvePromise({ ok: true, stdout: typeof stdout === 'string' ? stdout : '' });
      },
    );
  });
}

const pendingDecisionsOutputSchema = {
  schema_version: z.literal(1),
  tool: z.literal('pending_decisions'),
  decisions: z.array(z.record(z.string(), z.unknown())),
  source_breakdown: z.record(z.string(), z.number()),
  source_state: z.object({
    local_head: z.string(),
    upstream_head: z.string().nullable(),
    behind: z.number(),
    upstream_checked_at: z.string().nullable(),
    upstream_stale: z.boolean(),
    dirty: z.boolean(),
    scanned_items: z.number(),
    partial: z.boolean(),
  }),
  result_caps: z.record(z.string(), z.unknown()).optional(),
};

export function registerPendingDecisions(
  server: McpServer,
  deps: RegisterPendingDecisionsDeps = {},
): void {
  server.registerTool(
    'pending_decisions',
    {
      description:
        'Read-only DecisionCard projection for delegated agent work awaiting the founder. v0 requires repo_path and reads the ECHO review-playbook files in that repo; returns deterministic cards plus freshness state. Zero LLM, zero backlog writes.',
      inputSchema: {
        repo_path: z
          .string()
          .describe('Absolute filesystem path to the repo whose active backlog/review rounds should be projected.'),
      },
      outputSchema: pendingDecisionsOutputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      try {
        const result = await pendingDecisions(input as PendingDecisionsParams, deps);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result as unknown as Record<string, unknown>,
        };
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('pending_decisions: ')) {
          return {
            isError: true,
            content: [{ type: 'text', text: err.message }],
          };
        }
        throw err;
      }
    },
  );
}
