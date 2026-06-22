---
id: 2026-06-21-106-granola-meeting-signal-extraction
title: "Granola meeting signal extraction — derive decision/rationale/action signal atoms from raw meeting atoms"
status: proposed
priority: MED
estimate: 2-3d (engineering)
created: 2026-06-21
blocked_by: []
task_state_ref: 2026-06-21-106-granola-meeting-signal-extraction
requested_reviewers: ["codex", "codex-ops"]
ready_content_sha: 84c087cc8f7a6c7309e5d5cec1307525ce8fcab602704515c5dbf5913161fba9
spec_refs:
  - src/capture/surfaces/granola-poller.ts        # raw summary/transcript atom producer (104) this builds on
  - backlog/complete/2026-06-18-104-granola-meeting-capture.md   # predecessor; append-only ingest-once contract
  - backlog/complete/2026-06-19-105-ceo-loop-reasoning-brain.md   # AC6 reuses its provider/model + credential resolution
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
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-06-22T07:09:51Z"
branch: "agent/granola-meeting-signal-extraction"
head_sha: "e0e5fd0be34d7862115bfc900e7ae91d8ca39663"
pr_url: ""
agent_notes: |
  BLOCKED: The implementation branch is pushed and focused verification passes, but full-suite completion needs `tests/packaging/packed-manifest.test.ts` updated for the new `dist/enrich/*` files and AC2's structured-transcript-span wording is stronger than the current raw Granola capture substrate. Tried: implemented the allowed files only, ran typecheck/lint/focused tests successfully, ran full `npm test`, and inspected 104's poller output. Best guess: authorize the packaging snapshot update and either accept rendered-transcript timestamp parsing for this item or create a follow-up to persist structured transcript item metadata in `src/capture/surfaces/granola-poller.ts`; confidence high. Why escalated: both fixes require modifying files outside `files_to_modify`, which is a builder stopping condition.
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
   normalized topic string — normalization = lowercase, trim, collapse internal whitespace), `parent_dedupe_key`
   (the raw atom it derives from: `granola:{note_id}:summary` or `:transcript`), `source_span` (shape below),
   `confidence` (0–1, **mandatory** — the false-precision guardrail), `extractor_version`, `extraction_run_id`,
   `dedupe_key = granola:signal:{note_id}:{extractor_version}:{signal_type}:{stable_hash(content)}`.
   - **`source_span` shape (resolves the flat-transcript gap, r1 codex F1).** An object, exactly one of:
     `{kind:"summary"}` (derived from the summary atom); or
     `{kind:"transcript", start_time, end_time, quote}` where `start_time`/`end_time` are the Granola
     **structured** transcript-item timestamps (the extractor reads `transcript[]` items, which carry
     `start_time`/`end_time` — NOT the flat rendered string), and `quote` is the verbatim utterance text(s).
     The flat transcript blob (104) is the human render; spans always reference the structured items.
   - Type-specific: `owner` (actions), `rationale_for` → `dedupe_key` of the decision a rationale explains,
     `decision_status` (`proposed|decided|unresolved`, decisions). A signal with
     `confidence < GRANOLA_SIGNAL_LOW_CONF` (default 0.5) is stamped `low_confidence: true` and is
     **flagged, never asserted as fact** on surfacing.
3. **AC3 — Append-only re-derivation, exactly one current run per note (r1 codex F2).** Each extraction run
   appends one **manifest atom** (`derived:granola-signals-index`) listing the run's `signal_atom_ids`,
   `note_id`, `extractor_version`, `extraction_run_id`, `completed_at`, and `supersedes` (the
   `extraction_run_id` of the prior current run for the **same `note_id`**, or `null` for the first run).
   - **Run family = `note_id`** (not `(note_id, extractor_version)`). `extractor_version` is stamped for
     provenance only; a version bump just produces a new run that supersedes the prior current run for that
     note. There is always **exactly one current run per note**, regardless of version.
   - **Latest-wins (deterministic, no ambiguity).** Current run for a note = the manifest with that `note_id`
     whose `extraction_run_id` appears in no other manifest's `supersedes`. If >1 qualifies (e.g. a crash left
     two un-superseded manifests), tie-break by `completed_at` DESC, then `extraction_run_id` DESC (lexical).
     Retrieval (AC5) returns only the current run's signals — never both v1 and v2, never an arbitrary choice.
   - Re-derivation appends; **nothing is mutated or deleted**. Superseded signal atoms remain immutable history.
   - **Manifests are written on success only.** A failed extraction writes **no** manifest (AC4), so it can never
     become a current run — latest-wins reads successful runs only, and a transient failure can never hide the
     last successful signals.
