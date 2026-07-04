---
id: 2026-07-04-113-signal-window-interface
title: "getSignalWindow — the internal seam interface: one windowed read returning raw+derived context, full-fidelity, with event-time windows AND a generalized append-order cursor"
status: proposed
priority: HIGH
estimate: 2d
created: 2026-07-04
blocked_by:
  - 2026-07-04-112-subject-key-unification
spec_refs:
  - raw/internal/decisions/2026-07-04-seam-v0-decision.md          # decisions 7-13, 16-19 — the contract this implements
  - raw/internal/decisions/2026-07-03-loop-gap-analysis.md          # stations 1/2 + finding 5
  - src/storage/interface.ts                                        # QueryFilter ordering contract + the coord-only append-order seam being generalized
  - src/mcp/internal/cluster-engine.ts                              # existing window/normalize assembly this refactors from
files_to_modify:
  # PROVISIONAL
  - src/trace/signal-window.ts                         # NEW: getSignalWindow implementation + contract types
  - src/storage/interface.ts                           # generalize append-order iteration beyond coord:%
  - src/storage/sqlite.ts                              # rowid-backed generic append-order query
  - src/storage/memory.ts                              # insertion-counter parity
  - tests/storage/                                     # backend-parity conformance for the new seam
  - tests/trace/                                       # contract tests: union, scope, loop, determinism, late-arrival
---

## Problem

There is no internal contract for "give me a window of context." The cluster engine assembles windows for the MCP wire (with truncation caps designed for external clients); the responder opens its own raw storage handle; the coming drift sweep (114) would otherwise become a third ad-hoc reader. Additionally, storage's only ordering is event-time `(timestamp DESC, id DESC)` — a cron consumer cursoring on event time silently skips late-arriving atoms (daemon down during a meeting → notes ingested later with old timestamps). The append-order answer exists but only for `coord:%` atoms (`iterateCoordAtomsByAppendOrder`).

## Acceptance Criteria

- **AC1 — the contract:** `getSignalWindow(opts)` in `src/trace/signal-window.ts` where `opts = { since?, until?, cursor?: {sinceSeq}, scope: 'machine'|'company', loop?: string, limit? }`, returning one ordered list whose entries are the **union** of (a) normalized raw events (existing adapters, unchanged) and (b) derived atoms (`derived:granola-signals`, `derived:team-decisions`) — each entry carrying atom id, source, timestamp, and full untruncated content/metadata. No wire-shape caps anywhere in the path.
- **AC2 — scope mapping:** `machine` = `fs:*` + `git:*` sources; `company` = `api:granola` + `derived:*`. The mapping lives in exactly one exported table (future `api:slack`/`api:linear` are one-line additions). Test: an atom of each current source class lands in exactly the documented scope.
- **AC3 — generalized append-order seam:** a storage method that iterates atoms in durable append order with `sequence_id` (SQLite rowid / memory insertion counter), half-open `sinceSeq` semantics, optional source filtering — generalizing `iterateCoordAtomsByAppendOrder` (which may be reimplemented on it; its external behavior must not change). Backend-parity conformance tests for SQLite + Memory, mirroring the existing coord-seam tests.
- **AC4 — late-arrival correctness:** test: append atom A (old timestamp) *after* watermark W is taken; a `cursor: {sinceSeq: W+1}` read returns A; an event-time `since` read for the same wall-clock window does not. Both behaviors asserted — this is the documented reason two orderings exist.
- **AC5 — determinism:** same `opts` against the same store state returns deep-equal results (test runs the read twice, and once more after an unrelated-scope append).
- **AC6 — loop filter, dumb by contract:** `loop` filters to entries whose `metadata.canonical_subject` (112's unified key) string-equals it; entries without the key are excluded when `loop` is set. No fuzzy matching, no LLM anywhere in the module (assert via import-closure or explicit review check: no `runBrain`, no `src/mcp/internal` wire-cap imports).

## Out of Scope (Don't Drift)

- No refactor of existing MCP tools onto this interface (post-V0 alignment item).
- No caching, memoization, or materialized views (decision 12: measured slowness first).
- No new MCP tool exposing this externally.
- No alias table or semantic loop matching.
- The responder's existing direct storage handle stays as-is (grandfathered; documented).

## After Completion (Strategist Notes)

- New `wiki/architecture/signal-window` page from the seam decision doc (fork rules, two orderings, scope table).
- Record in the item's review notes whether `iterateCoordAtomsByAppendOrder` was reimplemented on the generic seam or left parallel — 057a's deadline-tracker tests must stay green either way.
