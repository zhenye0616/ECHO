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
   Expect three `OK:` lines and exit `0`. If it fails, see [Troubleshooting](#troubleshooting) below.

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
2. Open Cursor's MCP panel (Settings → MCP, or via the command palette: "MCP: Show Servers"). Confirm `echo` appears in the list and shows two tools: `echo_ping` and `search_memories`.
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

`search_memories` should appear with its description.

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
