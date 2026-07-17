---
description: Atomically claim or resume a backlog item, work it in an isolated worktree, push the branch, move it to pending_review. Idempotent: a crashed run resumes safely on re-invocation.
---

You are an ECHO builder agent. Pick up the next ready backlog item — or resume a previously crashed run — and execute it through the full implementation loop. Multiple agents may run in parallel; the atomic-claim mechanic handles collisions; the reconciliation step handles crash recovery.

Backlog lifecycle is `proposed/ → ready/ → claimed/ → pending_review/ → complete/`. Builders only claim from `ready/`: that folder means the spec is claimable and carries a fresh `ready_content_sha` seal. `proposed/` is spec-draft/review state and is reviewable by the review queue, but it is never a builder candidate. New specs are authored into `backlog/proposed/`; the watcher promotes them to `ready/` after spec-review convergence.

### Scoped echo-context external-target lane

Items 136, 137a, 137b, 138 and exactly two successor items replacing 139 use the narrow two-repository/live-execute protocol in `raw/internal/decisions/2026-07-15-echo-context-successor-repository-execution.md`, `raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md`, and `raw/internal/decisions/2026-07-17-echo-context-137-two-pass-scope-reset.md`. The suffixed siblings jointly occupy the original 137 step. For a covered claimed item, the builder may write only the external repository/worktree/feature-branch paths explicitly named by that item's `files_to_modify`; when the reviewed item changes echo-context source, it must populate the applicable target fields defined in `backlog/README.md`. Project_echo remains the claim/run-log/task-state root, and its normal record-only atomic-claim and final-handoff commits still push to Project_echo `main` through this skill's existing protocol. This exception does not authorize a builder to merge or push implementation bytes to either main branch, push target `main`, publish/release, install, mutate live paths, fill canonical landed SHAs, or invoke the coordinator's delegated authority. A fresh builder still hands the item to a different implementation reviewer and stops.

The persistent coordinator, not the builder, resolves covered-item uncertainty and performs separately authorized merge, publication, installation, and live-execute operations. Generic founder-only or no-external-write language later in this skill is read with this narrow exception; ordinary items remain unchanged.

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
  # (the path printed by tools/blocked.py must be from backlog/ready/)
  # Selection is enforced by tools/blocked.py (deterministic, validated, tested).
  # Do NOT filter manually — the agent's job is to call the script, not to interpret
  # blocked_by or ready_content_sha status by reading frontmatter. The script
  # checks dangling refs/cycles and ready-stage freshness before returning a
  # candidate; if validation fails, the loop aborts.
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

### E2. Move Item to pending_review — P1 atomic stage transition

The stage move from `backlog/claimed/` to `backlog/pending_review/` is the
current consumer of **P1 — Atomic state transition** (see
`backlog/_followups.md` "P1 - Atomic state transition" for the primitive
contract). The transcript below satisfies P1 by:

- using `origin/main:$DEST` as the **durable boundary** (a local commit alone
  is not the boundary — observers gate on the pushed ref);
- running a **rollback-only** `recover_p1_stage_move` before pull/rebase so a
  crashed previous attempt converges from on-disk state without operator input;
- running a **separate caller-side finish-path block** that retries
  `push-with-retry.sh` when the local commit exists but the boundary is not yet
  observed remotely (the local commit is finished, not rolled back); and
- staging the destination contents explicitly with `git add "$DEST"` after
  `git mv` so the publish commit carries the edited handoff metadata rather
  than the old blob.

The recovery guard's touched-surface set is the source item path, destination
item path, and optional builder pointer at `backlog/task-state/<id>/builder.md`.
The run log (`$LOG`) is **explicitly excluded** because it is pre-existing
agent-authored content that the publish block only `git add`s; the recovery
procedure never touches it.

