# BACKLOG

**Kanban view of all active work.** Auto-orderable; each item is a file in `backlog/<status>/`.

> **System:** strategic decisions land in `echo-wiki/` (canonical truth). Implementation work lands in `backlog/ready/` (action queue). Agent picks from `ready/`, moves through `in_progress/` and `needs_review/`. Founder reviews and moves to `done/`. See [`backlog/README.md`](./backlog/README.md) for full workflow.

---

## 📥 Inbox (new items, not yet specced)

*Items added during conversation that need spec refinement before agent picks them up.*

*(none — add as we discuss)*

---

## 🔨 Ready (specced, agent can pick up)

| Priority | ID | Title | Spec Refs |
|---|---|---|---|
| HIGH | [001](./backlog/ready/2026-04-30-001-storage-architecture.md) | Storage architecture (append-only ledger) | [[local-daemon]] · [[v1-spec]] |
| HIGH | [002](./backlog/ready/2026-04-30-002-mcp-server-skeleton.md) | MCP server skeleton | [[mcp-server]] · [[v1-spec]] |
| HIGH | [003](./backlog/ready/2026-04-30-003-hotkey-overlay-scaffold.md) | Hotkey overlay scaffold (native macOS) | [[hotkey-overlay]] · [[clipboard-and-launch]] |
| MED  | [004](./backlog/ready/2026-04-30-004-landing-page.md) | Landing page + paid waitlist | [[validation-experiments]] · [[brand-promise]] |
| MED  | [005](./backlog/ready/2026-04-30-005-extension-onboarding-question.md) | Extension onboarding question | [[browser-extension]] · [[extension-funnel-logic]] |
| MED  | [006](./backlog/ready/2026-04-30-006-extension-v1-banner.md) | Extension V1 awareness banner | [[browser-extension]] · [[extension-funnel-logic]] |

---

## 🚧 In Progress (agent currently working)

*(empty — agent moves items here when started)*

---

## 👀 Needs Review (agent done, founder reviews)

*(empty — agent moves items here on completion; founder reviews each morning)*

---

## ✅ Done (reviewed and merged)

*(empty — first items will land here after week 1)*

---

## How to Read This Board

- **Priority HIGH** = on V1 critical path; week-3 substrate gate depends on it
- **Priority MED** = parallel work that compounds (validation, extension)
- **Priority LOW** = nice-to-have; deferrable
- Each item file has: status, spec refs, acceptance criteria, files affected, agent notes, review notes

## How to Add Work

During conversation:
1. Strategic decisions → update relevant `echo-wiki/` page
2. Implementation work that emerges from those decisions → create `backlog/ready/<date>-<id>-<slug>.md`
3. Add a row to this board's Ready table

The agent will pick up the next morning. Founder reviews `needs_review/` items before starting their day.

## How to Trigger the Agent

The builder agent is **Claude Code**, configured via the `/process-backlog` slash command in `.claude/commands/process-backlog.md`.

**Manual trigger** (for first-week validation):

```
/process-backlog
```

Inside Claude Code, opens the next ready item, runs the implementation loop, stops after one item.

**Scheduled trigger** (for steady-state):

See [`.claude/SETUP.md`](./.claude/SETUP.md) for cron / launchd / Claude Code's built-in scheduled-tasks setup. Recommended cadence: one run at 2 AM, founder reviews each morning.

**Operating manual:** [`AGENT_INSTRUCTIONS.md`](./AGENT_INSTRUCTIONS.md) — required reading for the agent on every run.
