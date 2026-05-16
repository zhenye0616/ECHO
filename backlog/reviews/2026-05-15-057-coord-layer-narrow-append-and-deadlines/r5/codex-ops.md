---
item_id: "2026-05-15-057-coord-layer-narrow-append-and-deadlines"
round: 5
reviewer: "codex-ops"
artifact_sha: "2d15276209d77278022d2c1bff4929d64d46f234"
completed_at: '2026-05-16T04:15:31Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:140"
    finding: >-
      `coord_invoke` appends `coord:reviewer_invoked` immediately after spawning the wrapper, but the child can emit `tick_start` before that append lands. In replay order, `tick_start` would open the mid-tick deadline, then the late `reviewer_invoked` would open a pre-spawn deadline whose expected `tick_start` has already passed, producing a false `deadline_missed` for an otherwise healthy active-spawn tick. The spec needs a causality guarantee here: append/open `reviewer_invoked` before the child can emit `tick_start` (with a separate spawn-failed terminal event if spawn fails), or define ordering/replay rules that make the daemon-emitted invoke record precede the child tick_start.
  - severity: "high"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:228"
    finding: >-
      AC3 says there are separate round-tier and scheduler-tier maps, but the actual close/open/idempotency rules are still correlation_id-only (`matching (correlation_id, subject_role)`, inserting `(correlation_id, ...)`, and `sha256(correlation_id|role|event_type|deadline_missed)`). AC7's `scheduler_health`/`scheduler_health_done` events have only `tick_run_id`, so a clean wrapper can leave scheduler-health deadlines unclosed, or reconstruction can dedupe/mislabel scheduler missed events with no stable key. This breaks the operator-health signal for the unattended scheduler tier. The transition rule, `deadline_missed` shape, idempotency key, and `coord_status()` rows need to use the tier key: `correlation_id` for round events and `tick_run_id` for scheduler events.
  - severity: "medium"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:137"
    finding: >-
      The pinned-request mismatch path emits `coord:tick_failed_to_bind`, but that event is not included in the event registry/tier lists or the deadline close rules. At runtime the wrapper's explanatory failure event can be rejected as an unknown event_type, or accepted without closing the daemon's open `reviewer_invoked -> tick_start` deadline, so the operator gets a delayed generic `deadline_missed` instead of the actual bind failure. Add `tick_failed_to_bind` to the registry with round-tier fields, a test fixture, and explicit closure semantics for the pre-spawn deadline.
---

# codex-ops review

Verdict: proceed_after_patches.

The r4 fixes are present in the r5 artifact: `coord_invoke` is request-pinned, input validation is strict, `request.py` is no longer an emission path, and clean duplicate/stale exits now close `tick_start`. The remaining blockers are runtime ordering and tier-key issues that would still show up as false or missing health signals under unattended ticks.
