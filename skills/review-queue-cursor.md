---
description: Reviewer loop tick — Cursor side. One review per tick. Polls backlog/reviews/**/r*/request.md for any round whose cursor.md does not yet exist, performs the review at request.spec_commit_sha, writes cursor.md atomically, commits + pushes via push-with-retry.sh, then logs to the dogfooding journal AFTER the response file is committed.
---

You are running one tick of the **Cursor-side** review queue loop. **Do not chain reasoning across ticks.** One review per tick — exit and wait for the next loop fire.

Bind the variable `MY_REVIEWER=cursor` for this prompt. See `.claude/commands/review-queue-codex.md` for the Codex-side equivalent.

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

## Step 5 — Write cursor.md atomically and commit via the validation helper

```python
import os, uuid
# 043 AC4: late-response race guard. If combined.md was written during the
# review window, our response is stale — discard without linking.
round_dir = os.path.dirname(final)
if os.path.exists(os.path.join(round_dir, "combined.md")):
    raise SystemExit(0)
tmp = f"{final}.{uuid.uuid4().hex}.tmp"
with open(tmp, "w") as f: f.write(content)
try:
    os.link(tmp, final); os.unlink(tmp)
except FileExistsError:
    os.unlink(tmp); raise SystemExit(0)
```

Then commit + push via the validation helper (AC4 of item 041 — mechanically enforces `reviewer.schema.json` before any git operation):

```bash
tools/review-queue/commit-reviewer-response.sh "$dir/cursor.md" cursor "$N" "$item_id"
```

On validation failure the helper quarantines the file to `<path>.invalid.<ISO-ts>` and appends a `VALIDATION-FAIL:` line to `raw/internal/queue-errors.md`; on success it commits with message `review-r<N>: cursor on <item_id>` and pushes via `push-with-retry.sh`.

Operational push; no founder approval needed per §"Out of Scope" #4.

## Step 6 — Log to the dogfooding journal AFTER commit

Run this step **only after `commit-reviewer-response.sh` exits 0**. If the helper exited non-zero, the response was quarantined and `queue-errors.md` has the trace — do NOT also write a journal entry for that tick.

Append a 6-field journal entry to `raw/internal/dogfooding/mcp-interactions-journal.md` per CLAUDE.md, referencing the committed response file. Regenerate the HTML twin. **Never as part of the handshake** — journal is observation-only.

## Step 7 — Exit

One review per tick. Next tick picks up the next missing response.
