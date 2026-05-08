---
item_id: 2026-05-07-021-trace-cross-gap-where-left-off
verdict: merge with founder fixups
reviewed_at: 2026-05-08T07:15:00Z
test_counts: { passed: 431, failed: 4 }
---

## Verdict

Implementation is high-quality and correct. All three substantive changes (Bug A keep-newest, Bug B `window_hours` exposure + span-inferred default, Guardrail C naive-TZ warning) are implemented per spec; types/lint/typecheck clean; the 158 tests touching `tests/storage`, `tests/trace`, `tests/mcp` pass. The DESC default flip is well-defended — caller audit is accurate, all production callers are either order-agnostic or explicitly re-sort. The 4 remaining test failures are pre-existing FS-watcher / cursor / daemon-lifecycle flakes unrelated to this branch (verified by the failure signatures matching the known cluster). However, the merge into `main` will conflict in 3 files due to item 020 having merged after fork — these are non-trivial structural overlaps in `recent-work-context.ts` (description string), `tests/trace/build.test.ts`, and `tests/mcp/tools/recent-work-context.test.ts`. Founder must resolve at merge time.

## Pre-merge fixups

- [ ] **De-duplicate trace sort logic in `src/trace/index.ts`.** After auto-merge, the file will have both 021's inline atom sort (lines 88-94) and 020's `compareByOccurredAt` helper (lines 199-208) used at line 86. Replace 021's inline `atoms.sort(...)` with `atoms.sort(compareByOccurredAt)` and drop the inline comparator. Behavior identical.
- [ ] **Resolve description-string concatenation in `src/mcp/tools/recent-work-context.ts`** — keep both 020's `cluster.open_loop_hints[].resolved` sentence and 021's `window_hours` + TZ paragraphs. Both are additive prose.
- [ ] **Resolve test-file conflicts** in `tests/trace/build.test.ts` and `tests/mcp/tools/recent-work-context.test.ts` — keep both branches' `describe` blocks; verify imports compose cleanly.
- [ ] **Re-run `npm run typecheck && npm test`** post-merge in the integration worktree. Specifically `tests/storage tests/trace tests/mcp` must show 158+ passing.
- [ ] **Add a clarifying comment** at `src/mcp/tools/recent-work-context.ts:111` — explain that `spanHours <= 0` falls back to 4h (not to 0). One-line comment.

## Expected merge conflicts

- `src/mcp/tools/recent-work-context.ts` — concatenate both branches' description text (020's `resolved` sentence + 021's `window_hours` and TZ guidance). Both additive.
- `tests/trace/build.test.ts` — both branches added `describe` blocks. Keep both. Conflict likely at imports or trailing `})`.
- `tests/mcp/tools/recent-work-context.test.ts` — both branches added `describe` blocks (2 hunks). Keep both; verify shared fixture imports compose.
- `src/trace/index.ts` — auto-merges but produces duplicate sort logic. Apply Pre-merge fixup #1.
- `src/trace/types.ts` — auto-merges; verify both `resolved` (020) and `window_hours` (021) fields are present on their respective interfaces.

## Follow-up items (defer, do not block merge)

- Stabilize the fs-watcher / cursor / daemon-lifecycle flake cluster (4 failures on this run; recurring on every agent's verification — fixture races on FSEvents under load). File its own backlog item.
- Process improvement: `files_to_modify` tends to omit collateral test-file edits (021 hit this on `tests/capture/*`; 020 hit something similar). Either widen the field or add an explicit "test fallout permitted in:" convention to spec template.
- `search_memories` KNN determinism (flagged in 021's spec body but explicitly out of scope) — file as its own item.
- Post-merge wiki promotion (per item's After-Completion section): `wiki/architecture/work-trace.md` (window_hours inference + storage `order` semantic) and `wiki/surfaces/mcp-recent-work-context.md` (input shape + warning).

## Design-choice judgments (the two flagged in `agent_notes`)

1. **`tests/capture/` ASC additions outside `files_to_modify`:** **Stand.** Bug A's spec body explicitly authorizes this (*"if any genuinely need ASC for downstream logic, they pass `order: 'asc'` explicitly"*). These tests assert on observed event ordering; the DESC flip would have broken them silently. The opt-in pattern is the correct compromise.
2. **Span-inference test in `tests/mcp/tools/recent-work-context.test.ts` instead of `tests/trace/build.test.ts`:** **Stand.** `inferWindowHours` lives in the MCP-tool layer (`src/mcp/tools/recent-work-context.ts:104`), not in the build layer. `buildRecentWorkContext` only consumes `query.window_hours` — which is tested at `build.test.ts:504-545`. The inference rule itself is correctly tested where the function lives. Spec was internally inconsistent; agent picked the locality-correct placement.
