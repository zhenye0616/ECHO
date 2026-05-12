import { describe, expect, it } from 'vitest';
import {
  resolveSources,
  waitForNewTurns,
  WAIT_MAX_SOURCES,
} from '../../src/mcp/tools/wait-for-new-turns.js';
import { MemoryStorage } from '../../src/storage/memory.js';
import type { CaptureEvent } from '../../src/storage/interface.js';

function ev(source: string, ts: string, content = 'turn'): Omit<CaptureEvent, 'id'> {
  return { source, timestamp: ts, content };
}

describe('wait_for_new_turns — source resolution', () => {
  it('source_app names map to PREFIX MATCH (different from echo_resolve_mru MRU)', () => {
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
  // dogfooding catches any regression.
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
    expect(r.turn_ids).toHaveLength(1);
    const [atom] = await store.getByIds(r.turn_ids);
    expect(atom!.source).toBe('fs:/A');
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
    expect(r.turn_ids).toHaveLength(1);
    const [atom] = await store.getByIds(r.turn_ids);
    expect(atom!.content).toContain('after turn');
  });

  it('times out with empty turn_ids + timed_out=true when no content lands', async () => {
    const store = new MemoryStorage();
    const r = await waitForNewTurns(
      store,
      { sources: ['fs:/A'], since: '2026-05-09T10:00:00.000Z', timeout: 0 },
      { pollIntervalMs: 50 },
    );
    expect(r.turn_ids).toEqual([]);
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
    expect(r.turn_ids.length).toBeGreaterThanOrEqual(1);
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
    expect(r.turn_ids.length).toBeGreaterThanOrEqual(2);
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
    // a shared subscriber registry or module-level mutable state. Item 038
    // / AC4: bodies are no longer bundled; hydrate via storage.getByIds to
    // verify the per-source slice.
    const [atomA] = await store.getByIds(rA.turn_ids);
    const [atomB] = await store.getByIds(rB.turn_ids);
    const [atomC] = await store.getByIds(rC.turn_ids);
    expect(atomA!.source).toBe('fs:/A');
    expect(atomB!.source).toBe('fs:/B');
    expect(atomC!.source).toBe('fs:/C');
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
    expect(r1.turn_ids).toEqual(r2.turn_ids);
  });
});

// Item 037 / AC5 — repo_path filter.
describe('wait_for_new_turns repo_path (item 037 / AC5)', () => {
  it('AC5: baseline (no repo_path) returns all matching turns', async () => {
    const store = new MemoryStorage();
    await store.append({
      source: 'fs:/A',
      timestamp: '2026-05-09T10:01:00.000Z',
      content: 'turn',
      metadata: { repo_root: '/repo-a' },
    });
    const r = await waitForNewTurns(
      store,
      { sources: ['fs:/A'], since: '2026-05-09T10:00:00.000Z', timeout: 0 },
      { pollIntervalMs: 30 },
    );
    expect(r.turn_ids).toHaveLength(1);
  });

  it('AC5: filters per-source results by metadata.repo_root', async () => {
    const store = new MemoryStorage();
    await store.append({
      source: 'fs:/A',
      timestamp: '2026-05-09T10:01:00.000Z',
      content: 'in repo a',
      metadata: { repo_root: '/repo-a' },
    });
    await store.append({
      source: 'fs:/A',
      timestamp: '2026-05-09T10:02:00.000Z',
      content: 'in repo b',
      metadata: { repo_root: '/repo-b' },
    });
    const r = await waitForNewTurns(
      store,
      {
        sources: ['fs:/A'],
        since: '2026-05-09T10:00:00.000Z',
        timeout: 0,
        repo_path: '/repo-a',
      },
      { pollIntervalMs: 30 },
    );
    const atoms = await store.getByIds(r.turn_ids);
    expect(atoms.map((a) => a.content)).toEqual(['in repo a']);
  });

  it('AC5: rejects non-absolute repo_path with a clear error', async () => {
    const store = new MemoryStorage();
    await expect(
      waitForNewTurns(
        store,
        {
          sources: ['fs:/A'],
          since: '2026-05-09T10:00:00.000Z',
          timeout: 0,
          repo_path: 'relative',
        },
        { pollIntervalMs: 30 },
      ),
    ).rejects.toThrow(/repo_path must be absolute/);
  });

  it('AC5: trailing-slash normalises to no-slash form', async () => {
    const store = new MemoryStorage();
    await store.append({
      source: 'fs:/A',
      timestamp: '2026-05-09T10:01:00.000Z',
      content: 'normalised',
      metadata: { repo_root: '/Users/x/Project_echo' },
    });
    const r = await waitForNewTurns(
      store,
      {
        sources: ['fs:/A'],
        since: '2026-05-09T10:00:00.000Z',
        timeout: 0,
        repo_path: '/Users/x/Project_echo/',
      },
      { pollIntervalMs: 30 },
    );
    const atoms = await store.getByIds(r.turn_ids);
    expect(atoms.map((a) => a.content)).toEqual(['normalised']);
  });
});

