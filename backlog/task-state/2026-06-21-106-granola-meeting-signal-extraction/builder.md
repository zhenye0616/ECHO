---
task_id: 2026-06-21-106-granola-meeting-signal-extraction
role: builder
binding: codex
claimed_by: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
claimed_at: 2026-06-22T07:09:51Z
branch: agent/granola-meeting-signal-extraction
last_updated: 2026-06-22T07:30:42Z
handoff_branch: agent/granola-meeting-signal-extraction
handoff_head_sha: e0e5fd0be34d7862115bfc900e7ae91d8ca39663
handoff_run_log: raw/internal/agent-runs/2026-06-22-2026-06-21-106-granola-meeting-signal-extraction.md
---

## current_thesis
Claimed for implementation as Codex builder. Build the derived Granola signal extraction lane only: append-only signal atoms and manifests, async debounced worker scheduling, provider reuse from the CEO-loop reasoning brain, and retrieval filters needed to surface current decision/rationale/action signals without transcript hydration.

<!-- builder-state-handoff:start -->
- Lifecycle: ESCALATED — see agent_notes and raw/internal/agent-runs/2026-06-22-2026-06-21-106-granola-meeting-signal-extraction.md for blocker.
<!-- builder-state-handoff:end -->

## locked_decisions
- AC1: Raw `api:granola` summary/transcript atoms are immutable; derived signals append under `derived:granola-signals`, one atom per `decision`, `rationale`, or `action`.
- AC2: Signal metadata must include normalized `canonical_subject`, parent/raw lineage, `source_span`, confidence guardrails, extractor version/run ids, and stable append-only dedupe keys.
- AC3: Each successful run appends a manifest under `derived:granola-signals-index`; current run is latest-wins per `note_id`, not mutable flags.
- AC4: Extraction is an async daemon worker with settle/debounce, single in-flight scheduling, bounded retries, success-only manifests, and an atomic no-spin checkpoint advanced only after durable terminal outcomes.
- AC5: `search_memories` gains scalar equality plus array membership semantics for `metadata_match`, including exact normalized `canonical_subject`; retrieval must return only current-run signals and preserve summary-only querying.
- AC6: Provider/model and credential behavior reuse the 105 CEO-loop resolution path; tests inject a mock extractor/client and never call a live LLM or real Granola key.

## open_questions
- None blocking at claim time; implementation must stop if the current substrate makes any listed `files_to_modify` insufficient.

<!-- builder-state-handoff-open-questions:start -->
- See agent_notes and run log for the escalation question.
<!-- builder-state-handoff-open-questions:end -->

## dont_touch
- Do not build prompt-for-why or human-in-loop rationale capture.
- Do not add signal types beyond `decision`, `rationale`, and `action`.
- Do not stitch cross-meeting threads or topic timelines.
- Do not add non-Granola meeting sources.
- Do not mutate raw `api:granola` atoms.
- Do not run extraction inside the Granola poller or lazily at query time.

## canonical_anchors

- spec: backlog/pending_review/2026-06-21-106-granola-meeting-signal-extraction.md
