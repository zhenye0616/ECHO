#!/usr/bin/env bash
# test-reviewer-prompt.sh — smoke test for the AC3 reviewer-loop polling logic.
#
# Creates a synthetic request, runs the polling logic the slash-command
# prompt would execute (the file-scan + state-check parts, NOT the actual
# AI call), and asserts the next-step is "perform review on <artifact> at <sha>".
#
# Used as the AC3 smoke target. Run from the repo root.

set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

TMPROOT=$(mktemp -d -t echo-rq-smoke-XXXX)
trap 'rm -rf "$TMPROOT"' EXIT

ITEM_ID="2026-05-12-040-example-spec"
SHA="abc1234"
ROUND_DIR="$TMPROOT/backlog/reviews/$ITEM_ID/r1"
mkdir -p "$ROUND_DIR"
mkdir -p "$TMPROOT/backlog/ready"

cat >"$TMPROOT/backlog/ready/$ITEM_ID.md" <<'EOF'
---
id: 2026-05-12-040-example-spec
---
body
EOF

cat >"$ROUND_DIR/request.md" <<EOF
---
item_id: "$ITEM_ID"
round: 1
spec_commit_sha: "$SHA"
artifact_path: "backlog/ready/$ITEM_ID.md"
class: "narrow"
requested_at: "2026-05-12T08:00:00Z"
requested_reviewers:
  - "codex"
  - "cursor"
---

# What to review

Read the artifact.
EOF

# Polling logic — pick the first request.md whose <reviewer>.md is missing.
for REVIEWER in codex cursor; do
  CAND=""
  for req in "$TMPROOT"/backlog/reviews/*/r*/request.md; do
    [ -e "$req" ] || continue
    dir=$(dirname "$req")
    [ -f "$dir/$REVIEWER.md" ] && continue
    [ -f "$dir/combined.md" ] && continue
    CAND="$req"; break
  done
  if [ -z "$CAND" ]; then
    echo "FAIL: no candidate found for $REVIEWER" >&2; exit 1
  fi
  # Parse frontmatter for artifact_path and spec_commit_sha
  ART=$(awk '/^artifact_path:/ {gsub(/^artifact_path:[ "]*/, ""); gsub(/"$/, ""); print; exit}' "$CAND")
  REQSHA=$(awk '/^spec_commit_sha:/ {gsub(/^spec_commit_sha:[ "]*/, ""); gsub(/"$/, ""); print; exit}' "$CAND")
  EXPECT="perform review on $ART at $REQSHA"
  echo "[$REVIEWER] next-step: $EXPECT"
  if [ "$ART" != "backlog/ready/$ITEM_ID.md" ] || [ "$REQSHA" != "$SHA" ]; then
    echo "FAIL: parsed artifact/sha mismatch ($ART / $REQSHA)" >&2; exit 1
  fi
done

echo "PASS: reviewer-loop polling logic surfaces the expected next-step for both reviewers"
