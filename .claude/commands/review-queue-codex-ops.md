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

**050 worktree-isolation note (headless reviewer path).** Under launchd-fired headless invocation, `_run_reviewer.sh` has already created an ephemeral, detached-HEAD worktree at `$TMPDIR/echo-codex-ops-<uuid>`, set `ECHO_REVIEW_QUEUE_REPO_ROOT` to that path, routed Codex with `-C "$WT"`, and read this prompt's bytes from `$WT/.claude/commands/review-queue-codex-ops.md`. Steps 1–7 below execute inside that worktree; the founder's live `main` checkout `.git/index` is never written to by this tick. The unified ERR/EXIT cleanup trap in the wrapper discards the worktree on tick exit (success or failure); the journal commit in Step 6 must complete its `push-with-retry.sh` BEFORE the cleanup trap fires, which is the natural ordering inside this prompt body.

This catches any new request directories AND ensures you are reviewing against the up-to-date spec. **Mandatory** — without it, you may write a review against a stale artifact.

## Step 2 — Select the request (pinned-mode vs scan-pick)

There are two paths:

- **Pinned-request mode** (057b AC0): when `ECHO_COORD_REQUEST_PATH` is set in the env (set by `coord_invoke` at active-trigger time), this tick reviews EXACTLY that request and skips the scan. Read `ECHO_COORD_CORRELATION_ID` for the round-tier coord identity.
- **Launchd-fallback scan-pick mode**: when `ECHO_COORD_REQUEST_PATH` is unset, scan `backlog/reviews/**/r*/request.md` for the first round with no `codex-ops.md` yet.

Emit `coord:tick_start` **before** bind-validation runs, so 057a's `expects: tick_start` close rule fires regardless of bind-validation outcome. The wrapper's `coord-emit.sh` is `|| true` on daemon-down; non-fatal.

```bash
MY_REVIEWER=codex-ops
CANDIDATE=""
if [ -n "${ECHO_COORD_REQUEST_PATH:-}" ]; then
  REVIEWER_NAME="$MY_REVIEWER" "${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}/tools/review-queue/coord-emit.sh" tick_start \
    --correlation-id="$ECHO_COORD_CORRELATION_ID" || true
  bind_reason=""
  if [ ! -f "$ECHO_COORD_REQUEST_PATH" ]; then
    bind_reason="request_not_found"
  fi
  if [ -z "$bind_reason" ]; then
    fm_corr=$(python3 -c "
import yaml, sys
fm = yaml.safe_load(open('$ECHO_COORD_REQUEST_PATH').read().split('---')[1])
print(fm.get('correlation_id',''))
" 2>/dev/null || echo "")
    if [ "$fm_corr" != "$ECHO_COORD_CORRELATION_ID" ]; then
      bind_reason="correlation_id_mismatch"
    fi
  fi
  if [ -z "$bind_reason" ]; then
    in_roster=$(python3 -c "
import yaml, sys
fm = yaml.safe_load(open('$ECHO_COORD_REQUEST_PATH').read().split('---')[1])
sys.exit(0 if '$MY_REVIEWER' in fm.get('requested_reviewers', []) else 1)
" && echo yes || echo no)
    if [ "$in_roster" = "no" ]; then
      bind_reason="role_not_in_roster"
    fi
  fi
  if [ -z "$bind_reason" ]; then
    dir=$(dirname "$ECHO_COORD_REQUEST_PATH")
    if [ -f "$dir/combined.md" ]; then
      bind_reason="already_combined"
    elif [ -f "$dir/$MY_REVIEWER.md" ]; then
      bind_reason="already_responded"
    fi
  fi
  if [ -n "$bind_reason" ]; then
    REVIEWER_NAME="$MY_REVIEWER" "${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}/tools/review-queue/coord-emit.sh" tick_end \
      --correlation-id="$ECHO_COORD_CORRELATION_ID" \
      --payload="{\"outcome\":\"bind_failed\",\"reason\":\"$bind_reason\"}" || true
    echo "tick: pinned-request bind failed: $bind_reason" >&2
    # AC0 contract: bind-validation failure exits non-zero so launchd /
    # log consumers see a failed tick (r9 codex F3 MEDIUM). The coord
    # atom above carries the structured reason; the non-zero exit is the
    # operator-facing signal.
    exit 1
  fi
  CANDIDATE="$ECHO_COORD_REQUEST_PATH"
else
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
  if [ -z "$CANDIDATE" ]; then
    echo "tick: no codex-ops reviews to write" >&2
    exit 0
  fi
  CAND_CORRELATION_ID=$(python3 -c "
import yaml, sys
fm = yaml.safe_load(open('$CANDIDATE').read().split('---')[1])
print(fm.get('correlation_id',''))
" 2>/dev/null || echo "")
  if [ -n "$CAND_CORRELATION_ID" ]; then
    REVIEWER_NAME="$MY_REVIEWER" "${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}/tools/review-queue/coord-emit.sh" tick_start \
      --correlation-id="$CAND_CORRELATION_ID" || true
  fi
fi
```

If no candidate, the scan branch above exits 0 with a stderr log.

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

