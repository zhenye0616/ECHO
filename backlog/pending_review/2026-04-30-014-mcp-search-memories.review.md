---
item_id: 2026-04-30-014-mcp-search-memories
verdict: merge with founder fixups
reviewed_at: 2026-04-30T17:00:00Z
test_counts: { passed: 190, failed: 1, flaky: true }
prior_head_sha: ""
reviewed_head_sha: 37a2ff7ccc3d5cbdd0d797f9dffb5971663125d1
---

## Verdict

Implementation is tight, correct, well-tested, and on-spec. The `QueryFilter.source_prefix` extension is explicitly authorized by the item body — agent's claim is correct. All 20 new search-memories tests pass deterministically across multiple runs; lint + typecheck clean. The chokidar flake is **pre-existing**, varies by run (different test name each time), and is unrelated to this branch's diff. Two pre-merge fixups (SQLite LIKE wildcard escaping; clarify `MemoryStorage.query` `limit` semantics) and three non-blocking follow-ups.

## Pre-merge fixups

- [ ] `src/storage/sqlite.ts:90` — `source LIKE @source_prefix || '%'` does not escape `%`, `_`, `\` in the prefix. Add `ESCAPE '\'` clause and escape these characters in input. Not a security blocker (loopback-only, AI-client-supplied prefixes), but a correctness footgun: a prefix like `cursor%` would over-match. ~5 lines.
- [ ] `src/storage/memory.ts:30` — `limit` returns first-N-inserted (oldest), not most-recent. Today `searchMemories` doesn't pass `limit` to storage so this is latent, but `Storage` is now used by a consumer that expects time-ordered semantics. Pick one: (a) add a one-line comment documenting the insertion-order semantics, or (b) implement DESC iteration. Founder call; (a) is the smaller change and matches current SQLite behavior (`ORDER BY timestamp ASC`).

## Expected merge conflicts

- `src/mcp/server.ts` — Trivial. Branch adds `import {registerSearchMemories}` and one call after `registerEchoPing`. Take branch.
- `src/storage/interface.ts` — Branch adds one line (`source_prefix?: string`) to `QueryFilter`. Clean addition.
- `src/storage/memory.ts`, `src/storage/sqlite.ts` — Clean additions. The dirty `/simplify` working-tree changes on `sources.ts` / `git-watcher.ts` / `claude-code.ts` extractor do **not** intersect this diff.

## Follow-up items (defer, do not block merge)

- Wire `limit: MAX_OVERFETCH` into `storage.query` once storage guarantees timestamp-DESC ordering — for large datasets, the current code loads the entire matching set into memory before sorting/slicing. (Cross-cuts `Storage` interface design.)
- Investigate the chokidar lifecycle flake in `claude-code.test.ts` / `fs-watcher.test.ts` / `cursor.test.ts`. Likely a teardown race surfaced by the additional CPU pressure from 20 new tests (~10% load). Stop-gap: bump global `testTimeout` to 15s. Real fix: investigate watcher.close() race. (Test infra item.)
- Add `order` / `order_by` to `QueryFilter` when a second consumer needs DESC. Until then, the in-tool sort is fine. Document as a Spec Authoring Lesson per the established pattern.

## Open questions for founder

(none — verdict is `merge with founder fixups`, not `block`)

## Notes carried forward to merge

- Agent correctly resisted modifying `vitest.config.ts` (would have been drift); the timeout-bump idea is captured as a follow-up instead.
- Pre-existing flake count: ~10% of test runs hit a 5s-timeout in a chokidar test. Different test fails each run (race, not deterministic). All search-memories tests pass 100%.
- The `source_prefix` extension is the right design call — both backends now have a uniform mutex (`source` exact OR `source_prefix` prefix, never both). Pattern reusable for future filters.
