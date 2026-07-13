---
id: 2026-07-13-135-local-echo-context-source-extraction
title: "Local standalone echo-context capture and retrieval source extraction and parity proof"
status: proposed
priority: HIGH
estimate: 5d
created: 2026-07-13
blocked_by: []
task_state_ref: 2026-07-13-135-local-echo-context-source-extraction
requested_reviewers: ["codex", "codex-ops"]
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

The extractor atomically acquires `/Users/zhenye/Desktop/.echo-context-extraction-135.lock`, writes `owner.json` with item ID, pinned source SHA, run ID, PID, and start time, and builds in same-filesystem `/Users/zhenye/Desktop/.echo-context-staging-<run-id>`. Durable `.echo-extraction.json` records phase (`materializing`, `building`, `verifying`, `committed`, `published`, or `failed`), failing command/exit code, and recovery command. Resume is allowed only for an explicitly named run whose item ID and source SHA match; unknown/mismatched locks, staging paths, or an existing `/Users/zhenye/Desktop/echo-context` are refused and never deleted or adopted. Tests inject interruption after lock acquisition, `git init`, initial commit, and verification.

Only after AC7 and AC8 verification passes is staging atomically renamed to `/Users/zhenye/Desktop/echo-context`. Its `.git:1` exists on branch `migration/2026-07-13-135-local-echo-context-source-extraction`, records source SHA `2971310441b69735cbe759293abd8c4d044bf347` in its initial content commit, is clean including untracked files, and has no configured remote. No GitHub repository, tag, release, package publication, global installation, or live daemon change is permitted.

### AC2 — Give echo-context accurate capture/retrieval ownership

`/Users/zhenye/Desktop/echo-context/package.json:1` names private package/binary `echo-context`, sets exact `engines.node:22.22.1` and `packageManager:npm@10.9.4`, owns exact runtime/dev dependencies including `@types/node`, and has no source-path dependency; committed `package-lock.json:1` is the sole clean-install lock. Before writes, the extractor resolves and records executable paths and hard-fails unless Node is `v22.22.1` and npm is `10.9.4`. `/Users/zhenye/Desktop/echo-context/src/:1` owns capture gates/pipeline, Cursor/Claude Code/Codex/Git and approved raw-source adapters, normalization, workspace/source identity, append-only storage/migrations, trace clustering, retrieval queries, permissions, health, and the context service/API. Product decision extraction, briefs/cards/approval, and agent backlog/review/coordination are forbidden.

### AC3 — Split retrieval MCP from loop coordination tools

`/Users/zhenye/Desktop/echo-context/src/api/mcp/context-tools.v1.json:1` pins exactly eight tool IDs in sorted order: `echo_ping`, `echo_resolve_mru`, `find_clusters`, `get_atom`, `get_atoms`, `get_recent_work_context`, `search_memories`, and `wait_for_new_turns`. The manifest stores the source-SHA request and response JSON Schemas, `readOnlyHint`, defaults, caps, and required structured-content envelope for each tool. `/Users/zhenye/Desktop/echo-context/src/api/mcp/:1` registers exactly those eight tools and zero others; tests compare count, IDs, and schemas against the pinned manifest. Coordination emission/invocation/status, role/task-state reads, review dispatch, backlog mutation, pending-decision/confirmation, and product delivery tools are forbidden.

### AC4 — Own isolated context state and migrations

`/Users/zhenye/Desktop/echo-context/src/state/paths.ts:1` resolves state under `ECHO_CONTEXT_HOME` with a local default distinct from echo-brain and echo-loop. `src/storage/:1` owns its SQLite schema/migrations, source matching, append order, checkpoints, request logs, and context health. It cannot read `Project_echo` or the live `~/.echo` database implicitly. Live database migration, copying, or mutation is forbidden; all parity tests use synthetic scratch state.

### AC5 — Resolve Granola overlap without product coupling

`/Users/zhenye/Desktop/echo-context/src/capture/granola/:1` may own raw Granola capture only when it remains a generic context source. Decision/rationale/action extraction, post-meeting briefs, intake classifiers, decision cards, human approval, and product health are excluded. `echo-brain` may independently copy a minimal Granola adapter; neither repository imports or synchronizes the other's source. The provenance manifest records this deliberate duplicate boundary.

### AC6 — Preserve capture, normalization, storage, and retrieval behavior

The pinned candidate inventory is the LF-sorted output of `git ls-tree -r --name-only 2971310441b69735cbe759293abd8c4d044bf347 -- src/capture src/normalize src/storage src/trace src/echo-home src/enrich src/logging src/mcp src/util tests/capture tests/normalize tests/storage tests/trace tests/echo-home tests/enrich tests/logging tests/mcp tests/util`: exactly 211 paths (109 source, 102 test/fixture) with SHA-256 `e1fde9ae3f2730572dfaec621dc6531665594696917d81b31b9d997d5fd08f62`. `/Users/zhenye/Desktop/echo-context/provenance/parity-matrix.v1.json:1` contains every inventory path exactly once with source blob, destination path, owned behavior assertion, and disposition `ported`, `rewritten`, or `excluded` plus rationale. It must explicitly exclude product enrichment (`decision-*`, Granola decision signals/intake, `post-meeting-brief`), loop coord/task-state tools/tests, pending decisions, and project-history installers; there are no silent omissions. A repository-owned checker regenerates the pinned inventory from commit objects, verifies count/hash and one-to-one dispositions, checks destination paths exist for non-exclusions, and makes AC8 record the same counts.

