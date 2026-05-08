---
id: 2026-05-08-027-mcp-stateless-transport
title: V1.5.4 MCP stateless transport — eliminate stale-session failures after daemon restart
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-05-08
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-08T22:30:00Z"
branch: "agent/mcp-stateless-transport"
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
spec_refs:
  - src/mcp/server.ts
  - tests/mcp/server.test.ts
  - tools/mcp-integration-smoke.sh
  - docs/mcp-integration.md
  - raw/internal/dogfooding/mcp-interactions-journal.md
blocked_by:
  - 2026-05-08-025-mcp-best-practices
acceptance:
  - "**Root-cause regression test: stale session after daemon restart.** Add a test in `tests/mcp/server.test.ts` that simulates Codex's observed failure path: call `tools/call` for `echo_ping` with an arbitrary stale `Mcp-Session-Id` header and no prior initialize request against the current server process. The request MUST succeed with HTTP 200 and a valid tool result. Pre-fix behavior is HTTP 400 with `{\"jsonrpc\":\"2.0\",\"error\":{\"code\":-32000,\"message\":\"Bad Request: no active session\"}}`, which Codex's RMCP client surfaces as `Deserialize error: data did not match any variant of untagged enum JsonRpcMessage` after daemon restart."
  - "**Switch ECHO MCP to stateless StreamableHTTP.** In `src/mcp/server.ts`, remove the process-local `sessions` map and per-session `McpServer` lifecycle. For each POST request, create a fresh `McpServer`, register the same three tools against the shared `storage`, connect it to a fresh `StreamableHTTPServerTransport` with `sessionIdGenerator: undefined` and `enableJsonResponse: true`, and delegate to `transport.handleRequest(req, res, body)`. Close the MCP server/transport when the request is finished. The server MUST NOT emit an `Mcp-Session-Id` response header."
  - "**Keep loopback-only DNS rebinding protection.** Preserve the current loopback host default and allowed-host behavior (`127.0.0.1:<port>` and `localhost:<port>`). If SDK stateless mode makes the current `enableDnsRebindingProtection` wiring awkward, implement the same check at the HTTP-router seam rather than dropping it. Add/keep a test that the advertised URL remains `http://127.0.0.1:<port>/mcp`."
  - "**Method handling becomes explicit and recovery-friendly.** `POST /mcp` is the only supported method. `GET /mcp` and `DELETE /mcp`, with or without `Mcp-Session-Id`, MUST return HTTP 405 with `Allow: POST` and a parseable JSON-RPC-style error body. Do not return the current generic 400 `no active session` body from ECHO's router."
  - "**JSON response mode is intentional.** Unary request/response tools (`echo_ping`, `search_memories`, `get_recent_work_context`) do not need SSE response streams or resumability today. Test that a raw HTTP initialize request with `Accept: application/json, text/event-stream` returns `content-type: application/json`, no `mcp-session-id`, and a valid initialize result. Existing SDK client tests must continue to pass."
  - "**Smoke script supports stateless mode.** Update `tools/mcp-integration-smoke.sh` so it no longer requires an `Mcp-Session-Id` header. It should still send `notifications/initialized`, but without a session header when none is returned. All subsequent `tools/list` and `tools/call` requests should work without a session header. Keep compatibility with a stateful response if the SDK/client behavior changes later by treating a returned session header as optional, not forbidden in the script."
  - "**Live recovery smoke.** Extend the smoke script or add a small server test that sends `tools/call echo_ping` with `Mcp-Session-Id: stale-codex-session` after initialize and proves the server still returns the tool result. This is the exact Codex-after-daemon-restart recovery case."
  - "**Docs parity.** Update `docs/mcp-integration.md` troubleshooting to say ECHO's MCP endpoint is stateless: restarting the daemon should not require restarting Codex/Cursor/Claude Code to clear stale MCP sessions. If a client still fails after this item, the next suspect is client-side cached tool metadata, not server-side session loss."
  - "**Tests overall:** `npm test -- tests/mcp/server.test.ts` passes; `./tools/mcp-integration-smoke.sh` passes against the live daemon after restart; `npm run lint` and `npm run typecheck` pass. Record any unrelated flaky-test exclusions in the run log."
  - "Run log appended to `raw/internal/agent-runs/<run-date>-2026-05-08-027-mcp-stateless-transport.md` with: the root-cause timeline (Codex success at 20:12 UTC, ECHO daemon restart at 20:22:11 UTC, Codex failures from 20:22:20 UTC onward), the transport choice rationale, and before/after wire examples for stale `Mcp-Session-Id`."
files_to_modify:
  - src/mcp/server.ts
  - tests/mcp/server.test.ts
  - tools/mcp-integration-smoke.sh
  - docs/mcp-integration.md
