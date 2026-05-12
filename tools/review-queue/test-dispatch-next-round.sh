#!/usr/bin/env bash
# test-dispatch-next-round.sh — smoke test for the AC3.5 watcher post-combine
# state-machine helper (dispatch-next-round.py).
#
# Drives the helper end-to-end against a tmpdir fixture:
#   1. Sets up a fake repo with a stub backlog item + r1/{request,codex,cursor}.md
#      that lands proceed_after_patches on a convergent HIGH finding.
#   2. Runs combine.py (writes r1/combined.md).
#   3. Runs dispatch-next-round.py in the (b) branch — should write r2/request.md
#      and set next_round=2 in r1/combined.md.
#   4. Re-invokes the helper at the same SHA — should be an idempotent no-op.
#
# Not invoked from vitest (vitest has full coverage via watcher-state.test.ts);
# available for ad-hoc shell debugging. Mirrors test-reviewer-prompt.sh +
# test-watcher-prompt.sh conventions in the same directory.

set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"

TMPROOT=$(mktemp -d -t echo-rq-dispatch-XXXX)
trap 'rm -rf "$TMPROOT"' EXIT

ITEM_ID="2026-05-12-040-example-spec"
SHA="cafe123abcd"
mkdir -p "$TMPROOT/backlog/ready"
mkdir -p "$TMPROOT/backlog/reviews/$ITEM_ID/r1"

cat >"$TMPROOT/backlog/ready/$ITEM_ID.md" <<EOF
---
id: $ITEM_ID
---
body
EOF

cat >"$TMPROOT/backlog/reviews/$ITEM_ID/r1/request.md" <<EOF
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

body
EOF

for REVIEWER in codex cursor; do
  cat >"$TMPROOT/backlog/reviews/$ITEM_ID/r1/$REVIEWER.md" <<EOF
---
item_id: "$ITEM_ID"
round: 1
reviewer: "$REVIEWER"
artifact_sha: "$SHA"
completed_at: "2026-05-12T09:00:00Z"
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "§AC3"
    finding: "load-bearing — verify next round"
---

body
EOF
done

python3 tools/review-queue/combine.py --repo-root="$TMPROOT" --no-git --all >/dev/null

python3 tools/review-queue/dispatch-next-round.py \
  --repo-root="$TMPROOT" \
  "$ITEM_ID" 1 \
  --verdict=proceed_after_patches \
  --patches-applied=true \
  --class=narrow \
  --focus-hints="Verify §AC3 load-bearing finding" \
  --spec-sha="$SHA"

R2_REQ="$TMPROOT/backlog/reviews/$ITEM_ID/r2/request.md"
R1_COMB="$TMPROOT/backlog/reviews/$ITEM_ID/r1/combined.md"

[ -f "$R2_REQ" ] || { echo "FAIL: r2/request.md not written" >&2; exit 1; }
grep -q "spec_commit_sha: $SHA" "$R2_REQ" \
  || { echo "FAIL: r2/request.md missing pinned SHA $SHA" >&2; exit 1; }
grep -q "^next_round: 2" "$R1_COMB" \
  || { echo "FAIL: r1/combined.md next_round not set to 2" >&2; exit 1; }

# Idempotency: re-invoke at the same SHA. Bytes must not change.
BEFORE_HASH=$(shasum "$R2_REQ" | awk '{print $1}')
python3 tools/review-queue/dispatch-next-round.py \
  --repo-root="$TMPROOT" \
  "$ITEM_ID" 1 \
  --verdict=proceed_after_patches \
  --patches-applied=true \
  --class=narrow \
  --focus-hints="Verify §AC3 load-bearing finding" \
  --spec-sha="$SHA" >/dev/null
AFTER_HASH=$(shasum "$R2_REQ" | awk '{print $1}')
[ "$BEFORE_HASH" = "$AFTER_HASH" ] \
  || { echo "FAIL: r2/request.md mutated on idempotent re-invocation" >&2; exit 1; }

echo "PASS: dispatch-next-round.py (b)-branch + same-SHA idempotency"
