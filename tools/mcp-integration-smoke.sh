#!/usr/bin/env bash
# ECHO MCP integration smoke test.
#
# Verifies a running ECHO daemon over HTTP MCP:
#   1. The daemon's MCP endpoint is reachable.
#   2. `tools/list` includes `search_memories` and `get_recent_work_context`.
#   3. `tools/call search_memories` returns a JSON result with a `matches` array.
#   4. `tools/call get_recent_work_context` returns a JSON result with `clusters`
#      and `truncation` fields (the V1.5 trace-layer response envelope).
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

# --- 3. tools/list contains all three tools with item-025 advertisements -----

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

if ! printf '%s' "$LIST_PAYLOAD" | grep -q '"name":"get_recent_work_context"'; then
  log_err "tools/list response did not include get_recent_work_context"
  log_err "(item 018 may not have been picked up — has the daemon restarted since merge?)"
  log_err "raw response:"
  printf '%s\n' "$LIST_RESPONSE" | sed 's/^/  /' >&2
  exit 1
fi

# Item 025: tools/list must advertise three tools with outputSchema +
# readOnlyHint, plus the source_app enum on search_memories.
LIST_FILE="$WORK/list-payload.json"
printf '%s' "$LIST_PAYLOAD" > "$LIST_FILE"
LIST_CHECK=$(python3 - "$LIST_FILE" <<'PY' 2>&1
import json, sys
with open(sys.argv[1]) as f:
    raw = f.read().strip()
try:
    env = json.loads(raw)
except json.JSONDecodeError as exc:
    print(f"PAYLOAD_NOT_JSON: {exc}")
    sys.exit(0)
result = env.get("result") or env
tools = result.get("tools") or []
names = sorted(t.get("name") for t in tools)
expected = ["echo_ping", "get_recent_work_context", "search_memories"]
if names != expected:
    print(f"WRONG_TOOL_SET: got {names}, expected {expected}")
    sys.exit(0)
for t in tools:
    n = t.get("name")
    if not t.get("annotations", {}).get("readOnlyHint"):
        print(f"MISSING_READONLY_HINT: {n}")
        sys.exit(0)
    if not t.get("outputSchema"):
        print(f"MISSING_OUTPUT_SCHEMA: {n}")
        sys.exit(0)
sm = next(t for t in tools if t["name"] == "search_memories")
sa = (
    sm.get("inputSchema", {}).get("properties", {}).get("source_app")
)
if sa is None:
    print("SEARCH_MEMORIES_MISSING_SOURCE_APP")
    sys.exit(0)
sa_enum = sorted(sa.get("enum") or [])
if sa_enum != sorted(["cursor", "claude_code", "codex", "git"]):
    print(f"SEARCH_MEMORIES_WRONG_SOURCE_APP_ENUM: {sa_enum}")
    sys.exit(0)
rwc = next(t for t in tools if t["name"] == "get_recent_work_context")
desc = rwc.get("description", "")
if "limit=20" not in desc or 'format="minimal"' not in desc:
    print(f"GET_RECENT_WORK_CONTEXT_DESC_MISSING_DEFAULTS")
    sys.exit(0)
print("OK_LIST_CHECK")
PY
)

case "$LIST_CHECK" in
  OK_LIST_CHECK*)
    : # ok
    ;;
  *)
    log_err "tools/list item-025 advertisement check: $LIST_CHECK"
    log_err "raw response:"
    printf '%s\n' "$LIST_RESPONSE" | sed 's/^/  /' >&2
    exit 1
    ;;
esac

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

# --- 5. tools/call get_recent_work_context returns clusters + truncation -----

CTX_RESPONSE=$(curl -sS \
  -X POST "$URL" \
  -H "Accept: $ACCEPT" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION" \
  --data '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_recent_work_context","arguments":{}}}')

CTX_PAYLOAD=$(extract_payload "$CTX_RESPONSE")

