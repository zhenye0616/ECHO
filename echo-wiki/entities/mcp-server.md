---
topic: Form Factor
subtopic: MCP Server
aliases:
  - MCP Server
  - Model Context Protocol Server
---

# MCP Server

## Definition

A local Model Context Protocol server hosted by the ECHO daemon. Exposes ECHO's unified context to MCP-compliant AI clients (Cursor, Claude Code, Claude Desktop, Goose) so those clients can pull context as tool calls during their normal operation.

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

## V1 Targets (in build order)

- **Cursor** — primary target; user lives here
- **Claude Code** — secondary; CLI/terminal AI workflows
- **Claude Desktop** — tertiary; for users who use Claude outside the browser
- **Goose / future MCP clients** — auto-included by virtue of standard support

## What ECHO Exposes via MCP

The exact MCP tool surface to be designed during weeks 4–5. Likely shape:

- `search_context(query, source_filter?)` — retrieve relevant fragments
- `get_recent_activity(time_window, filter?)` — surface what user has been working on
- `get_related(item_id)` — find connected fragments to a given anchor
- `summarize_topic(topic)` — return a synthesized briefing

Specifics get sharpened against actual Cursor/Claude Code usage in weeks 4–5.

## Risk to Watch

If MCP adoption stalls (low probability but non-zero), the desktop-AI ingestion strategy weakens. Mitigation: per-app accessibility integration as Tier 3 fallback (more engineering, but functional).

## Related

- [[clipboard-and-launch]]
- [[local-daemon]]
- [[ambient-form-factor]]
- [[bundle-decision]]
