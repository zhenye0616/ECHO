---
id: 2026-04-30-013-mcp-server-skeleton
title: MCP server skeleton (HTTP transport, stub tool)
status: ready
priority: HIGH
estimate: 1d
created: 2026-04-30
spec_refs:
  - wiki/entities/mcp-server.md
  - wiki/entities/local-daemon.md
blocked_by:
  - 2026-04-30-007-daemon-entry
  - 2026-04-30-008-sqlite-storage
acceptance:
  - "Uses `@modelcontextprotocol/sdk` (Anthropic-maintained official TS SDK)"
  - "MCP server boots with the daemon: registered in lifecycle, started after storage init, stopped before storage close"
  - "Transport: HTTP/SSE on a configurable port (default 38478, env `ECHO_MCP_PORT`)"
  - "Listens on `127.0.0.1` only (NOT `0.0.0.0`); local-machine access only"
  - "One stub tool registered: `echo_ping(message?: string)` returns `{ pong: true, received: <message>, ts: <iso> }`"
  - "Tool registration uses MCP SDK's tool-definition pattern with input schema (zod or JSON schema, whichever the SDK uses)"
  - "Daemon boot log includes `mcp_port` and `mcp_url` in the structured payload"
  - "Tests cover: server starts, stub tool reachable via raw HTTP request, server stops cleanly with daemon"
  - "Integration smoke: from inside the test, send an MCP `tools/list` request → assert `echo_ping` is listed; send `tools/call` for `echo_ping` → assert response matches expectation"
  - "`npm run test`, `npm run lint`, `npm run typecheck` clean"
files_to_modify:
  - src/mcp/server.ts
  - src/mcp/tools/echo-ping.ts
  - src/daemon/index.ts
  - package.json
  - tests/mcp/server.test.ts

claimed_by: "Mac.attlocal.net-zhenye"
claimed_at: "2026-04-30T22:30:00Z"
branch: "agent/013-mcp-server-skeleton"
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# MCP server skeleton (HTTP transport, stub tool)

## What

Stand up an MCP server inside the daemon process so AI clients (Cursor, Claude Code, others) can discover and call tools provided by ECHO. This item ships only the scaffold + one stub tool (`echo_ping`); the real retrieval tool (`search_memories`) is item 014.

```ts
// src/mcp/server.ts
export async function startMcpServer(
  storage: Storage,
  options: { port?: number },
): Promise<{ stop: () => Promise<void>; port: number; url: string }>;
```

Behavior:

- Uses `@modelcontextprotocol/sdk` (the Anthropic-maintained TypeScript SDK).
- HTTP/SSE transport on `127.0.0.1:<port>` (loopback only, never `0.0.0.0`).
- Default port `38478` (uncommon, env-overridable via `ECHO_MCP_PORT`).
- One stub tool registered: `echo_ping(message?)`. Returns a simple JSON object proving the wiring works.
- Lifecycle: daemon registers + starts the server after storage init; stops before storage close.

