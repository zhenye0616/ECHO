---
topic: Architecture
subtopic: System Architecture
aliases:
  - System Architecture
  - Minimum Component View
  - System Diagram
  - Architecture Diagram
---

# System Architecture (Minimum Component View)

The whole shape of ECHO at the level you'd describe to another founder in 30 seconds. Six components, three layers, one data shape, all on the user's Mac.

## Definition

ECHO is a local Node daemon that reads files apps already write, gates events through an allowlist, stores them in a single SQLite file, and serves retrieval over MCP to any AI client that asks. Capture surfaces fan in on the left; AI clients fan out on the right; everything in the middle is the durable substrate.

## The Diagram

```
═════════════════════════════════════════════════════════════════════════════
LAYER 1 ─ SOURCES (apps and files you already use; ECHO doesn't change them)
═════════════════════════════════════════════════════════════════════════════

   Cursor                    Claude Code               local git repos
   ~/Library/.../Cursor/     ~/.claude/projects/       ~/Desktop/.../.git/
   ├ globalStorage/          └ <project-slug>/         ├ refs/heads/*
   │  state.vscdb (SQLite)      └ <session-id>.jsonl   ├ HEAD
   └ workspaceStorage/             (append-only)       └ objects/, ...
        |                          |                        |
        ▼ chokidar fires            ▼                        ▼ chokidar fires
        on file change              same                     on ref change

═════════════════════════════════════════════════════════════════════════════
LAYER 2 ─ ECHO DAEMON (one local Node process; binds to 127.0.0.1 only)
═════════════════════════════════════════════════════════════════════════════

   ┌─────────────────────────────────────────────────────────────────────┐
   │                                                                     │
   │   CAPTURE                                                           │
   │   ┌──────────────────┐                                              │
   │   │ Surfaces         │   each surface produces CaptureEvents        │
   │   │  • fs-watcher    │   with shape:                                │
   │   │  • cursor-ext    │     { source, timestamp, content, metadata }│
   │   │  • cc-extractor  │                                              │
   │   │  • git-watcher   │                                              │
   │   └────────┬─────────┘                                              │
   │            │                                                        │
   │            ▼                                                        │
   │   ┌──────────────────┐         consults     ┌───────────────────┐  │
   │   │  Capture gate    │ ──────────────────▶  │  ALLOWLIST        │  │
   │   │  (chokepoint)    │                      │  src/capture/     │  │
   │   │  total function  │ ◀─────accept/reject──│  sources.ts       │  │
   │   └────────┬─────────┘                      │                   │  │
   │            │ accepted                       └───────────────────┘  │
   │            ▼                                                        │
   │   ┌──────────────────┐                                              │
   │   │  Storage         │   SQLite, append-only, single file:          │
   │   │                  │   ~/Library/Application Support/ECHO/echo.db │
   │   │  events table    │   indexed on (source, timestamp)             │
   │   │  + WAL mode      │                                              │
   │   └────────┬─────────┘                                              │
   │            │                                                        │
   │            │ storage.query(filter) when MCP tool fires              │
   │            ▼                                                        │
   │   ┌──────────────────┐                                              │
   │   │  MCP server      │   tools: echo_ping, search_memories          │
   │   │  HTTP @ loopback │   listens on 127.0.0.1:38478 only            │
   │   │  :38478          │   (cannot be reached from network)           │
   │   └────────┬─────────┘                                              │
   │            │                                                        │
   └────────────┼────────────────────────────────────────────────────────┘
                │
                │ MCP / HTTP-SSE
                ▼

═════════════════════════════════════════════════════════════════════════════
LAYER 3 ─ CONSUMERS (any MCP-speaking AI client; ECHO doesn't care which)
═════════════════════════════════════════════════════════════════════════════

   Cursor          Claude Code          Claude Desktop          Cline / ...
     │                 │                      │                       │
     └─────────────────┴──────────────────────┴───────────────────────┘
                              │
                              ▼  (each invokes search_memories
                                   when its AI decides to retrieve)
                       AI's response uses
                       returned events as
                       conversational context
```

## The Six Components

The minimum view names exactly six components in the data path. Anything else (logger, lifecycle scaffold, migration runner, capture pipeline seam) is supporting infrastructure that lives alongside the loop, not within it.

### 1. Sources

Local files written by apps the user already uses. ECHO does not write to them; it only reads. The current V1 sources are Cursor's SQLite database under `globalStorage/`, Cursor's per-workspace state under `workspaceStorage/`, Claude Code's session JSONL files under `~/.claude/projects/`, and the user's local git repos. Each source already exists on disk because the user is working — ECHO just rides along on what's already there. See [[ride-along-capture]] for the principle, [[capture-allowlist]] for the canonical list, and [[cursor-collected-data]] for the field-by-field record of what's actually read from each Cursor source (a sibling page for Claude Code is queued).

### 2. Capture surfaces

Components inside the daemon that observe sources and emit `CaptureEvent`s. Today there are four: a generic [[fs-watcher]] that produces raw file-event signals, a [[cursor-extractor]] that parses Cursor's SQLite into user/assistant turn pairs, a [[claude-code-extractor]] that tails Claude Code's JSONL into the same turn shape, and a [[git-capture|git-watcher]] that captures commits with their diffs. Each surface uses chokidar at the OS level; each produces events through the same envelope.

### 3. Allowlist

