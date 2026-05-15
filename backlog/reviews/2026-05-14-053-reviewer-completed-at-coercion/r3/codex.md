---
item_id: "2026-05-14-053-reviewer-completed-at-coercion"
round: 3
reviewer: "codex"
artifact_sha: "dc46e101a7bb8dea5d59c1c2eabe3964357c5c2a"
completed_at: '2026-05-15T08:37:39Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3.2 Push-stub contract, lines 114-116; commit-reviewer-response.sh lines 42-44 and 90-92"
    finding: >-
      The spec still permits putting a stub push-with-retry.sh earlier on PATH, but the current helper does not resolve push-with-retry.sh through PATH: it computes PUSH_HELPER from git rev-parse --show-toplevel and invokes that exact repo-root path. A builder following the PATH-stub option will not intercept the push path being tested. AC3.2 should require replacing/copying a stub at $CHECKOUT/tools/review-queue/push-with-retry.sh, or add and test an explicit helper override, and should remove the PATH-only option.
  - severity: "medium"
    where: "AC3.2 Test repo setup and Pipeline assertions, lines 111-123; combine.py lines 34-36 and 273-287"
    finding: >-
      The combine stage has concrete prerequisites that AC3.2 does not spell out. combine.py imports _reviewers.py at module import time and load_reviewers reads tools/review-queue/reviewers.json; copying only validate/commit/combine plus schemas is not sufficient. The fixture request must also be eligible for combine: either requested_reviewers contains only the emitted reviewer, or the test creates every required requested reviewer response / uses an explicit timeout path. Otherwise combine.py can exit 0 with no combined.md, or fail before the pipeline assertion reaches the timestamp behavior.
  - severity: "low"
    where: "AC3.2 Production-repo untouched assertion, lines 118-120"
    finding: >-
      PROD_REMOTE_MAIN_PRE/POST are compared, but the required shape does not say to fail if git ls-remote origin refs/heads/main returns an empty or non-hex value. In a shell implementation without pipefail, a transient ls-remote failure can become an empty awk result, and empty == empty would satisfy the guard without proving the real github.com refs/heads/main SHA was checked. Add a non-empty 40-hex assertion, or use execFileSync without a shell pipeline and assert command success before entering the pipeline.
---

# Codex review

The timestamp coercion approach is implementable, and the r3 AC3.2 hardening covers the major safety rails. The remaining issues are in the hermetic test instructions: one suggested stub mechanism is not compatible with the current helper, and the combine-stage fixture needs explicit prerequisites so the test fails only on the intended behavior.
