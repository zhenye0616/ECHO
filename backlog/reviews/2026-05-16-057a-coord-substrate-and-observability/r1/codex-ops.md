---
item_id: "2026-05-16-057a-coord-substrate-and-observability"
round: 1
reviewer: "codex-ops"
artifact_sha: "6d26e60aa287a40c016bb2a4b600fed600959f88"
completed_at: '2026-05-16T04:50:15Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:155-160"
    finding: >-
      AC3 says the 1-second heartbeat fires `deadline_missed` when an open record is overdue, but it never says the tracker marks that record fired or removes it after a successful append. At runtime one missed deadline can remain open forever, so every heartbeat reprocesses the same record, `coord_status()` can keep showing it as open, and an unattended outage accumulates stale in-memory records instead of converging to a bounded missed-deadline history. Add an explicit terminal lifecycle for missed records, keep the idempotency key/cache for replay suppression, and cover the repeated-heartbeat case with a test that proves no duplicate append attempts and no stale open record after the first miss.
  - severity: "high"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:149-160"
    finding: >-
      The periodic 10-minute reconstruction is specified as a full replay over recent coord atoms, but the spec does not define how it is serialized with live `coord_emit` ingest and the heartbeat. If reconstruction snapshots the log before a concurrent `tick_end`, then swaps the rebuilt maps after that close event was handled live, it can resurrect an already-closed `tick_start` deadline and later emit a false `deadline_missed`; if it mutates the live maps while the heartbeat iterates, missed events can be duplicated or skipped. Require a single tracker mutation lane, or a snapshot high-watermark plus tail-replay protocol, and add fixtures for `tick_end` during reconstruction and heartbeat firing during reconciliation.
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:181-186"
    finding: >-
      `coord_status()` only promises recent missed deadlines from the last 1h. That is too short for the production failure this layer is meant to expose: a launchd reviewer can fail overnight, fire one `deadline_missed`, have the open record removed, and by the time the founder checks in the morning the status surface shows no missed deadline at all unless they know to run a forensic search. Keep at least the last missed deadline per role/event, or use the same max-deadline/24h horizon as reconstruction, and add a status-shape fixture where a miss older than 1h is still visible as an operator-facing stale/failure signal.
---

# codex-ops review

Verdict: `proceed_after_patches`.

057a is much tighter than the monolithic 057 artifact and the substrate split is workable, but the runtime contract still needs bounded missed-deadline lifecycle, reconstruction concurrency semantics, and a status horizon that survives real unattended outages.
