---
item_id: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
round: 3
reviewer: codex
artifact_sha: c74fde90fc4542ff3b5e80b1cb64b42018f5169c
completed_at: "2026-05-14T22:40:32Z"
verdict: proceed_after_patches
findings:
  - severity: medium
    where: "backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md:20 and :121-124"
    finding: >-
      The R2 simplification did not update the frontmatter write scope: `files_to_modify` still instructs the builder to add `prepare_isolated_worktree` / `cleanup_worktree` helpers in `tools/review-queue/_lib.py`, while AC7 explicitly says no shared Python helper script is introduced and the canonical worktree management belongs inline in `_run_reviewer.sh`. Builder agents treat `files_to_modify` as an allowed write set, so this stale line can reintroduce the helper abstraction the round is trying to drop. Patch by removing `_lib.py` from `files_to_modify` or rewriting the entry to say no new worktree helper may be added.
  - severity: medium
    where: "backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md:68, :81, and :97-101"
    finding: >-
      The reviewer-surface ownership is internally inconsistent for Cursor. AC1 says `_run_reviewer.sh` is the shared wrapper invoked by all three reviewer flavors and applies to cursor, but the current `tools/review-queue/reviewers.json` marks cursor as `mode: ide`, the existing `_run_reviewer.sh` gate rejects IDE-mode reviewers, and AC4 says Cursor cannot share that wrapper directly. This leaves the builder with an impossible implementation target. Patch AC1 to scope `_run_reviewer.sh` to the headless reviewers (`codex`, `codex-ops`) and keep Cursor's worktree lifecycle solely in `skills/review-queue-cursor.md`, unless the intended change is to add a separate Cursor wrapper.
---

# Codex review — round 3

Verdict: `proceed_after_patches`.

The simplification is implementable once the two stale/disagreeing instructions above are patched. I did not find a blocker in the crash semantics or the AC6.4 registered-worktree test shape.
