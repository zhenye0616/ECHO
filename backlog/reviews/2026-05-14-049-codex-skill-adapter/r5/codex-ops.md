---
item_id: 2026-05-14-049-codex-skill-adapter
round: 5
reviewer: codex-ops
artifact_sha: 55d2b1707039cad96dd38712cea45c9a66e27219
completed_at: "2026-05-14T20:21:59Z"
verdict: proceed_after_patches
findings:
  - severity: high
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:132-136"
    finding: >-
      AC4 says both install modes share the same conflict semantics, but the per-target lock is specified only under the --copy path while the default --symlink path still relies on a prior probe before ln -snf. At runtime a concurrent symlink/copy install, or any process recreating ~/.codex/skills/<name> between probe and ln, can still overwrite a non-managed symlink/file or race the copy-mode mv. Put the mkdir lock around probe-to-finalize for both modes, and add a mixed --symlink/--copy concurrent test so the default install path gets the same user-home safety guarantee.
  - severity: medium
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:138"
    finding: >-
      The stale staging cleanup command uses find "$HOME/.codex/.echo-staging" -maxdepth 1 -type d -mmin +60 -exec rm -rf {} +. Without -mindepth 1, the starting .echo-staging directory itself matches once it is older than 60 minutes; a later mkdir "$STAGE" can then fail because the parent was deleted during pre-flight. Require -mindepth 1, or recreate the parent after cleanup, and make the stale-cleanup test assert the staging root remains.
---

# codex-ops review

Reviewed `backlog/ready/2026-05-14-049-codex-skill-adapter.md` at `55d2b1707039cad96dd38712cea45c9a66e27219` from the operational/runtime lens.

Verdict: `proceed_after_patches`.

## Findings

1. HIGH - `backlog/ready/2026-05-14-049-codex-skill-adapter.md:132-136`: The lock now protects copy-mode finalization, but the default symlink path still has a probe-to-`ln -snf` race. The same lock needs to cover both modes to uphold the non-managed-path overwrite guarantee.

2. MEDIUM - `backlog/ready/2026-05-14-049-codex-skill-adapter.md:138`: The stale staging cleanup should not let `find` delete the `.echo-staging` root itself; otherwise copy-mode installs can fail after the parent directory ages past the cleanup threshold.
