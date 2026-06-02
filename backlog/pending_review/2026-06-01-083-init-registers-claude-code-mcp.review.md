---
item_id: 2026-06-01-083-init-registers-claude-code-mcp
verdict: merge with founder fixups
reviewed_at: 2026-06-02T08:09:51Z
test_counts: { passed: 1496, failed: 0 }
---

## Verdict
merge with founder fixups. HEAD matched `2d64e40e2c242fd794f5eca0594eb4f234ff1c2f`, tests/lint/typecheck pass, and AC1-AC6 are covered. The required founder fixup is a scope decision: the branch touches `src/echo-home/adapter-sync.ts`, which was not in `files_to_modify`, though the change is technically coherent.

## Pre-merge fixups
- [ ] Founder explicitly accepts the `src/echo-home/adapter-sync.ts` file-scope exception, or asks for the spec/files list to be amended before merge.

## Expected merge conflicts
- None expected in code, doc, or script files. Current `main` has backlog/review traffic for this item family only; reconcile backlog movement and review metadata through the normal merge-and-cleanup flow.

## Follow-up items (defer, do not block merge)
- Add SIGKILL escalation for the Claude Code MCP registration spawn if the process ignores SIGTERM.
- Narrow duplicate detection from broad `already exists` text to the Claude MCP `echo` server duplicate shape.
