import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CaptureEvent } from '../../src/storage/interface.js';
import { migrate } from '../../src/storage/migrate.js';
import { SqliteStorage } from '../../src/storage/sqlite.js';

const MIGRATIONS_DIR = new URL('../../src/storage/migrations/', import.meta.url).pathname;

function eventInput(overrides: Partial<Omit<CaptureEvent, 'id'>> = {}): Omit<CaptureEvent, 'id'> {
  return {
    source: 'fs:test',
    timestamp: '2026-04-30T12:00:00.000Z',
    content: 'hello',
    ...overrides,
  };
}

describe('SqliteStorage', () => {
  let store: SqliteStorage;

  beforeEach(() => {
    store = new SqliteStorage(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  describe('append + query roundtrip', () => {
    it('preserves all fields including metadata and embedding', async () => {
      const input = eventInput({
        source: 'api:github',
        timestamp: '2026-04-30T10:00:00.000Z',
        content: '{"issue":234}',
        metadata: { repo: 'echo', kind: 'issue' },
        embedding: [0.1, 0.2, 0.3],
      });
      const id = await store.append(input);
      const all = await store.query();
      expect(all).toHaveLength(1);
      const got = all[0]!;
      expect(got.id).toBe(id);
      expect(got.source).toBe(input.source);
      expect(got.timestamp).toBe(input.timestamp);
      expect(got.content).toBe(input.content);
      expect(got.metadata).toEqual(input.metadata);
      expect(got.embedding).toHaveLength(3);
      expect(got.embedding![0]).toBeCloseTo(0.1, 5);
      expect(got.embedding![1]).toBeCloseTo(0.2, 5);
      expect(got.embedding![2]).toBeCloseTo(0.3, 5);
    });

    it('omits metadata/embedding when not supplied', async () => {
      const id = await store.append(eventInput());
      const [evt] = await store.query();
      expect(evt!.id).toBe(id);
      expect(evt!.metadata).toBeUndefined();
      expect(evt!.embedding).toBeUndefined();
    });

    it('returns events in timestamp ASC order', async () => {
      const ids: string[] = [];
      const stamps = [
        '2026-04-30T12:04:00.000Z',
        '2026-04-30T12:00:00.000Z',
        '2026-04-30T12:02:00.000Z',
        '2026-04-30T12:01:00.000Z',
        '2026-04-30T12:03:00.000Z',
      ];
      for (let i = 0; i < stamps.length; i++) {
        ids.push(await store.append(eventInput({ content: `msg-${i}`, timestamp: stamps[i]! })));
      }
      const all = await store.query();
      expect(all.map((e) => e.timestamp)).toEqual([...stamps].sort());
    });
  });

  describe('id uniqueness', () => {
    it('produces 100 distinct ids across 100 appends', async () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(await store.append(eventInput({ content: `c-${i}` })));
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('count', () => {
    it('returns 0 on empty store', async () => {
      expect(await store.count()).toBe(0);
    });

    it('reflects appends accurately', async () => {
      for (let i = 0; i < 7; i++) {
        await store.append(eventInput());
      }
      expect(await store.count()).toBe(7);
    });
  });

  describe('source filter', () => {
    it('returns only events whose source exactly matches', async () => {
      await store.append(
        eventInput({ source: 'fs:cursor', timestamp: '2026-04-30T10:00:00.000Z' }),
      );
      await store.append(
        eventInput({ source: 'api:github', timestamp: '2026-04-30T10:01:00.000Z' }),
      );
      await store.append(
        eventInput({ source: 'fs:cursor', timestamp: '2026-04-30T10:02:00.000Z' }),
      );
      const cursor = await store.query({ source: 'fs:cursor' });
      expect(cursor).toHaveLength(2);
      expect(cursor.every((e) => e.source === 'fs:cursor')).toBe(true);
    });

    it('returns empty when no events match', async () => {
      await store.append(eventInput({ source: 'fs:cursor' }));
      expect(await store.query({ source: 'api:slack' })).toHaveLength(0);
    });
  });

  describe('time-range filter', () => {
    beforeEach(async () => {
      await store.append(eventInput({ timestamp: '2026-04-30T09:00:00.000Z', content: 'a' }));
      await store.append(eventInput({ timestamp: '2026-04-30T10:00:00.000Z', content: 'b' }));
      await store.append(eventInput({ timestamp: '2026-04-30T11:00:00.000Z', content: 'c' }));
      await store.append(eventInput({ timestamp: '2026-04-30T12:00:00.000Z', content: 'd' }));
    });

    it('since is inclusive', async () => {
      const r = await store.query({ since: '2026-04-30T10:00:00.000Z' });
      expect(r.map((e) => e.content)).toEqual(['b', 'c', 'd']);
    });

    it('until is exclusive', async () => {
      const r = await store.query({ until: '2026-04-30T11:00:00.000Z' });
      expect(r.map((e) => e.content)).toEqual(['a', 'b']);
    });

    it('combined since + until bounds [since, until)', async () => {
      const r = await store.query({
        since: '2026-04-30T10:00:00.000Z',
        until: '2026-04-30T12:00:00.000Z',
      });
      expect(r.map((e) => e.content)).toEqual(['b', 'c']);
    });
  });

  describe('limit filter', () => {
    it('caps result count at limit', async () => {
      for (let i = 0; i < 10; i++) {
        await store.append(
          eventInput({ content: `${i}`, timestamp: `2026-04-30T12:0${i}:00.000Z` }),
        );
      }
      const r = await store.query({ limit: 3 });
      expect(r).toHaveLength(3);
      expect(r.map((e) => e.content)).toEqual(['0', '1', '2']);
    });

    it('returns all when limit exceeds total', async () => {
      for (let i = 0; i < 3; i++) await store.append(eventInput({ content: `${i}` }));
      expect(await store.query({ limit: 100 })).toHaveLength(3);
    });
  });

  describe('combined filters', () => {
    beforeEach(async () => {
      await store.append(
        eventInput({ source: 'fs:cursor', timestamp: '2026-04-30T09:00:00.000Z', content: 'cur1' }),
      );
      await store.append(
        eventInput({ source: 'api:github', timestamp: '2026-04-30T10:00:00.000Z', content: 'gh1' }),
      );
      await store.append(
        eventInput({ source: 'fs:cursor', timestamp: '2026-04-30T11:00:00.000Z', content: 'cur2' }),
      );
      await store.append(
        eventInput({ source: 'fs:cursor', timestamp: '2026-04-30T12:00:00.000Z', content: 'cur3' }),
      );
      await store.append(
        eventInput({ source: 'fs:cursor', timestamp: '2026-04-30T13:00:00.000Z', content: 'cur4' }),
      );
    });

    it('source + since + limit compose correctly', async () => {
      const r = await store.query({
        source: 'fs:cursor',
        since: '2026-04-30T10:30:00.000Z',
        limit: 2,
      });
      expect(r.map((e) => e.content)).toEqual(['cur2', 'cur3']);
    });

    it('source + until rejects out-of-range matches', async () => {
      const r = await store.query({
        source: 'fs:cursor',
        until: '2026-04-30T11:00:00.000Z',
      });
      expect(r.map((e) => e.content)).toEqual(['cur1']);
    });
  });

  describe('close()', () => {
    it('is safe to call twice', () => {
      const s = new SqliteStorage(':memory:');
      s.close();
      expect(() => s.close()).not.toThrow();
    });
  });
});

describe('SqliteStorage durability', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'echo-sqlite-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('write → close → reopen → identical readback', async () => {
    const dbPath = join(dir, 'echo.db');
    const a = new SqliteStorage(dbPath);
    const id1 = await a.append(
      eventInput({ source: 'api:github', content: 'one', metadata: { x: 1 } }),
    );
    const id2 = await a.append(
      eventInput({
        source: 'fs:cursor',
        content: 'two',
        timestamp: '2026-04-30T12:01:00.000Z',
        embedding: [0.5, -0.5],
      }),
    );
    a.close();

    const b = new SqliteStorage(dbPath);
    expect(await b.count()).toBe(2);
    const all = await b.query();
    const ids = all.map((e) => e.id);
    expect(new Set(ids)).toEqual(new Set([id1, id2]));
    const byContent = new Map(all.map((e) => [e.content, e]));
    expect(byContent.get('one')!.metadata).toEqual({ x: 1 });
    expect(byContent.get('two')!.embedding).toHaveLength(2);
    expect(byContent.get('two')!.embedding![0]).toBeCloseTo(0.5, 5);
    expect(byContent.get('two')!.embedding![1]).toBeCloseTo(-0.5, 5);
    b.close();
  });
});

describe('migration runner', () => {
  it('starts at user_version 0 on a fresh DB and applies 0001 to reach 1', () => {
    const db = new Database(':memory:');
    expect(db.pragma('user_version', { simple: true })).toBe(0);
    const v = migrate(db, MIGRATIONS_DIR);
    expect(v).toBe(1);
    expect(db.pragma('user_version', { simple: true })).toBe(1);
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='events'`)
      .all() as { name: string }[];
    expect(tables).toHaveLength(1);
    db.close();
  });

  it('is a no-op on a DB already at the latest version', () => {
    const db = new Database(':memory:');
    migrate(db, MIGRATIONS_DIR);
    const v2 = migrate(db, MIGRATIONS_DIR);
    expect(v2).toBe(1);
    expect(db.pragma('user_version', { simple: true })).toBe(1);
    db.close();
  });
});
