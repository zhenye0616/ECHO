#!/usr/bin/env bash
# push-with-retry.sh — shared push helper for the review-queue protocol.
#
# Used by all three operational push types (per §Architecture push-race in
# 039 spec):
#   1. Reviewer response push  (review-r<N>: <reviewer> on <item_id>)
#   2. Strategist combined.md push
#   3. Strategist patch + next-request push
#
# Behavior: attempt up to two `git pull --rebase origin main && git push
# origin main` cycles. If both fail, log a one-line append to
# raw/internal/queue-errors.md and exit 1; the local commit stays unpushed
# so the strategist watcher (AC3.5 step 1) can surface it to the founder.
#
# Usage:
#   tools/review-queue/push-with-retry.sh <error-context-tag>
#
# Example:
#   tools/review-queue/push-with-retry.sh "review-r2: codex on 2026-05-11-039-..."

set -e
CONTEXT="${1:-unknown}"

for attempt in 1 2; do
  if git -c rebase.autoStash=true pull --rebase=merges origin main && git push origin main; then
    exit 0
  fi
done

# Both attempts failed. Log to queue-errors.md (NOT the journal — per the
# JOURNAL-AS-QUEUE PROHIBITION invariant in 039 §Implementation Notes).
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
sha=$(git rev-parse HEAD)
mkdir -p raw/internal
printf '%s PUSH-RACE-FALLBACK: %s sha=%s\n' "$ts" "$CONTEXT" "$sha" \
  >> raw/internal/queue-errors.md
exit 1
