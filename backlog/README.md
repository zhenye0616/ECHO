# Backlog System

Kanban-style work coordination across strategic conversations, one or more autonomous build agents, and founder review.

## The Three Roles

1. **Strategist (chat conversations)** — produces design decisions, captures specs as `backlog/ready/` items. Does **not** write to `wiki/` until an item is shipped.
2. **Builder agent (autonomous, parallelizable)** — claims items from `backlog/ready/`, works in an isolated git worktree, moves items through the pipeline. Multiple agents may run in parallel.
3. **Founder (morning review)** — reviews items in `backlog/pending_review/`, merges branches, moves items to `complete/`, then asks the strategist to update the wiki.

## Wiki Update Discipline

The product wiki (`wiki/`) reflects only **shipped reality**. The flow is:

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
strategist promotes the now-true decision to wiki/
        │  (sources/, concepts/, entities/, analyses/ as appropriate)
        ▼
backlog item links to its wiki page; wiki page links back to the item
```

This makes spec/build divergence structurally impossible — the wiki cannot claim something that hasn't shipped, because no one writes to the wiki until after merge.

**Exception:** *operating-model* changes (this file, `CLAUDE.md`, `docs/AGENT_INSTRUCTIONS.md`, the slash command) are not product decisions and do not pass through the backlog. They are updated immediately when the operating model changes.

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
     ├── approved → complete/  ← strategist promotes decisions to wiki/ in next conversation
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
~/Desktop/Project_echo/                            ← main repo, on main, owned by founder
~/Desktop/Project_echo--<item-slug>/               ← agent worktree, on agent/<slug>
```

**Conventions:**

- **Worktree path:** `~/Desktop/Project_echo--<item-slug>/` (sibling of main repo; double-dash disambiguates)
- **Branch name:** `agent/<item-slug>` (e.g., `agent/2026-04-30-001-capture-gate`)
- **Lifecycle commands** (agent runs these; the slash command wraps them):

```bash
# 1. Atomic claim (in main repo on main)
cd ~/Desktop/Project_echo
git pull --rebase
git mv backlog/ready/<item>.md backlog/claimed/<item>.md
# (edit frontmatter: claimed_by, claimed_at, branch)
git add backlog/claimed/<item>.md
git commit -m "claim: <item-id>"
git push origin main

# 2. Create worktree on a fresh feature branch
git worktree add ~/Desktop/Project_echo--<slug> -b agent/<slug>

# 3. Implement (in worktree, on feature branch)
cd ~/Desktop/Project_echo--<slug>
# ... implementation, tests, commits ...
git push -u origin agent/<slug>

# 4. Move item to pending_review (back in main repo on main)
cd ~/Desktop/Project_echo
git pull --rebase
git mv backlog/claimed/<item>.md backlog/pending_review/<item>.md
# (edit frontmatter: agent_notes summary, head_sha, pr_url if any)
git add backlog/pending_review/<item>.md
git commit -m "review: <item-id>"
git push origin main
```

**Two-directory pattern:** the agent does *backlog state changes* in the main repo on `main` (so all agents share consistent backlog state) and *code work* inside the worktree on the feature branch (so working directories never collide). The slash command handles this directory switching.

## Idempotency Guarantees (At-Least-Once + Safe Retry)

The system is designed so a crashed run, a re-run, or a network glitch mid-push converges to one coherent state — not corruption. The goal is **at-least-once execution with safe retries**, not exactly-once (which is impossible when an agent can crash between push and acknowledgement).

### What we guarantee strongly

- **At-most-one claim per item.** The atomic claim commit + push-rejection-on-race makes it impossible for two agents to both end up owning the same item.
- **Single source of truth for an item's stage.** Git enforces that the file lives in exactly one of `ready/`, `claimed/`, `pending_review/`, `complete/` at any time.

### What the agent loop must do to make the rest safe

Every agent run starts with **reconciliation**, not a fresh claim:

```bash
# Persona-based agent identity — stable across crashes, unique per machine/user
AGENT_ID="${ECHO_AGENT_ID:-$(hostname)-$USER}"

cd ~/Desktop/Project_echo
git pull --rebase origin main

# Look for any unfinished claim by this agent
EXISTING=$(grep -l "^claimed_by: \"$AGENT_ID\"" backlog/claimed/*.md 2>/dev/null | head -1)

if [ -n "$EXISTING" ]; then
  echo "Resuming previous claim: $EXISTING"
  # skip the claim step; jump to worktree-reuse
else
  # normal claim flow
fi
```

This turns a crashed run from "permanent orphan in `claimed/`" into "resumed automatically on next invocation."

**Worktree creation must be detect-and-reuse**, not unconditional:

```bash
if [ -d "$WORKTREE" ]; then
  cd "$WORKTREE" && git checkout "agent/$SLUG"
elif git show-ref --verify --quiet "refs/heads/agent/$SLUG"; then
  git worktree add "$WORKTREE" "agent/$SLUG"
elif git ls-remote --exit-code origin "agent/$SLUG" >/dev/null 2>&1; then
  git fetch origin "agent/$SLUG:agent/$SLUG"
  git worktree add "$WORKTREE" "agent/$SLUG"
else
  git worktree add "$WORKTREE" -b "agent/$SLUG"
fi
```

**Stage moves must be upserts**, not assumed-from-stage moves:

```bash
ensure_stage() {
  local item="$1" target="$2"
  local current
  current=$(ls backlog/*/"$item" 2>/dev/null | head -1)
  [ -z "$current" ] && { echo "ERROR: $item not found"; return 1; }
  [ "$current" = "backlog/$target/$item" ] && return 0   # already there — no-op
  git mv "$current" "backlog/$target/$item"
}
```

This makes "move to `pending_review/`" safe to call when the file is already there from a previous attempt.

**Run logs append on re-run.** If `raw/internal/agent-runs/<date>-<item-id>.md` already exists from a prior partial attempt, the agent appends a `## Run N (resumed at <iso-timestamp>)` section rather than overwriting. The log becomes a complete history of every attempt — better forensics, no data loss.

### Agent persona convention

`claimed_by` identifies a long-lived agent identity (an installation), not a single invocation:

- Default: `$(hostname)-$USER`
- Override via `ECHO_AGENT_ID` env var when running multiple agents on the same machine
- Two simultaneous agents must use distinct personas (otherwise reconciliation can mis-resume)

The atomic claim still saves us if two agents accidentally share a persona — the second push is rejected. The persona is just the resumption signal.

### Stale-claim detection (founder, manual for now)

A claim more than ~6 hours old with no progress is probably abandoned (agent crashed and is not coming back). Founder check:

```bash
for f in backlog/claimed/*.md; do
  ts=$(grep '^claimed_at:' "$f" | cut -d'"' -f2)
  age=$(( $(date +%s) - $(date -d "$ts" +%s) ))
  [ "$age" -gt 21600 ] && echo "STALE: $f (claimed $ts, ${age}s ago)"
done
```

To release a stale claim manually:

```bash
git mv backlog/claimed/<item>.md backlog/ready/<item>.md
# clear claimed_by, claimed_at, branch in frontmatter
git worktree remove ~/Desktop/Project_echo--<slug> 2>/dev/null
git branch -D agent/<slug> 2>/dev/null
git push origin --delete agent/<slug> 2>/dev/null
git commit -am "release: <item-id>"
git push origin main
```

A `tools/check-stale-claims.sh` and a `/release-stuck` slash command will land once we've actually run the loop a few times and seen what real failures look like. Lease/heartbeat auto-recovery is V1.5+.

**Cleanup (founder, after merge):**

