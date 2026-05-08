---
item: 2026-05-08-027-mcp-stateless-transport
agent: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405 (Claude Code, Opus 4.7 1M-ctx)
branch: agent/mcp-stateless-transport
head_sha: cbcf79e7ad6b16a5eca7d5f76588a4931f2e7dc5
worktree: ~/Desktop/Project_echo--mcp-stateless-transport
date: 2026-05-08
---

# Run 1 — 2026-05-08 (15:04 PDT / 22:04 UTC)

## Root-cause timeline (Codex daemon-restart failure)

| Time (UTC) | Event |
|---|---|
| 20:09:49 | Codex session initialized with `enabled_mcp_server_count=3` — Codex loaded ECHO at session start. |
| 20:12:03 | Codex `mcp.tools.call` for `search_memories` succeeded. |
| 20:12:47 | Codex `mcp.tools.call` for `get_recent_work_context` succeeded. |
| 20:22:11 | ECHO daemon restarted (`mcp.server started` with new pid 56649). Process-local `sessions` map wiped. |
| 20:22:20+ | Codex calls now fail with `JsonRpcMessage` deserialize error — first failure begins immediately after daemon restart. The wire reality: ECHO returned 400 `Bad Request: no active session` from its custom router, and Codex's RMCP client cannot parse a JSON-RPC error envelope coming back without a session-id reply, so it surfaces the response as an enum-deserialization failure. |
| Direct `curl` after restart | Fresh initialize + smoke pass (the server is live; only stale clients break). |
| Direct `curl` with `Mcp-Session-Id: stale-codex-session` after restart | Returns ECHO's custom 400 — exact reproduction of the Codex branch. |

The earlier diagnosis "Codex cannot parse ECHO's SSE response at all" was too broad. Codex parses normal ECHO responses fine pre-restart. The failure is **stale process-local state plus an unfriendly recovery response**.

## What I implemented (this attempt)

Switched ECHO's MCP HTTP server from process-local stateful `StreamableHTTPServerTransport` (with a `sessions` Map keyed on `Mcp-Session-Id`) to documented stateless mode.

For each `POST /mcp`:
- Construct a fresh `McpServer({ name: 'echo-daemon', version: '0.0.0' })`
- Register the same three tools (`echo_ping`, `search_memories`, `get_recent_work_context`) against the shared `Storage`
- Construct a `StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, enableDnsRebindingProtection: true, allowedHosts: ['127.0.0.1:<port>', 'localhost:<port>'] })`
- `await mcp.connect(transport)` then `await transport.handleRequest(req, res, body)`
- In `finally`, close the transport and the McpServer (no leaks across requests)

Other method handling: `GET /mcp` and `DELETE /mcp` — with or without `Mcp-Session-Id` — return `405 Method Not Allowed` with `Allow: POST` and a JSON-RPC-style error body. Pre-fix these would have hit the `no active session` branch and returned 400.

The 4 MiB body cap and the JSON-RPC `request body too large` 413 response are preserved unchanged. The `started`/`stopped` log lines remain identical (existing test `logs started with port + url + host` continues to pass without modification).

### Transport choice rationale

- **Stateless-StreamableHTTP-with-JSON-response** matches ECHO's three V1 tools exactly: all three are unary, fast, read-only. None need server-initiated messages, resumability, logging streams, or per-session state. The SDK explicitly documents this configuration as the supported "no session validation is performed" path (see `node_modules/@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.d.ts:30-57` and the corresponding source).
- A per-request `McpServer` is cheap enough for ECHO's loopback-only, low-volume traffic that we don't need a singleton-server pattern. The simpler "construct, connect, handleRequest, close" lifecycle removes the prior `sessions` Map plus its `onsessionclosed` cleanup callback entirely.
- Loopback DNS rebinding protection is preserved through the SDK's still-supported `enableDnsRebindingProtection` + `allowedHosts` options. Source inspection of `webStandardStreamableHttp.js` confirms host validation runs even when `sessionIdGenerator: undefined`. If the SDK ever drops these options as part of formalizing the deprecation, the same check can be lifted to the HTTP-router seam — this is called out in the spec's "Out of Scope" guidance, and the test `binds only to 127.0.0.1` provides a tripwire.

