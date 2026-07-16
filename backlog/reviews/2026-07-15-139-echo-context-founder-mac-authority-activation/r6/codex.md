---
item_id: "2026-07-15-139-echo-context-founder-mac-authority-activation"
round: 6
reviewer: "codex"
artifact_sha: "8b72e02d1f3cdf2271fc80db02deb87ca840e70d"
completed_at: '2026-07-16T04:30:32Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 source-slot inventory; AC8 evidence-row membership"
    finding: "The inventory does not define whether each adapter has one slot or multiple slots, how valid indices are assigned, or whether duplicate adapter-slot entries are forbidden. AC1 calls the inventory AC8's sole expected-key source, but AC8 requires only one row per adapter and validates the adapter enum and plan-known slot independently; a multi-slot adapter can therefore be under-covered, or an fs adapter can claim a known git slot. Define the deterministic inventory schema, cardinality, index authority, and uniqueness rules; require exact (adapter, slot) pair membership and per-inventory-entry AC8 coverage; and add negative fixtures for cross-paired slots, duplicate entries, and missing disabled slots."
  - severity: "medium"
    where: "AC9 G2 recutover plan; AC10 daily expected-key derivation"
    finding: "AC10 derives its expected keys from the AC1 plan inventory, while AC9 creates and founder-approves a new G2 plan without requiring that plan to embed or hash-match the AC1 inventory. G2 evidence can therefore match a stale inventory while disagreeing with the active generation's plan. Require the G2 plan to bind the exact AC1 inventory hash, or derive AC10 from the active G2 inventory after proving exact equality, and add a negative test that rejects inventory divergence."
  - severity: "medium"
    where: "AC8 canonical evidence-row encoding; Tests evidence-row gate"
    finding: "A single-line JSON object with exact semantic keys and types is not yet a canonical encoding: key order, whitespace and line-terminator policy, integer lexical forms, and safe numeric range remain unspecified. Define an exact UTF-8 JSONL serialization or explicitly define semantic canonicalization after parsing, then add lexical fixtures. The matrix test must also assert exact equality with the seven-dates-times-inventory set and reject a missing expected date-slot key and nonzero counts on adjudication rows."
---
