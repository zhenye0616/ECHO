---
item_id: "2026-06-08-099-code-owned-sidecar-writer"
round: 3
reviewer: "codex"
artifact_sha: "ea5765c3a354af7047eeec66458ced879a9751b3"
completed_at: '2026-06-09T06:17:32Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "frontmatter files_to_modify / tools/review-queue/emit-sidecar.py"
    finding: "The file-modification note still says emit-sidecar.py writes atomically via `temp + os.replace`, which contradicts Locked decision 8 and AC2's required default finalize path of same-dir temp -> validate -> atomic no-clobber `os.link`, with `os.replace` only under `--replace`. Patch the frontmatter comment so the builder does not implement the stale overwrite-by-default mechanism."
  - severity: "medium"
    where: "AC7 — tests"
    finding: "The required TOCTOU case, `a target that appears between staging and finalization`, is not deterministically testable from the specified shell CLI alone; racing two processes would be flaky, and a pre-existing target only retests the simpler existing-target case. Patch AC7 to require a deterministic test seam, such as an inline Python harness that imports the writer and monkeypatches the finalize/link step, or a test-only finalize hook that creates the target immediately before `os.link`."
  - severity: "medium"
    where: "AC7 — tests"
    finding: "Because emit-sidecar.py derives its target from `git rev-parse --show-toplevel`, the writer tests for valid writes, existing-target rejection, and `--replace` will write under the caller repo's `backlog/pending_review/` unless the harness runs them in a disposable repo/worktree too. Patch AC7 so all writer cases that can create canonical sidecars run in a disposable temp repo/worktree with cleanup, not only the committed-invalid-fixture gate cases."
---

## Review

The r2/r3 direction is sound: the spec now removes caller-supplied target paths, makes the canonical default finalize path no-clobber, and keeps the pending-review gate repo-local. The remaining issues are spec precision problems that can be patched mechanically before implementation.
