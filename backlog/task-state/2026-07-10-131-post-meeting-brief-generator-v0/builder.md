---
task_id: 2026-07-10-131-post-meeting-brief-generator-v0
role: builder
binding: codex
claim_branch: agent/post-meeting-brief-generator-v0
last_updated: 2026-07-10T06:17:23Z
handoff_branch: agent/post-meeting-brief-generator-v0
handoff_head_sha: b58f558ebebd0bcbf6893c8fea5dcda5404f3ef0
handoff_run_log: raw/internal/agent-runs/2026-07-10-2026-07-10-131-post-meeting-brief-generator-v0.md
---

## current_thesis
Claimed 131 as codex builder. Productize the proven meeting->brief prototype as `echoctl brief` while fixing the six named root causes at the existing Granola poller, signal extraction, brief compiler, renderer, and CLI seams.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at b58f558ebebd0bcbf6893c8fea5dcda5404f3ef0.
<!-- builder-state-handoff:end -->

## locked_decisions
- AC1: target resolution is explicit by `--note <id>` or newest fresh note; missing poll/extraction/current-run state fails loud, while successful zero-signal extraction may render "No decisions recorded".
- AC2: Granola notes are append-only re-ingested when API `updated_at` is newer; all readers use `resolveCurrentGranolaNoteAtoms(storage, note_id)` and extraction fingerprints include content hash.
- AC3: the brief compiler reads signals through `filterToCurrentSignalRuns()` only; file the item-130 RC3 residual in `backlog/_followups.md` and do not touch the bridge path.
- AC4: checkpoint updates use the pinned portable atomic lock-dir protocol, owner token fencing, retry-after extraction failures, and `echoctl brief --force` clears target-note failure state.
- AC5: fenced brain JSON is salvaged before parse without brain retry; prompt embeds transcript once; timeout scales by final prompt size with the pinned clamp formula.
- AC6: markdown render sanitizes fence lines, inline backticks, and chat-wide mentions exactly as specified; dates use local timezone; action owners are per-action, falling back to unassigned.
- AC7: emit both byte-stable canonical JSON `brief-<note_id>.json` and markdown over the same object schema, with `carryover[]` reserved empty.
- AC8: add the machine-local parity comparator for the two real note ids, skipping visibly when absent and failing only on normalized decided/action text deltas.

## open_questions
- None blocking at claim time. Escalate if AC completion requires dependencies not named by the spec, files outside `files_to_modify`, or behavior changes to the item-130 bridge / decision pipeline.

## dont_touch
- Do not add the calendar-end trigger or retry-until-published loop.
- Do not add Mattermost/Slack delivery adapters or any auto-send behavior.
- Do not add multi-key or advisor-account Granola polling.
- Do not change the decision-changeset/card pipeline or item-130 bridge path except the required follow-up note.
- Do not add new mutable stores or brief history/versioning beyond the two emitted files.
- Do not edit wiki, docs backlog/status/north-star files, or backlog item bodies.

## canonical_anchors

- spec: backlog/pending_review/2026-07-10-131-post-meeting-brief-generator-v0.md
