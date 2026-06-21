---
id: 2026-06-18-104-granola-meeting-capture
title: "Granola meeting-note capture — ingest CEO's meeting notes via Granola API into ECHO"
status: proposed
priority: HIGH
estimate: 1-2d (engineering)
created: 2026-06-19
blocked_by: []
task_state_ref: 2026-06-18-104-granola-meeting-capture
requested_reviewers: ["codex", "codex-ops"]
ready_content_sha: 0a0f2f59b8a5a15a9b5db9fc6e9febed066d3fa27bfd7a1519d58b2e3bd999f6
files_to_modify:
  - src/capture/sources.ts
  - src/capture/surfaces/granola-poller.ts
  - src/daemon/index.ts
  - src/normalize/adapters/granola.ts
  - src/normalize/dispatch.ts
  - src/mcp/util/source-app.ts
  - tests/normalize/adapters/granola.test.ts
  - tests/capture/granola-poller.test.ts
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

> **Demand gate lifted (2026-06-21).** 103+105 validated: the eng→CEO Slack bot synthesizes WHY-level
> answers well. Founder decision to proceed with the meetings→founder leg to complete the bidirectional
> n=2 loop.
>
> **Pivoted to Granola API (2026-06-21) — away from Slack channel capture.** Investigation confirmed
> Granola has a public API (`public-api.granola.ai/v1/`) returning full summary markdown + speaker-
> attributed transcript. Polling the API directly is simpler than Slack capture and gets richer content.
> CEO is on a Business trial with an API key available now. Slack capture deferred to a separate future
> item if needed.
>
> **Amended (2026-06-21, post-build-escalation, founder-directed).** The first codex build attempt
> blocked: AC1/AC3 (as converged through review r1–r4) required deterministic atom IDs + edited-note
> **upsert-in-place**, but ECHO storage is append-only with random IDs (`Storage.append` → `randomUUID()`;
> no upsert) — satisfying it would have meant changing `src/storage/*`, outside `files_to_modify`. Founder
> call: **keep it simple — append-only, ingest-once, no in-place modification.** AC1/AC3/Atom-shape/Tests
> descoped accordingly; a `dedupe_key` is stamped in metadata for a *future* chain/hash supersede. (Note:
> the upsert requirement was review-added hardening, not a founder need — a reminder that spec-review
> convergence ≠ buildability against the substrate.)

## Why

The CEO→founder leg of the n=2 context loop. The CEO takes meetings via Granola. Polling the Granola
API directly ingests full meeting notes (structured summary + transcript) into ECHO so both streams
(eng decisions + meeting context) are queryable through the same Slack bot (103+105).

- **Full content via API.** `GET /v1/notes/{id}?include=transcript` returns `summary_markdown` (the
  structured notes) + `transcript` (speaker-attributed, timestamped utterances). Richer than anything
  the Slack unfurl or CEO's distilled comment provides.
- **Simpler than Slack capture.** One API poller, no Slack token, no channel scoping, no unfurl parsing.
- **Near-zero CEO action.** CEO generates one API key (already done). No behavior change — meetings are
  captured automatically.
- **Enables bidirectional querying.** CEO asks "what did eng decide about X" (103), founder asks "what
  did the client say about Y" (104) — both through the same Slack bot.

## Acceptance criteria

1. **AC1 — Granola notes ingested + queryable.** Each Granola note lands as a fixed pair of **append-only**
   ECHO atoms — **one summary atom** (`summary_markdown`) **and one transcript atom** (the full
   speaker-attributed transcript) per note — queryable via `search_memories`/`find_clusters`. Atoms use
   normal storage-assigned IDs (append-only — **no in-place modification in V1**). Each note is ingested
   **once** (keyed by `note_id`); a `dedupe_key` (`granola:{note_id}:summary` / `:transcript`) is stamped
   in metadata so a *future* chain/hash supersede can replace versions — but V1 does **not** upsert or
   modify atoms in place.
2. **AC2 — Capture pipeline integration.** Granola flows through the existing pipeline as an
   **`api:granola`** surface (the `apis` category — empty today in `src/capture/sources.ts`; first
   member), including `search_memories(source_app='granola')` support (`src/mcp/util/source-app.ts`
   enum extension).
