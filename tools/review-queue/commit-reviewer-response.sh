#!/usr/bin/env bash
# commit-reviewer-response.sh — validate-then-commit-then-push helper for
# reviewer responses (AC4 of item 041). Mechanically enforces the
# reviewer.schema.json contract on every reviewer that uses the canonical
# commit path.
#
# Usage:
#   commit-reviewer-response.sh <reviewer.md path> <codex|cursor> <round N> <item_id>
#
# Behavior:
#   1. Run `python3 tools/review-queue/validate.py reviewer <path>`.
#   2. On validation failure:
#        - print validator stderr verbatim
#        - move the malformed file to <path>.invalid.<ISO-ts> so the canonical
#          reviewer prompt's polling step regenerates on the next tick (the
#          poll skips any round where <reviewer>.md already exists at the
#          canonical path; quarantining the file unblocks retry)
#        - append a one-line entry to raw/internal/queue-errors.md
#        - exit non-zero (no git add, no commit, no push)
#   3. On validation success:
#        - git add <path>
#        - git commit -m "review-r<N>: <reviewer> on <item_id>"
#        - tools/review-queue/push-with-retry.sh "review-r<N>: <reviewer> on <item_id>"

set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: commit-reviewer-response.sh <reviewer.md path> <codex|cursor> <round N> <item_id>" >&2
  exit 2
fi

REVIEWER_PATH="$1"
REVIEWER_NAME="$2"
ROUND="$3"
ITEM_ID="$4"

case "$REVIEWER_NAME" in
  codex|cursor) ;;
  *)
    echo "error: reviewer name must be 'codex' or 'cursor', got '$REVIEWER_NAME'" >&2
    exit 2
    ;;
esac

if [ ! -f "$REVIEWER_PATH" ]; then
  echo "error: reviewer file not found at $REVIEWER_PATH" >&2
  exit 2
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
VALIDATOR="$REPO_ROOT/tools/review-queue/validate.py"
PUSH_HELPER="$REPO_ROOT/tools/review-queue/push-with-retry.sh"

if [ ! -f "$VALIDATOR" ]; then
  echo "error: validator not found at $VALIDATOR" >&2
  exit 2
fi

# Resolve python3 — prefer arch -arm64 python3 on Apple Silicon (consistent
# with tests/review-queue/_helpers.ts) so the validator's jsonschema + yaml
# imports resolve in the native architecture.
if python3 -c 'import jsonschema, yaml' 2>/dev/null; then
  PY=(python3)
elif [ "$(uname -s)" = "Darwin" ] && arch -arm64 python3 -c 'import jsonschema, yaml' 2>/dev/null; then
  PY=(arch -arm64 python3)
else
  echo "error: python3 with jsonschema + yaml not available" >&2
  exit 2
fi

set +e
VALIDATE_STDERR="$("${PY[@]}" "$VALIDATOR" reviewer "$REVIEWER_PATH" 2>&1 >/dev/null)"
VALIDATE_RC=$?
set -e

if [ "$VALIDATE_RC" -ne 0 ]; then
  echo "$VALIDATE_STDERR" >&2
  ISO_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  QUARANTINE="$REVIEWER_PATH.invalid.$ISO_TS"
  mv "$REVIEWER_PATH" "$QUARANTINE"
  FIRST_LINE="$(printf '%s\n' "$VALIDATE_STDERR" | head -n 1)"
  mkdir -p "$REPO_ROOT/raw/internal"
  printf '%s VALIDATION-FAIL: %s r%s on %s moved_to=%s diagnostic=%s\n' \
    "$ISO_TS" "$REVIEWER_NAME" "$ROUND" "$ITEM_ID" "$QUARANTINE" "$FIRST_LINE" \
    >> "$REPO_ROOT/raw/internal/queue-errors.md"
  echo "commit-reviewer-response: validation failed; quarantined to $QUARANTINE" >&2
  exit 1
fi

CONTEXT="review-r${ROUND}: ${REVIEWER_NAME} on ${ITEM_ID}"

git add "$REVIEWER_PATH"
git commit -m "$CONTEXT"
"$PUSH_HELPER" "$CONTEXT"