// Item 038 / AC4 — IDs-only contract.
describe('wait_for_new_turns — AC4 IDs-only response shape', () => {
  it('(a) returned `turn_ids` matches what would have been the old `turns[].id` (DESC newest-first)', async () => {
    const store = new MemoryStorage();
    const idA = await store.append({
      source: 'fs:/A',
      timestamp: '2026-05-09T10:01:00.000Z',
      content: 'turn 1',
    });
    const idB = await store.append({
      source: 'fs:/A',
      timestamp: '2026-05-09T10:02:00.000Z',
      content: 'turn 2',
    });
    const idC = await store.append({
      source: 'fs:/A',
      timestamp: '2026-05-09T10:03:00.000Z',
      content: 'turn 3',
    });
    const r = await waitForNewTurns(
      store,
      { sources: ['fs:/A'], since: '2026-05-09T10:00:00.000Z', timeout: 0 },
      { pollIntervalMs: 30 },
    );
    // Newest-first order, all three captured.
    expect(r.turn_ids).toEqual([idC, idB, idA]);
  });

  it('(b) no `content`, `metadata`, or `truncations` fields appear on the response', async () => {
    const store = new MemoryStorage();
    await store.append({
      source: 'fs:/A',
      timestamp: '2026-05-09T10:01:00.000Z',
      content: 'large content '.repeat(10_000),
      metadata: { workspace_id: 'a' },
    });
    const r = await waitForNewTurns(
      store,
      { sources: ['fs:/A'], since: '2026-05-09T10:00:00.000Z', timeout: 0 },
      { pollIntervalMs: 30 },
    );
    // Top-level shape carries only: schema_version, tool, turn_ids,
    // next_since, timed_out, warnings.
    expect(Object.keys(r).sort()).toEqual([
      'next_since',
      'schema_version',
      'timed_out',
      'tool',
      'turn_ids',
      'warnings',
    ]);
    // No accidental body fields exposed by structural type drift.
    expect((r as unknown as Record<string, unknown>)['turns']).toBeUndefined();
    expect((r as unknown as Record<string, unknown>)['content']).toBeUndefined();
    expect((r as unknown as Record<string, unknown>)['metadata']).toBeUndefined();
    // The envelope is bounded by ~36 chars per UUID + ~80 chars envelope,
    // even with a 130KB atom. Pre-AC4, the projected match body alone
    // would have pushed JSON.stringify(r) toward the 25KB ceiling.
    expect(JSON.stringify(r).length).toBeLessThan(1_000);
  });

  it('(c) integration: wait → get_atoms round-trip recovers the same atom bodies a single-call wait_for_new_turns would have returned pre-038', async () => {
    const store = new MemoryStorage();
    const idA = await store.append({
      source: 'fs:/A',
      timestamp: '2026-05-09T10:01:00.000Z',
      content: 'pre-038 body A',
    });
    const idB = await store.append({
      source: 'fs:/A',
      timestamp: '2026-05-09T10:02:00.000Z',
      content: 'pre-038 body B',
    });

    const w = await waitForNewTurns(
      store,
      { sources: ['fs:/A'], since: '2026-05-09T10:00:00.000Z', timeout: 0 },
      { pollIntervalMs: 30 },
    );
    expect(w.turn_ids).toEqual([idB, idA]);
    // Compose the canonical wake → fetch pattern.
    const atoms = await store.getByIds(w.turn_ids);
    expect(atoms.map((a) => a.content)).toEqual(['pre-038 body B', 'pre-038 body A']);
  });
});