---

# V1.5.4 MCP stateless transport — eliminate stale-session failures after daemon restart

## What

Switch ECHO's MCP HTTP transport from process-local, stateful StreamableHTTP sessions to stateless request handling.

The root cause of the current Codex failure is not `search_memories`, payload size, source prefixes, or `echo_ping`. Codex can call ECHO successfully until the ECHO daemon restarts. After restart, Codex keeps using the old `Mcp-Session-Id`; ECHO's in-memory `sessions` map is empty in the new process; the custom router returns `400 Bad Request: no active session`; Codex's RMCP client reports that response as:

```text
Deserialize error: data did not match any variant of untagged enum JsonRpcMessage
```

ECHO's MCP tools are read-only, short-lived request/response tools. They do not need server-initiated messages, resumability, logging streams, or per-session state. Stateless transport removes the stale-session class instead of requiring every AI client to reconnect whenever launchd restarts the daemon.

## Evidence

Observed on 2026-05-08:

| Time (UTC) | Evidence | Meaning |
|---|---|---|
| 20:09:49 | Codex session initialized with `enabled_mcp_server_count=3` | Codex loaded ECHO tools at session start. |
| 20:12:03 and 20:12:47 | Codex `mcp.tools.call` for `search_memories` / `get_recent_work_context` closed without MCP error | Codex can parse ECHO's normal StreamableHTTP response path. |
| 20:22:11 | ECHO daemon log: `mcp.server started` with pid 56649 | Daemon restarted; process-local MCP sessions were lost. |
| 20:22:20 onward | Codex ECHO calls fail with `JsonRpcMessage` deserialize error | First failure appears immediately after daemon restart. |
| Direct curl after restart | Fresh initialize + smoke test pass | The server is live; fresh clients work. |
| Direct stale-header curl | `Mcp-Session-Id: stale-codex-session` returns ECHO's custom `400 no active session` | Reproduces the stale-session branch Codex hits after restart. |

The earlier hypothesis, "Codex cannot parse ECHO's SSE response at all," is too broad. Codex did parse normal ECHO calls before daemon restart. The failure is stale state plus an unfriendly recovery response.

## Implementation Direction

Use the SDK's documented stateless mode:

```ts
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
  enableJsonResponse: true,
  enableDnsRebindingProtection: true,
  allowedHosts: [`127.0.0.1:${boundPort}`, `localhost:${boundPort}`],
});
```

Create a fresh `McpServer` per POST, register `echo_ping`, `search_memories`, and `get_recent_work_context` against the shared `storage`, connect the server to the transport, and delegate the request. The existing storage object remains process-scoped; only the MCP protocol/session wrapper becomes request-scoped.

Why `enableJsonResponse: true`: ECHO's tools are unary and fast. JSON response mode avoids holding a short SSE stream open for every tool response and gives stricter clients less framing to parse. Keep the smoke parser tolerant of SSE because future SDK behavior or other MCP servers may still stream.

## Out of Scope (Don't Drift)

- Do NOT change tool semantics or schemas beyond what item 025 already owns.
- Do NOT add new MCP tools.
- Do NOT implement `tail_session`, `get_session_turns`, or `format: 'skeleton'` here.
- Do NOT change storage, capture, trace ranking, or source filtering.
- Do NOT add OAuth/auth. Loopback-only remains the V1 security model.
- Do NOT edit `~/.codex/config.toml`, `~/.claude.json`, or client config files. This item fixes the server so existing client config keeps working.
- Do NOT update wiki pages. Wiki promotion happens after merge.

If the agent discovers stateless mode cannot support a real current client, stop and move the item to `pending_review/` with the exact failing client/protocol transcript. Do not silently fall back to a more complex stateful session-recovery design.

## After Completion (Strategist Notes)

Wiki pages to update post-shipment:

- **Update: `wiki/surfaces/mcp-server.md`** after it exists from item 025's promotion: document that ECHO's V1 MCP endpoint is stateless StreamableHTTP over loopback, uses JSON responses for unary tool calls, and intentionally does not require clients to restart after daemon restarts.
- **Update: `wiki/architecture/interface-layers.md`** only if the shipped wiki page already discusses MCP transport behavior; otherwise skip.

Dogfooding follow-up:

- In a fresh Codex session, call `echo_ping`, restart the ECHO daemon, then call `echo_ping` again from the same Codex session. Expected: both calls succeed; no `JsonRpcMessage` deserialize error.
- Repeat one `search_memories` and one `get_recent_work_context` call after restart to verify the fix is not ping-specific.

## Acceptance Criteria

(see `acceptance:` field in frontmatter — the bullet list there is the enforceable contract).
