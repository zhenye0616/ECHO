#!/usr/bin/env bash
# status-codex-reviewer-launchd.sh — at-a-glance status of the Codex reviewer
# launchd job (AC2 of item 041).
#
# Prints the launchctl list entry (PID / last-exit / label) plus the last 10
# lines of ~/Library/Logs/echo-review-queue-codex.log.

set -uo pipefail

LABEL="com.echo.review-queue-codex"
LOG_FILE="$HOME/Library/Logs/echo-review-queue-codex.log"

echo "=== launchctl list ==="
if launchctl list | grep -E "^[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]+$LABEL\$" > /tmp/echo-rq-status.$$ 2>/dev/null; then
  cat /tmp/echo-rq-status.$$
  rm -f /tmp/echo-rq-status.$$
else
  echo "$LABEL not loaded"
  rm -f /tmp/echo-rq-status.$$
fi

echo
echo "=== last 10 lines of $LOG_FILE ==="
if [ -f "$LOG_FILE" ]; then
  tail -n 10 "$LOG_FILE"
else
  echo "(log file does not exist yet)"
fi
