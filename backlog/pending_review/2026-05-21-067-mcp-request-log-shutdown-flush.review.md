---
item_id: 2026-05-21-067-mcp-request-log-shutdown-flush
verdict: merge with founder fixups
reviewed_at: 2026-05-22T06:47:02Z
test_counts: { passed: 1142, failed: 0 }
---

## Verdict
Production code looks mergeable, scoped, and verified, but AC4 is not fully satisfied as written: Test (i) seeds the pending call directly through `beginRecentMcpCall` instead of starting a real long-enough MCP call through the server wrapper. Either add that pre-merge test fixup or explicitly waive the stricter AC4 wording.

## Pre-merge fixups
- [ ] Replace or supplement AC4 Test i with a real long-running MCP call that is visible as `pending` before `mcp.stop()`, or have founder explicitly waive that AC wording.

## Expected merge conflicts
- None expected. `git merge-tree` reported a clean merge for the five changed files; current main's newer changes are backlog/agent-run files only.

## Follow-up items (defer, do not block merge)
- None.
