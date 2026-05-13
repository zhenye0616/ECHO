---
description: Reviewer loop tick — codex-ops side (operational/runtime perspective). One review per tick. Polls backlog/reviews/**/r*/request.md for any round whose codex-ops.md does not yet exist AND whose requested_reviewers includes codex-ops, performs the review at request.spec_commit_sha through an ops/runtime lens, writes codex-ops.md atomically, commits + pushes via push-with-retry.sh, then logs to the dogfooding journal AFTER the response file is committed.
---

You are running one tick of the **codex-ops** review queue loop — the operational/runtime perspective sibling to `codex`. **Do not chain reasoning across ticks.** One review per tick — exit and wait for the next loop fire.

Bind the variable `MY_REVIEWER=codex-ops` for this prompt. See `.claude/commands/review-queue-codex.md` for the implementation-perspective sibling and `.claude/commands/review-queue-cursor.md` for the IDE-side reviewer.

Your lens differs from `codex`'s. Where `codex` looks for implementability + code-grounded gaps, **`codex-ops` looks for what breaks in production**. The split is by failure mode, not by code surface: both reviewers may comment on the same file, but `codex-ops` asks "what fails at runtime?" while `codex` asks "is this implementable as written?"

## Step 1 — Pull origin/main first

```bash
cd "${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}"
git pull --rebase origin main
```

(Steady-state: `ECHO_REVIEW_QUEUE_REPO_ROOT` is unset → defaults to the production repo. The 041 wrapper script + AC5 smoke set it explicitly so the launchd job and tests use the right tree.)

This catches any new request directories AND ensures you are reviewing against the up-to-date spec. **Mandatory** — without it, you may write a review against a stale artifact.

## Step 2 — Scan for missing responses

Find any `backlog/reviews/<item_id>/r<N>/request.md` whose corresponding `<item_id>/r<N>/codex-ops.md` does **not** exist, AND whose `request.requested_reviewers` includes `codex-ops`. If `combined.md` already exists for that round (the strategist watcher beat you), skip — your review is no longer needed. If `requested_reviewers` does not include `codex-ops` (per 043 AC1 — the per-round roster is now the source of truth), skip silently — this round did not ask for a codex-ops review.

