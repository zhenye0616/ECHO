import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { processCandidate } from '../../src/capture/pipeline.js';
import { CAPTURED_SOURCES } from '../../src/capture/sources.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import { resetAllowlist } from '../fixtures/allowlist.js';
import { captureStdout } from '../fixtures/stdout.js';

let restoreStdout: () => void;

function validEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    source: 'fs:/tmp/test.txt',
    timestamp: '2026-04-30T12:00:00.000Z',
    content: 'hello',
    ...overrides,
  };
}

describe('processCandidate', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    ({ restore: restoreStdout } = captureStdout());
  });

  afterEach(() => {
    restoreStdout();
    resetAllowlist();
  });

  describe('accept path', () => {
    it('appends to storage and returns the id when gate accepts', async () => {
      const apis = CAPTURED_SOURCES.apis as unknown as string[];
      apis.push('github');

      const before = await storage.count();
      const result = await processCandidate(
        validEvent({ source: 'api:github', content: '{"issue":234}' }),
        storage,
      );

      expect(result.accepted).toBe(true);
      if (!result.accepted) throw new Error('unreachable');
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);

      const after = await storage.count();
      expect(after).toBe(before + 1);

      const all = await storage.query();
      expect(all).toHaveLength(1);
      expect(all[0]!.id).toBe(result.id);
      expect(all[0]!.source).toBe('api:github');
      expect(all[0]!.content).toBe('{"issue":234}');
    });

    it('preserves metadata through the pipeline', async () => {
      const apis = CAPTURED_SOURCES.apis as unknown as string[];
      apis.push('github');

      const result = await processCandidate(
        validEvent({
          source: 'api:github',
          metadata: { repo: 'echo', kind: 'issue' },
        }),
        storage,
      );

      expect(result.accepted).toBe(true);
      const [evt] = await storage.query();
      expect(evt!.metadata).toEqual({ repo: 'echo', kind: 'issue' });
    });

    it('drops any caller-supplied id; storage assigns its own', async () => {
      const apis = CAPTURED_SOURCES.apis as unknown as string[];
      apis.push('github');

      const result = await processCandidate(
        validEvent({ source: 'api:github', id: 'caller-supplied-id' }),
        storage,
      );

      expect(result.accepted).toBe(true);
      if (!result.accepted) throw new Error('unreachable');
      expect(result.id).not.toBe('caller-supplied-id');
      const [evt] = await storage.query();
      expect(evt!.id).toBe(result.id);
    });
  });

  describe('reject path — well-formed but not allowlisted', () => {
    it('does not touch storage and returns the gate rejection reason', async () => {
      const before = await storage.count();
      const result = await processCandidate(validEvent({ source: 'api:github' }), storage);

      expect(result).toEqual({ accepted: false, reason: 'unknown_api' });
      const after = await storage.count();
      expect(after).toBe(before);
      expect(after).toBe(0);
    });

    it('reuses every gate rejection reason verbatim', async () => {
      const cases: { source: string; reason: string }[] = [
        { source: 'app:com.example.foo', reason: 'unknown_app' },
        { source: 'domain:example.com', reason: 'unknown_domain' },
        { source: 'fs:/etc/passwd', reason: 'unknown_path' },
        { source: 'api:slack', reason: 'unknown_api' },
      ];
      for (const c of cases) {
        const r = await processCandidate(validEvent({ source: c.source }), storage);
        expect(r).toEqual({ accepted: false, reason: c.reason });
      }
      expect(await storage.count()).toBe(0);
    });
  });

  describe('reject path — malformed event', () => {
    const cases: { name: string; input: unknown }[] = [
      { name: 'null', input: null },
      { name: 'empty object', input: {} },
      { name: 'missing source', input: { timestamp: '2026-04-30T12:00:00Z', content: 'x' } },
      { name: 'unknown kind prefix', input: { source: 'usb:abc', timestamp: 't', content: 'x' } },
    ];

    for (const c of cases) {
      it(`returns malformed_event without touching storage (${c.name})`, async () => {
        const before = await storage.count();
        const r = await processCandidate(c.input, storage);
        expect(r).toEqual({ accepted: false, reason: 'malformed_event' });
        const after = await storage.count();
        expect(after).toBe(before);
        expect(after).toBe(0);
      });
    }
  });

  describe('storage is dependency-injected', () => {
    it('two distinct storage instances do not share state', async () => {
      const apis = CAPTURED_SOURCES.apis as unknown as string[];
      apis.push('github');

      const a = new MemoryStorage();
      const b = new MemoryStorage();

      await processCandidate(validEvent({ source: 'api:github' }), a);
      expect(await a.count()).toBe(1);
      expect(await b.count()).toBe(0);
    });
  });
});
