---
item_id: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
round: 2
reviewer: codex
artifact_sha: "56175d0190c6c18820e643fb1e2e25b448571c1a"
completed_at: "2026-05-14T22:28:57Z"
verdict: proceed_after_patches
consumed_task_state: false
findings:
  - severity: high
    where: "backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md@56175d0:78-81,119,146"
    finding: |-
      The R2 pre-flight contract cannot satisfy its own crashed-tick recovery test. AC1 says to record every `git worktree list --porcelain` path in a safe-list and skip any `$TMPDIR/echo-*` directory whose absolute path is in that safe-list. But AC6.4 describes the crashed worktree as still registered, then expects the next pre-flight to `rm -rf` that same registered directory and prune its admin entry. With the current safe-list rule, a crash after `git worktree add` leaves a registered `$TMPDIR/echo-<role>-<uuid>` path that is skipped forever, so AC6.4 is mechanically impossible and stale registered tick worktrees accumulate.

      Patch the spec to distinguish active founder-pause worktrees from abandoned tick worktrees with an implementable signal, or change the crash contract to accept registered crash survivors and only GC unregistered directories. As written, the same pre-flight cannot both always skip registered worktrees and delete a registered crashed one.
  - severity: high
    where: "backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md@56175d0:76,123,145"
    finding: |-
      Push-failure preservation uses plain `mv "$WT" "$TMPDIR/echo-FAILED-..."` on a linked worktree, then later relies on `git -C $FAILED log -1` and next-tick `git worktree prune`. Plain `mv` does not update the common `.git/worktrees/<name>` metadata. A real linked-worktree probe showed `git -C $FAILED log -1` succeeds immediately after the move, but fails with `fatal: not a git repository: .../.git/worktrees/<old-name>` after `git worktree prune` removes the stale admin entry. That means AC6.8 can pass only before the next pre-flight; after the specified prune, the preserved failed directory is no longer a usable Git worktree.

      Patch `preserve-failed` to use `git worktree move "$WT" "$FAILED"` where supported, or keep the failed worktree at its registered path and mark it out of GC some other way. The invariant AC6.8 needs is that the failed directory remains both filesystem-present and Git-inspectable after subsequent pre-flight hygiene.
  - severity: medium
    where: "backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md@56175d0:129"
    finding: |-
      AC7 still has an import/filename mismatch. It requires the standalone CLI script to live at `tools/review-queue/worktree-helper.py`, but then says the Python test harness imports `worktree_helper` directly via `PYTHONPATH=$TOOL_DIR`. Python's normal import machinery will not import `worktree_helper` from a file named `worktree-helper.py`; the existing `_reviewer_gate.py` precedent works because it imports underscore-named modules from the same directory, not a hyphen-named file.

      Patch the helper shape to make the importable module concrete, e.g. `tools/review-queue/worktree_helper.py` with a `main()` CLI, or a thin `worktree-helper.py` wrapper around an underscore-named canonical module. Without that, the builder has to violate either the CLI filename requirement or the direct-import test requirement.
---

# Codex review - r2

Verdict: `proceed_after_patches`.

The worktree-isolation direction is still right, and the R1 child-process routing / detached `HEAD:main` issues are addressed. The remaining blockers are all in the R2 disposition surface: registered-worktree GC now contradicts crashed-tick recovery, push-failure preservation breaks after prune if implemented with plain `mv`, and the helper filename is still not importable as specified.
