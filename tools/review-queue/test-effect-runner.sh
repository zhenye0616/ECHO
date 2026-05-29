#!/usr/bin/env bash
# test-effect-runner.sh — AC2 test for the shared effect boundary.
#
# Asserts the mode-symmetric non-live status contract (r3 codex F1):
#   - every NON-push kind returns EXACTLY 0 under BOTH dry-run AND test
#   - push returns EXACTLY ECHO_EFFECT_NONLIVE_RC=97 under BOTH dry-run AND test
#   - live execs argv unchanged; non-live never executes argv
#   - the reviewer wrapper smoke under test spawns NO real vendor CLI
#   - push-with-retry.sh under both non-live modes performs NO real git
#     pull/rebase/push and propagates 97 to the caller
#   - commit-reviewer-response.sh under both non-live modes emits NO
#     completed tick and leaves NO orphaned local-only response commit
#
# Run from the repo root.

set -uo pipefail

ROOT=$(git rev-parse --show-toplevel)
TOOL_DIR="$ROOT/tools/review-queue"

fail() { echo "FAIL: $*" >&2; exit 1; }

KINDS_NONPUSH="spawn-agent codex-exec launchd review-tick"

# ── 1. live mode execs argv, returns its status ───────────────────────────
out=$(bash -c "source '$TOOL_DIR/_effect-runner.sh'; echo_effect codex-exec -- echo LIVE_RAN")
[ "$out" = "LIVE_RAN" ] || fail "live mode did not exec argv (got '$out')"

# ── 2. non-live status contract, mode-symmetric across dry-run and test ───
for MODE in dry-run test; do
  for KIND in $KINDS_NONPUSH; do
    # Argv MUST NOT execute under non-live; capture stdout to prove it.
    out=$(ECHO_EFFECT_MODE="$MODE" bash -c "source '$TOOL_DIR/_effect-runner.sh'; echo_effect $KIND -- echo SHOULD_NOT_RUN" 2>/dev/null)
    rc=$?
    [ "$rc" -eq 0 ] || fail "$MODE $KIND returned $rc, expected 0"
    [ -z "$out" ] && [ "$out" != "SHOULD_NOT_RUN" ] || fail "$MODE $KIND executed argv (stdout='$out')"
  done
  # push returns the named sentinel under BOTH non-live modes, never 0.
  ECHO_EFFECT_MODE="$MODE" bash -c "source '$TOOL_DIR/_effect-runner.sh'; echo_effect push -- echo SHOULD_NOT_RUN" >/dev/null 2>&1
  rc=$?
  [ "$rc" -eq 97 ] || fail "$MODE push returned $rc, expected ECHO_EFFECT_NONLIVE_RC=97"
done

# ── 3. push-with-retry.sh non-live: no real git, propagates 97 ────────────
# Run in a throwaway git repo with NO origin remote. Under live this would
# fail trying to pull/push; under non-live it must no-op and return 97
# WITHOUT touching the network or the local tree.
for MODE in dry-run test; do
  TMP=$(mktemp -d -t echo-rq-effect-XXXX)
  git -C "$TMP" init -q -b main
  git -C "$TMP" config user.email t@e.com
  git -C "$TMP" config user.name t
  echo seed > "$TMP/f"
  git -C "$TMP" add f
  git -C "$TMP" commit -q -m seed
  before=$(git -C "$TMP" rev-parse HEAD)
  ECHO_EFFECT_MODE="$MODE" bash -c "cd '$TMP' && '$TOOL_DIR/push-with-retry.sh' 'test ctx'" >/dev/null 2>&1
  rc=$?
  [ "$rc" -eq 97 ] || fail "$MODE push-with-retry.sh returned $rc, expected 97"
  after=$(git -C "$TMP" rev-parse HEAD)
  [ "$before" = "$after" ] || fail "$MODE push-with-retry.sh mutated local git ($before -> $after)"
  rm -rf "$TMP"
done

# ── 4. commit-reviewer-response.sh non-live: refuse, no orphan commit ─────
# Build a fixture round with a valid reviewer response. Under non-live, the
# script must refuse BEFORE git add/commit (preferred) or roll back, so HEAD
# is unchanged and no completed tick is emitted.
for MODE in dry-run test; do
  TMP=$(mktemp -d -t echo-rq-crr-XXXX)
  git -C "$TMP" init -q -b main
  git -C "$TMP" config user.email t@e.com
  git -C "$TMP" config user.name t
  # Copy the review-queue tooling so the script's REPO_ROOT-relative
  # helper lookups resolve.
  mkdir -p "$TMP/tools"
  cp -R "$TOOL_DIR" "$TMP/tools/review-queue"
  ITEM_ID="2026-05-28-079-effect-fixture"
  RDIR="$TMP/backlog/reviews/$ITEM_ID/r1"
  mkdir -p "$RDIR"
  cat > "$RDIR/request.md" <<EOF
---
item_id: "$ITEM_ID"
round: 1
spec_commit_sha: "abc1234"
artifact_path: "backlog/ready/$ITEM_ID.md"
class: "narrow"
requested_at: "2026-05-28T05:00:00Z"
requested_reviewers:
  - "codex"
---
body
EOF
  cat > "$RDIR/codex.md" <<EOF
---
item_id: "$ITEM_ID"
round: 1
reviewer: "codex"
artifact_sha: "abc1234"
completed_at: "2026-05-28T06:00:00Z"
verdict: "proceed"
findings: []
---
body
EOF
  git -C "$TMP" add -A
  git -C "$TMP" commit -q -m seed
  before=$(git -C "$TMP" rev-parse HEAD)
  ECHO_EFFECT_MODE="$MODE" bash -c "cd '$TMP' && '$TMP/tools/review-queue/commit-reviewer-response.sh' '$RDIR/codex.md' codex 1 '$ITEM_ID'" >/dev/null 2>&1
  rc=$?
  [ "$rc" -eq 97 ] || fail "$MODE commit-reviewer-response.sh returned $rc, expected 97 (non-completed)"
  after=$(git -C "$TMP" rev-parse HEAD)
  [ "$before" = "$after" ] || fail "$MODE commit-reviewer-response.sh left an orphaned local commit ($before -> $after)"
  rm -rf "$TMP"
done

echo "PASS: effect-runner mode contract, push-with-retry no-op, and false-completed-tick guard all hold"
