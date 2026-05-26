import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { buildSourceAppMap, type SourceApp } from '../../mcp/util/source-app.js';
import { resolveDbPath } from '../../daemon/lifecycle.js';
import type { CaptureEvent, Storage } from '../../storage/interface.js';
import {
  openExistingAtomStoreReadOnly,
  type ReadOnlyWizardStorage,
} from './atom-store-readonly.js';

export type ProjectSource = SourceApp | 'other';

export interface DetectedProject {
  repoRoot: string;
  atomCount: number;
  lastSeen: string;
  sourceBreakdown: Partial<Record<ProjectSource, number>>;
}

export interface DetectProjectsDeps {
  atomStore?: Storage | null;
  now?: Date;
  windowDays?: number;
  limit?: number;
}

const SCAN_LIMIT = 50_000;
const DEFAULT_WINDOW_DAYS = 7;
const DEFAULT_RETURN_LIMIT = 25;
const EPHEMERAL_REVIEWER_WORKTREE = /^echo-[a-zA-Z0-9-]+-[0-9A-Fa-f-]{36}$/;
const TMP_RESOLVED = resolve(tmpdir());
const TMP_REAL = realpathSync(tmpdir());

function isoDaysBefore(now: Date, days: number): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
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

function repoRootOf(event: CaptureEvent): string | null {
  const raw = event.metadata?.['repo_root'];
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  return resolve(raw);
}

function isEphemeralReviewerWorktree(repoRoot: string): boolean {
  const isUnderTmp =
    repoRoot.startsWith(`${TMP_REAL}${sep}`) || repoRoot.startsWith(`${TMP_RESOLVED}${sep}`);
  return isUnderTmp && EPHEMERAL_REVIEWER_WORKTREE.test(basename(repoRoot));
}

function hasGitDirectory(repoRoot: string): boolean {
  try {
    return lstatSync(join(repoRoot, '.git')).isDirectory();
  } catch {
    return false;
  }
}

function collapseToGitRoot(repoRoot: string): string {
  let cur = repoRoot;
  for (let depth = 0; depth <= 10; depth++) {
    if (hasGitDirectory(cur)) return cur;
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return repoRoot;
}

function isSiblingWorktree(repoRoot: string): boolean {
  const base = basename(repoRoot);
  const dashIdx = base.indexOf('--');
  if (dashIdx <= 0) return false;
  const sibling = join(dirname(repoRoot), base.slice(0, dashIdx));
  try {
    return existsSync(sibling) && lstatSync(sibling).isDirectory();
  } catch {
    return false;
  }
}

function classifySource(source: string, sourceMap: Record<SourceApp, string>): ProjectSource {
  for (const [app, prefix] of Object.entries(sourceMap) as Array<[SourceApp, string]>) {
    if (source.startsWith(prefix)) return app;
  }
  return 'other';
}

export async function detectProjects(deps: DetectProjectsDeps = {}): Promise<DetectedProject[]> {
  const now = deps.now ?? new Date();
  const limit = deps.limit ?? DEFAULT_RETURN_LIMIT;
  const windowDays = deps.windowDays ?? DEFAULT_WINDOW_DAYS;
  const { store, shouldClose } = resolveAtomStore(deps.atomStore);
  if (store === null) return [];

  try {
    const rows = await store.query({
      since: isoDaysBefore(now, windowDays),
      until: now.toISOString(),
      limit: SCAN_LIMIT,
    });
    const sourceMap = buildSourceAppMap();
    const byRepo = new Map<string, DetectedProject>();

    for (const row of rows) {
      let repoRoot = repoRootOf(row);
      if (repoRoot === null) continue;
      if (isEphemeralReviewerWorktree(repoRoot)) continue;
      repoRoot = collapseToGitRoot(repoRoot);
      if (isSiblingWorktree(repoRoot)) continue;
      const existing = byRepo.get(repoRoot);
      const project =
        existing ??
        ({
          repoRoot,
          atomCount: 0,
          lastSeen: row.timestamp,
          sourceBreakdown: {},
        } satisfies DetectedProject);
      project.atomCount += 1;
      if (row.timestamp > project.lastSeen) project.lastSeen = row.timestamp;
      const source = classifySource(row.source, sourceMap);
      project.sourceBreakdown[source] = (project.sourceBreakdown[source] ?? 0) + 1;
      byRepo.set(repoRoot, project);
    }

    return [...byRepo.values()]
      .sort((a, b) => {
        if (a.atomCount !== b.atomCount) return b.atomCount - a.atomCount;
        if (a.lastSeen !== b.lastSeen) return b.lastSeen.localeCompare(a.lastSeen);
        return a.repoRoot.localeCompare(b.repoRoot);
      })
      .slice(0, limit);
  } finally {
    maybeClose(store, shouldClose);
  }
}
