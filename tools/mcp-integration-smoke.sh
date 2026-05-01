#!/usr/bin/env bash
# ECHO MCP integration smoke test.
#
# Verifies a running ECHO daemon over HTTP MCP:
#   1. The daemon's MCP endpoint is reachable.
#   2. `tools/list` includes `search_memories`.
#   3. `tools/call search_memories` returns a JSON result with a `matches` array.
#
# Exit codes:
#   0 — all checks passed
#   1 — any check failed (specific reason on stderr)
#
# Environment:
#   ECHO_MCP_PORT — port to probe (default: 38478)
#
# Usage:
#   ./tools/mcp-integration-smoke.sh
#   ECHO_MCP_PORT=38479 ./tools/mcp-integration-smoke.sh

set -euo pipefail

PORT="${ECHO_MCP_PORT:-38478}"
URL="http://127.0.0.1:${PORT}/mcp"
ACCEPT='application/json, text/event-stream'

log_err() { printf 'mcp-smoke: %s\n' "$*" >&2; }
log_ok()  { printf 'mcp-smoke: %s\n' "$*"; }

# Extract the first SSE `data:` payload from a response, falling back to the raw
# body if the server replied with plain JSON (some MCP transports negotiate down).
extract_payload() {
  local resp="$1"
  local data
  data=$(printf '%s\n' "$resp" | sed -n 's/^data: //p' | head -1)
  if [ -n "$data" ]; then
    printf '%s' "$data"
  else
    printf '%s' "$resp"
  fi
}

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# --- 1. Reachability ----------------------------------------------------------

if ! curl -sS --connect-timeout 2 -o /dev/null -w '' \
    -X POST "$URL" \
    -H "Accept: $ACCEPT" \
    -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"echo-smoke","version":"0.0.0"}}}'; then
  log_err "cannot reach $URL"
  log_err "is the daemon running?  Start it with:  npm run daemon"
  exit 1
fi

# --- 2. Initialize and capture session header ---------------------------------

INIT_HEADERS="$WORK/init.headers"
INIT_BODY="$WORK/init.body"

curl -sS -D "$INIT_HEADERS" -o "$INIT_BODY" \
  -X POST "$URL" \
  -H "Accept: $ACCEPT" \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"echo-smoke","version":"0.0.0"}}}'

SESSION=$(awk 'tolower($1) == "mcp-session-id:" { sub(/\r$/,"",$2); print $2; exit }' "$INIT_HEADERS")
if [ -z "${SESSION:-}" ]; then
  log_err "initialize did not return Mcp-Session-Id header"
  log_err "response headers:"
  sed 's/^/  /' "$INIT_HEADERS" >&2
  exit 1
fi

# Notify the server we're done initializing (required by the protocol).
curl -sS -o /dev/null \
  -X POST "$URL" \
  -H "Accept: $ACCEPT" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION" \
  --data '{"jsonrpc":"2.0","method":"notifications/initialized"}'

# --- 3. tools/list contains search_memories -----------------------------------

LIST_RESPONSE=$(curl -sS \
  -X POST "$URL" \
  -H "Accept: $ACCEPT" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION" \
  --data '{"jsonrpc":"2.0","id":2,"method":"tools/list"}')

LIST_PAYLOAD=$(extract_payload "$LIST_RESPONSE")

if ! printf '%s' "$LIST_PAYLOAD" | grep -q '"name":"search_memories"'; then
  log_err "tools/list response did not include search_memories"
  log_err "raw response:"
  printf '%s\n' "$LIST_RESPONSE" | sed 's/^/  /' >&2
  exit 1
fi

# --- 4. tools/call search_memories returns a `matches` array ------------------

CALL_RESPONSE=$(curl -sS \
  -X POST "$URL" \
  -H "Accept: $ACCEPT" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION" \
  --data '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_memories","arguments":{"limit":3}}}')

CALL_PAYLOAD=$(extract_payload "$CALL_RESPONSE")

# The MCP tool-call wraps the tool's JSON result inside `content[0].text` as a
# stringified JSON, so the inner "matches" appears in the wire bytes as
# `\"matches\"`. Match either form so the script is robust to future transports
# that might inline the object.
if ! printf '%s' "$CALL_PAYLOAD" | grep -qE '("matches"|\\"matches\\")[[:space:]]*:'; then
  log_err "tools/call search_memories did not return a 'matches' field"
  log_err "raw response:"
  printf '%s\n' "$CALL_RESPONSE" | sed 's/^/  /' >&2
  exit 1
fi

if ! printf '%s' "$CALL_PAYLOAD" | grep -qE '("limit_applied"|\\"limit_applied\\")[[:space:]]*:'; then
  log_err "tools/call search_memories response missing 'limit_applied' (envelope mismatch)"
  log_err "raw response:"
  printf '%s\n' "$CALL_RESPONSE" | sed 's/^/  /' >&2
  exit 1
fi

log_ok "OK: $URL"
log_ok "OK: tools/list contains search_memories"
log_ok "OK: tools/call search_memories returned matches+limit_applied"
exit 0
