---
item_id: "2026-05-19-063-raycast-sessions-as-objects"
round: 8
reviewer: "codex"
artifact_sha: "fee455861832651296df9c81a29bc5d4adce4f80"
completed_at: '2026-05-20T03:48:55Z'
verdict: "pushback"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md:256-300"
    finding: "AC8.12(d) is not falsifiable as written for the exact failure it claims to catch. With AC6.7's required per-id Promise chain, an exit handler that omits the explicit await drainInflightWrites(id) but still calls/awaits recordSessionUpdate(final) and recordSessionEnd through mergeRowAndWrite will append those writes behind the already-started stale update; the stale setItem completes before final-update begins, so the described final-row assertion still passes. The test will catch a non-chained mergeRowAndWrite, but it will not fail every implementation that omits the drain step. Patch either the AC8.12(d) contract to add an explicit call-order/spy assertion for drainInflightWrites before final update, or narrow the claim to say the stale-row test proves per-id chaining while AC6.4 separately requires the drain for readability/defense-in-depth."
---

## Review

The r8 patch closes the substantive per-row storage and final-flush race design, but the focused AC8.12(d) test claim still overstates what the test can prove. The per-id chain is the load-bearing serialization primitive; once that exists, omitting the explicit drain does not make the described stale-debounce test fail.

Verdict: `pushback` until the AC8.12(d) test contract is made falsifiable for the explicit drain requirement or the drain claim is narrowed.
