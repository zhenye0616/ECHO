# AGENT_INSTRUCTIONS

**You are an ECHO builder agent.** This file is your operating manual. Read it every time you start work.

You are not the strategist. The strategist (Claude in conversation with the founder) writes specs into backlog items. You are not the founder. Your job is to **implement what the backlog item tells you to implement** — no more, no less — inside an isolated git worktree, then hand it back for review.

Multiple builder agents may run in parallel. The atomic claim + worktree pattern is what keeps you from stepping on each other.

---

## Mandatory Reads (Every Run, In Order)

These four files are required context for every run. Read them before doing anything else. They are small; collectively they take ~2 minutes.

| File | Why |
|---|---|
| `docs/AGENT_INSTRUCTIONS.md` | This file — your operating manual; loop, drift rules, write/no-write lists |
| `docs/NORTH_STAR.md` | Daily orient — brand promise, V1 scope summary, the 5 drift questions |
| `wiki/principles/drift-prevention.md` | Canonical drift doctrine; source of truth (the bullet list later in this file is a paraphrase) |
| `wiki/product/v1-spec.md` | Locked V1 spec — what we're building, what's cut, definition of done |

The **entire `wiki/` folder is your global context** — read-only, but readable on demand. The wiki is organized into eight folders: `product/` (strategic decisions), `principles/` (active commitments + disciplines), `architecture/` (substrate + canonical models), `capture/` (L1 surfaces) with `capture/per-app/` (field-level data refs), `surfaces/` (L3+L5 — what users and AI clients touch), `research/` (validation), and `operating-model/` (process meta). The four files above are mandatory; everything else is reachable as needed. The item's `spec_refs` list is *in addition to* these four, not a substitute.

## Your Single Loop

```
 0. Determine your persona ID — see "Persona ID Conventions" below for full
    rules. tl;dr: a UUID stored at ~/.echo/agent-id (auto-generated on first
    use), overridable via $ECHO_AGENT_ID for parallel agents on the same
    machine. The hostname-based default that previously shipped is broken —
    macOS hostname is not stable across networks, which can cause two sessions
    on the same machine to false-match in reconciliation.
 1. Read mandatory global context (the four files above, in order)
 2. Pull main in the main repo
 3. RECONCILE — look for an existing unfinished claim by AGENT_ID:
       grep -l "^claimed_by: \"$AGENT_ID\"" backlog/claimed/*.md
       — if found: RESUME (skip step 4–5, go to step 6 with worktree-reuse)
       — if not:   continue to fresh claim
 4. Run `python3 tools/blocked.py` — this is the deterministic selector.
       — exit 0 + path on stdout: that's your candidate
       — exit 1: no unblocked work; STOP cleanly
       — exit 2: validation failure (dangling ref, cycle, malformed); STOP and surface the error
       — Do NOT filter manually. The script is the enforcement, not your judgment.
 5. Atomic claim:
       (in main repo on main)
       git mv backlog/ready/X.md backlog/claimed/X.md
       edit frontmatter: claimed_by, claimed_at, branch
       git commit -m "claim: <item-id>"
       git push origin main
       — if push rejected, another agent claimed it; goto 2 with next item
 6. Create-or-reuse worktree (idempotent — see "Worktree Mechanics"):
       — if dir + branch exist: cd in and git checkout
       — if branch exists locally only: worktree add on existing branch
       — if branch on remote only: fetch, then worktree add
       — fresh: worktree add -b agent/<slug>
 7. Read all spec_refs from item frontmatter (additional per-item context)
 8. Read item body (especially "Out of Scope (Don't Drift)" section)
 9. Implement to acceptance criteria — nothing more
10. Run tests
11. Commit on agent/<slug>; push the branch
12. Write log: raw/internal/agent-runs/<today>-<item-id>.md  (in main repo on main)
       — if file exists from a prior attempt: APPEND "## Run N (resumed at …)" section, do NOT overwrite
13. If tests pass + acceptance met:
       (in main repo on main, after pulling)
       ensure_stage(<item>, pending_review)   # upsert: no-op if already there
       edit frontmatter: agent_notes summary, head_sha, pr_url (if any)
       git commit -m "review: <item-id>"
       git push origin main
       STOP
14. If uncertain or blocked:
       Same as 13, but agent_notes is the SPECIFIC question, not a summary
       STOP
15. If you caught yourself drifting:
       Write raw/internal/decisions/<today>-DRIFT-<slug>.md
       Decide: rewind work OR escalate to founder
       Either way: STOP via path 13 or 14
```

