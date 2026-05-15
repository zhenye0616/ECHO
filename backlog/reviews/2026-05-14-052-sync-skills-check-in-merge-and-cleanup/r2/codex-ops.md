---
item_id: 2026-05-14-052-sync-skills-check-in-merge-and-cleanup
round: 2
reviewer: codex-ops
artifact_sha: 8be6fca287e41aabcf5e4e3922ccaf7cb923df07
completed_at: '2026-05-15T08:13:34Z'
verdict: proceed_after_patches
findings:
- severity: medium
  where: backlog/ready/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md:76
  finding: AC3 gives `core.hooksPath` priority but only says to use `<that>/pre-commit`.
    Git allows `core.hooksPath` to be relative, and relative hook paths are resolved
    from the repository context, not necessarily from whatever subdirectory the founder
    happened to run the installer in. A naive `HOOK_PATH="$hooks_path/pre-commit"`
    will print success while writing a hook under the current subdirectory, leaving
    the real Git hook path untouched and the pre-commit guard silently absent. Require
    the installer to resolve the repo root first and normalize relative `core.hooksPath`
    against it, with a test that runs the installer from a nested directory while
    `core.hooksPath` is relative.
- severity: medium
  where: backlog/ready/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md:97
  finding: AC4 says the literal must appear inside the C5 verify command block, but
    the required extraction is the entire C5 section from the C5 heading to the next
    heading. That still passes if the string is moved into C5 explanatory prose, the
    package-lock sub-block, or a remediation sentence while the actual verify code
    fence omits the command. At runtime the merge can then skip the adapter-drift
    check even though `npm test` is green. Tighten the test to isolate the verify
    command fence/list under C5, or at least assert the literal appears before the
    end of the first C5 command fence and before the package-lock regeneration block.
---

# codex-ops review

Reviewed `backlog/ready/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md` at `8be6fca287e41aabcf5e4e3922ccaf7cb923df07` from the operational/runtime lens.

Verdict: `proceed_after_patches`. The spec is close, but two runtime false-success paths remain: relative `core.hooksPath` can install a hook at the wrong path, and the C5 shape test can pass even when the actual verify command no longer runs `tools/sync-skills.sh --check`.
