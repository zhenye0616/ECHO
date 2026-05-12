# BACKLOG

**Kanban view of all active work.** Auto-orderable; each item is a file in `backlog/<status>/`.

> **System:** the spec for any in-flight item lives inside the item file in `backlog/ready/` — the wiki is **not** updated at decision time. Agents claim items from `ready/`, work on a feature branch in their own worktree, and move items through `claimed/` and `pending_review/`. Founder merges and moves to `complete/`. The strategist promotes shipped decisions to `wiki/` only after items land in `complete/`. See [`backlog/README.md`](./backlog/README.md) for the full workflow.

---

## 📥 Inbox (new items, not yet specced)

*Items added during conversation that need spec refinement before agents can claim them.*

*(none — add as we discuss)*

---

## 🔨 Ready (specced, agents may claim)

*029, 030, 032, 033 all shipped 2026-05-10 — see `backlog/complete/`. V1.6 friction-revisit (2026-05-10) opened 6 successor items; this row tracks the smallest-first per Codex pushback #5 sequencing.*

| Priority | ID | Title | Estimate | Notes |
|---|---|---|---|---|
| HIGH | [2026-05-10-034-cursor-capture-coverage](../backlog/ready/2026-05-10-034-cursor-capture-coverage.md) | Cursor capture coverage — mid-stream bubble cadence + tool-call bubble parsing (M1-1 sub-gaps A+B) | 1.5-2d | Capture-layer gaps. R1+R2 cross-tool review complete (Codex + Cursor, 16 findings dispositioned over 2 rounds, both reviewers' verdicts: claimable). Builder: **Cursor's Claude** per Cursor-domain delegation pattern. |
| HIGH | [2026-05-10-035-tail-session-repo-scoping](../backlog/ready/2026-05-10-035-tail-session-repo-scoping.md) | `tail_session` repo-scoping for Cursor — workspace-aware MRU resolution (M1-1 sub-gap C) | 0.5-1d | Read-side resolver fix. M1-1 sub-gap C fired live 4 times today during 034's own R1+R2 review cycles. Adds `repo_path` parameter to `tail_session` + `QueryFilter.metadata_match` storage extension + workspace.json resolver. Specced in parallel with 034 implementation per founder direction 2026-05-10 22:55 PDT. Builder: any agent (pure MCP-resolver + storage work, not Cursor-domain specific). |
| HIGH | [2026-05-11-036-cursor-multicluster-continuation](../backlog/ready/2026-05-11-036-cursor-multicluster-continuation.md) | Cursor multi-cluster continuation capture — stop silently dropping post-checkpoint assistant bubbles (M1-1 sub-gap D) | 1-1.5d | Closes the V1.5.7 silent fast-forward gap surfaced by 034 AC4 dogfooding on composer 4f02b335 (15 / 26 assistant bubbles dropped, 47.6% capture rate). Emits continuation atoms (Option A from `_followups.md`) carrying `metadata.is_continuation` + `metadata.continuation_of_assistant_bubble_id` join key. Single-file extractor change in `extractCursorTurns`; new shape extends `CursorTurn` interface. Builder: **Cursor's Claude** per Cursor-domain delegation pattern (also acceptable: any agent — pure extractor logic). |
| HIGH | [2026-05-11-037-work-artifact-repo-scoping](../backlog/ready/2026-05-11-037-work-artifact-repo-scoping.md) | Work-artifact (repo) scoping end-to-end — `repo_path` first-class across capture + storage + 4 retrieval tools (RC1) | 1-1.5d | Closes RC1 from today's 3-way (CC + Codex + Cursor) cross-tool root-cause investigation. End-to-end: Cursor extractor writes `metadata.repo_root` (closes 035 freshness gap properly); `repo_root` added to `METADATA_MATCH_KEY_WHITELIST`; `repo_path` parameter uniform across `search_memories`, `find_clusters`, `wait_for_new_turns`, `tail_session` (generalized off Cursor-only branch). 3-way consensus on diagnosis + spec shape; see journal 2026-05-11 14:46/14:56/15:04/15:26 PDT. Builder: any agent. |
| HIGH | [2026-05-11-038-mcp-toolkit-atomicity-refactor](../backlog/ready/2026-05-11-038-mcp-toolkit-atomicity-refactor.md) | MCP toolkit atomicity refactor — subtractive surface reform (RC2) | 1.5-2d | Closes RC2 from today's 3-way investigation. **blocked_by 037.** Adds `echo_resolve_mru` (IDs-only resolver primitive). KILLS `tail_session` (subsumed by `search_memories(source_prefix=X, limit=N)` reverse-chrono + `echo_resolve_mru` composition) and `recent_work_context` (absorbs 031 gated removal — gate well-open since 030 shipped). Unbundles `wait_for_new_turns` bodies (IDs-only contract). DRYs `exclude_metadata_surface: ['fs']` (4 sites → 1 helper). NO renames of `get_atom` / `get_atoms` (Codex round-3 evidence: `get_atom` is the only verbatim path — `get-atom.ts:139`). Net surface 8 → 7 tools (subtractive — matches founder's `v15_cleanup_pause` framing). 4-round strategist convergence on Option D (Cursor) + Codex's `get_atom` save + Cursor's `recent_work_context` fold-in; see journal 2026-05-11 ~16:18-16:40 PDT. Builder: any agent (pure MCP-server refactor; largest risk is the find_clusters / recent_work_context untangle in AC3). |
| HIGH | [2026-05-11-039-cross-tool-review-dispatch-queue](../backlog/ready/2026-05-11-039-cross-tool-review-dispatch-queue.md) | Cross-tool review dispatch queue — file-backed protocol; founder out of dispatch loop (RC1) | 1-1.5d | Operating-model item, not substrate. Removes founder-as-dispatch-layer between Claude (strategist) + Codex + Cursor on R1→R_final spec-review cycles. Codex 039 RC1 recommendation (atom `2a7f7f9b`, 2026-05-11 23:25 PDT) sharpens Claude's diagnosis: file-backed durable queue at `backlog/reviews/<item>/r<N>/{request,codex,cursor,combined}.md`; pull-based polling via `/loop` only (push-based pinging explicitly rejected); journal stays observation-only (never the message bus). Founder gate shrinks to judgment + `git push origin main`. **Bootstrap moment:** 039 itself goes through one last manual-dispatch R1 cycle; item 040+ uses the queue. Builder: any agent (pure protocol + helper scripts + slash-command prompts). |

