---
item_id: "2026-05-13-045-queue-reliability-friction-cluster"
round: 2
reviewer: "codex"
artifact_sha: "bb1309f1d6487274748b458c114efbcaf239e0ce"
completed_at: "2026-05-13T22:40:20Z"
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 Test AC1d"
    finding: >-
      AC1d is internally inconsistent as a deterministic test: it tells the builder to stage a synthetic raw/internal/queue-errors.md row, then assert git status --porcelain raw/internal/queue-errors.md shows no change after invoking the helper. A staged row makes that status non-empty before the helper runs, so the assertion cannot distinguish helper dirt from the fixture baseline. Patch the AC to compare pre/post status, or assert no unstaged diff against the staged baseline with git diff --exit-code -- raw/internal/queue-errors.md.
  - severity: "medium"
    where: "AC2 Test"
    finding: >-
      The smoke-gate test exercises the success path of _install_reviewer_launchd.sh, whose current implementation writes $HOME/Library/LaunchAgents and invokes launchctl. The spec says production state must stay untouched, but it does not require the test to isolate HOME or stub launchctl/sw_vers/id. Add those concrete fixture requirements, or the new vitest can mutate the operator's LaunchAgents and be flaky outside the founder's interactive macOS environment.
  - severity: "medium"
    where: "AC6 / .claude/commands/review-pending.md"
    finding: >-
      AC6 updates Step C and one Step E bullet, but the existing command file also declares in its description and intro that /review-pending is read-only and never runs state-changing git operations. The acceptance criteria should explicitly update those remaining read-only statements to the new sidecar-only exception. Also replace the push context snippet's $(basename "$ITEM" .md), which is outside the SIDECARS loop and ambiguous for multi-item reviews, with a deterministic sidecar/item context.
---

## Findings

1. **AC1d staged-status assertion is not falsifiable.** The test setup intentionally stages a synthetic `raw/internal/queue-errors.md` row, then asks for `git status --porcelain raw/internal/queue-errors.md` to show no change after the helper. That status is already non-empty from the fixture. The AC should say to compare pre/post status, or assert there is no unstaged diff against the staged baseline with `git diff --exit-code -- raw/internal/queue-errors.md`.

2. **AC2 smoke-gate test needs launchd isolation.** The success path of `_install_reviewer_launchd.sh` writes `$HOME/Library/LaunchAgents` and invokes `launchctl`. The spec should require a temp `HOME` plus stubbed `launchctl`/`sw_vers`/`id` (or an equivalent temp tool copy) before the test creates an executable mock smoke runner and expects exit 0. Without that, the test can touch real operator state.

3. **AC6 still leaves contradictory `/review-pending` prose and an ambiguous push context.** Updating only Step C and one Step E bullet leaves the current command description/intro saying it is read-only and never runs state-changing git operations. The AC should explicitly change those lines to the sidecar-only exception. The snippet should also avoid `$(basename "$ITEM" .md)` after looping over `SIDECARS`; use the current sidecar in-loop or a fixed aggregate context for multi-item reviews.

## Verdict

`proceed_after_patches`. The r2 spec is close, but these three patches remove avoidable builder ambiguity and prevent the AC2 test from interacting with real launchd state.
