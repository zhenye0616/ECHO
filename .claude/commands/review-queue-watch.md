---
description: Strategist watcher tick. One eligible round per tick. Runs combine.py, escalates to founder if {proceed*, pushback} boundary is crossed (or single_reviewer_timeout / no_responses), otherwise autonomously dispositions findings, applies patches inline, and either declares convergence or runs request.py for the next round.
---

You are running one tick of the **strategist** watcher loop. Invoked from the strategist's own Claude Code session via `/loop 10m /review-queue-watch`. **Do not chain reasoning across ticks.** One eligible round per tick — exit and wait for the next loop fire.

## Step 1 — Pull origin/main first

```bash
cd "${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}"
git pull --rebase origin main
# Surface unpushed work / queue errors (push-with-retry.sh fallback target)
tail -n 5 raw/internal/queue-errors.md 2>/dev/null || true
```

(Steady-state: `ECHO_REVIEW_QUEUE_REPO_ROOT` is unset in the strategist's own Claude Code session → defaults to the production repo. The 041 reviewer wrapper script + AC5 smoke set it explicitly so the launchd reviewer ticks and tests use the right tree. Strategist watcher ticks always run against production.)

The tail surfaces any push-race fallbacks since the last tick so you can flag them in this turn's narration if action is needed. The file itself is repo-tracked, append-only, and uses the `.md` extension to avoid `*.log` gitignore.

## Step 2 — Run combine.py for one eligible round

```bash
tools/review-queue/combine.py
```

Default mode is one-round-per-tick — `combine.py` processes at most one newly-eligible round, writes its `combined.md`, commits + pushes via `tools/review-queue/push-with-retry.sh`, then exits.

If output is `[combine] no rounds to combine`, exit cleanly — there is nothing for the watcher to do this tick.

Otherwise the script prints the path to the newly-written `combined.md`. Capture that path.

## Step 3 — Branch on combined_verdict + escalation flag

Read the just-written `combined.md`'s frontmatter:

- **`escalated_to_founder: true`** — verdict is `divergent` (verdicts crossed `{proceed*, pushback}` boundary) OR `single_reviewer_timeout` OR `no_responses`. Append a journal entry citing the queue path; **exit**. The founder will see and act on next session. You do NOT attempt to adjudicate divergence — that is the §"Out of Scope" #7 boundary.

- **`escalated_to_founder: false`** — verdict is within `{proceed, proceed_after_patches, pushback}` (no boundary cross). You autonomously disposition findings.

### Step 3 — Disposition (only on the not-escalated branch)

For each row in the convergent and divergent tables in the just-written `combined.md`, fill the `Disposition` column with your judgment of the spec direction. Then commit the disposition update via `push-with-retry.sh`:

```bash
git add backlog/reviews/<item_id>/r<N>/combined.md
git commit -m "review-r<N>: disposition on <item_id>"
tools/review-queue/push-with-retry.sh "disposition: r<N> on <item_id>"
```

After dispositioning, decide which branch fires. The file mutations for all three branches are a single helper invocation; the watcher then runs one branch-specific git block.

#### (a) Zero patches applied → convergence

Verdict was `proceed` with no actionable findings, OR a `pushback` where all findings deferred to follow-ups outside this round. No spec changes need verifying.

```bash
tools/review-queue/dispatch-next-round.py <item_id> <N> \
  --verdict={proceed,pushback} --patches-applied=false \
  --class=<request.class> --focus-hints=""
git add backlog/reviews/<item_id>/r<N>/combined.md
git commit -m "review-r<N>: terminal on <item_id>"
tools/review-queue/push-with-retry.sh "terminal: r<N> on <item_id>"
```

#### (b) Patches applied → verification round (DEFAULT for any spec change)

Apply the patches to the spec file inline FIRST, then commit the spec patch via `push-with-retry.sh` so the patched commit is what r<N+1> pins via `--spec-sha`. Then run the helper followed by the dispatch git block:

```bash
tools/review-queue/dispatch-next-round.py <item_id> <N> \
  --verdict=proceed_after_patches --patches-applied=true \
  --class=<request.class> \
  --focus-hints="Verify: <list each load-bearing finding's section + the disposition's prescription + any falsifiable claim worth re-checking>"
git add backlog/reviews/<item_id>/r<N>/combined.md \
        backlog/reviews/<item_id>/r<N+1>/request.md
git commit -m "review-r<N+1>: dispatch on <item_id>"
tools/review-queue/push-with-retry.sh "dispatch: r<N+1> on <item_id>"
```

The helper invokes `request.py` to write `r<N+1>/request.md`, then in-place atomic-updates `r<N>/combined.md` to set `next_round: <N+1>`. **This is the default branch.** Accepted-without-follow-ups is **orthogonal** to whether patches need verification.

#### (c) Patches applied — verification explicitly waived (rare)

Strategist's-call when patches are mechanical (typo fixes, comment-only changes, link updates) AND no reviewer requested a verification round AND no finding was load-bearing. **Use sparingly** — when in doubt, run a verification round.

```bash
tools/review-queue/dispatch-next-round.py <item_id> <N> \
  --verdict=proceed_after_patches --patches-applied=false \
  --class=<request.class> --focus-hints="<one-line rationale for waiving verification>"
git add backlog/reviews/<item_id>/r<N>/combined.md
git commit -m "review-r<N>: terminal on <item_id>"
tools/review-queue/push-with-retry.sh "terminal: r<N> on <item_id>"
```

The helper appends a `verification waived; rationale: <focus-hints>` line into the body of `combined.md` and leaves `next_round: null`.

**Helper / watcher boundary.** `dispatch-next-round.py` performs file mutations only — it never runs `git add`, `git commit`, or `git push`. The per-branch git block above stages and commits the artifacts that actually exist. The two block shapes (dispatch vs. terminal) are not collapsible: `git add` against a non-existent path errors with non-zero exit on (a)/(c), and the commit/push messages must align with the branch's actual state so `git log --grep` matches.

## Step 4 — Exit

One round per tick. The watcher does not batch rounds; serializing rounds across ticks keeps the tick body deterministic.

(Builder note: `combine.py --all` is available for one-shot batch processing outside the `/loop` body. The watcher-driven path is one-round-per-tick.)