3. **AC3 — Incremental polling + crash-safe checkpoint.** Poller uses the `updated_after` param to fetch
   only notes changed since the last sync.
   - **Checkpoint:** persisted at `path.join(os.homedir(), '.echo/state/granola-checkpoint.json')`
     (resolve via the home-dir/state-dir helper — a literal `~` does **not** expand in programmatic FS
     calls); stored fields `{ high_water_mark (max note `updated_at` seen, ISO 8601),
     ingested_note_ids (the set used for ingest-once skip), last_synced_at, schema_version }`. Written
     **atomically** (temp file + `rename`) so a crash mid-write cannot corrupt it.
   - **Advance-after-durable-write:** `high_water_mark` advances **only after** every note in the batch —
     detail fetch + all derived atoms — has been durably written. A crash mid-batch re-fetches that batch
     on restart rather than skipping it.
   - **Ingest-once (append-only):** the checkpoint records ingested `note_id`s; on each poll a note whose
     `note_id` is already ingested is **skipped** (no second append). This covers both edited notes
     (re-fetched via `updated_after` but **not re-ingested** in V1 — no in-place modification) and crash
     recovery (a batch re-fetched after a mid-batch crash skips the notes already written). `updated_at` is
     checkpoint/order metadata only. Result: no duplicate atoms, no upsert, **no storage-contract change**.
   - **Operational contract:** at most **one** Granola poll in flight at a time (no overlapping ticks);
     bounded poll interval + per-request timeout; durable, operator-visible error evidence (a logged ECHO
     error surface) for auth failure, repeated HTTP 429, cursor/pagination failure, and checkpoint write
     failure — failures must be detectable, not silent.
4. **AC4 — Config + startup validation.** Granola API key resolved by a fixed **precedence**: (1) the
   `GRANOLA_API_KEY` environment variable if set, else (2) a home-dir-resolved config file
   `path.join(os.homedir(), '.echo/state/granola.json')` (`{ "api_key": "grn_..." }`; resolve via the
   state-dir helper — a literal `~` does **not** expand in programmatic FS calls). **Note:** the daemon
   runs under launchd, which does **not** inherit the interactive shell environment, and cwd-relative
   `.env` loading silently misses the key — so the daemon MUST read from the resolved state path; `.env` /
   `GRANOLA_API_KEY` is
   the dev/interactive path only. On startup the poller **validates** the key is present and well-formed;
   if missing or invalid it **disables itself with a visible log/error** (the rest of the daemon keeps
   running) rather than crashing or silently no-op'ing. No hardcoded credentials. (`.env` + `.env.example`
   placeholder already scaffolded for the dev path.)

## Architecture

