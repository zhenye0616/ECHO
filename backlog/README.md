# Backlog System

Kanban-style work coordination across strategic conversations, one or more autonomous build agents, and founder review.

## The Three Roles

1. **Strategist (chat conversations)** — produces design decisions, captures specs as `backlog/ready/` items. Does **not** write to `echo-wiki/` until an item is shipped.
2. **Builder agent (autonomous, parallelizable)** — claims items from `backlog/ready/`, works in an isolated git worktree, moves items through the pipeline. Multiple agents may run in parallel.
3. **Founder (morning review)** — reviews items in `backlog/pending_review/`, merges branches, moves items to `complete/`, then asks the strategist to update the wiki.

## Wiki Update Discipline

The product wiki (`echo-wiki/`) reflects only **shipped reality**. The flow is:

```
[strategic conversation]
        │
        ▼
spec lives inside backlog item   ← single source of truth while in flight
        │
        ▼
agent ships item, item lands in backlog/complete/
        │
        ▼
strategist promotes the now-true decision to echo-wiki/
        │  (sources/, concepts/, entities/, analyses/ as appropriate)
        ▼
backlog item links to its wiki page; wiki page links back to the item
```

This makes spec/build divergence structurally impossible — the wiki cannot claim something that hasn't shipped, because no one writes to the wiki until after merge.

**Exception:** *operating-model* changes (this file, `CLAUDE.md`, `AGENT_INSTRUCTIONS.md`, the slash command) are not product decisions and do not pass through the backlog. They are updated immediately when the operating model changes.

## Folder Structure

```
backlog/
├── README.md            (this file)
├── ready/               # specced, agent can claim
├── claimed/             # agent has atomically claimed; in-progress
├── pending_review/      # agent done; awaits founder review + merge
└── complete/            # founder approved + merged; wiki update pending
```

## Item Lifecycle

```
[strategist]
     │
     ▼
ready/      ← agents poll this folder; oldest HIGH-priority item wins
     │
     ▼ (atomic claim: see below)
claimed/    ← agent owns it; works in its own worktree on agent/<slug> branch
     │
     ▼
pending_review/  ← agent done; founder reviews diff/tests/notes; merges PR
     │
     ├── approved → complete/  ← strategist promotes decisions to echo-wiki/ in next conversation
     └── rejected → back to ready/ with review_notes
```

## Atomic Claim (Multi-Agent Safe)

Two agents must never end up working the same item. The claim is **a single commit on `main`** that simultaneously:

1. Moves the file: `git mv backlog/ready/<item>.md backlog/claimed/<item>.md`
2. Sets frontmatter: `claimed_by: <agent-id>`, `claimed_at: <iso-timestamp>`, `branch: agent/<slug>`
3. Commits with message `claim: <item-id>`
4. Pushes to `origin/main`

If two agents race, one push is rejected. Loser pulls, picks the next ready item, retries. Window is small enough for solo founder + 2–3 agents that no extra locking is needed.

## Worktree Pattern

Each claimed item gets its own git worktree on its own feature branch. This keeps multiple agents from stepping on each other's working directories.

```
~/Desktop/echo_wiki/                            ← main repo, on main, owned by founder
~/Desktop/echo_wiki--<item-slug>/               ← agent worktree, on agent/<slug>
```

**Conventions:**

- **Worktree path:** `~/Desktop/echo_wiki--<item-slug>/` (sibling of main repo; double-dash disambiguates)
- **Branch name:** `agent/<item-slug>` (e.g., `agent/2026-04-30-001-capture-gate`)
- **Lifecycle commands** (agent runs these; the slash command wraps them):

```bash
# 1. Atomic claim (in main repo on main)
cd ~/Desktop/echo_wiki
git pull --rebase
git mv backlog/ready/<item>.md backlog/claimed/<item>.md
# (edit frontmatter: claimed_by, claimed_at, branch)
git add backlog/claimed/<item>.md
git commit -m "claim: <item-id>"
git push origin main

# 2. Create worktree on a fresh feature branch
git worktree add ~/Desktop/echo_wiki--<slug> -b agent/<slug>

# 3. Implement (in worktree, on feature branch)
cd ~/Desktop/echo_wiki--<slug>
# ... implementation, tests, commits ...
git push -u origin agent/<slug>

# 4. Move item to pending_review (back in main repo on main)
cd ~/Desktop/echo_wiki
git pull --rebase
git mv backlog/claimed/<item>.md backlog/pending_review/<item>.md
# (edit frontmatter: agent_notes summary, head_sha, pr_url if any)
git add backlog/pending_review/<item>.md
git commit -m "review: <item-id>"
git push origin main
```

**Two-directory pattern:** the agent does *backlog state changes* in the main repo on `main` (so all agents share consistent backlog state) and *code work* inside the worktree on the feature branch (so working directories never collide). The slash command handles this directory switching.

**Cleanup (founder, after merge):**

```bash
cd ~/Desktop/echo_wiki
git worktree remove ~/Desktop/echo_wiki--<slug>
git branch -d agent/<slug>
git push origin --delete agent/<slug>
git mv backlog/pending_review/<item>.md backlog/complete/<item>.md
git commit -m "complete: <item-id>"
```

