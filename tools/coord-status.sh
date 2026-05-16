#!/usr/bin/env bash
# 057a AC6 — CLI sibling of the coord_status MCP tool.
#
# Operator inspection from any terminal — calls the daemon's JSON-RPC
# /mcp endpoint with the `coord_status` tool name. Reads the daemon's
# port from $ECHO_DAEMON_PORT (default 38478) and prints the
# structuredContent payload through jq for readability.
#
# Usage:
#   bash tools/coord-status.sh                 # pretty-print full status
#   bash tools/coord-status.sh open            # just the open_deadlines list
#   bash tools/coord-status.sh missed          # just recent_missed
#   bash tools/coord-status.sh slots           # just last_miss_per_role_per_event_type
#   bash tools/coord-status.sh ticks           # per_role_last_tick rows
#   bash tools/coord-status.sh uptime          # daemon uptime in seconds
#
# Note: the daemon's loopback DNS-rebinding protection accepts only
# 127.0.0.1 / localhost; this script uses 127.0.0.1 to match.

set -euo pipefail

PORT="${ECHO_DAEMON_PORT:-38478}"
URL="http://127.0.0.1:${PORT}/mcp"
FILTER="${1:-all}"

# JSON-RPC envelope for a tool call with no arguments. The MCP daemon's
# coord_status tool takes no parameters; sessionId is omitted (the
# StreamableHTTP transport at src/mcp/server.ts uses
# sessionIdGenerator: undefined, accepting stateless calls).
PAYLOAD='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"coord_status","arguments":{}}}'

response=$(curl -sS -X POST "$URL" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data "$PAYLOAD")

# The MCP response shape: result.structuredContent carries the typed
# CoordStatusResult. Fall back to result.content[0].text for daemons
# that omit structuredContent (older transport behavior).
extract() {
  echo "$response" | jq -r '.result.structuredContent // (.result.content[0].text | fromjson)'
}

case "$FILTER" in
  all)
    extract | jq '.'
    ;;
  open)
    extract | jq '.open_deadlines'
    ;;
  missed)
    extract | jq '.recent_missed'
    ;;
  slots)
    extract | jq '.last_miss_per_role_per_event_type'
    ;;
  ticks)
    extract | jq '.per_role_last_tick'
    ;;
  uptime)
    extract | jq '.daemon_uptime_sec'
    ;;
  *)
    echo "unknown filter: $FILTER" >&2
    echo "valid: all | open | missed | slots | ticks | uptime" >&2
    exit 2
    ;;
esac
