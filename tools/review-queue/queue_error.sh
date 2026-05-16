#!/usr/bin/env bash
# queue_error.sh — durable queue-error commit + push helper (056 AC5 part 4).
#
# Appends a single diagnostic row to raw/internal/queue-errors.md and pushes
# it to origin/main BEFORE the caller's cleanup trap can remove an ephemeral
# worktree (the 050 wrapper cleanup discards $WT on every exit path).
#
# Two row shapes:
#   1. Pre-spawn (failure detected BEFORE request.md scan — no spec known):
#        <ISO-Z> <DIAGNOSTIC>: reviewer=<slug> failure=<reason> diagnostic=<msg>
#   2. Per-round (failure detected AFTER request.md scan — spec known):
#        <ISO-Z> <DIAGNOSTIC>: reviewer=<slug> failure=<reason> spec=<artifact_path>@<spec_commit_sha>
#
# Usage:
#   queue_error.sh <reason> <diagnostic>
#       — pre-spawn shape; reviewer slug taken from $REVIEWER_NAME env var
#   queue_error.sh <reason> <diagnostic> <artifact_path> <spec_commit_sha>
#       — per-round shape
#
# Exits 0 if the row landed on origin/main; non-zero if push-with-retry fails
# (the caller should still exit non-zero on top, so the launchd job reflects
# the failure status).
#
# Environment:
#   REVIEWER_NAME       (required) — the reviewer slug being dispatched.
#   ECHO_QUEUE_ERROR_DIAGNOSTIC_TAG (optional) — default "QUEUE-ERROR".

set -euo pipefail

if [ "$#" -lt 2 ] || { [ "$#" -ne 2 ] && [ "$#" -ne 4 ]; }; then
  echo "usage: queue_error.sh <reason> <diagnostic> [<artifact_path> <spec_commit_sha>]" >&2
  exit 2
fi

: "${REVIEWER_NAME:?REVIEWER_NAME env var required for queue_error.sh}"

REASON="$1"
DIAGNOSTIC="$2"
ARTIFACT_PATH="${3:-}"
SPEC_SHA="${4:-}"
TAG="${ECHO_QUEUE_ERROR_DIAGNOSTIC_TAG:-QUEUE-ERROR}"

TOOL_DIR="$(cd "$(dirname "$0")" && pwd)"
PUSH_HELPER="$TOOL_DIR/push-with-retry.sh"

if [ ! -x "$PUSH_HELPER" ]; then
  echo "queue_error: push-with-retry.sh not executable at $PUSH_HELPER" >&2
  exit 2
fi

# Resolve repo toplevel from current CWD (caller is responsible for cd'ing
# into the per-tick worktree before invoking; see _run_reviewer.sh).
TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ERRORS_FILE="$TOPLEVEL/raw/internal/queue-errors.md"
mkdir -p "$(dirname "$ERRORS_FILE")"

ISO_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [ -n "$ARTIFACT_PATH" ] && [ -n "$SPEC_SHA" ]; then
  # Per-round shape — spec is known.
  printf '%s %s: reviewer=%s failure=%s spec=%s@%s\n' \
    "$ISO_TS" "$TAG" "$REVIEWER_NAME" "$REASON" "$ARTIFACT_PATH" "$SPEC_SHA" \
    >> "$ERRORS_FILE"
else
  # Pre-spawn shape — no spec fields, never invent placeholders.
  printf '%s %s: reviewer=%s failure=%s diagnostic=%s\n' \
    "$ISO_TS" "$TAG" "$REVIEWER_NAME" "$REASON" "$DIAGNOSTIC" \
    >> "$ERRORS_FILE"
fi

git add "$ERRORS_FILE"
# Allow concurrent ticks: if our row was the only change and the index ends
# up identical to HEAD (rare), exit 0 without an empty commit.
if ! git diff --cached --quiet; then
  git commit -m "queue-error: $REVIEWER_NAME $REASON"
  "$PUSH_HELPER" "queue-error: $REVIEWER_NAME $REASON"
fi
