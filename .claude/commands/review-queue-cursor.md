---
description: Reviewer loop tick — Cursor side. One review per tick. Polls backlog/reviews/**/r*/request.md for any round whose cursor.md does not yet exist, performs the review at request.spec_commit_sha, writes cursor.md atomically, commits + pushes via push-with-retry.sh, then logs to the dogfooding journal AFTER the response file is committed.
---

You are running one tick of the **Cursor-side** review queue loop. **Do not chain reasoning across ticks.** One review per tick — exit and wait for the next loop fire.

Bind the variable `MY_REVIEWER=cursor` for this prompt. See `.claude/commands/review-queue-codex.md` for the Codex-side equivalent.

## Step 1 — Pull origin/main first

```bash
cd ~/Desktop/Project_echo
git pull --rebase origin main
```

This catches any new request directories AND ensures you are reviewing against the up-to-date spec. **Mandatory** — without it, you may write a review against a stale artifact.

## Step 2 — Scan for missing responses

Find any `backlog/reviews/<item_id>/r<N>/request.md` whose corresponding `<item_id>/r<N>/cursor.md` does **not** exist. If `combined.md` already exists for that round (the strategist watcher beat you), skip.

```bash
for req in backlog/reviews/*/r*/request.md; do
  dir=$(dirname "$req")
  if [ -f "$dir/cursor.md" ]; then continue; fi
  if [ -f "$dir/combined.md" ]; then continue; fi
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

## Step 5 — Write cursor.md atomically and push

```python
import os, uuid
tmp = f"{final}.{uuid.uuid4().hex}.tmp"
with open(tmp, "w") as f: f.write(content)
try:
    os.link(tmp, final); os.unlink(tmp)
except FileExistsError:
    os.unlink(tmp); raise SystemExit(0)
```

```bash
git add "<dir>/cursor.md"
git commit -m "review-r<N>: cursor on <item_id>"
tools/review-queue/push-with-retry.sh "review-r<N>: cursor on <item_id>"
```

Operational push; no founder approval needed per §"Out of Scope" #4.

## Step 6 — Log to the dogfooding journal AFTER commit

Append a 6-field journal entry to `raw/internal/dogfooding/mcp-interactions-journal.md` per CLAUDE.md, referencing the committed response file. Regenerate the HTML twin. **Never as part of the handshake** — journal is observation-only.

## Step 7 — Exit

One review per tick. Next tick picks up the next missing response.
