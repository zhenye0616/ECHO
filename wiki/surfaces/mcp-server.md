---
status: shipped
topic: Form Factor
subtopic: MCP Server
aliases:
  - MCP Server
  - Model Context Protocol Server
---

# MCP Server

## Definition

A local Model Context Protocol server hosted by the [[local-daemon|ECHO daemon]]. It exposes ECHO's [[storage]] to MCP-compliant AI clients (Cursor, Claude Code, Claude Desktop, Goose) over Streamable HTTP/SSE on `127.0.0.1:38478` — loopback only, DNS-rebinding-protected, never reachable from the network. Implementation lives at `src/mcp/server.ts` behind the entry point `startMcpServer(storage, options)`.

## Role in V1

This is the **Pull mechanism** in [[clipboard-and-launch]]:

| Mechanism | Triggered by | Delivery |
|---|---|---|
| Push (clipboard + launch) | User hotkey | Clipboard write + open target app |
| **Pull (MCP tool call)** | **AI tool needs context** | **MCP server returns relevant fragments** |

When the user is mid-conversation in Cursor or Claude Code, the AI tool can call ECHO's MCP server to retrieve relevant context — without the user explicitly asking. The user's experience: the AI is just smarter, with no extra step required.

## Why MCP Specifically

Three reasons:

1. **It's becoming the standard.** As of 2026, MCP adoption is accelerating across AI clients. By shipping an MCP server, ECHO works in every MCP-compliant tool with no per-tool engineering.
2. **No permission battle.** The AI client comes to ECHO. ECHO doesn't need accessibility permissions to read into Cursor — Cursor authenticates *to* ECHO and pulls.
3. **Innovator's dilemma defense.** Foundation model providers (Anthropic, OpenAI) are themselves pushing MCP. A local MCP server they connect *to* is the structural position they can't fight without breaking their own protocol commitment.

## Transport, Binding, Port

- **Transport:** Streamable HTTP/SSE via `@modelcontextprotocol/sdk`'s `StreamableHTTPServerTransport`. Stdio is deliberately unused — the daemon is already a long-lived singleton, so spawn-per-client doesn't fit.
- **Host:** `127.0.0.1` only. Never `0.0.0.0`. The transport additionally enables `enableDnsRebindingProtection` with `allowedHosts: ['127.0.0.1:<port>', 'localhost:<port>']`, so a malicious page can't trick a browser into hitting the daemon.
- **Port:** default `38478`. Override via env `ECHO_MCP_PORT`. Setting `ECHO_MCP_PORT=0` lets the kernel pick a free port (used by tests for parallel safety).
- **URL:** `http://<host>:<port>/mcp`. This is what AI client config files point at.

## Tools Currently Registered

Three tools are registered on every session at session creation:

| Tool | Purpose |
|---|---|
| [[mcp-search-memories\|`search_memories`]] | Retrieval over captured events — the V1 raw-event search tool |
| [[mcp-recent-work-context\|`get_recent_work_context`]] | V1.5 clustered context: atoms joined by shared artifact identity into coherent work threads |
| `echo_ping` | Connectivity check; returns `{ pong: true, received, ts }` |

`echo_ping` exists as a wiring smoke test for users adding ECHO to a new MCP client. `search_memories` closes the V1 killer-demo loop (raw substring + source-prefix + time-range search). `get_recent_work_context` closes the V1.5 magic gap — instead of returning a flat event list, it returns clusters of related atoms joined automatically by what the user has been touching.

## Tool Registration Pattern

Tools register against an `McpServer` instance using zod input schemas. As of item 025, every tool also advertises an `outputSchema`, returns `structuredContent` alongside the text content, and carries a `readOnlyHint: true` annotation:

```ts
server.registerTool(
  'search_memories',
  {
    description,
    inputSchema:  { query: z.string().optional(), source_app: z.enum([...]).optional(), /* ... */ },
    outputSchema: { matches: z.array(...), total_returned: z.number(), next_cursor: z.string().nullable(), /* ... */ },
    annotations:  { readOnlyHint: true },
  },
  async (input) => {
    const result = await runHandler(input);
    return {
      content:          [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
);
```

