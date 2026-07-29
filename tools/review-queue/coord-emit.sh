#!/usr/bin/env bash
# 057b AC7 — wrapper-side V1 coord event emitter.
#
# Standalone repo executable callable identically from:
#   - _run_reviewer.sh (Phase 1 scheduler_health / scheduler_health_done)
#   - reviewer skill steps run by `codex exec` / `claude -p` (Phase 2 tick_start / tick_end)
#   - skill post-push hooks (round-tier emissions after combined.md push)
#
# Why an executable, not a sourced bash function (r6 codex F1 HIGH):
#   the r5 in-shell-function design was unimplementable because:
#     (a) it was sourced by _run_reviewer.sh but tick_start/tick_end
#         emissions happen INSIDE the reviewer skill steps run by codex
#         exec / claude -p — a separate shell environment where the
#         parent's bash function is not visible;
#     (b) the JSON-RPC arguments were incomplete vs 057a's coord_emit
#         contract which requires top-level event_type, schema_version,
#         emitted_at, subject_role, exactly one tier key (correlation_id
#         OR tick_run_id), and optional payload.
#
# Usage:
#   coord-emit.sh <event_type> --correlation-id=<UUID> [--payload='{...}']
#   coord-emit.sh <event_type> --tick-run-id=<UUID>    [--payload='{...}']
#
# Env contract:
#   REVIEWER_NAME       — required; sent as X-Echo-Role; the 057a identity gate
#                         rejects emissions without a header.
#   ECHO_MCP_URL        — optional; overrides all port resolution.
#   ECHO_MCP_PORT       — optional; else bound_port from
#                         ~/.echo/state/onboarding.json (jq, best-effort),
#                         else package default 38478.
#
# Exit semantics (r1 codex-ops F2 HIGH best-effort):
#   ALWAYS exits 0 — daemon-down does NOT abort the queue tick. Curl's
#   non-zero rc is swallowed. Queue durability is preserved when the
#   daemon is unreachable. Callers MUST NOT branch on this script's
#   exit status.
#
# Stderr semantics (059 — silent-failure observability gap):
#   The wrapper distinguishes three daemon-response states on stderr while
#   keeping exit 0 in every branch. Advisory only; automation must continue
#   to ignore exit status and downstream tooling is unchanged.
#     success (HTTP 2xx + isError absent/false)
#       → silent (no stderr).
#     daemon rejection (HTTP 2xx + JSON-RPC result.isError === true)
#       → one stderr line: `coord-emit.sh: daemon rejected <event_type>:
#         <verbatim daemon error text, truncated to 500 chars + …[truncated]>`
#     daemon HTTP non-2xx
#       → one stderr line: `coord-emit.sh: daemon returned HTTP <status>:
#         <first 200 chars of body or <empty>>`
#     daemon unreachable (curl_rc != 0)
#       → ZERO bytes of stderr. Curl's own stderr is suppressed via
#         `2>/dev/null` on the curl invocation; no env flag, no opt-in
#         verbose mode. Locked by r1 codex-ops F1 + claude F1 convergent
#         AND r2 codex-ops F1 MED — the silent-on-unreachable contract
#         covers the ENTIRE stderr stream, not just the wrapper's own
#         `coord-emit.sh:` emissions.
#   The exit-0-unconditional invariant is reinforced: there is no
#   `--strict` flag, no `EXIT_ON_REJECT=1` env var, no exit-non-zero
#   branch (Out of Scope #1).

set -u

if [ "$#" -lt 1 ]; then
  echo "coord-emit.sh: event_type required" >&2
  exit 0
fi

event_type="$1"
shift

correlation_id=""
tick_run_id=""
payload="{}"

for arg in "$@"; do
  case "$arg" in
    --correlation-id=*) correlation_id="${arg#--correlation-id=}" ;;
    --tick-run-id=*)    tick_run_id="${arg#--tick-run-id=}"       ;;
    --payload=*)        payload="${arg#--payload=}"               ;;
    *)
      echo "coord-emit.sh: unknown arg '$arg' (ignored)" >&2
      ;;
  esac
done

# Exactly one tier key. Don't error-exit — log + continue with no atom
# (still exit 0 to preserve queue durability) when caller misroutes.
if [ -n "$correlation_id" ] && [ -n "$tick_run_id" ]; then
  echo "coord-emit.sh: both --correlation-id and --tick-run-id provided; skipping" >&2
  exit 0
fi
if [ -z "$correlation_id" ] && [ -z "$tick_run_id" ]; then
  echo "coord-emit.sh: missing tier key (--correlation-id or --tick-run-id required)" >&2
  exit 0
fi

if [ -z "${REVIEWER_NAME:-}" ]; then
  echo "coord-emit.sh: REVIEWER_NAME unset; skipping" >&2
  exit 0
fi

