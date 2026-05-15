---
description: Reviewer loop tick — Cursor side. One review per tick. Polls backlog/reviews/**/r*/request.md for any round whose cursor.md does not yet exist, performs the review at request.spec_commit_sha, writes cursor.md atomically, commits + pushes via push-with-retry.sh, then logs to the dogfooding journal AFTER the response file is committed.
---

You are running one tick of the **Cursor-side** review queue loop. **Do not chain reasoning across ticks.** One review per tick — exit and wait for the next loop fire.

Bind the variable `MY_REVIEWER=cursor` for this prompt. See `.claude/commands/review-queue-codex.md` for the Codex-side equivalent.

## Binding-specific notes — Cursor's Claude (IDE-mode)

This skill runs interactively from a Cursor IDE session — there is no launchd wrapper. Cursor reviewer ticks are explicitly NOT routed through `tools/review-queue/_run_reviewer.sh`; the `_reviewer_gate.py` rejects IDE-mode reviewers per the existing 043 contract.

**050 AC4 worktree-isolation invariant for Cursor reviewer ticks.** Cursor's Claude MUST perform the same worktree-isolation lifecycle as the launchd-fired codex/codex-ops reviewers, encoded here as IDE-mode prose because there is no wrapper to do it. Two implementations of the same lifecycle (one in bash via `_run_reviewer.sh`, one in this skill's prose) must produce byte-equivalent worktree management observable from `origin/main`.

Per-tick lifecycle (do this in this exact order at the start of every Cursor reviewer tick, before Step 1 below):

```bash
# Pre-flight hygiene (order matters)
cd "${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}"
git worktree prune || true
REGISTERED_WT=$(git worktree list --porcelain | awk '/^worktree /{print $2}')
# GC unregistered $TMPDIR/echo-* orphans older than 60 min; skip registered worktrees regardless of mtime
if [ -n "${TMPDIR:-}" ] && [ -d "$TMPDIR" ]; then
  while IFS= read -r -d '' orphan; do
    if printf '%s\n' "$REGISTERED_WT" | grep -Fxq "$orphan"; then continue; fi
    rm -rf -- "$orphan" || true
  done < <(find "$TMPDIR" -maxdepth 1 -type d -name 'echo-*' -mmin +60 -print0 2>/dev/null)
fi

# Create the ephemeral, detached-HEAD worktree
git fetch origin main
[ -n "${TMPDIR:-}" ] || { echo "TMPDIR unset; cannot place ephemeral worktree"; exit 1; }
WT="$TMPDIR/echo-cursor-$(uuidgen)"
git worktree add --detach "$WT" origin/main

# Cleanup trap (success + failure paths — uniform lost-work semantics, no preservation)
cleanup() {
  local rc=$?
  cd "$HOME/Desktop/Project_echo" 2>/dev/null || true
  if [ -n "${WT:-}" ] && [ -d "$WT" ]; then
    git worktree remove --force "$WT" 2>/dev/null || true
  fi
  git worktree prune 2>/dev/null || true
  return $rc
}
trap cleanup EXIT
trap 'cleanup; exit 1' ERR INT TERM

# Route the rest of the tick through the worktree
cd "$WT"
export ECHO_REVIEW_QUEUE_REPO_ROOT="$WT"
```

Steps 1–7 below then execute inside `$WT`. The founder's live `main` checkout `.git/index` is never written to by this tick. The journal commit in Step 6 must complete its `push-with-retry.sh` BEFORE the cleanup trap fires (natural ordering inside the prompt body).

## Step 1 — Pull origin/main first

```bash
cd "${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}"
git pull --rebase origin main
```

(Steady-state: `ECHO_REVIEW_QUEUE_REPO_ROOT` is unset → defaults to the production repo. The 041 wrapper script + AC5 smoke set it explicitly so the launchd job and tests use the right tree.)

This catches any new request directories AND ensures you are reviewing against the up-to-date spec. **Mandatory** — without it, you may write a review against a stale artifact.

## Step 2 — Scan for missing responses

Find any `backlog/reviews/<item_id>/r<N>/request.md` whose corresponding `<item_id>/r<N>/cursor.md` does **not** exist, AND whose `request.requested_reviewers` includes `cursor`. If `combined.md` already exists for that round (the strategist watcher beat you), skip. If `requested_reviewers` does not include `cursor` (per 043 AC1), skip silently.

```bash
MY_REVIEWER=cursor
CANDIDATE=""
for req in backlog/reviews/*/r*/request.md; do
  dir=$(dirname "$req")
  if [ -f "$dir/$MY_REVIEWER.md" ]; then continue; fi
  if [ -f "$dir/combined.md" ]; then continue; fi
  # 043 AC1: skip rounds where MY_REVIEWER is not in requested_reviewers.
  if ! python3 -c "
import sys, yaml
fm = yaml.safe_load(open('$req').read().split('---')[1])
sys.exit(0 if '$MY_REVIEWER' in fm.get('requested_reviewers', []) else 1)
"; then
    continue
  fi
  CANDIDATE="$req"
  break
done
```

If no candidate, log "tick: no cursor reviews to write" to stderr (NOT the journal) and exit 0.

## Step 3 — Read artifact at request SHA

Parse the candidate `request.md` frontmatter to get `artifact_path` and `spec_commit_sha`. Read the artifact at the requested SHA:

