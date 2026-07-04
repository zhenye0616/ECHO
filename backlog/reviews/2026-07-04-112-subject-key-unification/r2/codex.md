---
item_id: "2026-07-04-112-subject-key-unification"
round: 2
reviewer: "codex"
artifact_sha: "3f914b7ad31399552b1bddee7b4837fbf786e2fa"
completed_at: '2026-07-04T19:29:39Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC5 — legacy decision atoms stay findable by the join key"
    finding: "AC5 requires the canonical_subject-to-normalized_subject fallback to be scoped to team-decision atoms, but the spec does not name the exact predicate search-memories.ts must use to recognize that scope. Patch AC5 to specify the bounded predicate, such as the existing team-decision dedupe_key prefix if that is the repo source of truth, so the builder cannot accidentally make any atom with metadata.normalized_subject match metadata_match: {canonical_subject: ...}."
  - severity: "medium"
    where: "Tests — AC3 + AC5"
    finding: "The AC5 test proves legacy and new decision atoms are included, but it does not prove signal or other atom types are excluded from the legacy fallback. Add a negative fixture with a non-team-decision atom carrying metadata.normalized_subject == S and no metadata.canonical_subject, then assert metadata_match: {canonical_subject: S} does not return it."
  - severity: "medium"
    where: "After Completion (Strategist Notes)"
    finding: "The note says to confirm that no second key survives anywhere in src/, but AC2 and AC4 require normalized_subject to keep being written and read for backcompat. Patch the note to say canonical_subject is the only forward join key, while normalized_subject remains only for legacy decision compatibility."
---
