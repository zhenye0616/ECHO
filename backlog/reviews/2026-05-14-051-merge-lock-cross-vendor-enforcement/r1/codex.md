---
item_id: "2026-05-14-051-merge-lock-cross-vendor-enforcement"
round: 1
reviewer: "codex"
artifact_sha: "543341151c1af2a66c30339954651c0253f5078f"
completed_at: "2026-05-15T06:30:30Z"
verdict: "proceed_after_patches"
consumed_task_state: false
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:66"
    finding: >-
      AC1's exact replacement command is not accepted by the installed `git pull` interface: `git pull --rebase --rebase-merges ...` exits 129 with `unknown option rebase-merges`. `git pull -h` shows the supported form is `--rebase[=(false|true|merges|interactive)]`, so implementing this spec literally would make every reviewer push retry fail before it reaches `git push`. Patch the command and test contract to use `git -c rebase.autoStash=true pull --rebase=merges origin main` (or an equivalent fetch plus `git rebase --rebase-merges`) instead of adding a separate `--rebase-merges` flag to `git pull`.
  - severity: "medium"
    where: "backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:69"
    finding: >-
      The AC1 test assertion says `origin/main^2` should match the original feature-branch tip SHA, but `git pull --rebase=merges` preserves merge topology while rewriting the merged side's commits onto the new base. In a throwaway reproduction, the post-push merge kept a valid second parent, but that second parent was a new rebased SHA, not the pre-rebase feature tip. As written, the test can fail even after the production command is fixed; assert the two-parent shape and expected content/tree (or capture the rebased second-parent SHA after the pull) rather than equality with the original feature tip.
  - severity: "medium"
    where: "backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:80"
    finding: >-
      The spec says `git rev-parse --git-path echo-merge-in-progress` makes the lock check work correctly inside any future worktree and later claims it resolves to the common `.git` directory. Git does the opposite for linked worktrees: from a worktree, `--git-path echo-merge-in-progress` resolves under `.git/worktrees/<name>/echo-merge-in-progress`, so it will not see the sentinel written at the main checkout's `.git/echo-merge-in-progress`. If 051 keeps the worktree-robustness requirement, the spec should require `git rev-parse --git-common-dir` plus `/echo-merge-in-progress`; otherwise narrow the AC to the launchd main-checkout path and remove the false worktree guarantee.
---

## Codex review

The core interim shape is small, but AC1 cannot be implemented literally with this Git, and two test/path assumptions need correction before a builder claims it. No task-state pointer was consumed; review used the requested artifact SHA and inline request only.
