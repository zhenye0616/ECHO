# BACKLOG

**Kanban view of all active work.** Auto-orderable; each item is a file in `backlog/<status>/`.

> **System:** the spec for any in-flight item lives inside the item file in `backlog/ready/` — the wiki is **not** updated at decision time. Agents claim items from `ready/`, work on a feature branch in their own worktree, and move items through `claimed/` and `pending_review/`. Founder merges and moves to `complete/`. The strategist promotes shipped decisions to `echo-wiki/` only after items land in `complete/`. See [`backlog/README.md`](./backlog/README.md) for the full workflow.

---

## 📥 Inbox (new items, not yet specced)

*Items added during conversation that need spec refinement before agents can claim them.*

*(none — add as we discuss)*

---

## 🔨 Ready (specced, agents may claim)

The first foundation set — five items establishing the substrate skeleton. Item 001 is the only initially-claimable item; 002 / 003 / 005 unblock when 001 lands; 004 unblocks when 002 + 003 + 005 all land.

| Priority | ID | Title | Blocked By |
|---|---|---|---|
| HIGH | [2026-04-30-001](./backlog/ready/2026-04-30-001-repo-bootstrap.md) | Repo bootstrap (TS/Node + Vitest + ESLint + Prettier) | — |
| HIGH | [2026-04-30-002](./backlog/ready/2026-04-30-002-logger.md) | Logger module (structured, source-attributed) | 001 |
| HIGH | [2026-04-30-003](./backlog/ready/2026-04-30-003-capture-allowlist.md) | Capture allowlist (sources.ts) | 001 |
| HIGH | [2026-04-30-004](./backlog/ready/2026-04-30-004-capture-gate.md) | Capture gate (chokepoint pure function) | 002, 003, 005 |
| HIGH | [2026-04-30-005](./backlog/ready/2026-04-30-005-storage-interface.md) | Storage interface + in-memory impl | 001 |

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

*(empty — first items land here after week 1)*

| ID | Title | Wiki Pages To Update |
|---|---|---|
| | | |

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
3. Do **not** touch `echo-wiki/` — wiki updates happen only after the item lands in `complete/`

When items land in `complete/`, the next strategist conversation reads each item's "After Completion (Strategist Notes)" section and promotes the shipped decisions into `echo-wiki/`.

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

**Operating manual:** [`AGENT_INSTRUCTIONS.md`](./AGENT_INSTRUCTIONS.md) — required reading for every agent on every run.
