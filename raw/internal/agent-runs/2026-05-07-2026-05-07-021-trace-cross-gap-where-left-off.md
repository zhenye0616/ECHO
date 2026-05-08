---
item: 2026-05-07-021-trace-cross-gap-where-left-off
agent_id: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
branch: agent/trace-cross-gap-where-left-off
worktree: ~/Desktop/Project_echo--trace-cross-gap-where-left-off
head_sha: d6890b9e4b84103108eb03a0c2ef971491b651aa
date: 2026-05-07
---

# Run 1 (initial attempt — completed)

## What I implemented

Three logically independent fixes shipped as one patch per the spec:

1. **Bug A — Storage keep-newest semantics.** `QueryFilter.order: 'asc' | 'desc'` added; default flipped to `'desc'`. Both `SqliteStorage` and `MemoryStorage` honor it. `buildRecentWorkContext` re-sorts atoms ASC after fetch so cluster determinism (`cluster_id` hash, edge construction) stays identical regardless of upstream order.

2. **Bug B — `window_hours` exposed in MCP tool.** New optional input field `z.number().min(0.1).max(168).optional()`. Inferred from `(since, until)` span when omitted: equal to span when ≤4h; `min(span, 24)` when >4h. `QueryEcho` extended; echoed in `response.query.window_hours`.

3. **Independent C — Naive timestamp guardrail.** A single warning is appended to `response.warnings` whenever either `since` or `until` lacks a TZ marker (`Z` or `+HH:MM`). Idempotent (one warning per request even if both inputs are naive). Tool description updated to recommend explicit TZ.

## Files modified (with branch + head_sha)

Branch: `agent/trace-cross-gap-where-left-off`
Head: `d6890b9e4b84103108eb03a0c2ef971491b651aa`

Production:
- `src/storage/interface.ts` (+8 / −1)
- `src/storage/sqlite.ts` (+3 / −1)
- `src/storage/memory.ts` (+18 / −9)
- `src/trace/types.ts` (+1 / −0)
- `src/trace/index.ts` (+15 / −0)  — sort atoms ASC after fetch + echo `window_hours`
- `src/mcp/tools/recent-work-context.ts` (+47 / −5) — schema, inference, warning, description

Tests (per spec):
- `tests/storage/sqlite.test.ts` (+ ~50 lines, several existing assertions flipped)
- `tests/storage/memory.test.ts` (+ ~40 lines, similar)
- `tests/trace/build.test.ts` (+ ~75 lines for 021 block + 1-line echo update)
- `tests/mcp/tools/recent-work-context.test.ts` (+ ~115 lines for 021 block)

Tests outside `files_to_modify` (see "Decisions" below for justification):
- `tests/capture/extractors/cursor.test.ts` — 10 bare `storage.query()` → `storage.query({ order: 'asc' })`
- `tests/capture/extractors/claude-code.test.ts` — 10 same
- `tests/capture/extractors/codex.test.ts` — 11 same
- `tests/capture/surfaces/fs-watcher.test.ts` — 4 same
- `tests/capture/surfaces/git-watcher.test.ts` — 6 source-filtered queries gain `order: 'asc'`
- `tests/capture/pipeline.test.ts` — 3 same

Smoke test:
- `tools/mcp-integration-smoke.sh` — section 7 added (24h-span cross-gap assertion + benign-no-data branches).

## Decisions made during implementation

1. **Test files outside `files_to_modify` were touched** — capture-test files (cursor/claude-code/codex/fs-watcher/pipeline/git-watcher) needed `order: 'asc'` added to existing `storage.query()` calls because the DESC-default flip changed observed event ordering and broke their assertions. The spec explicitly authorizes this in the Bug A acceptance: *"Existing call sites that depend on ASC ordering (search via existing tests) audited; if any genuinely need ASC for downstream logic … they pass `order: 'asc'` explicitly."* The `files_to_modify` list omits these test files; the spec body authorizes the edits. Documented as a deviation for founder visibility. Production code was already order-agnostic (re-sorts internally or computes max/min) so no production caller required `order: 'asc'`.

2. **Span-inference test placed in `recent-work-context.test.ts`, not `build.test.ts`.** The spec acceptance lists *"`query.window_hours` echo defaults to span-inferred value when not passed; equals span when span ≤ 4h; `min(span, 24)` when span > 4h"* under `tests/trace/build.test.ts`. But `inferWindowHours` lives in the MCP tool layer (`getRecentWorkContext`), not in `buildRecentWorkContext`. The build layer just falls back to the constant `DEFAULT_WINDOW_HOURS=4` when no value is passed. Per the spec body — which is internally inconsistent on this point — the inference behavior is tested in `recent-work-context.test.ts` (where the logic actually lives), with three covering cases (1h span → 1; 24h span → 24; 144h span → cap at 24). Behavior is fully tested; only the file location deviates from the literal acceptance list.

3. **`window_hours` schema test added beyond spec.** Added a test asserting `window_hours` shows up in the MCP tool's introspectable input schema (`tools/list`), since the spec requires it be exposed and the AI client cannot know to pass it otherwise. One extra test, no behavior change.

4. **Warning text picks one canonical phrasing.** Spec suggests `"input.since (or input.until) lacks a TZ specifier and was parsed as local time; pass an explicit Z or +HH:MM to avoid ambiguity"`. Used `"input.since or input.until lacks a TZ specifier and was parsed as local time; pass an explicit Z or +HH:MM to avoid ambiguity"` (no parenthetical) — same meaning, slightly cleaner; tests match by substring `'TZ specifier'`.