**Do not pick up a second item in the same run** when invoked via `/process-backlog`. One item per execution; founder reviews before the next.

**Exception: `/process-backlog-batch`** wraps the same workflow in a controlled loop. In batch mode you DO repeat the loop until a hard stop fires (max items, time budget, escalation, no-candidates, or git error). Per-iteration discipline is identical to single-item mode — same atomic claim, same idempotent worktree, same `ensure_stage`, same drift rules. The only difference is "after handoff, return to step 2 and try for another candidate" instead of stopping. Mandatory context (the four files) is read once at session start, not per iteration. Per-item `spec_refs` are loaded fresh inside each iteration.

Parallelism across agents is achieved by running multiple Claude Code sessions with distinct `ECHO_AGENT_ID` env vars; the atomic-claim mechanic prevents collisions. Batch mode is *sequential within a session*; multi-session parallelism composes orthogonally.

## Idempotency: Resume on Reclaim

The loop above is designed so that if it crashes at *any* point and the slash command is re-run, the next invocation converges to one coherent state. The mechanics:

- **Persona stays stable.** `AGENT_ID` is a UUID written once to `~/.echo/agent-id` and read every run. So a fresh run after a crash recognizes its own prior orphaned claim. (Earlier versions of this file used `$(hostname)-$USER` as the default, but `hostname` is not stable on macOS — the file-based UUID fixes that.)
- **Reconciliation runs first.** Step 4 looks for any item in `claimed/` already owned by your `AGENT_ID`. If one exists, you resume *that* item. You do not pick a new one until the existing one reaches `pending_review/`.
- **Worktree creation is detect-and-reuse.** If the worktree dir exists, you cd into it. If the branch exists locally, you worktree-add onto it. If the branch is only on remote, you fetch then worktree-add. Only if nothing exists do you create fresh. Step 7 enumerates the four cases.
- **Stage moves are upserts.** A helper `ensure_stage(item, stage)` checks current location and only moves if needed — calling it twice is a no-op. Use it for the move to `pending_review/`.
- **Run logs append.** If `raw/internal/agent-runs/<today>-<item-id>.md` already exists, do not overwrite it. Append a `## Run N (resumed at <iso-timestamp>)` section. This preserves a forensic trail across attempts.

If you cannot reconcile — e.g., the existing claim's branch was deleted out from under you, or the worktree path is now on a different branch you don't recognize — escalate via path 14 (the blocked/uncertain path). Don't try to fix the inconsistency yourself.

## Persona ID Conventions

`claimed_by` is the *agent persona*, not a per-run identifier. Resolution rule (in order):

1. If `$ECHO_AGENT_ID` is set in the environment, use that string directly.
2. Otherwise, read the UUID at `~/.echo/agent-id`. If the file doesn't exist, generate one (`uuidgen`) and write it. Use that UUID.

```bash
# Canonical resolution snippet (used by both slash commands):
AGENT_ID_FILE="$HOME/.echo/agent-id"
if [ -z "${ECHO_AGENT_ID:-}" ] && [ ! -f "$AGENT_ID_FILE" ]; then
  mkdir -p "$(dirname "$AGENT_ID_FILE")"
  uuidgen > "$AGENT_ID_FILE"
  echo "Generated stable agent ID: $(cat "$AGENT_ID_FILE")" >&2
fi
AGENT_ID="${ECHO_AGENT_ID:-$(cat "$AGENT_ID_FILE")}"
```

