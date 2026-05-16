// 057a AC1 — non-pollution three-way invariant (AC8 entry).
//
// All three must pass simultaneously (per spec line 236):
//   - search_memories() returns 0 coord atoms (default-exclude works)
//   - search_memories(source_prefix="coord:") returns N coord atoms
//     (forensic retrieval opt-in works)
//   - wait_for_new_turns(source_prefix="coord:") returns N coord turn ids
//     (mailbox contract from AC4)
//
// The dedicated search-memories exclusion (NOT shared with the
// withFsExclusion helper) is the load-bearing invariant: putting the
// exclusion in withFsExclusion would also break the wait_for_new_turns
// path (which uses the helper through its own filter compose pipeline).

import { describe, expect, it } from 'vitest';
import { searchMemories } from '../../src/mcp/tools/search-memories.js';
import { waitForNewTurns } from '../../src/mcp/tools/wait-for-new-turns.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import { COORD_SESSION_ID, COORD_SURFACE } from '../../src/coord/types.js';

async function seedCoord(store: MemoryStorage): Promise<{ coordIds: string[]; nonCoordId: string }> {
  const id1 = await store.append({
    source: 'coord:codex',
    timestamp: '2026-05-16T08:00:00.000Z',
    content: JSON.stringify({ event_type: 'tick_start', tier: 'round' }),
    metadata: {
      surface: COORD_SURFACE,
      session_id: COORD_SESSION_ID,
      coord: { event_type: 'tick_start', subject_role: 'codex', correlation_id: 'r1' },
    },
  });
  const id2 = await store.append({
    source: 'coord:codex-ops',
    timestamp: '2026-05-16T08:00:01.000Z',
    content: JSON.stringify({ event_type: 'tick_start', tier: 'round' }),
    metadata: {
      surface: COORD_SURFACE,
      session_id: COORD_SESSION_ID,
      coord: { event_type: 'tick_start', subject_role: 'codex-ops', correlation_id: 'r1' },
    },
  });
  // Non-coord atom — should appear in unfiltered search_memories AND NOT in
  // the source_prefix="coord:" subset.
  const idNon = await store.append({
    source: 'fs:/Users/x/state.vscdb',
    timestamp: '2026-05-16T08:00:02.000Z',
    content: 'a regular captured turn',
  });
  return { coordIds: [id1, id2], nonCoordId: idNon };
}

describe('AC1 non-pollution three-way', () => {
  it('search_memories() default-excludes coord atoms', async () => {
    const store = new MemoryStorage();
    const { coordIds, nonCoordId } = await seedCoord(store);

    const result = await searchMemories(store, {});
    const returnedIds = new Set(result.matches.map((m) => m.id));
    for (const cid of coordIds) {
      expect(returnedIds.has(cid)).toBe(false);
    }
    expect(returnedIds.has(nonCoordId)).toBe(true);
  });

  it('search_memories(source_prefix="coord:") returns coord atoms (forensic opt-in)', async () => {
    const store = new MemoryStorage();
    const { coordIds, nonCoordId } = await seedCoord(store);

    const result = await searchMemories(store, { source_prefix: 'coord:' });
    const returnedIds = new Set(result.matches.map((m) => m.id));
    for (const cid of coordIds) {
      expect(returnedIds.has(cid)).toBe(true);
    }
    expect(returnedIds.has(nonCoordId)).toBe(false);
  });

  it('search_memories(source="coord:codex") returns just that role\'s coord atoms', async () => {
    // Exact-source filter is also an explicit opt-in — same rule, narrower.
    const store = new MemoryStorage();
    const { coordIds } = await seedCoord(store);

    const result = await searchMemories(store, { source: 'coord:codex' });
    const returnedIds = new Set(result.matches.map((m) => m.id));
    expect(returnedIds.size).toBe(1);
    expect(returnedIds.has(coordIds[0]!)).toBe(true); // codex's atom
    expect(returnedIds.has(coordIds[1]!)).toBe(false); // codex-ops's atom
  });

  it('wait_for_new_turns(source_prefix="coord:") returns coord turn ids (AC4 + AC1 mailbox contract)', async () => {
    const store = new MemoryStorage();
    const { coordIds, nonCoordId } = await seedCoord(store);

    const result = await waitForNewTurns(
      store,
      { source_prefix: 'coord:', since: '2026-05-16T00:00:00.000Z', timeout: 0 },
      { pollIntervalMs: 10 },
    );
    const returnedIds = new Set(result.turn_ids);
    for (const cid of coordIds) {
      expect(returnedIds.has(cid)).toBe(true);
    }
    expect(returnedIds.has(nonCoordId)).toBe(false);
  });

  it('all three invariants hold simultaneously on one store', async () => {
    const store = new MemoryStorage();
    const { coordIds, nonCoordId } = await seedCoord(store);

    const [defaultSearch, forensicSearch, waitResult] = await Promise.all([
      searchMemories(store, {}),
      searchMemories(store, { source_prefix: 'coord:' }),
      waitForNewTurns(
        store,
        { source_prefix: 'coord:', since: '2026-05-16T00:00:00.000Z', timeout: 0 },
        { pollIntervalMs: 10 },
      ),
    ]);

    // (1) default-exclude
    const defaultIds = new Set(defaultSearch.matches.map((m) => m.id));
    for (const cid of coordIds) expect(defaultIds.has(cid)).toBe(false);

    // (2) forensic opt-in
    const forensicIds = new Set(forensicSearch.matches.map((m) => m.id));
    for (const cid of coordIds) expect(forensicIds.has(cid)).toBe(true);
    expect(forensicIds.has(nonCoordId)).toBe(false);

    // (3) wait mailbox
    const waitIds = new Set(waitResult.turn_ids);
    for (const cid of coordIds) expect(waitIds.has(cid)).toBe(true);
    expect(waitIds.has(nonCoordId)).toBe(false);
  });
});