The `content` text field stays for compat with clients that only read text content (Cursor's MCP client today). `structuredContent` lets newer clients (Claude Code, future Cursor versions) render the result as structured tool output without re-parsing JSON-as-text. SDK 1.29.0 advertises capabilities for both `2024-11-05` and `2025-06` MCP protocol versions; `structuredContent` is supported in both — no protocol-version pinning required.

**Schema scoping decision (item 025).** Small response shapes (`echo_ping`, `search_memories`) are mirrored exactly. The deeply nested cluster/atom/edge bodies inside `get_recent_work_context` use permissive `z.record(z.string(), z.unknown())` / `z.array(z.unknown())` because their internal contract is still moving (items 016–022 reshape them on most weeks); top-level keys (`schema_version: z.literal(1)`, `tool: z.literal('get_recent_work_context')`, `query`, `clusters`, `atoms`, `truncation`, `warnings`) are exact. An exact-everywhere schema would reject every real response at validation time the next week trace internals shift.

**`readOnlyHint: true` on all three.** All current tools are pure-read (no `storage.append` calls). The hint lets MCP clients render and route them as safe-by-default. Codex's 2026-05-08 13:25 PDT review settled the question of whether `echo_ping` should instead be reclassified as an MCP resource: stay a tool. Resources are application-controlled; tools are model-controlled. A model-invoked health check is a tool.

The [[storage|`Storage`]] instance is passed into the tool's `register*` function at session-creation time, so handlers can `await storage.query(...)` without a global. This is the dependency-injection seam that lets tests run with `MemoryStorage` and production runs with `SqliteStorage`.

## Sessions

Each MCP client session gets its own `(McpServer, StreamableHTTPServerTransport)` pair. Sessions are tracked in a `Map<sessionId, Session>` keyed on the `mcp-session-id` header that the SDK assigns on the initialize call:

- Initialize request → spin up a new session, register tools, store under the SDK-generated session ID.
- Subsequent requests with `mcp-session-id` → routed to the matching session.
- `onsessionclosed` from the transport → `session.mcp.close()` and drop from the map.

Multiple clients = multiple sessions, each with isolated state. Bodies are pre-parsed in the HTTP listener with a 4 MB cap (413 on overflow).

## Lifecycle Integration

The server is wired into the daemon (`src/daemon/index.ts`):

1. Boot order: PID lock → fs-watcher → git-watcher → MCP server (`startMcpServer`) → lifecycle.
2. The daemon's `started` log payload carries `mcp_port` and `mcp_url` (passed through `LifecycleOptions.extraPayload`); the `mcp.server started` log line additionally carries `host`, `port`, `url`.
3. Shutdown order (`onShutdown` chain): `mcp.stop()` → `gitWatcher.stop()` → `fsWatcher.stop()` → `dispose()` (closes storage). MCP shuts down first so in-flight tool calls don't see storage disappear under them.

`mcp.stop()` closes the HTTP listener (with `closeAllConnections`), then closes every active session's `McpServer`.

## V1 Targets

- **Cursor** — primary; user lives here
- **Claude Code** — secondary; CLI/terminal AI workflows
- **Claude Desktop** — tertiary; for users who use Claude outside the browser
- **Goose / future MCP clients** — auto-included by virtue of standard MCP support

Each of these speaks the Streamable HTTP transport ECHO ships.

## What it does NOT do

- **No authentication.** Loopback-only is the V1 boundary. Auth lands when remote access (V2+) is allowed.
- **No TLS.** Plaintext is fine over loopback.
- **No stdio transport.** HTTP/SSE only.
- **No multi-port / multi-instance.** One port, one daemon, one server.
- **No tool-call audit logging back into storage.** "ECHO logged that Cursor called `search_memories`" is a V2 audit feature.
- **No rate limiting per client.** V2+.
- **No port-conflict auto-resolution.** If `38478` is taken and `ECHO_MCP_PORT` isn't overridden, the daemon fails loudly — clients need a stable URL.

## Risk to Watch

If MCP adoption stalls (low probability but non-zero), the desktop-AI ingestion strategy weakens. Mitigation: per-app accessibility integration as Tier 3 fallback (more engineering, but functional).

## Related

- [[mcp-search-memories]] — the V1 raw-event retrieval tool
- [[mcp-recent-work-context]] — the V1.5 clustered-context tool
- [[work-trace]] — the layer that powers `get_recent_work_context`
- [[normalization]] — the layer that produces the atoms consumers see
- [[storage]] — the substrate this server queries
- [[local-daemon]] — the host process
- [[clipboard-and-launch]] — the broader Push/Pull frame
- [[bundle-decision]] — why Cursor + Claude Code are the V1 targets