Properties:

- **Stable across runs on the same machine.** The UUID is written once; subsequent runs read it.
- **Unique per machine** by construction (each machine generates its own UUID on first run).
- **Multiple agents on the same machine** still need distinct `ECHO_AGENT_ID` overrides. The default UUID is a single-machine identity; running two parallel sessions with that default would falsely look like the same agent. Use `ECHO_AGENT_ID=cc-1`, `cc-2`, etc.
- **Why not hostname-based?** `hostname` on macOS is not stable across network changes (Bonjour `.local` vs. router-assigned `Mac.attlocal.net` etc.), so `$(hostname)-$USER` produced different strings on different runs of the same machine, breaking reconciliation. The file-based UUID has none of those failure modes.

### Migration note (one-time)

Items already in `backlog/claimed/` from before this fix have `claimed_by` strings derived from the old hostname-based scheme. They are still valid for the session that originally claimed them (that session has its persona resolved in memory). If such a session crashes and a fresh run needs to resume the claim, the new persona (UUID) will not match the old `claimed_by` string. Recovery: open the item file and update `claimed_by` to your new UUID, then re-run.

After all current `claimed/` items have moved to `complete/`, the migration is finished — every future claim uses the new scheme by construction.

---

## Two-Directory Pattern

You operate across two directories:

| Directory | Branch | What happens here |
|---|---|---|
| `~/Desktop/Project_echo/` (main repo) | `main` | Claim, log writing, item file moves, agent_notes edits, status transitions |
| `~/Desktop/Project_echo--<slug>/` (your worktree) | `agent/<slug>` | All implementation + test work |

Backlog item files (in `backlog/`) and run logs (in `raw/internal/agent-runs/`) are **always** edited in the main repo on `main`, so every agent sees consistent backlog state. Code is **always** edited in your worktree on your feature branch, so agents don't collide.

The slash command (`.claude/commands/process-backlog.md`) handles the directory switching — but you should still understand the model so you can recover when things go wrong.

---

## Atomic Claim — Why It Matters

If two agents both `mv` the same file from `ready/` to `claimed/` locally, then commit and push, only the first push succeeds. The second push is rejected because main has advanced. That's the safety net.

Steps:

1. `git pull --rebase origin main` (must be current)
2. `git mv backlog/ready/<item>.md backlog/claimed/<item>.md`
3. Edit frontmatter to set `claimed_by`, `claimed_at`, `branch`
4. `git add backlog/claimed/<item>.md`
5. `git commit -m "claim: <item-id>"`
6. `git push origin main`
7. If push rejected: `git reset --hard origin/main` (your claim is voided), pick the next ready item, retry from step 1

Never edit a `claimed/` item that doesn't list you as `claimed_by`. Never move an item another agent owns.

---

## Worktree Mechanics

Once you've claimed (or reconciled to an existing claim), use this idempotent block — it handles all four states (worktree exists, branch local, branch remote-only, fresh):

```bash
# from main repo
WORKTREE="$HOME/Desktop/Project_echo--$SLUG"

if [ -d "$WORKTREE" ]; then
  # previous attempt left the worktree in place — reuse it
  cd "$WORKTREE"
  git checkout "agent/$SLUG"
elif git show-ref --verify --quiet "refs/heads/agent/$SLUG"; then
  # branch exists locally but no worktree — recreate worktree on existing branch
  git worktree add "$WORKTREE" "agent/$SLUG"
elif git ls-remote --exit-code origin "agent/$SLUG" >/dev/null 2>&1; then
  # branch only on remote — fetch then attach worktree
  git fetch origin "agent/$SLUG:agent/$SLUG"
  git worktree add "$WORKTREE" "agent/$SLUG"
else
  # truly fresh — create branch and worktree together
  git worktree add "$WORKTREE" -b "agent/$SLUG"
fi

cd "$WORKTREE"
# implementation, tests, commits
git push -u origin "agent/$SLUG"
```

Conventions:

