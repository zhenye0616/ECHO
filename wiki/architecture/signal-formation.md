---
status: shipped
topic: Architecture
subtopic: Storage
aliases:
  - Signal Formation
  - Station 2
  - Granola Signal Extraction
  - GranolaSignalObservability
---

# Signal Formation (Station 2 — Granola Signal Extraction)

## Definition

Signal formation is the extraction chassis that turns raw Granola meeting notes into persisted, joinable facts. It lives at `src/enrich/granola-signals.ts` (extractor) and `src/enrich/dispatch.ts` (chassis: interval, single-flight, retry, checkpoint I/O), and is what the capture→signals seam decision calls "noticing facts" — as opposed to the drift sweep's ([[drift-alert]]) "drawing conclusions," which never persists. The founder locked this station as infrastructure on 2026-07-04: refinement effort hardens this machinery; widening it (new extractors, new sources) waits for a demonstrated consumer trigger (a drift miss, or repeated dogfooding pulls re-synthesizing the same un-extracted source), per the station-2 lock-in decision.

## Position in the Architecture

```
api:granola (raw notes, summary + transcript)      [[capture-gate]]-accepted, unmodified
        │
        ▼
runGranolaSignalWorkerOnce  (src/enrich/granola-signals.ts, chassis-driven)
        │  settle gate → fingerprint checkpoint → strict-JSON brain extraction → quote anchoring
        ▼
derived:granola-signals (signal atoms)  +  derived:granola-signals-index (run manifest)
        │
        ▼
[[signal-window|getSignalWindow]]  ·  [[mcp-search-memories|search_memories]]  ·  [[drift-alert|drift sweep]]
```

## The Chassis (shared with future extractors)

Every extractor on this chassis follows the same template — settle gate, fingerprint checkpoint, strict-JSON brain call, verbatim quote anchoring, `extractor_version` + supersedes manifests. A second extractor is a template instantiation on the same chassis, not a new mechanism (per the additive-expansion invariant).

