---
id: 2026-06-21-106-granola-meeting-signal-extraction
title: "Granola meeting signal extraction — derive decision/rationale/action signal atoms from raw meeting atoms"
status: proposed
priority: MEDIUM
estimate: 2-3d (engineering)
created: 2026-06-21
blocked_by: []
task_state_ref: 2026-06-21-106-granola-meeting-signal-extraction
requested_reviewers: ["codex", "codex-ops"]
spec_refs:
  - src/capture/surfaces/granola-poller.ts        # raw summary/transcript atom producer (104) this builds on
  - backlog/complete/2026-06-18-104-granola-meeting-capture.md   # predecessor; append-only ingest-once contract
  - wiki/architecture/storage.md                  # append-only, random-id, no upsert (the binding constraint)
  - wiki/architecture/capture-gate.md             # source allowlist / gate model
  - wiki/surfaces/mcp-server.md                   # search_memories / find_clusters surfacing this targets
files_to_modify:
  # PROVISIONAL — finalized at ready-promotion. Builder must confirm against the substrate before claiming.
  - src/capture/sources.ts                        # allowlist the derived:granola-signals source namespace
  - src/enrich/granola-signals.ts                 # NEW — async enrichment worker (extraction pass)
  - src/enrich/dispatch.ts                         # NEW or existing — register the enrichment worker
  - src/daemon/index.ts                            # lifecycle: schedule the debounced enrichment worker
  - src/mcp/util/source-app.ts                     # source_app vocabulary (if signals are query-filterable by app)
  - src/mcp/tools/search-memories.ts               # metadata_match support for signal_type / canonical_subject
  - tests/enrich/granola-signals.test.ts           # NEW — extraction + append-only run/manifest tests
  - tests/mcp/tools/search-memories.test.ts        # signal-filter retrieval tests
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
---