```bash
set -euo pipefail

cd ~/Desktop/Project_echo

ITEM_BASENAME="$(basename "$ITEM_FILE")"
ITEM_FILE="backlog/claimed/$ITEM_BASENAME"
DEST="backlog/pending_review/$ITEM_BASENAME"
TASK_ID="${ITEM_ID}"
POINTER="backlog/task-state/$TASK_ID/builder.md"

# P1 recovery surfaces are the set of file paths this consumer's transition
# CREATES OR MUTATES. The run log ($LOG) is intentionally NOT in this set: it
# is pre-existing agent-authored content written during E1 (before this stage
# move), and the recovery procedure must NOT touch it.
P1_ALLOWED_RECOVERY_PREFIXES=("backlog/" "backlog/task-state/")
P1_TOUCHED_SURFACES=("$ITEM_FILE" "$DEST" "$POINTER")

p1_assert_allowed_recovery_surfaces() {
  local path prefix ok
  for path in "$@"; do
    case "$path" in
      ""|/*|../*|*/../*|*/..|.)
        echo "ERROR: unsafe P1 recovery path: $path" >&2
        return 2
        ;;
    esac
    ok=0
    for prefix in "${P1_ALLOWED_RECOVERY_PREFIXES[@]}"; do
      case "$path" in
        "$prefix"*) ok=1 ;;
      esac
    done
    if [ "$ok" -ne 1 ]; then
      echo "ERROR: P1 recovery path outside allowed prefixes: $path" >&2
      return 2
    fi
  done
}

# Durable-boundary observability gate for this consumer.
p1_boundary_published_remotely() {
  git fetch --quiet origin main 2>/dev/null || return 1
  git cat-file -e "origin/main:$DEST" 2>/dev/null
}

# Detect the post-commit-pre-push partial state. The caller-side finish-path
# block (NOT recover_p1_stage_move, which is rollback-only) retries push.
p1_local_commit_unpushed() {
  git cat-file -e "HEAD:$DEST" 2>/dev/null && ! p1_boundary_published_remotely
}

recover_p1_stage_move() {
  local surfaces=("$@")
  local path STATUS

  p1_assert_allowed_recovery_surfaces "${surfaces[@]}" || return $?

  # Idempotent done — boundary is already observed remotely.
  if p1_boundary_published_remotely; then
    return 0
  fi

  # Post-commit, pre-push — defer to the caller's finish-path block.
  # Rolling back a committed transition would discard work; finishing it
  # belongs in a separate block so this function's contract stays rollback-only.
  if p1_local_commit_unpushed; then
    return 0
  fi

  STATUS="$(git status --porcelain -- "${surfaces[@]}")"
  [ -z "$STATUS" ] && return 0

  # Per-surface dispatch: `git restore` aborts on pathspecs not known to git
  # (neither in HEAD nor in the index), so split into "tracked (HEAD or index)"
  # vs "truly untracked". The tracked branch handles both pre-rename in-HEAD
  # paths AND staged-but-not-in-HEAD paths (e.g., a `git mv` left a rename
  # staged at the destination before the crash). For staged-only paths,
  # `git restore --staged --worktree` removes them from both index and worktree
  # cleanly; `git rm --cached` (without -f) refuses when the staged blob
  # differs from both HEAD and worktree, which is exactly the post-`git mv`
  # crash state. No hidden failure suppression in either branch.
  for path in "${surfaces[@]}"; do
    if git cat-file -e "HEAD:$path" 2>/dev/null || git ls-files --error-unmatch -- "$path" >/dev/null 2>&1; then
      git restore --staged --worktree -- "$path" || return 4
    else
      git rm --cached --ignore-unmatch -- "$path" || return 4
      [ -e "$path" ] && { rm -f -- "$path" || return 4; }
    fi
  done

  # Hard fail if any touched surface remains dirty. Not human triage.
  git diff --quiet -- "${surfaces[@]}" || return 5
  git diff --cached --quiet -- "${surfaces[@]}" || return 5
}

# Recovery's non-zero return MUST block pull/publish. Without `|| exit $?`,
# pull/rebase can run on top of a partial-but-not-recovered state.
# Documented return codes:
#   2 — prefix-guard violation (unsafe path or outside allowed prefixes)
#   4 — per-surface dispatch failure (real error from git restore / git rm / rm)
#   5 — post-recovery dirty-check failure
recover_p1_stage_move "${P1_TOUCHED_SURFACES[@]}" || exit $?

# Idempotent done — boundary already observed remotely; nothing else to do.
if p1_boundary_published_remotely; then
  exit 0
fi

# Caller-side finish path. When the local commit exists but the boundary is
# not yet observed remotely, retry the push; verify the boundary; exit.
# Independent exit codes (NOT returned from recover_p1_stage_move):
#   3 — caller's push-with-retry.sh failed in the finish-path block
#   6 — push reported success but origin/main:$DEST not visible
if p1_local_commit_unpushed; then
  tools/review-queue/push-with-retry.sh "review: $ITEM_ID" || exit 3
  p1_boundary_published_remotely || { echo "ERROR: push reported success but origin/main:$DEST not visible" >&2; exit 6; }
  exit 0
fi

# Pull with --autostash. The surrounding E1 may have just written/appended
# the agent-authored run log ($LOG), and push-with-retry.sh can append a
# PUSH-RACE-FALLBACK entry to raw/internal/queue-errors.md. Both are tracked
# and may be dirty when this transcript runs; --autostash stashes/restores
# them around the rebase so the pull does not abort on "unstaged changes".
git -c rebase.autoStash=true pull --rebase origin main || exit $?

# Step 1 — edit handoff metadata on the source path.
# Edit head_sha / pr_url / agent_notes in place on $ITEM_FILE.
# (Agent-driven; performed via Edit/Write tools, not via bash.)
#   head_sha: "<sha pushed>"
#   pr_url: "<if PR opened, else empty>"
#   agent_notes: |
#     <one-paragraph summary if work succeeded>
#     OR
#     BLOCKED: <specific question> | Tried: <...> | Best guess: <...> | Why escalated: <rule>

# E2.5. Final builder-state refresh (protocol-wide). This is the only
# canonical implementation site; binding-specific notes defer here rather
# than duplicating final-handoff logic. The patcher records --spec-path
# verbatim into canonical_anchors.spec without reading the file from that
# path, so pass the final destination path BEFORE git mv. `--outcome
# complete` on the success path; `--outcome escalated` on the BLOCKED
# escalation path. Use `OUTCOME=complete` or `OUTCOME=escalated` accordingly.
HAS_TASK_STATE_REF=$(
  awk '/^---$/{c++; next} c==1 && /^task_state_ref:/{print; exit}' "$ITEM_FILE"
)
if [ -n "$HAS_TASK_STATE_REF" ] || [ -f "$POINTER" ]; then
  python3 tools/task-state/patch-builder-state.py \
    --task-id "$TASK_ID" \
    --outcome "$OUTCOME" \
    --spec-path "$DEST" \
    --branch "agent/$SLUG" \
    --head-sha "$HEAD_SHA" \
    --run-log "$LOG"
  # The helper is a no-op when the pointer is missing (compatibility for
  # items that set task_state_ref before the builder adopted builder.md).
  if [ -f "$POINTER" ]; then
    python3 tools/task-state/lint.py "$POINTER"   # hard stop on failure
  fi
