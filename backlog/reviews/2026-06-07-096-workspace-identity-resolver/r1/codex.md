---
item_id: "2026-06-07-096-workspace-identity-resolver"
round: 1
reviewer: "codex"
artifact_sha: "eba1c60375384c9b0ad0c18f5a928e7605a0fef4"
completed_at: '2026-06-07T18:58:53Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Locked decisions 1 / AC5 / AC7"
    finding: "The exact ArtifactRef tuple for the new workspace join edge is still ambiguous: LD1 says the join key is `workspace:<canonical-root>` and allows provider `workspace` or `local`, while AC5 says `type: 'workspace'`, `id = canonical root`, and the existing join comparison is `${provider}:${type}:${id}`. Patch the spec to lock the exact provider/type/id values and the exact expected cluster key string used in AC7 tests."
  - severity: "medium"
    where: "AC1"
    finding: "Canonical-root discovery is not fully implementable/testable as written: the project-anchor set is expressed with an ellipsis, and the canonicalization behavior for non-existent paths conflicts with realpath/case canonicalization unless the fallback algorithm is specified. Patch AC1 to define the exact anchor filename list, traversal stop rules, and non-existent-path canonicalization behavior."
  - severity: "medium"
    where: "AC8 / Out of Scope: Cursor workspace identity"
    finding: "The spec requires `fileArtifact` to remain backward-compatible for Cursor's parked `fileArtifact(null, path)` path, but AC8 does not require a regression test for that null-root call. Patch the tests acceptance criteria to assert the Cursor/null-root file artifact shape remains unchanged while workspace-keyed file ids are used for canonical-root-bearing adapters."
---
