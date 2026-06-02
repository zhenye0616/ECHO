---
item_id: 2026-06-02-085-reviewer-invocation-contract
verdict: block
reviewed_at: 2026-06-02T22:42:06Z
test_counts: { passed: 3, failed: 3 }
---

## Verdict
The worktree HEAD matches the recorded SHA, but the branch has no implementation diff against `main`, and the builder correctly flagged a spec contradiction rather than guessing. Merging this branch would be a no-op and would leave the shell-string invocation path plus review-child `danger-full-access` behavior intact.

## Pre-merge fixups
- [ ] Founder must resolve the AC3/out-of-scope contradiction before merge: either narrow 085 to argv/data-model only and defer read-only enforcement, or widen it to include orchestrator-owned sidecar/prompt migration.
- [ ] Send the item back for implementation after the scope decision; there is currently no implementation to merge.

## Expected merge conflicts
- None likely. The branch is an ancestor of current `main`, and the feature diff is empty, so merging it would not touch current main files.

## Follow-up items (defer, do not block merge)
- After the scope decision, keep capture normalization and evidence/redaction as separate successor items unless they become necessary for the chosen AC3 path.

## Open questions for founder
- Should 085 be narrowed to "data-model + argv exec only, with read-only child enforcement deferred"?
- Or should 085 be widened to include the orchestrator-owned sidecar/prompt migration required to make "AI child never commits" true?

