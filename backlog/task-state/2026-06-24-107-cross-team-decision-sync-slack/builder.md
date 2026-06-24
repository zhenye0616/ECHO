---
task_id: 2026-06-24-107-cross-team-decision-sync-slack
role: builder
binding: codex
created: 2026-06-24T05:42:01Z
last_updated: 2026-06-24T06:09:53Z
branch: agent/cross-team-decision-sync-slack
---

## current_thesis
Re-claimed by Codex builder after spec-review resolved the prior file-scope blocker. Implement 107 as a narrow cross-team decision-layer Slack flow: raw context remains machine-scoped; only explicit, confirmed decision atoms enter `derived:team-decisions`; Slack cross-team reads use that shared decision layer only.

## locked_decisions
- AC1: allowlist a team-scoped decision namespace distinct from machine-scoped raw sources, and enforce the raw boundary in code/tests.
- AC2: extend the Slack responder so cross-team answers come from the shared decision layer only; no remote raw drill-down route is introduced.
- AC3: implement propose-confirm; unconfirmed drafts are never queryable, and confirm/edit/dismiss is idempotent via durable draft state.
- AC4: add vendor-neutral `skills/echo-emit-decision.md`, onboarding snippets, and generated Claude adapter via `tools/sync-skills.sh`.
- AC5: decision atoms are append-only and machine-attributed with subject, decision, optional rationale, author, confirmed_by, confirmed_at, source_app, and dedupe_key; latest-wins is query-time only.
- AC6: document the white-glove n=2 onboarding runbook with Slack install, snippets, and individual-aha-before-cross-team sequence.
- Spec-review resolutions R1-R6 are binding: Slack responder owns the shared decision store; `propose_decision` is the callable; identity is for confirm attribution only; dedupe_key normalizes subject; durable draft replay returns the same result; code-session decisions only.

## open_questions
- None at claim. If listed paths or substrate shape contradict the spec, stop and escalate rather than adding unlisted files or dependencies.

## dont_touch
- Do not share raw or machine-scoped atoms across people.
- Do not auto-publish without explicit confirm.
- Do not add an ECHO-side daemon LLM extraction worker.
- Do not build peer-to-peer raw-store sync or a merge layer.
- Do not add a destination app or new ECHO UI.
- Do not expand production access-control or audit hardening beyond the visible confirm record.
- Do not support more than the symmetric cofounder-to-cofounder peer case.
- Do not edit wiki pages or backlog item bodies.

## canonical_anchors

- spec: backlog/claimed/2026-06-24-107-cross-team-decision-sync-slack.md
- reviews: backlog/reviews/2026-06-24-107-cross-team-decision-sync-slack/