*V1.6 successor items map (post-030 friction revisit, 2026-05-10): (1) 029 follow-ups [`_followups.md:127-138`], (2) ✅ **032 M2 reliability** — shipped, (3) ✅ **033 full-atom recovery** — shipped, (4) **034 Cursor capture coverage** — M1-1 sub-gaps A+B, in flight, (5) **035 tail_session repo-scoping** — M1-1 sub-gap C, specced in parallel, (6) hotkey overlay vertical slice, (7) search-ranking / verdict-turn finding (M1-2, **the hardest — saved till the end** per founder direction 2026-05-10 20:08 PDT), (8) subagent dispatch compact/pagination, (9) token-count enrichment per-extractor, (10) 031 deprecation [gated on ≥1 week post-034+035 dogfooding].*

*V2 territory (Wave 4): GitHub adapter, Slack adapter, browser extension upgrade, audit page. Out of scope for V1 per 2026-05-10 founder scope reset.*

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

**V1.5 — trace + retrieval reliability + envelope discipline.** Items 016–023 + 025–028 land the recent-work-context tool, edge filtering, open-loop hint resolution, cross-gap reconstruction, the V1.5.2 reliability bundle, the chokidar flake quarantine, MCP best-practices, the `tail_session` tool, stateless transport, and the `format:'skeleton'` envelope mode. Wiki promotion pending.

| ID | Title | Shipped |
|---|---|---|
| [2026-05-06-016](../backlog/complete/2026-05-06-016-read-time-normalizer.md) | Read-time normalizer (capture → normalized atom) | Per-source adapters; deterministic normalization; provenance preserved |
| [2026-05-06-018](../backlog/complete/2026-05-06-018-recent-work-context-tool.md) | `get_recent_work_context` MCP tool | Cluster-shape retrieval; artifact-graph edges; rank/label heuristics |
| [2026-05-07-019](../backlog/complete/2026-05-07-019-trace-edge-filter-and-format.md) | Trace edge-filter + format projection | `cluster.edges[]` filtered to signal-bearing pairs; `format:'minimal'` clip |
| [2026-05-07-020](../backlog/complete/2026-05-07-020-open-loop-resolution-heuristics.md) | Open-loop hint resolution heuristics | `open_loop_hints[].resolved` heuristic with founder-validation pass |
| [2026-05-07-021](../backlog/complete/2026-05-07-021-trace-cross-gap-where-left-off.md) | Cross-gap "where did I leave off" reconstruction | Window-spanning trace; asc-order storage consumer |
| [2026-05-08-022](../backlog/complete/2026-05-08-022-v15-2-trace-retrieval-reliability.md) | V1.5.2 trace + retrieval reliability bundle | Timestamp UTC-Z canonicalization + 152-row migration; storage-cap warning; fs-watcher noise filter; filter-before-slice fix; description clarification; TZ-marker regex broadening |
| [2026-05-08-023](../backlog/complete/2026-05-08-023-chokidar-flake-quarantine.md) | Chokidar flake quarantine | `describe.skip` on `cursor.test.ts` + `daemon/lifecycle.test.ts` flaky blocks; tracking comments; 3 consecutive clean runs |
| [2026-05-08-024](../backlog/complete/2026-05-08-024-fs-watcher-test-quarantine-successor.md) | fs-watcher.test.ts quarantine successor | `describe.skip` on the `startFsWatcher` block; closes the third flaky-test carry-over from item 014 |
| [2026-05-08-025](../backlog/complete/2026-05-08-025-mcp-best-practices.md) | V1.5.3 MCP best-practices bundle | `outputSchema` + `structuredContent` on all tools; `source_app` enum; cost-safer defaults; composite cursor pagination; `readOnlyHint` |
| [2026-05-08-026](../backlog/complete/2026-05-08-026-tail-session-tool.md) | `tail_session` MCP tool | Cheap exact-fetch primitive; `source` or `source_app`; default count=5, max 20 |
| [2026-05-08-027](../backlog/complete/2026-05-08-027-mcp-stateless-transport.md) | MCP stateless transport | `sessionIdGenerator: undefined` + JSON response mode; eliminates stale-session failures after daemon restart |
| [2026-05-08-028](../backlog/complete/2026-05-08-028-rwc-envelope-skeleton-format.md) | `format:'skeleton'` envelope mode | Strips uncapped sub-collections; realistic-density acceptance test; default minimal unchanged |

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
