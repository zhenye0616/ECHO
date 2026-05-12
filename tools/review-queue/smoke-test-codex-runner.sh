#!/usr/bin/env bash
# smoke-test-codex-runner.sh — synthetic-request end-to-end smoke for AC5 of
# item 041. Runs the Codex reviewer wrapper against an isolated tmpdir repo
# with a local bare origin. Hard isolation assertions guarantee the smoke
# can never reach the production GitHub origin.
#
# Pinned synthetic item_id: 2026-05-12-999-smoke-test-synthetic.
#
# Exit 0 on all hard assertions passing; non-zero with diagnostic on failure.
# Both tmpdirs are removed on exit (success or failure).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WRAPPER="$REPO_ROOT/tools/review-queue/run-codex-reviewer.sh"

if [ ! -x "$WRAPPER" ]; then
  echo "smoke FAIL: wrapper not executable at $WRAPPER" >&2
  exit 1
fi

SMOKE_WORK="$(mktemp -d -t echo-rq-smoke-work)"
SMOKE_ORIGIN="$(mktemp -d -t echo-rq-smoke-origin)"

cleanup() {
  rm -rf "$SMOKE_WORK" "$SMOKE_ORIGIN"
}
trap cleanup EXIT

ITEM_ID="2026-05-12-999-smoke-test-synthetic"
PRODUCTION_ORIGIN="https://github.com/zhenye0616/echo_wiki.git"

echo "smoke: SMOKE_WORK=$SMOKE_WORK"
echo "smoke: SMOKE_ORIGIN=$SMOKE_ORIGIN"

# --- Bare origin on main -----------------------------------------------------
if git init --bare -b main "$SMOKE_ORIGIN" >/dev/null 2>&1; then
  :
else
  # Older git without -b on init --bare: fall back to manual symbolic-ref.
  git init --bare "$SMOKE_ORIGIN" >/dev/null
  git -C "$SMOKE_ORIGIN" symbolic-ref HEAD refs/heads/main
fi

# --- Working repo on main, copy of the prompt + helpers ----------------------
if git init -b main "$SMOKE_WORK" >/dev/null 2>&1; then
  :
else
  git init "$SMOKE_WORK" >/dev/null
  git -C "$SMOKE_WORK" symbolic-ref HEAD refs/heads/main
fi

git -C "$SMOKE_WORK" config user.email "smoke@echo.local"
git -C "$SMOKE_WORK" config user.name "echo-smoke"
git -C "$SMOKE_WORK" remote add origin "$SMOKE_ORIGIN"

# Copy the paths the canonical reviewer prompt references plus the helper
# infrastructure it commits through. Full-tree copy is the safe default per
# the AC5 implementation hint — minimal-copy is a future optimization.
mkdir -p "$SMOKE_WORK/.claude/commands" \
         "$SMOKE_WORK/tools/review-queue/schemas" \
         "$SMOKE_WORK/backlog/ready" \
         "$SMOKE_WORK/backlog/reviews/$ITEM_ID/r1" \
         "$SMOKE_WORK/raw/internal"

cp "$REPO_ROOT/.claude/commands/review-queue-codex.md" "$SMOKE_WORK/.claude/commands/"
cp "$REPO_ROOT/.claude/commands/review-queue-cursor.md" "$SMOKE_WORK/.claude/commands/"
cp -R "$REPO_ROOT/tools/review-queue/." "$SMOKE_WORK/tools/review-queue/"
# Copy .gitignore so the smoke repo's `git add -A` ignores Python bytecode
# caches (__pycache__/, *.pyc) and other build artifacts copied above.
# Without this, validate.py's bytecode generation makes the worktree dirty
# mid-pipeline → push-with-retry's pull-rebase fails. Defensive: the helper
# also sets PYTHONDONTWRITEBYTECODE=1 (commit-reviewer-response.sh).
cp "$REPO_ROOT/.gitignore" "$SMOKE_WORK/.gitignore"
# Remove any __pycache__/ that hitched a ride from the founder's filesystem
# (gitignored in main, but `cp -R` doesn't filter by gitignore).
find "$SMOKE_WORK/tools/review-queue" -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

