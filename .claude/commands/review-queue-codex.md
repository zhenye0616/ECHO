---
description: Reviewer loop tick — Codex side. One review per tick. Polls backlog/reviews/**/r*/request.md for any round whose codex.md does not yet exist, performs the review at request.spec_commit_sha, writes codex.md atomically, commits + pushes via push-with-retry.sh, then logs to the dogfooding journal AFTER the response file is committed.
---

You are running one tick of the **Codex-side** review queue loop. **Do not chain reasoning across ticks.** One review per tick — exit and wait for the next loop fire.

Bind the variable `MY_REVIEWER=codex` for this prompt. See `.claude/commands/review-queue-cursor.md` for the Cursor-side equivalent.

## Step 1 — Pull origin/main first

```bash
cd "${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}"
git pull --rebase origin main
```

(Steady-state: `ECHO_REVIEW_QUEUE_REPO_ROOT` is unset → defaults to the production repo. The 041 wrapper script + AC5 smoke set it explicitly so the launchd job and tests use the right tree.)

This catches any new request directories AND ensures you are reviewing against the up-to-date spec. **Mandatory** — without it, you may write a review against a stale artifact.

## Step 2 — Scan for missing responses

Find any `backlog/reviews/<item_id>/r<N>/request.md` whose corresponding `<item_id>/r<N>/codex.md` does **not** exist, AND whose `request.requested_reviewers` includes `codex`. If `combined.md` already exists for that round (the strategist watcher beat you), skip — your review is no longer needed. If `requested_reviewers` does not include `codex` (per 043 AC1 — the per-round roster is now the source of truth), skip silently — this round did not ask for a Codex review.

```bash
MY_REVIEWER=codex
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

The `completed_at` value MUST be single-quoted (`'2026-05-XXTHH:MM:SSZ'`); unquoted ISO 8601 timestamps are auto-parsed by PyYAML as `datetime.datetime` and rejected by the schema. Use this canonical frontmatter shape (placeholders `XX` / `HH:MM:SS` are intentional — substitute today's values, do NOT copy the example date verbatim):

```yaml
---
item_id: "2026-05-XX-NNN-some-spec-slug"
round: 1
reviewer: "codex"
artifact_sha: "abc1234"
completed_at: '2026-05-XXTHH:MM:SSZ'
verdict: "proceed_after_patches"
findings: []
---
```

## Step 5 — Validate, write codex.md atomically, then commit via the validation helper

Write your fully-formed response content to a unique temp file FIRST. **Before** `os.link`-ing it into the canonical `<dir>/codex.md` path, run the pre-link YAML gate (045 AC1). On failure, delete the temp file, regenerate the response in-session, and re-run the gate. After all in-session retries are exhausted, log a single `PRE-LINK-INVALID:` row to `raw/internal/queue-errors.md` and exit non-zero — the next tick will re-poll the round and re-attempt.

```python
import os, uuid, subprocess
# 043 AC4: late-response race guard. The os.link is atomic, but the window
# between "Codex started reviewing" and "Codex is about to link" is minutes
# long. If combined.md was written during that window, our response is stale —
# discard it without linking. The round is already terminal from this
# reviewer's POV; next tick will see r<N+1>/request.md if there is one.
round_dir = os.path.dirname(final)
if os.path.exists(os.path.join(round_dir, "combined.md")):
    raise SystemExit(0)
tmp = f"{final}.{uuid.uuid4().hex}.tmp"
with open(tmp, "w") as f: f.write(content)

# 045 AC1 — pre-link YAML gate. Validate against reviewer.schema.json BEFORE
# os.link so malformed frontmatter never enters the live state. The helper
# wraps validate.py reviewer; on failure it writes the parser/schema
# diagnostic to stderr only — it does NOT touch queue-errors.md (in-session
# retries are not queue errors; only terminal failure is).
gate = subprocess.run(
    ["tools/review-queue/validate_response_yaml.py", tmp],
    capture_output=True, text=True,
)
if gate.returncode != 0:
    os.unlink(tmp)
    # Regenerate in-session per codex CLI's existing retry pattern, just
    # shifted earlier in the flow. After exhausting retries, append a single
    # PRE-LINK-INVALID row to raw/internal/queue-errors.md and exit 1; do not
    # call os.link, do not touch the canonical path.
    raise SystemExit(1)

try:
    os.link(tmp, final); os.unlink(tmp)
except FileExistsError:
    os.unlink(tmp); raise SystemExit(0)
```

Then commit + push via the post-link validation helper (AC4 of item 041 — defense-in-depth backstop that mechanically re-checks `reviewer.schema.json` before any git operation, in case the pre-link gate missed a file shape):

```bash
tools/review-queue/commit-reviewer-response.sh "$dir/codex.md" codex "$N" "$item_id"
```

The helper runs `tools/review-queue/validate.py reviewer <path>`; on failure it quarantines the malformed file to `<path>.invalid.<ISO-ts>` (so the next poll regenerates rather than skipping the round forever) and appends a `VALIDATION-FAIL:` line to `raw/internal/queue-errors.md`. On success it `git add`s the file, commits with message `review-r<N>: codex on <item_id>`, and pushes via `push-with-retry.sh`. With AC1's pre-link gate in place the post-link path should rarely fire — it remains as a backstop for shapes the pre-link validator misses (e.g., a future schema change the helper hasn't been taught about).

This is an **operational push**, not a ship push — it does not need founder approval per §"Out of Scope" #4 of the 039 spec.

## Step 6 — Log to the dogfooding journal AFTER commit

Run this step **only after `commit-reviewer-response.sh` exits 0** (validation passed, commit + push succeeded). If the helper exited non-zero, the response was quarantined and `queue-errors.md` has the trace — do NOT also write a journal entry for that tick.

Append a 6-field entry to `raw/internal/dogfooding/mcp-interactions-journal.md` per CLAUDE.md discipline. The entry references the committed response file; it does **not** coordinate the queue. Then regenerate the HTML twin.

**Do not write the journal as part of the queue handshake.** The journal is observation-only; mixing it with queue state produces cross-reviewer journal-edit races (the case 039 §Implementation Notes calls out).

## Step 7 — Exit

One review per tick. Next tick picks up the next missing response.