The `Storage` instance is dependency-injected (consistent with the pipeline, so item 014's real tool can use it).

## Why

The daemon now records data (Wave 2 + extractors). MCP is how AI clients ASK for it. Without the server, captured data is invisible to Cursor and Claude Code; nothing closes the loop.

This item is intentionally a skeleton so the architectural decisions land in isolation: transport (HTTP), binding (loopback), port (38478 default), SDK choice (Anthropic's official TS SDK), tool-registration pattern. Once these are in place, item 014's `search_memories` tool is just "register a second tool against the existing scaffold."

**Why HTTP/SSE instead of stdio:** standard MCP servers spawn as a child process per client (stdio transport). But ECHO's daemon is already long-lived and singleton. Spawning a separate ECHO process per Cursor/Claude Code client would conflict with the singleton model and complicate storage access. HTTP/SSE lets one daemon serve many clients on a stable URL. Modern Cursor and Claude Code support HTTP MCP servers via configuration.

**Why port 38478:** uncommon enough to avoid collisions; not in the IANA registered range; not commonly used by other dev tools. Env-overridable via `ECHO_MCP_PORT` for users who want to change it.

**Why loopback only:** local data, local clients, no need for network exposure. Reduces attack surface. If a user wants remote access (V2+), it'll be an explicit configuration with auth.

## Acceptance Criteria

- [ ] `package.json` declares `@modelcontextprotocol/sdk` in `dependencies` (runtime; pre-approved by drift-rule-3 sign-off in the strategist conversation)
- [ ] `src/mcp/server.ts` exports `startMcpServer(storage, options)`:
  - Creates an MCP `Server` instance using the SDK's pattern
  - Registers the `echo_ping` tool with input schema (use the SDK's preferred validation library)
  - Starts an HTTP/SSE listener on `127.0.0.1:<port>`; binds to ephemeral port if `port = 0`
  - Returns `{ stop, port, url }` where `url` is the form clients can use (e.g., `http://127.0.0.1:38478/mcp`)
  - On `stop()`, closes the HTTP server gracefully (drain + close), closes the MCP server
- [ ] `src/mcp/tools/echo-ping.ts`:
  - Tool name: `echo_ping`
  - Description: `"Connectivity check: returns pong with the received message and a timestamp."`
  - Input schema: `{ message?: string }`
  - Handler: returns `{ pong: true, received: <message>, ts: <iso-now> }`
- [ ] `src/daemon/index.ts` integration:
  - After storage init: `const mcp = await startMcpServer(storage, { port: parseInt(process.env.ECHO_MCP_PORT ?? '38478') });`
  - Before storage close (in shutdown): `await mcp.stop();`
  - Daemon's startup log payload extended with `mcp_port` and `mcp_url`
- [ ] Tests in `tests/mcp/server.test.ts`:
  - Boot the server with a `MemoryStorage` and `port: 0` (ephemeral)
  - Make a raw HTTP MCP request for `tools/list`; assert the response includes `echo_ping`
  - Make a `tools/call` request for `echo_ping` with `{ message: 'hello' }`; assert response is `{ pong: true, received: 'hello', ts: <ISO>}`
  - Call `stop()`; assert subsequent connection attempts fail (server gone)
  - Test framework: use Node's `fetch` for the HTTP request; or use the SDK's client if it has one (the agent picks based on the SDK's API surface)
- [ ] Daemon's existing lifecycle tests still pass
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` clean
- [ ] `npm install` succeeds (verify the SDK's deps install cleanly)

## Out of Scope (Don't Drift)

- **The `search_memories` tool** — separate item 014; this item ships the SCAFFOLD plus a stub
- **Resources** (the MCP resource type) — only tools for V1
- **Prompts** (the MCP prompts type) — V2+
- **Authentication** — loopback-only is the V1 boundary; auth is V2 once we have remote access
- **Stdio transport** — HTTP/SSE only for V1; stdio adds spawn-per-client complexity that conflicts with the singleton daemon
- **Multi-port / multi-instance** — single port, single instance per daemon
- **Logging captured-tool-call events to storage** (i.e., "ECHO logged that Cursor called search_memories at 14:23") — interesting V2 audit feature; out of scope here
- **Rate limiting / throttling per client** — V2+
- **TLS / HTTPS** — loopback-only, plaintext is fine
- **Cross-platform port-conflict resolution** — if `38478` is in use, fail-loud with a clear error; do NOT auto-pick a different port (the user needs a stable URL)
- **Real V1 documentation for users** ("how to add ECHO to Cursor's MCP config") — that's item 015; this item just establishes the URL is reachable
- **Adding any dependency beyond `@modelcontextprotocol/sdk`** — no Express, no Fastify, no separate HTTP framework; the SDK's transport handler is sufficient

## After Completion (Strategist Notes)

Once this item lands in `backlog/complete/`, the strategist's next task is to:

1. Update `wiki/entities/mcp-server.md` to reflect what's actually shipped:
   - HTTP/SSE transport on loopback
   - Default port 38478, override via `ECHO_MCP_PORT`
   - Daemon lifecycle integration
   - Tool registration pattern (so item 014's spec can reference it)
   - The stub `echo_ping` tool exists and serves as a connectivity test
2. Update `wiki/entities/local-daemon.md` to note the daemon now hosts an MCP server
3. Update manifest + index
4. (For 014's spec, when written) reference the `Storage` injection and tool-registration patterns established here
