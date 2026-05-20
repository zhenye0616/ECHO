---
task_id: 2026-05-19-063-raycast-sessions-as-objects
role: builder
writer: codex-builder
last_updated: 2026-05-20T04:08:29Z
---

## current_thesis

Claimed 063 as Codex builder. The task is to restructure Raycast ECHO around durable ask sessions, keeping `echo.tsx` as a thin router, using Raycast LocalStorage per-row session persistence, and preserving the no-chat / no-daemon-expansion constraint.

## locked_decisions

- Implement the five-state Raycast UX: Empty, Typing, Live AnswerView, SessionDetail, and SessionsList.
- Treat every ask as a `Session` object with the spec's full shape, per-row LocalStorage keys, migration from `echo.recent-asks`, bounded retention, and stale-running reconciliation.
- Extract component files listed in `files_to_modify`; keep `echo.tsx` at or below 400 lines.
- Extend audit rendering from existing `/mcp/recent-calls` shapes only; do not add daemon endpoints or correlation IDs.
- Extend `agent-runner.ts` to expose immutable per-run `sessionLogPath` for SessionDetail log actions.
- Preserve launch and MCP client behavior from existing libraries unless acceptance criteria explicitly require wiring.
- Verification target is the spec's Raycast/Vitest test surface plus build/typecheck commands available in the Raycast package.

## open_questions

- None blocking at claim.

## dont_touch

- Do not build infinite chat transcripts, topic-thread management, or continue-conversation semantics.
- Do not add daemon-side conversation memory, new MCP tools, new daemon endpoints, or daemon-written LLM logic.
- Do not create a custom session database beyond Raycast LocalStorage plus existing subprocess tee logs.
- Do not add browser-tab primary detection, new launch surfaces, telemetry, analytics, or wiki pages.
- Do not modify files outside the spec's `files_to_modify` list except this builder task-state pointer and backlog/run-log protocol files.

## canonical_anchors

- spec: backlog/claimed/2026-05-19-063-raycast-sessions-as-objects.md
