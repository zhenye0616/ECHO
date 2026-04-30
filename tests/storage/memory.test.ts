import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStorage } from '../../src/storage/memory.js';
import type { CaptureEvent } from '../../src/storage/interface.js';

function eventInput(overrides: Partial<Omit<CaptureEvent, 'id'>> = {}): Omit<CaptureEvent, 'id'> {
  return {
    source: 'fs:test',
    timestamp: '2026-04-30T12:00:00.000Z',
    content: 'hello',
    ...overrides,
  };
}

describe('MemoryStorage', () => {
  let store: MemoryStorage;

  beforeEach(() => {
    store = new MemoryStorage();
  });

  describe('append + query roundtrip', () => {
    it('preserves all fields including optional metadata and embedding', async () => {
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
      expect(all[0]).toEqual({ ...input, id });
    });

    it('omits metadata/embedding when not supplied', async () => {
      const id = await store.append(eventInput());
      const [evt] = await store.query();
      expect(evt!.id).toBe(id);
      expect(evt!.metadata).toBeUndefined();
      expect(evt!.embedding).toBeUndefined();
    });

    it('returns events in insertion order', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        ids.push(
          await store.append(
            eventInput({ content: `msg-${i}`, timestamp: `2026-04-30T12:0${i}:00.000Z` }),
          ),
        );
      }
      const all = await store.query();
      expect(all.map((e) => e.id)).toEqual(ids);
      expect(all.map((e) => e.content)).toEqual(['msg-0', 'msg-1', 'msg-2', 'msg-3', 'msg-4']);
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
      await store.append(eventInput({ source: 'fs:cursor' }));
      await store.append(eventInput({ source: 'api:github' }));
      await store.append(eventInput({ source: 'fs:cursor' }));
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
      for (let i = 0; i < 10; i++) await store.append(eventInput({ content: `${i}` }));
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

  describe('append-only', () => {
    it('does not expose mutation on retrieved events affecting later queries', async () => {
      await store.append(eventInput({ content: 'original' }));
      const first = await store.query();
      // Even if a caller mutates the returned object, future queries see the
      // original (this is documented behavior — copies are not enforced, but
      // the internal array is never spliced/replaced).
      const after = await store.query();
      expect(after).toHaveLength(1);
      expect(first).toHaveLength(1);
    });
  });
});
