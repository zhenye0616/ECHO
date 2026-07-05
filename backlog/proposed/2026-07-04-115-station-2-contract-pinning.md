---
id: 2026-07-04-115-station-2-contract-pinning
title: "Station-2 contract pinning + extractor hardening — one-call current-run filter, skip observability, wire-contract conformance (zero new capability)"
status: proposed
priority: HIGH
estimate: 0.5-1d
created: 2026-07-04
blocked_by: []
spec_refs:
  - raw/internal/decisions/2026-07-04-station-2-signal-formation-lock-in.md  # D1-D7 + codex-review dispositions + scope fence — the decision this implements
  - raw/internal/decisions/2026-07-04-seam-v0-decision.md                    # seam decisions this must stay consistent with
  - docs/architecture-map/src-enrich.md                                      # station-2 as-built map
files_to_modify:
  # PROVISIONAL
  - src/enrich/granola-signals.ts           # one-call current-run filter helper (beside the existing resolver); skip/settle observability
  - src/mcp/tools/search-memories.ts        # replace the inline current-run composition glue with the helper
  - tests/enrich/granola-signals.test.ts    # helper unit coverage; conformance + observability + settle-pinning cases
  - tests/mcp/tools/search-memories.test.ts # helper-parity regression
---

## Problem

The station-2 lock-in (`2026-07-04-station-2-signal-formation-lock-in.md`) pinned the signal-formation contract in words. Three gaps remain at the code level (r1 correction: gap 1 restated against as-built facts):

1. **Current-run resolution is shared, but its composition is not.** `resolveCurrentGranolaSignalRuns` already exists in `src/enrich/granola-signals.ts:479` (exported) and `search-memories.ts:391` already consumes it. What each consumer must still hand-roll is the composition glue: query manifest atoms → resolve current runs → build the current-signal id set → filter signal events. That glue is duplicated logic waiting to diverge (the 112 duplicated-normalizer shape), and its edge semantics (supersedes cycles, missing refs, orphan signals from a failed manifest append) are pinned nowhere.
2. **Pairing and settle gates skip silently.** A note missing its summary or transcript, missing a `dedupe_key`, or carried by malformed raw events (no `note_id`, invalid `granola_atom_type`) is dropped with no structured trace; an unparsable `metadata.updated_at` silently counts as settled. Silent capture-side drift is invisible until a demo misses a meeting.
3. **The signal wire contract has no conformance test.** The provenance tuple, `signal_type` enum, manifest fields, and the quote-enforcement asymmetry (transcript spans verbatim-enforced; summary spans NOT guaranteed) are pinned in prose only; a refactor could change any of them without a failing test.

This item is shape + infra ONLY per the lock-in scope refinement: no new capability, no behavior change to extraction output, no consumer rewiring, no new source file (the helper lives beside the resolver it composes).

## Acceptance Criteria

