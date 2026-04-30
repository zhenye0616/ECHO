---
item: 2026-04-30-013-mcp-server-skeleton
agent: Mac.attlocal.net-zhenye
session: batch
date: 2026-04-30
---

# Run Log — 013 MCP server skeleton

## Run 1 (2026-04-30T22:30:00Z)

### Context

Iteration 2 of the batch session. Iteration 1 shipped 012 (git-capture).
Selector returned 013 next; both `blocked_by` (007 and 008) are in
`backlog/complete/`.

### What I implemented

- **`src/mcp/server.ts`:** `startMcpServer(storage, options)` returning
  `{ stop, port, url }`. Internally:
  - `Map<sessionId, Session>` where Session = `{ transport, mcp }`.
  - HTTP listener (Node `http.createServer`) bound to `127.0.0.1:<port>`
    (loopback only, never `0.0.0.0`).
  - Per-request: parse JSON body once; if no session header / no matching
    session AND the body is an initialize request, mint a new
    `StreamableHTTPServerTransport` (with `sessionIdGenerator: () =>
    randomUUID()`), wire a fresh `McpServer` with `registerEchoPing`,
    connect, handle the request, then stash the session keyed on the
    transport's generated ID. Subsequent requests with the matching
    `mcp-session-id` header reuse the existing transport.
  - `onsessionclosed` callback closes the McpServer and removes the
    session.
  - `stop()` calls `httpServer.close()` + `closeAllConnections()`, then
    iterates surviving sessions and calls `mcp.close()` on each.

- **`src/mcp/tools/echo-ping.ts`:** registers `echo_ping(message?: string)`
  via `McpServer.registerTool` with a zod raw shape; handler returns
  `{ content: [{ type: 'text', text: JSON.stringify({ pong, received, ts }) }] }`.

- **`src/daemon/index.ts`:** added `resolveMcpPort()` (env override
  `ECHO_MCP_PORT`, validated 0..65535, default 38478); registers MCP
  AFTER `startLifecycle` so SIGINT during MCP startup still triggers
  the lifecycle's existing graceful shutdown without leaking handles.
  `onShutdown` now async; awaits `mcp.stop()` before `sqliteStore.close()`.

- **`tests/mcp/server.test.ts`:** 7 tests using the SDK's `Client` +
  `StreamableHTTPClientTransport` to drive the server end-to-end.

### Files modified

| File | Lines |
|---|---|
| src/mcp/server.ts | +120 (new) |
| src/mcp/tools/echo-ping.ts | +25 (new) |
| tests/mcp/server.test.ts | +160 (new) |
| src/daemon/index.ts | +15 / -3 |
| package.json | +1 |
| package-lock.json | (regenerated) |

Branch: `agent/013-mcp-server-skeleton`
HEAD SHA: `0ddef08971732aaf7252b763eadf9e4125ae1118`

### Decisions made (not pre-specified)

1. **Stateful transport with per-session McpServer.** First attempt used
   stateless mode (`sessionIdGenerator: undefined`); the SDK's
   `StreamableHTTPServerTransport` rejects reuse across HTTP requests in
   stateless mode (line 138 of `webStandardStreamableHttp.js`). Per-request
   instantiation also breaks the Client's init→notification handshake
   because the fresh transport sees the notification before init. Switched
   to stateful with a session map keyed on SDK-minted session IDs.

2. **MCP starts after lifecycle.** Identical pattern to my 012 git-watcher
   reordering: lifecycle's `started` log emits first, then MCP starts. If
   SIGINT arrives during MCP boot, the existing `onShutdown` (with
   `if (mcp !== null) await mcp.stop()`) handles the partial-state safely.

3. **No lifecycle.ts modification.** Spec mentions "daemon's startup log
   payload extended with mcp_port and mcp_url". Since `lifecycle.ts` is
   not in `files_to_modify`, I emit those fields in `mcp.server`'s own
   `started` log line instead of merging into `daemon.lifecycle started`.
   Functionally equivalent for `tail -f` consumers; flagged in
   `agent_notes`.

4. **`zod` left as transitive dep.** Spec restricts new top-level deps to
   `@modelcontextprotocol/sdk` only. zod ships transitively; importing
   it directly works under the eslint/tsc config in this repo. Flagged in
   `agent_notes`.

5. **Body parsing in the listener.** The SDK example (with Express + body
   parser) passes `req.body` as the third arg to `handleRequest`. My
   server reads the request body once via `readJsonBody`, then routes:
   if there's no active session AND the body is an initialize request,
   create a session; otherwise look up the session by header. Without
   pre-parsing, the SDK can't `isInitializeRequest(body)`-test before
   spinning up a transport.

### Acceptance criteria status

- [x] `@modelcontextprotocol/sdk` declared in dependencies
- [x] `startMcpServer(storage, options)` returns `{ stop, port, url }`
- [x] Tool registration via `McpServer.registerTool` (SDK pattern); zod
      input schema
- [x] HTTP/SSE on `127.0.0.1:<port>`; ephemeral port via `port: 0`
- [x] `url` shape: `http://127.0.0.1:<port>/mcp`
- [x] Listens on 127.0.0.1 only (verified in test)
- [x] `echo_ping(message?)` tool returning `{ pong, received, ts }`
- [x] Daemon registers MCP on boot, calls stop() on shutdown
- [x] `mcp_port` + `mcp_url` in startup log payload (in
      `mcp.server started` line; see decision 3 above)
- [x] Default port 38478, override via `ECHO_MCP_PORT`
- [x] Tests cover boot, stub tool reachable, server stops cleanly
- [x] `tools/list` lists `echo_ping`; `tools/call` returns expected shape
- [x] `npm install` succeeds
- [x] `npm run test` clean (114/114, including all prior tests)
- [x] `npm run lint` clean
- [x] `npm run typecheck` clean
- [x] Daemon's existing lifecycle tests still pass

### Test results (final run)

```
 Test Files  9 passed (9)
      Tests  114 passed (114)
   Duration  7.88s
```

### Drift events caught

- Briefly considered modifying `src/daemon/lifecycle.ts` to merge
  `mcp_port`/`mcp_url` into the existing `started` payload — backed
  off because lifecycle.ts is outside `files_to_modify`. Recorded the
  alternative in `agent_notes` so the founder can decide.
- Briefly considered adding `zod` as an explicit top-level dep —
  declined per spec's "Adding any dependency beyond
  `@modelcontextprotocol/sdk`" prohibition. Used as transitive.

### Out-of-scope items observed but not implemented

Per spec "Out of Scope (Don't Drift)":
- `search_memories` tool (item 014), MCP resources, MCP prompts,
  authentication, stdio transport, multi-port/multi-instance,
  rate-limiting, TLS, auto port-conflict resolution, V1 user docs
  (item 015).
