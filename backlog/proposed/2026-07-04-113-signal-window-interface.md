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
  - src/mcp/internal/cluster-engine.ts                              # reference only (read, NOT modified) — its wire-caps must not leak into the new seam
files_to_modify:
  # PROVISIONAL
  - src/trace/signal-window.ts                         # NEW: getSignalWindow implementation + contract types (independent union assembly, no src/mcp/internal imports)
  - src/storage/interface.ts                           # generalize append-order iteration beyond coord:% + generalized watermark accessor (getCurrentSequence)
  - src/storage/sqlite.ts                              # rowid-backed generic append-order query
  - src/storage/memory.ts                              # insertion-counter parity
  - tests/storage/                                     # backend-parity conformance for the new seam
  - tests/trace/                                       # contract tests: union, scope, loop, determinism, late-arrival
---

## Problem

There is no internal contract for "give me a window of context." The cluster engine assembles windows for the MCP wire (with truncation caps designed for external clients); the responder opens its own raw storage handle; the coming drift sweep (114) would otherwise become a third ad-hoc reader. Additionally, storage's only ordering is event-time `(timestamp DESC, id DESC)` — a cron consumer cursoring on event time silently skips late-arriving atoms (daemon down during a meeting → notes ingested later with old timestamps). The append-order answer exists but only for `coord:%` atoms (`iterateCoordAtomsByAppendOrder`).

## Acceptance Criteria

