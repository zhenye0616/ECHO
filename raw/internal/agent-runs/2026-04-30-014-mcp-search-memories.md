---
agent_id: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
item: 2026-04-30-014-mcp-search-memories
branch: agent/mcp-search-memories
head_sha: 37a2ff7ccc3d5cbdd0d797f9dffb5971663125d1
started: 2026-04-30T20:05:00Z
finished: 2026-04-30T20:18:00Z
---

# Agent Run — 2026-04-30-014-mcp-search-memories

## What I implemented

The MCP `search_memories` tool — the first real retrieval surface that closes the killer-demo loop. AI clients (Cursor, Claude Code) can now call this tool over the MCP server (item 013) to pull captured ECHO events by free-text query, source prefix, and/or time window.

Implementation outline:

1. **Storage extension (spec-authorized).** Extended `QueryFilter` with `source_prefix?: string` (mutually exclusive with `source`). Honored by both `MemoryStorage` (in-memory `startsWith`) and `SqliteStorage` (`source LIKE @source_prefix || '%'`). Throws on simultaneous use of both fields. Default behavior of every other call site unchanged — the existing 35 storage tests continue to pass.
2. **Tool implementation.** New file `src/mcp/tools/search-memories.ts`:
   - `searchMemories(storage, params)` — pure async function returning the spec-shaped result envelope. Easy to unit-test without a server.
   - `registerSearchMemories(server, storage)` — registers the tool with the MCP SDK using the existing `registerTool` pattern.
   - Behavior: applies defaults (limit=10), clamps limit to [1, 50], builds `QueryFilter` from `source_prefix`/`since`/`until` (no `limit` passed to storage), pulls all matching events, sorts DESC by timestamp, takes top `min(limit*4, 200)` candidates, applies optional case-insensitive substring filter on `content`, returns top `limit`.
   - ISO 8601 inputs validated via zod regex (`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}`); SDK wraps validation failures as tool errors automatically.
3. **Server wiring.** `src/mcp/server.ts` now passes `storage` (was `_storage`) into session creation and registers `search_memories` alongside `echo_ping`.

## Files modified

- `src/storage/interface.ts` (+1 line) — `QueryFilter.source_prefix?`
- `src/storage/memory.ts` (+5 lines) — honor `source_prefix`, mutex with `source`
- `src/storage/sqlite.ts` (+7 lines) — same, parameterized `LIKE @prefix || '%'`
- `src/mcp/server.ts` (+3, –1) — register `search_memories` and pass storage through
- `src/mcp/tools/search-memories.ts` (NEW, 131 lines)
- `tests/mcp/tools/search-memories.test.ts` (NEW, 327 lines, 20 tests)

Branch: `agent/mcp-search-memories`. HEAD: `37a2ff7`.

## Decisions made (spec did not pre-specify)

- **DESC ordering implemented in the tool, not in storage.** The spec implementation note says "Pull `Math.min(limit * 4, 200)` candidates ordered by `timestamp DESC` from `Storage.query`," but storage's existing API has no `order` field and the only spec-authorized extension was `source_prefix`. To avoid drift, I did not add an `order` field to `QueryFilter`. Instead the tool fetches all matches matching the filter, sorts DESC in-memory, and slices the overfetch window. For V1 dataset sizes this is fine; if retrieval becomes a hotspot, V1.5 should add `order` to `QueryFilter`. Documented as a follow-up.
- **`source_prefix` semantics: exact prefix match.** Implemented as `startsWith` (memory) / `LIKE 'prefix%'` (sqlite). Mutually exclusive with `source` — throws if both are passed. The MCP tool only exposes `source_prefix`, so external callers can't trigger the conflict.
- **Defaults & clamping.** `limit=10` default, clamp to [1, 50]; non-integers `Math.floor`'d; `Number.NaN` falls back to default. `0` and negative limits clamp up to 1 (chose this over rejecting; matches existing tool ergonomics like `echo_ping`).
- **Metadata in output.** Preserve `metadata` only when present on the event (omitted from JSON when `undefined`) — matches `MemoryStorage` round-trip semantics. The spec example shows it always present, but real events without metadata would otherwise produce `metadata: null` which is more confusing than omission.

