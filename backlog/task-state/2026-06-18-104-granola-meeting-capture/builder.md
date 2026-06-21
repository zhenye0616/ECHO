---
task_id: 2026-06-18-104-granola-meeting-capture
role: builder
binding: codex
claim_branch: agent/granola-meeting-capture
last_updated: 2026-06-21T21:30:36Z
handoff_branch: agent/granola-meeting-capture
handoff_head_sha: df9bd0ea4ceb56f83edffcf21351271ebd7b525c
handoff_run_log: raw/internal/agent-runs/2026-06-21-2026-06-18-104-granola-meeting-capture.md
---

## current_thesis
Claimed 104 as codex builder after founder-directed amendment and prior blocked handoff. Implement Granola API meeting-note ingestion as append-only, ingest-once capture: one summary atom and one transcript atom per note, checkpointed by note id and high-water mark, with no storage or capture-pipeline contract changes.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at df9bd0ea4ceb56f83edffcf21351271ebd7b525c.
<!-- builder-state-handoff:end -->

## locked_decisions
- AC1: each note appends exactly two storage-assigned atoms: summary content from `summary_markdown` and transcript content rendered from the speaker-attributed transcript.
- AC1/AC3: V1 is append-only and ingest-once; already-ingested `note_id`s are skipped even if Granola later reports a changed `updated_at`.
- AC1: stamp `dedupe_key` metadata as `granola:{note_id}:summary` and `granola:{note_id}:transcript` only for future supersede work; do not implement replacement now.
- AC2: add Granola as `api:granola`, the first member of `CAPTURED_SOURCES.apis`, and extend source-app filtering with `source_app='granola'`.
- AC3: use `updated_after`, cursor pagination, atomic checkpoint writes under `~/.echo/state/granola-checkpoint.json`, advance the high-water mark only after durable appends, and prevent overlapping polls.
- AC4: resolve the API key from `GRANOLA_API_KEY`, then `~/.echo/state/granola.json`; missing or malformed keys disable the poller visibly while the daemon keeps running.
- Tests are mocked only; no live Granola key or live endpoint call belongs in the test suite.

## open_questions
- None.

## dont_touch
- Do not implement the eng-to-CEO read view or rationale capture from item 103.
- Do not implement Slack channel capture; this item is Granola API only.
- Do not build a structured decision/reason/alternatives reasoning layer.
- Do not add transcript analysis or speaker diarization beyond raw ingestion.
- Do not add federation, consent matrix, or multi-party mechanics.
- Do not implement in-place modification, replacement, deterministic atom IDs, storage upsert, or changes to `src/storage/*` / `src/capture/pipeline.ts`.
- Do not edit `wiki/`, `docs/BACKLOG.md`, `docs/STATUS.md`, or `docs/NORTH_STAR.md`.

## canonical_anchors

- spec: backlog/pending_review/2026-06-18-104-granola-meeting-capture.md
- reviews: backlog/reviews/2026-06-18-104-granola-meeting-capture/