### Before / after wire comparison for a stale `Mcp-Session-Id`

**Before (stateful, post-daemon-restart):**

```
$ curl -i -X POST http://127.0.0.1:38478/mcp \
    -H 'Mcp-Session-Id: stale-codex-session' \
    -H 'Accept: application/json, text/event-stream' \
    -H 'Content-Type: application/json' \
    --data '{"jsonrpc":"2.0","id":42,"method":"tools/call","params":{"name":"echo_ping","arguments":{"message":"after-restart"}}}'

HTTP/1.1 400 Bad Request
content-type: application/json
{"jsonrpc":"2.0","error":{"code":-32000,"message":"Bad Request: no active session"}}
```
→ Codex's RMCP surfaces this as `Deserialize error: data did not match any variant of untagged enum JsonRpcMessage`.

**After (stateless, observed at PORT=39478 against the new code):**

```
$ curl -i -X POST http://127.0.0.1:39478/mcp \
    -H 'Mcp-Session-Id: stale-codex-session' \
    -H 'Accept: application/json, text/event-stream' \
    -H 'Content-Type: application/json' \
    --data '{"jsonrpc":"2.0","id":42,"method":"tools/call","params":{"name":"echo_ping","arguments":{"message":"after-restart"}}}'

HTTP/1.1 200 OK
content-type: application/json
content-length: 249

{"result":{"content":[{"type":"text","text":"{\"pong\":true,\"ts\":\"2026-05-08T22:09:35.187Z\",\"received\":\"after-restart\"}"}],"structuredContent":{"pong":true,"ts":"2026-05-08T22:09:35.187Z","received":"after-restart"}},"jsonrpc":"2.0","id":42}
```

No `mcp-session-id` response header. The stale session header is silently ignored. Codex's deserialize error class is structurally impossible because the request now succeeds with a normal JSON-RPC result envelope.

## Files modified

| File | +/− | Purpose |
|---|---|---|
| `src/mcp/server.ts` | +60 / −62 | Replaced `sessions` Map + per-session lifecycle with per-request McpServer + stateless transport. Added `methodNotAllowed()` helper for 405 responses. |
| `tests/mcp/server.test.ts` | +152 / −0 | 5 new regression tests (stale-session recovery, JSON response mode, GET/DELETE 405 with both empty and stale headers, advertised URL stability). |
| `tools/mcp-integration-smoke.sh` | +60 / −7 | Removed mandatory `Mcp-Session-Id` round-tripping; added optional-header forwarding via `SESSION_HDR` array (uses `${SESSION_HDR[@]+...}` for `set -u` safety with empty arrays); added section 9 stale-session live-recovery probe. |
| `docs/mcp-integration.md` | +6 / −1 + new troubleshooting subsections | Documented stateless behavior; daemon restart no longer requires client restart; GET/DELETE → 405 by design. |

## Acceptance criteria — status

