import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SqliteStorage } from '../../../src/storage/sqlite.js';
import type {
  AtomIterationRecord,
  CaptureEvent,
  EventId,
  QueryFilter,
  Storage,
  CoordAtomIterationRecord,
} from '../../../src/storage/interface.js';
import { buildSourceAppMap } from '../../../src/mcp/util/source-app.js';

class FakeStore implements Storage {
  constructor(
    private readonly rows: CaptureEvent[],
    private readonly throws = false,
  ) {}

  async append(): Promise<EventId> {
    throw new Error('unused');
  }

  async query(filter: QueryFilter = {}): Promise<CaptureEvent[]> {
    if (this.throws) throw new Error('query failed');
    return this.rows
      .filter(
        (row) => filter.source_prefix === undefined || row.source.startsWith(filter.source_prefix),
      )
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
let originalHome: string | undefined;
let originalEchoDbPath: string | undefined;
let originalEchoDataDir: string | undefined;

function event(source: string, timestamp: string): CaptureEvent {
  return { id: `${source}-${timestamp}`, source, timestamp, content: 'x' };
}

async function loadModule(): Promise<
  typeof import('../../../src/echo-home/wizard/detect-agents.js')
> {
  return import('../../../src/echo-home/wizard/detect-agents.js');
}

describe('detectAgents', () => {
  beforeEach(() => {
    originalHome = process.env.HOME;
    originalEchoDbPath = process.env.ECHO_DB_PATH;
    originalEchoDataDir = process.env.ECHO_DATA_DIR;
    tmpRoot = mkdtempSync(join(tmpdir(), 'echo-073-detect-agents-'));
    process.env.HOME = join(tmpRoot, 'home');
    vi.resetModules();
  });

  afterEach(() => {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    if (originalEchoDbPath === undefined) delete process.env.ECHO_DB_PATH;
    else process.env.ECHO_DB_PATH = originalEchoDbPath;
    if (originalEchoDataDir === undefined) delete process.env.ECHO_DATA_DIR;
    else process.env.ECHO_DATA_DIR = originalEchoDataDir;
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.resetModules();
  });

  it('reports high confidence for all three agents when config files and atom activity exist', async () => {
    const home = join(tmpRoot, 'configs');
    mkdirSync(join(home, '.codex'), { recursive: true });
    mkdirSync(join(home, '.claude'), { recursive: true });
    mkdirSync(join(home, '.cursor'), { recursive: true });
    writeFileSync(join(home, '.codex/config.toml'), '');
    writeFileSync(join(home, '.claude/CLAUDE.md'), '');
    writeFileSync(join(home, '.cursor/mcp.json'), '{}');
    const sources = buildSourceAppMap();
    const { detectAgents } = await loadModule();
    const rows = [
      event(`${sources.codex}a.jsonl`, '2026-05-01T00:00:00.000Z'),
      event(`${sources.claude_code}b.jsonl`, '2026-05-01T00:01:00.000Z'),
      event(`${sources.cursor}state.vscdb`, '2026-05-01T00:02:00.000Z'),
    ];
    const agents = await detectAgents({
      homedir: home,
      atomStore: new FakeStore(rows),
      now: new Date('2026-05-02T00:00:00.000Z'),
    });
    expect(agents.map((a) => [a.kind, a.confidence])).toEqual([
      ['claude-code', 'high'],
      ['codex', 'high'],
      ['cursor', 'high'],
    ]);
  });

  it('reports medium for config-only codex and none for absent agents', async () => {
    const home = join(tmpRoot, 'config-only');
    mkdirSync(join(home, '.codex'), { recursive: true });
    writeFileSync(join(home, '.codex/config.toml'), '');
    const { detectAgents } = await loadModule();
    const agents = await detectAgents({ homedir: home, atomStore: new FakeStore([]) });
    expect(agents.map((a) => [a.kind, a.confidence])).toEqual([
      ['codex', 'medium'],
      ['claude-code', 'none'],
      ['cursor', 'none'],
    ]);
  });

  it('returns none for every agent when the atom store is unavailable and configs are absent', async () => {
    const { detectAgents } = await loadModule();
    const agents = await detectAgents({ homedir: join(tmpRoot, 'empty'), atomStore: null });
    expect(agents.every((agent) => agent.confidence === 'none')).toBe(true);
    expect(agents.every((agent) => agent.signals.atomActivity === null)).toBe(true);
  });

  it('reports medium for atom-activity-only agents', async () => {
    const sources = buildSourceAppMap();
    const { detectAgents } = await loadModule();
    const agents = await detectAgents({
      homedir: join(tmpRoot, 'empty'),
      atomStore: new FakeStore([
        event(`${sources.codex}a`, '2026-05-01T00:00:00.000Z'),
        event(`${sources.claude_code}b`, '2026-05-01T00:00:00.000Z'),
        event(`${sources.cursor}c`, '2026-05-01T00:00:00.000Z'),
      ]),
      now: new Date('2026-05-02T00:00:00.000Z'),
    });
    expect(agents.every((agent) => agent.confidence === 'medium')).toBe(true);
  });

  it('follows symlinked config files', async () => {
    const home = join(tmpRoot, 'symlink');
    mkdirSync(join(home, '.codex'), { recursive: true });
    const target = join(tmpRoot, 'target.toml');
    writeFileSync(target, '');
    symlinkSync(target, join(home, '.codex/config.toml'));
    const { detectAgents } = await loadModule();
    const [codex] = await detectAgents({ homedir: home, atomStore: new FakeStore([]) });
    expect(codex!.kind).toBe('codex');
    expect(codex!.signals.configFile.exists).toBe(true);
  });

  it('propagates atom-store query failures', async () => {
    const { detectAgents } = await loadModule();
    await expect(
      detectAgents({ homedir: join(tmpRoot, 'empty'), atomStore: new FakeStore([], true) }),
    ).rejects.toThrow('query failed');
  });

  it('uses the injected now for the 30-day atom window', async () => {
    const sources = buildSourceAppMap();
    const { detectAgents } = await loadModule();
    const agents = await detectAgents({
      homedir: join(tmpRoot, 'empty'),
      atomStore: new FakeStore([
        event(`${sources.codex}old`, '2026-03-25T00:00:00.000Z'),
        event(`${sources.codex}new`, '2026-04-15T00:00:00.000Z'),
      ]),
      now: new Date('2026-05-01T00:00:00.000Z'),
    });
    const codex = agents.find((agent) => agent.kind === 'codex')!;
    expect(codex.signals.atomActivity).toEqual({
      count: 1,
      lastSeen: '2026-04-15T00:00:00.000Z',
    });
  });

  it('does not create a missing production database on fresh install', async () => {
    const dbPath = join(tmpRoot, 'missing-parent', 'echo.db');
    process.env.ECHO_DB_PATH = dbPath;
    const before = readdirSync(tmpRoot);
    const { detectAgents } = await loadModule();
    const agents = await detectAgents({ homedir: join(tmpRoot, 'empty') });
    expect(agents.every((agent) => agent.signals.atomActivity === null)).toBe(true);
    expect(readdirSync(tmpRoot)).toEqual(before);
  });

  it('sets atomCountSaturated when the bounded query returns exactly 50000 rows', async () => {
    const sources = buildSourceAppMap();
    const many = Array.from({ length: 50_000 }, (_, i) =>
      event(`${sources.codex}${i}`, '2026-05-01T00:00:00.000Z'),
    );
    const { detectAgents } = await loadModule();
    const agents = await detectAgents({
      homedir: join(tmpRoot, 'empty'),
      atomStore: new FakeStore([
        ...many,
        event(`${sources.claude_code}one`, '2026-05-01T00:00:00.000Z'),
      ]),
      now: new Date('2026-05-02T00:00:00.000Z'),
    });
    const codex = agents.find((agent) => agent.kind === 'codex')!;
    const claude = agents.find((agent) => agent.kind === 'claude-code')!;
    expect(codex.signals.atomCountSaturated).toBe(true);
    expect(codex.signals.atomActivity?.count).toBe(50_000);
    expect(claude.signals.atomCountSaturated).toBe(false);
  });

  it('uses ECHO_DB_PATH through the promoted daemon resolver', async () => {
    const sources = buildSourceAppMap();
    const dbPath = join(tmpRoot, 'custom-echo.db');
    process.env.ECHO_DB_PATH = dbPath;
    const store = new SqliteStorage(dbPath);
    await store.append(event(`${sources.codex}row`, '2026-05-01T00:00:00.000Z'));
    store.close();
    const { detectAgents } = await loadModule();
    const agents = await detectAgents({
      homedir: join(tmpRoot, 'empty'),
      now: new Date('2026-05-02T00:00:00.000Z'),
    });
    const codex = agents.find((agent) => agent.kind === 'codex')!;
    expect(codex.signals.atomActivity?.count).toBe(1);
    expect(dirname(dbPath)).toBe(tmpRoot);
  });
});
