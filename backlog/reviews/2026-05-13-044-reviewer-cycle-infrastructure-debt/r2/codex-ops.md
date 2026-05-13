---
item_id: 2026-05-13-044-reviewer-cycle-infrastructure-debt
round: 2
reviewer: codex-ops
artifact_sha: 4ca4904b20cb2340a877e5ddbf763fa7b72b2cee
completed_at: '2026-05-13T20:39:02Z'
verdict: proceed_after_patches
findings:
  - severity: high
    where: "§AC1 Watcher Step 1 uses autostash + tools/review-queue/push-with-retry.sh"
    finding: >-
      AC1 only adds `rebase.autoStash=true` to the watcher's first pull, but Git reapplies the dirty journal/queue-errors files before the rest of the tick runs. The production watcher then calls `combine.py`, whose internal `git pull --rebase` still runs without autostash and ignores failure, and the subsequent `push-with-retry.sh` pull also runs without autostash and exits after appending another queue-errors row. The AC1 fixture can pass because it asserts the dirty file is preserved after the pull, but that preserved dirt is exactly what still breaks the unattended combine/commit/push path. Specify a transaction-level clean-tree plan for the full watcher tick, or extend the cure/test to the actual downstream pull sites that require a clean worktree.
  - severity: medium
    where: "§Pre-flight step 6 + §Risk register codex-ops deployment smoke"
    finding: >-
      The spec says `tools/review-queue/_install_reviewer_launchd.sh codex-ops --smoke` verifies the new reviewer before r1 dispatch, but the installer only runs `smoke-test-<reviewer>-runner.sh` when that file exists; at the pinned tree there is a codex smoke runner, but no codex-ops runner, so `--smoke` merely kickstarts the production launchd job, prints a warning, and exits successfully. That lets the pre-flight declare codex-ops deployed without proving the isolated synthetic-request path, and failures surface later as timeouts rather than at install time. Require a codex-ops smoke runner or make `--smoke` fail closed when the per-reviewer smoke script is absent.
---

# codex-ops review

Reviewed `backlog/ready/2026-05-13-044-reviewer-cycle-infrastructure-debt.md` at `4ca4904b20cb2340a877e5ddbf763fa7b72b2cee` from the operational/runtime lens.

Verdict: `proceed_after_patches`. The r1 focus fixes are clean, but AC1's autostash cure does not cover the full unattended watcher transaction, and the codex-ops smoke gate can currently pass without running a codex-ops smoke.
