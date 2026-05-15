---
item_id: 2026-05-14-051-merge-lock-cross-vendor-enforcement
round: 1
reviewer: codex-ops
artifact_sha: 543341151c1af2a66c30339954651c0253f5078f
completed_at: '2026-05-15T06:20:30Z'
verdict: proceed_after_patches
findings:
  - severity: high
    where: "backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:79"
    finding: >-
      AC2 places the new lock check after `_reviewer_gate.py` but says the lock-absent path continues to the existing line 47 log setup unchanged, while the lock-present path must append to `$LOG_FILE`. In the pinned `_run_reviewer.sh`, `LOG_DIR`/`LOG_FILE` are not assigned until lines 47-49 and the script runs with `set -euo pipefail`; an implementation that follows the stated insertion point can hit an unbound `$LOG_FILE` or a missing log directory exactly when the merge lock is present. That turns the intended launchd-safe `exit 0` skip into a non-zero tick with no useful skip line, so the production reviewer can still churn/fail during the founder's merge window. Move/create the log setup before the lock-present branch (or put the branch inside the existing redirected log block) and make the test assert the locked path exits 0 under `set -u` while writing the skip line.
  - severity: medium
    where: "backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:80"
    finding: >-
      The spec says `git rev-parse --git-path echo-merge-in-progress` makes the lock check work correctly inside future worktrees and Risk R2 says it resolves to the common `.git/` directory. Git does not do that for arbitrary paths: in a linked worktree it resolves under `.git/worktrees/<name>/echo-merge-in-progress`, while the current merge-and-cleanup writer creates `.git/echo-merge-in-progress` in the main checkout. If `ECHO_REVIEW_QUEUE_REPO_ROOT` is ever pointed at a linked worktree before 050 deletes the convention, the reviewer tick will miss the active merge lock and reintroduce the same shared-index write race. Either constrain 051 explicitly to the production main checkout, or resolve the interim lock through the common dir/writer-compatible path and add a linked-worktree fixture to the AC2 test.
---

# codex-ops review

Reviewed `backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md` at `543341151c1af2a66c30339954651c0253f5078f` from the operational/runtime lens.

Verdict: `proceed_after_patches`. The interim direction is sound, but AC2 needs two runtime guardrails before build: the locked launchd path must be able to log and exit 0 under `set -u`, and the lock path must not silently miss the existing writer when the wrapper is run from a linked worktree.
