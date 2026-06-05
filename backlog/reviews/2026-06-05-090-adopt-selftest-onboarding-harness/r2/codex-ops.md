---
item_id: "2026-06-05-090-adopt-selftest-onboarding-harness"
round: 2
reviewer: "codex-ops"
artifact_sha: "67be1ac2595cd2c5f38a4f8252e015afc15b661f"
completed_at: '2026-06-05T20:16:15Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 / AC3 / AC4"
    finding: "The spec quarantines red onboarding workflow legs, but the voting quality job still runs `npm test` on Windows/Linux while AC1 adds `tests/cli/selftest.test.ts` that executes the full `echoctl selftest --json`. If selftest depends on the 091-only platform fixes, the quality matrix can fail main despite AC4's green-main promise. Patch the spec to either make the selftest smoke test platform-neutral/mocked for voting quality, skip/todo the red OS portions with 091 comments, or mark the affected quality matrix legs non-voting in YAML until 091."
---

## Review

The revised artifact covers the operational fixes requested for round 2: atomic non-38478 port isolation, sentinel and parallel collision tests, child-daemon cleanup on failure/timeout, packed-artifact validation, and YAML-level `continue-on-error` for red onboarding legs.

One remaining CI runtime gap is that the new full selftest smoke test is part of the voting test suite unless the spec says otherwise. That can bypass the intended onboarding-leg quarantine and leave the unattended queue red on clean source.
