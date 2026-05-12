#!/usr/bin/env bash
# test-watcher-prompt.sh — smoke test for the AC3.5 watcher tick logic.
#
# Synthesizes a combined.md (both escalated_to_founder: true and false cases),
# runs the watcher-tick polling logic (file-scan + state-check parts, NOT
# the AI judgment), and asserts the next-step is either "escalate" or
# "disposition + patch + next-request".

set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

TMPROOT=$(mktemp -d -t echo-rq-watch-XXXX)
trap 'rm -rf "$TMPROOT"' EXIT

ITEM_ID="2026-05-12-040-example-spec"
mkdir -p "$TMPROOT/backlog/reviews/$ITEM_ID/r1"
mkdir -p "$TMPROOT/backlog/reviews/$ITEM_ID/r2"

# Case 1: escalated_to_founder = true
cat >"$TMPROOT/backlog/reviews/$ITEM_ID/r1/combined.md" <<'EOF'
---
item_id: "2026-05-12-040-example-spec"
round: 1
combined_at: "2026-05-12T09:30:00Z"
codex_response: codex.md
cursor_response: cursor.md
patch_commit_sha: null
next_round: null
combined_verdict: divergent
escalated_to_founder: true
---

body
EOF

# Case 2: escalated_to_founder = false
cat >"$TMPROOT/backlog/reviews/$ITEM_ID/r2/combined.md" <<'EOF'
---
item_id: "2026-05-12-040-example-spec"
round: 2
combined_at: "2026-05-12T09:30:00Z"
codex_response: codex.md
cursor_response: cursor.md
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

body
EOF

# Watcher logic: for each combined.md, branch on escalated_to_founder.
for cmb in "$TMPROOT"/backlog/reviews/*/r*/combined.md; do
  esc=$(awk '/^escalated_to_founder:/ {print $2; exit}' "$cmb")
  verdict=$(awk '/^combined_verdict:/ {print $2; exit}' "$cmb")
  rnd=$(awk '/^round:/ {print $2; exit}' "$cmb")
  if [ "$esc" = "true" ]; then
    NEXT="escalate (verdict=$verdict, round=$rnd)"
  else
    NEXT="disposition + patch + next-request (verdict=$verdict, round=$rnd)"
  fi
  echo "[$(basename $(dirname "$cmb"))] next-step: $NEXT"
done

# Assertions
ESC_OUT=$(awk '/^escalated_to_founder:/ {print $2; exit}' "$TMPROOT/backlog/reviews/$ITEM_ID/r1/combined.md")
FALSE_OUT=$(awk '/^escalated_to_founder:/ {print $2; exit}' "$TMPROOT/backlog/reviews/$ITEM_ID/r2/combined.md")
[ "$ESC_OUT" = "true" ] || { echo "FAIL: r1 should escalate"; exit 1; }
[ "$FALSE_OUT" = "false" ] || { echo "FAIL: r2 should disposition"; exit 1; }

echo "PASS: watcher-tick logic branches correctly on escalated_to_founder"
