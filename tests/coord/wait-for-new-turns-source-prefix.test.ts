// AC4 (057a) — `wait_for_new_turns(source_prefix=...)` widening test.
//
// Each test maps to a sub-clause of AC4's "merge-blocking" inventory:
//   (a) prefix-only call valid → coord turns returned
//   (b) both `sources[]` and `source_prefix` supplied → UNION returned
//   (c) both absent / both empty → structured validation error
//   (d) snapshot match: pre-AC4 baseline `sources=[...]`-only call returns
//       byte-identical results post-AC4 (legacy callers unchanged)

import { describe, expect, it } from 'vitest';
import { waitForNewTurns } from '../../src/mcp/tools/wait-for-new-turns.js';
import { MemoryStorage } from '../../src/storage/memory.js';

const SINCE = '2026-05-16T00:00:00.000Z';
const AFTER_SINCE = '2026-05-16T00:00:01.000Z';

describe('AC4 — wait_for_new_turns source_prefix', () => {
  it('(a) prefix-only call returns coord turns from any role', async () => {
    const store = new MemoryStorage();
    await store.append({
      source: 'coord:codex',
      timestamp: AFTER_SINCE,
      content: '{"event_type":"tick_start"}',
    });
    await store.append({
      source: 'coord:codex-ops',
      timestamp: AFTER_SINCE,
      content: '{"event_type":"tick_start"}',
    });
    // Non-coord atom — must not appear when source_prefix narrows to "coord:".
    await store.append({
      source: 'fs:/Users/x/state.vscdb',
      timestamp: AFTER_SINCE,
      content: 'unrelated',
    });

    const r = await waitForNewTurns(
      store,
      { source_prefix: 'coord:', since: SINCE, timeout: 0 },
      { pollIntervalMs: 10 },
    );

    expect(r.timed_out).toBe(false);
    expect(r.turn_ids).toHaveLength(2);
  });

  it('(b) both sources[] and source_prefix supplied → UNION of matches', async () => {
    const store = new MemoryStorage();
    const idCoord = await store.append({
      source: 'coord:codex',
      timestamp: AFTER_SINCE,
      content: 'coord-side',
    });
    const idFs = await store.append({
      source: 'fs:/Users/x/state.vscdb',
      timestamp: AFTER_SINCE,
      content: 'fs-side',
    });

    const r = await waitForNewTurns(
      store,
      {
        sources: ['fs:/Users/x/state.vscdb'],
        source_prefix: 'coord:',
        since: SINCE,
        timeout: 0,
      },
      { pollIntervalMs: 10 },
    );

    expect(r.timed_out).toBe(false);
    expect(r.turn_ids).toHaveLength(2);
    expect(new Set(r.turn_ids)).toEqual(new Set([idCoord, idFs]));
  });

  it('(b) union is deduplicated when both filters match the same atom', async () => {
    // An atom whose source matches BOTH the exact source AND the prefix
    // (e.g. source = "coord:codex" matched by sources=["coord:codex"] AND
    // source_prefix="coord:") must appear EXACTLY ONCE in turn_ids — the
    // existing merged Map<id, event> in pollOnce dedups by atom id. AC4
    // says "No deduplication beyond turn-id uniqueness is needed."
    const store = new MemoryStorage();
    const id = await store.append({
      source: 'coord:codex',
      timestamp: AFTER_SINCE,
      content: 'one-atom',
    });

    const r = await waitForNewTurns(
      store,
      {
        sources: ['coord:codex'],
        source_prefix: 'coord:',
        since: SINCE,
        timeout: 0,
      },
      { pollIntervalMs: 10 },
    );

    expect(r.timed_out).toBe(false);
    expect(r.turn_ids).toEqual([id]);
  });

  it('(c) both absent → structured validation error', async () => {
    const store = new MemoryStorage();
    await expect(
      waitForNewTurns(store, { since: SINCE }),
    ).rejects.toThrow(/at least one of sources\[\] \(non-empty\) or source_prefix \(non-empty\)/);
  });

  it('(c) both empty → structured validation error', async () => {
    const store = new MemoryStorage();
    await expect(
      waitForNewTurns(store, { sources: [], source_prefix: '', since: SINCE }),
    ).rejects.toThrow(/at least one of sources\[\] \(non-empty\) or source_prefix \(non-empty\)/);
  });

  it('(d) pre-AC4 baseline byte-identical: sources=[exact] only', async () => {
    // The pre-AC4 path resolveSources(sources) with no source_prefix must
    // produce exactly the same wire result as before. This test exercises
    // the exact-source path with `source_prefix` deliberately omitted.
    const store = new MemoryStorage();
    const id = await store.append({
      source: 'fs:/Users/x/state.vscdb',
      timestamp: AFTER_SINCE,
      content: 'pre-AC4 caller',
    });

    const r = await waitForNewTurns(
      store,
      { sources: ['fs:/Users/x/state.vscdb'], since: SINCE, timeout: 0 },
      { pollIntervalMs: 10 },
    );

    expect(r).toEqual({
      schema_version: 1,
      tool: 'wait_for_new_turns',
      turn_ids: [id],
      next_since: r.next_since, // server-clock, asserted shape only
      timed_out: false,
      warnings: [],
    });
    // ISO-8601 shape sanity-check on next_since (the only non-deterministic field)
    expect(r.next_since).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
