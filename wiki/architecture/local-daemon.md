---
status: shipped
topic: Architecture
subtopic: Storage
aliases:
  - Local Daemon
  - ECHO Daemon
---

# Local Daemon

## Definition

A local Node.js process that owns capture, gating, persistence, and MCP-served retrieval. Boots once, runs continuously, binds only to `127.0.0.1`. Single-instance via PID lock at `~/Library/Application Support/ECHO/daemon.pid`. The wedge-independent foundation — every cohort and integration choice routes through the same substrate.

Entry: `src/daemon/index.ts`. Lifecycle scaffold: `src/daemon/lifecycle.ts`.

## Lifecycle

The daemon's lifetime is `boot → idle → SIGTERM/SIGINT → graceful shutdown`, orchestrated by `startLifecycle({ onShutdown })` in `src/daemon/lifecycle.ts`.

- **PID lock first.** `acquirePidLockOrExit(resolveDataDir())` runs before any subsystem starts. If a live process already owns the PID file, the new process writes a refusal line to stderr and exits 1. The lock is released in the shutdown hook.
- **Started log line.** Once the lock is held and storage is open, the lifecycle emits `daemon.lifecycle started` carrying `pid`, `version` (read from `package.json`), `storage_backend`, `data_dir`, `mcp_port`, and `mcp_url`.
- **Idle is event-loop kept alive** by a long-interval no-op timer; the daemon does no polling of its own — it waits for filesystem events and MCP requests.
- **Shutdown** runs the registered `onShutdown` hook (which stops every subsystem in reverse order), releases the PID lock, clears the keepalive interval, and logs `stopped`. SIGTERM and SIGINT are both wired.

## Data Directory

- Default: `~/Library/Application Support/ECHO/`. Override via `ECHO_DATA_DIR`.
- SQLite database at `<data_dir>/echo.db` unless `ECHO_DB_PATH` overrides it explicitly.
- PID file at `<data_dir>/daemon.pid`.

## Subsystems Started on Boot

After the wave-3 simplification (commit `238c530`), all subsystems start concurrently via a single `Promise.all`. The daemon does not proceed past startup until every one of them is ready:

- [[fs-watcher]] — generic filesystem signal source
- [[git-capture|git-watcher]] — commit + diff capture across allowlisted repos
- [[claude-code-extractor]] — tails Claude Code session JSONL into turn pairs
- [[codex-extractor]] — tails OpenAI Codex CLI session JSONL into turn pairs
- [[cursor-extractor]] — parses Cursor's SQLite globalStorage/workspaceStorage into turn pairs
- [[mcp-server]] — HTTP/SSE retrieval interface

The shutdown hook stops them in the inverse order (`mcp → cursor → codex → claude-code → git → fs`) and then disposes the storage handle.

## Storage Backend

SQLite by default ([[storage|SqliteStorage]] at the resolved DB path). Setting `ECHO_STORAGE=memory` selects the in-memory backend, used in tests and smoke runs. The backend choice is logged on boot as `storage_backend`.

## MCP Server

The daemon hosts an MCP server on `127.0.0.1:38478` (loopback-only, never network-reachable). Override via `ECHO_MCP_PORT`; the special value `0` lets the kernel pick a free port (used in tests). The bound port and full URL are emitted in the `started` log line. See [[mcp-server]] and [[mcp-search-memories]].

## What the Daemon Does Not Do (Yet)

Honest status as of waves 1–3:

- **No native-app Accessibility capture.** The Swift shim that would observe non-file-backed apps is deferred to a later wave.
- **No browser-extension wiring.** The extension still ships standalone; unifying its feed into the daemon is a Wave 4 item.
- **No GitHub / Slack / email / calendar API connectors.** Sources beyond the four file-backed ones are not yet wired.
- **No hotkey overlay.** The system-wide `⌘⇧E` summon surface is Week 10 work.
- **No audit page UI.** The Layer 5 minimal trust surface is still pending; the data is queryable but not rendered.

## The Critical Engineering Bet

Where ECHO's IP lives is the silent middle — what gets retrieved and how it's composed at the moment of summon. A naive system pastes everything related into the prompt and overflows; the smart system picks the right N fragments out of thousands and produces a focused, relevant answer. The realized first version of that middle is now visible in [[mcp-search-memories]]; the bet that retrieval quality (not capture surface count) is where the product wins remains intact.

## Related

- [[mcp-server]]
- [[mcp-search-memories]]
- [[fs-watcher]]
- [[cursor-extractor]]
- [[claude-code-extractor]]
- [[git-capture]]
- [[storage]]
- [[capture-gate]]
- [[capture-pipeline]]
- [[interface-layers]]
- [[narrowest-v1-scope]]
