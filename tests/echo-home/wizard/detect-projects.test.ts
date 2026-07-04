import { mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AtomIterationRecord,
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

  async iterateAtomsByAppendOrder(): Promise<AtomIterationRecord[]> {
    return [];
  }

  async getCurrentSequence(): Promise<number> {
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

  it('filters ephemeral reviewer worktrees under the system temp directory', async () => {
    const { detectProjects } = await loadModule();
    const ephemeralRoots = [
      join(tmpdir(), 'echo-codex-11111111-1111-4111-8111-111111111111'),
      join(tmpdir(), 'echo-codex-22222222-2222-4222-8222-222222222222'),
      join(tmpdir(), 'echo-codex-33333333-3333-4333-8333-333333333333'),
      join(tmpdir(), 'echo-codex-44444444-4444-4444-8444-444444444444'),
      join(tmpdir(), 'echo-codex-ops-55555555-5555-4555-8555-555555555555'),
    ];
    const projects = await detectProjects({
      atomStore: new FakeStore([
        event('git:a', '2026-05-01T00:00:00.000Z', '/repo/a'),
        event('git:b', '2026-05-01T00:01:00.000Z', '/repo/b'),
        event('git:c', '2026-05-01T00:02:00.000Z', '/repo/c'),
        ...ephemeralRoots.map((root, index) =>
          event('git:tmp', `2026-05-01T00:0${index + 3}:00.000Z`, root),
        ),
      ]),
      now: new Date('2026-05-02T00:00:00.000Z'),
    });
    expect(projects.map((project) => project.repoRoot).sort()).toEqual([
      '/repo/a',
      '/repo/b',
      '/repo/c',
    ]);
  });

  it('keeps non-matching project names under the system temp directory', async () => {
    const repoRoot = join(tmpdir(), 'my-project');
    const { detectProjects } = await loadModule();
    const projects = await detectProjects({
      atomStore: new FakeStore([event('git:a', '2026-05-01T00:00:00.000Z', repoRoot)]),
      now: new Date('2026-05-02T00:00:00.000Z'),
    });
    expect(projects.map((project) => project.repoRoot)).toEqual([resolve(repoRoot)]);
  });

  it('keeps matching project names outside the system temp directory', async () => {
    const repoRoot = '/repo/echo-codex-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const { detectProjects } = await loadModule();
    const projects = await detectProjects({
      atomStore: new FakeStore([event('git:a', '2026-05-01T00:00:00.000Z', repoRoot)]),
      now: new Date('2026-05-02T00:00:00.000Z'),
    });
    expect(projects.map((project) => project.repoRoot)).toEqual([repoRoot]);
  });

  it('filters realpath tmp reviewer roots and sibling worktrees while collapsing subdirs to git roots', async () => {
    const sources = buildSourceAppMap();
    const tmpReviewerRoot = join(
      realpathSync(tmpdir()),
      'echo-merger-66666666-6666-4666-8666-666666666666',
    );
    const desktop = join(tmpRoot, 'Desktop');
    const siblingRepo = join(desktop, 'sibling-repo');
    const siblingWorktree = join(desktop, 'sibling-repo--worktree-slug');
    const realProject = join(tmpRoot, 'some-real-project');
    const subdirOne = join(realProject, 'subdir', 'whatever');
    const subdirTwo = join(realProject, 'subdir2', 'other');
    const fakeRootWithoutGit = join(tmpRoot, 'fake-root', 'nested');
    const tmpRealProject = join(tmpdir(), 'my-project');
    mkdirSync(siblingRepo, { recursive: true });
    mkdirSync(join(realProject, '.git'), { recursive: true });
    const { detectProjects } = await loadModule();

    const projects = await detectProjects({
      atomStore: new FakeStore([
        event('git:tmp', '2026-05-01T00:00:00.000Z', tmpReviewerRoot),
        event('git:worktree', '2026-05-01T00:01:00.000Z', siblingWorktree),
        event(`${sources.codex}a`, '2026-05-01T00:02:00.000Z', subdirOne),
        event(`${sources.cursor}b`, '2026-05-01T00:03:00.000Z', subdirTwo),
        event('custom:source', '2026-05-01T00:04:00.000Z', subdirTwo),
        event('git:fake', '2026-05-01T00:05:00.000Z', fakeRootWithoutGit),
        event('git:tmp-real', '2026-05-01T00:06:00.000Z', tmpRealProject),
      ]),
      now: new Date('2026-05-02T00:00:00.000Z'),
    });

    const roots = projects.map((project) => project.repoRoot);
    const collapsed = projects.find((project) => project.repoRoot === resolve(realProject));
    expect(roots).not.toContain(resolve(tmpReviewerRoot));
    expect(roots).not.toContain(resolve(siblingWorktree));
    expect(collapsed).toMatchObject({
      repoRoot: resolve(realProject),
      atomCount: 3,
      sourceBreakdown: { codex: 1, cursor: 1, other: 1 },
    });
    expect(roots).toContain(resolve(fakeRootWithoutGit));
    expect(roots).toContain(resolve(tmpRealProject));
  });

  it('keeps double-dash repo roots when the base sibling does not exist', async () => {
    const repoRoot = join(tmpRoot, 'lonely-repo--slug');
    const { detectProjects } = await loadModule();
    const projects = await detectProjects({
      atomStore: new FakeStore([event('git:a', '2026-05-01T00:00:00.000Z', repoRoot)]),
      now: new Date('2026-05-02T00:00:00.000Z'),
    });
    expect(projects.map((project) => project.repoRoot)).toEqual([resolve(repoRoot)]);
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
