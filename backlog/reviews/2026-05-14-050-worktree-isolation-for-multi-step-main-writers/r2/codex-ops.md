---
item_id: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
round: 2
reviewer: codex-ops
artifact_sha: 56175d0190c6c18820e643fb1e2e25b448571c1a
completed_at: "2026-05-14T22:30:34Z"
verdict: pushback
findings:
  - severity: high
    where: backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md:88
    finding: >-
      Moving watcher and reviewers into separate worktrees removes the local-file race guard that 043 relied on. A reviewer can be minutes into writing <reviewer>.md while the watcher, in another worktree, writes combined.md and maybe dispatches r<N+1>; neither side can see the other's unpushed file. If the reviewer pushes first, the watcher can rebase and still publish a combined.md generated from the stale snapshot that omitted that response; if the watcher pushes first, the reviewer can rebase its response onto a terminal round unless the commit/push path rechecks origin. AC6.3 only asserts both commits land without index contamination, but the production failure is queue semantics: a round can be closed with a missing late response. The watcher/reviewer paths need an origin-aware terminal check, such as rerunning combine after every rebase/fetch before watcher push and aborting reviewer response commits when origin/main already has combined.md.
  - severity: high
    where: backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md:76
    finding: >-
      The R1 push-failure fix preserves a failed worktree by raw mv'ing $WT to echo-FAILED-*, but a git worktree's common admin entry still points at the old path. The failed directory is inspectable only until the next git worktree prune; after that prune removes the old admin entry, git -C $FAILED log -1 fails because the moved checkout's .git file points at a deleted .git/worktrees entry. That means AC6.8 can pass before the next pre-flight and still lose the unpushed commit as a usable forensic worktree at 03:00. Preserve must use a git-aware move/update or another durable artifact, and AC6.8 should assert git -C $FAILED log -1 still works after the next pre-flight prune.
  - severity: high
    where: backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md:79
    finding: >-
      AC1 says pre-flight safe-lists every path returned by git worktree list --porcelain so paused merger worktrees are never GC'd, but AC6.4 expects the next tick to delete a SIGKILL-orphaned worktree even though that dead path is also still registered. Git registration alone does not distinguish 'founder is resolving conflicts in an old merger worktree' from 'reviewer process died before cleanup', and the spec adds no other liveness marker. In production the builder must choose between never cleaning crashed registered worktrees, or deleting registered worktrees and risking founder conflict-resolution data loss. This is a new failure mode from the R1 safe-list disposition; the spec needs one coherent rule and a test that proves both stale cleanup and active merger preservation under that rule.
  - severity: medium
    where: backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md:76
    finding: >-
      The push-failure branch assumes the wrapper can tell that push-with-retry.sh, specifically, exhausted its retries. For reviewer ticks the push happens inside the child codex exec session through commit-reviewer-response.sh, while _run_reviewer.sh only observes the aggregate codex exec exit code. Without a machine-readable signal or distinct exit path, the wrapper cannot reliably preserve only push-failed worktrees: treating all non-zero child exits as 'other error' deletes the failed commit, while treating all non-zero exits as 'push failure' preserves worktrees for YAML validation failures, prompt crashes, and late combined.md no-ops. The AC should define how the child/helper communicates push-exhaustion to the wrapper before AC1 step 7 is operationally enforceable.
---

Ops/runtime review of R2. The R1 issues were addressed in the spec text, but the dispositions introduce new unattended failure modes around remote queue terminality, failed-worktree durability after prune, and crash cleanup semantics.
