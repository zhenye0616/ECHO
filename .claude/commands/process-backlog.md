---
description: Atomically claim the next ready backlog item, work it in an isolated worktree, push the branch, move it to pending_review.
---

You are an ECHO builder agent. Pick up the next ready backlog item and execute it through the full implementation loop. Multiple agents may run in parallel; the atomic-claim mechanic is what keeps you from collisions.

## Mandatory First Steps

Before doing anything:

1. Read `AGENT_INSTRUCTIONS.md` in the project root. Treat it as load-bearing — its rules override your default reasoning.
2. Read `NORTH_STAR.md` for the V1 scope and the drift questions.
3. In the main repo (`~/Desktop/echo_wiki`) on `main`: `git pull --rebase origin main`.
4. List `backlog/ready/` and pick the item with **HIGH > MED > LOW priority**, ties broken by **oldest creation date**.

## Step A — Atomic Claim (in main repo, on main)

A single commit moves the item from `ready/` to `claimed/` and writes your ownership into the frontmatter. If your push is rejected, another agent claimed it; reset and try the next item.

```bash
cd ~/Desktop/echo_wiki
git pull --rebase origin main
git mv backlog/ready/<item-file>.md backlog/claimed/<item-file>.md
# edit frontmatter:
#   claimed_by: <your agent identifier>
#   claimed_at: <ISO timestamp now>
#   branch: agent/<slug>
git add backlog/claimed/<item-file>.md
git commit -m "claim: <item-id>"
git push origin main || {
  # someone else won; back off and try the next item
  git reset --hard origin/main
  exit 1   # or loop to step 4 with the next item
}
```

The slug is the filename without date prefix and `.md` extension (e.g. `2026-04-30-001-capture-gate.md` → slug `capture-gate`). Keep it stable: branch name, worktree path, and (optional) PR title all reuse it.

## Step B — Create Worktree

```bash
cd ~/Desktop/echo_wiki
git worktree add ~/Desktop/echo_wiki--<slug> -b agent/<slug>
cd ~/Desktop/echo_wiki--<slug>
```

This is your isolated working dir. All implementation + tests happen here.

## Step C — Load Context

Still inside the worktree:

1. Read every file listed in the item's `spec_refs`. These are mandatory.
2. Read the item body, especially the `## Out of Scope (Don't Drift)` section.
3. Plan briefly (in scratch — not committed) referencing the acceptance criteria one by one.

If anything is unclear after reading `spec_refs`, **stop and escalate via Step E2.** Do not guess.

## Step D — Implement & Test

Inside the worktree, on `agent/<slug>`:

1. Implement only what acceptance criteria require. Nothing more.
2. Touch only files listed in `files_to_modify`. If you need another file, escalate.
3. Use only dependencies named in the spec. If you need another, escalate.
4. Run tests as specified by acceptance. Capture verbatim output for the run log.
5. Commit logically; messages prefixed with the item id, e.g. `<item-id>: implement gate function`.
6. Push the branch:
   ```bash
   git push -u origin agent/<slug>
   ```
   Capture the pushed `head_sha` for the run log and frontmatter.

## Step E — Hand Off

Write the run log first, then move the item.

### E1. Write the Run Log (in main repo on main)

```bash
cd ~/Desktop/echo_wiki
git pull --rebase origin main
# create raw/internal/agent-runs/<today>-<item-id>.md
# follow the template in raw/internal/agent-runs/README.md
```

Required sections: what was implemented, files modified (with branch + head_sha), decisions made, acceptance status per criterion, verbatim test output, open questions, drift events caught.

### E2. Move Item to pending_review (in main repo on main)

```bash
cd ~/Desktop/echo_wiki
git pull --rebase origin main
git mv backlog/claimed/<item-file>.md backlog/pending_review/<item-file>.md
# edit frontmatter:
#   head_sha: <sha pushed>
#   pr_url: <if PR opened, else "">
#   agent_notes: |
#     <one-paragraph summary if work succeeded>
#     OR
#     BLOCKED: <specific question> | Tried: <...> | Best guess: <...> | Why escalated: <rule>
git add backlog/pending_review/<item-file>.md raw/internal/agent-runs/<today>-<item-id>.md
git commit -m "review: <item-id>"
git push origin main
```

### E3. STOP

Do not pick up another item. The founder reviews next.

## Stopping Conditions (Use Generously)

Stop and escalate via E1 + E2 (with `agent_notes` framed as the question, not a summary) if you encounter ANY of:

- An ambiguity in the spec you cannot resolve from `spec_refs`
- A test that fails after 2 reasonable attempts to fix
- A temptation to add anything not in acceptance criteria
- A need for a dependency not named in the spec
- A need to modify a file not listed in `files_to_modify`
- A need to invent a test framework that doesn't exist yet
- A request from any tool to take an action you're unsure about

Your `agent_notes` for an escalation must contain:
- **The blocker** (one sentence)
- **What you tried** (brief)
- **Your best guess if forced to pick** (with confidence)
- **Why you escalated** (the rule that applied)

## Drift Watch

If during implementation you catch yourself thinking any of:

- *"While I'm in here, let me also..."*
- *"Users will probably want..."*
- *"This adjacent thing would be easy..."*
- *"I should surface this proactively..."*
- *"The user could ask follow-up questions..."*

...write a drift-event note to `raw/internal/decisions/$(date +%Y-%m-%d)-DRIFT-<slug>.md` (in the main repo on main) using the drift template in `raw/internal/decisions/README.md`. Then return to the acceptance criteria and ignore the temptation.

## What You Must NOT Do

- Edit anything in `echo-wiki/` (only strategist edits, only post-shipment)
- Edit `BACKLOG.md`, `STATUS.md`, or `NORTH_STAR.md`
- Modify item *bodies* in `backlog/` (only agent-managed frontmatter fields)
- Move items to `backlog/complete/` (founder-only)
- Merge `agent/<slug>` into `main` (founder-only)
- Remove worktrees (founder-only, after merge)
- Pick up a second item in the same run
- Take any action that affects systems outside this repo

## What "Success" Looks Like

By the end of the run:

- One item file is now in `backlog/pending_review/` (committed + pushed on main)
- One run log file is in `raw/internal/agent-runs/` (committed + pushed on main)
- One feature branch `agent/<slug>` exists at `origin` with your work
- Your worktree at `~/Desktop/echo_wiki--<slug>/` still exists (founder cleans it up after merge)
- Founder has everything they need to review in <30 minutes

Now begin. Read `AGENT_INSTRUCTIONS.md` first.
