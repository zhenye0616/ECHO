---
task_id: 2026-05-18-062-ask-echo-raycast-llm-qa
role: builder
writer: codex-builder
last_updated: 2026-05-19T04:43:21Z
---

## current_thesis

Claimed 062 as Codex builder. The task is to add the Ask ECHO Raycast single-shot Q&A command plus daemon MCP request auditing, but implementation is blocked before code because the spec's `files_to_modify` includes `docs/BACKLOG.md` while builder instructions forbid builder edits to that file.

## locked_decisions

- AC1: add Raycast command `ask-context` with agent-kind preferences, preserving existing `search-context`.
- AC2: spawn a configured headless agent subprocess with explicit stdio, cancellation, bounded stderr, ANSI stripping, idle notice, and 5-minute ceiling.
- AC3: stream stdout into a throttled Detail view and populate metadata from daemon audit records only.
- AC4: handle daemon/binary preflight failures and runtime subprocess/audit failure states.
- AC5: expose `GET /mcp/recent-calls` and record deterministic redacted MCP tool-call shapes in an in-memory ring buffer.
- AC6: add Raycast profile/prompt/audit tests plus daemon request-log and endpoint tests.
- AC7: document Ask ECHO setup, preferences, journal template marker, and single-shot/no-transcript constraints.
- AC8: pass Raycast `tsc`, `ray build`, root typecheck, and root tests.
- AC9: founder-gated post-merge journal threshold before any V1 surface spec.

## open_questions

- BLOCKED: should `docs/BACKLOG.md` be removed from this item's `files_to_modify` / handled by the strategist, or should the builder no-write rule for `docs/BACKLOG.md` be explicitly amended for this item?

## dont_touch

- Do not build multi-turn, threaded, follow-up, or chat-bubble UI.
- Do not persist question history, transcripts, prompts, or answers.
- Do not add CLI, browser-tab, native-app, Raycast Store, installer, analytics, telemetry, or extra Q&A surfaces.
- Do not add daemon-side synthesis/summarization, new MCP tools, model-authored sidebar data, or daemon-written LLM logic.
- Do not auto-detect frontmost-app repo scoping or bundle/install agent binaries.
- Do not modify existing `search-context.tsx`.
- Do not create wiki pages for this v0 dogfooding tool.
- Do not use free-form `args_summary` or `result_summary`; audit output must use deterministic `args_shape` / `result_shape`.

## canonical_anchors

- spec: backlog/claimed/2026-05-18-062-ask-echo-raycast-llm-qa.md