# Portable timestamp (r7 convergent HIGH — codex F1 + codex-ops F1):
# seconds precision via universally-supported BSD/GNU date format.
# BSD `date` on macOS launchd does NOT support `%N`; the prior `%S.%3N`
# rendered literal `.3NZ` and 057a's coord_emit validator rejected
# every atom (silently — curl `|| true` swallowed the failure). 057a
# canonicalizes emitted_at via `new Date(...).toISOString()` which
# pads seconds → ms server-side, so seconds-precision input is fine.
emitted_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ -n "$correlation_id" ]; then
  tier_key="\"correlation_id\": \"${correlation_id}\""
else
  tier_key="\"tick_run_id\": \"${tick_run_id}\""
fi

# URL resolution: ECHO_MCP_URL → ECHO_MCP_PORT → recorded bound_port
# (~/.echo/state/onboarding.json, via jq when available — best-effort,
# any failure falls through) → package default 38478 as last resort.
if [ -n "${ECHO_MCP_URL:-}" ]; then
  url="$ECHO_MCP_URL"
else
  port="${ECHO_MCP_PORT:-}"
  if [ -z "$port" ] && command -v jq >/dev/null 2>&1; then
    port="$(jq -r '.bound_port // empty' "$HOME/.echo/state/onboarding.json" 2>/dev/null || true)"
  fi
  url="http://127.0.0.1:${port:-38478}/mcp"
fi

# Accept header MUST include both application/json AND text/event-stream
# — the StreamableHTTPServerTransport rejects requests lacking either
# format hint (its content-negotiation matrix is strict).
#
# Capture body + HTTP status via `-w '\n%{http_code}'` so the body is
# everything except the trailing line and the status is the trailing
# line. Suppress curl's OWN stderr via `2>/dev/null` — without this,
# curl's native `(7) Connection refused` / `(28) Timed out` lines would
# leak into launchd logs on every daemon-down tick, defeating the
# silent-on-unreachable contract (r2 codex-ops F1 MED). The only stderr
# this wrapper emits in production comes from the three branches below.
response=$(curl -sS \
  --connect-timeout 2 --max-time 5 \
  -H "X-Echo-Role: ${REVIEWER_NAME}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -w '\n%{http_code}' \
  -X POST "$url" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"coord_emit\",\"arguments\":{\"event_type\":\"${event_type}\",\"schema_version\":1,\"emitted_at\":\"${emitted_at}\",\"subject_role\":\"${REVIEWER_NAME}\",${tier_key},\"payload\":${payload}}},\"id\":1}" \
  2>/dev/null) || curl_rc=$?
curl_rc="${curl_rc:-0}"

# Daemon unreachable — silent on stderr (locked V1 contract: r1
# codex-ops F1 + claude F1, r2 codex-ops F1 MED). curl's own stderr is
# already suppressed above; we emit nothing of our own here either.
if [ "$curl_rc" -ne 0 ]; then
  exit 0
fi

# Split body / status. `-w '\n%{http_code}'` appends a newline + status
# code after the response body, so the last line is the status and
# everything before is the body. BSD sed `'$d'` deletes the last line.
http_status=$(printf '%s' "$response" | tail -n1)
body=$(printf '%s' "$response" | sed '$d')

case "$http_status" in
  2*)
    # HTTP success — check for JSON-RPC isError flag. The daemon's
    # response body is single-line per the validator's contract; a
    # substring search is sufficient and avoids the jq dependency
    # (macOS launchd bash 3.2.57 + BSD toolchain only — see AC1
    # parsing-constraint clause).
    if printf '%s' "$body" | grep -q '"isError":true\|"isError": true'; then
      # Extract result.content[0].text. Single-pass awk match for
      # `"text":"…"`. The daemon emits content[0] as a single-string
      # object so there is exactly one such pattern in the body.
      text=$(printf '%s' "$body" | awk 'match($0, /"text":"[^"]*"/){print substr($0, RSTART+8, RLENGTH-9); exit}')
      # Unescape `\"` → `"` (single-pass, per AC1 parsing constraint).
      # If parsing produced nothing, fall through with an empty text —
      # the wrapper still emits the rejection line + event_type so
      # operators see SOME signal (not a body-dump per r1 claude F2).
      text=$(printf '%s' "$text" | sed 's/\\"/"/g' | tr '\n' ' ')
      # Truncate to 500 chars + …[truncated] marker. bash 3.2.57
      # supports ${var:offset:length}.
      if [ "${#text}" -gt 500 ]; then
        text="${text:0:500}…[truncated]"
      fi
      echo "coord-emit.sh: daemon rejected ${event_type}: ${text}" >&2
    fi
    # Success path (isError absent / false) is intentionally silent.
    ;;
  *)
    # HTTP non-2xx (4xx / 5xx, including wrong-transport like a stale
    # ECHO_MCP_URL hitting a non-MCP service). Print one stderr line
    # carrying the status + first 200 chars of body.
    body_head=$(printf '%s' "$body" | tr '\n' ' ')
    if [ -z "$body_head" ]; then
      body_head="<empty>"
    elif [ "${#body_head}" -gt 200 ]; then
      body_head="${body_head:0:200}"
    fi
    echo "coord-emit.sh: daemon returned HTTP ${http_status}: ${body_head}" >&2
    ;;
esac

exit 0
