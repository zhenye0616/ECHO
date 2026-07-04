---
item_id: "2026-07-04-112-subject-key-unification"
round: 2
reviewer: "codex-ops"
artifact_sha: "3f914b7ad31399552b1bddee7b4837fbf786e2fa"
completed_at: '2026-07-04T19:29:01Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Tests / AC3 + AC5 — tests/mcp/tools/search-memories.test.ts"
    finding: "AC5 requires the canonical_subject metadata_match legacy fallback to apply only to team-decision atoms, but the test contract only proves that legacy and new decision atoms are included. Add a negative fixture with a non-team-decision atom carrying only normalized_subject for the same subject and assert metadata_match: {canonical_subject: S} does not return it, so the unattended drift/loop path cannot silently over-include unrelated atom types at runtime."
---
