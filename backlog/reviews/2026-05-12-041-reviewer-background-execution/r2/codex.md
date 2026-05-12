---
item_id: 2026-05-12-041-reviewer-background-execution
round: 2
reviewer: codex
artifact_sha: 59bcdc1c8b9c1e35607f0387c7489afbae52a5ea
completed_at: '2026-05-12T21:39:21Z'
verdict: proceed_after_patches
findings:
  - severity: medium
    where: "AC5 isolated smoke repo branch setup vs push-with-retry.sh"
    finding: "AC5 now correctly replaces the real GitHub origin with a local bare origin, but its setup command still says `git init \"$SMOKE_WORK\"` without forcing the branch to `main`. The shared `push-with-retry.sh` helper hardcodes `git pull --rebase origin main && git push origin main`; on this machine, with no `init.defaultBranch` configured, plain `git init` creates `master`. The smoke can therefore fail on branch naming instead of validating the wrapper. Make AC5 require `git init -b main \"$SMOKE_WORK\"` or an explicit `git branch -M main && git push -u origin main` before the reviewer tick."
  - severity: low
    where: "AC5 real-GitHub-origin-unchanged sanity assertion"
    finding: "The production-repo `git fetch origin && git rev-list HEAD..origin/main | wc -l` before/after sanity check is useful as an operator warning, but it is race-prone in this repo because other review-queue actors can legitimately push while the smoke is running. It also does not prove the smoke repo lacks the real GitHub remote. Prefer making the hard assertion local and deterministic: `$SMOKE_WORK`'s `origin` URL must equal `$SMOKE_ORIGIN`, the production remote URL must be absent from `$SMOKE_WORK`, and any production-origin delta should be reported as advisory rather than failing the smoke."
  - severity: low
    where: "AC1 invalid `ECHO_REVIEW_QUEUE_REPO_ROOT` handling"
    finding: "AC1 says the wrapper `cd`s into `ECHO_REVIEW_QUEUE_REPO_ROOT`, but does not explicitly require `set -euo pipefail` or a preflight diagnostic when the env var points at a missing/non-repo path. A failed `cd` should exit non-zero before `codex exec` with a clear log line, so launchd status tails distinguish path misconfiguration from Codex CLI failure."
    cross_ref:
      round: 2
      reviewer: cursor
      finding_index: 2
---

# Reviewer Notes

R1's load-bearing patches landed: the wrapper/root contract is now explicit, AC2's launchd behavior no longer conflates bootstrap with execution, AC4 moves invalid reviewer files aside so retries are unblocked, and the test list no longer requires a known-red full suite.

The remaining branch-name issue is narrow but real because the existing push helper hardcodes `origin main`. Pinning the smoke repo to `main` should be enough to make the local-bare-origin strategy implementable.
