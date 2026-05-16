---
item_id: 2026-05-16-057a-coord-substrate-and-observability
verdict: merge as-is
reviewed_at: 2026-05-16T08:55:26Z
test_counts: { passed: 1080, failed: 0, skipped: 21 }
---

## Verdict

Merge as-is. The branch lands cleanly against all 9 ACs (AC7 N/A by spec). Typecheck, lint, lint:task-state, and the full suite (1080 passed / 21 skipped pre-existing / 0 failures) pass at the recorded SHA `09782a4`. Substrate seams — narrow `coord_emit` append path, ajv-validated `loadCoordRoles`, single-actor mutation lane with cache-hit-also-terminal `fireMissedDeadline`, dual storage methods (`iterateCoordAtomsByAppendOrder` + `getCurrentCoordSequence`) with watermark semantics, on-demand `coord_status` scan, and the 100k-atom perf fixture — match the spec body exactly, with the convergent r1–r8 review history baked in. The agent's two flagged reviewer-decision points (test consolidation; MemoryStorage perf proxy) are sound and explicitly anticipated in spec text. Ships dormant per spec; 057b will wire production emission.

## Pre-merge fixups

- None.

## Expected merge conflicts

- `package.json` — context-only (ajv + ajv-formats inserted alphabetically).
- `package-lock.json` — semantic; re-run `npm install` post-merge to regenerate cleanly.
- `src/mcp/server.ts` — structural; multiple insertion points (imports + loader + tracker construction + tool registration). Low semantic conflict, but any concurrent server-edit collides on hunks — apply this branch's hunks first.
- `src/storage/memory.ts` — structural; internal `_seq` counter wired into existing `append`/`query`/`getByIds` via `stripSeq`. Any concurrent change to those methods needs re-rationalization.
- `src/storage/{interface,sqlite}.ts` — context-only (additive at end).
- `src/mcp/tools/{search-memories,wait-for-new-turns}.ts` — context-only.
- `tools/{render-trace,serve-trace,stream-watch}.ts` — context-only delegating stubs appended.
- New files (`src/coord/*`, `src/mcp/tools/coord-{emit,status}.ts`, `tools/review-queue/coord-roles*`, `tools/review-queue/_coord_roles.py`, `tools/coord-status.sh`, `backlog/task-state/.../builder.md`) — no conflicts.

No HIGH-severity collisions expected.

## Follow-up items (defer, do not block merge)

- Add named `it()` blocks for the two reconstruction/reconciliation concurrency cases (`tick_end during reconstruction does not resurrect closed tick_start`; `heartbeat firing during periodic-reconciliation produces exactly one atom`). Lane invariant makes them green-by-construction; regression guard cost is near-zero.
- Clamp `expected_by` at emit-time and persist the clamped value in the atom (`src/coord/deadlines.ts:398-417`) — eliminates cross-restart non-idempotency where late replay re-clamps against a different `now()`.
- Log a `warn` on the swallowed `deadlines.ingest()` failure path in `src/mcp/tools/coord-emit.ts:162-168` so operators get a signal before the 10-min reconcile window picks it up.
- TZ-aware validation for `expected_by` (`src/coord/validate.ts:81`): apply `canonicalizeTimestamp` to it as well, or tighten ISO_RE to require `Z|[+-]hh:mm`. Closes the TZ-naive foot-gun.
- V1.5+ scale-out for `coord_status` `recent_missed` allocation (`src/mcp/tools/coord-status.ts:236-238`): replace push-all-then-slice-200 with a min-heap-of-200 to bound memory at O(200) instead of O(N-in-horizon).

## Open questions for founder

None — verdict is `merge as-is`.
