---
name: using-echo-coord
description: Use ECHO coord tools to log multi-agent work, track deadlines, inspect the shared coord ledger, and understand the current coord_invoke packaging boundary.
type: skill
---

# Using ECHO Coord

ECHO coord is for coordinating work across multiple AI agents (yours or someone else's), with deadlines and a shared event ledger. ECHO is the substrate, not the orchestrator; you write the wrappers that actually invoke agents, then use coord events so other consumers can see what happened.

## Trigger Patterns

When you kick off deadline-bound work for yourself, emit `tick_start`. The HTTP MCP request must carry `X-Echo-Role: <YOUR ROLE>`; the header is not part of the tool arguments.

```js
coord_emit({
  "event_type": "tick_start",
  "schema_version": 1,
  "subject_role": "<YOUR ROLE>",
  "correlation_id": "<round-id>",
  "emitted_at": "<ISO>",
  "expected_by": "<ISO>"
})
```

When you finish that work, emit `tick_end` with the same role and `correlation_id`.

```js
coord_emit({
  "event_type": "tick_end",
  "schema_version": 1,
  "subject_role": "<YOUR ROLE>",
  "correlation_id": "<round-id>",
  "emitted_at": "<ISO>"
})
```

When you need operator state, call `coord_status({})`. It returns open deadlines, recent and per-role missed deadlines, per-role last ticks, daemon uptime, and the last reconstruction watermark.

When you need to wait for coord activity, call:

```js
wait_for_new_turns({ "source_prefix": "coord:", "since": "<ISO>" })
```

## Wire Format Gotchas

- `coord_emit` requires the HTTP header `X-Echo-Role` to name a configured role. Native MCP clients that cannot set per-request headers will fail with identity validation; wrapper code must set the header.
- Caller-supplied `source` is ignored. The daemon derives the ledger source from the validated header role.
- Round-tier events use `correlation_id` and must not include `tick_run_id`: `reviewer_invoked`, `tick_start`, `tick_end`, `tick_failed_to_bind`.
- Scheduler-tier events use `tick_run_id` and must not include `correlation_id`: `scheduler_health`, `scheduler_health_done`.
- Self-attestation events require `subject_role` to equal the header role: `tick_start`, `tick_end`, `scheduler_health`, `scheduler_health_done`.
- Invocation events may target another configured role: `reviewer_invoked`, `tick_failed_to_bind`.
- Events with a configured `expects` value open deadlines; the matching event closes them. If `expected_by` is omitted, the role default applies; if supplied, it is clamped to the role max.
- `deadline_missed` is daemon-emitted only. Callers cannot emit it.

## coord_invoke Today

`coord_invoke` exists and, when wrapper resolution succeeds, writes a `reviewer_invoked` deadline event before spawning `tools/review-queue/run-<role>-reviewer.sh`. Those wrapper scripts are not included in the packaged V1 customer install, so `coord_invoke` is structurally present but not usable out of the box. Author your own wrapper scripts, or invoke agents yourself and use `coord_emit` to log the cycle.

## Worked Example

Example: a coordinator invokes a `codex` reviewer, then that reviewer starts and finishes the round. The header changes with the actor: `X-Echo-Role: claude` for the invocation, then `X-Echo-Role: codex` for the reviewer self-attestations.

```js
coord_emit({
  "event_type": "reviewer_invoked",
  "schema_version": 1,
  "subject_role": "codex",
  "correlation_id": "round-001",
  "emitted_at": "2025-01-01T17:00:00Z",
  "expected_by": "2025-01-01T17:02:00Z",
  "payload": { "request": "round-001" }
})
```

```js
coord_emit({
  "event_type": "tick_start",
  "schema_version": 1,
  "subject_role": "codex",
  "correlation_id": "round-001",
  "emitted_at": "2025-01-01T17:01:00Z",
  "expected_by": "2025-01-01T17:15:00Z"
})
```

```js
coord_emit({
  "event_type": "tick_end",
  "schema_version": 1,
  "subject_role": "codex",
  "correlation_id": "round-001",
  "emitted_at": "2025-01-01T17:10:00Z",
  "payload": { "verdict": "complete" }
})
```

## Answering Rule

Use coord tools to coordinate, not to narrate. Emit events that consumers will actually act on; don't spam the ledger with no-op heartbeats.
