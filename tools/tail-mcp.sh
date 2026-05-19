#!/usr/bin/env bash
# tail-mcp.sh — live tail of ECHO daemon MCP calls.
# Companion to the per-session agent stdout/stderr log at
# ~/.config/raycast/extensions/echo-context/sessions/latest.log
#
# Usage: tools/tail-mcp.sh   (Ctrl-C to stop)

set -euo pipefail

URL="http://127.0.0.1:38478/mcp/recent-calls"
POLL_SECONDS="0.5"
FUTURE_MS=2000
daemon_down=0

now_ms() {
  python3 -c 'import time; print(int(time.time() * 1000))'
}

mark_unreachable() {
  if [ "$daemon_down" -eq 0 ]; then
    echo "--- daemon unreachable (will retry) ---"
  fi
  daemon_down=1
}

trap 'echo; exit 0' INT TERM

first_since=$(( $(now_ms) - 60000 ))
last_ts=$(( first_since - 1 ))

while true; do
  now=$(( $(now_ms) ))
  since=$(( last_ts + 1 ))
  until=$(( now + FUTURE_MS ))

  if ! body=$(curl --silent --fail --max-time 1 "${URL}?since=${since}&until=${until}"); then
    mark_unreachable
    sleep "$POLL_SECONDS"
    continue
  fi

  if ! jq -e '.calls | arrays' >/dev/null 2>&1 <<<"$body"; then
    mark_unreachable
    sleep "$POLL_SECONDS"
    continue
  fi

  if [ "$daemon_down" -eq 1 ]; then
    echo "--- daemon back online ---"
    daemon_down=0
  fi

  jq -r '
    .calls[]
    | "\((.ts / 1000) | strflocaltime("%Y-%m-%dT%H:%M:%S%z"))  \(.tool)  \(if .duration_ms == null then "pending" else "\((.duration_ms | round))ms" end)  \(.status)"
  ' <<<"$body"

  max_ts=$(jq -r '[.calls[].ts] | max // empty' <<<"$body")
  if [ -n "$max_ts" ] && [ "$max_ts" -gt "$last_ts" ]; then
    last_ts=$max_ts
  fi

  sleep "$POLL_SECONDS"
done
