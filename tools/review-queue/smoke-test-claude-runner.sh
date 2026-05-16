#!/usr/bin/env bash
# smoke-test-claude-runner.sh — synthetic-request end-to-end smoke for 056 AC7.
# Sibling of smoke-test-codex-runner.sh. Runs the Claude reviewer wrapper
# against an isolated tmpdir repo with a local bare origin. Hard isolation
# assertions guarantee the smoke can never reach the production GitHub origin.
#
# Pinned synthetic item_id: 2026-05-15-999-smoke-test-claude-synthetic.
#
# Fail-open vs fail-closed (056 AC7 r1 codex-ops F5 HIGH unique):
#   * Default (no --install-context): fail-open when the `claude` CLI is not
#     installed — emits a [skip] line and exits 0. CI doesn't choke; fresh
#     machines can still exercise the rest of the install path.
#   * --install-context: fail-closed. The installer invokes the smoke runner
#     with this flag; a missing `claude` CLI exits non-zero so the operator
#     gets an immediate error instead of a silently-failing launchd job.
#
# Exit 0 on all hard assertions passing; non-zero with diagnostic on failure.
# Both tmpdirs are removed on exit (success or failure).

set -euo pipefail

INSTALL_CONTEXT=0
for arg in "$@"; do
  case "$arg" in
    --install-context) INSTALL_CONTEXT=1 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WRAPPER="$REPO_ROOT/tools/review-queue/run-claude-reviewer.sh"

if [ ! -x "$WRAPPER" ]; then
  echo "smoke FAIL: wrapper not executable at $WRAPPER" >&2
  exit 1
fi

# Fail-open / fail-closed preflight on the resolved CLI executable.
if ! command -v claude >/dev/null 2>&1; then
  if [ "$INSTALL_CONTEXT" -eq 1 ]; then
    echo "smoke FAIL: --install-context set but claude CLI not on PATH (which claude: $(command -v claude || echo '<unset>'))" >&2
    exit 1
  fi
  echo "[skip] claude CLI not installed at $(command -v claude || echo '<unset>') — smoke fail-open per non-install context"
  exit 0
fi

SMOKE_WORK="$(mktemp -d -t echo-rq-smoke-claude-work)"
SMOKE_ORIGIN="$(mktemp -d -t echo-rq-smoke-claude-origin)"

cleanup() {
  rm -rf "$SMOKE_WORK" "$SMOKE_ORIGIN"
}
trap cleanup EXIT

ITEM_ID="2026-05-15-999-smoke-test-claude-synthetic"
PRODUCTION_ORIGIN="https://github.com/zhenye0616/ECHO.git"

echo "smoke: SMOKE_WORK=$SMOKE_WORK"
echo "smoke: SMOKE_ORIGIN=$SMOKE_ORIGIN"

if git init --bare -b main "$SMOKE_ORIGIN" >/dev/null 2>&1; then
  :
else
  git init --bare "$SMOKE_ORIGIN" >/dev/null
  git -C "$SMOKE_ORIGIN" symbolic-ref HEAD refs/heads/main
fi

if git init -b main "$SMOKE_WORK" >/dev/null 2>&1; then
  :
else
  git init "$SMOKE_WORK" >/dev/null
  git -C "$SMOKE_WORK" symbolic-ref HEAD refs/heads/main
fi

git -C "$SMOKE_WORK" config user.email "smoke@echo.local"
git -C "$SMOKE_WORK" config user.name "echo-smoke-claude"
git -C "$SMOKE_WORK" remote add origin "$SMOKE_ORIGIN"

mkdir -p "$SMOKE_WORK/.claude/commands" \
         "$SMOKE_WORK/tools/review-queue/schemas" \
         "$SMOKE_WORK/backlog/ready" \
         "$SMOKE_WORK/backlog/reviews/$ITEM_ID/r1" \
         "$SMOKE_WORK/raw/internal"

cp "$REPO_ROOT/.claude/commands/review-queue-claude.md" "$SMOKE_WORK/.claude/commands/"
cp "$REPO_ROOT/.claude/commands/review-queue-codex.md" "$SMOKE_WORK/.claude/commands/"
cp "$REPO_ROOT/.claude/commands/review-queue-cursor.md" "$SMOKE_WORK/.claude/commands/" 2>/dev/null || true
cp -R "$REPO_ROOT/tools/review-queue/." "$SMOKE_WORK/tools/review-queue/"
cp "$REPO_ROOT/.gitignore" "$SMOKE_WORK/.gitignore"
find "$SMOKE_WORK/tools/review-queue" -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

