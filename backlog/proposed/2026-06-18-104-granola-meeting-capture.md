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

1. **AC1 — Granola notes ingested + queryable.** Meeting notes from the Granola API land as ECHO atoms
   (summary markdown + transcript segments), queryable via `search_memories`/`find_clusters`.
2. **AC2 — Capture pipeline integration.** Granola flows through the existing pipeline as an
   **`api:granola`** surface (the `apis` category — empty today in `src/capture/sources.ts`; first
   member), including `search_memories(source_app='granola')` support (`src/mcp/util/source-app.ts`
   enum extension).
3. **AC3 — Incremental polling.** Poller uses `updated_after` param to fetch only new/updated notes
   since last sync. Checkpoint persisted across daemon restarts.
4. **AC4 — Config.** Granola API key configured via the `GRANOLA_API_KEY` env var (loaded from `.env`,
   gitignored) or a `~/.echo/state/` config file (consistent with existing capture-sources config
   pattern). No hardcoded credentials. (`.env` + `.env.example` placeholder already scaffolded.)

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
- **Atom shape:** `source: "api:granola"`; one atom per meeting note containing `summary_markdown`
  (optionally also `summary_text`); optionally split `transcript` into per-`speaker` segment atoms for
  finer-grained retrieval. Metadata: `note_id` (=`id`), `title`, `attendees`, `created_at`/`updated_at`,
  `calendar_event`, `folder_membership`, `web_url`. **No `duration` field exists** — derive from
  `calendar_event` start/end or transcript `start_time`/`end_time` if needed, else omit. No `repo_root`.
- **Gate:** same `api:` gate kind + `apis` allowlist category (`wiki/architecture/capture-gate.md`,
  `capture-allowlist.md`); `CAPTURED_SOURCES.apis` is `[]` today (`src/capture/sources.ts:18`) — Granola
  is its first member. The `api:` gate fn (`isAllowedApi` / `_isAllowedApiIn`) already exists.
- **Likely files_to_modify:** `src/capture/sources.ts` (+`'granola'` to `apis`),
  `src/capture/surfaces/granola-poller.ts` (new), `src/daemon/index.ts` (lifecycle),
  `src/normalize/adapters/granola.ts` (new) + `dispatch.ts`, `src/mcp/util/source-app.ts` (enum),
  + tests.

## Out of Scope (Don't Drift)

- **The eng→CEO read-view + rationale capture** — item 103.
- **Slack channel capture** — deferred to a separate item. 104 is Granola API only.
- **Structured [decision, reason, alternatives] reasoning layer** — separate follow-up item.
- **Transcript analysis / speaker diarization beyond raw ingestion** — future.
- **Federation / consent matrix / multi-party** — not needed; founder's own API key, founder's own ECHO.

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