# Synthetic backlog/ready stub so request.py find_artifact (when invoked
# downstream) resolves; same shape as the 040 R2 fixture preamble fix.
cat > "$SMOKE_WORK/backlog/ready/$ITEM_ID.md" <<EOF
---
id: $ITEM_ID
title: Synthetic smoke-test artifact (do not ship)
status: ready
priority: LOW
created: 2026-05-12
claimed_by: null
claimed_at: null
branch: null
head_sha: null
spec_refs: []
blocked_by: []
---

## Why this now

Synthetic artifact for the AC5 smoke test of item 041. The codex reviewer
should produce a valid response file referencing this artifact.

## Acceptance Criteria

**AC1 — Smoke artifact** exists. (Always trivially satisfied.)
EOF

# Initial commit so we have a HEAD to reference as spec_commit_sha.
git -C "$SMOKE_WORK" add -A
git -C "$SMOKE_WORK" commit -m "smoke: initial fixture" >/dev/null
SPEC_SHA="$(git -C "$SMOKE_WORK" rev-parse HEAD)"

# Push baseline to bare origin so push-with-retry.sh has a fast-forward target.
git -C "$SMOKE_WORK" push origin main >/dev/null

# Synthetic request.md — both reviewers requested; narrow class.
cat > "$SMOKE_WORK/backlog/reviews/$ITEM_ID/r1/request.md" <<EOF
---
item_id: "$ITEM_ID"
round: 1
spec_commit_sha: "$SPEC_SHA"
artifact_path: "backlog/ready/$ITEM_ID.md"
class: "narrow"
requested_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
requested_reviewers:
  - "codex"
  - "cursor"
---

Synthetic smoke request — reviewer should respond with a valid frontmatter
even though the artifact is trivial.
EOF

git -C "$SMOKE_WORK" add backlog/reviews
git -C "$SMOKE_WORK" commit -m "smoke: synthetic request" >/dev/null
git -C "$SMOKE_WORK" push origin main >/dev/null

# --- Run the wrapper with env override --------------------------------------
# We override ECHO_REVIEW_QUEUE_REPO_ROOT (to point the wrapper at the tmp
# smoke repo) but NOT HOME — `codex exec` looks up its ChatGPT auth at
# `$HOME/.codex/auth.json`; overriding HOME to a tmpdir breaks auth with a
# 401 from the OpenAI API. The smoke's isolation guarantees are about the
# smoke REPO's remote config (asserted below), not HOME isolation; the
# wrapper's log file ($HOME/Library/Logs/echo-review-queue-codex.log) is
# the same file launchd writes to in steady state, so smoke runs leave
# real audit-trail entries in the production log — desirable.
echo "smoke: invoking run-codex-reviewer.sh against $SMOKE_WORK"
set +e
ECHO_REVIEW_QUEUE_REPO_ROOT="$SMOKE_WORK" "$WRAPPER"
WRAPPER_RC=$?
set -e
echo "smoke: wrapper rc=$WRAPPER_RC"

CODEX_RESPONSE="$SMOKE_WORK/backlog/reviews/$ITEM_ID/r1/codex.md"
WRAPPER_LOG="$HOME/Library/Logs/echo-review-queue-codex.log"

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
if [ ! -f "$CODEX_RESPONSE" ]; then
  fail "codex.md was not produced at $CODEX_RESPONSE"
fi

VALIDATE_OUT=$(python3 "$SMOKE_WORK/tools/review-queue/validate.py" reviewer "$CODEX_RESPONSE" 2>&1 || true)
if ! python3 "$SMOKE_WORK/tools/review-queue/validate.py" reviewer "$CODEX_RESPONSE" >/dev/null 2>&1; then
  fail "codex.md does not validate against reviewer.schema.json: $VALIDATE_OUT"
fi

head_msg="$(git -C "$SMOKE_WORK" log -1 --pretty=%s)"
case "$head_msg" in
  "review-r1: codex on $ITEM_ID") ;;
  *)
    fail "HEAD commit message not the expected reviewer push (got: '$head_msg')"
    ;;
esac

# --- Advisory: production-repo origin/main delta ----------------------------
if [ -d "$REPO_ROOT/.git" ]; then
  prod_delta=$(git -C "$REPO_ROOT" rev-list HEAD..origin/main 2>/dev/null | wc -l | tr -d ' ' || echo "?")
  echo "smoke: advisory — production repo HEAD..origin/main delta = $prod_delta commits (informational; other actors may push during smoke)"
fi

echo "smoke OK: codex.md produced, validated, committed; hard isolation assertions all passed"
exit 0
