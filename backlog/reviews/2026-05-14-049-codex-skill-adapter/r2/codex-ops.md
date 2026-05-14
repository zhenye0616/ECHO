---
item_id: 2026-05-14-049-codex-skill-adapter
round: 2
reviewer: codex-ops
artifact_sha: 2a132696dd6a27c4920bc052e1e2389592848416
completed_at: '2026-05-14T20:01:02Z'
verdict: proceed_after_patches
findings:
  - severity: high
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:82"
    cross_ref:
      round: 1
      reviewer: codex-ops
      finding_index: 2
    finding: >-
      AC2 still asks each child review process to run `codex exec --sandbox workspace-write -C <repo>` in the shared production checkout, with write discipline enforced only by prompt. At runtime, the parent orchestrator is the process that needs to write the final sidecar; the per-item children only need to read and emit JSON. Giving every child `workspace-write` means one noncompliant or tool-using child can edit backlog files, append the dogfooding journal, or race queue sidecars while sibling reviews are still running. Make the child fan-out read-only (or give each child an isolated worktree), and keep the final sidecar write in the parent/orchestrator path.
  - severity: medium
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:83"
    finding: >-
      The per-child temp files are "unique" only by item id and cleanup uses `trap "rm -f $TMPDIR/echo-review-pending-*" EXIT`. If two `/review-pending` orchestrators run concurrently, or a crashed run leaves stale files behind, the next run can overwrite or delete another run's stdout/stderr/rc files before collection. This also assumes `TMPDIR` exists in every noninteractive Codex environment. Use a per-run `mktemp -d` under `${TMPDIR:-/tmp}`, put child stdout/stderr/rc files under that directory, and trap removal of only that run directory.
  - severity: medium
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:121"
    finding: >-
      AC4 allows switching from `--copy` back to `--symlink` when the existing target is an ECHO-managed directory, but the concrete symlink operation is `ln -snf "$REPO_ROOT/adapters/codex/skills/<name>" "$HOME/.codex/skills/<name>"`. `ln -snf` does not safely replace a real directory at that destination; depending on platform it can fail or create a nested link, leaving Codex to discover the stale copied skill. Require the installer to explicitly remove or replace managed directories before symlinking, and keep the mode-switch test asserting there is no nested link and no stale `SKILL.md` after the switch.
---

# codex-ops review

Reviewed `backlog/ready/2026-05-14-049-codex-skill-adapter.md` at `2a132696dd6a27c4920bc052e1e2389592848416` from the operational/runtime lens.

Verdict: `proceed_after_patches`. R2 closes the broad adapter-scope and clean-install gaps, but the Codex fan-out contract still gives child reviewers writable access to a shared checkout and uses non-isolated temp files. Patch those runtime guardrails before handing this to a builder.
