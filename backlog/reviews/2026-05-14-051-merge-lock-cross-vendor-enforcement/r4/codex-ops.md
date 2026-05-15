---
item_id: 2026-05-14-051-merge-lock-cross-vendor-enforcement
round: 4
reviewer: codex-ops
artifact_sha: 39daa2533431e344381bb9344ae72527fd89b2df
completed_at: "2026-05-15T07:37:34Z"
verdict: proceed_after_patches
findings:
  - severity: medium
    where: backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:66-75
    finding: >-
      AC1 only proves the happy retry path where `git pull --rebase=merges` can replay the in-flight merge cleanly. In production the same unattended helper can hit a content conflict or an autostash re-apply conflict; with the current two-attempt loop, the first failed pull can leave `.git/rebase-merge` and conflicted index state behind, the second attempt then runs inside that half-rebased checkout, and the terminal `PUSH-RACE-FALLBACK` append does not restore the promised clean "local commit stays unpushed" state. The next launchd tick or founder merge starts from a wedged live `main` checkout. Patch AC1 to require aborting any in-progress rebase before retrying and before terminal logging, then add a conflicting-rebase/autostash-failure case that asserts no rebase state remains and the operator still gets the queue-errors row.
  - severity: low
    where: backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:81-83
    finding: >-
      The lock-present branch requires logging the lock holder, but it does not specify the release race where `merge-and-cleanup.md`'s trap removes `.git/echo-merge-in-progress` between the wrapper's existence check and the holder read. Under `_run_reviewer.sh`'s `set -euo pipefail`, a naive `holder=$(cat "$LOCK_PATH")` would turn a benign merge-completed boundary into a non-zero launchd failure instead of either proceeding lock-absent or skipping cleanly. Patch AC2's shell contract/test to make the holder read tolerant of a vanished lock, for example by rechecking or falling back to a clear `<released-before-read>` holder while still exiting 0.
---

Ops/runtime review of R4. The spec is close, but the remaining gaps are both unattended-shell failure modes: one can wedge the live checkout after a failed rebase, and the other can produce noisy launchd failures at the exact moment the merge lock releases.