| # | Criterion | Status |
|---|---|---|
| 1 | Root-cause regression test in `tests/mcp/server.test.ts` (stale session ID, no prior init, expect HTTP 200 + valid tool result) | ✅ — `tools/call echo_ping with a stale Mcp-Session-Id and no prior initialize succeeds (HTTP 200)` |
| 2 | Stateless StreamableHTTP in `src/mcp/server.ts` (no sessions Map, fresh McpServer per request, sessionIdGenerator: undefined, enableJsonResponse: true, no Mcp-Session-Id response header) | ✅ — verified by both unit test (`expect(resp.headers.get('mcp-session-id')).toBeNull()`) and live `curl -i` (no `mcp-session-id` line in any 200 response) |
| 3 | Loopback-only DNS rebinding protection preserved; advertised URL is `http://127.0.0.1:<port>/mcp` | ✅ — `enableDnsRebindingProtection: true` + `allowedHosts: ['127.0.0.1:port', 'localhost:port']` retained; `binds only to 127.0.0.1` and `advertised URL is http://127.0.0.1:<port>/mcp` tests pass |
| 4 | POST is the only supported method; GET/DELETE → 405 + `Allow: POST` + JSON-RPC-style error body | ✅ — `GET /mcp returns 405...` and `DELETE /mcp returns 405...` tests pass for both no-header and stale-header cases; live `curl` confirmed `Allow: POST` and the JSON-RPC error envelope |
| 5 | JSON response mode test: initialize with `Accept: application/json, text/event-stream` returns `content-type: application/json`, no `mcp-session-id`, valid initialize result; existing SDK client tests still pass | ✅ — `initialize over raw HTTP returns application/json and no Mcp-Session-Id header` test added; the 7 pre-existing SDK-client tests in this file all still pass unchanged |
| 6 | Smoke script supports stateless mode (no longer requires session header; treats returned header as optional) | ✅ — `SESSION_HDR=()` if no header is returned; otherwise `SESSION_HDR=(-H "Mcp-Session-Id: $SESSION")`; `${SESSION_HDR[@]+"${SESSION_HDR[@]}"}` everywhere downstream |
| 7 | Live recovery smoke (stale `Mcp-Session-Id` header → tool result after init) | ✅ — Section 9 of the smoke script: `tools/call echo_ping` with `Mcp-Session-Id: stale-codex-session`, asserts HTTP 200 and `pong:true`. Confirmed against a live daemon at `http://127.0.0.1:39478/mcp`. |
| 8 | `docs/mcp-integration.md` troubleshooting parity | ✅ — added "Daemon restart used to break my client; does it still?" and "GET /mcp or DELETE /mcp returns 405" subsections; updated "Run the smoke test" prerequisite to mention the new stale-session recovery line. |
| 9 | `npm test -- tests/mcp/server.test.ts`, full `npm test`, `npm run lint`, `npm run typecheck`, `./tools/mcp-integration-smoke.sh` against live daemon all pass | ✅ — see verbatim outputs below. |
| 10 | Run log appended with timeline + transport rationale + before/after wire examples | ✅ — this file. |

## Verbatim test output

### `npm test -- tests/mcp/server.test.ts`

```
> echo-daemon@0.0.0 test
> vitest run tests/mcp/server.test.ts


 RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--mcp-stateless-transport

 ✓ tests/mcp/server.test.ts (12 tests) 271ms

 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  15:06:10
   Duration  2.10s (transform 337ms, setup 0ms, collect 520ms, tests 271ms, environment 0ms, prepare 151ms)
```

### `npm test` (full suite)

```
 Test Files  31 passed | 1 skipped (32)
      Tests  494 passed | 21 skipped (515)
   Start at  15:07:57
   Duration  16.91s (transform 4.92s, setup 0ms, collect 11.78s, tests 42.98s, environment 8ms, prepare 6.11s)
```

### `npm run lint`

```
> echo-daemon@0.0.0 lint
> eslint . --max-warnings 0
```

(no output — clean exit)

### `npm run typecheck`

```
> echo-daemon@0.0.0 typecheck
> tsc --noEmit
```

(no output — clean exit)

### `ECHO_MCP_PORT=39478 ./tools/mcp-integration-smoke.sh` (against live daemon)

```
mcp-smoke: OK: http://127.0.0.1:39478/mcp
mcp-smoke: OK: tools/list contains search_memories
mcp-smoke: OK: tools/list contains get_recent_work_context
mcp-smoke: OK: tools/list 3 tools, each with outputSchema + readOnlyHint, source_app enum present, defaults advertised
mcp-smoke: OK: tools/call search_memories returned matches+limit_applied
mcp-smoke: OK: tools/call get_recent_work_context returned clusters+truncation
mcp-smoke: OK: OK_EDGE_CHECK: 1 cluster(s) with atom_ids>=5 passed
mcp-smoke: OK: OK_CROSS_GAP: widest cluster spans 23.3h (window_hours=24)
mcp-smoke: OK: OK_ALL_GIT_CANONICAL: 50 git events all in Z-form
mcp-smoke: OK: stale-session echo_ping recovery (item 027 stateless transport)
```

