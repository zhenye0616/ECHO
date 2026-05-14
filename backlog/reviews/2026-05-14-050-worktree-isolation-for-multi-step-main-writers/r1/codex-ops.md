---
item_id: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
round: 1
reviewer: codex-ops
artifact_sha: 469a8e7da38ec23e163011e6ea1e9669b7adf479
completed_at: "2026-05-14T22:15:08Z"
verdict: pushback
findings:
  - severity: high
    where: backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md:75
    finding: >-
      AC1 requires removing the worktree on any error, but AC5 preserves the existing push-with-retry failure contract where an exhausted push leaves an unpushed commit plus raw/internal/queue-errors.md for operator recovery. Inside an ephemeral worktree, that unpushed reviewer/watcher/merger commit and the queue-errors row live only under $WT; the error trap then deletes $WT, so a 03:00 rebase conflict or remote outage silently destroys both the failed work and the durable breadcrumb the next watcher tick is supposed to surface. The spec needs a distinct push-failure recovery path, such as preserving failed worktrees with a logged path or writing the queue error to a durable non-$WT location before cleanup.
  - severity: high
    where: backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md:77
    finding: >-
      The global pre-flight GC deletes any $TMPDIR/echo-* directory older than 60 minutes, but AC3 and Crash semantics explicitly preserve founder conflict-resolution pauses inside $TMPDIR/echo-merger-<uuid>. A long lunch, sleep, or editor session during a merge conflict can exceed 60 minutes; the next reviewer or watcher tick would run this GC and can rm -rf the active merger worktree while the founder is resolving conflicts. GC must distinguish registered/live worktrees from stale orphans, and AC6.4 should include an active-merger-pause negative test so cleanup cannot delete in-progress human work.
  - severity: medium
    where: backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md:74
    finding: >-
      The current headless wrapper launches `codex exec -C "$REPO_ROOT"`, and the reviewer prompts begin by cd'ing to `${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}`. AC1 says `cd "$WT"` and then run the existing reviewer tick, but it does not explicitly require exporting ECHO_REVIEW_QUEUE_REPO_ROOT=$WT and invoking codex with `-C "$WT"`. Without that concrete routing, the subprocess escapes back to the live checkout and the isolation cure is bypassed under launchd. Add this as an AC1 contract plus an end-to-end assertion that the committed response was produced from the worktree toplevel.
  - severity: medium
    where: backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md:142
    finding: >-
      Risk R1 says a real launchd-fired tick should verify $TMPDIR, but no acceptance criterion or test forces that smoke. If launchd starts with TMPDIR unset, the wrapper now hard-fails before writing any queue state; the only signal is the launchd log, and the reviewer queue simply stops receiving responses. Make the launchd/TMPDIR check a required AC6 smoke or add a wrapper-visible diagnostic contract that operators can verify mechanically.
---

Ops/runtime review focused on unattended launchd ticks, push/rebase failure recovery, and cleanup behavior. The spec's direction is sound, but the current acceptance criteria allow data-loss and observability regressions in the failure paths the change is meant to harden.