fi

# E2.6. Commit + push (single final commit) — durable publish block. No
# subprocess that can wait on network, no prose edit, and no tool startup
# belongs between git mv and git commit. After git commit, push-with-retry.sh
# is the boundary publisher — its success is what makes origin/main:$DEST
# observable, which IS the durable boundary for this consumer.
git mv "$ITEM_FILE" "$DEST"
git add "$DEST"
[ -f "$POINTER" ] && git add "$POINTER"
git add "$LOG"
git commit -m "review: $ITEM_ID"
tools/review-queue/push-with-retry.sh "review: $ITEM_ID"

# Final boundary verification. push-with-retry.sh is the publisher; the
# boundary CONTRACT requires us to confirm the remote observed it.
p1_boundary_published_remotely || { echo "ERROR: push reported success but origin/main:$DEST not visible" >&2; exit 6; }
```

**Why `git add "$DEST"` is required.** `git mv` after editing the source
stages the rename at the *old* blob while leaving the edited destination
contents unstaged. Without `git add "$DEST"`, the commit publishes stale
handoff metadata and leaves the edited destination dirty.

**Why `--spec-path "$DEST"` even though the patcher runs before `git mv`.**
The patcher records its `--spec-path` argument verbatim into
`canonical_anchors.spec`; it never reads the file from that path. Passing the
final destination path before the rename lets the pointer ship pointing at
the post-publish location.

**Lint failure is a hard stop, not silent shipping.** The transcript runs
under `set -euo pipefail`. If `tools/task-state/lint.py "$POINTER"` exits
non-zero, the script exits non-zero, the publish block does not run, and the
operator escalates per the Stopping Conditions section.

**Idempotency.** Re-running this transcript after a successful publish is a
no-op via the `p1_boundary_published_remotely` early-return. A re-run after a
crash converges via either `recover_p1_stage_move` (pre-commit dirty state)
or the caller-side finish-path block (post-commit-pre-push state).

### E3. STOP

Do not pick up another item. The founder reviews ordinary work; the persistent coordinator assigns a different reviewer for the covered echo-context program.

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
- Take any action that affects systems outside this repo, except the exact external target feature-worktree paths explicitly permitted by a covered echo-context item's reviewed specification and the two locked decisions above

## What "Success" Looks Like

By the end of the run:

- One item file is now in `backlog/pending_review/` (committed + pushed on main)
- One run log file is in `raw/internal/agent-runs/` (committed + pushed on main; appended-to if resumed)
- One feature branch `agent/<slug>` exists at `origin` with your work
- Your worktree at `~/Desktop/Project_echo--<slug>/` still exists (founder cleans it up after merge)
- Founder, or the persistent coordinator for a covered echo-context item, has everything needed for independent review

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

The next authority action is to read the run log and decide: re-invoke the wrapper (whose atomic-claim reconciliation path resumes the same item via `claimed_by` match), or escalate to a different builder binding via direct skill loading. The founder owns ordinary items; the persistent coordinator owns this decision for the covered echo-context program.

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
| Atomic claim (the `ready/` → `claimed/` op) | Initial write — same commit as the claim, OR as the very next commit | `current_thesis: "claim of <id>"`; AC list locked; `open_questions:` populated from anything that will be deferred; `canonical_anchors:` to the claimed spec path. Strategist pointers for unclaimed specs start at `backlog/proposed/<id>.md` and move to `ready/` on watcher promotion. |
| Milestone commits (per "Step D" run-log writes) | Update `open_questions` + `locked_decisions` if anything shifts | Same five blocks; updated bullets |
| Move to `pending_review/` (completion or escalation) | **Final refresh runs via the protocol-wide E2.5 step (`tools/task-state/patch-builder-state.py`), not via codex-specific logic.** That step is the only canonical implementation site. It updates frontmatter `last_updated` + `handoff_*` metadata, refreshes the lifecycle marker block in `## current_thesis`, and rewrites `## canonical_anchors` to point at `backlog/pending_review/<item>.md` (schema-compliant `spec` + preserved `reviews`). `## locked_decisions` and `## dont_touch` are preserved byte-for-byte. | Patcher-managed marker block in `## current_thesis`; existing builder-authored `## locked_decisions` and `## dont_touch` content untouched. |

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

