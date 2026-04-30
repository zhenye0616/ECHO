# BACKLOG

**Kanban view of all active work.** Auto-orderable; each item is a file in `backlog/<status>/`.

> **System:** strategic decisions land in `echo-wiki/` (canonical truth). Implementation work lands in `backlog/ready/` (action queue). Agent picks from `ready/`, moves through `in_progress/` and `needs_review/`. Founder reviews and moves to `done/`. See [`backlog/README.md`](./backlog/README.md) for full workflow.

---

## 📥 Inbox (new items, not yet specced)

*Items added during conversation that need spec refinement before agent picks them up.*

*(none — add as we discuss)*

---

## 🔨 Ready (specced, agent can pick up)

*(empty — add items as they emerge from strategic conversations)*

| Priority | ID | Title | Spec Refs |
|---|---|---|---|
| | | | |

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
