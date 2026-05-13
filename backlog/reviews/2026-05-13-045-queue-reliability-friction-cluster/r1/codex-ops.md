---
item_id: 2026-05-13-045-queue-reliability-friction-cluster
round: 1
reviewer: codex-ops
artifact_sha: '8252b2d73c282854f13975d57917011939ac5118'
completed_at: '2026-05-13T21:50:37Z'
verdict: proceed_after_patches
findings:
  - severity: high
    where: "backlog/ready/2026-05-13-045-queue-reliability-friction-cluster.md:167"
    finding: >-
      AC6 makes the sidecar handoff operationally lossy by ending the prescribed loop with `git push origin main || true` while the test and Definition of Done require the sidecar to land on origin/main. In production this is not just a benign push race: auth loss, network outage, or a rejected push leaves `/review-pending` looking successful with a local-only sidecar commit. The next operator or machine will not see the review artifact, and `/merge-and-cleanup` can still pass locally, so the failure is discovered late or not at all. Use `push-with-retry.sh`, or fail non-zero and log `queue-errors.md` after bounded retries, instead of swallowing the push failure.
  - severity: high
    where: "backlog/ready/2026-05-13-045-queue-reliability-friction-cluster.md:62"
    finding: >-
      AC1 requires the pre-link validation failure path to append a `PRE-LINK-INVALID:` row to `raw/internal/queue-errors.md` and then retry response generation in-session, but it does not specify how that error row is committed or cleared after a later valid response. `commit-reviewer-response.sh` commits only the reviewer file, and `push-with-retry.sh` can autostash and reapply the dirty error row, so the tick can exit 0 while leaving the main worktree dirty. The following launchd tick starts with a bare `git pull --rebase origin main` and can fail before scanning, recreating the dirty-tree queue stall this friction cluster is trying to eliminate. Require a clean-tree outcome: commit the error row with the successful reviewer response, write it only on terminal failure, or explicitly stage/clear it before the helper push returns success.
  - severity: medium
    where: "backlog/ready/2026-05-13-045-queue-reliability-friction-cluster.md:80"
    finding: >-
      AC2 says the plist install still completes before the smoke gate, and the pinned installer already bootstraps/kickstarts the launchd job before it checks whether the smoke runner exists. If `--smoke` then fails because the runner is missing or not executable, an active StartInterval job remains installed and may already have fired an unverified production reviewer tick. That is fail-open operationally: the operator sees exit 1, but the queue can still run. Either check the smoke runner before any production kickstart/bootstrap, or bootout/disable the job on smoke failure if install-first semantics are intentionally kept.
  - severity: medium
    where: "backlog/ready/2026-05-13-045-queue-reliability-friction-cluster.md:129"
    finding: >-
      AC5 authorizes `rm -rf "$WORKTREE/node_modules"` and the risk register says an earlier deterministic identity check protects that destructive step, but the pinned `/merge-and-cleanup` flow only derives `WORKTREE` from the item slug before cleanup. At runtime a stale slug, missing variable, or wrong checkout path can delete `node_modules` from the wrong tree before `git worktree remove` has a chance to fail safely. Add an explicit guard before the rm, such as requiring a non-empty `WORKTREE`, `git -C "$WORKTREE" rev-parse --show-toplevel` to equal the expected path, and the branch/head to match the item being cleaned.
---

# codex-ops review

Reviewed `backlog/ready/2026-05-13-045-queue-reliability-friction-cluster.md` at `8252b2d73c282854f13975d57917011939ac5118` from the operational/runtime lens.

Verdict: `proceed_after_patches`. The spec targets the right recurring frictions, but AC1, AC2, AC5, and AC6 need small operational guardrails so the unattended queue does not leave dirty worktrees, active unverified launchd jobs, or local-only handoff commits.