- **Settle gate.** A note is only extracted once it has been stable for `settleMs` (default 10 minutes) since its `updated_at` — avoids extracting from a note Granola is still actively editing. A note whose `updated_at` fails to parse counts as settled (pinned behavior, not silently changed — see Observability below).
- **Fingerprint checkpoint.** `GranolaSignalCheckpoint` (`src/enrich/granola-signals.ts`) records, per `note_id`, the `input_fingerprint` (hash of the note's paired summary + transcript content) and `extractor_version` last attempted. Re-running the worker over an already-extracted, unchanged note is a no-op — extraction costs an AI call and is paid once per distinct input.
- **Strict-JSON brain extraction.** The extractor prompt returns `GranolaExtractedSignal[]`; each signal carries `signal_type`, `text`, `canonical_subject`, a `source_span`, and a `confidence`. No free-text parsing — malformed brain output is a checkpoint failure, retried up to `maxRetries`, never silently swallowed.
- **Verbatim quote anchoring.** `source_span` is `{kind: 'summary'}` or `{kind: 'transcript', start_time, end_time, quote}`. **Only transcript spans are quote-enforced** — a transcript-span quote that doesn't appear verbatim in the transcript fails extraction. Summary spans carry no verbatim guarantee (summaries are themselves a lossy compression). This asymmetry is a pinned contract, not an oversight: anything user-facing (drift alert quotes, packet templates) should prefer transcript-anchored quotes.
- **`extractor_version` + supersedes manifests, never rewrite.** A re-extraction (version bump, or retry after a manifest-append failure) writes new signal atoms plus a new `derived:granola-signals-index` manifest whose `supersedes` points at the prior run's `extraction_run_id`. Old signal atoms are never deleted or edited — see [[storage]] ("Derived-Signal Currentness") for how consumers resolve the *current* run.

## The Signal Contract (item 115, AC4 — wire-conformance-tested)

The provenance tuple every signal atom promises its consumers, pinned by a dedicated conformance test (`tests/enrich/granola-signals.test.ts`) with hardcoded field lists rather than a recomputed comparison — any future change is a deliberate, reviewed test diff, never silent drift:

**Signal-atom fields:** `canonical_subject`, `signal_type` ∈ {`decision`, `rationale`, `action`}, `text`, `note_id`, `meeting_title`, `source_span`, `extractor_version`, `extraction_run_id`, `dedupe_key`, `parent_dedupe_key`.

**Manifest-atom fields:** `extraction_run_id`, `supersedes`, `note_id` (plus `completed_at`, `signal_atom_ids` — the full run record).

**`signal_type` admission rules** (pinned in the station-2 lock-in's codex review, F8/F9): the intake/responder surface forms packets from `decision`/`action` signals only; `rationale` never forms a packet alone — it attaches to a decision via `rationale_for`; the drift sweep ([[drift-alert]]) reads all three signal types as candidate statements.

**Known, accepted gaps** (carried, not fixed, per the lock-in record): signals don't carry `web_url` or attendee lists — consumers needing those re-join the raw `api:granola` note (raw stays queryable in the house, per the seam decision's "full text inside the house" rule).

The [[storage|`uniform core + per-source provenance`]] invariant applies here first: every future extractor's signals must carry the same semantic core (`signal_type`, `text`, `canonical_subject`) and integrity layer (`extractor_version`, `extraction_run_id`, `dedupe_key`, `parent_dedupe_key`, quote/span anchoring); source-specific fields (Granola: `note_id`, `meeting_title`) are additive metadata. Consumers depending only on core + integrity keep working unmodified when a second extractor arrives.

## Skip/Settle Observability (item 115, AC3)

Pairing and settle gates used to skip silently — a note missing its summary or transcript, missing a `dedupe_key`, or carried by a malformed raw event (no `note_id`, or `granola_atom_type` outside `{summary, transcript}`) was dropped with no trace. The worker's per-tick result now surfaces a structured `observability` object:

```ts
interface GranolaSignalObservability {
  skipped_notes: {
    missing_summary: number;
    missing_transcript: number;
    missing_dedupe_key: number;
  };
  malformed_events: number;       // raw event missing note_id, or invalid granola_atom_type
  unparsable_updated_at: number;  // notes whose updated_at fails to parse — PINNED counts-as-settled
}
```

A multi-defect note counts once, by pinned precedence (`missing_summary` → `missing_transcript` → `missing_dedupe_key` — pairing completeness before dedupe), and emits exactly one structured warn log carrying the machine-readable reason and `note_id` where known. Counters are per-tick, in-memory only — no new persisted state. A not-yet-settled note is a defer, not a skip, and increments nothing.

## Current-Run Filtering (item 115, AC1)

`filterToCurrentSignalRuns(candidateEvents, manifestEvents)` — see [[storage]] ("Derived-Signal Currentness") for the full contract. This is the currentness half of the station-2 signal contract: a signal atom's mere existence is not sufficient for a consumer to trust it, because a superseded run's atoms are never deleted. Consumers of `derived:granola-signals` MUST resolve current runs via this helper (or fail open — see below); `search_memories` is the only current consumer today.

**Known limitation, pinned deliberately (not a bug):** the helper filters `source !== GRANOLA_SIGNAL_SOURCE || currentSignalIds.has(id)` — it is single-source by construction. A second extractor's signals would pass through *unfiltered* (fail-open) until the helper is parameterized on `(signalSource, manifestSource)`. This is a recorded gating precondition for "extractor #2," not a defect in the shipped single-extractor world.

## Out of Scope (and Where It Lives Instead)

- **No new extractors** (Slack, eng-session, Linear) until a consumer-demand trigger fires with dogfooding-journal evidence — station-2 lock-in decision.
- **No cross-source or cross-meeting fusion inside station 2** — cross-meeting reconciliation is the drift sweep's job ([[drift-alert]]), strictly downstream of signals.
- **No alias / semantic subject matching** — `canonical_subject` (see [[storage]], "Subject-Key Unification") is exact-match only; misses are data for a future alias decision.
- **No capture-side re-ingest of updated Granola notes** — the poller (`src/capture/granola-poller.ts`) permanently skips already-ingested `note.id`s (the deliberate append-once decision from item 104); station 2's fingerprint/re-extract path only fires on `extractor_version` bump or manual backfill, never on a note edit alone. Demo/operational implication: ingest real meetings only after Granola finishes processing them.
- **No new persisted forms, storage schema changes, or MCP tool schema changes** from station-2 hardening work (item 115 shipped zero new capability — shape + infra only).

## Related

- [[storage]] — the append-only substrate signal atoms and manifests are written to; see its "Subject-Key Unification" and "Derived-Signal Currentness" sections
- [[signal-window]] — the internal seam that reads signal atoms (among other sources) as part of a unified window
- [[drift-alert]] — the standing consumer that joins signals against team decisions on `canonical_subject`
- [[mcp-search-memories]] — the first (and only, today) consumer of `filterToCurrentSignalRuns`
- [[capture-gate]] — the chokepoint upstream of the raw `api:granola` notes this extractor reads
