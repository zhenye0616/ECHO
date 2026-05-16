#!/usr/bin/env bash
# mock-claude.sh — test fixture standing in for the `claude` CLI in 056 AC9.
#
# Records its argv + stdin to $MOCK_CLAUDE_RECORD_DIR (if set), then either:
#   1. If MOCK_CLAUDE_MODE=produce_response (default): scan the review-queue
#      state in $PWD (which is set to $WT by the wrapper) for a missing
#      claude.md, generate a hand-crafted-but-schema-valid response, and
#      commit it via tools/review-queue/commit-reviewer-response.sh.
#   2. If MOCK_CLAUDE_MODE=sha_drift: read the request.md and explicitly
#      simulate a SHA-drift queue-error via tools/review-queue/queue_error.sh
#      (per-round shape). Exits 1.
#   3. If MOCK_CLAUDE_MODE=noop: record and exit 0 without producing
#      anything.
#
# Environment:
#   MOCK_CLAUDE_MODE        — "produce_response" | "sha_drift" | "noop"
#   MOCK_CLAUDE_RECORD_DIR  — optional dir to drop argv/stdin recordings into

set -euo pipefail

MODE="${MOCK_CLAUDE_MODE:-produce_response}"
RECORD_DIR="${MOCK_CLAUDE_RECORD_DIR:-}"

# Record argv + stdin if requested.
if [ -n "$RECORD_DIR" ]; then
  mkdir -p "$RECORD_DIR"
  printf '%s\n' "$@" > "$RECORD_DIR/argv"
  # Stdin is the prompt body; capture it for the test to assert against.
  cat > "$RECORD_DIR/stdin"
else
  # Drain stdin so the upstream redirect doesn't block.
  cat > /dev/null
fi

case "$MODE" in
  noop)
    exit 0
    ;;
  sha_drift)
    # Find the pending request.md in the worktree and emit a per-round
    # queue-error row via the durable helper. This simulates what the real
    # claude reviewer would do at Step 3 if `git show` failed.
    REQ=$(ls backlog/reviews/*/r*/request.md 2>/dev/null | head -1 || true)
    if [ -z "$REQ" ]; then
      echo "mock-claude: no request.md found for sha_drift mode" >&2
      exit 2
    fi
    ARTIFACT_PATH=$(awk -F': ' '/^artifact_path:/ {gsub(/"/, "", $2); print $2; exit}' "$REQ")
    SPEC_SHA=$(awk -F': ' '/^spec_commit_sha:/ {gsub(/"/, "", $2); print $2; exit}' "$REQ")
    REVIEWER_NAME=claude tools/review-queue/queue_error.sh \
      "spec_sha_unreachable" \
      "git show ${SPEC_SHA}:${ARTIFACT_PATH} failed (mock-claude sha_drift mode)" \
      "$ARTIFACT_PATH" \
      "$SPEC_SHA"
    exit 1
    ;;
  produce_response)
    # Scan for a request.md whose claude.md is missing.
    REQ=""
    for r in backlog/reviews/*/r*/request.md; do
      [ -f "$r" ] || continue
      dir=$(dirname "$r")
      if [ ! -f "$dir/claude.md" ]; then
        REQ="$r"
        break
      fi
    done
    if [ -z "$REQ" ]; then
      echo "mock-claude: no pending claude request found" >&2
      exit 0
    fi
    dir=$(dirname "$REQ")
    ITEM_ID=$(awk -F': ' '/^item_id:/ {gsub(/"/, "", $2); print $2; exit}' "$REQ")
    ROUND=$(awk '/^round:/ {print $2; exit}' "$REQ")
    SPEC_SHA=$(awk -F': ' '/^spec_commit_sha:/ {gsub(/"/, "", $2); print $2; exit}' "$REQ")
    # Short SHA fits the reviewer schema's 7-40 hex range.
    SHORT_SHA=$(printf '%s' "$SPEC_SHA" | cut -c1-7)
    ISO_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    cat > "$dir/claude.md" <<EOF
---
item_id: "$ITEM_ID"
round: $ROUND
reviewer: "claude"
artifact_sha: "$SHORT_SHA"
completed_at: '$ISO_TS'
verdict: "proceed"
findings: []
---

Mock claude review — synthetic response from mock-claude.sh test fixture.
EOF
    tools/review-queue/commit-reviewer-response.sh "$dir/claude.md" claude "$ROUND" "$ITEM_ID"
    exit 0
    ;;
  *)
    echo "mock-claude: unknown MOCK_CLAUDE_MODE=$MODE" >&2
    exit 2
    ;;
esac
