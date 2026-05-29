---
item_id: "2026-05-28-079-loop-reliability-pack"
round: 2
reviewer: "codex"
artifact_sha: "2d4886a539fd6e4e25039548e38964780e368a71"
completed_at: '2026-05-29T05:53:49Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-28-079-loop-reliability-pack.md:17-18,90-92; tools/review-queue/commit-reviewer-response.sh:90-92"
    finding: >-
      AC2 still has two incompatible non-live push contracts. The shared effect runner is specified as returning 0 / canned success for dry-run and test modes, but the push path is also required to return a distinguishable non-live status so commit-reviewer-response.sh and the reviewer tick cannot treat a no-op push as completed. The current commit helper commits before invoking push-with-retry.sh, and it is not listed in files_to_modify even though AC2 says it must treat non-live push as non-completed. Patch the spec to name the exact push-mode contract and add commit-reviewer-response.sh (or an equivalent owning file) to files_to_modify, with a concrete requirement that non-live mode either refuses before git add/commit or rolls back the local commit and never emits tick_end completed.
  - severity: "medium"
    where: "backlog/ready/2026-05-28-079-loop-reliability-pack.md:21-23,94; skills/review-pending.md:169-196"
    finding: >-
      AC3 says the validator pins the existing committed sidecar shape and is additive-only, but the required heading is written as `Follow-up items` while the current Step C sidecar template emits `## Follow-up items (defer, do not block merge)`. An exact-heading validator would reject the artifact the producer currently writes; changing the heading would be a shape migration, contradicting the additive-only claim. Patch the schema/test contract to accept the exact current heading, or explicitly migrate both producer and merge-and-cleanup consumer and stop calling it additive-only.
  - severity: "low"
    where: "backlog/ready/2026-05-28-079-loop-reliability-pack.md:13,88; tools/review-queue/_run_reviewer.sh:89-150; skills/review-queue-watch.md:15-50; skills/merge-and-cleanup.md:64-98"
    finding: >-
      AC1 asks for byte-identical worktree setup against three existing copies, but those copies are not byte-identical today: they use different role variables, cleanup cd targets, and surrounding scheduler / merge-pause context. The helper can and should preserve observable invariants per caller, but a literal byte-identity fixture across these blocks is not a coherent test target. Patch AC1/AC7 to define per-caller invariant fixtures or normalized snippets instead of byte identity.
---

## Review

Verdict: `proceed_after_patches`.

The r2 spec addresses the prior stale-env and sidecar-target issues in the right direction, but AC2 still leaves the false-completed-tick fix ambiguous enough for a builder to implement the wrong contract. AC3 also needs one heading contract tightened so the new validator matches the sidecar shape that `/review-pending` actually writes.

## Findings

1. HIGH - AC2's non-live push semantics conflict. The spec needs one concrete contract for `echo_effect push` and an owning edit to `commit-reviewer-response.sh` or an equivalent caller before this is safe to build.

2. MEDIUM - AC3's committed-sidecar heading contract does not match the current Step C template for follow-ups, despite the additive-only claim.

3. LOW - AC1's byte-identity test language should become observable per-caller invariants or normalized fixtures; the current three source blocks differ by design.