(Live daemon was started with `ECHO_DATA_DIR=/tmp/echo-027-data ECHO_MCP_PORT=39478 npm run daemon` to avoid colliding with the founder's primary daemon at PID 55275 / port 38478. Test daemon and its data dir cleaned up at end of run.)

### Manual wire-level verification (curl `-i` headers)

```
=== Initialize ===
HTTP/1.1 200 OK
content-type: application/json
content-length: 166
(no mcp-session-id header)

=== tools/call echo_ping with stale Mcp-Session-Id ===
HTTP/1.1 200 OK
content-type: application/json
content-length: 249
(no mcp-session-id header)

=== GET /mcp (with stale Mcp-Session-Id) ===
HTTP/1.1 405 Method Not Allowed
Allow: POST
content-type: application/json
{"jsonrpc":"2.0","error":{"code":-32000,"message":"Method Not Allowed: GET (POST only)"},"id":null}

=== DELETE /mcp ===
HTTP/1.1 405 Method Not Allowed
Allow: POST
content-type: application/json
{"jsonrpc":"2.0","error":{"code":-32000,"message":"Method Not Allowed: DELETE (POST only)"},"id":null}
```

## Decisions made during implementation

1. **Per-request McpServer (not a singleton McpServer reused across requests).** The SDK's stateless examples in `streamableHttp.d.ts` show both patterns. Per-request keeps the lifecycle symmetric (each request: construct → connect → handle → close) and matches the spec's direction "Create a fresh McpServer per POST". Loopback-only V1 traffic is low-volume, so the construction cost (registering 3 tools with their zod schemas) is acceptable. Reusing a singleton would require wiring `start()`/`stop()` lifecycle around the daemon, which is more code for no observable user benefit.

2. **`set -u` safe array expansion in the smoke script.** First sed pass produced `"${SESSION_HDR[@]}"`, which trips `set -u` on bash ≤4 with empty arrays. Switched to `${SESSION_HDR[@]+"${SESSION_HDR[@]}"}` (the standard `${var+...}` defined-but-may-be-empty form). Verified by running the smoke against the live daemon — passed.

3. **Did not stop / restart the founder's primary daemon at PID 55275 / port 38478.** Used a separate test daemon on `ECHO_MCP_PORT=39478` with an isolated `ECHO_DATA_DIR=/tmp/echo-027-data` so the founder's day-to-day MCP traffic was never interrupted. This is the conservative interpretation of "do not take destructive actions on shared/production state." The wire-level proof of the daemon-restart-recovery property (a stale `Mcp-Session-Id` header is ignored regardless of how it became stale) is structurally complete from a single-process test: the header is *always* ignored in stateless mode, so a daemon restart is mathematically equivalent to a fresh request with a stale header.

4. **`Mcp-Session-Id` header on the response.** Triple-checked via `curl -i` that the SDK does not emit one in stateless mode. Both unit test (`expect(resp.headers.get('mcp-session-id')).toBeNull()`) and live curl confirm.

## Open questions for founder

None — the spec was unambiguous on the transport configuration, the test set, and the smoke-script change shape. All acceptance criteria are met.

One forward-looking note (not a blocker): the SDK marks `enableDnsRebindingProtection` / `allowedHosts` / `allowedOrigins` as `@deprecated Use external middleware for host validation instead.` Current behavior is preserved and tested. If/when these are removed in a future SDK major, lifting the host check to the HTTP-router seam (one `req.headers.host` comparison before `methodNotAllowed`/`handlePost`) is the obvious follow-up. This belongs to a future item, not 027.

## Drift events caught

None. Every change is in service of an explicit acceptance criterion. The "Out of Scope (Don't Drift)" list (no new MCP tools, no `tail_session` or `format: 'skeleton'`, no storage/capture/trace/source-filter changes, no client-config edits) was honored. The dogfooding journal preamble flagged that 027 should not modify any client config files, and none were touched.

## Worktree + branch state at end of run

- Worktree: `~/Desktop/Project_echo--mcp-stateless-transport/`
- Branch: `agent/mcp-stateless-transport`
- HEAD: `cbcf79e7ad6b16a5eca7d5f76588a4931f2e7dc5`
- Pushed: `origin/agent/mcp-stateless-transport` set to track upstream
- PR URL: not opened (founder-merge model; no PR needed for a worktree-based pipeline)
