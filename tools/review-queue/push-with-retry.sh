#!/usr/bin/env bash
# push-with-retry.sh — shared push helper for the review-queue protocol.
#
# Used by all three operational push types (per §Architecture push-race in
# 039 spec):
#   1. Reviewer response push  (review-r<N>: <reviewer> on <item_id>)
#   2. Strategist combined.md push
#   3. Strategist patch + next-request push
#
# Behavior: attempt up to two `git pull --rebase=merges origin main && git push
# origin HEAD:main` cycles. If both fail, log a one-line append to
# raw/internal/queue-errors.md (resolved against the current worktree's
# toplevel, not the founder checkout) and exit 1; the local commit stays
# unpushed so the strategist watcher (AC3.5 step 1) can surface it to the
# founder.
#
# CWD-agnostic (050 AC5): invocations from inside a detached-HEAD worktree
# created by `git worktree add --detach $TMPDIR/echo-<role>-<uuid> origin/main`
# work identically to invocations from the live main checkout. Toplevel is
# resolved via `git rev-parse --show-toplevel`; `raw/internal/queue-errors.md`
# is written under that toplevel so the fallback row lands with the rest of
# the worktree's commits (or in the live checkout when called from there).
#
# Refspec (050 AC5): the push command is `git push origin HEAD:main` (NOT
# `git push origin main`). Under detached-HEAD-in-worktree mode the local
# branch ref `main` is the COMMON repository's main branch and pushing it
# without the explicit refspec leaves the worktree's new commit unpushed.
# The explicit HEAD:main refspec pushes the worktree's actual HEAD.
#
# Usage:
#   tools/review-queue/push-with-retry.sh <error-context-tag>
#
# Example:
#   tools/review-queue/push-with-retry.sh "review-r2: codex on 2026-05-11-039-..."

set -e
CONTEXT="${1:-unknown}"
TOOL_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$TOOL_DIR/_effect-runner.sh"

for attempt in 1 2; do
  set +e
  echo_effect push -- bash -c 'git -c rebase.autoStash=true pull --rebase=merges origin main && git push origin HEAD:main'
  rc=$?
  set -e
  if [ "$rc" -eq 0 ]; then
    exit 0
  fi
  if [ "$rc" -eq "$ECHO_EFFECT_NONLIVE_RC" ]; then
    exit "$rc"
  fi
done

# Both attempts failed. Log to queue-errors.md (NOT the journal — per the
# JOURNAL-AS-QUEUE PROHIBITION invariant in 039 §Implementation Notes).
# Resolve toplevel so this works identically from a worktree CWD or the
# main checkout (050 AC5).
TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
sha=$(git rev-parse HEAD)
mkdir -p "$TOPLEVEL/raw/internal"
printf '%s PUSH-RACE-FALLBACK: %s sha=%s\n' "$ts" "$CONTEXT" "$sha" \
  >> "$TOPLEVEL/raw/internal/queue-errors.md"
exit 1
