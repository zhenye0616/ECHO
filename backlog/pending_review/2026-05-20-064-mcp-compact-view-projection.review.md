---
item_id: 2026-05-20-064-mcp-compact-view-projection
verdict: merge as-is
reviewed_at: 2026-05-20T22:55:00Z
test_counts: { passed: 1133, failed: 1, skipped: 21, raycast_passed: 71, raycast_failed: 0, lint: clean, typecheck: clean }
---

## Verdict

Merge as-is. The implementation cleanly satisfies AC1–AC8 against the converged r3 contract. The shared `src/mcp/wire-shape/compact.ts` projector composes correctly on top of `match.ts` (caps SIZES first, compact removes FIELDS second), budget accounting runs on post-compact bytes per the r1 codex-ops F5 fix, the registered output schemas are widened minimally (`query` + `result_caps` made optional), Raycast opts in to compact for both `findClusters()` and `getAtoms()`, UUID-fallback labels render as `null` under compact, and the `<!-- ECHO cluster ${id} -->` debug HTML-comment leak is removed. AC8 journal entry exists. Root tests: 1133 passed / 1 failed / 21 skipped — the single failure (`tests/mcp/recent-calls-endpoint.test.ts`, 5s test-timeout) is a known flake unrelated to 064 (no diff vs main, passes in isolation). Lint, typecheck, and Raycast suite (71/0 across 10 files including new `test/mcp.test.ts`) all clean.

## Pre-merge fixups

(none — merge as-is)

## Expected merge conflicts

- None expected. `git log origin/main -5` shows main has only advanced with claim/review-coordination commits since `agent/mcp-compact-view-projection` was cut; no changes to `find-clusters.ts`, `get-atoms.ts`, `match.ts`, or the Raycast files modified here.

## Follow-up items (defer, do not block merge)

- Add a wire-shape test that exercises `compact.ts:184`'s `inferSourceKind` returning `'unknown'` so the universal-only fallback path is explicitly pinned by a test. Currently a new ingestor adding atoms with novel `source` strings would silently lose all promoted metadata; risk is low but the contract should be testable.
- Consider promoting the rich/compact dispatch in `find-clusters.ts:240-247` to a typed `CompactFindClustersResult` (currently relies on `as unknown as FindClustersResult` cast at line 246) — type safety only, no runtime behavior change.
- Restart the resident daemon on `127.0.0.1:38478` after merge so live Raycast calls actually hit the new projection. (Per AC8 journal note, the builder validated against a feature-branch daemon; production daemon predates merge.)
- Investigate the `tests/mcp/recent-calls-endpoint.test.ts` 5s timeout flake separately — pre-existing on main, not introduced by 064, but persistent.

## Notable decisions verified

- **`tools/raycast-echo/src/components/EmptyState.tsx`** received a 1-line null-safe `rank_reason?.includes(...) === true` change outside `files_to_modify`. **Stand.** This is a necessary co-change with AC6's mandated relaxation of `FindClustersCluster.rank_reason` to optional; without it TypeScript compile would fail on the existing `EmptyState`. The symmetric pattern is applied in `echo.tsx:202` (which IS in `files_to_modify`), so the EmptyState edit is consistent with the in-scope edit, not a new pattern. Splitting into a distinct compact-typed cluster (the spec's rejected AC6 alternative) would force a wider surface change for trivial type narrowing.
- **No removal-over-deeper-patching considerations** were live — all r1/r2 reviewer findings targeted original spec text, not prior-round patches.
- **All three review rounds** (r1 6 findings, r2 2 findings, r3 0 findings) converged cleanly with codex + codex-ops; the builder honored every dispositioned patch from the converged spec at `2ca2572`.
