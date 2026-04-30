# BACKLOG

**Kanban view of all active work.** Auto-orderable; each item is a file in `backlog/<status>/`.

> **System:** the spec for any in-flight item lives inside the item file in `backlog/ready/` — the wiki is **not** updated at decision time. Agents claim items from `ready/`, work on a feature branch in their own worktree, and move items through `claimed/` and `pending_review/`. Founder merges and moves to `complete/`. The strategist promotes shipped decisions to `wiki/` only after items land in `complete/`. See [`backlog/README.md`](./backlog/README.md) for the full workflow.

---

## 📥 Inbox (new items, not yet specced)

*Items added during conversation that need spec refinement before agents can claim them.*

*(none — add as we discuss)*

---

## 🔨 Ready (specced, agents may claim)

**Wave 2 — bring the substrate to life.** Wires the substrate skeleton into a running daemon that captures Cursor and Claude Code workspace events to a real database. 006/007/008 independent (parallel-safe via multi-session `ECHO_AGENT_ID`); 009 unblocks once all three land in `complete/`.

| Priority | ID | Title | Blocked By |
|---|---|---|---|
| HIGH | [2026-04-30-006](../backlog/ready/2026-04-30-006-capture-pipeline.md) | Capture pipeline (gate → storage wire-up) | — |
| HIGH | [2026-04-30-007](../backlog/ready/2026-04-30-007-daemon-entry.md) | Daemon entry point + lifecycle | — |
| HIGH | [2026-04-30-008](../backlog/ready/2026-04-30-008-sqlite-storage.md) | SQLite Storage implementation (better-sqlite3) | — |
| HIGH | [2026-04-30-009](../backlog/ready/2026-04-30-009-fs-watcher-cursor-and-claude-code.md) | FS watcher — first capture surface (Cursor + Claude Code) | 006, 007, 008 |

**Wave 3 — close the loop with MCP.** Adds content extractors (chat turns), git capture (commits/diffs), an MCP server, and the `search_memories` retrieval tool. Lands the V1 spec's week 4–5 milestone: end-to-end demo to founder. 010/011 unblock when Wave 2's 009 ships; 012/013 unblock at their respective Wave 2 dependencies. 014 needs 013 + 010 + 011. 015 (manual integration test) is the demo gate.

| Priority | ID | Title | Blocked By |
|---|---|---|---|
| HIGH | [2026-04-30-010](../backlog/ready/2026-04-30-010-cursor-extractor.md) | Cursor extractor (chat turns, full text) | 009 |
| HIGH | [2026-04-30-011](../backlog/ready/2026-04-30-011-claude-code-extractor.md) | Claude Code extractor (chat turns, full text) | 009 |
| HIGH | [2026-04-30-012](../backlog/ready/2026-04-30-012-git-capture.md) | Git capture surface (commits via refs watch) | 006, 007, 008 |
| HIGH | [2026-04-30-013](../backlog/ready/2026-04-30-013-mcp-server-skeleton.md) | MCP server skeleton (HTTP transport, stub tool) | 007, 008 |
| HIGH | [2026-04-30-014](../backlog/ready/2026-04-30-014-mcp-search-memories.md) | MCP `search_memories` tool | 013, 010, 011 |
| HIGH | [2026-04-30-015](../backlog/ready/2026-04-30-015-mcp-integration-test.md) | Cursor + Claude Code MCP integration test | 014 |

---

## 🔒 Claimed (agent owns; in flight on a feature branch)

*(empty — agents move items here via atomic claim)*

| Priority | ID | Title | Claimed By | Branch |
|---|---|---|---|---|
| | | | | |

---

## 👀 Pending Review (agent done; founder reviews + merges)

*(empty — agents move items here on completion or escalation; founder reviews each morning)*

| Priority | ID | Title | Branch | Notes |
|---|---|---|---|---|
| | | | | |

---

## ✅ Complete (merged; wiki update may be pending)

**Wave 1 — substrate skeleton.** All five items merged; wiki promoted in commit `7ad5db7` (post-shipment, per the operating model).

| ID | Title | Shipped |
|---|---|---|
| [2026-04-30-001](../backlog/complete/2026-04-30-001-repo-bootstrap.md) | Repo bootstrap | TS/Node + Vitest + ESLint + Prettier scaffold |
| [2026-04-30-002](../backlog/complete/2026-04-30-002-logger.md) | Logger module | Structured JSON-per-line; source-attributed; ECHO_LOG_LEVEL env filter |
| [2026-04-30-003](../backlog/complete/2026-04-30-003-capture-allowlist.md) | Capture allowlist | Empty CAPTURED_SOURCES + Source type + isAllowed* predicates |
| [2026-04-30-004](../backlog/complete/2026-04-30-004-capture-gate.md) | Capture gate | Pure chokepoint function; 28+ test cases; stable rejection codes |
| [2026-04-30-005](../backlog/complete/2026-04-30-005-storage-interface.md) | Storage interface + MemoryStorage | Append-only contract; in-memory impl as test fixture |

---

## How to Read This Board

- **Priority HIGH** = on V1 critical path; week-3 substrate gate depends on it
- **Priority MED** = parallel work that compounds (validation, extension)
- **Priority LOW** = nice-to-have; deferrable
- Each item file has frontmatter (status, spec refs, acceptance, files affected, agent-managed fields, review notes) plus a body with What / Why / Acceptance / Out of Scope / After Completion sections

## How to Add Work

During a strategic conversation:

1. Decision is made → spec is captured *inside* a new item file at `backlog/ready/<id>-<slug>.md` (this is the canonical spec until shipment)
2. Add a row to the Ready table on this board
3. Do **not** touch `wiki/` — wiki updates happen only after the item lands in `complete/`

When items land in `complete/`, the next strategist conversation reads each item's "After Completion (Strategist Notes)" section and promotes the shipped decisions into `wiki/`.

## How to Trigger an Agent

Agents use the `/process-backlog` slash command (defined in `.claude/commands/process-backlog.md`).

**Single-item trigger** (claim → ship → stop):

```
/process-backlog
```

The command claims the oldest highest-priority unblocked ready item, creates a worktree, implements, pushes the branch, and moves the item to `pending_review/`. One item per run.

**Batch trigger** (drain the queue):

```
/process-backlog-batch
```

Same workflow, looped: keeps claiming and shipping unblocked items until a hard stop fires (max items, time budget, escalation, no-candidates, or git error). Sequential within the session. Use this for late-night seed-and-walk-away workflows. Hard stops are configurable via env: `ECHO_BATCH_MAX_ITEMS` (default 10), `ECHO_BATCH_TIMEOUT_SECS` (default 21600 = 6h), `ECHO_BATCH_HALT_ON_ESCALATION` (default 1 = strict).

**Parallel runs:** multiple sessions of either command may run simultaneously, each with a distinct `ECHO_AGENT_ID`. The atomic-claim mechanic ensures only one agent ever owns an item; if a push race occurs, the loser picks the next ready item and retries.

**Scheduled trigger** (steady-state): see [`.claude/SETUP.md`](./.claude/SETUP.md). Recommended cadence and parallelism land there.

**Operating manual:** [`docs/AGENT_INSTRUCTIONS.md`](./AGENT_INSTRUCTIONS.md) — required reading for every agent on every run.