- **AC1 — the contract:** `getSignalWindow(opts)` in `src/trace/signal-window.ts` where `opts = { since?, until?, cursor?: {sinceSeq}, scope: 'machine'|'company', loop?: string, limit? }`, returning **one ordered list of `entries`** — the **union** of (a) normalized raw events (existing adapters, unchanged) and (b) derived atoms (`derived:granola-signals`, `derived:team-decisions`) — each entry carrying atom id, **`sequence_id`** (the durable append position; same semantics as `CoordAtomIterationRecord.sequence_id` — opaque beyond ordering + watermark equality), source, timestamp, and full untruncated content/metadata.
  - **Durable cursor advancement is caller-derived, not returned.** `getSignalWindow` does NOT compute or return a next-cursor. A cursor-mode consumer advances by `max(entry.sequence_id) + 1` over the returned page — inherently correct under `limit` truncation (you only advance past rows you actually saw) and under concurrent appends (an atom appended after the read simply isn't in the page and is picked up next poll). On an **empty** page the cursor does **not** move: the consumer re-polls from the same `sinceSeq`, which is the safe idempotent behavior (moving it forward to a separately-observed watermark is exactly the skip bug this avoids). A consumer needing a bootstrap/high-watermark uses AC3's `getCurrentSequence()` explicitly.
  - **Normalization location:** the union assembly is implemented independently in `src/trace/signal-window.ts` reusing the existing source adapters; the wire-shape truncation caps live only in `src/mcp/internal/cluster-engine.ts` and MUST NOT be imported (AC6 enforces the import closure). No wire-shape caps anywhere in the path.
- **AC2 — scope mapping:** `machine` = `fs:*` + `git:*` sources; `company` = `api:granola` + `derived:*`. The mapping lives in exactly one exported table (future `api:slack`/`api:linear` are one-line additions). Test: an atom of each current source class lands in exactly the documented scope.
- **AC3 — generalized append-order seam:** a storage method that iterates atoms in monotonic durable-append order, each record carrying `sequence_id` (SQLite rowid / memory insertion counter), with optional source filtering. **Boundary predicate (pinned to the existing coord contract in `src/storage/interface.ts`):** half-open `[sinceSeq, +∞)` — returns atoms with `sequence_id >= sinceSeq`; `sinceSeq` omitted means "from the beginning of the ledger" (`sinceSeq = 1`). Plus a **generalized watermark accessor** mirroring `getCurrentCoordSequence()` — returns `max(sequence_id)` over the in-scope atoms, `0` if none — so a consumer (and AC4's test) can snapshot `W`. **Sort + composition contract:** when `cursor.sinceSeq` is set the read is append-order (sort `sequence_id ASC`, filter `sequence_id >= sinceSeq`) intersected (**AND**) with any `since`/`until`/`scope`/`loop`; when `cursor` is absent the read is event-time (existing `(timestamp DESC, id DESC)` tie-break) filtered by `since`/`until`/`scope`/`loop`. This **generalizes** `iterateCoordAtomsByAppendOrder` — which MAY be reimplemented on it, but its external behavior (coord `source LIKE 'coord:%'` prefix filter, ordering, `sinceSeq` boundary, `getCurrentCoordSequence()` watermark) MUST NOT change and `tests/storage/iterate-coord-by-append-order.test.ts` MUST stay green. Backend-parity conformance tests for SQLite + Memory, mirroring the existing coord-seam tests.
- **AC4 — late-arrival correctness:** test: snapshot watermark `W = getCurrentSequence()` (the AC3 generalized accessor); append atom A with an *old* timestamp; a `cursor: {sinceSeq: W+1}` read returns A (A lands at `sequence_id = W+1`, and `W+1 >= W+1` under the half-open rule); an event-time `since` read for the same wall-clock window does **not** return A. Both behaviors asserted — this is the documented reason two orderings exist.
- **AC5 — determinism:** same `opts` against the same store state returns deep-equal results (test runs the read twice, and once more after an unrelated-scope append).
- **AC6 — loop filter, dumb by contract:** `loop` filters to entries whose `metadata.canonical_subject` (112's unified key) string-equals it; entries without the key are excluded when `loop` is set. No fuzzy matching, no LLM anywhere in the module — assert via an **import-closure test** (`tests/trace/signal-window-import-closure.test.ts`): the module's transitive import set contains no `src/mcp/internal` path and no `runBrain` symbol.

## Tests

- `tests/storage/signal-window-append-order.test.ts` — backend-parity (SQLite + Memory) for the generalized seam: `sequence_id` monotonicity; half-open `sinceSeq` boundary (a `sinceSeq: k` read includes the atom at `k`, excludes `k-1`); `sinceSeq` omitted starts at 1; optional source filter; generalized watermark accessor returns `max(sequence_id)` and `0` on an empty store. SQLite and Memory must yield identical sequences for the same append order.
- `tests/storage/iterate-coord-by-append-order.test.ts` — **existing coord-seam test MUST stay green** after `iterateCoordAtomsByAppendOrder` is reimplemented on the generic seam (coord `source LIKE 'coord:%'` filter, ordering, `sinceSeq` boundary, `getCurrentCoordSequence()` watermark). Non-regression only; no new assertions required.
- `tests/trace/signal-window.test.ts` — contract tests: AC1 union (raw adapters + `derived:*`), every entry carries `sequence_id`; **caller-derived cursor advancement is limit-safe** — a `limit`-truncated cursor read, advanced by `max(entry.sequence_id)+1`, returns the previously-truncated rows on the next read and skips none; an **empty** cursor read leaves the caller's `sinceSeq` unchanged and a later append at/after it is returned on re-poll (no skip); AC2 scope mapping (one atom per current source class lands in exactly its scope); AC4 late-arrival (`W = getCurrentSequence()` → append old-timestamp A → `sinceSeq: W+1` returns A, event-time `since` excludes A); AC5 determinism (deep-equal across two reads + one after an unrelated-scope append); AC6 loop filter (`metadata.canonical_subject` string-equality, keyless entries excluded when `loop` set).
- `tests/trace/signal-window-import-closure.test.ts` — AC6 import-closure: the module's transitive import set contains no `src/mcp/internal` path and no `runBrain` symbol.
- Command: `npm test` (vitest run) — all green — plus `npm run typecheck`.

## Out of Scope (Don't Drift)

- No refactor of existing MCP tools onto this interface (post-V0 alignment item).
- No caching, memoization, or materialized views (decision 12: measured slowness first).
- No new MCP tool exposing this externally.
- No alias table or semantic loop matching.
- The responder's existing direct storage handle stays as-is (grandfathered; documented).

## After Completion (Strategist Notes)

- New `wiki/architecture/signal-window` page from the seam decision doc (fork rules, two orderings, scope table).
- Record in the item's review notes whether `iterateCoordAtomsByAppendOrder` was reimplemented on the generic seam or left parallel — 057a's deadline-tracker tests must stay green either way.
