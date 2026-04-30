# Backlog System

Kanban-style work coordination between strategic conversations, an autonomous build agent, and founder review.

## The Three Roles

1. **Strategist (chat conversations)** — produces design decisions; updates `echo-wiki/` with canonical decisions; produces `backlog/ready/` items as actionable work emerges
2. **Builder agent (autonomous, overnight)** — picks items from `backlog/ready/`, implements them, logs work, moves items through the pipeline
3. **Founder (morning review)** — reviews items in `backlog/needs_review/`, approves to `done/` or sends back to `ready/`

## Folder Structure

```
backlog/
├── README.md            (this file)
├── ready/               # specced, agent can pick up
├── in_progress/         # agent is currently working on this
├── needs_review/        # agent done, awaits founder review
└── done/                # reviewed and merged
```

## Item Lifecycle

```
[conversation]
     │
     ▼
ready/      ← agent picks up oldest HIGH-priority item
     │
     ▼
in_progress/  ← agent is working; logs to raw/internal/agent-runs/
     │
     ▼
needs_review/  ← agent done, founder reviews diff/tests/notes
     │
     ├── approved → done/
     └── rejected → back to ready/ with review_notes
```

## Item File Format

Each item is one markdown file with frontmatter that's both human-readable and machine-actionable:

```markdown
---
id: 2026-04-30-001-storage-architecture
title: Storage architecture (append-only ledger)
status: ready
priority: HIGH
estimate: 1d
created: 2026-04-30
spec_refs:
  - echo-wiki/entities/local-daemon.md
  - echo-wiki/sources/v1-spec.md
acceptance:
  - SQLite schema for append-only event ledger
  - Source-attributed entries (source, timestamp, content, embedding)
  - Test suite covering insert / query / restart durability
files_to_modify:
  - src/daemon/storage/*
  - tests/storage/*
agent_notes: ""    # agent fills in during work
review_notes: ""   # founder fills in during review
---

# [Title]

## What
[One-paragraph spec]

## Why
[Reference relevant wiki concepts]

## Acceptance Criteria
- [ ] [specific, testable]
- [ ] [specific, testable]

## Constraints
[Drift-prevention reminders, references to drift-prevention.md]

## Out of Scope (Don't Drift)
[Adjacent things the agent might be tempted to add — explicitly NOT in this item]
```

## Agent Operating Rules

When the agent picks up an item, it must:

1. **Read all `spec_refs` first** — load wiki context before writing any code
2. **Move item from `ready/` to `in_progress/`** — atomic, one item at a time
3. **Implement to acceptance criteria** — no scope expansion (per [[drift-prevention]])
4. **Log work** in `raw/internal/agent-runs/<date>-<item-id>.md` with:
   - What was implemented
   - Decisions made along the way (especially anything not pre-specified)
   - Files created/modified (with diff summary)
   - Test results
   - Open questions for founder review
5. **If uncertainty arises** that requires founder input — STOP, move item to `needs_review/` with a clear question in `agent_notes`. Do not guess.
6. **When acceptance criteria pass** — move item to `needs_review/`, fill `agent_notes` with summary

## Founder Review Process

Each morning:

1. Open `BACKLOG.md` — see all items in `needs_review/`
2. For each item:
   - Read the item file (acceptance criteria + agent_notes)
   - Read the agent run log
   - Inspect the diff
   - Run tests locally if not already done
3. Decide:
   - **Approve** → fill `review_notes`, move to `done/`
   - **Rework** → fill `review_notes` with what's wrong, move back to `ready/`
   - **Defer / cancel** → move to `done/` or delete with note

Time budget: ~30 minutes/morning if 2-3 items came through overnight.

## Drift Prevention in This System

The agent is more dangerous than the founder for drift, because it doesn't have the founder's gut. Two safeguards:

1. **Explicit "Out of Scope" section** in every item — names the adjacent things the agent might be tempted to add
2. **Required wiki context reading** — agent must read `spec_refs` (which include drift-prevention concepts) before acting

If the agent finds itself wanting to do something not in acceptance criteria: STOP, log the temptation in `raw/internal/decisions/` as a `drift-event`, leave item in `in_progress/` with a question for the founder.

## Item Priority Conventions

- **HIGH** — on V1 critical path; week-by-week sequencing depends on it
- **MED** — parallel work that compounds (validation, extension, polish)
- **LOW** — nice-to-have; deferrable past V1

## Naming Convention

Filename: `YYYY-MM-DD-NNN-short-slug.md`

- Date prefix groups items by creation day
- NNN is a sequential ID per day
- Slug is human-readable

## When the Strategist (Chat) Should Add Items

After any strategic conversation that lands an actionable decision:

1. **Update `echo-wiki/`** — canonical decision lives here (sources/, concepts/, entities/, analyses/)
2. **Add backlog items to `backlog/ready/`** — implementation work derived from the decision
3. **Update `BACKLOG.md`** — add row to the Ready table

The wiki is for *what was decided*. The backlog is for *what will be built*. They connect via `spec_refs`.
