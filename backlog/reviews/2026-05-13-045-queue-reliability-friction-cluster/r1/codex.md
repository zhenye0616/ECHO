---
item_id: 2026-05-13-045-queue-reliability-friction-cluster
round: 1
reviewer: codex
artifact_sha: 8252b2d73c282854f13975d57917011939ac5118
completed_at: '2026-05-13T21:50:22Z'
verdict: pushback
findings:
- severity: high
  where: AC1 Test lines 70-74 + AC1 Change lines 62-64
  finding: The requested pre-link behavior is not exposed as an executable interface.
    The only new concrete artifact is validate_response_yaml.py <path>, which can
    validate a file, but the acceptance test requires invoking the reviewer prompt
    pre-link step and asserting temp cleanup, queue-errors logging, combined.md race
    handling, and successful os.link. The reviewer prompts are markdown instructions,
    so a test cannot invoke that step deterministically. Patch the spec to make a
    script/function own validate + atomic link + cleanup/logging, or narrow the test
    to the helper behavior and leave the prompt prose untested explicitly.
- severity: high
  where: AC1 Change line 62 + tools/review-queue/commit-reviewer-response.sh:91
  finding: The PRE-LINK-INVALID row has no commit/cleanup path after the in-session
    retry succeeds. The existing commit helper stages only the reviewer response path,
    so a pre-link failure followed by a valid retry would leave raw/internal/queue-errors.md
    dirty while push-with-retry autostashes around it. The next reviewer tick starts
    with a bare git pull --rebase origin main, so the dirty queue-errors row can break
    the very retry flow AC1 is trying to make cheaper. Specify whether the pre-link
    helper commits/stages the queue-errors row with the final response, writes only
    to stderr, or otherwise restores a clean tree before exiting.
- severity: medium
  where: AC6 Change lines 161-176
  finding: AC6 gives contradictory implementation instructions for the sidecar handoff.
    It first says the sidecar is staged but not committed inside /review-pending,
    then says the spec picks COMMIT and provides a git commit + push loop. A builder
    can plausibly implement either interpretation and claim coverage. Remove the stale
    staged-only paragraph, or split it into alternatives with one unambiguous chosen
    path and matching test expectation.
---

# Codex review

Reviewed `backlog/ready/2026-05-13-045-queue-reliability-friction-cluster.md` at `8252b2d73c282854f13975d57917011939ac5118` with the implementation/code-grounded lens.

I agree with the friction cluster and the narrowness of the six ACs, but AC1 needs a concrete pre-link executable boundary before a builder can implement and test it safely. As written, the highest-value fix is still partly prompt prose, and its new `queue-errors.md` write can leave the tree dirty after the successful retry. AC6 also needs the staged-vs-committed sidecar choice cleaned up before claim.