`/Users/zhenye/Desktop/echo-context/tests/:1` proves the owned rows' named assertions: allowlisted capture/rejection, normalization determinism, workspace/source identity, SQLite/memory conformance, migrations, append ordering, metadata filters, current-source matching, clustering, open-loop hints, search pagination, source/session resolution, newest-first body retrieval, response caps/truncation signals, wait semantics, and MCP stateless transport. Product and loop tests are absent.

### AC7 — Record provenance and prove source independence

`/Users/zhenye/Desktop/echo-context/provenance/source-extraction.v1.json:1` records all copied/relocated/rewritten files with source blobs, destination hashes, dispositions, and change rationales. Source bytes are read only with `git show 2971310441b69735cbe759293abd8c4d044bf347:<path>` or an equivalent commit-object archive, never from the dirty source worktree; a test deliberately dirties a source file and proves those bytes are excluded. `tests/migration/source-independence.test.ts:1` rejects symlinks, submodules, absolute source paths outside provenance, imports escaping the repo, child-process source access, and dependencies on `echo-brain`, `echo-loop`, or `Project_echo`.

`tools/verify-source-independence.sh:1` verifies `/usr/bin/sandbox-exec` denies a sentinel read, then runs the verification process and descendants under `(deny file-read* (subpath "/Users/zhenye/Desktop/Project_echo"))`; it never renames, chmods, unmounts, or otherwise mutates the source checkout. Under `env -i` with only resolved toolchain `PATH`, scratch `HOME`/`TMPDIR`/`ECHO_CONTEXT_HOME`, locale, and timezone, it runs with bounded timeouts: `npm ci --ignore-scripts=false --no-audit --no-fund`, `npm run typecheck`, `npm run lint`, `npm run check:parity`, `npm run check:context-tools`, `npm test`, and `npm run smoke:service`. Scoped isolation unavailable, readable source sentinel, dirty candidate, or undeclared output is a hard failure atomically recorded in `.echo-extraction.json`.

### AC8 — Prove local service parity and stop before cutover

`/Users/zhenye/Desktop/echo-context/tests/integration/context-service.test.ts:1` binds only `127.0.0.1` port `0` with synthetic events and scratch state, forbids external network while explicitly allowing loopback, and proves ping, capture, search, cluster discovery, body fetch, and wait. Startup, each request, and shutdown have bounded timeouts; `finally` closes clients, server, sockets, SQLite handles, child processes, and scratch directories, then asserts no child PID, listening socket, or locked scratch database remains. Exact command `npm run smoke:service` is noninteractive and returns non-zero on leak or timeout.

The migration record is written only to repository-relative `raw/internal/migrations/2026-07-13-135-echo-context.md` in the active orchestrator worktree, never to the canonical checkout by absolute path. It records run/staging IDs, resolved toolchain, every command/exit code, inventory/test/closure/tool-roster counts, provenance/parity hashes, final target path, clean local HEAD, `git status --porcelain=v1 --untracked-files=all`, and `candidate_authority:false`, `remote_created:false`, `live_state_migrated:false`. The candidate stays preserved and unchanged at that HEAD through independent review; review blocks if it is missing, dirty, at a different HEAD/hash, or has a remote. The current daemon/MCP remains authoritative until a later founder checkpoint.

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
- `/Users/zhenye/Desktop/echo-context/tests/migration/extraction-lifecycle.test.ts` — lock races, phase persistence, interruption/resume, foreign-target refusal, and atomic publication.
- `/Users/zhenye/Desktop/echo-context/tests/migration/parity-matrix.test.ts` — exact 211-path/count/hash baseline and one-to-one disposition coverage.
- `/Users/zhenye/Desktop/echo-context/tests/migration/committed-source-only.test.ts` — dirty source-worktree bytes cannot enter the extracted candidate.
- `/Users/zhenye/Desktop/echo-context/tests/migration/source-independence.test.ts` — no source/sibling dependencies or path escapes.
- Commands: `npm ci --ignore-scripts=false --no-audit --no-fund`, `npm run typecheck`, `npm run lint`, `npm run check:parity`, `npm run check:context-tools`, `npm test`, `npm run smoke:service`, `tools/verify-source-independence.sh`, and `git diff --check`; each has a named package script or repository-owned executable and non-zero failure contract.

## After Completion (Strategist Notes)

- Do not switch the active ECHO daemon/MCP or migrate live state yet.
- After local parity, propose an explicit state-migration, authority-transfer, and private-remote cutover with rollback.
- The eventual echo-brain integration must consume a versioned read-only context contract, never echo-context source or mutable database files.
