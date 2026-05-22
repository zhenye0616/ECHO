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

Eight tools are registered per request (stateless transport — no session ties). The toolkit migrated from V1.5's compound `get_recent_work_context` to V1.6's atomic decomposition (item 030: `find_clusters` + `get_atoms`), then to V1.6 RC2's full atomicity refactor (item 038: kill `tail_session`'s compound modes, add `echo_resolve_mru` resolver primitive, unbundle `wait_for_new_turns` bodies, DRY `exclude_metadata_surface`). `get_recent_work_context` survives as a thin re-export shim until the 2026-05-17 follow-up removes its MCP-tool registration.

| Tool | Purpose | Cost class |
|---|---|---|
| [[mcp-search-memories\|`search_memories`]] | V1 raw-event search — substring/source-prefix/time-range; **item 038 added `source` (exact-match) + `metadata_match` (allowed keys: `workspace_id`, `composer_id`, `session_id`, `repo_root`); item 037 added `repo_path`**. The descriptor returned by `echo_resolve_mru` spreads directly into this tool's parameters. | medium |
| [[mcp-echo-resolve-mru\|`echo_resolve_mru`]] | V1.6 RC2 MRU resolver — returns `search_memories`-ready descriptors `{source, filter, phase?}`; one descriptor per requested source-app or literal source; Cursor two-phase fallback (Phase 1 `metadata.repo_root`, Phase 2 legacy composer↔workspace registry; `phase: 'cursor_legacy'` encoded when Phase 2 fires); cross-project bleed structurally impossible. **Replaces `tail_session`'s compound modes (item 038).** | cheap |
| [[mcp-find-clusters\|`find_clusters`]] | V1.6 discovery primitive — coherent work clusters as skeletons (`atom_ids[]`, source breakdown, ranks). Auto-expand triggers + strict-partition demotion shipped with item 032; **item 037 added `repo_path` parameter**. Cluster engine factored out (item 038); now imports `src/mcp/internal/cluster-engine.ts` directly. | cheap |
| [[mcp-get-atoms\|`get_atoms`]] | V1.6 targeted body-fetch — atom bodies by ID list (≤50); deterministic prefix-drop on envelope overflow; `prefer='newest_first'` for resume calls (item 032). | medium |
| [[mcp-get-atom\|`get_atom`]] | V1.6.1 verbatim escape hatch (singular) — content verbatim + metadata projected + embedding excluded; recovery primitive for `truncations: ["content"]` responses (item 033). **Kept in 038** (Codex round-4 evidence — `get-atom.ts:139` is the only verbatim path; killing it would reopen the M1-3 recovery gap). | high |
| [[mcp-wait-for-new-turns\|`wait_for_new_turns`]] | V1.6 group-session subscription — stateless long-poll on watched sources (max 60s default; max 120s ceiling). **Item 038 changed contract: returns `turn_ids: string[]` only (no bodies). Callers compose `get_atoms(turn_ids)` or `get_atom(turn_ids[i])` for body fetch.** Item 037 added `repo_path`. Implements Goal A of the [[group-session]] pattern. | blocks |
| [[mcp-recent-work-context\|`get_recent_work_context`]] | V1.5 compound clustered context. **DEPRECATED by item 030; survives in 038 as a thin re-export shim** (cluster engine canonical home moved to `src/mcp/internal/cluster-engine.ts`; MCP-tool registration stays until the 2026-05-17 follow-up). Removal pending dogfooding-evidence-based founder consent receipt. | medium |
| `echo_ping` | Connectivity check; returns `{ pong: true, received, ts }`. | trivial |

**The post-038 atomic toolkit** is 8 tools, each with one purpose, composing cleanly per the [[atomic-primitives-compose]] principle. The canonical compose patterns:

- **Tail (cheap recency-only fetch):** `echo_resolve_mru({sources:['cursor'], repo_path:X})` → `search_memories({source: desc.source, ...desc.filter, limit:N})`.
- **Live-watch:** `echo_resolve_mru({sources:['claude_code'], repo_path:X})` → `wait_for_new_turns({sources:[desc.source], repo_path:desc.filter.repo_path, since:now})` (note: `wait_for_new_turns` ignores `metadata_match` — wait is for new turns, legacy Cursor atoms are out of scope).
- **Discovery + body-fetch:** `find_clusters({repo_path:X})` → `get_atoms({atom_ids: clusters[0].atom_ids, prefer:'newest_first'})`.
- **Verbatim recovery:** any `truncations: ["content"]` response → `get_atom(id)` for the verbatim body.

The `truncations: string[]` trust signal (item 030) appears on every atom-bearing response — `[]` means verbatim; `["content"]` means the wire-shape cap fired and recovery via `get_atom(id)` is warranted. `get_atom` closes Magic Moment M1-3 (long-turn elision recovery) end-to-end in-MCP — no shell, no JSONL fallback, no composer-id context.

`echo_ping` exists as a wiring smoke test for users adding ECHO to a new MCP client. `search_memories` closes the V1 killer-demo loop (raw substring + source-prefix + time-range + post-038 `source` exact + `metadata_match`).

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
3. Shutdown order (`onShutdown` chain): `mcp.stop()` → `flushRecentMcpCallLog(<dataDir>/mcp-shutdown.jsonl)` → `gitWatcher.stop()` → `fsWatcher.stop()` → `dispose()` (closes storage). MCP shuts down first so in-flight tool calls don't see storage disappear under them.

`mcp.stop()` closes the HTTP listener (with `closeAllConnections`), then closes every active session's `McpServer`. Immediately after, `flushRecentMcpCallLog` (item [[2026-05-21-067-mcp-request-log-shutdown-flush|067]]) walks the in-process request-log ring buffer and atomically (tmp-then-rename) writes a JSONL snapshot of all entries to `<dataDir>/mcp-shutdown.jsonl`, flipping any still-`pending` entry to status `killed_during_shutdown` so graceful-SIGTERM in-flight calls survive the restart as forensic evidence. Wrapped in try/catch so flush failures don't poison the rest of teardown. SIGKILL / OOM / panic remain an explicit accepted gap (the in-memory ring is lost); the next-boot operator-visible banner is split to sibling stub `2026-05-21-068-tail-mcp-shutdown-banner`.

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

- [[mcp-search-memories]] — V1 raw-event search; post-038 accepts `source` exact + `metadata_match` + `repo_path`
- [[mcp-echo-resolve-mru]] — V1.6 RC2 MRU resolver; replaces `tail_session` compound modes
- [[mcp-find-clusters]] — V1.6 discovery primitive
- [[mcp-get-atoms]] — V1.6 targeted body-fetch primitive
- [[mcp-get-atom]] — V1.6.1 verbatim escape hatch (singular)
- [[mcp-wait-for-new-turns]] — V1.6 group-session subscription; post-038 IDs-only contract
- [[mcp-recent-work-context]] — V1.5 clustered-context tool (deprecated; shim until 2026-05-17)
- [[atomic-primitives-compose]] — the principle the toolkit is built on
- [[work-artifact-first-class]] — the sibling principle (`repo_path` end-to-end)
- [[group-session]] — the synchronized human-driven group pattern (Goal A)
- [[work-trace]] — the layer that powers `get_recent_work_context` and `find_clusters`
- [[normalization]] — the layer that produces the atoms consumers see
- [[storage]] — the substrate this server queries
- [[local-daemon]] — the host process
- [[clipboard-and-launch]] — the broader Push/Pull frame
- [[bundle-decision]] — why Cursor + Claude Code are the V1 targets
