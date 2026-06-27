---
task_id: 2026-06-27-108-slack-linear-intake-gate
role: builder
binding: codex
claimed_by: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
claimed_at: 2026-06-27T22:34:49Z
branch: agent/slack-linear-intake-gate
last_updated: 2026-06-27T22:34:49Z
---

## current_thesis
Claimed for implementation as Codex builder. Build the Slack-surface Linear intake gate only: plain-English intake, minimum-context follow-ups, requester confirm/dismiss, exactly-once fail-closed Linear create, Slack link-back, and operator runbook.

## locked_decisions
- AC1: Slack mention/thread intake must ack before brain or Linear work, then extract mandatory fields from plain-language text.
- AC2: Intake state is per `team_id:channel_id:root_ts`; missing mandatory fields trigger at most two plain-language follow-up questions per turn, never engineering jargon, and unresolved project names are missing context.
- AC3: Create only after requester confirm; dismiss is terminal; duplicate confirms and Slack redelivery must not create more than one issue, and uncertain Linear create outcomes go to `needs-reconcile`.
- AC4: Linear writes use explicit env/config IDs plus project-name mapping, no Linear reads, bounded timeout, no duplicating retry, and defensive operator-visible errors.
- AC5: Successful create posts the issue URL and receipt summary back to the Slack thread, including requester identity and thread link in the issue body.
- AC6: Slack remains surface-only; no raw Slack capture. Failures must be requester-visible and durably operator-visible; ship the setup/runbook.

## open_questions
- None blocking at claim time. Escalate if implementation needs files outside `files_to_modify`, Linear reads, a new dependency, or behavior beyond confirm/dismiss create.

## dont_touch
- Do not add duplicate search against Linear.
- Do not add multi-bucket classifier routing, shape validator/digest, or decomposition/sub-issue assistant.
- Do not add Linear/backlog sync or status state-machine behavior.
- Do not make Slack a capture source or ingest raw Slack.
- Do not add auto-create, Zhen-gated creation, confirm-card editing, Linear comments/updates, Linear reads, or blind auto-retry of create.
- Do not create a destination app or resolve the strategic identity question.

## canonical_anchors

- spec: backlog/claimed/2026-06-27-108-slack-linear-intake-gate.md
- reviews: backlog/reviews/2026-06-27-108-slack-linear-intake-gate/
