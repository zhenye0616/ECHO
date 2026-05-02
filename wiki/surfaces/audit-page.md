---
status: planned
topic: Architecture
subtopic: Storage
aliases:
  - Audit Page
  - Inspector
---

# Audit Page

## Definition

The minimal Layer 5 surface. A local web page (served from the daemon) that lets the user inspect what ECHO knows, manage permissions, and forget memories. The only screen ECHO has, used a few minutes a month.

## What It Must Do (V1)

1. **Show memories with source attribution** — list of stored context fragments, each tagged with where it came from (Cursor session, GitHub PR, Slack thread, Claude conversation, timestamp)
2. **Per-memory delete** — one-click forget for any memory
3. **Per-source disconnect** — disable any connector (browser extension, MCP server, GitHub, Slack)
4. **Per-category permissions** — toggle what categories ECHO ingests (e.g., "ingest GitHub: yes, ingest Slack DMs: no")
5. **Export / wipe** — let users take their data or destroy it

## What It Must Not Do (V1)

- ❌ Be a destination users *use* daily (it's a settings menu, not a product surface)
- ❌ Have polished UI (functional > pretty for V1)
- ❌ Show advanced analytics (memory growth charts, etc. — defer to V2)
- ❌ Allow editing memories (only delete, in V1; editing is a trust complication)

## Why It Has to Exist Even Though Felt-Not-Seen Is the Goal

Pure invisibility kills trust for a memory product. The audit page is the *fuse box* — exists for control, almost never used in daily flow. See [[felt-not-seen]] refinement: *"felt by default, visible on demand."*

Without the audit page:
- Users can't verify what ECHO knows about them
- Users can't correct mistaken or sensitive memories
- Users can't manage who has access (which connectors are pulling from where)
- Trust collapses; the product becomes uninstallable

## Build Cost

~3 days of engineering. Functional. Ugly is fine. Plain HTML + minimal styling. Served from `localhost:port/audit` by the daemon.

## Future Evolution (V2+)

- Conversational forgetting: *"ECHO, forget anything you remember about Project X"* via the hotkey overlay
- Graph view of how memories connect
- Memory diff / change-over-time view (*"you used to think X, now you think Y — when did that change?"*)

These are V2 — they require the conversational layer ([[interface-layers|Layer 4]]) which isn't in V1.

## Related

- [[felt-not-seen]]
- [[local-daemon]]
- [[interface-layers]]
- [[narrowest-v1-scope]]
