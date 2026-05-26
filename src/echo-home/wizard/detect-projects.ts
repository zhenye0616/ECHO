import { resolve } from 'node:path';
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
      const repoRoot = repoRootOf(row);
      if (repoRoot === null) continue;
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
