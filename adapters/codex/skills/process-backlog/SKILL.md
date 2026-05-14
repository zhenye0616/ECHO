---
name: process-backlog
description: 'Atomically claim or resume a backlog item, work it in an isolated worktree,
  push the branch, move it to pending_review. Idempotent: a crashed run resumes safely
  on re-invocation.'
metadata:
  short-description: Atomically claim or resume a backlog item, work it in an isolated
    worktree,
---

You are an ECHO builder agent. Pick up the next ready backlog item — or resume a previously crashed run — and execute it through the full implementation loop. Multiple agents may run in parallel; the atomic-claim mechanic handles collisions; the reconciliation step handles crash recovery.

## Mandatory First Steps

Before doing anything, read these four files in order — they are your global context for every run:

1. `docs/AGENT_INSTRUCTIONS.md` — operating manual; loop, drift rules, write/no-write lists. Treat it as load-bearing.
2. `docs/NORTH_STAR.md` — daily orient + the 5 drift questions.
3. `wiki/principles/drift-prevention.md` — canonical drift doctrine (this is the source of truth; the bullets in AGENT_INSTRUCTIONS are a paraphrase).
4. `wiki/product/v1-spec.md` — locked V1 spec; what we're building, what's cut, definition of done.

The entire `wiki/` folder is read-only global context — readable on demand. It is organized into product/, principles/, architecture/, capture/ (with capture/per-app/), surfaces/, research/, and operating-model/. The item's `spec_refs` adds per-item context on top of these four.

Then, in the main repo (`~/Desktop/Project_echo`) on `main`: `git pull --rebase origin main`.

## Step 0 — Determine Persona ID

```bash
AGENT_ID_FILE="$HOME/.echo/agent-id"
if [ -z "${ECHO_AGENT_ID:-}" ] && [ ! -f "$AGENT_ID_FILE" ]; then
  mkdir -p "$(dirname "$AGENT_ID_FILE")"
  uuidgen > "$AGENT_ID_FILE"
  echo "Generated stable agent ID: $(cat "$AGENT_ID_FILE")" >&2
fi
AGENT_ID="${ECHO_AGENT_ID:-$(cat "$AGENT_ID_FILE")}"
echo "Agent persona: $AGENT_ID"
```

The default persona is a UUID stored at `~/.echo/agent-id`, generated on first use, stable forever. It is the resumption signal: a crashed run leaves a `claimed_by: <AGENT_ID>` in `backlog/claimed/`, and the next invocation finds it via grep.

If you are running a second agent on the same machine, set `ECHO_AGENT_ID` to a distinct value (e.g., `cc-2`) before invocation. The default UUID is single-identity; running two parallel sessions with that default would falsely look like the same agent and step on each other's claims.

(Why a file-based UUID and not `$(hostname)-$USER`? On macOS, `hostname` is not stable across network changes — Bonjour vs. router-assigned suffixes vary — so a hostname-based persona could produce different strings on different runs of the same machine, breaking reconciliation. See `docs/AGENT_INSTRUCTIONS.md` "Persona ID Conventions" for the full rationale.)

## Step A — Reconcile or Claim

