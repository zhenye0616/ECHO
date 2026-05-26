import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CaptureEvent,
  CoordAtomIterationRecord,
  EventId,
  QueryFilter,
  Storage,
} from '../../../src/storage/interface.js';
import { buildSourceAppMap } from '../../../src/mcp/util/source-app.js';

class FakeStore implements Storage {
  constructor(private readonly rows: CaptureEvent[]) {}

  async append(): Promise<EventId> {
    throw new Error('unused');
  }

  async query(filter: QueryFilter = {}): Promise<CaptureEvent[]> {
    return this.rows
      .filter((row) => filter.since === undefined || row.timestamp >= filter.since)
      .filter((row) => filter.until === undefined || row.timestamp < filter.until)
      .slice(0, filter.limit);
  }

  async count(): Promise<number> {
    return this.rows.length;
  }

  async getByIds(): Promise<CaptureEvent[]> {
    return [];
  }

  async iterateCoordAtomsByAppendOrder(): Promise<CoordAtomIterationRecord[]> {
    return [];
  }

  async getCurrentCoordSequence(): Promise<number> {
    return 0;
  }
}

let tmpRoot: string;
let originalEchoDbPath: string | undefined;

function event(
  source: string,
  timestamp: string,
  repoRoot: string | null,
  id = `${source}-${timestamp}-${repoRoot ?? 'none'}`,
): CaptureEvent {
  return {
    id,
    source,
    timestamp,
    content: 'x',
    metadata: repoRoot === null ? {} : { repo_root: repoRoot },
  };
}

async function loadModule(): Promise<
  typeof import('../../../src/echo-home/wizard/detect-projects.js')
> {
  return import('../../../src/echo-home/wizard/detect-projects.js');
}

describe('detectProjects', () => {
  beforeEach(() => {
    originalEchoDbPath = process.env.ECHO_DB_PATH;
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-073-detect-projects-'));
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEchoDbPath === undefined) delete process.env.ECHO_DB_PATH;
    else process.env.ECHO_DB_PATH = originalEchoDbPath;
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('groups three repo roots and sorts by atom count descending', async () => {
    const sources = buildSourceAppMap();
    const { detectProjects } = await loadModule();
    const projects = await detectProjects({
      atomStore: new FakeStore([
        event(`${sources.codex}a`, '2026-05-01T00:00:00.000Z', '/repo/a'),
        event(`${sources.codex}b`, '2026-05-01T00:01:00.000Z', '/repo/a'),
        event(`${sources.cursor}c`, '2026-05-01T00:02:00.000Z', '/repo/b'),
        event('custom:source', '2026-05-01T00:03:00.000Z', '/repo/c'),
      ]),
      now: new Date('2026-05-02T00:00:00.000Z'),
    });
    expect(projects.map((project) => [project.repoRoot, project.atomCount])).toEqual([
      ['/repo/a', 2],
      ['/repo/c', 1],
      ['/repo/b', 1],
    ]);
    expect(projects[0]!.sourceBreakdown.codex).toBe(2);
    expect(projects[1]!.sourceBreakdown.other).toBe(1);
  });

  it('excludes atoms with null repo_root metadata', async () => {
    const { detectProjects } = await loadModule();
    const projects = await detectProjects({
      atomStore: new FakeStore([
        event('git:x', '2026-05-01T00:00:00.000Z', null),
        event('git:y', '2026-05-01T00:01:00.000Z', '/repo/yes'),
      ]),
      now: new Date('2026-05-02T00:00:00.000Z'),
    });
    expect(projects).toHaveLength(1);
    expect(projects[0]!.repoRoot).toBe('/repo/yes');
  });

  it('returns an empty array for an empty store', async () => {
    const { detectProjects } = await loadModule();
    await expect(detectProjects({ atomStore: new FakeStore([]) })).resolves.toEqual([]);
  });

  it('clamps the returned list to the requested limit', async () => {
    const { detectProjects } = await loadModule();
    const projects = await detectProjects({
      atomStore: new FakeStore([
        event('git:a', '2026-05-01T00:00:00.000Z', '/repo/a'),
        event('git:b', '2026-05-01T00:00:00.000Z', '/repo/b'),
        event('git:c', '2026-05-01T00:00:00.000Z', '/repo/c'),
      ]),
      now: new Date('2026-05-02T00:00:00.000Z'),
      limit: 2,
    });
    expect(projects).toHaveLength(2);
  });

  it('merges repo_root values that differ only by trailing slash', async () => {
    const { detectProjects } = await loadModule();
    const projects = await detectProjects({
      atomStore: new FakeStore([
        event('git:a', '2026-05-01T00:00:00.000Z', '/repo/a'),
        event('git:b', '2026-05-01T00:01:00.000Z', '/repo/a/'),
      ]),
      now: new Date('2026-05-02T00:00:00.000Z'),
    });
    expect(projects).toHaveLength(1);
    expect(projects[0]!.atomCount).toBe(2);
  });

  it('does not create a missing production database on fresh install', async () => {
    const dbPath = join(tmpRoot, 'missing-parent', 'echo.db');
    process.env.ECHO_DB_PATH = dbPath;
    const before = readdirSync(tmpRoot);
    const { detectProjects } = await loadModule();
    await expect(detectProjects()).resolves.toEqual([]);
    expect(readdirSync(tmpRoot)).toEqual(before);
  });
});