The `completed_at` value MUST be single-quoted (`'2026-05-XXTHH:MM:SSZ'`); unquoted ISO 8601 timestamps are auto-parsed by PyYAML as `datetime.datetime` and rejected by the schema. Use this canonical frontmatter shape (placeholders `XX` / `HH:MM:SS` are intentional — substitute today's values, do NOT copy the example date verbatim):

```yaml
---
item_id: "2026-05-XX-NNN-some-spec-slug"
round: 1
reviewer: "codex-ops"
artifact_sha: "abc1234"
completed_at: '2026-05-XXTHH:MM:SSZ'
verdict: "proceed_after_patches"
findings: []
---
```

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

**050 AC1 step 5 — same-reviewer launchd-overlap no-op guard.** Before the post-link commit, re-fetch `origin/main` and check whether `<dir>/codex-ops.md` already exists upstream for this round. A sibling launchd-cadence tick can fire after this tick's initial fetch but before this tick's push; if it has already produced the response, this tick is a duplicate from cadence overlap and must exit cleanly (not push a noisy duplicate commit). The check narrows but does not close the race — two ticks may both pass the check and collide in `push-with-retry.sh`'s rebase loop; the loser produces a noisy failed tick which the next launchd cadence re-fires cleanly. (Race-tight fix is filed as 050-followup-G.)

```bash
git fetch origin main
upstream_path="backlog/reviews/$item_id/r$N/codex-ops.md"
if git cat-file -e "origin/main:$upstream_path" 2>/dev/null; then
  echo "tick: codex-ops.md already exists at $upstream_path on origin — duplicate cadence overlap, exiting 0" >&2
  exit 0
fi
```

Then commit + push via the post-link validation helper (AC4 of item 041 — defense-in-depth backstop that mechanically re-checks `reviewer.schema.json` before any git operation, in case the pre-link gate missed a file shape):

```bash
tools/review-queue/commit-reviewer-response.sh "$dir/codex-ops.md" codex-ops "$N" "$item_id"
```

The helper runs `tools/review-queue/validate.py reviewer <path>`; on failure it quarantines the malformed file to `<path>.invalid.<ISO-ts>` and appends a `VALIDATION-FAIL:` line to `raw/internal/queue-errors.md`. On success it `git add`s the file, commits with message `review-r<N>: codex-ops on <item_id>`, and pushes via `push-with-retry.sh`. With AC1's pre-link gate in place the post-link path should rarely fire — it remains as a backstop for shapes the pre-link validator misses.

This is an **operational push**, not a ship push — it does not need founder approval per §"Out of Scope" #4 of the 039 spec.

## Step 6 — Log to the dogfooding journal AFTER commit (and BEFORE wrapper cleanup)

Run this step **only after `commit-reviewer-response.sh` exits 0** (validation passed, commit + push succeeded). If the helper exited non-zero, the response was quarantined and `queue-errors.md` has the trace — do NOT also write a journal entry for that tick.

Append a 6-field entry to `raw/internal/dogfooding/mcp-interactions-journal.md` per CLAUDE.md discipline. The entry references the committed response file; it does **not** coordinate the queue. Then regenerate the HTML twin and push the journal commit via `push-with-retry.sh` as a **sibling commit before this prompt returns**:

```bash
git add raw/internal/dogfooding/mcp-interactions-journal.md raw/internal/dogfooding/mcp-interactions-journal.html
git commit -m "journal: codex-ops r$N review tick on $item_id"
tools/review-queue/push-with-retry.sh "journal: codex-ops r$N review tick on $item_id"
```

**050 ordering invariant — journal pushes BEFORE wrapper cleanup fires.** Under headless launchd invocation, the entire reviewer tick runs inside the wrapper's ephemeral worktree at `$TMPDIR/echo-codex-ops-<uuid>`. The wrapper's unified ERR/EXIT cleanup trap removes that worktree at tick exit; any journal commit that has not been pushed by then is lost. Because the journal commit is the LAST thing this prompt does before returning, the prompt's natural exit order delivers the journal commit to `origin/main` before the wrapper trap fires.

**Do not write the journal as part of the queue handshake.** The journal is observation-only; mixing it with queue state produces cross-reviewer journal-edit races (the case 039 §Implementation Notes calls out).

## Step 7 — Emit `tick_end` on every clean exit (057b AC7)

`tick_end` MUST be emitted on EVERY clean exit after `tick_start`, so 057a's deadline tracker closes the open `tick_start` deadline. Wrapper CRASHES before `tick_end` intentionally yield NO terminal event — the pre-spawn deadline fires `deadline_missed` per 057a AC3. Outcome enum:

- `completed` — review succeeded, response file committed + pushed.
- `stale_combined` — `combined.md` already existed when this tick started Step 2.
- `duplicate_response` — local `os.link` race lost; another wrapper wrote first.
- `upstream_duplicate` — pre-push pull found another response landed.
- `bind_failed` — pinned-request validation rejected (emitted in Step 2).

```bash
CORR="${ECHO_COORD_CORRELATION_ID:-${CAND_CORRELATION_ID:-}}"
if [ -n "$CORR" ]; then
  "${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}/tools/review-queue/coord-emit.sh" tick_end \
    --correlation-id="$CORR" \
    --payload='{"outcome":"completed"}' || true
fi
```

For non-completed clean exits, emit `tick_end` with the matching outcome at the exit point. Uncaught crashes deliberately leave no terminal event — 057a fires `deadline_missed` (the correct operator alert).

## Step 8 — Exit

One review per tick. Next tick picks up the next missing response.
