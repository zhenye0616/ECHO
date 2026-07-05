# Expansion invariants — capture/signal growth is additive; schema evolution is backward-compatible

**Date:** 2026-07-04 (evening)
**Decided by:** founder, in conversation with strategist (same session as the station-2 lock-in and item 115's full-auto loop)
**Extends:** `2026-07-04-station-2-signal-formation-lock-in.md` (D1–D7 + scope fence). D7 says WHEN expansion happens (consumer demand); this record locks HOW.

## Invariant 1 — Expanding capture and signals is ADDITIVE; no architecture changes

Growth happens by adding instances of existing patterns, never by modifying the patterns:

- **New capture source** = a capture-gate allowlist entry (`src/capture/sources.ts`) + a new poller/watcher surface emitting the unchanged atom envelope (`source`, `timestamp`, `content`, `metadata`). No storage change, no schema change, no pipeline change.
- **New signal extractor** = a template instantiation on the dispatch chassis — settle gate, fingerprint checkpoint, strict-JSON brain, verbatim quote anchoring, `extractor_version` + supersedes manifests — writing to a new `derived:<source>-signals` namespace, plus a one-line add to 113's scope table (designed for exactly that). No new mechanism, no chassis change, no seam signature change.
- **Enforcement point (spec review):** an expansion item whose `files_to_modify` touches the storage schema, the seam interfaces (`getSignalWindow` signature/semantics), the dispatch chassis internals, or the capture pipeline core is NOT additive — it is an architecture change and must escalate to its own decision record instead of riding an expansion spec.

## Invariant 2 — New atom/signal schema shapes are BACKWARD COMPATIBLE and easy to migrate

Ratifies the "uniform core + per-source provenance" shape (previously an architectural lean, now committed):

- **Signal core is uniform and frozen-by-conformance:** every signal from every future extractor carries the semantic core (`signal_type`, `text`, `canonical_subject`) and the integrity layer (`extractor_version`, `extraction_run_id`, `dedupe_key`, `parent_dedupe_key`, quote/span anchoring) with identical semantics. Consumers (drift, windows, search) depend ONLY on core + integrity and keep working, unmodified, when source #2 arrives.
- **Provenance is per-source and additive:** source-specific fields (Granola: `note_id`, `meeting_title`; future eng: repo/session ids) live as additional metadata keys. Adding keys is always allowed; changing the meaning or byte-format of an existing key in place is never allowed (the 112 byte-stability discipline: `dedupe_key`/`canonical_subject` formats are pinned).
- **Migration playbook (the "easy" is these four moves, in preference order):**
  1. **Raw atoms are never migrated.** Append-only store; read-side adapters (`src/normalize/`) absorb shape variation at read time.
  2. **Derived atoms migrate by re-derivation:** bump `extractor_version`, re-extract, supersede via manifest (D2). Old signals remain for audit; consumers follow current runs (115's `filterToCurrentSignalRuns`).
  3. **Key renames use dual-write + scoped read-fallback** (the 112 pattern: write both keys, read falls back for legacy atoms, fallback scoped by source predicate so it cannot over-include).
  4. **Contract changes are deliberate:** 115's wire-contract conformance tests are the tripwire — any schema change must arrive as an explicit, reviewed test change, never as a silent drift.

## Out of scope

- No new tooling/lints for these invariants now — enforcement is spec review + the existing conformance/packaging tests. A checker earns existence only after an invariant is violated in practice.
- Does not reopen D7: WHEN to expand is still gated on consumer demand (drift misses, repeated pulls).

## Relates

- `2026-07-04-station-2-signal-formation-lock-in.md` (mechanism + fence), `2026-07-04-seam-v0-decision.md` (seam contracts), item 112 (byte-stability + dual-key precedent), item 115 (conformance tripwire + current-run helper), `wiki/architecture/capture-gate` + storage pages (post-shipment wiki promotion should cite this record).
