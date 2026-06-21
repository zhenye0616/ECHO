---
task_id: 2026-06-18-104-granola-meeting-capture
role: builder
binding: codex
claim_branch: agent/granola-meeting-capture
last_updated: 2026-06-21T20:03:28Z
---

## current_thesis
Claimed 104 as codex builder. Implement Granola API meeting-note ingestion through the existing capture and normalization pipeline, with deterministic two-atom output per note, crash-safe checkpointing, config validation, and source-app filtering.

## locked_decisions
- AC1: each Granola note becomes exactly one summary atom and one transcript atom with stable dedupe keys `granola:{note_id}:summary` and `granola:{note_id}:transcript`.
- AC2: Granola is the first `api:granola` source in the `apis` allowlist and must be searchable via `search_memories(source_app='granola')`.
- AC3: polling uses `updated_after`, atomic checkpoint writes under `~/.echo/state/granola-checkpoint.json`, advance-after-durable-write, idempotent overlap at the high-water boundary, single in-flight polling, bounded request timeout, and visible durable error evidence.
- AC4: API key resolution precedence is `GRANOLA_API_KEY` then `~/.echo/state/granola.json`; missing or invalid keys disable the poller visibly while the daemon continues.
- Tests are mocked only; no live Granola API calls or real API key usage.

## open_questions
- None blocking at claim. Escalate if implementation needs files outside `files_to_modify`, a dependency not named by the spec, live API probing, or scope beyond raw API ingestion.

## dont_touch
- Do not implement the eng-to-CEO read view or rationale capture from item 103.
- Do not implement Slack channel capture.
- Do not build a structured decision/reason/alternatives reasoning layer.
- Do not add transcript analysis or speaker diarization beyond raw ingestion.
- Do not add federation, consent matrix, or multi-party mechanics.

## canonical_anchors
- spec: backlog/claimed/2026-06-18-104-granola-meeting-capture.md
