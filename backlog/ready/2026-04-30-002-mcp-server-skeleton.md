---
id: 2026-04-30-002-mcp-server-skeleton
title: MCP server skeleton
status: ready
priority: HIGH
estimate: 1d
created: 2026-04-30
spec_refs:
  - echo-wiki/entities/mcp-server.md
  - echo-wiki/sources/v1-spec.md
  - echo-wiki/concepts/clipboard-and-launch.md
acceptance:
  - MCP server starts on localhost (configurable port)
  - Implements MCP handshake and tool listing
  - Exposes stub `search_context(query, source_filter?)` tool — returns dummy data
  - Exposes stub `get_recent_activity(time_window, filter?)` tool — returns dummy data
  - Connects successfully from Cursor (manual integration test required)
  - Has automated tests for handshake, tool listing, and error responses
files_to_modify:
  - src/daemon/mcp/server.rs (or equivalent)
  - src/daemon/mcp/tools.rs
  - tests/mcp/*
  - docs/mcp-setup.md (how to register with Cursor / Claude Code / Claude Desktop)
agent_notes: ""
review_notes: ""
---

# MCP Server Skeleton

## What

Build the MCP server scaffold that AI clients (Cursor, Claude Code, Claude Desktop, Goose) connect to. The actual retrieval logic comes later; this item just establishes the protocol surface and tool stubs.

## Why

Layer 3 Pull mechanism requires this. See [[mcp-server]] for full spec and [[clipboard-and-launch]] for the Push/Pull distinction.

The MCP server is the inversion of "ECHO injects into apps" — instead, AI clients pull from ECHO. This is the structural defense against per-app integration battles. Ship the skeleton early so wiring tests can validate the integration model before real retrieval logic exists.

## Acceptance Criteria

- [ ] MCP server starts on localhost, configurable port (default 7421 or similar)
- [ ] Implements MCP protocol handshake correctly
- [ ] Implements tool listing — returns the two tools below
- [ ] Stub `search_context(query: string, source_filter?: string)` → returns `[{source, timestamp, content, score}]` with hardcoded dummy data
- [ ] Stub `get_recent_activity(time_window: string, filter?: string)` → returns hardcoded dummy data
- [ ] Error handling: malformed requests return proper MCP error responses
- [ ] Automated tests: handshake completes, tool listing returns correct schema, stubs return expected shape, error cases return errors
- [ ] Manual integration test: Cursor's `~/.cursor/mcp.json` configured to point at our server; Cursor lists our tools in its UI

## Constraints

- Server is read-only in V1 (per [[v1-spec]] non-goals: no autonomous agent action)
- Local-only (no cloud relay)
- Daemon spawns the server; not a separate process

## Out of Scope (Don't Drift)

- ❌ Actual retrieval logic (separate backlog item — composition engine)
- ❌ Embedding-based search (depends on embedding generation item)
- ❌ Write tools (no `add_memory`, no `update_X` — V1 is Pull-only for AI clients)
- ❌ Authentication beyond localhost (no remote MCP in V1)
- ❌ Streaming responses (V2)

## Definition of Done

Cursor can connect to our MCP server and list our tools in its UI. The stub tools return dummy data when called. Founder can verify by opening Cursor, checking the MCP tools panel, and seeing search_context + get_recent_activity listed and callable.
