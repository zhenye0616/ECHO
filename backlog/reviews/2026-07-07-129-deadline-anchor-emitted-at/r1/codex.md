---
item_id: "2026-07-07-129-deadline-anchor-emitted-at"
round: 1
reviewer: "codex"
artifact_sha: "3f2c92e78dcb9ca2a6debacd57ec1b383f4c7cb9"
completed_at: '2026-07-07T17:45:45Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-07-129-deadline-anchor-emitted-at.md:AC4"
    finding: "AC4 overclaims that all historical ledger atoms are covered automatically, but AC1 explicitly permits fallback to tracker-now when emitted_at is unparseable. Patch the spec to either cite/add coverage proving historical coord atoms always have parseable emitted_at, or narrow the retroactivity claim and add a test for the missing/unparseable emitted_at fallback."
  - severity: "medium"
    where: "backlog/proposed/2026-07-07-129-deadline-anchor-emitted-at.md:AC5"
    finding: "The gate is not reproducible: 'full test/lint/typecheck green' and the tolerated 'two pre-126 load-flakes' are not tied to concrete commands or test names. Patch AC5 or a Tests section to list the exact commands and exact tolerated failing test identifiers, or remove the exception."
---