The single canonical declaration of what ECHO is permitted to observe. Lives at `src/capture/sources.ts` as the constant `CAPTURED_SOURCES`. Five categories: apps, domains, fs_paths, apis, git_repos. Any change requires a commit. The audit page renders this file's contents verbatim. See [[capture-allowlist]] and [[sandboxed-capture]].

### 4. Capture gate

The pure-function chokepoint through which every captured event must pass to be persisted. Reads the candidate's `source` field, parses the `<kind>:<id>` prefix, dispatches to the right `isAllowed*` predicate, returns `{ accepted: true | false, reason }`. One log line per call. Total function: every input returns a `GateResult`, never throws. See [[capture-gate]].

### 5. Storage

A single SQLite database file at `~/Library/Application Support/ECHO/echo.db`. Append-only by interface contract — no `update`, no `delete`, only `append`/`query`/`count`. WAL mode for concurrent reads during writes. Indexed on `source` and `timestamp` for the queries the MCP tool actually makes. See [[storage]].

### 6. MCP server

The single retrieval interface. HTTP/SSE on `127.0.0.1:38478` (loopback only — not reachable from network). Exposes tools registered with the `@modelcontextprotocol/sdk`. Today: `echo_ping` (connectivity check) and `search_memories` (the actual retrieval tool). Any MCP-speaking client (Cursor, Claude Code, Claude Desktop, Cline, Continue, custom scripts via curl) can call these. See [[mcp-server]] and [[mcp-search-memories]].

## The Data Shape

One envelope flows from every source into every consumer:

```ts
interface CaptureEvent {
  id:        EventId;        // assigned by Storage on append
  source:    string;         // <kind>:<id> — gate parses prefix
  timestamp: string;         // ISO 8601 UTC
  content:   string;         // primary text (embeddable, displayable, searchable)
  metadata?: Record<string, unknown>;  // source-specific extras
  embedding?: number[];      // populated later by embedding pipeline (V1.5+)
}
```

This uniformity is load-bearing. Adding a new source extends the diagram leftward without changing the middle. Adding a new consumer extends it rightward without changing the middle. The middle — gate + storage + MCP — is the durable substrate.

## Architectural Properties the Diagram Makes Visible

Reading the diagram top to bottom, the following properties are structural rather than aspirational:

- **Single chokepoint between sources and storage** ([[capture-gate]]). The security and audit story is concentrated, not diffused. "What does ECHO see?" has exactly one answer.
- **Single store for everything** ([[storage]]). Cross-source queries hit one indexed SQLite file. No federated retrieval, no race conditions across stores.
- **Single retrieval interface** ([[mcp-server]]). All consumers speak the same protocol; ECHO doesn't integrate with each AI tool individually. The tools that consume MCP servers do the work.
- **All on one Mac** ([[felt-not-seen]] reinforcement). No cloud. No network exposure (loopback-only binding). User data never leaves the device.
- **Composable in both directions.** New capture surfaces slot into the left without touching the middle. New AI clients slot into the right without touching the middle. The middle compounds value across all of them.
- **Append-only by interface contract** ([[append-only-ledger]]). Storage cannot rewrite history. The audit trail is structurally trustworthy, not promised-trustworthy.

## What the Minimum View Excludes

These exist in the codebase but aren't part of the data flow loop. They support the loop without being in it.

- **The logger** (`src/logging/index.ts`) — observability for every component; runs alongside, not in the data path.
- **The lifecycle scaffold** (`src/daemon/lifecycle.ts`) — boot/shutdown/PID-lock; operational, not data-bearing.
- **The migration runner** (`src/storage/migrate.ts`) — runs once at boot to bring the schema to the current version.
- **The capture pipeline function** (`src/capture/pipeline.ts`) — a thin seam between surfaces and gate; conceptually folded into "capture" in the diagram.

These don't exist yet but slot into the same shape later:

- **The audit page** (Layer 5 minimal) — a UI consumer adjacent to MCP; reads storage and renders the allowlist for trust.
- **The hotkey overlay** (Layer 3 Push) — a Swift shim that triggers MCP queries from anywhere via `⌘⇧E`, then types the assembled context into the focused app.
- **Future capture surfaces** — Swift Accessibility shim, browser extension wiring, GitHub/Slack API connectors. Each lands in the "Surfaces" box without changing anything downstream.

## The Property Worth Restating

Sources fan in. Consumers fan out. The middle is fixed. That fixed middle is what makes the brand promise — *"every AI smarter about you"* — structurally true rather than just stated. ECHO doesn't get smarter as you add tools because it learns more; it gets smarter because the substrate it sits underneath has more sources contributing to one shared store, retrievable by every AI client through one open protocol. The compound is in the topology, not the algorithm.

## Related

- [[v1-spec]] — the spec this architecture realizes
- [[capture-allowlist]] — what the gate permits
- [[capture-gate]] — runtime enforcer
- [[storage]] — the substrate's persistence layer
- [[mcp-server]] — retrieval interface
- [[sandboxed-capture]] — the principle the architecture enforces
- [[felt-not-seen]] — why the daemon is the only ECHO process and there's no destination app
- [[layer-above-saas]] — why composing on top of existing tools is structural, not stylistic
- [[append-only-ledger]] — the storage substrate's pattern (cross-references AIE wiki)
- [[interface-layers]] — how this architecture maps to the L1–L5 layer model
