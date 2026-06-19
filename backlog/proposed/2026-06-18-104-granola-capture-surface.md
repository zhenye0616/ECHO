---
id: 2026-06-18-104-granola-capture-surface
title: "Granola capture surface — meetings→founder leg of the n=2 loop, via an API poller (GATED on a live API/access probe)"
status: proposed
priority: MEDIUM
estimate: 2-4d (engineering) — AFTER the probe clears; unbuildable before
created: 2026-06-19
blocked_by: []
task_state_ref: 2026-06-18-104-granola-capture-surface
requested_reviewers: ["codex", "codex-ops"]
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

> **⛔ GATED — DO NOT PROMOTE TO `ready/` until the live probe (AC0) passes.** This item depends on
> Granola actually exposing meeting data to a founder-owned credential. That is **unverified**. The
> whole item is unbuildable until AC0 confirms it. (Can't use `blocked_by` — the gate is a
> non-item condition; see [[project_parked_specs_inbox_convention]].)

## Why

Split from item 103 on 2026-06-19. 103 is the **eng→CEO** half of the n=2 context loop (validated,
unblocked). This item is the **meetings→founder** half: ingest the CEO's Granola meeting summaries
into the founder's ECHO so they're queryable — closing the loop bidirectionally. It is **additive**
and does **NOT** fix 103's eng-why fidelity (orthogonal). It was split out precisely so an
unverified external-API dependency cannot block the validated direction.

Sourced from a 2026-06-19 read-only Codex architecture consult (codex `gpt-5.5`, read-only sandbox,
no network). **IMPORTANT — verify-don't-trust:** Codex had **no network access**, so its specific
claims about Granola's API (endpoints, params, changelog dates, auth tiers) are **training-knowledge
or possibly confabulated, NOT fetched docs** — the very fluency-vs-fidelity failure mode this whole
sprint is about. The *architecture* recommendation is grounded in real repo reads (trustworthy); the
*Granola API shape* is a hypothesis to confirm at AC0, not fact.

## Acceptance criteria

0. **AC0 — Live probe (HARD GATE; do this first, alone, ~one command).** From the exact account the
   founder's ECHO will use, confirm: (a) Granola exposes meeting data programmatically at all
   (API / export / local store — Codex *claims* a REST API at `public-api.granola.ai/v1/notes` with
   `include=transcript`; **verify, do not assume**); (b) the **CEO's notes are reachable under
   founder-owned credentials** (the real risk is *access semantics*, not parsing — shared-folder
   visibility, plan/scope, transcript retention). **If the data is not reachable, STOP** — record the
   negative result; the meetings→founder leg is infeasible as designed and the loop stays eng→CEO-only.
   Cheapest form (verify the URL too): `curl '<granola-api-base>/v1/notes?page_size=1'` then fetch one
   note with transcript.

1. **AC1 — Granola atoms ingested + queryable (organized at ingestion).** Meeting summaries land in
   ECHO as atoms, queryable via `search_memories`/`find_clusters`, organized by meeting/date/folder.

2. **AC2 — Source/pipeline integration.** Granola flows through the existing capture pipeline as a
   first-class API surface (see Codex's pattern below), including `search_memories(source_app=...)`
   support.

3. **AC3 — Cross-machine wiring stays inside "no federation at n=2".** Founder's ECHO polls with
   **founder-owned credentials** against notes the CEO **shares to the founder's Granola account**.
   **Do NOT** build CEO-ECHO-captures-and-shares — that is federation by another name. CSV export →
   one-time founder import is an acceptable validation-only fallback.

## Codex's recommended approach (architecture trustworthy; API shape = verify at AC0)

- **Pattern: a new API-poller surface** (`source: "api:granola"`) flowing through the existing
  `processCandidate(event, storage)` pipeline. The repo already defines `api:` as a gate kind
  (`wiki/architecture/capture-gate.md`) and `apis` as an allowlist category
  (`wiki/architecture/capture-allowlist.md`), but `CAPTURED_SOURCES.apis` is **empty today**
  (`src/capture/sources.ts`) — Granola would be ECHO's first API capture surface.
- **NOT fs-watcher** (content-agnostic, doesn't poll/parse) unless a stable local store is proven.
  **NOT MCP-for-ingestion** (interactive OAuth, model/tool indirection — Granola's MCP is read-time
  for AI tools, not durable ingestion).
- **Likely files_to_modify** (confirm at claim time):
  - `src/capture/sources.ts` — add `'granola'` to `CAPTURED_SOURCES.apis`.
  - `src/capture/surfaces/granola-poller.ts` — REST client, pagination, `updated_after` checkpoint,
    rate-limit backoff, note+transcript fetch, candidate emission.
  - `src/daemon/index.ts` — start/stop the poller alongside existing surfaces.
  - `src/normalize/adapters/granola.ts` + `src/normalize/dispatch.ts` — make notes visible to
    normalized trace/cluster flows.
  - `src/mcp/util/source-app.ts` — add `granola` to the source_app enum (currently only
    cursor/claude_code/codex/git).
  - Tests: poller, sources, gate, normalize adapter, MCP source_app schema.
- **Atom shape:** `source: "api:granola"`; **append-only, one atom per note revision** (storage has
  no update/delete contract — `wiki/architecture/storage.md`); `timestamp` = calendar
  `scheduled_start_time` else `created_at`; `content` = title + folder(s) + summary + attendees +
  decision/action headings + (size-bounded) transcript; `metadata` = note_id, title, web_url,
  owner_email, created/updated, calendar_event_id, attendees, organizer, folder ids/names,
  transcript_included, granola_account_email, `data_origin: "ceo"`, `ingested_for: "founder"`.
  **Do NOT set `repo_root`** (meetings aren't repo artifacts) — organize via source_app/folders/
  title/attendees/headings.

## Out of Scope (Don't Drift)

- **The eng→CEO read-view + rationale capture** — that's item 103.
- **Federation / consent matrix / multi-party / CEO-ECHO-captures-and-shares** — see AC3.
- **Slack / Linear / other meeting tools** — Granola only.
- **Rewriting shipped-reality docs** until validated.

## spec_refs

- `backlog/proposed/2026-06-18-103-ceo-context-loop-n2.md` (the eng→CEO sibling this completes)
- `raw/internal/decisions/2026-06-18-office-hours-ceo-loop-rationale-capture.md` (design context)
- `wiki/architecture/capture-pipeline.md`, `capture-gate.md`, `capture-allowlist.md`, `storage.md`
- `wiki/capture/fs-watcher.md`, `wiki/capture/claude-code-extractor.md` (extractor patterns for contrast)
- `src/capture/sources.ts`, `src/mcp/util/source-app.ts`, `src/daemon/index.ts` (integration points)
- Codex consult (2026-06-19, read-only, session `019ee109`) — the architecture source; API shape unverified

## After Completion (Strategist Notes)

- If AC0 fails (Granola data not reachable), this item is **closed as infeasible** — record the
  negative result; the n=2 loop remains eng→CEO-only and the bidirectional ambition is re-gated.
- If it ships, likely wiki home: a new `capture/` page (`granola-extractor` / api-poller surface) +
  a `capture/per-app/granola-collected-data` field reference — **after** it's shipped and validated.
- This completes the bidirectional n=2 loop; revisit federation **only** if the loop cleared value.