```bash
cd ~/Desktop/Project_echo
git worktree remove ~/Desktop/Project_echo--<slug>
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
spec_refs:                        # files to read before working (in addition to the four mandatory reads)
  - (other backlog items, raw decision notes, or wiki pages that already exist)
blocked_by: []                    # other item IDs that must be in backlog/complete/ before this can be claimed
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
worktree: ""                      # ~/Desktop/Project_echo--<slug>
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

1. **Read mandatory global context** — every run, in order:
   - `docs/AGENT_INSTRUCTIONS.md` — operating manual
   - `docs/NORTH_STAR.md` — daily orient + drift questions
   - `wiki/concepts/drift-prevention.md` — canonical drift doctrine
   - `wiki/sources/v1-spec.md` — locked V1 spec

   The entire `wiki/` folder is the agent's global context — readable on demand. The item's `spec_refs` is *additional* per-item context, not a substitute.
2. **Pull latest `main`** in the main repo
3. **Reconcile** — check `backlog/claimed/` for an existing claim by this persona; resume it if found
4. **Select** — run `python3 tools/blocked.py` to get the next claimable item path
   - Exit 0: stdout has the path of the next unblocked, highest-priority, oldest item
   - Exit 1: no unblocked work; stop cleanly
   - Exit 2: validation failed (dangling `blocked_by`, cycle, malformed frontmatter, duplicate id, bad priority, id/filename mismatch); stop and surface the error
   - **Do NOT filter manually.** The script is the deterministic enforcement of `blocked_by`; the agent's job is to call it, not to re-implement the rule. See `tools/blocked.py` for the selection logic and `tools/test_blocked.py` for the test surface (17 cases including dangling refs, cycles, partial dependency satisfaction, priority/date ordering)
4. **Create-or-reuse the worktree** on `agent/<slug>` (idempotent — see Idempotency Guarantees)
5. **Read all `spec_refs`** in the item before writing any code
6. **Implement to acceptance criteria only** — no scope expansion (per drift rules)
7. **Log work** in `raw/internal/agent-runs/<date>-<item-id>.md` (append on resume, do not overwrite)
8. **If uncertainty arises** that requires founder input — STOP, move item to `pending_review/` with the question in `agent_notes`. Do not guess.
9. **When acceptance criteria pass** — push branch, `ensure_stage` to `pending_review/`, fill `agent_notes` with summary
10. **One item per run** when invoked via `/process-backlog`. The `/process-backlog-batch` command wraps the same workflow in a controlled loop and ships multiple items sequentially within one session, halting on max-items, time budget, escalation, no-candidates, or git error. Parallelism across agents is achieved by running multiple sessions with distinct `ECHO_AGENT_ID` — the atomic-claim mechanic prevents collisions.

## Founder Review Process

Each morning:

1. Open `docs/BACKLOG.md` — see all items in `pending_review/`
2. For each item:
   - Read the item file (acceptance + agent_notes)
   - Read the agent run log
   - Check out the feature branch / inspect the diff
   - Run tests locally
3. Decide:
   - **Approve** → fill `review_notes`, merge `agent/<slug>` to `main` (handle any conflicts manually), move item to `complete/`, remove worktree, delete branch
   - **Rework** → fill `review_notes` with what's wrong, move back to `ready/` (worktree + branch can stay or be torn down)
   - **Cancel** → move to `complete/` with `review_notes: "cancelled — <reason>"`
4. After items land in `complete/`, **request a wiki update** from the next strategist conversation. The strategist reads each item's "After Completion (Strategist Notes)" section and promotes the now-shipped decisions to `wiki/`.

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
2. **Add a row to `docs/BACKLOG.md`'s Ready table**
3. **Do NOT touch `wiki/`** — wiki updates happen only after the item lands in `complete/`

The wiki is for *what is shipped*. The backlog is for *what is in flight*. They connect via the item's "After Completion (Strategist Notes)" section once the item completes.

## Spec Authoring Lessons

Things learned the hard way, accumulated as the project runs. Revisit when authoring similar items.

### Bootstrap items must include the runtime's first-party type/util packages

When authoring a bootstrap or scaffolding item for a new language/runtime, include the runtime's official type packages in `acceptance` and `files_to_modify` **even if the smoke test does not exercise them**. Otherwise the bootstrap ships clean (smoke test passes, typecheck passes), the next item that uses real runtime APIs hits a missing-types failure, and the agent escalates per drift rule 3 (no new deps without sign-off) — pure ceremony for a known-required package. For the TS/Node stack specifically: `@types/node` belongs in the bootstrap. Pattern: the smoke test's job is to prove the substrate compiles, but a green smoke test does NOT prove the substrate is ready for downstream consumption. Author bootstrap acceptance with downstream items in mind. *(Source: 2026-04-30 002-logger escalation; gap inherited from 001-repo-bootstrap.)*
