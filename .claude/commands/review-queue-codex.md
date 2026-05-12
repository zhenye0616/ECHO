---
description: Reviewer loop tick — Codex side. One review per tick. Polls backlog/reviews/**/r*/request.md for any round whose codex.md does not yet exist, performs the review at request.spec_commit_sha, writes codex.md atomically, commits + pushes via push-with-retry.sh, then logs to the dogfooding journal AFTER the response file is committed.
---

You are running one tick of the **Codex-side** review queue loop. **Do not chain reasoning across ticks.** One review per tick — exit and wait for the next loop fire.

Bind the variable `MY_REVIEWER=codex` for this prompt. See `.claude/commands/review-queue-cursor.md` for the Cursor-side equivalent.

## Step 1 — Pull origin/main first

```bash
cd ~/Desktop/Project_echo
git pull --rebase origin main
```

This catches any new request directories AND ensures you are reviewing against the up-to-date spec. **Mandatory** — without it, you may write a review against a stale artifact.

## Step 2 — Scan for missing responses

Find any `backlog/reviews/<item_id>/r<N>/request.md` whose corresponding `<item_id>/r<N>/codex.md` does **not** exist. If `combined.md` already exists for that round (the strategist watcher beat you), skip — your review is no longer needed.

```bash
for req in backlog/reviews/*/r*/request.md; do
  dir=$(dirname "$req")
  if [ -f "$dir/codex.md" ]; then continue; fi
  if [ -f "$dir/combined.md" ]; then continue; fi
  # this is your candidate; one per tick
  CANDIDATE="$req"
  break
done
```

If no candidate, log a one-line "tick: no codex reviews to write" to stderr (NOT the journal — the journal is for actual review writes) and exit 0.

## Step 3 — Read artifact at request SHA

Parse the candidate `request.md` frontmatter to get `artifact_path` and `spec_commit_sha`. Read the artifact at the requested SHA (NOT working-tree HEAD — this is the drift-recovery anchor):

```bash
git show "<spec_commit_sha>:<artifact_path>" > /tmp/echo-rq-artifact.md
```

If `git show` fails (SHA is unreachable), append a one-line SHA-drift entry to `raw/internal/queue-errors.md` and exit without writing a response. Do NOT write to the journal for this; it is a queue error, not a review.

## Step 4 — Perform the review

Read `/tmp/echo-rq-artifact.md` plus any inline embeds in the `request.md` body. Apply your reviewer voice: **Codex catches implementability + code-grounded gaps.** Look for:

- Implementation steps that are missing concrete commands / paths / flags.
- Falsifiable claims that are not testable.
- Race conditions and atomicity gaps in any prescribed mechanism.
- Library / API assumptions that don't match the current installation.

Construct the response frontmatter and findings list per `tools/review-queue/schemas/reviewer.schema.json`. Use the per-reviewer verdict enum: `{proceed, proceed_after_patches, pushback}` — never `divergent` / `single_reviewer_timeout` / `no_responses` (those are combined-only).

## Step 5 — Write codex.md atomically and push

Write to a unique temp file, then `os.link` it into place (no overwrite). If `FileExistsError`, someone else (a retry of yours, or a parallel codex agent) wrote first — drop your temp and skip this candidate.

```python
import os, uuid
tmp = f"{final}.{uuid.uuid4().hex}.tmp"
with open(tmp, "w") as f: f.write(content)
try:
    os.link(tmp, final); os.unlink(tmp)
except FileExistsError:
    os.unlink(tmp); raise SystemExit(0)
```

Then commit + push via the shared helper:

```bash
git add "<dir>/codex.md"
git commit -m "review-r<N>: codex on <item_id>"
tools/review-queue/push-with-retry.sh "review-r<N>: codex on <item_id>"
```

This is an **operational push**, not a ship push — it does not need founder approval per §"Out of Scope" #4 of the 039 spec.

## Step 6 — Log to the dogfooding journal AFTER commit

Append a 6-field entry to `raw/internal/dogfooding/mcp-interactions-journal.md` per CLAUDE.md discipline. The entry references the committed response file; it does **not** coordinate the queue. Then regenerate the HTML twin.

**Do not write the journal as part of the queue handshake.** The journal is observation-only; mixing it with queue state produces cross-reviewer journal-edit races (the case 039 §Implementation Notes calls out).

## Step 7 — Exit

One review per tick. Next tick picks up the next missing response.