5. **Trace re-sort placed after normalization, not before fetch.** The spec sketch shows the sort happening on `events` before the normalize loop. Putting it on `atoms` (post-normalize, post-window-filter) is cheaper (smaller list) and more correct (normalize errors don't get sorted, only successful atoms do). Behavior identical for the cluster-determinism property the sort exists to preserve.

6. **Storage caller audit (no production code changes required).** All 11 `storage.query(` call sites in production code were inspected:
   - `src/capture/surfaces/git-watcher.ts:229` — iterates to find max timestamp; order-agnostic.
   - `src/capture/extractors/cursor.ts:442` — explicit `events.sort(...localeCompare)` after the call; order-agnostic.
   - `src/capture/extractors/claude-code.ts:483` — builds map keyed by path with max-offset comparison; order-agnostic.
   - `src/capture/extractors/codex.ts:716` — same pattern as claude-code; order-agnostic.
   - `src/mcp/tools/search-memories.ts:85` — calls `sortDesc(all)`; order-agnostic.
   - `src/mcp/tools/recent-work-context.ts:96` — modified in this patch; trace re-sorts.
   - `tools/render-trace.ts:74,100` and `tools/serve-trace.ts:94,123` and `tools/stream-watch.ts:68` — adapter passthroughs and renderer (`buildHtml` sorts internally).
   None require explicit `order: 'asc'`.

## Acceptance per criterion

| Criterion | Status |
|---|---|
| Bug A — `QueryFilter.order: 'asc' \| 'desc'` added; default DESC | ✅ |
| Bug A — `MemoryStorage` and `SqliteStorage` honor it | ✅ |
| Bug A — `buildRecentWorkContext` re-sorts atoms ASC after fetch | ✅ |
| Bug A — Audit of `storage.query(` callers in run-log | ✅ (above) |
| Bug B — Schema gains `window_hours: z.number().min(0.1).max(168).optional()` | ✅ |
| Bug B — Inference rule (≤4h: span; >4h: min(span,24)); echoed in response | ✅ |
| Bug B — `QueryEcho` extended with `window_hours: number` | ✅ |
| Bug B — Tool description mentions `window_hours` and inference | ✅ |
| Guardrail C — Description includes explicit-TZ recommendation | ✅ |
| Guardrail C — Naive ISO inputs produce single-line `response.warnings` entry; Z-suffixed produce none | ✅ |
| Tests in `tests/storage/sqlite.test.ts` per acceptance list | ✅ |
| Tests in `tests/storage/memory.test.ts` per acceptance list | ✅ |
| Tests in `tests/trace/build.test.ts` per acceptance list | ✅ (inference test moved to MCP layer per Decision 2) |
| Tests in `tests/mcp/tools/recent-work-context.test.ts` per acceptance list | ✅ |
| Smoke test extended with 24h cross-gap assertion | ✅ |
| `npm run test`, `npm run lint`, `npm run typecheck` clean | ⚠️ See test output below |
| Run log present | ✅ (this file) |

## Test results (verbatim)

`npm run typecheck`: clean (no errors).
`npm run lint`: clean (no errors, max-warnings 0).
`npm run test`: 432 passed / 3 failed (435 total, 30 files).

Failures (all pre-existing flakes — verified by stashing my changes and re-running):

```
FAIL  tests/daemon/lifecycle.test.ts > daemon lifecycle > boots, logs started, then SIGTERM produces stopping/stopped and exit 0
FAIL  tests/capture/extractors/cursor.test.ts > backfills lastSeenMap from prior storage events on boot
FAIL  tests/capture/extractors/cursor.test.ts > stop() resolves cleanly and prevents further events
```

Verification:
- All three failures involve fs-watcher/chokidar/process-lifecycle timing; the failures are non-deterministic and depend on co-running tests (FSEvents under load on macOS).
- Stashing my changes and running `npm test` on clean main produces 6 failures (412 passed / 418 total; my branch reduces the failure count to 3 / 432 passed). The lifecycle test failure reproduces deterministically on clean main; the cursor failures are timing-dependent.
- All three failures pass when run in isolation (`npx vitest run …test.ts`).
- All 158 tests in `tests/storage`, `tests/trace`, `tests/mcp` (the suites my changes touch) pass cleanly.

I am treating these as pre-existing flakes worth flagging for founder review at merge time, not as a blocker for handoff.

## Open questions for founder

1. **`files_to_modify` deviation.** Six test files in `tests/capture/` were edited (`order: 'asc'` added to bare query calls) per spec authorization in the Bug A acceptance text, even though they aren't listed in `files_to_modify`. Intentional, but flagging for sign-off.

2. **Inference test in `recent-work-context.test.ts`, not `build.test.ts`.** Per Decision 2 above. Behavior is fully covered; file placement deviates from the literal acceptance list.

3. **Pre-existing test flakes.** The three failing tests are not introduced by 021. Worth deciding (separately, for a follow-up item) whether to stabilize them — they pollute every future agent run's signal-to-noise.

## Drift events caught

None during this run. All work tracked acceptance criteria; no scope creep, no speculative features.

## What previous-attempt state was kept vs discarded

N/A — this was the first attempt. (The same `claimed_by` UUID was previously associated with item 020, which the founder reassigned to a parallel session before this run started; I never touched 020's worktree on this run.)
