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

- **Transport:** Stateless StreamableHTTP via `@modelcontextprotocol/sdk`'s `StreamableHTTPServerTransport`, configured with `sessionIdGenerator: undefined` and `enableJsonResponse: true` (item 027). Each unary tool call is independent — no `Mcp-Session-Id` is issued, none is required, none is rejected if a stale one is sent. This eliminates the post-daemon-restart failure mode where MCP clients (Codex CLI especially) cached a session ID across a restart and got `400 Bad Request: no active session` from the next call. Stdio is deliberately unused — the daemon is already a long-lived singleton, so spawn-per-client doesn't fit.
- **Host:** `127.0.0.1` only. Never `0.0.0.0`. The transport additionally enables `enableDnsRebindingProtection` with `allowedHosts: ['127.0.0.1:<port>', 'localhost:<port>']`, so a malicious page can't trick a browser into hitting the daemon.
- **Port:** default `38478`. Override via env `ECHO_MCP_PORT`. Setting `ECHO_MCP_PORT=0` lets the kernel pick a free port (used by tests for parallel safety).
- **URL:** `http://<host>:<port>/mcp`. This is what AI client config files point at.

## Tools Currently Registered

Eight tools are registered per request (stateless transport — no session ties). The toolkit migrated from V1.5's compound `get_recent_work_context` to V1.6's atomic decomposition (`find_clusters` + `get_atoms` + `get_atom`) plus the `wait_for_new_turns` group-session primitive; `get_recent_work_context` remains advertised for one dogfooding cycle before removal (item 031):

| Tool | Purpose | Cost class |
|---|---|---|
| [[mcp-search-memories\|`search_memories`]] | V1 raw-event substring/source-prefix/time-range search | medium |
| [[mcp-tail-session\|`tail_session`]] | V1.5.4 cheap exact-fetch — N most-recent atoms from a single named `source` (or auto-resolved by `source_app`) | cheap |
| [[mcp-find-clusters\|`find_clusters`]] | V1.6 discovery primitive — coherent work clusters as skeletons (`atom_ids[]`, source breakdown, ranks). Auto-expand triggers + strict-partition demotion shipped with item 032. | cheap |
| [[mcp-get-atoms\|`get_atoms`]] | V1.6 targeted body-fetch — atom bodies by ID list (≤50); deterministic prefix-drop on envelope overflow; `prefer='newest_first'` for resume calls (item 032) | medium |
| [[mcp-get-atom\|`get_atom`]] | V1.6.1 verbatim escape hatch (singular) — content verbatim + metadata projected + embedding excluded; recovery primitive for `truncations: ["content"]` responses (item 033) | high |
| [[mcp-wait-for-new-turns\|`wait_for_new_turns`]] | V1.6 group-session subscription — stateless long-poll on watched sources (max 120s timeout). Implements Goal A of the [[group-session]] pattern. | blocks |
| [[mcp-recent-work-context\|`get_recent_work_context`]] | V1.5 compound clustered context. **DEPRECATED** by item 030; removal scheduled in item 031 after ≥1 week of dogfooding confirms the new toolkit covers all resume patterns. | medium |
| `echo_ping` | Connectivity check; returns `{ pong: true, received, ts }` | trivial |

**The V1.6 atomic toolkit (`find_clusters` + `get_atoms` + `get_atom` + `wait_for_new_turns`)** replaces the compound `get_recent_work_context` with a discovery → body-fetch → verbatim-recovery → subscription chain. Consumers pay only for the bodies they hydrate; the discovery primitive stays under 10 kB even on full-day windows; resume calls after a multi-hour gap reliably surface prior work as `clusters[0]` (item 032's first-call reliability gate). The `truncations: string[]` trust signal (item 030) appears on every atom-bearing response — `[]` means verbatim; `["content"]` means the wire-shape cap fired and recovery via [[mcp-get-atom|`get_atom(id)`]] (item 033, shipped 2026-05-10) is warranted. `get_atom` closes Magic Moment M1-3 (long-turn elision recovery) end-to-end in-MCP — no shell, no JSONL fallback, no composer-id context. `tail_session` remains the cheap "last N turns from this source" primitive — orthogonal to the cluster-based chain.

`echo_ping` exists as a wiring smoke test for users adding ECHO to a new MCP client. `search_memories` closes the V1 killer-demo loop (raw substring + source-prefix + time-range search).

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

**`readOnlyHint: true` on all four.** All current tools are pure-read (no `storage.append` calls). The hint lets MCP clients render and route them as safe-by-default. Codex's 2026-05-08 13:25 PDT review settled the question of whether `echo_ping` should instead be reclassified as an MCP resource: stay a tool. Resources are application-controlled; tools are model-controlled. A model-invoked health check is a tool.

The [[storage|`Storage`]] instance is passed into the tool's `register*` function at session-creation time, so handlers can `await storage.query(...)` without a global. This is the dependency-injection seam that lets tests run with `MemoryStorage` and production runs with `SqliteStorage`.

## Stateless Per-Request Transport (item 027)

Every tool invocation is a self-contained HTTP request. The server creates a fresh `(McpServer, StreamableHTTPServerTransport)` pair, dispatches the request, and tears the pair down at end-of-request. There is no `Map<sessionId, Session>`, no `Mcp-Session-Id` header generation, no `onsessionclosed` handler — the SDK transport runs in JSON-response mode (`enableJsonResponse: true`) and per-request mode (`sessionIdGenerator: undefined`). A stale `Mcp-Session-Id` header from a client that survived a daemon restart is silently ignored.

Why this shape:
- ECHO's tools are all pure-read (`readOnlyHint: true`); no per-session state to retain across calls.
- The pre-027 stateful transport caused a known failure: a Codex CLI session that called ECHO at 20:12 UTC, then encountered a daemon restart at 20:22 UTC, retained its `Mcp-Session-Id` and got `400 Bad Request: no active session` from the next call. Stateless dispatch eliminates the failure mode without loss of capability.
- Bodies are pre-parsed in the HTTP listener with a 4 MB cap (413 on overflow).
- DNS-rebinding protection still applies per request.

Multiple clients = multiple concurrent requests; isolation is per-request rather than per-session, but the observable behavior to AI clients is identical for unary tool calls.

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

- [[mcp-search-memories]] — the V1 raw-event substring retrieval tool
- [[mcp-tail-session]] — the V1.5.4 cheap exact-fetch tool
- [[mcp-find-clusters]] — the V1.6 discovery primitive
- [[mcp-get-atoms]] — the V1.6 targeted body-fetch primitive
- [[mcp-get-atom]] — the V1.6.1 verbatim escape hatch (singular)
- [[mcp-wait-for-new-turns]] — the V1.6 group-session subscription primitive
- [[mcp-recent-work-context]] — the V1.5 clustered-context tool (deprecated by V1.6 atomic toolkit)
- [[group-session]] — the synchronized human-driven group pattern (Goal A)
- [[work-trace]] — the layer that powers `get_recent_work_context` and `find_clusters`
- [[normalization]] — the layer that produces the atoms consumers see
- [[storage]] — the substrate this server queries
- [[local-daemon]] — the host process
- [[clipboard-and-launch]] — the broader Push/Pull frame
- [[bundle-decision]] — why Cursor + Claude Code are the V1 targets
