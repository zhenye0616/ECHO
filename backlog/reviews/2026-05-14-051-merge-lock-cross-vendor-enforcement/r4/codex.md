---
item_id: 2026-05-14-051-merge-lock-cross-vendor-enforcement
round: 4
reviewer: codex
artifact_sha: 39daa2533431e344381bb9344ae72527fd89b2df
completed_at: '2026-05-15T07:36:33Z'
verdict: proceed_after_patches
consumed_task_state: false
findings:
- severity: high
  where: "AC1 push-with-retry-rebase-merges test assertion"
  finding: >-
    The required tree-equality assertion is false for the fixed behavior on the current Git install. I reproduced the AC1 shape with git 2.37.3: after `git pull --rebase=merges origin main`, `origin/main` remains a two-parent merge, but `origin/main^2^{tree}` does not equal the pre-rebase feature-tip tree because the rebased second parent is now based on the sibling clone's concurrent `origin/main` commit and its tree includes that non-conflicting main-side change. A builder implementing `--rebase=merges` correctly will therefore fail the mandated test. Keep the `origin/main^2` existence assertion, but change the content assertion to compare the feature branch's patch/content on the feature-owned paths, or compare the second parent's diff from the new base against the original feature diff instead of comparing full tree object IDs.
- severity: medium
  where: "AC2 test step 2 + AC3 parameterization for REVIEWER_NAME=codex-ops"
  finding: >-
    The prompt fixture fix only creates `<test-repo>/.claude/commands/review-queue-codex.md`, but the pinned `reviewers.json` maps `codex-ops` to `slash_command: review-queue-codex-ops` via `_reviewer_gate.py`. When the AC2 test is parameterized per AC3 with `REVIEWER_NAME=codex-ops` and the lock is removed, `_run_reviewer.sh` checks for `.claude/commands/review-queue-codex-ops.md` before it reaches the `CODEX_BIN` stub, so the required lock-absent assertion fails with `tick abort: prompt missing`. Make the test create the prompt path returned by the gate for each reviewer, or create both `review-queue-codex.md` and `review-queue-codex-ops.md` fixtures.
---

# Codex review

The CODEX_BIN hook itself is now precise enough: an absolute `CODEX_BIN` stub avoids the wrapper's PATH prepend and exercises the actual child-invocation site. I still found two spec/test determinism gaps above. Both are patchable, but AC1 currently requires a falsifying assertion against Git's real `--rebase=merges` behavior, so this should take one more patch round before builder claim.
