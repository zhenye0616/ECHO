---
item_id: "2026-06-03-088-proposed-stage-pipeline"
round: 2
reviewer: "codex"
artifact_sha: "f081dadf310e7f8194a396a0bcc47342d4c9f826"
completed_at: '2026-06-03T21:34:05Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:15-16,93-97"
    finding: >-
      The promotion contract still gives promote.py two incompatible side-effect boundaries. The watcher path says the ready_content_sha stamp and proposed-to-ready move are folded into the same terminal commit as combined.md, but the promote.py file contract says the helper itself performs stamp+move+commit+push. A builder cannot implement both literally: if the helper commits during normal convergence, the spec move is no longer folded into the terminal audit commit; if it is called before that terminal commit, a ready/ item can be exposed before the terminal combined.md state lands. Patch the spec to define explicit helper modes or call sites, for example a mutate-only/stage-only promotion path used by the terminal watcher branch and commit+push behavior only for recovery/bounce pre-steps, and pin the chosen boundary in the promote.py tests.
---

# Codex Review

Verdict: `proceed_after_patches`.

The r1 patches close the main safety holes: terminal promotion no longer keys off `combined.md` alone, `docs/BACKLOG.md --check` is fixture-only, the real `tools/test_blocked.py` harness is named, and stale-ready bounce has a scheduled watcher owner.

## Findings

1. MEDIUM - `promote.py` still has an unclear commit boundary.
   AC4 requires normal convergence to stamp and move the spec in the same terminal commit as `combined.md`, but the helper contract says `promote.py` commits and pushes the move itself. The builder needs an explicit split between mutate-only terminal use and commit+push recovery/bounce use, or the spec should intentionally drop the folded-commit requirement and update tests around that choice.
