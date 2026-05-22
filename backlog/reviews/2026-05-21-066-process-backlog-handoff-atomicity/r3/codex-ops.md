---
item_id: "2026-05-21-066-process-backlog-handoff-atomicity"
round: 3
reviewer: "codex-ops"
artifact_sha: "92da4ea2c19b65bc90f2fb027058f8dd040e045b"
completed_at: '2026-05-22T04:17:08Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:277-289; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:325; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:393"
    finding: >-
      The transcript now preserves `$LOG`, but it still runs a plain `git pull --rebase origin main` after recovery and before the publish block stages `$LOG`. In the real process-backlog flow, E1 writes or appends the run log before this stage move. When that log path is already tracked, Git refuses the rebase with `cannot pull with rebase: You have unstaged changes`, so an unattended resume can correctly avoid restoring `$LOG` and still stop before replaying/publishing the handoff. AC3 test 10 only proves recovery leaves `$LOG` bit-identical; it does not execute the caller path through the post-recovery pull. Patch the recipe to either pull before mutating the log, use a bounded machine-readable stash/autostash path for `$LOG`, or otherwise prove the full caller transcript can continue with a tracked dirty run log.
  - severity: "medium"
    where: "backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:237-239; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:282-289; tools/review-queue/push-with-retry.sh:43-52"
    finding: >-
      State 2 delegates the publish retry to `tools/review-queue/push-with-retry.sh`, whose terminal-failure path appends to the tracked `raw/internal/queue-errors.md`. That file is outside `P1_TOUCHED_SURFACES` and outside the allowed recovery prefixes, so the first failed retry can leave the main checkout dirty in a way P1 never classifies. On a later unattended rerun, the helper may autostash that dirty queue-errors row, successfully push the handoff, and let the boundary check exit 0, but the row is then restored as an unstaged tracked change. The next process-backlog pull can fail before P1 recovery even starts. Either use a publisher whose failure log is outside the worktree, explicitly commit/quarantine that queue-error row as part of the recovery outcome, or add a test where one State 2 retry fails, the next succeeds, and the repo is clean afterward.
---

# codex-ops review

Verdict: `pushback`.

Round 3 fixes the pushed-ref boundary, the local-commit-unpushed retry branch, per-surface restore/removal for the declared transition surfaces, and caller-side recovery return-code gating. The remaining gaps are both dirty-tree runtime cases outside those declared surfaces: a tracked `$LOG` can make the post-recovery pull abort, and `push-with-retry.sh` can leave a tracked queue-error row behind after a failed publish retry.
