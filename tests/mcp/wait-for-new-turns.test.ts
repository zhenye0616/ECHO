import { describe, expect, it } from 'vitest';
import {
  resolveSources,
  waitForNewTurns,
  WAIT_MAX_SOURCES,
} from '../../src/mcp/tools/wait-for-new-turns.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import type { CaptureEvent } from '../../src/storage/interface.js';

function ev(
  source: string,
  ts: string,
  content = 'turn',
): Omit<CaptureEvent, 'id'> {
  return { source, timestamp: ts, content };
}

describe('wait_for_new_turns — source resolution', () => {
  it('source_app names map to PREFIX MATCH (different from tail_session MRU)', () => {
    const r = resolveSources(['cursor', 'claude_code']);
    expect(r.exact).toEqual([]);
    expect(r.prefixes).toHaveLength(2);
    expect(r.prefixes[0]).toContain('Cursor');
    expect(r.prefixes[1]).toContain('.claude/projects');
  });

  it('literal source paths are EXACT match', () => {
    const r = resolveSources(['fs:/Users/x/state.vscdb', 'git:/repo']);
    expect(r.exact).toEqual(['fs:/Users/x/state.vscdb', 'git:/repo']);
    expect(r.prefixes).toEqual([]);
  });

  it('mixed: literals + source_apps in one call', () => {
    const r = resolveSources(['fs:/exact.jsonl', 'codex']);
    expect(r.exact).toEqual(['fs:/exact.jsonl']);
    expect(r.prefixes).toHaveLength(1);
    expect(r.prefixes[0]).toContain('.codex/sessions');
  });
});

describe('wait_for_new_turns — validation', () => {
  it('rejects empty sources', async () => {
    const store = new MemoryStorage();
    await expect(
      waitForNewTurns(store, { sources: [], since: '2026-05-09T00:00:00.000Z' }),
    ).rejects.toThrow(/non-empty/);
  });

  it('rejects sources > WAIT_MAX_SOURCES', async () => {
    const store = new MemoryStorage();
    const sources = Array.from({ length: WAIT_MAX_SOURCES + 1 }, (_, i) => `fs:/x-${i}`);
    await expect(
      waitForNewTurns(store, { sources, since: '2026-05-09T00:00:00.000Z' }),
    ).rejects.toThrow(/max/);
  });

  it('rejects malformed since', async () => {
    const store = new MemoryStorage();
    await expect(
      waitForNewTurns(store, { sources: ['fs:/x'], since: 'not-a-date' }),
    ).rejects.toThrow(/ISO 8601/);
  });

  it('accepts timeout=0 (no wait, immediate return)', async () => {
    const store = new MemoryStorage();
    const startMs = Date.now();
    const r = await waitForNewTurns(
      store,
      { sources: ['fs:/nope'], since: '2026-05-09T00:00:00.000Z', timeout: 0 },
      { pollIntervalMs: 10 },
    );
    // Cheap path: should return well under 1s — only the initial poll runs.
    expect(Date.now() - startMs).toBeLessThan(1_000);
    expect(r.timed_out).toBe(true);
  });

  // Cap-at-WAIT_MAX_TIMEOUT_SECONDS is a 1-line clamp in the impl; we don't
  // runtime-verify the 60s cap because the test would have to actually wait
  // 60+ seconds to falsify a missing clamp. Lint + the impl is the contract;
  // dogfooding catches any regression. (Same trade-off the existing
  // `clampCount(MAX_COUNT)` in tail-session.ts makes.)
});

