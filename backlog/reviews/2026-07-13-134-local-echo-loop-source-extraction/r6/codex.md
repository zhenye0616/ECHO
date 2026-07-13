---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 6
reviewer: "codex"
artifact_sha: "780fb99a7384626e89be7b293f444e776d712e45"
completed_at: '2026-07-13T23:01:52Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 — discard lifecycle"
    finding: "Discard archives state, staging, record, cache, and output through multiple RENAME_EXCL operations, but no ordering or recovery protocol makes that set atomic. A kill after the claim directory is archived can expose ABSENT and admit a fresh extraction while old external artifacts remain. Specify either a single atomic bundle rename or an idempotent discard transaction/tombstone that cannot be confused with extraction resume, and add failpoints after every archive boundary."
  - severity: "high"
    where: "AC3 — store initialization intent marker"
    finding: "A legitimate second first opener can observe the fsynced intent marker while the first opener is still migrating and incorrectly convert it into an interrupted-initialization diagnostic, contradicting the simultaneous-first-open requirement. Define single-winner initialization ownership, contender waiting, and a positive stale-owner test before diagnostic conversion; add a barrier test that pauses the winner after marker fsync while the second opener starts."
  - severity: "high"
    where: "AC1 and AC8 — Project_echo evidence commit ordering"
    finding: "The spec orders record-file publication before target rename but does not place the later record-only Git commit precisely in that sequence or define its failure recovery. Committing first leaves a committed fixed-path record for a run that may never publish; committing afterward leaves a published target whose required evidence can be lost, while discard is forbidden. Specify the exact ref, record-only commit mechanism that cannot capture the explicitly permitted dirty source worktree, expected-old-SHA ref CAS, and compensating behavior for every kill window; test failures before and after both the evidence commit and target rename."
  - severity: "medium"
    where: "AC1 and AC2 — platform primitives and sandbox profile"
    finding: "The prescribed mechanism lacks an identified implementation for no-replace directory rename, which Node core fs.rename does not provide, and the host-read policy omits the dynamic libraries and runtime files required by hashed Node/npm/Git executables. Name and pin the RENAME_EXCL helper or syscall path, add any new helper to files_to_modify, and define separate executable and immutable runtime-read allowlists with tests proving successful cold-cache execution plus denial of an undeclared host path."
  - severity: "medium"
    where: "AC3 — caller-scoped idempotency"
    finding: "Uniqueness depends on normalized caller_identity, but the normalization algorithm and idempotency_key validation are unspecified, so callers cannot predict collisions and concurrency tests are not portable. Define accepted encodings, normalization and rejection rules, length and empty-value limits, and whether the normalized identity is the fingerprint value; test Unicode normalization, whitespace, case, empty values, and overlong keys."
---