> **Origin: 2026-06-21 brainstorm (founder + Claude strategist + Codex peer-consult).** Follows 104
> (raw Granola capture, shipped). Codex consulted read-only as an independent architect on meeting-atom
> structure; its full take + this synthesis are below. Two founder decisions fixed the scope:
> **(1) target = signal-queryable retrieval (derive-only from what was actually said), NOT a
> prompt-for-why capture step;** **(2) first cut = three signal types only: decision, rationale, action.**
>
> **Parked, not ready.** V1.5 is in the codebase-cleanup pause ([[project_v15_cleanup_pause]]); this is a
> specced-but-deferred decision. Promote `proposed/ → ready/` only when the pause lifts and the demand for
> signal-level meeting retrieval is real (the cheapest trigger: founder repeatedly wanting "what did we
> decide about X and why" without re-reading whole meetings).

## Why

104 captures each Granola meeting as **two coarse, append-only atoms** (a `summary` blob + a flat
`transcript` blob). That makes a meeting all-or-nothing: reading 7 summaries last session meant paging 14
atoms including giant transcripts, and there is **no signal-level granularity** — no way to pull "just the
decisions", "just the action items", or the **why behind a priority**.

This is the same gap [[project_ceo_loop_rationale_capture]] named: ECHO captures *what/how* but rarely the
*why*. Meeting prose is exactly where decisions + their rationale get discussed, but buried. Signal-level
atoms make "what did we decide about X and why" a cheap, 2–3-atom retrieval instead of a transcript dump —
and the **summary-only-retrieval lane** the founder asked for at the end of the 104 session falls out for
free.

**Honest boundary (founder-chosen).** This item derives signals from *what was literally said in the
meeting*. Where the real rationale was never spoken aloud (it was in the founder's/CEO's head), extraction
will under-deliver — and the `confidence` guardrail (AC2) is what lets us *measure* that gap. Closing it
with a prompt-for-why capture step is **explicitly deferred** (Out of Scope) to a possible phase-2,
triggered by observed low-confidence rationale, not assumed now.

## Acceptance criteria

1. **AC1 — Derived signal atoms, append-only, separate namespace.** A meeting's raw `summary`/`transcript`
   atoms (104) are **never mutated**. Extraction appends **derived signal atoms** under a distinct source
   namespace (proposed: `derived:granola-signals`) so they never pollute raw `api:granola` retrieval and can
   be re-derived freely. **One atom per signal**, `content` = the signal text itself (the decision sentence /
   the rationale / the action). Three signal types only: **`decision`, `rationale`, `action`**.
2. **AC2 — Signal metadata makes cheap surfacing possible.** Each signal atom carries:
   `signal_type` (`decision|rationale|action`), `note_id`, `meeting_title`, `canonical_subject` (a short
   normalized topic string), `parent_dedupe_key` (the raw atom it derives from: `granola:{note_id}:summary`
   or `:transcript`), `source_span` (transcript time-range, or `summary`), `confidence` (0–1, **mandatory** —
   the false-precision guardrail), `extractor_version`, `extraction_run_id`,
   `dedupe_key = granola:signal:{note_id}:{extractor_version}:{signal_type}:{stable_hash(content)}`.
   Type-specific: `owner` (actions), `rationale_for` → stable id/dedupe_key of the decision a rationale
   explains, `decision_status` (`proposed|decided|unresolved`, decisions). Low-confidence rationale is
   **flagged, never asserted as fact**.
3. **AC3 — Append-only re-derivation via per-run manifest.** Each extraction run appends one **manifest
   atom** (proposed: `derived:granola-signals-index`) listing the run's `signal_atom_ids`, `note_id`,
   `extractor_version`, `extraction_run_id`, and `supersedes` (prior run id for that note/version family).
   "Which signals are current" is resolved **at query time** by selecting the newest non-superseded run per
   meeting — re-derivation appends a new run, **nothing is mutated or deleted**. No duplicate-explosion: a
   reader filtering to the latest run gets exactly one set.
4. **AC4 — Async enrichment worker, debounced on settle.** Extraction runs as a **separate async pass**, NOT
   in the Granola poller (keep polling boring) and NOT lazy-at-query. A worker scheduled by the daemon picks
   up meetings whose raw atoms are present and whose Granola `updated_at` has been **quiet for N minutes**
   (Granola regenerates summaries post-meeting; debounce prevents re-derivation on every poll). Re-extracts
   on (a) a settled-note update, or (b) an `extractor_version` bump. The worker has its own retry + cost
   budget; failures are operator-visible (logged ECHO error surface), never silent. One extraction in flight
   per meeting at a time.
5. **AC5 — Signal-level retrieval.** `search_memories` supports filtering derived signals by metadata so
   `metadata_match:{signal_type:'decision', canonical_subject:'X'}` (or equivalent) returns the matching
   signal atoms **without** hydrating transcripts. "What did we decide about X and why" = filter to
   `signal_type ∈ {decision, rationale}` + subject match, hydrate 2–3 tiny signal atoms + (optionally) the
   parent summary; transcript hydration is **opt-in, never default**. The summary-only lane
   (`granola_atom_type:'summary'`) is verified queryable as part of this.
6. **AC6 — Extraction is itself an ECHO dogfood.** The extraction LLM call (one structured call per settled
   meeting → JSON list of signals) is logged like any other model use; the run is journaled per the
   dogfooding discipline if it touches ECHO MCP. Provider = latest Claude model per global guidance.

## Architecture

- **Two-layer, append-only, shallow hierarchy** (raw → derived). No section atoms (presentation structure,
  not retrieval value). The retrievable unit is the **signal**.
- **Raw layer (unchanged, from 104):** `summary` + `transcript` atoms, source `api:granola`.
- **Derived layer (new):** signal atoms + one manifest atom per run, source `derived:granola-signals*`.
- **Extraction:** async daemon worker → one structured LLM call per settled meeting → validated JSON
  (`[{signal_type, text, canonical_subject, source_span, owner?, rationale_for?, decision_status?,
  confidence}]`) → append signal atoms + manifest atom. Idempotent per `(note_id, extractor_version)`:
  re-running produces a new `extraction_run_id` that `supersedes` the prior; the dedupe_key includes a
  content hash so identical re-derivations are detectable.
- **Latest-wins resolution** is a small query-time helper over manifest atoms, NOT a stored mutable flag
  (append-only forbids `is_latest` mutation).
- **Gate:** `derived:` is a new gate kind / allowlist category (mirror the `api:` pattern 104 added to
  `src/capture/sources.ts`). Builder confirms the gate fn shape before claiming.

## Tests

All against a **mocked** extractor (recorded fixtures) — never a live LLM call or live Granola key.

- **Extraction shape:** a fixture meeting → expected decision/rationale/action atoms with correct
  `parent_dedupe_key`, `source_span`, `confidence`, and `rationale_for` linkage.
- **Append-only re-derivation:** re-run with a bumped `extractor_version` → new run + manifest that
  `supersedes` the prior; old signal atoms **still present** (not mutated/deleted); latest-wins helper
  returns only the new run.
- **Debounce/settle:** a note updated within the window is **not** extracted; once quiet ≥ N min it is.
- **Retrieval:** `search_memories` signal-type + canonical_subject filter returns signals without
  transcript hydration; summary-only lane returns summaries only.
- **Guardrail:** low-confidence rationale is flagged in output, not surfaced as asserted fact.

## Out of Scope (Don't Drift)

- **Prompt-for-why / human-in-loop rationale capture** — deferred to a possible phase-2, gated on observed
  low-confidence rationale (do NOT build the capture step here).
- **Additional signal types** — risk, dissent, tradeoff, commitment, open-question, metric, follow-up. Earn
  them after the 3-type core proves out. (Codex argued for ~9; founder cut to 3.)
- **Cross-meeting thread stitching / topic timelines.**
- **Non-Granola meeting sources** (Zoom, Slack-huddle, etc.).
- **Any mutation of raw `api:granola` atoms** — the substrate is append-only, random-id, no upsert
  ([[project_append_only_ingest_no_inplace_modify]]). Signals are additive only.
- **At-capture extraction inside the poller** — rejected; keep ingest boring and decoupled from the LLM.

## After Completion (Strategist Notes)

- Wiki: add `capture/` (or `architecture/`) page documenting the **derived-signal layer** (the two-layer
  raw→derived model, manifest/run supersede semantics, the confidence guardrail). Update
  `capture/per-app/granola-collected-data` with the derived signal fields.
- If extraction confidence on `rationale` is persistently low across real meetings, that is the empirical
  trigger to spec the deferred **prompt-for-why** phase-2 — record the observation, don't pre-build it.
- Revisit whether the `derived:` namespace generalizes beyond Granola (e.g. derived signals over
  Slack/Cursor/Claude atoms) — likely a V2 substrate question, not this item.

## Codex peer-consult (2026-06-21, read-only, verbatim recommendation)

Codex's strongest-shape recommendation (independent architect lens): *"Keep raw Granola summary/transcript
atoms append-only, then add async-derived signal atoms plus one extraction manifest/index atom per
extraction run. Make decisions, rationales, tradeoffs, actions, questions, risks, commitments, and dissent
first-class retrievable atoms with parent links and source spans. Treat derived signals as versioned
interpretations, not replacements for raw meeting truth."* Codex's sharpest risk: **false precision** —
LLM-derived rationale that sounds cleaner than the messy reality; mitigated here by mandatory `confidence`
+ `source_span` (AC2). Strategist deltas from Codex: (1) cut 9 signal types → 3 (YAGNI for dogfood);
(2) flagged that the *why is often not in the transcript at all* — so derive-only is a deliberate,
measured floor, not the end state.
