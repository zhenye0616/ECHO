---
description: Atomically claim or resume a backlog item, work it in an isolated worktree, push the branch, move it to pending_review. Idempotent: a crashed run resumes safely on re-invocation.
---

You are an ECHO builder agent. Pick up the next ready backlog item — or resume a previously crashed run — and execute it through the full implementation loop. Multiple agents may run in parallel; the atomic-claim mechanic handles collisions; the reconciliation step handles crash recovery.

## Mandatory First Steps

Before doing anything:

1. Read `AGENT_INSTRUCTIONS.md` in the project root. Treat it as load-bearing — its rules override your default reasoning.
2. Read `NORTH_STAR.md` for the V1 scope and the drift questions.
3. In the main repo (`~/Desktop/echo_wiki`) on `main`: `git pull --rebase origin main`.

## Step 0 — Determine Persona ID

```bash
AGENT_ID="${ECHO_AGENT_ID:-$(hostname)-$USER}"
echo "Agent persona: $AGENT_ID"
```

The persona is stable across runs of the same agent installation. It is the resumption signal: a crashed run leaves a `claimed_by: <AGENT_ID>` in `backlog/claimed/`, and the next invocation finds it via grep.

If you are running a second agent on the same machine, set `ECHO_AGENT_ID` to a distinct value before invocation.

## Step A — Reconcile or Claim

```bash
cd ~/Desktop/echo_wiki
git pull --rebase origin main

# Look for an existing unfinished claim by this persona
EXISTING=$(grep -l "^claimed_by: \"$AGENT_ID\"" backlog/claimed/*.md 2>/dev/null | head -1)

if [ -n "$EXISTING" ]; then
  ITEM_FILE="$EXISTING"
  ITEM_ID=$(basename "$ITEM_FILE" .md)
  SLUG="${ITEM_ID#????-??-??-???-}"   # strip "YYYY-MM-DD-NNN-" prefix
  echo "Resuming previous claim: $ITEM_FILE (slug: $SLUG)"
  RESUMING=1
else
  RESUMING=0
  # Fresh claim: pick highest priority + oldest creation date from ready/
  # (use your own logic to pick the right file; it must be from backlog/ready/)
  ITEM_FILE_NAME="<chosen-item-filename>.md"   # e.g., 2026-04-30-001-capture-gate.md
  ITEM_ID="${ITEM_FILE_NAME%.md}"
  SLUG="${ITEM_ID#????-??-??-???-}"

  git mv "backlog/ready/$ITEM_FILE_NAME" "backlog/claimed/$ITEM_FILE_NAME"
  # edit frontmatter:
  #   claimed_by: "$AGENT_ID"
  #   claimed_at: "<ISO timestamp now>"
  #   branch: "agent/$SLUG"
  git add "backlog/claimed/$ITEM_FILE_NAME"
  git commit -m "claim: $ITEM_ID"
  if ! git push origin main; then
    # someone else won the race; back off and try the next ready item
    git reset --hard origin/main
    exit 1   # caller can re-invoke to pick the next item
  fi
  ITEM_FILE="backlog/claimed/$ITEM_FILE_NAME"
fi
```

The slug is the filename minus the `YYYY-MM-DD-NNN-` prefix and `.md` extension (e.g., `2026-04-30-001-capture-gate.md` → slug `capture-gate`). Reused for branch + worktree paths.

## Step B — Create or Reuse Worktree (Idempotent)

```bash
WORKTREE="$HOME/Desktop/echo_wiki--$SLUG"

if [ -d "$WORKTREE" ]; then
  cd "$WORKTREE"
  git checkout "agent/$SLUG"
elif git show-ref --verify --quiet "refs/heads/agent/$SLUG"; then
  git worktree add "$WORKTREE" "agent/$SLUG"
elif git ls-remote --exit-code origin "agent/$SLUG" >/dev/null 2>&1; then
  git fetch origin "agent/$SLUG:agent/$SLUG"
  git worktree add "$WORKTREE" "agent/$SLUG"
else
  git worktree add "$WORKTREE" -b "agent/$SLUG"
fi

cd "$WORKTREE"

# If resuming, inspect leftover state from prior attempt
if [ "$RESUMING" = "1" ]; then
  git status
  # decide: keep uncommitted changes (commit them) OR discard (git restore .)
  # base the decision on the previous attempt's run log
fi
```

