# ECHO ↔ Cursor + Claude Code (MCP integration)

ECHO ships a local MCP server. Once your daemon is running, point Cursor and Claude Code at it and they will be able to retrieve your captured ECHO memories — Cursor + Claude Code conversations, git commits — through the `search_memories` tool, mid-conversation, with no extra step from you.

This is the V1 "killer demo" surface: you ask Cursor or Claude Code a question, the AI invokes ECHO's MCP, ECHO returns context from your prior work, the AI answers with that context folded in.

> **Status (V1):** macOS only; loopback-only (no auth); two clients in the locked bundle (Cursor + Claude Code). Other clients and platforms are deferred.

## Prerequisites

1. ECHO daemon installed and running. From the repo root:
   ```bash
   npm install
   npm run daemon
   ```
   You should see a log line that looks like:
   ```json
   {"timestamp":"2026-05-01T12:00:00.000Z","level":"info","source":"mcp.server","message":"started","payload":{"port":38478,"url":"http://127.0.0.1:38478/mcp","host":"127.0.0.1"}}
   ```
   The MCP server is listening on `http://127.0.0.1:38478/mcp`.

2. (Optional) Override the port with `ECHO_MCP_PORT=<n> npm run daemon` if `38478` is taken. Use the same port in every step below.

3. Run the smoke test before configuring any client — it isolates "is ECHO up?" from "is my client config right?":
   ```bash
   ./tools/mcp-integration-smoke.sh
   ```
   Expect a sequence of `OK:` lines and exit `0` — including `OK: tools/list 4 tools` (item 026 added `tail_session`) and a final `OK: stale-session echo_ping recovery` line that proves the stateless transport from item 027 is in place. If it fails, see [Troubleshooting](#troubleshooting) below.

## Cursor setup

Cursor reads MCP server config from a JSON file. On macOS the canonical path is:

```
~/.cursor/mcp.json
```

Create the file (or merge into the existing `mcpServers` object) with:

```json
{
  "mcpServers": {
    "echo": {
      "url": "http://127.0.0.1:38478/mcp"
    }
  }
}
```

Then:

1. Restart Cursor (full quit, not just window close — Cursor only loads MCP config on launch).
2. Open Cursor's MCP panel (Settings → MCP, or via the command palette: "MCP: Show Servers"). Confirm `echo` appears in the list and shows three tools: `echo_ping` (connectivity check), `search_memories` (substring + filter retrieval over captured events), and `get_recent_work_context` (clustered recent-work trace).
3. If `echo` is greyed out or shows an error, check the message — it usually says "couldn't connect", which means the daemon isn't running on the configured port.

### Verify Cursor sees ECHO

In any chat with Cursor's agent, ask something whose answer benefits from your prior conversations or recent commits — e.g.:

> *"What were we discussing about pricing last week?"*

Watch for Cursor invoking the `search_memories` tool (Cursor surfaces tool calls in the chat UI). The reply should include context retrieved from ECHO, not just whatever Cursor inferred from the open file.

If Cursor *doesn't* invoke the tool: try a more pointed prompt:

> *"Search my ECHO memories for any prior discussion of pricing."*

Some Cursor models invoke MCP tools more readily than others; the tool description ("Search the user's captured ECHO memories…") should be enough for any agent-mode model to know when to use it.

## Claude Code setup

Claude Code's CLI ships with an `mcp` subcommand. To register ECHO as a user-scoped MCP server (available across all projects):

```bash
claude mcp add --transport http --scope user echo http://127.0.0.1:38478/mcp
```

To verify:

```bash
claude mcp list
```

You should see `echo` in the output with the URL above.

(If your version of Claude Code doesn't support `--transport http`, edit `~/.claude.json` directly and add the entry under `mcpServers` — same shape as the Cursor config above.)

### Verify Claude Code sees ECHO

Start a Claude Code session and ask the same kind of question:

> *"Look up my ECHO memories — what did we decide about the storage interface?"*

Claude Code should invoke `search_memories`, surface the matching events, and use them in its reply.

You can confirm the tool is registered without sending a query by asking Claude Code:

> *"List the MCP tools you have available."*

All four should appear with their descriptions:
- `echo_ping` — connectivity check; returns pong + a timestamp.
- `search_memories` — substring + filter retrieval over captured Cursor / Claude Code / Codex / git events.
- `get_recent_work_context` — clustered recent-work trace across the captured tools.
- `tail_session` — the cheap counterpart for known-source tail lookups: returns the N most-recent atoms for a single named source (or the most-recently-active session for a `source_app`) without clustering or substring filtering. Use this for "where did `<app>` leave off" instead of substring search; default `count=5`, max `20`, typical response `< 10k chars`. Composite cursor is shared with `search_memories` (a `next_cursor` from one is decodable by the other).

## `get_recent_work_context` response formats

The tool ships three response-format rungs ordered by envelope cost. The `format` parameter is opt-in; the default is `minimal`.

| `format` | When to use | What it keeps | What it drops | Typical envelope |
|---|---|---|---|---|
| `skeleton` | Low-budget context-pull. The "use ECHO to resume" / "where did I leave off" use case where the AI client needs ids + counts to plan a follow-up call but does not yet need atom bodies. | `id`, `time`, `source` (full `SourceRef`), `action.kind`, a head-clipped `action.summary` (≤200 chars of `action.input`), per-cluster `cluster_id` / `rank` / `label` / `atom_ids` (capped at 50 per cluster, head + tail) / `source_breakdown` / `time_range`, plus each `open_loop_hints` entry reduced to `{atom_id, resolved}` (capped at 30 per cluster). When per-cluster caps engage, sibling `atom_ids_omitted` / `open_loop_hints_omitted` integers and a `truncated: true` flag surface the dropped count (V1.5.7 Gap 4). | `artifacts[]`, `actors`, `provenance`, `context`, `conversation`, atom-level `open_loop_hints`, cluster `edges[]`, cluster `anchor_artifacts`, and the `text`/`kind`/`confidence` body of each open-loop-hint. | < 25k chars at `limit ≤ 100` on the realistic-density fixture (V1.5.7 Gap 4 closed the `limit=100` overflow at 53,413 chars). |
| `minimal` (default) | Default starting point. Caller wants atom heads + clipped action content but is willing to pay the full sub-collection bill. | Everything in the full response, with `action.input` and `action.output` clipped to 500 chars + a `[truncated; … chars omitted]` suffix. | Nothing else — `artifacts[]`, `actors`, `provenance`, cluster `edges[]`, and `open_loop_hints[].text` all pass through unbounded. | Fixture-shape dependent. Empty/synthetic atoms < 25k chars; realistic `claude_code` + `git` working-day shapes routinely exceed 25k and have crossed 80k in the wild (see dogfooding journal entries [15:05](../raw/internal/dogfooding/mcp-interactions-journal.md#L600), [15:14](../raw/internal/dogfooding/mcp-interactions-journal.md#L621), and [15:54](../raw/internal/dogfooding/mcp-interactions-journal.md#L631) PDT on 2026-05-08 — 72,283 / 76,593 / 84,188 chars on the same default-args path). |
| `full` | Debug / offline inspection. Verbatim atom envelopes for forensic work. Not for interactive AI-client paths. | Verbatim `RecentWorkContextResponse` — every atom field, every sub-collection, every cluster body. | Nothing. | Multiples of `minimal`. |

### When to pick `skeleton`

Pick `skeleton` whenever the caller is hydrating into a tight tool-result budget — most commonly:

1. **Resume-the-session calls.** "Use ECHO to resume" / "where did I leave off" / cross-session handoff. The AI client needs ids and a label to plan a follow-up; it does not need 20 atom bodies × 30 artifacts each. The 2026-05-08 15:14 PDT journal entry is the canonical failure-without-skeleton case.
2. **Cross-AI handoff routing.** One AI client is briefing another and only needs counts + cluster metadata, not atom content.
3. **Low-context-window models.** A consumer that can only afford ≤25k chars per tool result should default to skeleton and ask for hydration via `search_memories` if needed.

### When to pick `minimal`

Pick `minimal` when the caller needs the atom *head* — short summaries of what was said or done — but can tolerate the realistic-shape envelope cost. This is the default for backwards compatibility, but on `claude_code` + `git` heavy days the budget blow-through is real (the regression history above). If the call is on an interactive AI-client path with a tight tool-result budget, prefer `skeleton`.

### Auto-downgrade is intentionally NOT in the MCP server

The MCP server does not project response size and silently downgrade `minimal` → `skeleton`. The caller picks deterministically. This is a load-bearing decision: an AI client that asked for `minimal` and silently got `skeleton` (no atom bodies) would produce a wrong "where you left off" briefing without knowing why. Once the explicit-skeleton uptake pattern is observed in production, a future item may add an opt-in `format='auto'` ladder.

## Troubleshooting

### `mcp-smoke: cannot reach http://127.0.0.1:38478/mcp`

The daemon isn't running, or it bound to a different port.

```bash
# Is anything listening on 38478?
lsof -nP -iTCP:38478 -sTCP:LISTEN

# Start the daemon from the repo root
npm run daemon
```

If the port is occupied by something else, override:

```bash
ECHO_MCP_PORT=38500 npm run daemon
# then point your clients at http://127.0.0.1:38500/mcp
```

### Cursor says `mcp.json` is invalid

Cursor's parser is strict — common gotchas:

- Trailing comma after the last entry in `mcpServers`
- Comments (JSON, not JSON-with-comments)
- Single quotes instead of double quotes

Validate the file with:

```bash
python3 -m json.tool ~/.cursor/mcp.json
```

### Cursor / Claude Code shows the server but lists no tools

Restart the client. Some clients only call `tools/list` once at MCP-handshake time and cache the result — if the daemon was restarted after the client connected, the client may be holding a stale, empty list.

### Daemon restart used to break my client; does it still?

No. Item 027 switched ECHO's MCP HTTP endpoint to **stateless StreamableHTTP**: each POST to `/mcp` is handled by a fresh per-request `McpServer` + transport, the server emits no `Mcp-Session-Id` response header, and any `Mcp-Session-Id` the client sends is ignored. Restarting `npm run daemon` (or having `launchd` cycle the daemon) **should not require restarting Cursor / Claude Code / Codex** to recover. The previous failure mode — daemon restart wipes the in-memory session map → next client request hits the old session-id branch → server returns `400 Bad Request: no active session`, which Codex's RMCP client surfaces as `Deserialize error: data did not match any variant of untagged enum JsonRpcMessage` — is gone.

If a client still fails after a daemon restart, the next suspect is **client-side cached tool metadata** (some clients call `tools/list` only once per connection and hold the result), not server-side session loss. Recover by restarting the client; if that's a recurring annoyance, file a separate item — it's a client behavior, not a server bug.

### `GET /mcp` or `DELETE /mcp` returns 405

This is intentional. Stateless ECHO supports `POST /mcp` only; GET and DELETE return `405 Method Not Allowed` with `Allow: POST` and a JSON-RPC-style error body. Client tooling that probes `GET /mcp` for SSE streams or `DELETE /mcp` for session termination is targeting the stateful protocol path, which V1 does not implement (and does not need — ECHO's three tools are unary request/response).

### Tool gets called but `matches` array is empty

Empty array = ECHO has no events that match your filter. Two possibilities:

1. **Storage is empty.** The daemon captures Cursor + Claude Code conversations as they happen and backfills git commits on first start. Drive some conversation through Cursor or Claude Code, or commit something to a watched repo, then ask again.
2. **Filter is too narrow.** Try the same query without `source_prefix` / `since` / `until`. The tool defaults to "most recent 10 events, no filter" if you pass an empty argument set — that's the right starting point for "is anything coming back at all?"

You can confirm by checking storage directly via the smoke test:

```bash
./tools/mcp-integration-smoke.sh
```

The `matches+limit_applied` line confirms the tool is wired correctly even when the array is empty.

### MCP server doesn't appear in the client at all

- Confirm the JSON config file is in the right location for *your* client version (Cursor and Claude Code have moved their config files between releases).
- Confirm the URL ends with `/mcp` — the trailing path segment is required; a bare `http://127.0.0.1:38478` will fail.
- Confirm the daemon is bound to `127.0.0.1` (not `localhost` or `0.0.0.0`); ECHO defaults to `127.0.0.1` for security and Cursor / Claude Code resolve `127.0.0.1` directly.

### Anything else

ECHO logs JSON to stdout when it runs — re-launch with the daemon foreground and watch the logs while the client connects. The `mcp.server` source line gives you the bound port and URL; subsequent log lines tell you whether requests are landing.

## Example query that demonstrates value

Once you have a few days of conversations and commits in storage, this prompt is a reliable "wow" moment in either client:

> *"What were we discussing about pricing last week? Pull from my ECHO memories — I want context, not your training data."*

The right outcome: the AI invokes `search_memories`, surfaces 2–4 prior conversation turns where you wrestled with pricing, and answers in your own voice from your own thinking — not generic SaaS pricing advice.

If the result is generic, either ECHO has no relevant captures yet (talk through some pricing decisions in Cursor or Claude Code first) or the AI didn't invoke the tool (be more explicit: "search ECHO memories for…").