describe('wait_for_new_turns — happy path', () => {
  it('returns immediately when content already exists newer than `since`', async () => {
    const store = new MemoryStorage();
    await store.append(ev('fs:/A', '2026-05-09T10:01:00.000Z'));
    const r = await waitForNewTurns(
      store,
      {
        sources: ['fs:/A'],
        since: '2026-05-09T10:00:00.000Z',
        timeout: 30,
      },
      { pollIntervalMs: 50 },
    );
    expect(r.turns).toHaveLength(1);
    expect(r.turns[0]!.source).toBe('fs:/A');
    expect(r.timed_out).toBe(false);
  });

  it('STRICT-after `since`: rows AT the boundary timestamp are dropped (acceptance #3)', async () => {
    const store = new MemoryStorage();
    const boundary = '2026-05-09T10:00:00.000Z';
    await store.append(ev('fs:/A', boundary, 'boundary turn (must be dropped)'));
    await store.append(ev('fs:/A', '2026-05-09T10:00:01.000Z', 'after turn (must be kept)'));
    const r = await waitForNewTurns(
      store,
      { sources: ['fs:/A'], since: boundary, timeout: 5 },
      { pollIntervalMs: 50 },
    );
    expect(r.turns).toHaveLength(1);
    expect(r.turns[0]!.content).toContain('after turn');
  });

  it('times out with empty turns + timed_out=true when no content lands', async () => {
    const store = new MemoryStorage();
    const r = await waitForNewTurns(
      store,
      { sources: ['fs:/A'], since: '2026-05-09T10:00:00.000Z', timeout: 0 },
      { pollIntervalMs: 50 },
    );
    expect(r.turns).toEqual([]);
    expect(r.timed_out).toBe(true);
    // next_since is server clock at return — string parses as a date.
    expect(new Date(r.next_since).getTime()).not.toBeNaN();
  });

  it('wakes when content lands during the wait (poll loop)', async () => {
    const store = new MemoryStorage();
    // Schedule an append after a short delay; the poll loop should wake.
    setTimeout(() => {
      void store.append(ev('fs:/A', '2026-05-09T10:01:00.000Z', 'late arrival'));
    }, 30);

    const r = await waitForNewTurns(
      store,
      { sources: ['fs:/A'], since: '2026-05-09T10:00:00.000Z', timeout: 2 },
      { pollIntervalMs: 20 },
    );
    expect(r.turns.length).toBeGreaterThanOrEqual(1);
    expect(r.timed_out).toBe(false);
  });

  it('source_app PREFIX match catches content under the app prefix (NOT just MRU exact-source)', async () => {
    const store = new MemoryStorage();
    // Two cursor sessions; both should be caught by the prefix.
    await store.append(
      ev(
        // canonical cursor prefix is `fs:<HOME>/Library/Application Support/Cursor/...`
        // see buildSourceAppMap; we rebuild a synthetic match here.
        `fs:${process.env['HOME'] ?? ''}/Library/Application Support/Cursor/sess-1.vscdb`,
        '2026-05-09T10:01:00.000Z',
        'cursor session 1',
      ),
    );
    await store.append(
      ev(
        `fs:${process.env['HOME'] ?? ''}/Library/Application Support/Cursor/sess-2.vscdb`,
        '2026-05-09T10:02:00.000Z',
        'cursor session 2',
      ),
    );

    const r = await waitForNewTurns(
      store,
      { sources: ['cursor'], since: '2026-05-09T10:00:00.000Z', timeout: 1 },
      { pollIntervalMs: 50 },
    );
    expect(r.turns.length).toBeGreaterThanOrEqual(2);
  });
});

describe('wait_for_new_turns — stateless (acceptance #3 — 3 parallel calls with disjoint sources)', () => {
  it('3 parallel calls with disjoint `sources[]` are independent of each other (no cross-talk)', async () => {
    const store = new MemoryStorage();
    await store.append(ev('fs:/A', '2026-05-09T10:01:00.000Z', 'A turn'));
    await store.append(ev('fs:/B', '2026-05-09T10:02:00.000Z', 'B turn'));
    await store.append(ev('fs:/C', '2026-05-09T10:03:00.000Z', 'C turn'));

    const since = '2026-05-09T10:00:00.000Z';
    const [rA, rB, rC] = await Promise.all([
      waitForNewTurns(store, { sources: ['fs:/A'], since, timeout: 1 }, { pollIntervalMs: 30 }),
      waitForNewTurns(store, { sources: ['fs:/B'], since, timeout: 1 }, { pollIntervalMs: 30 }),
      waitForNewTurns(store, { sources: ['fs:/C'], since, timeout: 1 }, { pollIntervalMs: 30 }),
    ]);

    // Each call sees only its own source — no cross-contamination from
    // a shared subscriber registry or module-level mutable state.
    expect(rA.turns.map((t) => t.source)).toEqual(['fs:/A']);
    expect(rB.turns.map((t) => t.source)).toEqual(['fs:/B']);
    expect(rC.turns.map((t) => t.source)).toEqual(['fs:/C']);
  });

  it('a second invocation with same sources returns the same result (idempotent — no per-call state)', async () => {
    const store = new MemoryStorage();
    await store.append(ev('fs:/A', '2026-05-09T10:01:00.000Z', 'A turn'));
    const since = '2026-05-09T10:00:00.000Z';
    const r1 = await waitForNewTurns(
      store,
      { sources: ['fs:/A'], since, timeout: 0 },
      { pollIntervalMs: 30 },
    );
    const r2 = await waitForNewTurns(
      store,
      { sources: ['fs:/A'], since, timeout: 0 },
      { pollIntervalMs: 30 },
    );
    expect(r1.turns.map((t) => t.id)).toEqual(r2.turns.map((t) => t.id));
  });
});

describe('wait_for_new_turns — turns carry per-atom truncations field', () => {
  it('truncations field is always present on returned turns (V1.6 trust signal)', async () => {
    const store = new MemoryStorage();
    await store.append(ev('fs:/A', '2026-05-09T10:01:00.000Z', 'small'));
    const r = await waitForNewTurns(
      store,
      { sources: ['fs:/A'], since: '2026-05-09T10:00:00.000Z', timeout: 0 },
      { pollIntervalMs: 30 },
    );
    expect(r.turns[0]!.truncations).toEqual([]);
  });
});
