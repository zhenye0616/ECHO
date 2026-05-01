---
description: Drain the backlog — loop the single-item workflow until no unblocked candidates remain, max items reached, time budget exceeded, or an item escalates. Sequential within one agent session. Compose with multi-session parallelism by setting distinct ECHO_AGENT_ID per session.
---

You are an ECHO builder agent in **BATCH mode**. You will repeatedly claim, work, and hand off backlog items in sequence within this single session, until a hard stop fires.

This command is the same workflow as `/process-backlog`, wrapped in a controlled loop. Per-iteration discipline is identical: same atomic claim, same idempotent worktree, same `ensure_stage`, same drift rules. The ONLY new behavior is "after a successful handoff, return to the top of the loop and try for another candidate instead of stopping."

## Mandatory Global Context (Read ONCE, At Session Start)

The four mandatory files. Read them before the first iteration; they cover all iterations in this session:

1. `docs/AGENT_INSTRUCTIONS.md`
2. `docs/NORTH_STAR.md`
3. `wiki/principles/drift-prevention.md`
4. `wiki/product/v1-spec.md`

The full `wiki/` is your global context — readable on demand. Per-item `spec_refs` are loaded fresh inside each iteration.

## Persona ID

```bash
AGENT_ID_FILE="$HOME/.echo/agent-id"
if [ -z "${ECHO_AGENT_ID:-}" ] && [ ! -f "$AGENT_ID_FILE" ]; then
  mkdir -p "$(dirname "$AGENT_ID_FILE")"
  uuidgen > "$AGENT_ID_FILE"
  echo "Generated stable agent ID: $(cat "$AGENT_ID_FILE")" >&2
fi
AGENT_ID="${ECHO_AGENT_ID:-$(cat "$AGENT_ID_FILE")}"
```

The default persona is a UUID at `~/.echo/agent-id` (auto-generated on first use), stable forever, unique per machine.

If you are running multiple Claude Code sessions in parallel for batch parallelism, each session MUST have a distinct `ECHO_AGENT_ID`. Otherwise reconciliation across sessions will collide. Use `ECHO_AGENT_ID=cc-1`, `cc-2`, etc. before invocation.

(The earlier `$(hostname)-$USER` default is gone — `hostname` on macOS is not stable across networks and could cause two sessions on the same machine to false-match.)

## Batch Configuration

Defaults; override via env:

```bash
MAX_ITEMS="${ECHO_BATCH_MAX_ITEMS:-10}"
TIME_BUDGET_SECS="${ECHO_BATCH_TIMEOUT_SECS:-21600}"   # 6 hours
HALT_ON_ESCALATION="${ECHO_BATCH_HALT_ON_ESCALATION:-1}"  # 1 = strict, 0 = continue past escalations
```

## Initialize Batch State

```bash
ITEMS_SHIPPED=0
ITEMS_ESCALATED=0
SHIPPED_LIST=()
ESCALATED_LIST=()
START_TIME=$(date +%s)
```

## The Loop

Each iteration is one full single-item workflow. Do not parallelize iterations within this session.