4. **AC4 — Async enrichment worker, debounced + single-in-flight (r2 structural cut, replacing the r1 lease).**
   Extraction runs as a **separate async pass**, NOT in the Granola poller and NOT lazy-at-query. A
   daemon-scheduled worker (interval `GRANOLA_SIGNAL_WORKER_INTERVAL_MS`, default 300_000) picks up meetings whose
   raw atoms are present and whose Granola `updated_at` has been quiet for `GRANOLA_SIGNAL_SETTLE_MS` (default
   600_000 = 10 min). Re-extracts on (a) a settled-note update, or (b) an `extractor_version` bump.
   - **Mutual exclusion = single-in-flight scheduling (NOT a lockfile).** Like 104's poller ("at most one Granola
     poll in flight at a time; no overlapping ticks"), the worker is guarded by the daemon scheduler's in-process
     in-flight flag: a tick that fires while an extraction is still running is a no-op skip. ECHO runs **one**
     launchd daemon (single process — the same process 104's poller relies on); there is no supported
     multi-process or manual concurrent-worker path, so an in-process guard is sufficient and a durable
     cross-process lease is unnecessary. *(r2: the r1 temp-file+rename "lease" gave durability, not acquisition
     atomicity — two ticks could both read no-claim and both extract. Removed entirely rather than hardened into
     a flock/heartbeat protocol.)*
   - **Idempotent on crash.** Manifest is the last write; latest-wins ignores partial un-finalized state. A crash
     after some signal atoms but before the manifest leaves NO current run; the next tick re-runs the note, and
     the orphan atoms are never selected (no manifest references them). No duplicate current run.
   - **No-spin = atomic worker checkpoint (104 pattern), not a failed manifest.** The worker keeps an atomic
     checkpoint at `~/.echo/state/granola-signals-checkpoint.json` (temp-file + rename) recording, per `note_id`,
     the last-attempted input fingerprint (the raw note `updated_at`) + `extractor_version` + (on failure)
     `last_failure_reason`/`last_failure_at`. A note is re-attempted **only** when its raw `updated_at` changes or
     `extractor_version` bumps — this covers success **and** failure identically, so a persistently-failing note
     does not re-extract/respend every tick. (Failure state lives in this checkpoint, never in a manifest.)
   - **Checkpoint advancement ordering (advance-after-durable-write, 104 — r3 codex + codex-ops).** The checkpoint
     is **never** advanced at attempt start. It advances in exactly two terminal cases: (i) **on success**, the
     success fingerprint is recorded **only after** the signal atoms **and** the manifest are durably appended
     (success order: atoms → manifest → checkpoint); (ii) **on terminal failure**, the failure fingerprint is
     recorded **only after** retries are exhausted **and** the operator-visible error is emitted. Consequence:
     a crash after signal atoms but **before** the manifest leaves the checkpoint un-advanced → the next tick
     re-runs the note (consistent with *Idempotent on crash* above), and the manifest/current-run state remains
     authoritative — a checkpoint can never suppress a note that has no current run.
   - **Bounded retry + cost cap.** Within a single attempt, transient extractor errors retry up to
     `GRANOLA_SIGNAL_MAX_RETRIES` (default 2) with exponential backoff. At most `GRANOLA_SIGNAL_MAX_NOTES_PER_TICK`
     (default 5) notes extract per tick.
   - **Operator-visible.** Auth/credential failure, repeated rate-limit, and retry exhaustion each emit a logged
     ECHO error surface (104 pattern) and stamp the checkpoint's failure fields; failures are detectable, never silent.
5. **AC5 — Signal-level retrieval (r1 codex F4).** `search_memories`'s `metadata_match` gains documented
   set-membership semantics: a **scalar** value means equality (`{signal_type:"decision"}`); an **array** value
   means membership (`{signal_type:["decision","rationale"]}` = "in"). This array-membership extension is the
   **one** MCP input-schema change; scalar equality is unchanged and back-compatible. `canonical_subject` matches
   on the **exact normalized string** (AC2 normalization); free-text topic matching uses the existing literal
   `query` field (substring over `content` + `canonical_subject`). So "what did we decide about X and why" =
   `search_memories({query:"X", metadata_match:{source:"derived:granola-signals", signal_type:["decision","rationale"]}})`
   → matching signal atoms **without** transcript hydration. Hydrate 2–3 signals + (optionally) the parent
   summary via `parent_dedupe_key`; transcript hydration is **opt-in, never default**. The summary-only lane
   (`metadata_match:{granola_atom_type:"summary"}`) is verified queryable as part of this.
6. **AC6 — Extraction provider: reuse 105's resolution + credential handling (r1 codex F5 + codex-ops F2).**
   The extractor makes one structured LLM call per settled meeting (→ validated JSON list of signals). It
   **reuses the provider/model resolution + API-credential handling established by 105
   (ceo-loop-reasoning-brain)** — the builder confirms the exact module at ready-promotion rather than
   introducing a parallel mechanism; the model id resolves to the latest Claude per global guidance via that
   path (config-overridable). Credential precedence mirrors 104 AC4 (env, else `~/.echo/state/...`).
   - **Startup/config validation.** On worker start, validate the provider credential is present + well-formed;
     if missing/invalid the signal worker **disables itself with a visible log** (the rest of the daemon keeps
     running) — exactly 104 AC4's self-disable contract. No hardcoded credentials.
   - **Injectable boundary for tests.** The extractor takes an injected `extractFn`/client interface (the
     `GranolaApiClient` pattern) so all tests run against a **mock** — never a live LLM call or real key.
   - **Failure handling** (provider down / rate-limit / schema-validation failure) follows AC4's bounded-retry
     + no-manifest-on-failure + checkpoint-suppression + operator-visible-error path.
   - The run is logged like any other model use, and journaled per the dogfooding discipline if it touches ECHO MCP.

## Architecture

- **Two-layer, append-only, shallow hierarchy** (raw → derived). No section atoms (presentation structure,
  not retrieval value). The retrievable unit is the **signal**.
- **Raw layer (unchanged, from 104):** `summary` + `transcript` atoms, source `api:granola`.
- **Derived layer (new):** signal atoms + one manifest atom per run, source `derived:granola-signals*`.
- **Extraction:** async daemon worker (single-in-flight via the scheduler, 104 pattern — no lockfile) → one
  structured LLM call per settled meeting → validated JSON (`[{signal_type, text, canonical_subject,
  source_span, owner?, rationale_for?, decision_status?, confidence}]`) → append signal atoms + a manifest atom
  **on success only**. Run family = `note_id` (AC3): re-running produces a new `extraction_run_id` that
  `supersedes` the prior current run for that note (any version); the dedupe_key includes a content hash so
  identical re-derivations are detectable. No-spin/failure state lives in an atomic worker checkpoint
  (`~/.echo/state/granola-signals-checkpoint.json`, 104 pattern), never in a manifest.
- **Latest-wins resolution** is a small query-time helper over manifest atoms, NOT a stored mutable flag
  (append-only forbids `is_latest` mutation).
- **Gate:** `derived:` is a new gate kind / allowlist category (mirror the `api:` pattern 104 added to
  `src/capture/sources.ts`). Builder confirms the gate fn shape before claiming.

## Tests

All against a **mocked** extractor (recorded fixtures) — never a live LLM call or live Granola key.

- **Extraction shape:** a fixture meeting → expected decision/rationale/action atoms with correct
  `parent_dedupe_key`, `source_span`, `confidence`, and `rationale_for` linkage.
- **Append-only re-derivation + latest-wins:** re-run with a bumped `extractor_version` → new run + manifest
  that `supersedes` the prior current run for that `note_id`; old signal atoms **still present** (not
  mutated/deleted); latest-wins helper returns only the current run (never both v1 and v2). Tie-break test:
  two un-superseded manifests → `completed_at` DESC then `extraction_run_id` DESC resolves deterministically.
- **Debounce/settle:** a note updated within `GRANOLA_SIGNAL_SETTLE_MS` is **not** extracted; once quiet
  beyond it, it is.
- **Single-in-flight (r2 cut, replacing the lease test):** a worker tick that fires while an extraction is still
  running is a no-op skip (mutual exclusion via the daemon scheduler's in-flight guard — the 104 poller test
  shape) — no overlapping extraction, no lockfile.
- **Crash-during-extraction + checkpoint ordering (r3 codex + codex-ops):** signal atoms written but manifest
  absent (and checkpoint **not** advanced — asserts checkpoint is never written at attempt start) → latest-wins
  selects **no** current run; the next tick re-runs the note → exactly one current run; orphan partial atoms
  never selected. Explicitly assert a pre-manifest crash cannot leave a checkpoint that suppresses retry.
- **Retrieval:** `metadata_match` array value → set-membership (`signal_type ∈ {decision,rationale}`); scalar
  value → equality (back-compat); `canonical_subject` exact-normalized match; signals returned without
  transcript hydration; summary-only lane returns summaries only.
- **Failure writes no manifest + no-spin (r2 cut, replacing the failed-manifest test):** an extractor
  error/rate-limit leaves the **last successful** run current (no `status:"failed"` manifest is ever written);
  the worker checkpoint records the attempted `updated_at` **only after retries are exhausted** (r3 ordering) so
  the note is **not** re-attempted until its raw `updated_at` changes or `extractor_version` bumps (no
  spin/respend). Assert the failure fingerprint is not written mid-retry. Missing/invalid credential → worker
  self-disables with a visible log, rest of daemon runs.
- **Guardrail:** a signal with `confidence < GRANOLA_SIGNAL_LOW_CONF` is stamped `low_confidence:true` and
  flagged, not surfaced as asserted fact.

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