> **Endpoint shapes validated against the live API on 2026-06-21** (founder's key, Business trial).
> Confirmed fields marked ✓; doc-only/unverified claims flagged ⚠️ for the builder to close.

- **API:** `https://public-api.granola.ai/v1/`. Auth: `Bearer grn_...` ✓ (HTTP 200). No webhooks →
  polling only. ⚠️ Rate limits (docs say 25 burst / 5 req/sec) are **not surfaced in response headers** —
  treat as best-effort; confirm actual throttling under load and back off on HTTP 429.
- **List:** `GET /v1/notes` → `{ notes: [...], hasMore: bool, cursor: string|null }` ✓. Paginate by
  passing `cursor`; stop when `hasMore=false`. Per-note list objects are lean —
  `{ id, object, title, owner, created_at, updated_at }` ✓ — they carry **no** content/transcript, so a
  per-note detail fetch is required. ⚠️ **Page-size control unconfirmed:** `?limit=2` returned 7 rows in
  testing (param appears ignored) — the builder must confirm the real page-size param or rely on
  `cursor`/`hasMore` alone. `?updated_after=<ISO8601>` is accepted (HTTP 200) → drives AC3 incremental
  polling.
- **Detail:** `GET /v1/notes/{id}?include=transcript` ✓ returns:
  - `summary_markdown` (string) ✓ and `summary_text` (plain-text twin) ✓
  - `transcript`: array of `{ text, start_time, end_time, speaker }` ✓ — speaker-attributed + timestamped
  - `attendees`: array of `{ name, email }` ✓; `calendar_event` ✓; `folder_membership` ✓; `web_url` ✓;
    `created_at` / `updated_at` (ISO 8601) ✓
- **Atom shape (append-only, fixed):** `source: "api:granola"`. **Exactly two atoms per note, ingested once:**
  - a **summary atom** — `summary_markdown` (+ `summary_text` in metadata);
  - a **transcript atom** — the full speaker-attributed transcript text.
  Atoms use normal storage-assigned IDs (append-only — **no in-place upsert/modify in V1**). A `dedupe_key`
  (`granola:{note_id}:summary` / `granola:{note_id}:transcript`) is stamped in **metadata** so a future
  chain/hash supersede can find + replace versions; the poller's ingest-once skip (AC3) is what prevents
  duplicates today. Shared metadata: `note_id` (=`id`), `dedupe_key`, `title`, `attendees`,
  `created_at`/`updated_at`, `calendar_event`, `folder_membership`, `web_url`. **No `duration` field
  exists** — derive from `calendar_event` start/end or transcript `start_time`/`end_time` if needed, else
  omit. No `repo_root`.
- **Gate:** same `api:` gate kind + `apis` allowlist category (`wiki/architecture/capture-gate.md`,
  `capture-allowlist.md`); `CAPTURED_SOURCES.apis` is `[]` today (`src/capture/sources.ts:18`) — Granola
  is its first member. The `api:` gate fn (`isAllowedApi` / `_isAllowedApiIn`) already exists.
- **files_to_modify** (binding list in frontmatter). Roles: `src/capture/sources.ts` (+`'granola'` to
  `apis`), `src/capture/surfaces/granola-poller.ts` (new poller), `src/daemon/index.ts` (lifecycle +
  single-in-flight + startup key validation), `src/normalize/adapters/granola.ts` (new) +
  `src/normalize/dispatch.ts` (register adapter), `src/mcp/util/source-app.ts` (enum),
  `tests/normalize/adapters/granola.test.ts` + `tests/capture/granola-poller.test.ts` (new).

## Tests

All tests run against a **mocked** Granola API (recorded fixtures) — never the live endpoint or a real key.

- **Pagination:** list across multiple pages via `cursor`/`hasMore`; asserts no note dropped or
  double-counted at page boundaries.
- **`updated_after`:** only notes changed since the checkpoint are fetched; unchanged notes are skipped.
- **Detail + transcript:** parses `summary_markdown` + `transcript[{text,start_time,end_time,speaker}]`;
  asserts the fixed two-atom shape + dedupe keys.
- **Source-app filtering:** `search_memories(source_app='granola')` returns Granola atoms and excludes
  others; the `api:granola` gate admits Granola and rejects a non-allowlisted api name.
- **Crash-safe checkpoint:** simulate a crash mid-batch (after detail fetch, before atom write) → on
  restart the batch is re-fetched, notes already ingested (by `note_id`) are skipped while the unfinished
  notes are written, `high_water_mark` did not advance past the unfinished batch, and no duplicate atoms
  result.
- **Ingest-once / edited-note skip (no duplicates):** re-polling a note already ingested (including one
  whose `updated_at` changed) does **not** append new atoms — it is skipped by `note_id`. Proves V1 is
  append-only with no in-place modification and no duplicates.
- **429 / backoff:** a 429 triggers backoff/retry and surfaces a durable operator-visible error on
  repeated failure; no silent drop.
- **Single poll in flight:** while a poll is blocked/in-progress, a second scheduler tick fires → the
  second invocation exits/skips without a second list/detail traversal or checkpoint write (no overlap).
- **Hung-request timeout:** a request that hangs past the bounded per-request timeout is aborted, surfaces
  durable operator-visible error evidence, and leaves the checkpoint unchanged.
- **Path resolution + daemon startup with no shell environment:** config/checkpoint paths resolve via
  `os.homedir()` (no literal `~` reaches the filesystem). With `GRANOLA_API_KEY` unset and no inherited
  shell env, the daemon loads the key from `path.join(os.homedir(), '.echo/state/granola.json')`; with the
  key absent entirely, the poller disables itself with a visible error and the rest of the daemon still
  starts.

## Out of Scope (Don't Drift)

- **The eng→CEO read-view + rationale capture** — item 103.
- **Slack channel capture** — deferred to a separate item. 104 is Granola API only.
- **Structured [decision, reason, alternatives] reasoning layer** — separate follow-up item.
- **Transcript analysis / speaker diarization beyond raw ingestion** — future.
- **Federation / consent matrix / multi-party** — not needed; founder's own API key, founder's own ECHO.
- **In-place modification / replace / upsert of ingested atoms** — V1 is append-only, ingest-once. A
  chain/hash supersede mechanism (and any storage-interface upsert / deterministic-atom-id change) is a
  deferred future design. **Do NOT modify `src/storage/*` or `src/capture/pipeline.ts` for this item** —
  if you find yourself needing to, STOP and escalate (this is the exact constraint that blocked the first
  build attempt; see `raw/internal/agent-runs/2026-06-21-2026-06-18-104-granola-meeting-capture.md`).

## spec_refs

- `backlog/complete/2026-06-18-103-ceo-context-loop-n2.md` (the eng→CEO sibling this completes)
- `backlog/complete/2026-06-19-105-ceo-loop-reasoning-brain.md` (the reasoning brain the bot uses)
- `raw/internal/decisions/2026-06-18-office-hours-ceo-loop-rationale-capture.md` (design context)
- `wiki/architecture/capture-pipeline.md`, `capture-gate.md`, `capture-allowlist.md`, `storage.md`
- `src/capture/sources.ts`, `src/mcp/util/source-app.ts`, `src/daemon/index.ts` (integration points)
- Granola API docs: `https://public-api.granola.ai/v1/` (Business plan required)

## After Completion (Strategist Notes)

- Wiki: new `capture/` page for the Granola api-surface + `capture/per-app/granola-collected-data` ref.
- Completes the bidirectional n=2 loop. Next: structured [decision, reason, alternatives] reasoning
  layer as a separate item (on-demand, not pre-computed — per 2026-06-21 design conversation).
- Slack capture (channel messages, CEO's distilled comments) is a separate future item if needed.
