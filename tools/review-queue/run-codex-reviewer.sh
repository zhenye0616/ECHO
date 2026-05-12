#!/usr/bin/env bash
# run-codex-reviewer.sh — unattended Codex reviewer tick (AC1 of item 041).
#
# Invoked by launchd (every 10 min via com.echo.review-queue-codex.plist) or
# manually by the founder for verification. One tick = one review-queue-codex
# slash-command body executed under `codex exec` in headless mode.
#
# Working repo is selected via ${ECHO_REVIEW_QUEUE_REPO_ROOT}; default is the
# founder's production repo. The smoke test (AC5) sets this env var to a
# tmpdir so smoke never touches production.
#
# Logs (stdout + stderr) append to ~/Library/Logs/echo-review-queue-codex.log.

set -euo pipefail

REPO_ROOT="${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}"

if ! cd "$REPO_ROOT" 2>/dev/null; then
  echo "ECHO_REVIEW_QUEUE_REPO_ROOT is missing or not a directory: '${ECHO_REVIEW_QUEUE_REPO_ROOT:-<unset>}'" >&2
  exit 1
fi
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ECHO_REVIEW_QUEUE_REPO_ROOT is missing or not a git repo: '${ECHO_REVIEW_QUEUE_REPO_ROOT:-<unset>}'" >&2
  exit 1
fi

# PATH augmentation — launchd's environment is stripped down; codex (and the
# common dependencies it shells out to) live in user-local bin directories
# under Homebrew or asdf/nodenv. Cover the common locations.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/.nodenv/shims:$HOME/.asdf/shims:$HOME/bin:$HOME/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

LOG_DIR="$HOME/Library/Logs"
LOG_FILE="$LOG_DIR/echo-review-queue-codex.log"
mkdir -p "$LOG_DIR"

# Rotate at 10MB (10485760 bytes) — keep one .1 sidecar, drop older.
if [ -f "$LOG_FILE" ]; then
  size=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
  if [ "${size:-0}" -gt 10485760 ]; then
    mv -f "$LOG_FILE" "$LOG_FILE.1"
  fi
fi

{
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick start ECHO_REVIEW_QUEUE_REPO_ROOT=$REPO_ROOT"

  PROMPT="$REPO_ROOT/.claude/commands/review-queue-codex.md"
  if [ ! -f "$PROMPT" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick abort: prompt missing at $PROMPT" >&2
    exit 1
  fi

  set +e
  codex exec -C "$REPO_ROOT" --sandbox danger-full-access - < "$PROMPT"
  rc=$?
  set -e
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick end rc=$rc"
  exit "$rc"
} >> "$LOG_FILE" 2>&1
