# raw/internal/agent-runs/

Agent execution logs. One file per agent run on a backlog item.

## Why This Exists

When the agent picks up a backlog item, it logs:
- What it actually did (vs. what was specified)
- Decisions made during implementation
- Files modified and diffs
- Test results
- Open questions that need founder input

This is the audit trail the founder uses to review work each morning.

## Filename Convention

`YYYY-MM-DD-<backlog-item-id>.md`

Example: `2026-05-01-2026-04-30-002-mcp-server-skeleton.md`
- First date = when agent ran
- Second date+id = backlog item identifier

## Run Log Template

```markdown
---
backlog_item: 2026-04-30-002-mcp-server-skeleton
agent_run_started: 2026-05-01T02:15:00Z
agent_run_ended: 2026-05-01T03:42:00Z
status: ready_for_review | needs_input | failed
test_status: passing | failing | partial | skipped
---

# Agent Run: [Item Title]

## What I Implemented
[Summary of work — what was built, where it lives]

## Files Modified
- `src/daemon/mcp/server.rs` — created (124 lines)
- `src/daemon/mcp/tools.rs` — created (89 lines)
- `tests/mcp/skeleton_test.rs` — created (45 lines)

## Decisions Made During Implementation

### Decision 1: [What I had to choose]
- **Options considered:** A, B, C
- **Chose:** B
- **Why:** [Reasoning, ideally citing a wiki concept]
- **Worth founder review?** No — clear from existing patterns / Yes — see question below

### Decision 2: ...

## Acceptance Criteria Status

- [x] MCP server starts on localhost — passing
- [x] Implements search_context(query) — returns stub data
- [x] Implements get_recent_activity(time_window) — returns stub data
- [x] Has integration tests — 6 tests, all passing
- [ ] Connects from Cursor (manual test required) — requires founder

## Tests Run

```
cargo test --package daemon-mcp
running 6 tests
test mcp::server::starts ... ok
test mcp::server::handles_invalid_request ... ok
test mcp::tools::search_context ... ok
test mcp::tools::get_recent_activity ... ok
test mcp::tools::concurrency ... ok
test mcp::tools::error_responses ... ok

test result: ok. 6 passed; 0 failed
```

## Open Questions for Founder

[Any uncertainty that the agent didn't resolve. If non-empty, item should go to `needs_review/` with these flagged in `agent_notes`.]

1. ...

## Anything I Almost Did But Stopped Myself

[Drift events the agent caught itself on. References [[drift-prevention]] patterns.]

- Considered adding [adjacent feature] but recognized it as Pattern 1 (one more integration). Logged in `raw/internal/decisions/<date>-DRIFT.md`.

## Next Suggested Backlog Items (Don't Auto-Create)

[Things this work uncovered that might warrant new backlog items. Suggested only — founder decides whether to actually create them.]

- ...
```

## What This Folder Doesn't Contain

- The backlog items themselves → `backlog/`
- Strategic decisions → `wiki/sources/`
- Drift events → `raw/internal/decisions/` (with type: drift-event)
- User interview notes → `raw/internal/interviews/`

## Synthesis

After several agent runs accumulate, look for patterns:
- Is the agent repeatedly making the same kind of decision? → consider promoting it to a `concepts/` page
- Is the agent repeatedly hitting the same uncertainty? → the spec needs more detail
- Is the agent repeatedly catching itself on the same drift pattern? → `drift-prevention.md` may need a new pattern added