# Same envelope rules as search_memories: tool result is stringified JSON inside
# content[0].text, so on the wire `"clusters"` shows up as `\"clusters\"`.
if ! printf '%s' "$CTX_PAYLOAD" | grep -qE '("clusters"|\\"clusters\\")[[:space:]]*:'; then
  log_err "tools/call get_recent_work_context did not return a 'clusters' field"
  log_err "raw response:"
  printf '%s\n' "$CTX_RESPONSE" | sed 's/^/  /' >&2
  exit 1
fi

if ! printf '%s' "$CTX_PAYLOAD" | grep -qE '("truncation"|\\"truncation\\")[[:space:]]*:'; then
  log_err "tools/call get_recent_work_context response missing 'truncation' (envelope mismatch)"
  log_err "raw response:"
  printf '%s\n' "$CTX_RESPONSE" | sed 's/^/  /' >&2
  exit 1
fi

# --- 6. Edge-filter assertion (item 019) -------------------------------------
#
# For any cluster with atom_ids.length >= 5, edges.length must be strictly less
# than C(N, 2). This proves the redundant-edge predicate is observably trimming
# the K_n pairwise restatements in real data.
#
# The MCP tool wraps its JSON result inside content[0].text as a stringified
# envelope, so we have to walk through it: extract the result.content[0].text,
# parse it as JSON, then inspect clusters[]. python3 keeps the script portable
# (no jq dependency) and lets us count atom_ids/edges directly.

PAYLOAD_FILE="$WORK/ctx-payload.json"
printf '%s' "$CTX_PAYLOAD" > "$PAYLOAD_FILE"
EDGE_CHECK=$(python3 - "$PAYLOAD_FILE" <<'PY' 2>&1
import json, sys
with open(sys.argv[1]) as f:
    raw = f.read().strip()
if not raw:
    print("EMPTY_PAYLOAD")
    sys.exit(0)
try:
    env = json.loads(raw)
except json.JSONDecodeError as exc:
    print(f"PAYLOAD_NOT_JSON: {exc}")
    sys.exit(0)
result = env.get("result") or env
content = (result.get("content") or [])
if not content:
    print("OK_NO_CONTENT")
    sys.exit(0)
try:
    inner = json.loads(content[0]["text"])
except (KeyError, json.JSONDecodeError) as exc:
    print(f"INNER_NOT_JSON: {exc}")
    sys.exit(0)
clusters = inner.get("clusters", [])
checked = 0
for c in clusters:
    n = len(c.get("atom_ids", []))
    if n < 5:
        continue
    checked += 1
    edges = len(c.get("edges", []))
    max_pairs = n * (n - 1) // 2
    if edges >= max_pairs:
        print(
            f"REDUNDANT_EDGES: cluster {c.get('cluster_id', '?')} has "
            f"atom_ids={n} edges={edges} (>= C({n},2)={max_pairs}); "
            f"item-019 edge-filter is not trimming redundant edges"
        )
        sys.exit(0)
print(f"OK_EDGE_CHECK: {checked} cluster(s) with atom_ids>=5 passed")
PY
)

case "$EDGE_CHECK" in
  OK_EDGE_CHECK*|OK_NO_CONTENT|EMPTY_PAYLOAD)
    : # benign — either passed or no clusters >=5 in the live store
    ;;
  REDUNDANT_EDGES*)
    log_err "$EDGE_CHECK"
    log_err "raw response:"
    printf '%s\n' "$CTX_RESPONSE" | sed 's/^/  /' >&2
    exit 1
    ;;
  *)
    log_err "edge-filter check: $EDGE_CHECK"
    log_err "raw response:"
    printf '%s\n' "$CTX_RESPONSE" | sed 's/^/  /' >&2
    exit 1
    ;;
esac

