---
item_id: 2026-04-30-014-mcp-search-memories
verdict: merge with founder fixups
reviewed_at: 2026-05-01T05:50:00Z
test_counts: { passed: 191, failed: 0, flaky: true }
prior_head_sha: 37a2ff7ccc3d5cbdd0d797f9dffb5971663125d1
reviewed_head_sha: 37a2ff7ccc3d5cbdd0d797f9dffb5971663125d1
---

## Verdict

Re-review confirms prior verdict (`merge with founder fixups`). Worktree HEAD still matches recorded `head_sha` (`37a2ff7`); the agent did not amend. Main has advanced by two commits (`simplify:` cleanup + the prior `review:` commit) but neither touches this branch's six-file surface. Both prior bug calls remain at the same line numbers. The 20 search-memories tests pass deterministically across both new runs (~357ms each). The chokidar flake reproduced on run 2 with **different failing tests** than run 1 — confirming "race, not deterministic regression" and that the flake is pre-existing and disjoint from this branch's surface. No new bugs spotted on second pass.

## Pre-merge fixups

- [ ] `src/storage/sqlite.ts:90` — `source LIKE @source_prefix || '%'` lacks `ESCAPE '\'` clause and input-side `%`/`_`/`\` escaping. A `source_prefix` of `cursor%` would over-match. Not a security blocker (loopback-only V1, AI-client-supplied prefixes), but a correctness footgun. ~5 lines.
- [ ] `src/storage/memory.ts:30` — `limit` returns first-N-inserted (oldest), not most-recent. Latent today (the tool doesn't pass `limit` to storage), but `Storage` is now used by a consumer that expects time-ordered semantics. Smaller fix: add a one-line comment documenting insertion-order semantics, matching SQLite's `ORDER BY timestamp ASC`. Founder call (a) comment vs (b) implement DESC iteration.

## Expected merge conflicts

None — confirmed against current main (`6ed7be9`).

- `src/mcp/server.ts` — clean addition (1 import + 1 call); main untouched.
- `src/storage/interface.ts` — clean +1 line (`source_prefix?: string`); main untouched.
- `src/storage/memory.ts`, `src/storage/sqlite.ts` — clean additions; main untouched.
- `src/mcp/tools/search-memories.ts`, `tests/mcp/tools/search-memories.test.ts` — new files.
- The `simplify:` commit on main is **disjoint** (only `sources.ts`, `git-watcher.ts`, `extractors/claude-code.ts`).

## Follow-up items (defer, do not block merge)

- Wire `limit: MAX_OVERFETCH` into `storage.query` once storage guarantees timestamp-DESC ordering — for large datasets, the current code loads the entire matching set into memory before sorting/slicing.
- Investigate the chokidar lifecycle flake in `cursor.test.ts` / `claude-code.test.ts` / `fs-watcher.test.ts`. Likely a teardown race surfaced by ~10% additional CPU pressure from 20 new tests. Different test fails each run (run 1 clean; run 2: `cursor.test.ts` end-to-end + backfill timeouts). Stop-gap: bump global `testTimeout`. Real fix: investigate `watcher.close()` race. (Test-infra item.)
- Add `order` / `order_by` to `QueryFilter` when a second consumer needs DESC. Document as a Spec Authoring Lesson.

## Open questions for founder

(none — verdict is `merge with founder fixups`, not `block`)

## Notes carried forward to merge

- Re-review at `2026-05-01T05:50:00Z` (~12h after first review). No state changes on the agent's branch; main moved by 2 unrelated commits. Verdict, fixups, and follow-ups all unchanged.
- Test suite total grew from 190 → 191 between reviews (one extra test counted in run 1; run 2 timed out on 2 chokidar tests = 189). Search-memories' 20 tests pass deterministically in both.
- The `source_prefix` mutex pattern (`source` exact OR `source_prefix` prefix, never both) is reusable; both backends implement it identically.
