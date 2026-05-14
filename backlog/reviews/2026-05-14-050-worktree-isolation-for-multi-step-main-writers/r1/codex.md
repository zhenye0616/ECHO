---
item_id: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
round: 1
reviewer: codex
artifact_sha: "469a8e7da38ec23e163011e6ea1e9669b7adf479"
completed_at: "2026-05-14T21:57:48Z"
verdict: proceed_after_patches
findings:
  - severity: high
    where: "AC1 reviewer wrapper lifecycle; tools/review-queue/_run_reviewer.sh:62-69 and skills/review-queue-codex.md:9-14"
    finding: |-
      AC1 says the wrapper should `cd "$WT"` before the existing reviewer tick runs, but the current reviewer stack has two CWD anchors that will defeat that unless the spec names the handoff explicitly. `_run_reviewer.sh` currently invokes `codex exec -C "$REPO_ROOT"` and feeds the prompt from `$REPO_ROOT/.claude/commands/...`; the prompt then starts by `cd "${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}"`. If a builder only wraps the shell body in a worktree, the Codex process still starts in the live checkout and then the prompt cds back to it, so the shared-index race remains.

      Patch AC1 to require the wrapper to hand the worktree to the child process, e.g. `export ECHO_REVIEW_QUEUE_REPO_ROOT="$WT"` and `codex exec -C "$WT" ... < "$WT/.claude/commands/${SLASH_COMMAND}.md"` (or an equivalent command that is mechanically proven to keep Step 1 inside `$WT`). Add a test that runs the reviewer wrapper from a dirty live checkout and asserts the live checkout's index/HEAD are untouched while the response commit is produced from the detached worktree.
  - severity: high
    where: "AC1 pre-flight hygiene vs AC6.4 crashed-tick recovery"
    finding: |-
      AC1 orders crash cleanup as `git worktree prune` first, then `find "$TMPDIR" ... -exec rm -rf {} +`. That order cannot satisfy AC6.4 as written. If the crashed worktree directory still exists when pre-flight starts, `git worktree prune` keeps the `.git/worktrees/<name>/` admin entry because the path is still present; the later `rm -rf` removes the directory, but no second prune runs, so the admin entry remains. AC6.4 explicitly expects both the worktree dir and the admin dir to be gone after the next tick's pre-flight.

      Patch the lifecycle to delete stale `$TMPDIR/echo-*` directories before pruning, or run `git worktree prune` again after the stale-dir removal. The test should create a real registered worktree, age or select it as stale, remove it through the same pre-flight path, and assert both the filesystem path and `git worktree list --porcelain` / `.git/worktrees` admin entry are gone.
  - severity: medium
    where: "AC5 push-with-retry.sh detached-worktree contract"
    finding: |-
      The production worktrees in AC1/AC2/AC3 are created with `git worktree add --detach "$WT" origin/main`, so `push-with-retry.sh` must push the detached HEAD commit, not a local `main` branch. The current helper uses `git push origin main`; that can push the main branch ref from the common repository while leaving the detached worktree commit unpushed. AC5 mentions `HEAD:main`, but the test wording only says "main vs worktree CWD" and "identical outcomes", which can pass accidentally if the fixture worktree is branch-backed.

      Make the acceptance test instantiate the worktree with the exact `--detach origin/main` command and assert `git rev-parse origin/main` equals the worktree's `HEAD` after the helper runs. The implementation contract should name `git push origin HEAD:main` (or equivalent refspec) as load-bearing, not just CWD-agnostic path resolution.
  - severity: medium
    where: "AC7 helper invocation; tools/review-queue/_lib.py import shape"
    finding: |-
      AC7 suggests invoking the shared Python helper from bash with `python3 -c "from tools.review_queue._lib import ..."`. That import path is not valid in this repo: the directory is `tools/review-queue`, with a hyphen, and it is not a `tools.review_queue` package. Existing code handles this by putting `tools/review-queue` on `PYTHONPATH` and importing `_lib` directly (`_run_reviewer.sh` sets `PYTHONPATH`; `_reviewer_gate.py` inserts the tool dir into `sys.path`).

      Patch AC7 to prescribe a concrete importable surface, either `PYTHONPATH="$WT/tools/review-queue" python3 -c 'from _lib import prepare_isolated_worktree, cleanup_worktree; ...'` or a small executable helper such as `tools/review-queue/worktree.py prepare|cleanup`. Without that, the bash wrapper AC can be implemented exactly as written and fail before any reviewer tick starts.
---

# Codex review

Verdict: proceed_after_patches.

The direction is right: per-tick worktrees are the right primitive for removing shared-index collisions. The patches above are all mechanical buildability issues: the reviewer wrapper must pass the worktree into the Codex child process, crash cleanup has to prune after stale-dir removal, the push helper tests need to use a detached worktree, and the Python helper import path needs a real invocation surface.
