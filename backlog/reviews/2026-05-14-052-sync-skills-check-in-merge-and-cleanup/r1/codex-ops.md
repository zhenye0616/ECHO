---
item_id: 2026-05-14-052-sync-skills-check-in-merge-and-cleanup
round: 1
reviewer: codex-ops
artifact_sha: 2a052e02203ea7733c707514285552c9e6042fb0
completed_at: '2026-05-15T06:27:21Z'
verdict: proceed_after_patches
findings:
  - severity: medium
    where: "backlog/ready/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md:72-75"
    finding: >-
      AC3 requires `tools/install-pre-commit-hook.sh` itself to be executable, but it never requires the installed `.git/hooks/pre-commit` file to be executable or that an identical-but-non-executable existing hook gets repaired on a no-op reinstall. Git silently ignores non-executable hook files, so the installer can print `pre-commit hook installed` / `pre-commit hook unchanged` while case #1 from the spec still lands at runtime because the hook never fires. Require the installer to `chmod +x` the live hook on install/update and to fix mode even when the content is already byte-identical; add a test that asserts the installed hook is executable.
  - severity: medium
    where: "backlog/ready/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md:73-75"
    finding: >-
      The installer target is specified as the literal path `.git/hooks/pre-commit`. In ECHO's normal builder/reviewer workflow, checkouts can be linked worktrees where `.git` is a pointer file, not a directory; that path either fails or writes to the wrong place, so the founder/operator can think the hook is installed for a checkout while `git commit` never sees it. Specify resolving the hook path through Git itself (for example `git rev-parse --git-path hooks/pre-commit`, while accounting for any configured hooks path) and ensure the hook directory exists before the atomic move.
  - severity: low
    where: "backlog/ready/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md:79-86"
    finding: >-
      AC4 allows a whole-file `toContain` / `grep -q` assertion for `tools/sync-skills.sh --check`. That can pass if the string remains only in explanatory prose, risk notes, or a future comment while the actual C5 verify command stops running the check, which is exactly the operational regression this spec is trying to prevent. Tighten the test contract so it extracts the C5 verify block or otherwise asserts the literal appears in the command list, not merely somewhere in `skills/merge-and-cleanup.md`.
---

# codex-ops review

Reviewed `backlog/ready/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md` at `2a052e02203ea7733c707514285552c9e6042fb0` from the operational/runtime lens.

Verdict: `proceed_after_patches`. The merge-time gate direction is operationally sound, but the hook installer needs to guarantee the hook actually runs across normal Git checkout shapes, and the regression test should be anchored to the runtime C5 command path.