```bash
MY_REVIEWER=codex-ops
CANDIDATE=""
for req in backlog/reviews/*/r*/request.md; do
  dir=$(dirname "$req")
  if [ -f "$dir/$MY_REVIEWER.md" ]; then continue; fi
  if [ -f "$dir/combined.md" ]; then continue; fi
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

If no candidate, log a one-line "tick: no codex-ops reviews to write" to stderr (NOT the journal — the journal is for actual review writes) and exit 0.

## Step 3 — Read artifact at request SHA

Parse the candidate `request.md` frontmatter to get `artifact_path` and `spec_commit_sha`. Read the artifact at the requested SHA (NOT working-tree HEAD — this is the drift-recovery anchor):

```bash
git show "<spec_commit_sha>:<artifact_path>" > /tmp/echo-rq-artifact.md
```

If `git show` fails (SHA is unreachable), append a one-line SHA-drift entry to `raw/internal/queue-errors.md` and exit without writing a response. Do NOT write to the journal for this; it is a queue error, not a review.

## Step 4 — Perform the review (ops/runtime lens)

Read `/tmp/echo-rq-artifact.md` plus any inline embeds in the `request.md` body. Apply your reviewer voice: **codex-ops catches operational and runtime failure modes.** Your priorities, in order:

1. **Cron / scheduler interaction.** What fails when this code runs inside a cron-fired tick? What happens if the tick fires mid-disposition of the previous round? What happens if launchd's `StartInterval` overlaps a prior wrapper still running? What happens when the cron environment differs from the interactive shell (missing PATH entries, missing locale, missing TMPDIR)?
2. **Dirty-tree / autostash failure modes.** When `git pull --rebase` is run with `rebase.autoStash=true` (the AC1 cure), what happens if the stashed changes conflict with incoming commits? What's the recovery path? Does the next tick observe a half-popped stash? Does `queue-errors.md` accumulating rows mid-cycle reintroduce the dirty-tree condition the autostash was meant to dissolve?
3. **Launchd / wrapper / shell exit semantics.** What happens when `set -euo pipefail` interacts with a backgrounded subshell? What happens when the wrapper exits non-zero (does the next tick still fire after `StartInterval`)? What happens when stdout/stderr redirection targets a non-existent directory? Are file descriptors leaked across `exec` boundaries? Does the cure for friction #2 (direct-invoke pattern) introduce a *new* footgun for operators who muscle-memory `launchctl kickstart`?
4. **Race conditions.** What if two reviewer ticks race? What if a reviewer writes its `<name>.md` between combine.py's existence check and the strategist's combined-emission? (043 AC4 closed one such race; surface any others — especially any introduced by the AC4 single-reviewer-auto-disposition path of 044, which changes when `combined.md` is written.)
5. **Operational observability.** When the cure for friction #N inevitably fails in some new way, will the operator (strategist or founder) know? Is there a log line, an exit code, a tracked failure mode in `queue-errors.md`? Are the new code paths (AC3 per-reviewer-timeout, AC4 auto-disposition verdict) traceable in the combined.md body, or do they fail silently?

You may overlap with `codex`'s findings on the same line range when the same gap is both an implementation gap AND a runtime concern — that's allowed and useful (043's union-find collapses convergent findings). What you should NOT do is duplicate `codex`'s lens: if a finding is purely "this function isn't called correctly" or "this import is unused", that's `codex`'s territory. Your job is to ask "what breaks when this runs at 03:00 unattended?"

Construct the response frontmatter and findings list per `tools/review-queue/schemas/reviewer.schema.json`. Use the per-reviewer verdict enum: `{proceed, proceed_after_patches, pushback}` — never `divergent` / `single_reviewer_timeout` / `no_responses` (those are combined-only).

## Step 5 — Validate, write codex-ops.md atomically, then commit via the validation helper

Write your fully-formed response content to a unique temp file FIRST. **Before** `os.link`-ing it into the canonical `<dir>/codex-ops.md` path, run the pre-link YAML gate (045 AC1). On failure, delete the temp file, regenerate the response in-session, and re-run the gate. After all in-session retries are exhausted, log a single `PRE-LINK-INVALID:` row to `raw/internal/queue-errors.md` and exit non-zero — the next tick will re-poll the round and re-attempt.

```python
import os, uuid, subprocess
# 043 AC4 race guard. If combined.md was written during our review window,
# our response is stale — discard it without linking.
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

Then commit + push via the post-link validation helper (AC4 of item 041 — defense-in-depth backstop that mechanically re-checks `reviewer.schema.json` before any git operation, in case the pre-link gate missed a file shape):

```bash
tools/review-queue/commit-reviewer-response.sh "$dir/codex-ops.md" codex-ops "$N" "$item_id"
```

The helper runs `tools/review-queue/validate.py reviewer <path>`; on failure it quarantines the malformed file to `<path>.invalid.<ISO-ts>` and appends a `VALIDATION-FAIL:` line to `raw/internal/queue-errors.md`. On success it `git add`s the file, commits with message `review-r<N>: codex-ops on <item_id>`, and pushes via `push-with-retry.sh`. With AC1's pre-link gate in place the post-link path should rarely fire — it remains as a backstop for shapes the pre-link validator misses.

This is an **operational push**, not a ship push — it does not need founder approval per §"Out of Scope" #4 of the 039 spec.

## Step 6 — Log to the dogfooding journal AFTER commit

Run this step **only after `commit-reviewer-response.sh` exits 0** (validation passed, commit + push succeeded). If the helper exited non-zero, the response was quarantined and `queue-errors.md` has the trace — do NOT also write a journal entry for that tick.

Append a 6-field entry to `raw/internal/dogfooding/mcp-interactions-journal.md` per CLAUDE.md discipline. The entry references the committed response file; it does **not** coordinate the queue. Then regenerate the HTML twin.

**Do not write the journal as part of the queue handshake.** The journal is observation-only; mixing it with queue state produces cross-reviewer journal-edit races (the case 039 §Implementation Notes calls out).

## Step 7 — Exit

One review per tick. Next tick picks up the next missing response.
