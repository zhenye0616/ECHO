---
item_id: 2026-05-08-028-rwc-envelope-skeleton-format
verdict: merge as-is
reviewed_at: 2026-05-08T23:35:00Z
test_counts: { passed: 522, skipped: 21, failed: 0 }
---

## Verdict

`merge as-is`. All 8 acceptance bullets are Met. Worktree HEAD matches the recorded `head_sha` (73a9426). Tests/lint/typecheck re-run clean: **522 passed / 21 skipped / 0 failed** in 16.89s. No merge conflicts predicted against current `origin/main` — the recent Bug A+B commits (578519a, 2fecd10) touch disjoint files (`search-memories.ts`, `tail-session.ts`). The agent's two flagged judgment calls (skeleton transform applied at the MCP wire boundary; fixture density at 17 artifacts max instead of spec's ≥30) are both sound and honestly disclosed in `agent_notes`. The load-bearing < 12,500-char assertion holds at 12,091 chars — tight (3% headroom) but the spec acknowledged this by setting the threshold at half budget, and the regression-revert test at `recent-work-context.test.ts:1003-1010` proves the assertion is genuinely load-bearing rather than tautological.

One micro-drift worth noting (not blocking): the diff touches `src/trace/types.ts` (single-line widening of `ResponseFormat` to include `'skeleton'`) which is outside `files_to_modify` but is mechanically required by acceptance bullet 1's "update `ResponseFormat` accordingly" wording.

## Pre-merge fixups

None. Ship as-is.

## Expected merge conflicts

`git merge-tree` against current `origin/main` reports **zero conflicts**. The 028 file set (`recent-work-context.ts` / its test / fixture / `mcp-integration.md` / `trace/types.ts`) is disjoint from main's recent `search-memories.ts` + `tail-session.ts` changes.

## Follow-up items (defer, do not block merge)

- Note the `src/trace/types.ts` widening in this item's `review_notes` (or add it retroactively to `files_to_modify`) so a future audit sees the type-widening was deliberate.
- When a denser real spill becomes available (more parallel Read/Edit/Bash per turn in a session), swap the fixture and tighten the 12,500-char threshold. The current 3% headroom is a future flake risk if atom shape grows.
- Strategist wiki promotion: when `wiki/surfaces/mcp-recent-work-context.md` is created/updated post-shipment, note explicitly that non-MCP callers of `getRecentWorkContext` (e.g., `tools/validate-resolution.ts`) cannot get skeleton output, by design — skeleton transform lives at the MCP wire boundary inside `registerRecentWorkContext`.
- Dogfooding follow-up (already in spec's "After Completion"): re-run the 15:54 PDT scenario with `format:'skeleton'` against the live daemon post-merge, log to journal as third regression-closure measurement, and confirm skeleton output still supports the "use echo to resume" use case without hydration.

## Open questions for founder

None. Verdict is `merge as-is`; no decisions block proceeding.