```bash
cd ~/Desktop/Project_echo
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
  # Selection is enforced by tools/blocked.py (deterministic, validated, tested).
  # Do NOT filter manually — the agent's job is to call the script, not to interpret
  # blocked_by status by reading frontmatter. The script checks dangling refs and
  # cycles before returning a candidate; if validation fails, the loop aborts.
  NEXT_ITEM=$(python3 tools/blocked.py)
  RC=$?
  case "$RC" in
    0) ;;                                                     # candidate found
    1) echo "no unblocked work; exiting cleanly"; exit 0 ;;   # nothing claimable
    *) echo "backlog validation failed; aborting"; exit 2 ;;  # dangling/cycle/malformed
  esac
  ITEM_FILE_NAME=$(basename "$NEXT_ITEM")
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
WORKTREE="$HOME/Desktop/Project_echo--$SLUG"

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
cd ~/Desktop/Project_echo
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

cd ~/Desktop/Project_echo
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

- Edit anything in `wiki/` (only strategist edits, only post-shipment)
- Edit `docs/BACKLOG.md`, `docs/STATUS.md`, or `docs/NORTH_STAR.md`
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
- Your worktree at `~/Desktop/Project_echo--<slug>/` still exists (founder cleans it up after merge)
- Founder has everything they need to review in <30 minutes

Now begin. Read `docs/AGENT_INSTRUCTIONS.md` first.

---

## Binding-specific notes — codex

This section is binding-specific guidance for when the `codex` binding executes this skill. The protocol body above (atomic-claim, worktree, test/lint/typecheck, push, move-to-pending_review) is unchanged for every binding; the items below are codex-only concerns layered on top.

### Invocation (047 AC6)

- From a regular zsh / bash terminal (NOT inside the codex REPL): `bash tools/backlog/run-codex-builder.sh`. The wrapper mirrors the codex reviewer invocation convention.
- Manual, on-demand. Not a daemon. Not a launchd / cron job. The builder lifecycle is one-shot and long-running; periodic invocation would race multiple builders on the same item.
- Invoke when you want codex to claim the next ready item. The lockfile + atomic-claim git op together ensure only one codex-builder runs at a time per machine, and that two builders never claim the same item even if invoked simultaneously.

### Sandbox semantics

- The wrapper invokes `codex exec --sandbox danger-full-access`. This is broader than Claude Code's tool-use sandbox.
- `danger-full-access` is required because the builder writes outside the repo (`~/.echo/agent-id`), creates sibling worktrees under `~/Desktop/Project_echo--<slug>/`, writes `node_modules/` during test installs, and pushes to `origin`. The narrower `workspace-write` blocks `.git/FETCH_HEAD` writes during push, sibling-worktree creation, and the `~/.echo/agent-id` write.
- Threat model: full repo write + push + arbitrary FS write within reach of the codex CLI process for the duration of the run. The wrapper's repo-root validation, atomic lock DIRECTORY (`.git/echo-builder-in-progress.d/`), and `ECHO_AGENT_ID` gate accidental misuse. Operator MUST run the wrapper only from a terminal they trust.

### ECHO MCP exposure

- Codex sees the ECHO MCP server through the standard `mcp__echo__*` tool surface — **only if** the operator's codex configuration registers it (typically `~/.codex/config.toml`; consult `codex` docs for the current shape). The wrapper does not auto-register MCP; it inherits whatever the operator has configured.
- **First-run setup checklist (do this before invoking the wrapper):**
  1. Verify ECHO MCP is registered in your codex config. The exact surface depends on your codex version (`codex mcp list` if available; otherwise inspect `~/.codex/config.toml`).
  2. Smoke-test via `codex exec` with a trivial `echo_ping` invocation; confirm a non-empty return.
  3. Only then run `bash tools/backlog/run-codex-builder.sh`.
- If MCP is silently missing during a build, codex falls back to non-MCP discovery (filesystem + git log) which is incomplete for ECHO's recent-work-context queries. The failure mode is silent context-degradation, not a hard error — catch it by smoke-testing first.

### Journaling discipline (CLAUDE.md cross-tool)

- The journal-by-proxy rule from `CLAUDE.md` "Dogfooding journal discipline" applies to read-only consultees. The codex-builder here runs with `--sandbox danger-full-access` and IS NOT a read-only consultee — it journals its own ECHO MCP calls in-the-moment per the standard discipline (the 6-field template), not via proxy.

### Session-limit / token-cap escalation

Codex CLI sessions have implicit upper bounds. If a long-running builder exhausts the session before reaching `pending_review/`:

1. Commit current progress on `agent/<slug>` and push.
2. Move the item to `pending_review/` with `agent_notes:` framed as the BLOCKED escalation (per the "Stopping Conditions" section above).
3. Exit non-zero. The lockfile trap removes `.git/echo-builder-in-progress.d/` automatically.

The next founder action is to read the run log and decide: re-invoke the wrapper (whose atomic-claim reconciliation path resumes the same item via `claimed_by` match), or escalate to a different builder binding via direct skill loading.

### `backlog/task-state/<task-id>/builder.md` writer contract (047 AC3)

The codex-builder writes a `builder.md` pointer for every claim, per the `skills/role-typed-task-state.md` schema (required blocks, hard 120-line body cap, lint enforced by `npm run lint:task-state`). **Single-owner invariant:** `builder.md` has exactly one writer for the duration of a claim (this codex-builder instance) — no concurrent writers exist, so the file uses plain `git add` + `git commit` + `git push`. **No CAS, no blob-lease helper.**

`tools/task-state/push-round-state.sh` is hardcoded to `round-state.md` (`PATH_REL=backlog/task-state/${TASK_ID}/round-state.md`) and intentionally NOT generalized in 047 scope. Calling it for `builder.md` would clobber any in-flight `round-state.md` writes by the watcher. File a separate spec if a future single-owner pointer needs CAS.

**Required blocks** (same five-heading shape as other pointers; `current_round:` is NOT applicable to builder lifecycle and is omitted):

- `## current_thesis` — the operative frame for this attempt
- `## locked_decisions` — the AC list as locked at claim time (and any AC-clarifying decisions taken since)
- `## open_questions` — anything the builder will defer to founder; empty bullet list if none
- `## dont_touch` — out-of-scope-per-spec; mirror the item's "Out of Scope (Don't Drift)" section
- `## canonical_anchors` — `spec:` (required) + `reviews:` (optional) per the schema