A `tools/cleanup-worktrees.sh` script can automate the last block once we have it.

## Item File Format

Each item is one markdown file with frontmatter that's both human-readable and machine-actionable:

```markdown
---
id: 2026-04-30-001-capture-gate
title: Capture gate (sandbox chokepoint)
status: ready                     # ready | claimed | pending_review | complete
priority: HIGH                    # HIGH | MED | LOW
estimate: 0.5d
created: 2026-04-30
spec_refs:                        # files to read before working
  - (other backlog items, raw decision notes, or wiki pages that already exist)
acceptance:                       # specific, testable criteria
  - All capture data flows through one chokepoint function
  - Non-allowlisted sources rejected; rejections are logged
  - Tests cover accept + reject + malformed input
files_to_modify:                  # exhaustive list of code paths the agent may touch
  - src/capture/sources.ts
  - src/capture/gate.ts
  - tests/capture/*

# --- agent-managed fields (filled in during run) ---
claimed_by: ""                    # agent identifier
claimed_at: ""                    # ISO timestamp
branch: ""                        # agent/<slug>
worktree: ""                      # ~/Desktop/echo_wiki--<slug>
head_sha: ""                      # sha of last commit on branch
pr_url: ""                        # if PR opened
agent_notes: ""                   # summary on completion or escalation
review_notes: ""                  # founder fills during review
---

# [Title]

## What
[One-paragraph spec — this IS the canonical spec until the item ships.]

## Why
[Reference relevant raw decision notes or already-shipped wiki pages.]

## Acceptance Criteria
- [ ] [specific, testable]
- [ ] [specific, testable]

## Out of Scope (Don't Drift)
[Adjacent things the agent might be tempted to add — explicitly NOT in this item.]

## After Completion (Strategist Notes)
[Which wiki pages should be created or updated once this item is in complete/.
The strategist reads this section when promoting decisions to the wiki.]
```

## Agent Operating Rules

When an agent runs, it must:

1. **Pull latest `main`** in the main repo before claiming
2. **Atomically claim** an item per the section above (single commit on main)
3. **Create the worktree** on `agent/<slug>` from the just-pushed main
4. **Read all `spec_refs`** before writing any code — load context first
5. **Implement to acceptance criteria only** — no scope expansion (per drift rules)
6. **Log work** in `raw/internal/agent-runs/<date>-<item-id>.md` with what was implemented, decisions made, files modified, test results, open questions
7. **If uncertainty arises** that requires founder input — STOP, move item to `pending_review/` with the question in `agent_notes`. Do not guess.
8. **When acceptance criteria pass** — push branch, move item to `pending_review/`, fill `agent_notes` with summary
9. **One item per run.** Do not pick up a second item.

## Founder Review Process

Each morning:

1. Open `BACKLOG.md` — see all items in `pending_review/`
2. For each item:
   - Read the item file (acceptance + agent_notes)
   - Read the agent run log
   - Check out the feature branch / inspect the diff
   - Run tests locally
3. Decide:
   - **Approve** → fill `review_notes`, merge `agent/<slug>` to `main` (handle any conflicts manually), move item to `complete/`, remove worktree, delete branch
   - **Rework** → fill `review_notes` with what's wrong, move back to `ready/` (worktree + branch can stay or be torn down)
   - **Cancel** → move to `complete/` with `review_notes: "cancelled — <reason>"`
4. After items land in `complete/`, **request a wiki update** from the next strategist conversation. The strategist reads each item's "After Completion (Strategist Notes)" section and promotes the now-shipped decisions to `echo-wiki/`.

Time budget: ~30 minutes/morning if 2–3 items came through overnight.

## Drift Prevention in This System

The agent is more dangerous than the founder for drift, because it doesn't have the founder's gut. Three safeguards:

1. **Explicit "Out of Scope" section** in every item — names the adjacent things the agent might be tempted to add
2. **Required `spec_refs` reading** before any code is written
3. **Sandbox is enforced in code, not policy** (capture gate pattern; see the first sandbox item)

If the agent finds itself wanting to do something not in acceptance criteria: STOP, log the temptation in `raw/internal/decisions/` as a `drift-event`, leave the item in `claimed/` with a question in `agent_notes` and move it to `pending_review/`.

## Item Priority Conventions

- **HIGH** — on V1 critical path; week-by-week sequencing depends on it
- **MED** — parallel work that compounds (validation, extension, polish)
- **LOW** — nice-to-have; deferrable past V1

## Naming Convention

Filename: `YYYY-MM-DD-NNN-short-slug.md`

- Date prefix groups items by creation day
- NNN is a sequential ID per day
- Slug is human-readable and is reused for branch + worktree names

## When the Strategist (Chat) Adds Items

After any strategic conversation that lands an actionable decision:

1. **Create a `backlog/ready/<id>.md` item** — full spec lives here (this is the authoritative spec until the item ships)
2. **Add a row to `BACKLOG.md`'s Ready table**
3. **Do NOT touch `echo-wiki/`** — wiki updates happen only after the item lands in `complete/`

The wiki is for *what is shipped*. The backlog is for *what is in flight*. They connect via the item's "After Completion (Strategist Notes)" section once the item completes.
