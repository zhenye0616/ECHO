---
item_id: "2026-07-07-125-observability-hardening-batch"
round: 1
reviewer: "codex-ops"
artifact_sha: "a0b97cf7da7606520cb6239d15d97776776703a4"
completed_at: '2026-07-07T06:41:17Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Acceptance Criteria / AC2 — proxy stream error handlers"
    finding: "AC2's required test only destroys the client response, so the spec can pass while the upstream brain-child timeout path still emits an unhandled EPIPE or ERR_STREAM_DESTROYED. Patch AC2 to require an upstream-destroy or timeout fixture too, and assert no unhandled process error plus a durable capture_failed or explicit partial-capture record."
  - severity: "medium"
    where: "Acceptance Criteria / AC3 — card-atom double-append guard"
    finding: "The specified check-before-append guard is not race-safe under overlapping unattended intake ticks: two workers can both observe no existing dedupe_key and append. Patch AC3 to require idempotency at the append boundary, or a lock/recheck that serializes the dedupe_key, and add a concurrent double-attempt test."
  - severity: "medium"
    where: "Acceptance Criteria / AC4 — --note seed listing for pre-123 cards"
    finding: "In --note mode there is no card atom to provide channel_id, but the AC only says resolved store(s). That permits an implementation that checks only the default store and silently misses terminal-only seeds, recreating the operational gap AC1 is fixing. Patch AC4 to explicitly enumerate default plus channel-specific seed stores, or derive the channel from seed metadata, and test a terminal-only pre-123 note."
---

## Summary

Proceed after tightening the spec. The batch is scoped as hardening, but AC2, AC3, and AC4 need explicit runtime assertions so unattended runs cannot silently pass while the original failure modes remain.