# --- 7. Cross-gap window assertion (item 021) --------------------------------
#
# Pre-021 the trace layer pinned `window_hours` at 4h regardless of the
# (since, until) span, so a cluster spanning more than 4h of wall-clock time
# was structurally impossible — even though `(since, until)` was honored at
# the storage filter level. With 021's span-inferred window_hours, a 24h span
# should produce at least one cluster whose `time_range` spans > 4h, so long
# as the live store has any pair of related atoms across that gap.
#
# We probe a 24h window ending "now" (server-side). If the live store happens
# to be empty for that window, OR if no cluster crosses the gap, we treat that
# as benign — the assertion is a sentinel that fires only when the regression
# is observable. (The unit-test layer covers the deterministic case.)

NOW_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
SINCE_ISO=$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
  || date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)

CROSS_RESPONSE=$(curl -sS \
  -X POST "$URL" \
  -H "Accept: $ACCEPT" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION" \
  --data "$(printf '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"get_recent_work_context","arguments":{"since":"%s","until":"%s"}}}' "$SINCE_ISO" "$NOW_ISO")")

CROSS_PAYLOAD=$(extract_payload "$CROSS_RESPONSE")
CROSS_FILE="$WORK/cross-payload.json"
printf '%s' "$CROSS_PAYLOAD" > "$CROSS_FILE"

CROSS_CHECK=$(python3 - "$CROSS_FILE" <<'PY' 2>&1
import json, sys
from datetime import datetime
with open(sys.argv[1]) as f:
    raw = f.read().strip()
if not raw:
    print("EMPTY_PAYLOAD")
    sys.exit(0)
try:
    env = json.loads(raw)
except json.JSONDecodeError as exc:
    print(f"PAYLOAD_NOT_JSON: {exc}")
    sys.exit(0)
result = env.get("result") or env
content = (result.get("content") or [])
if not content:
    print("OK_NO_CONTENT")
    sys.exit(0)
try:
    inner = json.loads(content[0]["text"])
except (KeyError, json.JSONDecodeError) as exc:
    print(f"INNER_NOT_JSON: {exc}")
    sys.exit(0)
wh = inner.get("query", {}).get("window_hours")
if wh is None or wh <= 4:
    print(f"WINDOW_HOURS_NOT_INFERRED: query.window_hours={wh} (expected >4)")
    sys.exit(0)
clusters = inner.get("clusters", [])
if not clusters:
    print(f"OK_NO_CLUSTERS (window_hours={wh})")
    sys.exit(0)
def _parse(s):
    if not s: return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None
widest = 0.0
for c in clusters:
    tr = c.get("time_range", {})
    a = _parse(tr.get("from"))
    b = _parse(tr.get("to"))
    if a is None or b is None: continue
    span_h = (b - a).total_seconds() / 3600.0
    if span_h > widest: widest = span_h
if widest > 4.0:
    print(f"OK_CROSS_GAP: widest cluster spans {widest:.1f}h (window_hours={wh})")
else:
    print(f"OK_NO_CROSS_GAP: live store has no cluster >4h in last 24h (widest={widest:.1f}h)")
PY
)

case "$CROSS_CHECK" in
  OK_CROSS_GAP*|OK_NO_CROSS_GAP*|OK_NO_CLUSTERS*|OK_NO_CONTENT|EMPTY_PAYLOAD)
    : # benign — either passed, no data to assert against, or store empty
    ;;
  WINDOW_HOURS_NOT_INFERRED*)
    log_err "$CROSS_CHECK"
    log_err "raw response:"
    printf '%s\n' "$CROSS_RESPONSE" | sed 's/^/  /' >&2
    exit 1
    ;;
  *)
    log_err "cross-gap check: $CROSS_CHECK"
    log_err "raw response:"
    printf '%s\n' "$CROSS_RESPONSE" | sed 's/^/  /' >&2
    exit 1
    ;;
esac

