---
item_id: "2026-05-14-051-merge-lock-cross-vendor-enforcement"
round: 3
reviewer: "codex"
artifact_sha: "21e0a05f37442dd252c35b8338a860f2c93447db"
completed_at: "2026-05-15T07:27:09Z"
verdict: "proceed_after_patches"
consumed_task_state: false
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:87-93"
    finding: >-
      AC2's required lock-absent test is not deterministic against the actual `_run_reviewer.sh` wrapper. The spec says to use a throwaway repo and stub `codex` on `$PATH`, then assert the stub is invoked after the lock file is removed. But the wrapper first prepends `/opt/homebrew/bin:/usr/local/bin:...` ahead of the inherited `$PATH` before running `codex exec`, so on the founder's current install a PATH stub can be shadowed by `/usr/local/bin/codex` and the test can launch the real CLI. The same lock-absent path also checks `$ECHO_REVIEW_QUEUE_REPO_ROOT/.claude/commands/${SLASH_COMMAND}.md` before invoking codex, so a throwaway repo that only has `.git/echo-merge-in-progress` will abort at "prompt missing" instead of exercising the stub. Patch the test contract to create/copy the reviewer prompt fixture and use a deterministic injection mechanism, e.g. a `CODEX_BIN` hook mirroring `tools/backlog/run-codex-builder.sh` or an exported bash-function stub that wins command lookup, so the required test cannot accidentally call the real Codex binary.
---

Reviewed `backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md` at `21e0a05f37442dd252c35b8338a860f2c93447db` for the Codex implementability/code-grounded lens.

The requested R2 patches landed: the production command consistently uses `--rebase=merges`, the invalid standalone `--rebase-merges` reference remains only as the line 67 falsification note, the frontmatter summary is corrected, and the lock-absent branch now points at the prompt/codex continuation path. The remaining patch is limited to making the AC2 test harness deterministic and safe to run on a machine with a real Codex install.
