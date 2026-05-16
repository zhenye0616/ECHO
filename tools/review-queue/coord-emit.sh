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
#   ECHO_MCP_URL        — optional; default http://127.0.0.1:${ECHO_MCP_PORT:-38478}/mcp
#   ECHO_MCP_PORT       — optional; default 38478
#
# Exit semantics (r1 codex-ops F2 HIGH best-effort):
#   ALWAYS exits 0 — daemon-down does NOT abort the queue tick. Curl's
#   non-zero rc is swallowed via `|| true`. Queue durability is preserved
#   when the daemon is unreachable. Callers MUST NOT branch on this
#   script's exit status.

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

url="${ECHO_MCP_URL:-http://127.0.0.1:${ECHO_MCP_PORT:-38478}/mcp}"

# Accept header MUST include both application/json AND text/event-stream
# — the StreamableHTTPServerTransport rejects requests lacking either
# format hint (its content-negotiation matrix is strict).
curl -sS \
  --connect-timeout 2 --max-time 5 \
  -H "X-Echo-Role: ${REVIEWER_NAME}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -X POST "$url" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"coord_emit\",\"arguments\":{\"event_type\":\"${event_type}\",\"schema_version\":1,\"emitted_at\":\"${emitted_at}\",\"subject_role\":\"${REVIEWER_NAME}\",${tier_key},\"payload\":${payload}}},\"id\":1}" \
  >/dev/null 2>&1 || true

exit 0