# --- 8. Offset-form timestamp visibility (item 022 Bug A) --------------------
#
# Pre-022 the storage layer stored mixed timestamp forms (`Z` and `±HH:MM`),
# and the WHERE clauses on (since, until) were lex-compares against canonical
# `Z`-form ISO strings — so any in-window git event written with `-07:00`
# would silently vanish from the result set. Post-022 the capture pipeline
# canonicalizes all incoming timestamps to `Z`, and the daemon-startup
# migration rewrites legacy `-07:00` rows on first boot.
#
# We probe a 24h window over the live store via `search_memories` (which gives
# us a cheap source-typed listing) and assert: if any git event is present in
# the window, every returned timestamp ends with `Z`. This is a sentinel — it
# fires only when the regression is observable. (The unit-test layer covers
# the deterministic case.)

GITSCAN_RESPONSE=$(curl -sS \
  -X POST "$URL" \
  -H "Accept: $ACCEPT" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION" \
  --data "$(printf '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"search_memories","arguments":{"source_prefix":"git:","since":"%s","until":"%s","limit":50}}}' "$SINCE_ISO" "$NOW_ISO")")

GITSCAN_PAYLOAD=$(extract_payload "$GITSCAN_RESPONSE")
GITSCAN_FILE="$WORK/gitscan-payload.json"
printf '%s' "$GITSCAN_PAYLOAD" > "$GITSCAN_FILE"

GITSCAN_CHECK=$(python3 - "$GITSCAN_FILE" <<'PY' 2>&1
import json, sys
with open(sys.argv[1]) as f:
    raw = f.read().strip()
if not raw:
    print("EMPTY_PAYLOAD")
    sys.exit(0)
try:
    env = json.loads(raw)
except json.JSONDecodeError as exc:
    print(f"PAYLOAD_NOT_JSON: {exc}")
    sys.exit(0)
result = env.get("result") or env
content = (result.get("content") or [])
if not content:
    print("OK_NO_CONTENT")
    sys.exit(0)
try:
    inner = json.loads(content[0]["text"])
except (KeyError, json.JSONDecodeError) as exc:
    print(f"INNER_NOT_JSON: {exc}")
    sys.exit(0)
matches = inner.get("matches", [])
if not matches:
    print("OK_NO_GIT_IN_WINDOW")
    sys.exit(0)
non_z = [m for m in matches if not m.get("timestamp", "").endswith("Z")]
if non_z:
    bad = non_z[0].get("timestamp")
    print(f"OFFSET_FORM_PRESENT: {len(non_z)}/{len(matches)} git events; first non-Z timestamp={bad}")
    sys.exit(0)
print(f"OK_ALL_GIT_CANONICAL: {len(matches)} git events all in Z-form")
PY
)

case "$GITSCAN_CHECK" in
  OK_ALL_GIT_CANONICAL*|OK_NO_GIT_IN_WINDOW|OK_NO_CONTENT|EMPTY_PAYLOAD)
    : # benign — either all canonical, or no git events to probe
    ;;
  OFFSET_FORM_PRESENT*)
    log_err "$GITSCAN_CHECK"
    log_err "raw response:"
    printf '%s\n' "$GITSCAN_RESPONSE" | sed 's/^/  /' >&2
    exit 1
    ;;
  *)
    log_err "git canonicalization check: $GITSCAN_CHECK"
    log_err "raw response:"
    printf '%s\n' "$GITSCAN_RESPONSE" | sed 's/^/  /' >&2
    exit 1
    ;;
esac

log_ok "OK: $URL"
log_ok "OK: tools/list contains search_memories"
log_ok "OK: tools/list contains get_recent_work_context"
log_ok "OK: tools/list 3 tools, each with outputSchema + readOnlyHint, source_app enum present, defaults advertised"
log_ok "OK: tools/call search_memories returned matches+limit_applied"
log_ok "OK: tools/call get_recent_work_context returned clusters+truncation"
log_ok "OK: $EDGE_CHECK"
log_ok "OK: $CROSS_CHECK"
log_ok "OK: $GITSCAN_CHECK"
exit 0
