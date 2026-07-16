---
item_id: "2026-07-15-139-echo-context-founder-mac-authority-activation"
round: 6
reviewer: "codex-ops"
artifact_sha: "8b72e02d1f3cdf2271fc80db02deb87ca840e70d"
completed_at: '2026-07-16T04:31:49Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1/AC4/AC6/AC7 — controller execution and crash/resume contract"
    finding: "The spec requires journal-bound replay but no machine-wide exclusive execution lock before live mutation, so concurrent execute or resume invocations could both pass preflight and race on the launchd fence, backup, generation record, package deployment, or client transforms. Require the item-138 controller to acquire a durable execution lock before its first mutation, reject a different live owner, allow resume only after journal-bound stale-owner validation, and test overlapping execute/resume attempts; missing capability must stop and escalate."
  - severity: "medium"
    where: "AC8/AC10 — daily evidence period finalization"
    finding: "Daily rows must count a complete America/Los_Angeles civil day, but `ts` is the only period key and its semantics are undefined: a row emitted before midnight can miss late writes, while an emission timestamp after midnight derives the next date. Define canonical period-timestamp semantics, take durable DST-aware boundary cuts at both midnights, finalize only after the closing cut, and require idempotent crash/retry publication with midnight and DST-boundary tests."
  - severity: "medium"
    where: "AC8 — evidence-row plan membership validation"
    finding: "AC8 validates the adapter enum and slot existence independently, so a globally valid slot could be attributed to the wrong adapter and still satisfy the drill gate. Require the exact `(adapter, slot)` pair to exist in the hash-bound plan inventory and add a negative test for an enum-valid adapter paired with another adapter's valid slot."
---
