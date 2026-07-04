---
item_id: "2026-07-04-113-signal-window-interface"
round: 3
reviewer: "codex-ops"
artifact_sha: "4bdca93b63311cd12e9cf3c17834e92b8d64f3ce"
completed_at: '2026-07-04T19:40:38Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3 — generalized append-order seam"
    finding: "The spec defines SQLite sequence_id as rowid-backed while also treating it as a durable cursor watermark for unattended consumers. Plain SQLite rowid is not operationally durable if the table can delete its highest row, be rebuilt, or be VACUUMed without an explicit INTEGER PRIMARY KEY/sequence column; a stored cursor can then skip or replay rows after maintenance. Patch AC3/tests to require a stable persistent append sequence for SQLite across reopen and maintenance, or explicitly pin the atoms table invariant that makes rowid safe."
---

## Findings

The cursor contract is otherwise limit-safe and correctly caller-derived: no returned `nextSinceSeq`, every entry is required to carry `sequence_id`, empty windows hold the caller cursor, and AC4 still exercises the late-arrival case through `getCurrentSequence()`.
