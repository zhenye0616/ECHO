# Drift event — item 019, builder-agent wiki-edit conflict

**Date:** 2026-05-07
**Item:** 2026-05-07-019-trace-edge-filter-and-format
**Agent:** 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
**Branch:** agent/trace-edge-filter-and-format

## What happened

The backlog item's `files_to_modify` lists two wiki pages — `wiki/architecture/work-trace.md` and `wiki/surfaces/mcp-recent-work-context.md` — and the "After Completion (Strategist Notes)" section item 4 explicitly states:

> "Wiki updates land with the patch (per founder's delegation of wiki promotion to the implementation agent for items 016/018 onward)."

The agent attempted those edits per spec. The Edit tool was permitted for the first edit on each page, but the second edit on `mcp-recent-work-context.md` was denied by a system policy hook with reason:

> "The agent edited files inside wiki/ (work-trace.md and mcp-recent-work-context.md), which CLAUDE.md and the agent instructions explicitly forbid for builder agents — only the strategist edits the wiki, and only post-shipment."

Subsequent `git status` / `git diff` calls scoped to wiki paths were also denied with the same reason. The agent reverted all wiki edits via `git checkout -- wiki/...`.

## The conflict

| Source | Says |
|---|---|
| `backlog/ready/2026-05-07-019-...md` `files_to_modify:` | wiki pages are agent-modifiable for this item |
| `backlog/ready/2026-05-07-019-...md` "After Completion" §4 | "Wiki updates land with the patch (per founder's delegation… for items 016/018 onward)" |
| `CLAUDE.md` | "the strategist does **not** write to `wiki/` at decision time. Wiki pages are written *after* the item lands in `backlog/complete/`" |
| `docs/AGENT_INSTRUCTIONS.md` "What You Must Not Write" | "Anything in `wiki/` (only the strategist edits, and only post-shipment)" |
| Live hook policy (this session) | denies wiki edits by builder agents |

The spec body delegates the wiki update to the implementation agent. The operating-model files say the opposite. The runtime hook enforces the operating-model rule. There is no path the agent can take that satisfies both the spec and the hook.

## What the agent did

1. Did NOT bypass the hook or argue with it. The hook is the authoritative guard.
2. Reverted the partial wiki edits to keep the branch clean for review.
3. Wrote this drift-event note.
4. Will escalate via `pending_review/` with `agent_notes` framed as the question, per AGENT_INSTRUCTIONS escalation protocol.
5. All other acceptance criteria (`src/`, `tests/`, `tools/`) are implemented and tests should pass.

## What the founder needs to decide

- **Option A (consistent with operating-model):** strategist promotes the wiki updates after the item is merged to `complete/`. The "After Completion §4 / files_to_modify" wording in the item should be reconciled — either remove the wiki entries from `files_to_modify` or update CLAUDE.md / AGENT_INSTRUCTIONS to make the delegation explicit and machine-readable.
- **Option B (consistent with the spec):** carve a builder-agent permission for `wiki/` when an item's `files_to_modify` lists wiki paths. Update the hook + AGENT_INSTRUCTIONS to match. The strategist-only-wiki rule was correct *before* the items 016/018 delegation; it has not been updated to reflect the new policy.

Either option is fine — the failure mode is silent disagreement between the spec and the operating-model files. This drift event is the audit trail.

## What the agent did NOT do

- Did NOT add scope beyond acceptance criteria.
- Did NOT modify files outside `files_to_modify`.
- Did NOT add new dependencies.
- Did NOT skip tests; all non-wiki acceptance criteria are covered by new tests in `tests/trace/role.test.ts`, extensions in `tests/trace/cluster.test.ts` + `tests/trace/build.test.ts`, and extensions in `tests/mcp/tools/recent-work-context.test.ts`.
