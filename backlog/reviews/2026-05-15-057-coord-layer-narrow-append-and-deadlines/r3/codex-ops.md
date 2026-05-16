---
item_id: "2026-05-15-057-coord-layer-narrow-append-and-deadlines"
round: 3
reviewer: "codex-ops"
artifact_sha: "d9f09b267b26637ed648cfe7d6c1b248dd833dbd"
completed_at: '2026-05-16T03:56:23Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:126-127,244-245"
    finding: >-
      The active-trigger and launchd-fallback paths still do not share a durable round correlation id. AC0 lets `coord_invoke` pass a `correlation_id` when the watcher actively spawns the wrapper, but AC7 says a launchd-fired fallback tick later recovers that same value from `request.md`; the spec never requires `request.py` or the watcher to write such a field before the request is pushed. In production, if the active-spawned wrapper dies before `tick_start` and the 600s launchd fallback successfully reviews the same round, the fallback cannot emit a `tick_start` with the daemon's `reviewer_invoked` correlation id, so the pre-spawn deadline still fires a false `deadline_missed` even though the fallback saved the round. Make the per-round correlation id a committed request artifact (generated without spawning), have watcher `coord_invoke` reuse it, and add a test where active spawn fails but launchd fallback closes the original pre-spawn deadline.
  - severity: "medium"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:198-203,222,243-244"
    finding: >-
      The scheduler-health event added in r3 is not valid or race-safe under the current event contract. AC7 deliberately emits `scheduler_health` with no `correlation_id`, but AC5 makes `correlation_id` required on every `coord_emit`, and AC3 keys open records by `(correlation_id, subject_role, event_type, expected_by)`. If launchd overlaps two ticks for the same reviewer, a correlation-less `scheduler_health_done` can close the wrong open scheduler-health record, or validation can reject the health event entirely and the `|| true` guard will silently erase the new observability. Treat `tick_run_id` as the first-class deadline key for scheduler-health events or require a generated scheduler correlation id, and add an overlap test where one of two same-role scheduler ticks hangs while the other completes.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r3 spec closes the previous pre-push-spawn, daemon attribution, and two-phase emission concerns. The remaining runtime gaps are about correlation identity surviving fallback paths and scheduler-health tracking staying valid when launchd overlaps ticks.
