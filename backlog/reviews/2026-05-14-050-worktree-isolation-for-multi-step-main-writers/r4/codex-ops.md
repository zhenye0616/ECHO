---
item_id: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
round: 4
reviewer: codex-ops
artifact_sha: adb9000e3eeb27cfb5ee1c8725604bdbdafa4d69
completed_at: "2026-05-14T22:49:12Z"
verdict: proceed_after_patches
findings:
  - severity: medium
    where: "backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md:80 and :119-124"
    finding: >-
      The R4 same-reviewer overlap guard is still a check-then-act race, and AC6 still does not make that production scenario executable. Two codex-ops launchd wrappers can both re-fetch before either one has pushed, both see no upstream codex-ops.md, both commit locally, and then the loser reaches the generic non-fast-forward retry path where there is no path-aware abort before rebase. The likely unattended outcome is a noisy failed tick or rebase conflict, not the clean no-op promised by AC1. The only same-reviewer test reference is the frontmatter file comment on tests/review-queue/worktree-isolation.test.ts; the body AC6.1-AC6.5 never requires two same-reviewer ticks on one round. Patch by making the reviewer commit/push boundary fetch origin/main and exit 0 before rebase/push if origin already has this reviewer's response or the round's combined.md, then add that same-reviewer launchd-overlap case to AC6.
---

Ops/runtime review of R4. The worktree-isolation shape is otherwise converged from an unattended-runtime perspective; I am not re-opening the deferred push-failure preservation, terminality, or registered-worktree cleanup followups.
