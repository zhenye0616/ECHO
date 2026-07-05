---
id: 2026-07-04-115-station-2-contract-pinning
title: "Station-2 contract pinning + extractor hardening — shared current-run resolver, skip observability, wire-contract conformance (zero new capability)"
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
  - src/enrich/signal-manifests.ts          # NEW: shared current-run resolver (station-2-owned shape)
  - src/enrich/granola-signals.ts           # skip/settle observability; consume/re-export resolver types if natural
  - src/mcp/tools/search-memories.ts        # replace the one-off current-run filter with the shared resolver
  - tests/enrich/signal-manifests.test.ts   # NEW: resolver unit coverage
  - tests/enrich/granola-signals.test.ts    # conformance + observability + settle-pinning cases
  - tests/mcp/tools/search-memories.test.ts # resolver-parity regression
---

## Problem

The station-2 lock-in (`2026-07-04-station-2-signal-formation-lock-in.md`) pinned the signal-formation contract in words. Three gaps remain at the code level, all confirmed by the 2026-07-04 codex review of the lock-in:

1. **Current-run/supersedes resolution is a one-off** inside `src/mcp/tools/search-memories.ts` (~line 389). Every other consumer (drift sweep, intake, future station-3 rewiring) must re-derive manifest semantics by hand — the exact duplicated-logic shape that item 112 just eliminated for subject normalization. Station 2 authors the manifests; station 2 should export the one canonical resolver.
2. **Pairing and settle gates skip silently.** A note missing its transcript, carrying a bad `granola_atom_type`, or missing dedupe keys is skipped with no structured trace; an unparsable `metadata.updated_at` silently counts as settled. Silent capture-side drift is invisible until a demo misses a meeting.
3. **The signal wire contract has no conformance test.** The provenance tuple, `signal_type` enum, manifest fields, and the quote-enforcement asymmetry (transcript spans verbatim-enforced; summary spans NOT guaranteed) are pinned in prose only; a refactor could change any of them without a failing test.

This item is shape + infra ONLY per the lock-in scope refinement: no new capability, no behavior change to extraction output, no consumer rewiring.

## Acceptance Criteria

- **AC1 — shared current-run resolver (shape):** new station-2-owned module `src/enrich/signal-manifests.ts` exporting a pure resolver (working name `resolveCurrentSignalRuns`): given signal atoms + manifest atoms (shape-compatible with stored `derived:granola-signals` / `derived:granola-signals-index` events), return only the signal atoms belonging to each note's current manifest run, applying `supersedes` chains. Superseded-run signals and orphan/duplicate signals from a failed manifest append (the retry-duplication case pinned in `tests/enrich/granola-signals.test.ts:274`) are excluded exactly as the existing in-tool filter excludes them. Pure function, storage-agnostic, packed-safe (ships in `dist/enrich/**`; must not import any pack-excluded surface — import-closure test stays green).
- **AC2 — search-memories consumes the resolver:** the one-off current-run filter in `src/mcp/tools/search-memories.ts` is replaced by a call to the shared resolver. Observable behavior is UNCHANGED — regression tests prove parity, including superseded-run exclusion and the manifest-append-failure duplicate case.
- **AC3 — skip/settle observability (infra):** pairing-gate and settle-gate skips emit structured log lines (`note_id` + machine-readable reason) and the worker's per-tick result surfaces skip counts by reason. The unparsable-`updated_at`-counts-as-settled behavior is PINNED by an explicit test plus a warn log — behavior unchanged, made visible and deliberate. No new persisted state; counters are per-tick in-memory only.
- **AC4 — wire-contract conformance test (shape):** a dedicated test (in `tests/enrich/granola-signals.test.ts` or a sibling file) that pins, field-by-field, (a) the signal-atom contract: `canonical_subject`, `signal_type` ∈ {`decision`,`rationale`,`action`}, `text`, `note_id`, `meeting_title`, `source_span`, `extractor_version`, `extraction_run_id`, `dedupe_key`, `parent_dedupe_key`; (b) the manifest-atom contract: `extraction_run_id`, `supersedes`, `note_id`; (c) the quote-enforcement asymmetry: transcript-span quotes are verbatim-enforced (mutation fails extraction), summary-span quotes are not guaranteed. Any future change to these is then a deliberate, reviewed contract change, not an accident.

## Out of Scope (Don't Drift)

- **No capture/poller changes** — the append-once skip of updated Granola notes is station-1 work under its own future decision (104 supersede-chain lineage).
- **No `getSignalWindow` changes** — current-run opt-in mode and event-time SQL pushdown are 113-reader followups, triggered by a consumer rewiring.
- **No `decision-drift.ts` changes** — the drift sweep adopting the resolver is a station-6 followup, not this item.
- **No intake/responder (station 3) changes** — this item defines what they will consume; it does not rewire them.
- **No new extractors, no prompt changes, no change to extraction output** for the normal single-extraction path.
- **No new persisted forms, no storage schema or whitelist changes, no MCP tool schema changes.**

## Tests

- **AC1 — `tests/enrich/signal-manifests.test.ts` (NEW):** fixture sets covering: single current run passes through; superseded run excluded after a re-extraction manifest; supersedes chain of length ≥2 resolves to the newest run only; orphan signals from a manifest-append-failure retry (duplicate `extraction_run_id`-less or unreferenced signals) excluded; multi-note independence (note A's supersede does not affect note B); empty-manifest edge (signals with no manifest at all — pin whatever the existing search-memories filter does today, do not invent new behavior).
- **AC2 — `tests/mcp/tools/search-memories.test.ts`:** existing current-run cases keep passing untouched; add one parity case constructed to exercise the resolver through the tool path (superseded + current run for one note; only current returned).
- **AC3 — `tests/enrich/granola-signals.test.ts`:** a note missing its transcript is skipped AND the worker result reports `skipped.missing_transcript ≥ 1`; a note with unparsable `updated_at` extracts (pinned settled behavior) AND a warn log/counter records it.
- **AC4 — conformance test as described; load-bearing assertion style: hardcoded expected field lists (like 112's byte-stable dedupe fixture), not recomputation from the source module.**

## After Completion (Strategist Notes)

- The lock-in decision record's F1/F7 disposition ("consumers MUST resolve current runs") becomes actionable: file per-station followups for drift-sweep and intake to adopt `resolveCurrentSignalRuns` when each is next touched.
- Wiki promotion (owed): the signal-window architecture page should reference the resolver as the currentness half of the station-2 contract.
