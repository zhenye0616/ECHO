---
item_id: "2026-05-16-057a-coord-substrate-and-observability"
round: 3
reviewer: "codex"
artifact_sha: "4d4530281fbca9593b6ca280e736bb3b1cdd7531"
completed_at: '2026-05-16T05:13:55Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:177-183"
    finding: >-
      AC3 adds `iterateCoordAtomsByAppendOrder({sinceSeq?, untilSeq?, limit?})`, but the reconstruction and reconciliation algorithms still require two operations that the seam does not define: converting a 24h timestamp horizon into a valid `sinceSeq`, and reading the current/next append-sequence watermark for `highSeq`. Line 182 even passes a time-derived value into `sinceSeq`, while line 183 says `highSeq` is "read off the storage seam" without adding such a method. A builder can implement append-order iteration and still be unable to satisfy the stated bounded boot scan or watermarked reconciliation contract without inventing extra private SQLite APIs. Patch AC3 to either add explicit storage methods such as `getCoordSequenceAfter(timestamp)` / `getNextCoordSequence()` (with MemoryStorage parity tests), or rewrite reconstruction/reconciliation to use only the declared iterator and update the tests to prove the chosen bounded behavior.
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:182; backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:211-213; backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:239"
    finding: >-
      AC6 promises that the per-role-per-event-type last-miss list ignores the recent-window horizon and remains visible until a later successful expected event clears it, and AC8 asks for a 48h-old miss fixture. But AC3's only boot reconstruction scan is bounded to the max-deadline horizon (24h V1), and the clearing rule is described as an in-memory map updated on incoming events. After a daemon restart, a 48h-old uncleared miss can disappear from `coord_status()` while the current tests still pass if they synthesize the old miss in a live process. Patch the spec to define how the persistent last-miss map is rehydrated independently of the 24h open-deadline scan, or state that `coord_status()` reconstructs that list from durable coord atoms on demand; add a restart fixture with an old miss and no later successful close.
  - severity: "low"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:178; src/storage/migrations/0001_initial.sql:1"
    finding: >-
      The concrete SQLite sketch says `SELECT … FROM atoms`, but the current storage schema table is `events` and `SqliteStorage.append()` inserts into `events`. Since this AC is meant to be copied into the adapter implementation, leaving the wrong table name creates an avoidable implementation/test mismatch. Patch the example query to use `events` and to project `rowid AS sequence_id` explicitly.
---

## Findings

1. MEDIUM — AC3 still lacks the storage watermark primitives its replay algorithm relies on.

The r2 patch added append-order iteration, which is the right direction, but the surrounding algorithm still asks for timestamp-to-sequence conversion and a current/next sequence watermark that are not part of the declared interface. The builder needs either explicit seam methods and parity tests, or an algorithm that is phrased entirely in terms of the declared iterator.

2. MEDIUM — Horizon-independent last-miss status is not durable across restart as specified.

`coord_status()` promises a last-miss list that survives beyond the recent-missed horizon until a successful expected event clears it. The boot reconstruction scan is only over the max-deadline horizon, so an old uncleared miss can be lost after restart unless the spec defines a separate rehydration/on-demand replay path and tests that restart case.

3. LOW — The SQLite example names the wrong table.

The repo stores atoms in the `events` table. The rowid query sketch should use `events` and explicitly return `rowid AS sequence_id`.
