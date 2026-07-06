---
item_id: "2026-07-06-119-drift-delivery-retry"
round: 1
reviewer: "codex"
artifact_sha: "4f346177632468c1016598330d82158b7155bfe6"
completed_at: '2026-07-06T00:49:18Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC1 — classify deliverPair errors; clean transport failure retries"
    finding: "The spec treats any synchronous `runtime.post(payload)` throw, including network/timeout errors, as proof Slack did not accept the card. That is not a safe implementation contract: a timeout or dropped response can happen after Slack accepted the request, so retrying can double-post and violate the at-most-once posture this item is trying to preserve. Patch the spec to retry only failure classes the post adapter can prove were not accepted, or keep network/timeout/unknown-outcome failures on the existing at-most-once terminal path; add an explicit negative test for an ambiguous timeout-after-send shape."
  - severity: "medium"
    where: "AC2 — exhaustion is terminal with evidence"
    finding: "The retry cap wording is off by one: 'once `retry_count` reaches `DRIFT_DELIVERY_MAX_RETRIES`, the next failed attempt' implies `MAX_RETRIES + 1` visible post attempts, while the test contract says terminal after exactly `DRIFT_DELIVERY_MAX_RETRIES` attempts. Patch the AC to define `retry_count` as failed attempts so far and terminalize on the failure that would increment it to the max, with no additional deferred attempt."
---
