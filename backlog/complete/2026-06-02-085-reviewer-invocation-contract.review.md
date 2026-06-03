---
item_id: 2026-06-02-085-reviewer-invocation-contract
verdict: block
reviewed_at: 2026-06-03T02:17:52Z
test_counts: { passed: 2, failed: 3 }
---

## Verdict
The worktree HEAD matches the recorded SHA, but the feature branch has no implementation diff and is an ancestor of current `main`. The builder's blocker is valid: AC3 requires the wrapper/writer, not the AI child, to own commit/push, while OoS#1 keeps reviewer self-commit as-is. Founder must clarify scope before this item can proceed.

## Pre-merge fixups
- [ ] Founder resolves the AC3 vs OoS#1 contradiction: either narrow 085 to argv/data-model only, or widen it to include the orchestrator-owned sidecar/prompt migration.
- [ ] After clarification, builder should redo the item against the clarified scope; there is currently nothing useful to merge.

## Expected merge conflicts
- None. The branch has no unique changes to merge, so there are no file-level conflict candidates against current `main`.

## Follow-up items (defer, do not block merge)
- None beyond the spec's existing successor list.

## Open questions for founder
- Should 085 be narrowed to "data-model + argv exec only, with read-only child enforcement deferred"?
- Or should 085 be widened to include the orchestrator-owned sidecar/prompt migration required to make "AI child never commits" true?
