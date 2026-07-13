---
id: 2026-07-13-135-local-echo-context-source-extraction
title: "Local standalone echo-context capture and retrieval source extraction and parity proof"
status: proposed
priority: HIGH
estimate: 5d
created: 2026-07-13
blocked_by: []
task_state_ref: 2026-07-13-135-local-echo-context-source-extraction
requested_reviewers: ["codex", "cursor"]
files_to_modify:
  - /Users/zhenye/Desktop/echo-context/**                       # NEW local-only context capture/retrieval repository; no remote
  - raw/internal/migrations/2026-07-13-135-echo-context.md     # NEW orchestrator-owned provenance, parity, and local-head record
spec_refs:
  - wiki/architecture/system-architecture.md                  # durable capture-middle-retrieval architecture
  - wiki/architecture/storage.md                              # current append-only storage and source contracts
  - wiki/architecture/capture-gate.md                         # capture allowlist/chokepoint behavior
  - wiki/surfaces/mcp-server.md                               # current retrieval surface and packaging boundary
  - backlog/complete/2026-04-30-004-capture-gate.md           # capture rejection contract
  - backlog/complete/2026-04-30-008-sqlite-storage.md         # storage implementation contract
  - backlog/complete/2026-05-09-030-mcp-toolkit-reshape-and-group-session.md # retrieval toolkit contract
  - backlog/complete/2026-05-11-038-mcp-toolkit-atomicity-refactor.md # split discovery/body retrieval semantics
  - backlog/complete/2026-06-18-104-granola-meeting-capture.md # Granola raw capture ownership seam
  - product/source-boundary.v1.json                           # product paths and derived product logic that context must exclude
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Local standalone echo-context capture and retrieval source extraction and parity proof

## Why this spec exists

The founder has named the cross-tool capture and retrieval platform `echo-context`. It owns source adapters, normalization, append-only storage, clustering/retrieval, permissions, and context APIs; it does not own the commercial meeting-to-decision workflow or agent-orchestration protocol. This item copies that closure from `Project_echo@2971310441b69735cbe759293abd8c4d044bf347` into a local `/Users/zhenye/Desktop/echo-context` repository and proves native capture/retrieval parity on synthetic data. `Project_echo` stays the migration source and backup. No target remote, live-state migration, daemon cutover, or authority transfer occurs.

### AC1 — Create one local echo-context Git repository with no remote

`/Users/zhenye/Desktop/echo-context/.git:1` exists on branch `migration/2026-07-13-135-local-echo-context-source-extraction`, records the pinned source SHA in its initial content commit, and has no configured remote. The target directory must be absent before start. No GitHub repository, tag, release, package publication, global installation, or live daemon change is permitted.

### AC2 — Give echo-context accurate capture/retrieval ownership

`/Users/zhenye/Desktop/echo-context/package.json:1` names private package/binary `echo-context`, owns exact runtime/dev dependencies including `@types/node`, and has no source-path dependency. `/Users/zhenye/Desktop/echo-context/src/:1` owns capture gates/pipeline, Cursor/Claude Code/Codex/Git and approved raw-source adapters, normalization, workspace/source identity, append-only storage/migrations, trace clustering, retrieval queries, permissions, health, and the context service/API. Product decision extraction, briefs/cards/approval, and agent backlog/review/coordination are forbidden.

### AC3 — Split retrieval MCP from loop coordination tools

`/Users/zhenye/Desktop/echo-context/src/api/mcp/:1` registers only context operations such as `echo_ping`, `search_memories`, `find_clusters`, `get_atom`, `get_atoms`, source resolution, and bounded waiting/recent-context compatibility. It must not register coordination emission/invocation, role-state reads, review dispatch, backlog mutation, decision confirmation, or product delivery. Tests compare the registered roster against an explicit context-only manifest.

### AC4 — Own isolated context state and migrations

`/Users/zhenye/Desktop/echo-context/src/state/paths.ts:1` resolves state under `ECHO_CONTEXT_HOME` with a local default distinct from echo-brain and echo-loop. `src/storage/:1` owns its SQLite schema/migrations, source matching, append order, checkpoints, request logs, and context health. It cannot read `Project_echo` or the live `~/.echo` database implicitly. Live database migration, copying, or mutation is forbidden; all parity tests use synthetic scratch state.

### AC5 — Resolve Granola overlap without product coupling

`/Users/zhenye/Desktop/echo-context/src/capture/granola/:1` may own raw Granola capture only when it remains a generic context source. Decision/rationale/action extraction, post-meeting briefs, intake classifiers, decision cards, human approval, and product health are excluded. `echo-brain` may independently copy a minimal Granola adapter; neither repository imports or synchronizes the other's source. The provenance manifest records this deliberate duplicate boundary.

### AC6 — Preserve capture, normalization, storage, and retrieval behavior

`/Users/zhenye/Desktop/echo-context/tests/:1` ports the owned current contracts and proves: allowlisted capture/rejection, normalization determinism, workspace/source identity, SQLite/memory conformance, migrations, append ordering, metadata filters, current-source matching, clustering, open-loop hints, search pagination, source/session resolution, newest-first body retrieval, response caps/truncation signals, wait semantics, and MCP stateless transport. Product and loop tests are absent.

### AC7 — Record provenance and prove source independence

`/Users/zhenye/Desktop/echo-context/provenance/source-extraction.v1.json:1` records all copied/relocated/rewritten files with source blobs and destination hashes. `tests/migration/source-independence.test.ts:1` rejects symlinks, submodules, absolute source paths outside provenance, imports escaping the repo, and dependencies on `echo-brain`, `echo-loop`, or `Project_echo`. Final verification uses a clean install and sanitized scratch home while the source checkout is inaccessible.

### AC8 — Prove local service parity and stop before cutover

`/Users/zhenye/Desktop/echo-context/tests/integration/context-service.test.ts:1` starts the native local service on an ephemeral port with synthetic events and proves ping, capture, search, cluster discovery, body fetch, and wait without network or live state. `/Users/zhenye/Desktop/Project_echo/raw/internal/migrations/2026-07-13-135-echo-context.md:1` records local head, commands/exit codes, test/closure/tool-roster counts, provenance hash, and `candidate_authority:false`, `remote_created:false`, `live_state_migrated:false`. The current daemon/MCP remains authoritative until a later founder checkpoint.

## Out of Scope (Don't Drift)

- Do not create/configure a remote, publish/install the package, or change the live daemon/MCP configuration.
- Do not read, copy, migrate, or mutate the live context database, checkpoints, credentials, or user configuration.
- Do not include echo-brain product runtime, signal extraction, cards/briefs/approval, Slack/Linear, or client delivery.
- Do not include echo-loop backlog, task-state, review queue, coord events, skills, or builder workflows.
- Do not add embeddings, new capture sources, new retrieval algorithms, or behavior changes.
- Do not modify/delete/freeze current Project_echo paths or touch sibling target directories.
- Do not use symlinks, source imports, submodules, or shared writable state across repositories.

## Risks

- **Server/tool registry entanglement:** retrieval and coord tools share the current MCP server. Mitigation: explicit context-only roster and tests rejecting loop tools.
- **Storage semantic drift:** shared storage currently serves context, coord, and product-derived atoms. Mitigation: port context contracts against synthetic fixtures and exclude coord/product tables/sources from the new service.
- **Live-state contamination:** a default path could open the founder database. Mitigation: distinct `ECHO_CONTEXT_HOME`, scratch-only tests, sanitized environment, and a hard no-live-migration gate.
- **Granola double ownership:** both product and context need input. Mitigation: raw capture only here, minimal product adapter there, provenance-recorded duplication, no source synchronization.

## Tests

- `/Users/zhenye/Desktop/echo-context/tests/capture/` — gate, pipeline, and owned source adapters.
- `/Users/zhenye/Desktop/echo-context/tests/normalize/` — deterministic normalization and identity.
- `/Users/zhenye/Desktop/echo-context/tests/storage/` — migrations, append order, matching, metadata, and backend conformance.
- `/Users/zhenye/Desktop/echo-context/tests/retrieval/` — clustering, search, pagination, caps, truncation, source resolution, and wait.
- `/Users/zhenye/Desktop/echo-context/tests/api/context-only-roster.test.ts` — retrieval tools present; loop/product tools absent.
- `/Users/zhenye/Desktop/echo-context/tests/integration/context-service.test.ts` — synthetic service end-to-end on ephemeral state/port.
- `/Users/zhenye/Desktop/echo-context/tests/migration/source-independence.test.ts` — no source/sibling dependencies or path escapes.
- Commands: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, context-only import/tool-roster checks, package/service smoke, and `git diff --check`.

## After Completion (Strategist Notes)

- Do not switch the active ECHO daemon/MCP or migrate live state yet.
- After local parity, propose an explicit state-migration, authority-transfer, and private-remote cutover with rollback.
- The eventual echo-brain integration must consume a versioned read-only context contract, never echo-context source or mutable database files.