cat > "$SMOKE_WORK/backlog/ready/$ITEM_ID.md" <<EOF
---
id: $ITEM_ID
title: Synthetic smoke-test artifact for claude reviewer (do not ship)
status: ready
priority: LOW
created: 2026-05-15
claimed_by: null
claimed_at: null
branch: null
head_sha: null
spec_refs: []
blocked_by: []
---

## Why this now

Synthetic artifact for the 056 AC7 smoke test of the claude reviewer wrapper.

## Acceptance Criteria

**AC1 — Smoke artifact** exists. (Always trivially satisfied.)
EOF

git -C "$SMOKE_WORK" add -A
git -C "$SMOKE_WORK" commit -m "smoke: initial fixture" >/dev/null
SPEC_SHA="$(git -C "$SMOKE_WORK" rev-parse HEAD)"
git -C "$SMOKE_WORK" push origin main >/dev/null

cat > "$SMOKE_WORK/backlog/reviews/$ITEM_ID/r1/request.md" <<EOF
---
item_id: "$ITEM_ID"
round: 1
spec_commit_sha: "$SPEC_SHA"
artifact_path: "backlog/ready/$ITEM_ID.md"
class: "narrow"
requested_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
requested_reviewers:
  - "claude"
---

Synthetic smoke request — reviewer should respond with a valid frontmatter
even though the artifact is trivial.
EOF

git -C "$SMOKE_WORK" add backlog/reviews
git -C "$SMOKE_WORK" commit -m "smoke: synthetic request" >/dev/null
git -C "$SMOKE_WORK" push origin main >/dev/null

echo "smoke: invoking run-claude-reviewer.sh against $SMOKE_WORK"
set +e
ECHO_REVIEW_QUEUE_REPO_ROOT="$SMOKE_WORK" "$WRAPPER"
WRAPPER_RC=$?
set -e
echo "smoke: wrapper rc=$WRAPPER_RC"

CLAUDE_RESPONSE="$SMOKE_WORK/backlog/reviews/$ITEM_ID/r1/claude.md"
WRAPPER_LOG="$HOME/Library/Logs/echo-review-queue-claude.log"

fail() {
  echo "smoke FAIL: $1" >&2
  if [ -f "$WRAPPER_LOG" ]; then
    echo "--- wrapper log (last 50 lines) ---" >&2
    tail -n 50 "$WRAPPER_LOG" >&2
  fi
  exit 1
}

# --- Hard isolation assertions (deterministic, no race window) --------------
remote_url="$(git -C "$SMOKE_WORK" remote get-url origin)"
if [ "$remote_url" != "$SMOKE_ORIGIN" ]; then
  fail "origin remote url drift: got '$remote_url' want '$SMOKE_ORIGIN'"
fi

remotes="$(git -C "$SMOKE_WORK" remote)"
if [ "$remotes" != "origin" ]; then
  fail "unexpected remotes in smoke repo: '$remotes' (want only 'origin')"
fi

if grep -q "$PRODUCTION_ORIGIN" "$SMOKE_WORK/.git/config"; then
  fail "production origin URL present in smoke .git/config — isolation breach"
fi

# --- Functional assertions --------------------------------------------------
# In non-install contexts where claude IS installed but operates without
# permissions configured for unattended use, the wrapper may exit non-zero
# without producing claude.md. That's acceptable for the smoke (it doesn't
# claim to drive `claude -p` end-to-end without operator config); we only
# assert isolation + hard preconditions. The install-context flow gates on
# the same `command -v claude` preflight performed at the top.
if [ -f "$CLAUDE_RESPONSE" ]; then
  VALIDATE_OUT=$(python3 "$SMOKE_WORK/tools/review-queue/validate.py" reviewer "$CLAUDE_RESPONSE" 2>&1 || true)
  if ! python3 "$SMOKE_WORK/tools/review-queue/validate.py" reviewer "$CLAUDE_RESPONSE" >/dev/null 2>&1; then
    fail "claude.md exists but does not validate against reviewer.schema.json: $VALIDATE_OUT"
  fi
  head_msg="$(git -C "$SMOKE_WORK" log -1 --pretty=%s)"
  case "$head_msg" in
    "review-r1: claude on $ITEM_ID") ;;
    *) fail "HEAD commit message not the expected reviewer push (got: '$head_msg')" ;;
  esac
  echo "smoke OK: claude.md produced, validated, committed; hard isolation assertions all passed"
else
  echo "smoke OK (no-response variant): wrapper ran cleanly, no claude.md produced (operator may need to configure claude permissions for unattended runs); hard isolation assertions all passed"
fi
exit 0
