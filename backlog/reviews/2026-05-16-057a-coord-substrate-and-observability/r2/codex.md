---
item_id: "2026-05-16-057a-coord-substrate-and-observability"
round: 2
reviewer: "codex"
artifact_sha: "3e571c070d4506b938805e40e6cb3707c724a1c8"
completed_at: '2026-05-16T05:03:15Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:168; src/storage/interface.ts:12"
    finding: >-
      AC3's periodic reconciliation is specified around `last_processed_atom_id` and a scan over `(last_full_replay_watermark, high-watermark]`, but the current storage contract has no append-order cursor or id-range query. `EventId` is a random UUID, `QueryFilter` only exposes source/time/metadata/before filters, and SQLite orders by `(timestamp, id)`, not durable append order. As written, a builder cannot implement or falsify the watermarked replay without either scanning all coord atoms every 10 minutes or depending on private SQLite rowid behavior outside the `Storage` interface. Patch AC3/files_to_modify to define the storage seam explicitly, e.g. an append-sequence/watermark query across `Storage`, `SqliteStorage`, and `MemoryStorage`, with tests proving same-timestamp coord atoms replay in append order and reconciliation only replays the closed interval it claims.
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:144; package.json:34"
    finding: >-
      AC2 requires the TypeScript daemon loader to validate `coord-roles.json` against a JSON Schema using `if/then`, but this repo currently has no direct JSON Schema validator dependency in `package.json`, and the spec's file list does not include package dependency changes. The builder is left to choose between an unstated new dependency, importing an unstable transitive package, or hand-validating while claiming schema validation. Patch AC2 to name the runtime validation mechanism: either add the dependency/files/tests for Ajv or similar, or state that the TS loader performs hand-coded validation mirroring the schema while `_coord_roles.py`/schema cover static checks.
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:165; backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:197"
    finding: >-
      The status-clearing semantics use `event_type` inconsistently. AC3's open-record `event_type` is the opener (`reviewer_invoked` expects `tick_start`) and the emitted atom's `event_type` is `deadline_missed`; AC6 then says a per-role/event last miss is cleared by a successful close for that pair and gives `tick_start` clearing `tick_start`-deadline_missed as the example. That leaves implementers guessing whether status keys by opener event, expected event, or the `deadline_missed` atom type, and AC8's 48h fixture does not prove clearing. Patch the `deadline_missed` payload/metadata contract to name both `opened_event_type` and `expected_event_type` (or choose one canonical field), define which key `coord_status()` reports and clears, and add a test where a later successful close removes the stale last-miss entry.
---

## Findings

1. HIGH — AC3's reconciliation watermark cannot be implemented against the current storage interface.

The spec now has a solid serial-lane story, but the watermarked replay depends on a storage primitive that does not exist. `EventId` is a random UUID, and queries expose time/source filters plus a descending cursor, not an append-order interval. The spec should make the append-order seam explicit and include adapter parity tests.

2. MEDIUM — AC2 names JSON Schema validation in TypeScript without a validator contract.

`package.json` has no direct JSON Schema validator dependency. Either the spec needs to add one deliberately, or it should say the TS loader hand-validates the runtime contract and the JSON schema is for static/Python-side checks.

3. MEDIUM — AC6's last-miss clearing key is ambiguous.

A miss has at least three relevant event names: opener, expected closer, and `deadline_missed` itself. The status surface needs a canonical key and a clearing test so the builder does not encode the wrong one.
