---
task_id: 2026-06-18-103-ceo-context-loop-n2
role: builder
binding: codex
last_updated: 2026-06-19T19:43:58Z
branch: agent/ceo-context-loop-n2
claimed_at: 2026-06-19T19:30:22Z
handoff_branch: agent/ceo-context-loop-n2
handoff_head_sha: 4ab9b08f4888e07b314faccbf846c1a6ae64b126
handoff_run_log: raw/internal/agent-runs/2026-06-19-2026-06-18-103-ceo-context-loop-n2.md
---

## current_thesis
Claimed for codex build. Implement only AC2: a minimal outbound Slack Socket Mode responder on the founder machine that answers CEO why-queries from scoped eng context. AC1, AC3, and AC4 are founder-executed validation artifacts and observation, not builder-owned productization.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at 4ab9b08f4888e07b314faccbf846c1a6ae64b126.
<!-- builder-state-handoff:end -->

## locked_decisions
- AC1 is a fidelity gate around rationale capture and blind grading; builder must not create a new capture surface for it.
- AC2 is the only code build: Slack app/bot token + Socket Mode listener + scoped ECHO query + post answer back to Slack.
- Slack workspace membership plus bot token is the validation access boundary; no pre-shared secret, inbound endpoint, public tunnel, or productized proxy.
- The read view must scope to relevant eng context, not the founder's entire cross-project ECHO.
- AC3 and AC4 are n=2 validation setup/usage signals; the responder may append the minimal one-line event record only if the implementation path requires it.

## open_questions
- None yet; load all spec_refs before implementation and escalate if AC2's allowed file surface is not concrete enough.

## dont_touch
- Do not re-add production access-control or audit scaffolding: pre-shared-secret auth, fail-closed startup, tunnel lifecycle, UUID/session/intent-enum schema, interruption annotation schema, or productized proxy.
- Do not build a customized web/hotkey/desktop query surface; Slack is the validation surface.
- Do not implement Granola, meetings ingestion, federation, B2 multi-party consent, CEO install flow, or new Linear/PM capture.
- Do not edit wiki, V1 spec, CLAUDE.md scope, docs/BACKLOG.md, MCP server core, or the capture pipeline.

## canonical_anchors

- spec: backlog/pending_review/2026-06-18-103-ceo-context-loop-n2.md
- reviews: backlog/reviews/2026-06-18-103-ceo-context-loop-n2/