---

## Binding-specific notes — Cursor's Claude (IDE-mode)

This section is binding-specific guidance for when **Cursor's Claude** executes this skill from inside the Cursor IDE. The protocol body above (atomic-claim, worktree, test/lint/typecheck, push, move-to-pending_review) is unchanged for every binding; the items below are Cursor-IDE-only concerns layered on top. The shape mirrors the "Binding-specific notes — codex" section above; the same skill body runs in both bindings.

### Trigger mode

- **Founder paste-driven, not headless.** Cursor IDE has no `codex exec`-equivalent today; there is no launchd wrapper to invoke. The founder opens Cursor IDE on the `Project_echo` repo, opens a fresh chat with Cursor's Claude (no prior context), and either pastes the contents of `skills/process-backlog.md` into the chat OR sends a one-line `Follow the protocol in skills/process-backlog.md` instruction.
- Cursor's Claude reads `skills/` directly from the open repo via its native file tools — no adapter copy needed and `.claude/commands/process-backlog.md` is not consulted from inside Cursor.
- The same paste-trigger shape is already in production for the **reviewer** role via `skills/review-queue-cursor.md`; this section extends the IDE-mode trigger ritual to the **builder** role. See `docs/cursor-builder-trigger.md` for the operator-facing step-by-step.
- Manual, on-demand. Not a daemon. The builder lifecycle is one-shot and long-running per claim; periodic auto-invocation would race multiple builders on the same item.

### Serialization is operator-enforced, not provided by Cursor

