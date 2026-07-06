---
item_id: "2026-07-06-118-drift-join-nomination"
round: 1
reviewer: "codex"
artifact_sha: "4f346177632468c1016598330d82158b7155bfe6"
completed_at: '2026-07-06T00:38:29Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Acceptance Criteria / AC3"
    finding: "The spec requires named constants for the Jaccard threshold and nomination cap but never assigns concrete values. This leaves precision/cost policy unfalsifiable and lets implementations choose any threshold <= 0.25 to make the OpenAI sponsorship example pass, or any cap. Patch by naming the exact DRIFT_NOMINATION_JACCARD_THRESHOLD and DRIFT_MAX_NOMINATIONS_PER_STATEMENT values and adding boundary tests for threshold inclusion/exclusion and cap enforcement."
  - severity: "medium"
    where: "Acceptance Criteria / AC3 and AC4"
    finding: "The nominator is described as deterministic but only sorts nominated decisions by descending score. Equal Jaccard scores, especially when the cap truncates candidates, can make the nominated pair set and near-miss top subject depend on recorded-decision iteration order. Patch by specifying a stable tie-breaker such as decision.dedupe_key ascending, and add a test where multiple tied candidates exceed the cap."
---