```
LOOP:
  ── Hard-stop checks BEFORE each iteration ──
  IF ITEMS_SHIPPED >= MAX_ITEMS:
    HALT(reason: "max items reached: $MAX_ITEMS")
  IF ($(date +%s) - START_TIME) >= TIME_BUDGET_SECS:
    HALT(reason: "time budget exceeded: ${TIME_BUDGET_SECS}s")

  ── Step A: Reconcile or Claim ──
  cd ~/Desktop/Project_echo
  git pull --rebase origin main

  EXISTING=$(grep -l "^claimed_by: \"$AGENT_ID\"" backlog/claimed/*.md 2>/dev/null | head -1)
  IF $EXISTING is set:
    ITEM_FILE=$EXISTING
    RESUMING=1
    Echo "Resuming previous claim: $ITEM_FILE"
  ELSE:
    RESUMING=0
    # Selection is enforced by tools/blocked.py (deterministic, validated, tested).
    # Do NOT filter manually — call the script and act on its exit code.
    NEXT_ITEM=$(python3 tools/blocked.py)
    RC=$?
    case "$RC" in
      0) ;;                                                                # found
      1) HALT(reason: "no unblocked work; queue drained or remaining items blocked") ;;
      *) HALT(reason: "backlog validation failed; aborting batch") ;;     # dangling/cycle
    esac
    PICK="$(basename "$NEXT_ITEM")"
    SLUG=${PICK_FILENAME stripped of "YYYY-MM-DD-NNN-" prefix and ".md"}
    ITEM_ID=${PICK_FILENAME without .md}

    git mv backlog/ready/$PICK_FILENAME backlog/claimed/$PICK_FILENAME
    edit frontmatter: claimed_by="$AGENT_ID", claimed_at=now-iso, branch="agent/$SLUG"
    git add backlog/claimed/$PICK_FILENAME
    git commit -m "claim: $ITEM_ID"
    git push origin main || {
      # race lost; reset and try next iteration
      git reset --hard origin/main
      CONTINUE LOOP
    }
    ITEM_FILE=backlog/claimed/$PICK_FILENAME

  ── Step B: Create-or-reuse worktree (idempotent) ──
  WORKTREE="$HOME/Desktop/Project_echo--$SLUG"
  IF -d $WORKTREE: cd in, git checkout agent/$SLUG
  ELIF branch exists locally: git worktree add $WORKTREE agent/$SLUG
  ELIF branch on remote: git fetch + git worktree add $WORKTREE agent/$SLUG
  ELSE: git worktree add $WORKTREE -b agent/$SLUG
  cd $WORKTREE
  IF $RESUMING == 1: inspect git status, decide keep-or-discard prior state

  ── Step C: Load per-item context ──
  Read every file in the item's spec_refs list (these are PER-ITEM, in addition
  to the four mandatory reads done once at session start).
  Read item body, especially "Out of Scope (Don't Drift)".
  Plan briefly against acceptance criteria.

  ── Step D: Implement & Test ──
  Touch only files in files_to_modify. Use only dependencies named in spec.
  Run tests as specified in acceptance. Capture verbatim output.
  Commit logically with messages prefixed by ITEM_ID.
  git push -u origin agent/$SLUG
  Capture HEAD_SHA.

  ── Step E: Hand off ──
  cd ~/Desktop/Project_echo
  git pull --rebase origin main
  Write or APPEND to raw/internal/agent-runs/$(date +%Y-%m-%d)-$ITEM_ID.md
  ensure_stage($PICK_FILENAME, pending_review)
  edit frontmatter: head_sha=$HEAD_SHA, agent_notes={summary OR escalation question}
  git commit -m "review: $ITEM_ID"   (or "escalate: $ITEM_ID" if blocked)
  git push origin main

  ── Update batch state ──
  IF item shipped cleanly:
    ITEMS_SHIPPED++
    SHIPPED_LIST.append("$ITEM_ID (head: ${HEAD_SHA:0:7})")
  ELSE (escalated):
    ITEMS_ESCALATED++
    ESCALATED_LIST.append("$ITEM_ID")
    IF HALT_ON_ESCALATION == 1:
      HALT(reason: "escalation; HALT_ON_ESCALATION=1")

  ── Continue loop ──
  GOTO LOOP
END LOOP

HALT:
  Print BATCH SUMMARY (see below)
  STOP — do not start another iteration
```

## Hard Stops (Precedence Order)

Highest-precedence first. As soon as any fires, halt the loop and print the summary.

1. **Max items reached.** Default 10. Override via `ECHO_BATCH_MAX_ITEMS`.
2. **Time budget exceeded.** Default 6 hours. Override via `ECHO_BATCH_TIMEOUT_SECS`.
3. **Escalation when strict mode is on.** Default on (`ECHO_BATCH_HALT_ON_ESCALATION=1`). Set to `0` to keep going past escalations on independent items.
4. **No unblocked candidates.** Clean exit; queue is drained or everything left is blocked.
5. **Push race or git error that doesn't resolve.** Defensive — log, halt, surface to founder.

## Per-Iteration Discipline

Inside each iteration, you behave EXACTLY as in `/process-backlog`:

- The spec for THIS item starts fresh. Do not carry implementation patterns across items unless the spec explicitly references prior items.
- Drift watch applies per iteration. Catch drift impulses ("while I'm in here, also fix...") at the iteration boundary; log them as drift events; do NOT widen the current item's scope.
- Each iteration's acceptance criteria are the contract for THAT iteration. Acceptance from a prior iteration does not authorize anything in the current one.
- One commit on `main` to claim, one push of the feature branch, one commit on `main` to hand off, per iteration. Three pushes per shipped item.

## Batch Summary at End

When the loop halts, print this structured summary so the founder can triage in the morning:

```
=== BATCH SUMMARY ===
Persona: <AGENT_ID>
Started:  <iso-timestamp>
Halted:   <iso-timestamp>
Duration: <hh:mm:ss>
Halt reason: <one of the five hard stops>

Items shipped: <N>
  - <item-id> (head: <short-sha>)
  - ...

Items escalated: <M>
  - <item-id>: <one-line question>
  - ...

Backlog state after batch:
  ready/          <count> items
  claimed/        <count> items   (should be 0 if loop exited cleanly)
  pending_review/ <count> items   (this is what you review in the morning)
  complete/       <count> items

Run logs:
  raw/internal/agent-runs/$(date +%Y-%m-%d)-*.md
```

This summary is the founder's morning entry point.

## What You Must NOT Do

Same as `/process-backlog`:

- Edit anything in `wiki/`
- Edit `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md`
- Modify item bodies (only agent-managed frontmatter fields)
- Move items to `backlog/complete/` (founder-only)
- Merge `agent/<slug>` into `main` (founder-only)
- Remove worktrees (founder-only)
- Take any action affecting systems outside this repo
- Parallelize iterations within this session (parallelism is achieved by running multiple sessions with distinct `ECHO_AGENT_ID`)

## When in Doubt

Same standing rule as `/process-backlog`: STOP and escalate. Within batch mode, "escalate" means handing the item to `pending_review/` with a question and (if `HALT_ON_ESCALATION=1`) halting the entire batch. Better to ship 3 good items and stop than 5 with 2 broken.

Now begin. Read the four mandatory context files first, then enter the loop.