- Cursor IDE does NOT serialize multiple chats/windows on the same machine. Two parallel Cursor chats both read the same `~/.echo/agent-id` file, both resolve to the same `AGENT_ID`, and both pass the protocol's "find existing claim by `claimed_by`" resume check. They will silently attach to the same `claimed/` item, the same worktree directory, and the same `backlog/task-state/<task-id>/builder.md` pointer — breaking the single-owner invariant the no-CAS direct-commit contract assumes.
- **Rule: at most one active Cursor builder per ECHO_AGENT_ID at a time.** Concretely: at most one Cursor chat per machine running `/process-backlog` on the default `~/.echo/agent-id` UUID. If you need genuinely parallel Cursor builders working DIFFERENT items on the same machine, set a distinct `ECHO_AGENT_ID=<uuid4>` env var (or per-chat override) before invoking the protocol — that gives each chat its own writer identity, its own resume horizon, and its own claim.
- **Second-session recovery:** if a second Cursor chat is opened by mistake while the first is mid-claim under the same `ECHO_AGENT_ID`, **stop the second immediately** — do NOT let it proceed past Step A. The resume check will silently attach it to the first chat's claim and the two will race the worktree + the `builder.md` writes.

### The atomic-claim git op is the only race-loser surface

- When the operator-serialization rule above is followed, the single commit `ready/ → claimed/` push is the only synchronization primitive needed for cross-binding races. If a Cursor builder races a Claude Code builder on the same machine (forbidden per the rule above) or a codex / Claude Code builder on a different machine, only one push succeeds; the loser observes the conflict on next `git pull --rebase` and exits cleanly per Step A's race-loss branch.
- The cross-machine case is naturally serialized by git's non-fast-forward push rejection. The same-machine case is operator-serialized per the rule above. **No new lock primitive** is introduced for the Cursor binding — the codex wrapper's `.git/echo-builder-in-progress.d/` lock directory has no Cursor analogue, and 055 explicitly does not add one.

### `ECHO_AGENT_ID` resolution

- Cursor's Claude reads `~/.echo/agent-id` on its first Bash call inside a `/process-backlog` run; if absent, it generates a UUID4 (`uuidgen`) and writes it. Same `~/.echo/agent-id` file shared with the codex builder per 047 AC1 — different *machines* have different IDs; the same machine across all three bindings (Claude Code, codex, Cursor's Claude) gets one stable ID.
- **Concurrency caveat:** the shared default ID makes cross-binding concurrency on the same machine look like a *resume* (same `claimed_by`) rather than a claim *race*. Per the operator-serialization rule above, do not run two builder bindings concurrently on the same machine with the shared default ID; if intentional parallelism is needed, set distinct `ECHO_AGENT_ID` per binding before invocation.

### ECHO MCP exposure

- Cursor's Claude sees the ECHO MCP server through Cursor's MCP configuration (typically `~/.cursor/mcp.json`; consult Cursor's docs for the current shape). The skill does not auto-register MCP; it inherits whatever the operator has configured at the IDE level.
- **Pre-flight contract:** verify `mcp__echo__echo_ping` returns OK before performing the atomic claim. If MCP is unreachable, abort with a one-line note in the founder paste — do NOT proceed with a claim while MCP is silently missing, since the resulting builder run would lose the in-the-moment journal discipline that the merge-time review depends on.
- The journal-by-proxy rule from `CLAUDE.md` "Dogfooding journal discipline" (046 AC6) does **not** apply to the Cursor builder — Cursor's Claude has its own MCP write path and journals its own `mcp__echo__*` calls in-the-moment per the standard 6-field template.

### Reminder: protocol invariants are unchanged

- Journal discipline (every `mcp__echo__*` call logged in-the-moment to `raw/internal/dogfooding/mcp-interactions-journal.md` with the 6-field template).
- Drift-prevention rules (`wiki/principles/drift-prevention.md`, the five questions in `docs/NORTH_STAR.md`) — Cursor's Claude is no more or less prone to drift than Claude Code or codex.
- Single-owner `builder.md` writer contract (047 AC3) — plain `git add` + `git commit` + `git push`; no CAS; no blob-lease helper. The single-owner invariant is preserved by the operator-serialization rule above, NOT by a new lock primitive.

The binding-specific notes here document IDE-mode operational concerns; they do **not** relax any protocol invariant.