```bash
git show "<spec_commit_sha>:<artifact_path>" > /tmp/echo-rq-artifact.md
```

If `git show` fails (SHA is unreachable), append a one-line SHA-drift entry to `raw/internal/queue-errors.md` and exit without writing a response.

## Step 4 — Perform the review

Read the artifact plus any inline embeds in the `request.md` body. Apply your reviewer voice: **Cursor catches scope-coherence + role-split + correctness gaps.** Look for:

- Scope-creep against the §Out of Scope list.
- Acceptance criteria that contradict the §Goal or each other.
- Role-split ambiguity (who writes / who reads / who owns this artifact?).
- Drift watch: did this round reintroduce surface area a prior round cut?

Construct the response frontmatter and findings list per `tools/review-queue/schemas/reviewer.schema.json`. Per-reviewer verdict enum: `{proceed, proceed_after_patches, pushback}` only.

## Step 5 — Validate, write cursor.md atomically, then commit via the validation helper

Write your fully-formed response content to a unique temp file FIRST. **Before** `os.link`-ing it into the canonical `<dir>/cursor.md` path, run the pre-link YAML gate (045 AC1). On failure, delete the temp file, regenerate the response in-session, and re-run the gate. After all in-session retries are exhausted, log a single `PRE-LINK-INVALID:` row to `raw/internal/queue-errors.md` and exit non-zero — the next tick will re-poll the round and re-attempt.

```python
import os, uuid, subprocess
# 043 AC4: late-response race guard. If combined.md was written during the
# review window, our response is stale — discard without linking.
round_dir = os.path.dirname(final)
if os.path.exists(os.path.join(round_dir, "combined.md")):
    raise SystemExit(0)
tmp = f"{final}.{uuid.uuid4().hex}.tmp"
with open(tmp, "w") as f: f.write(content)

# 045 AC1 — pre-link YAML gate. Validate against reviewer.schema.json BEFORE
# os.link so malformed frontmatter never enters the live state. Stderr-only
# on the retry path; queue-errors.md only on terminal failure.
gate = subprocess.run(
    ["tools/review-queue/validate_response_yaml.py", tmp],
    capture_output=True, text=True,
)
if gate.returncode != 0:
    os.unlink(tmp)
    # Regenerate in-session; on terminal exhaustion append a single
    # PRE-LINK-INVALID row to raw/internal/queue-errors.md and exit 1.
    raise SystemExit(1)

try:
    os.link(tmp, final); os.unlink(tmp)
except FileExistsError:
    os.unlink(tmp); raise SystemExit(0)
```

**050 AC1 step 5 — same-reviewer launchd-overlap no-op guard** (mirrored from codex/codex-ops for parity; Cursor reviewer ticks are interactive rather than launchd-fired, but a manually-invoked duplicate produces the same race). Before the post-link commit, re-fetch `origin/main` and check whether `<dir>/cursor.md` already exists upstream for this round:

```bash
git fetch origin main
upstream_path="backlog/reviews/$item_id/r$N/cursor.md"
if git cat-file -e "origin/main:$upstream_path" 2>/dev/null; then
  echo "tick: cursor.md already exists at $upstream_path on origin — duplicate, exiting 0" >&2
  exit 0
fi
```

Then commit + push via the post-link validation helper (AC4 of item 041 — defense-in-depth backstop that mechanically re-checks `reviewer.schema.json` before any git operation, in case the pre-link gate missed a file shape):

```bash
tools/review-queue/commit-reviewer-response.sh "$dir/cursor.md" cursor "$N" "$item_id"
```

On validation failure the helper quarantines the file to `<path>.invalid.<ISO-ts>` and appends a `VALIDATION-FAIL:` line to `raw/internal/queue-errors.md`; on success it commits with message `review-r<N>: cursor on <item_id>` and pushes via `push-with-retry.sh`. With AC1's pre-link gate in place the post-link path should rarely fire.

Operational push; no founder approval needed per §"Out of Scope" #4.

## Step 6 — Log to the dogfooding journal AFTER commit (and BEFORE worktree cleanup)

Run this step **only after `commit-reviewer-response.sh` exits 0**. If the helper exited non-zero, the response was quarantined and `queue-errors.md` has the trace — do NOT also write a journal entry for that tick.

Append a 6-field journal entry to `raw/internal/dogfooding/mcp-interactions-journal.md` per CLAUDE.md, referencing the committed response file. Regenerate the HTML twin and push the journal commit via `push-with-retry.sh` as a **sibling commit before this prompt returns**:

```bash
git add raw/internal/dogfooding/mcp-interactions-journal.md raw/internal/dogfooding/mcp-interactions-journal.html
git commit -m "journal: cursor r$N review tick on $item_id"
tools/review-queue/push-with-retry.sh "journal: cursor r$N review tick on $item_id"
```

**050 ordering invariant — journal pushes BEFORE the worktree cleanup trap fires.** The IDE-mode worktree lifecycle established in the binding-specific note removes the worktree on prompt exit; any journal commit that has not been pushed by then is lost. The journal commit is the last thing this prompt does before returning. **Never as part of the handshake** — journal is observation-only.

## Step 7 — Exit

One review per tick. Next tick picks up the next missing response.
