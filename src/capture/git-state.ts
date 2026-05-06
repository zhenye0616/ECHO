// Live git-state probe for Layer 2 ("cheap world state").
//
// Runs `git rev-parse HEAD`, `git rev-parse --abbrev-ref HEAD`, and
// `git status --porcelain` in a target cwd, returns a GitState snapshot.
// Caches per-cwd for FRESH_TTL_MS so a burst of turn emissions in the same
// repo doesn't fan out into N subprocesses. Failures are silent (returns
// undefined) — non-git-repo cwds are common and not interesting.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { GitState } from './extractors/_turn_meta.js';

const execFileAsync = promisify(execFile);

/** A sample is "fresh" iff captured_at - turn_timestamp ≤ FRESHNESS_WINDOW_MS. */
export const FRESHNESS_WINDOW_MS = 30_000;
/** Cached samples are reused inside this window — burst-safe. */
const CACHE_TTL_MS = 5_000;

interface CacheEntry {
  state: Omit<GitState, 'fresh'>;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

async function gitOne(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      timeout: 1_500,
      maxBuffer: 1_024 * 1_024,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function probeGitState(
  cwd: string | undefined,
  turnTimestampIso: string,
): Promise<GitState | undefined> {
  if (cwd === undefined || cwd.length === 0) return undefined;

  const now = Date.now();
  const turnMs = Date.parse(turnTimestampIso);
  const fresh = Number.isFinite(turnMs) && now - turnMs <= FRESHNESS_WINDOW_MS;
  // Historical turns get nothing useful out of a current git probe — the
  // sample reflects HEAD at extraction time, not at the turn's actual moment.
  // Skip the subprocess fan-out entirely for them so boot-scan stays fast.
  if (!fresh) return undefined;

  const cached = cache.get(cwd);
  if (cached !== undefined && cached.expiresAt > now) {
    return { ...cached.state, fresh };
  }

  const [headSha, branch, dirty] = await Promise.all([
    gitOne(cwd, ['rev-parse', 'HEAD']),
    gitOne(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']),
    gitOne(cwd, ['status', '--porcelain']),
  ]);

  if (headSha === null) {
    // Not a git repo, or git not available — cache the negative briefly.
    cache.set(cwd, { state: { captured_at: new Date(now).toISOString() }, expiresAt: now + CACHE_TTL_MS });
    return undefined;
  }

  const state: Omit<GitState, 'fresh'> = {
    head_sha: headSha,
    captured_at: new Date(now).toISOString(),
  };
  if (branch !== null && branch.length > 0) state.branch = branch;
  if (dirty !== null) {
    state.dirty_count = dirty.length === 0 ? 0 : dirty.split('\n').length;
  }

  cache.set(cwd, { state, expiresAt: now + CACHE_TTL_MS });
  return { ...state, fresh };
}

/** For tests: clear the in-memory cache. */
export function _resetGitStateCache(): void {
  cache.clear();
}