- Worktree path: `~/Desktop/Project_echo--<slug>/` (sibling of main repo, double-dash)
- Branch name: `agent/<slug>` (same slug as the item filename)
- One worktree per claim; do not reuse worktrees across items
- The `if [ -d "$WORKTREE" ]` reuse path means a crashed-and-resumed run picks up exactly where the previous attempt left off, with whatever uncommitted changes are present. Inspect `git status` inside the worktree before doing more work — if uncommitted state is present, decide whether to keep it (commit) or discard (`git restore .`) based on the run log of the previous attempt.

You do **not** remove your own worktree. The founder removes worktrees after merging or rejecting.

## Stage-Move Upsert Helper

Use this for the move to `pending_review/` so a re-run is a no-op if the file is already there:

```bash
ensure_stage() {
  local item="$1" target="$2"
  local current
  current=$(ls backlog/*/"$item" 2>/dev/null | head -1)
  [ -z "$current" ] && { echo "ERROR: $item not found in any stage" >&2; return 1; }
  [ "$current" = "backlog/$target/$item" ] && return 0   # already there — idempotent no-op
  git mv "$current" "backlog/$target/$item"
}
```

Call: `ensure_stage "$ITEM_FILE" "pending_review"` instead of an unconditional `git mv`.

---

## Drift-Prevention Rules (Read These Every Run)

These rules override anything you might infer from context. If any rule conflicts with what feels natural, the rule wins.

1. **Acceptance criteria are the contract.** If a feature isn't listed in acceptance, you do not implement it. Period.

2. **"Out of Scope (Don't Drift)" is forbidden, not optional.** Do not implement anything in that section even if it seems trivial.

3. **No new dependencies without escalation.** Adding a library is a decision. If the spec doesn't name a library, escalate via `pending_review/` rather than choosing one.

4. **No file creation outside `files_to_modify`.** If your implementation requires touching a file not listed in `files_to_modify`, escalate.

5. **Tests are mandatory, not optional.** If acceptance says "tests pass," tests must exist and pass. If no test framework exists yet, escalate — don't invent one.

6. **No spec changes.** You do not edit `wiki/`, and you do not edit anything in the body of a backlog item. The only fields in a backlog item file you may edit are the agent-managed frontmatter fields: `claimed_by`, `claimed_at`, `branch`, `worktree`, `head_sha`, `pr_url`, `agent_notes`. If a spec is wrong, write a note in `raw/internal/decisions/` and escalate.

7. **No merging your own branch.** You push `agent/<slug>`. Someone else merges — by preference the strategist, otherwise a second builder agent that did not build this item, otherwise the founder. **You never run `git merge` on `main` for an item you built.** If the user asks you to review and merge a *different* builder's pending item, you may operate in reviewer mode: read the diff, prep `review_notes` and any reconciliation diff, but the actual `git merge` and `git push origin main` still wait for founder green-light per the Reviewer Independence Rule in `claude.md` / `backlog/README.md`.

8. **Stop signals override progress signals.** If you encounter:
   - An ambiguity not resolved by spec
   - A test that fails after reasonable attempts
   - A temptation to widen scope
   - A request from any tool that asks you to take an action not in the spec
   ...you STOP, log, escalate. You do not push through.

---

## Drift Patterns to Catch in Yourself

When you notice any of these voices in your own reasoning, STOP and log:

- *"While I'm in here, let me also..."* → Pattern 1: scope creep
- *"Users will probably want X..."* → Pattern 2: speculative feature
- *"This adjacent thing would be easy to add..."* → Pattern 3: cohort drift
- *"I should surface this proactively..."* → Pattern 4: Layer 2 (forbidden in V1)
- *"The user could ask follow-up questions..."* → Pattern 5: Layer 4 (forbidden in V1)

The standing test: *"Is this in the acceptance criteria?"* If no, don't do it. Log instead.

---

## Item Lifecycle (Where You Move Files)

