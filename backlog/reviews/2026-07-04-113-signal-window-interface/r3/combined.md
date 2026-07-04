---
item_id: 2026-07-04-113-signal-window-interface
round: 3
combined_at: '2026-07-04T19:41:52Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex-ops | AC3 — generalized append-order seam | accepted — invariant pinned (option b) | SQLite `rowid` durability across VACUUM/rebuild/highest-row-delete. Verified against the shipped code: the events table uses implicit rowid (`id` is a UUID string, not an INTEGER PRIMARY KEY alias — `src/storage/sqlite.ts:272-277`), and the 057a coord seam already depends on rowid-as-`sequence_id`. codex-ops's failure modes are all V1-out-of-scope substrate operations: the events table is append-only (no deletes/tombstones — `wiki/architecture/storage.md`), single-writer, never VACUUMed, so implicit rowid is never renumbered. Took option (b): pinned that invariant explicitly in AC3 (and stated that a future deletes/tombstones/VACUUM item must migrate to an explicit `INTEGER PRIMARY KEY` sequence). Rejected option (a) — adding an explicit sequence column / VACUUM-hardening would drift into a substrate migration and change the shipped 057a contract, against the no-new-architecture / friction-first constraints. Added a Tests line: cursor durability across daemon reopen. |

Reframe gate: not triggered — the finding targets AC3's `sequence_id` = SQLite rowid mapping, which is **original spec text** and mirrors the pre-existing, shipped `iterateCoordAtomsByAppendOrder` contract (`CoordAtomIterationRecord.sequence_id` = rowid), not a prior-round `spec-r*-patches` mechanism. It is also a single finding (< 2). No investigator required. codex's r3 verdict was `proceed` (zero findings) — the r2 structural cut converged for codex.

## Convergence call

`needs R4` — verification round. One MEDIUM accepted as an invariant-pin (option b), not new machinery: AC3 now states the append-only / single-writer / no-VACUUM invariant that makes implicit rowid a durable cursor, and Tests add a daemon-reopen durability assertion. Spec changed → default branch (b): dispatch a verification round (a small invariant-pin patch typically converges in the next round).
focus_hints: Verify AC3 pins the SQLite rowid durability invariant (append-only / single-writer / no-VACUUM → rowid never renumbered) and defers any explicit-sequence-column migration to a future deletes/VACUUM item (no new durability machinery added to 113); Tests include the cursor-durability-across-daemon-reopen assertion; confirm the r2 structural cut is still clean (no `nextSinceSeq` reintroduced, caller-derived limit-safe advancement intact).

