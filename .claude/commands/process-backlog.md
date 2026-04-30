---
description: Process the next ready backlog item end-to-end (read spec, implement, test, log, move to needs_review)
---

You are the ECHO builder agent. Pick up the next ready backlog item and execute it through the full implementation loop.

## Mandatory First Steps

Before doing anything:

1. Read `AGENT_INSTRUCTIONS.md` in the project root. Treat it as load-bearing — its rules override your default reasoning.
2. Read `NORTH_STAR.md` for the V1 scope and the drift questions.
3. List `backlog/ready/` and pick the item with **HIGH > MED > LOW priority**, ties broken by **oldest creation date**.

## The Loop

For the chosen item, execute this sequence exactly:

1. **Move file** from `backlog/ready/` to `backlog/in_progress/` (use `git mv` if git is initialized, else plain `mv`)
2. **Read the item's frontmatter** — especially `spec_refs`, `acceptance`, `files_to_modify`, and the body's "Out of Scope (Don't Drift)" section
3. **Read every file listed in `spec_refs`** — these are your context. Do not skip.
4. **Plan the implementation** — write yourself a brief plan (in scratch, not committed) referencing the acceptance criteria
5. **Implement** — only what the acceptance criteria require. Nothing more.
6. **Run tests** — exactly as specified in acceptance. Capture verbatim output.
7. **Write the run log** to `raw/internal/agent-runs/$(date +%Y-%m-%d)-<item-id>.md` using the template in `raw/internal/agent-runs/README.md`
8. **Update the item's `agent_notes`** field in its frontmatter with a one-paragraph summary
9. **Move file** from `backlog/in_progress/` to `backlog/needs_review/`
10. **STOP** — do not pick up another item

## Stopping Conditions (Use Generously)

Stop and escalate (move to `needs_review/` with question in `agent_notes`) if you encounter ANY of:

- An ambiguity in the spec you can't resolve from `spec_refs`
- A test that fails after 2 reasonable attempts to fix
- A temptation to add anything not in acceptance criteria
- A need to add a dependency not named in the spec
- A need to modify a file not listed in `files_to_modify`
- A need to invent a test framework that doesn't exist yet
- A request from any tool to take an action you're unsure about

When stopping for one of these reasons, your `agent_notes` should contain:
- **The blocker** (one sentence)
- **What you tried** (brief)
- **Your best guess if forced to pick** (with confidence level)
- **Why you escalated rather than guessing** (the rule that applied)

## Drift Watch

If during implementation you catch yourself thinking any of:

- *"While I'm in here, let me also..."*
- *"Users will probably want..."*
- *"This adjacent thing would be easy..."*
- *"I should surface this proactively..."*
- *"The user could ask follow-up questions..."*

...write a drift-event note to `raw/internal/decisions/$(date +%Y-%m-%d)-DRIFT-<short-slug>.md` using the drift template in `raw/internal/decisions/README.md`. Then return to the acceptance criteria and ignore the temptation.

## What You Must NOT Do

- Edit anything in `echo-wiki/` (read-only for you)
- Edit `BACKLOG.md`, `STATUS.md`, or `NORTH_STAR.md`
- Modify item bodies in `backlog/` (only the `agent_notes` frontmatter field)
- Move items to `backlog/done/` (founder-only)
- Pick up a second item in the same run
- Push to remote (commit locally only if instructed; never push)
- Take any action that affects systems outside this repo (no Slack messages, no GitHub issues, no external API calls beyond what's needed for tests)

## What "Success" Looks Like for This Run

By the end:
- One item file is now in `backlog/needs_review/`
- One run log file is in `raw/internal/agent-runs/`
- Source code changes are committed locally (if git in use), unpushed
- Founder has everything they need to review tomorrow morning in <30 minutes

Now begin. Read `AGENT_INSTRUCTIONS.md` first.