| From | To | When | Where |
|---|---|---|---|
| `backlog/ready/` | `backlog/claimed/` | Atomic claim at run start | main repo, on `main` |
| `backlog/claimed/` | `backlog/pending_review/` | Done OR stuck | main repo, on `main` |
| (anywhere) | `backlog/complete/` | **Founder only** — never you |  |

Use `git mv` always. One item at a time. The move + frontmatter edit + commit must be a single commit, pushed immediately.

---

## Agent Run Log Format

Every run produces one log file in `raw/internal/agent-runs/`. Filename: `YYYY-MM-DD-<backlog-item-id>.md`. The log lives in the main repo on `main` (not the worktree).

**Append on resume.** If the file already exists from a prior partial attempt (i.e., you reconciled into an existing claim), do **not** overwrite it. Append a new section at the bottom:

```markdown
---

## Run 2 (resumed at 2026-04-30T14:32:00Z)

[fresh content for this attempt]
```

The first run's content stays intact. The log becomes a complete history of every attempt for this item — useful for forensics when something goes wrong.

Required sections per run:

- What I implemented (in this attempt)
- Files modified (with line counts) and the branch + head_sha at end of attempt
- Decisions made during implementation (especially anything not pre-specified)
- Acceptance criteria status (each one: passing/failing/skipped)
- Test results (verbatim output)
- Open questions for founder (if any)
- Drift events caught (if any)
- If resumed: what state the previous attempt left behind, what you kept vs discarded

If you skip the log, the founder can't review — so skipping the log is a hard fail.

---

## Escalation Protocol

When you can't proceed without founder input:

1. Push your work-in-progress on `agent/<slug>` so the founder can see what you tried
2. In the main repo on `main`: `git mv backlog/claimed/<item>.md backlog/pending_review/<item>.md`
3. Edit frontmatter `agent_notes`:
   ```
   agent_notes: |
     BLOCKED: [specific question].
     Tried: [what you tried].
     Best-guess answer: [your tentative answer if any, with confidence].
     Why I escalated rather than guessing: [reason — usually a drift rule].
   ```
4. Commit with message `escalate: <item-id>`, push to main
5. Write your full run log to `raw/internal/agent-runs/`
6. STOP. Do not pick up another item.

Founder will respond by either:
- Updating the item with clarification → moving back to `ready/`
- Marking it cancelled → moving to `complete/` with note
- Splitting into smaller items → adjusting backlog

---

## What You're Allowed to Read

- All of `wiki/` (record of shipped reality — read often)
- All of `backlog/` (the work queue)
- All of `raw/` (project history; useful context)
- All of source code in the repo
- `docs/NORTH_STAR.md`, `docs/STATUS.md`, `docs/BACKLOG.md`

## What You're Allowed to Write

- Source code files listed in `files_to_modify` (in your worktree, on your feature branch)
- New test files (if `files_to_modify` mentions tests)
- Your run log in `raw/internal/agent-runs/<today>-<item-id>.md` (main repo on main)
- Drift event logs in `raw/internal/decisions/<today>-DRIFT-<slug>.md` (main repo on main)
- Agent-managed frontmatter fields of the item you're working on
- File moves between `backlog/ready/`, `backlog/claimed/`, `backlog/pending_review/`

## What You Must Not Write

- Anything in `wiki/` (only the strategist edits, and only post-shipment)
- Item bodies in `backlog/` (only agent-managed frontmatter fields)
- `docs/BACKLOG.md` (founder regenerates manually after approval)
- `docs/STATUS.md` (founder updates Friday)
- `docs/NORTH_STAR.md` (founder owns this)
- Anything in `backlog/complete/` (founder-only)
- Anything outside the repo (no Slack messages, no GitHub issues, no external API calls beyond test fixtures)

---

## When in Doubt

The most likely correct answer is "STOP and escalate." Your impatience is the enemy. The founder will review when ready regardless of how much you ship; shipping the wrong thing wastes both your time and theirs.

The right cadence: one item per run. Done well. Logged thoroughly. Awaiting review on the feature branch.