## Acceptance criteria — status

- [x] `search_memories` registered on the MCP server — verified by `tools/list` E2E test
- [x] Input schema (all five fields optional) — zod schema as specified
- [x] Defaults: limit=10; clamp to [1,50] — verified by tests
- [x] Behavior: storage query → DESC sort → overfetch min(limit*4, 200) → substring filter → top limit
- [x] Output shape: `{ matches, total_returned, limit_applied, query_echo }` — verified
- [x] Tool description matches spec verbatim — verified by E2E test
- [x] Tests: empty query / substring / source_prefix cursor-chat / source_prefix git / since+until / limit / combined
- [x] Edge cases: limit clamp at 50; malformed timestamps → tool error response (NOT crash)
- [x] E2E test through real MCP server with seeded MemoryStorage
- [x] `npm run lint` clean
- [x] `npm run typecheck` clean
- [⚠️] `npm run test` — see test stability note below

## Test results

**Sequential mode (`--pool=forks --poolOptions.forks.singleFork=true`):** 14 files, 191 tests, all passing. Stable across runs.

**Default parallel mode (`npm test`):** Flaky on this machine. Roughly 50% of runs hit a 5s-timeout failure in one of:
- `tests/capture/extractors/claude-code.test.ts > startClaudeCodeExtractor (lifecycle + integration) > …`
- `tests/capture/extractors/cursor.test.ts > startCursorExtractor (lifecycle + integration) > …`
- `tests/capture/surfaces/fs-watcher.test.ts > startFsWatcher > stop() …`

The failing test name varies between runs. None of my changes touch fs-watcher, the extractors, or chokidar. The root cause appears to be a pre-existing race in the chokidar-based watcher lifecycle teardown that gets squeezed past the 5s test timeout under heavier parallel CPU contention. The new `search_memories` test file adds ~350ms and 20 tests (191 vs 171), which is enough additional CPU pressure to surface the race more often.

Verification:
- All 20 of my new tests pass on every run.
- Failing test names differ between runs (not deterministic).
- Failing tests pass in isolation (`vitest run tests/capture/...`).
- Whole suite passes when run sequentially.
- Tried bumping `testTimeout` to 15s in `vitest.config.ts` — reduced but did not eliminate flakiness; reverted (vitest.config.ts is not in `files_to_modify`).

I did not pursue an in-scope mitigation because (a) the race is in surfaces I'm not authorized to modify and (b) the spec for this item does not include a "fix flaky tests" line. Leaving the situation honest in agent_notes for founder review.

## Open questions for founder

1. **Are the flaky fs-watcher / extractor lifecycle tests considered a blocker for this merge?** My code passes lint/typecheck/own-tests; the flakiness is pre-existing infrastructure brittleness that this item exposes via additional test load.
2. **If yes, suggested follow-up backlog items:**
   - Add `testTimeout: 15000` (or higher) to `vitest.config.ts`, or
   - Move chokidar lifecycle tests to `--isolate` / single-thread, or
   - Investigate the race in `startFsWatcher`/extractor `stop()` — likely a missing `await` on chokidar's internal close.
3. **Should `QueryFilter` get an `order: 'asc' | 'desc'` field in a follow-up?** I deliberately didn't add it (would have been drift), but for SQLite it's a one-line change and would let the tool pass `LIMIT @limit*4 ORDER BY timestamp DESC` directly to storage, avoiding an unbounded read at scale. V1 fine; flag for V1.5.

## Drift events caught

None. The temptation to "while I'm in here, add `order` to `QueryFilter`" was caught and logged here; the temptation to "just fix the flaky tests" was caught and the `vitest.config.ts` tweak was reverted before commit.