## Step C — Load Context

Inside the worktree:

1. Read every file listed in the item's `spec_refs`. Mandatory.
2. Read the item body, especially the `## Out of Scope (Don't Drift)` section.
3. Plan briefly (in scratch — not committed) referencing the acceptance criteria one by one.

If anything is unclear after reading `spec_refs`, **stop and escalate via Step E2.** Do not guess.

## Step D — Implement & Test

Inside the worktree, on `agent/<slug>`:

1. Implement only what acceptance criteria require. Nothing more.
2. Touch only files listed in `files_to_modify`. If you need another file, escalate.
3. Use only dependencies named in the spec. If you need another, escalate.
4. Run tests as specified by acceptance. Capture verbatim output for the run log.
5. Commit logically; messages prefixed with the item id.
6. Push the branch:
   ```bash
   git push -u origin "agent/$SLUG"
   ```
   Capture the pushed `head_sha` for the run log and frontmatter.

## Step E — Hand Off

### E1. Write or Append to the Run Log (in main repo on main)

```bash
cd ~/Desktop/echo_wiki
git pull --rebase origin main

LOG="raw/internal/agent-runs/$(date +%Y-%m-%d)-$ITEM_ID.md"

if [ -f "$LOG" ]; then
  # prior attempt exists — append a new run section, do NOT overwrite
  RUN_NUM=$(grep -c '^## Run' "$LOG")
  RUN_NUM=$((RUN_NUM + 1))
  cat >> "$LOG" <<EOF

---

## Run $RUN_NUM (resumed at $(date -u +%Y-%m-%dT%H:%M:%SZ))

[ ... fill in: what implemented this attempt, prior-state-kept-vs-discarded, files modified, decisions, acceptance status, test output, open questions, drift events ... ]
EOF
else
  # first attempt — create the file with full template (see raw/internal/agent-runs/README.md)
  : > "$LOG"
  # ... populate per template ...
fi
```

Required sections (per attempt): what implemented, files modified with branch + head_sha, decisions, acceptance per criterion, verbatim test output, open questions, drift events, and (if resumed) what previous-attempt state was kept vs discarded.

### E2. Move Item to pending_review (idempotent upsert)

```bash
ensure_stage() {
  local item="$1" target="$2"
  local current
  current=$(ls backlog/*/"$item" 2>/dev/null | head -1)
  [ -z "$current" ] && { echo "ERROR: $item not found in any stage" >&2; return 1; }
  [ "$current" = "backlog/$target/$item" ] && return 0
  git mv "$current" "backlog/$target/$item"
}

cd ~/Desktop/echo_wiki
git pull --rebase origin main
ensure_stage "$(basename $ITEM_FILE)" "pending_review"
# edit frontmatter:
#   head_sha: "<sha pushed>"
#   pr_url: "<if PR opened, else empty>"
#   agent_notes: |
#     <one-paragraph summary if work succeeded>
#     OR
#     BLOCKED: <specific question> | Tried: <...> | Best guess: <...> | Why escalated: <rule>
git add backlog/pending_review/ "$LOG"
git commit -m "review: $ITEM_ID"
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
- A reconciled state you cannot make sense of (e.g., worktree on wrong branch, unexpected uncommitted changes, branch deleted under you)
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
- One run log file is in `raw/internal/agent-runs/` (committed + pushed on main; appended-to if resumed)
- One feature branch `agent/<slug>` exists at `origin` with your work
- Your worktree at `~/Desktop/echo_wiki--<slug>/` still exists (founder cleans it up after merge)
- Founder has everything they need to review in <30 minutes

Now begin. Read `AGENT_INSTRUCTIONS.md` first.