- **AC1 — one-call current-run filter (shape):** a pure exported helper in `src/enrich/granola-signals.ts` (working name `filterToCurrentSignalRuns(signalEvents, manifestEvents)`) that composes the existing `resolveCurrentGranolaSignalRuns`: returns only the signal events belonging to each note's current manifest run. Pinned semantics (all by unit test, none by new mechanism):
  - superseded-run signals excluded; supersedes chains of length ≥2 resolve to the newest run only;
  - **deterministic malformed-chain behavior:** resolution is superseded-set construction (single pass, no chain walking) — a supersedes CYCLE therefore terminates and yields no current run for that note (its signals are excluded); a `supersedes` pointing at a nonexistent run id is inert; duplicate manifests for the same note pin whatever the existing resolver returns today (test-pinned, not redesigned);
  - **orphan signals from a failed manifest append excluded** — exact fixture shape from `tests/enrich/granola-signals.test.ts` ("does not advance the checkpoint when signal atoms append but manifest append fails", ~line 274, `ManifestFailOnceStorage`): run 1 appends signal atom(s) then the manifest append throws (`status: 'error', reason: 'append_failed'`, checkpoint not advanced); the retry run appends fresh signal atoms + a manifest. The run-1 atoms remain in storage referenced by no manifest. The helper excludes them; the retry run's signals pass;
  - signal events with no manifest for their note at all are excluded (pins the existing `search-memories` id-set behavior);
  - multi-note independence (note A's supersede does not affect note B).
- **AC2 — search-memories consumes the helper:** the inline `restrictToCurrentGranolaSignals` composition block in `src/mcp/tools/search-memories.ts` (~lines 389–398) is replaced by a call to the helper. Observable behavior UNCHANGED — existing tests pass untouched; add one parity case exercising the AC1 orphan fixture shape through the tool path.
- **AC3 — skip/settle observability (infra):** the extraction path emits structured log lines (`note_id` where known + machine-readable reason) and the worker's per-tick result surfaces counters with EXACTLY these keys (spec-pinned, not builder-chosen):
  - `skipped_notes: { missing_summary: number; missing_transcript: number; missing_dedupe_key: number }` — note-level pairing-gate skips;
  - `malformed_events: number` — event-level drops in `buildRawGranolaNotes` (missing `note_id` or `granola_atom_type` ∉ {`summary`,`transcript`});
  - `unparsable_updated_at: number` — notes whose `updated_at` fails to parse; the counts-as-settled behavior is PINNED by an explicit test plus a warn log — behavior unchanged, made visible and deliberate.
  Not-yet-settled notes are a defer, not a skip — no counter. No new persisted state; counters are per-tick in-memory only.
- **AC4 — wire-contract conformance test (shape):** a dedicated test block pinning, field-by-field with hardcoded expected field lists (112's byte-stable-fixture style, not recomputation): (a) the signal-atom contract: `canonical_subject`, `signal_type` ∈ {`decision`,`rationale`,`action`}, `text`, `note_id`, `meeting_title`, `source_span`, `extractor_version`, `extraction_run_id`, `dedupe_key`, `parent_dedupe_key`; (b) the manifest-atom contract: `extraction_run_id`, `supersedes`, `note_id`; (c) the quote-enforcement asymmetry: transcript-span quote mutation fails extraction, summary-span quotes carry no verbatim guarantee. Any future change to these becomes a deliberate, reviewed contract change.
- **AC5 — packaging invariants stay green with zero snapshot delta:** `npx vitest run tests/packaging/import-closure.test.ts tests/packaging/packed-manifest.test.ts` passes with NO changes to the packed-manifest snapshot — the helper lives in the already-packed `src/enrich/granola-signals.ts`, so no new `dist/**` entries may appear. If the builder deviates into a new module file, that is a spec deviation to flag in `agent_notes`, requiring the snapshot update + rationale.

## Out of Scope (Don't Drift)

- **No capture/poller changes** — the append-once skip of updated Granola notes is station-1 work under its own future decision (104 supersede-chain lineage).
- **No `getSignalWindow` changes** — current-run opt-in mode and event-time SQL pushdown are 113-reader followups, triggered by a consumer rewiring.
- **No `decision-drift.ts` changes** — the drift sweep adopting the helper is a station-6 followup, not this item.
- **No intake/responder (station 3) changes** — this item defines what they will consume; it does not rewire them.
- **No new extractors, no prompt changes, no change to extraction output** for the normal single-extraction path.
- **No new persisted forms, no storage schema or whitelist changes, no MCP tool schema changes, no changes to `resolveCurrentGranolaSignalRuns` itself** (its semantics get PINNED by tests, not redesigned).

## Tests

- **AC1 — `tests/enrich/granola-signals.test.ts`:** helper unit cases for every pinned semantic above: current run passes; superseded excluded; chain ≥2 → newest only; cycle → note yields nothing (terminates); missing supersedes ref inert; duplicate manifests → pin existing resolver output; the exact `ManifestFailOnceStorage` retry-orphan shape → run-1 orphans excluded, retry-run signals included; no-manifest note → excluded; multi-note independence.
- **AC2 — `tests/mcp/tools/search-memories.test.ts`:** existing current-run cases pass untouched; one added parity case builds the retry-orphan fixture through storage and asserts the tool returns only the retry-run signal atoms.
- **AC3 — `tests/enrich/granola-signals.test.ts`:** one case per counter key: missing-transcript note → `skipped_notes.missing_transcript ≥ 1`; missing-summary note; missing-dedupe-key note; raw event with no `note_id` → `malformed_events ≥ 1`; unparsable `updated_at` → extracts (pinned settled behavior) AND `unparsable_updated_at ≥ 1` with warn log.
- **AC4 — conformance test with hardcoded field lists as described.**
- **AC5 — the two named packaging tests, run exactly as `npx vitest run tests/packaging/import-closure.test.ts tests/packaging/packed-manifest.test.ts`, green with zero snapshot delta.**

## After Completion (Strategist Notes)

- The lock-in decision record's F1/F7 disposition ("consumers MUST resolve current runs") becomes actionable: file per-station followups for drift-sweep and intake to adopt `filterToCurrentSignalRuns` when each is next touched.
- Wiki promotion (owed): the signal-window architecture page should reference the helper as the currentness half of the station-2 contract.