**When the codex-builder writes** (every moment uses the same write mechanism below):

| Moment | What | Body content |
|---|---|---|
| Atomic claim (the `ready/` → `claimed/` op) | Initial write — same commit as the claim, OR as the very next commit | `current_thesis: "claim of <id>"`; AC list locked; `open_questions:` populated from anything that will be deferred; `canonical_anchors:` to the spec path |
| Milestone commits (per "Step D" run-log writes) | Update `open_questions` + `locked_decisions` if anything shifts | Same five blocks; updated bullets |
| Move to `pending_review/` (completion or escalation) | Final write | `current_thesis: "<id> complete, ready for review"` OR `"<id> escalated: <one-line reason>"`; `canonical_anchors:` to the spec, the branch name, and the run-log path |

**Write mechanism (every moment):**

```bash
git add backlog/task-state/<task-id>/builder.md
git commit -m "builder: <task-id> <milestone description>"
git push origin <branch-or-main>
```

The initial-on-claim and final-on-handoff writes land on `main` (the main repo, where backlog state changes are coordinated). Milestone writes during the build land on `agent/<slug>` (the worktree branch) and are visible via the branch on origin. After merge, they land on `main` via `/merge-and-cleanup`.

**Why direct commit (no CAS) is safe.** Per `skills/role-typed-task-state.md` writer-responsibilities, `builder.md`'s single owner is the builder role bound to the current binding for the duration of the claim. The atomic-claim lock (frontmatter `claimed_by` on main) plus the local wrapper lockfile (`.git/echo-builder-in-progress.d/`) together prevent any second writer from existing. The CAS protocol applies to `round-state.md` because it has two concurrent writers (watcher post-combine + strategist between rounds); `builder.md` does not.

### Other bindings

Claude Code (in-session via `/process-backlog`) and Cursor's Claude (in-session via the same skill) execute this protocol by direct skill loading — no wrapper. The codex wrapper exists because `codex exec` is a CLI binary that reads its prompt from stdin; Claude Code and Cursor's Claude read skills natively through their tool surface.
