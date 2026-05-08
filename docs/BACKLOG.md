# BACKLOG

**Kanban view of all active work.** Auto-orderable; each item is a file in `backlog/<status>/`.

> **System:** the spec for any in-flight item lives inside the item file in `backlog/ready/` — the wiki is **not** updated at decision time. Agents claim items from `ready/`, work on a feature branch in their own worktree, and move items through `claimed/` and `pending_review/`. Founder merges and moves to `complete/`. The strategist promotes shipped decisions to `wiki/` only after items land in `complete/`. See [`backlog/README.md`](./backlog/README.md) for the full workflow.

---

## 📥 Inbox (new items, not yet specced)

*Items added during conversation that need spec refinement before agents can claim them.*

*(none — add as we discuss)*

---

## 🔨 Ready (specced, agents may claim)

| Priority | ID | Title | Estimate | Notes |
|---|---|---|---|---|
| HIGH | [2026-05-08-022](../backlog/ready/2026-05-08-022-v15-2-trace-retrieval-reliability.md) | V1.5.2 trace + retrieval reliability — close the cross-source bias and silent-failure bugs | 3-4d | Six fixes surfaced by round-4 dogfooding + Codex's independent code review. **A:** centralize timestamp canonicalization to UTC `Z` at the capture-pipeline chokepoint + migrate the 152 existing `-07:00` git rows (storage's text-compare WHERE clause silently drops them from time windows). **B:** storage-cap silent-failure warning in `get_recent_work_context`. **C:** filter raw fs-watcher noise (96.6% of newest 1000 storage rows per Codex's measurement) from trace input via `QueryFilter.exclude_metadata_surface`. **D:** `search_memories` filter-before-slice bug. **E:** description clarification (substring, not semantic). **F:** `hasTzMarker` regex broadening. All P0 except E (P1) and F (P2). |
| HIGH | [2026-05-08-023](../backlog/ready/2026-05-08-023-chokidar-flake-quarantine.md) | Quarantine the recurring chokidar / capture / daemon-lifecycle flake cluster | 0.5-1d | Re-flagged at every merge verify since 014 (6 references in `_followups.md`). 3-14 fluctuating failures in `tests/capture/extractors/cursor.test.ts` + `tests/daemon/lifecycle.test.ts`. Spec offers three paths (real FSEvents race fix / per-file timeout bump / `.skip()` quarantine); agent chooses based on 3-run baseline measurement. Acceptance: 3 consecutive `npm test` runs with zero failures + close the cursor + daemon-lifecycle subset of all 6 historical followup references (claude-code.test.ts + fs-watcher.test.ts portions of 014's note remain open). |

*(Items 019, 020, 021 shipped 2026-05-07/08 and now live in `backlog/complete/`; their rows will be reconciled into the Complete section on the next wiki-promotion pass.)*

*Wave 4 (extension upgrade, GitHub adapter, Slack adapter, audit page, hotkey overlay UI) not yet specced. See `backlog/_followups.md` for the deferred fixups queue and the `wave-1-2-3-retrospective` operating-model lessons that should land in spec-template fixes before Wave 4 starts. Item 020 is the substrate prerequisite for the hotkey overlay; UI ships as a separate Wave 4 item.*

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

**Wave 2 — bring the substrate to life.** Wires the substrate skeleton into a running daemon. 006/007/008 ran in parallel; 009 followed once all three landed. The capture gate's accept-path is exercised in production for the first time at 009. Wiki promoted in commit `44dd2d3` (waves 2 + 3 promoted together).

| ID | Title | Shipped |
|---|---|---|
| [2026-04-30-006](../backlog/complete/2026-04-30-006-capture-pipeline.md) | Capture pipeline (gate → storage wire-up) | Thin async seam `processCandidate(event, storage)`; gates then appends; storage dependency-injected |
| [2026-04-30-007](../backlog/complete/2026-04-30-007-daemon-entry.md) | Daemon entry + lifecycle | Boot/shutdown scaffold; PID lock; signal handling; loopback-only binding |
| [2026-04-30-008](../backlog/complete/2026-04-30-008-sqlite-storage.md) | SQLite storage (better-sqlite3) | WAL mode; migration runner; `source_prefix` filter; default backend (override via `ECHO_STORAGE=memory`) |
| [2026-04-30-009](../backlog/complete/2026-04-30-009-fs-watcher-cursor-and-claude-code.md) | FS watcher — first capture surface | chokidar-backed; allowlisted Cursor + Claude Code paths; gate accept-path live in production |

**Wave 3 — close the loop with MCP.** Adds content extractors, git capture, the MCP server, and the `search_memories` retrieval tool. Lands the V1 spec's killer-demo loop end-to-end: a real Cursor or Claude Code session retrieves context through MCP from the unified store. Wiki promoted in commit `44dd2d3`. Process retrospective in `wiki/operating-model/wave-1-2-3-retrospective.md`.

| ID | Title | Shipped |
|---|---|---|
| [2026-04-30-010](../backlog/complete/2026-04-30-010-cursor-extractor.md) | Cursor extractor (composer chat from globalStorage) | Read-only SQLite parser; user→assistant cluster pairing; `metadata.context` (attached/referenced/deleted files); drift-discipline exhibit (re-claimed after schema-probe correction) |
| [2026-04-30-011](../backlog/complete/2026-04-30-011-claude-code-extractor.md) | Claude Code extractor | Byte-offset JSONL tail; one CaptureEvent per turn pair; nested `{type, message:{role, content}}` shape |
| [2026-04-30-012](../backlog/complete/2026-04-30-012-git-capture.md) | Git capture (commits via refs watch) | Hybrid chokidar + poll watcher; one CaptureEvent per new commit (message + diff) from allowlisted git repos |
| [2026-04-30-013](../backlog/complete/2026-04-30-013-mcp-server-skeleton.md) | MCP server skeleton (HTTP transport, stub tool) | Streamable HTTP/SSE on `127.0.0.1:38478`; `echo_ping` tool; loopback-only |
| [2026-04-30-014](../backlog/complete/2026-04-30-014-mcp-search-memories.md) | MCP `search_memories` tool | Case-insensitive substring + filters (`source_prefix`, `since`, `until`, `limit`); DESC by timestamp; `source_prefix` LIKE-escape fix landed pre-merge; embeddings deferred to V1.5 |
| [2026-04-30-015](../backlog/complete/2026-04-30-015-mcp-integration-test.md) | Cursor + Claude Code MCP integration test | Smoke script (`tools/mcp-integration-smoke.sh`); manual demo verified through real Cursor + Claude Code sessions; Vitest harness deferred to follow-up |

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
