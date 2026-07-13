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
  - tools/repository-extraction/echo-context.mjs               # NEW orchestrator-owned start/resume/status/publish/handoff entrypoint
  - tools/repository-extraction/profiles/echo-context.sb.in    # NEW scoped source/write/network sandbox policy template
  - tests/repository-extraction/echo-context.test.ts           # NEW lifecycle, failpoint, publication, network, and handoff tests
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

The committed orchestrator entrypoint is `node tools/repository-extraction/echo-context.mjs <start|resume|status|quarantine-lock|verify-handoff>`. `start` requires `--run-id <uuid> --source-sha 2971310441b69735cbe759293abd8c4d044bf347`; `resume` requires run ID plus expected stale-owner nonce; tests alone may pass `--fault-after <checkpoint>` with `ECHO_EXTRACTION_TEST_MODE=1`. Exit codes are `0` success, `64` usage, `65` corrupt evidence, `73` conflict, `74` I/O, `75` live owner, `76` handoff mismatch, and `78` preflight. Stdout is one JSON result; stderr plus external state hold durable diagnostics.

Mutable lifecycle state lives only at `/Users/zhenye/Desktop/.echo-extractions/135/<run-id>/state.json`, updated by temp-write/file-fsync/rename/parent-fsync. Atomic-mkdir lock ownership records item/source/run, nonce, PID, and `ps` start identity. Children validate the nonce and never reacquire. Live owners reject resume; stale or ownerless locks require explicit `quarantine-lock` with expected nonce—or inode+mtime when ownerless—and an operator reason, after which the same run resumes under a new nonce. Unknown/mismatched state, staging, locks, or targets are preserved and refused; per-command exact-hash checkpoints make build/verify idempotent.

External state is fsynced at `ready_to_publish` with run/item/source, branch, HEAD, tree, provenance, parity, tool-schema, and package hashes; committed `provenance/candidate.v1.json` holds immutable run/item/source identity. Publication uses preflighted `renameatx_np(..., RENAME_EXCL)` plus parent fsync. A post-rename crash enters reconcile-only resume and finalizes report/state/unlock only when candidate identity, HEAD/tree/hashes, clean status, branch, and no-remotes exactly match; otherwise no mutation. Failpoints cover lock mkdir-before-owner, every build/verify step, rename, report, external `published`, and before unlock, plus a foreign-target race. `/Users/zhenye/Desktop/echo-context/.git:1` ends clean on branch `migration/2026-07-13-135-local-echo-context-source-extraction`, with no remote. No GitHub repository, publication, install, or live daemon change is permitted.

### AC2 — Give echo-context accurate capture/retrieval ownership

`/Users/zhenye/Desktop/echo-context/package.json:1` names private package/binary `echo-context`, sets exact `engines.node:22.22.1` and `packageManager:npm@10.9.4`, and has no source-path dependency; committed `package-lock.json:1` is the sole clean-install lock. `provenance/dependency-set.v1.json:1` derives direct dependencies from bare imports in the final owned source/build/test closure and pins each to the exact source-lock version, plus only pinned `typescript`, `vitest`, `eslint`, and `@types/node`; a checker rejects missing, extra, ranged, or mismatched entries. Before writes, the extractor resolves and capability-checks Git, Node `v22.22.1`, npm `10.9.4`, Python 3/`renameatx_np`, sandbox-exec including network filters, shasum, and process-group timeout, recording paths/versions/results. `/Users/zhenye/Desktop/echo-context/src/:1` owns capture gates/pipeline, Cursor/Claude Code/Codex/Git and approved raw-source adapters, normalization, workspace/source identity, append-only storage/migrations, trace clustering, retrieval queries, permissions, health, and the context service/API. Product decision extraction, briefs/cards/approval, and agent backlog/review/coordination are forbidden.

### AC3 — Split retrieval MCP from loop coordination tools

`/Users/zhenye/Desktop/echo-context/src/api/mcp/context-tools.v1.json:1` pins exactly eight sorted IDs: `echo_ping`, `echo_resolve_mru`, `find_clusters`, `get_atom`, `get_atoms`, `get_recent_work_context`, `search_memories`, and `wait_for_new_turns`. Extraction-time evidence names each canonical source path/blob at the pinned SHA, canonicalizes JSON by recursively sorting object keys while preserving arrays and integers, and stores separate SHA-256 digests for request schema, response schema, `readOnlyHint`, defaults, caps, and structured-content envelope. The source comparison reads commit objects before isolation and checkpoints its digest. Standalone tests independently compare both the manifest and runtime registry against committed evidence plus per-tool request/response fixtures; common-mode manifest/runtime drift fails. Exactly eight tools register. Coordination/status, role/task-state, review/backlog, pending-decision, and product tools are forbidden.

### AC4 — Own isolated context state and migrations

`/Users/zhenye/Desktop/echo-context/src/state/paths.ts:1` resolves state under `ECHO_CONTEXT_HOME` with a local default distinct from echo-brain and echo-loop. `src/storage/:1` owns its SQLite schema/migrations, source matching, append order, checkpoints, request logs, and context health. It cannot read `Project_echo` or the live `~/.echo` database implicitly. Live database migration, copying, or mutation is forbidden; all parity tests use synthetic scratch state.

### AC5 — Resolve Granola overlap without product coupling

`/Users/zhenye/Desktop/echo-context/src/capture/granola/:1` may own raw Granola capture only when it remains a generic context source. Decision/rationale/action extraction, post-meeting briefs, intake classifiers, decision cards, human approval, and product health are excluded. `echo-brain` may independently copy a minimal Granola adapter; neither repository imports or synchronizes the other's source. The provenance manifest records this deliberate duplicate boundary.

### AC6 — Preserve capture, normalization, storage, and retrieval behavior

The pinned candidate inventory is the LF-sorted output of `git ls-tree -r --name-only 2971310441b69735cbe759293abd8c4d044bf347 -- src/capture src/normalize src/storage src/trace src/echo-home src/enrich src/logging src/mcp src/util tests/capture tests/normalize tests/storage tests/trace tests/echo-home tests/enrich tests/logging tests/mcp tests/util`: exactly 211 paths (109 source, 102 test/fixture) with SHA-256 `e1fde9ae3f2730572dfaec621dc6531665594696917d81b31b9d997d5fd08f62`. Before isolation the extractor writes committed `provenance/source-evidence.v1.json:1` containing source SHA, command, sorted paths, blob IDs, content SHA-256s, aggregate inventory digest, tool-schema digests, and extraction-time comparison result. `/Users/zhenye/Desktop/echo-context/provenance/parity-matrix.v1.json:1` contains every evidence row once with destination, owned assertion, and `ported`, `rewritten`, or `excluded` rationale. It explicitly excludes product enrichment, loop coord/task-state, pending decisions, and project-history installers.

Standalone `npm run check:parity` never reads source objects: it digest-validates the committed evidence bundle, fixed count/hash, one-to-one matrix, non-excluded destination hashes/assertions, and AC8 counts. A separate orchestrator checkpoint `source-evidence-verified` compares the bundle to pinned commit objects before source denial. Tests run standalone parity both with `Project_echo` absent and sandbox-denied.

`/Users/zhenye/Desktop/echo-context/tests/:1` proves the owned rows' named assertions: allowlisted capture/rejection, normalization determinism, workspace/source identity, SQLite/memory conformance, migrations, append ordering, metadata filters, current-source matching, clustering, open-loop hints, search pagination, source/session resolution, newest-first body retrieval, response caps/truncation signals, wait semantics, and MCP stateless transport. Product and loop tests are absent.

### AC7 — Record provenance and prove source independence

`/Users/zhenye/Desktop/echo-context/provenance/source-extraction.v1.json:1` records all copied/relocated/rewritten files with source blobs, destination hashes, dispositions, and change rationales. Source bytes are read only with `git show 2971310441b69735cbe759293abd8c4d044bf347:<path>` or an equivalent commit-object archive, never from the dirty source worktree; a test deliberately dirties a source file and proves those bytes are excluded. `tests/migration/source-independence.test.ts:1` rejects symlinks, submodules, absolute source paths outside provenance, imports escaping the repo, child-process source access, and dependencies on `echo-brain`, `echo-loop`, or `Project_echo`.

The orchestrator renders `tools/repository-extraction/profiles/echo-context.sb.in` with candidate-copy and scratch roots. `/usr/bin/sandbox-exec` denies source reads, writes outside those roots, and all networking except inbound/outbound IPv4/IPv6 loopback for the service and descendants. Capability preflight starts a scratch loopback echo (must succeed), attempts non-loopback connect (must be denied by the OS sandbox), rejects a source read and adversarial external write, and permits required scratch writes. Under `env -i` with resolved `PATH`, scratch `HOME`/`TMPDIR`/`ECHO_CONTEXT_HOME`, locale, and timezone, the bounded process-group supervisor runs `npm ci --ignore-scripts=false --no-audit --no-fund`, typecheck, lint, `check:dependencies`, standalone `check:parity`, `check:context-tools`, tests, and `smoke:service`. Timeout/signal sends TERM then KILL to the entire process group and records post-kill PID, socket, and SQLite-lock probes; mutable diagnostics stay outside the candidate.

### AC8 — Prove local service parity and stop before cutover

`/Users/zhenye/Desktop/echo-context/tests/integration/context-service.test.ts:1` binds only `127.0.0.1` port `0` with synthetic events/scratch state under the OS sandbox and proves ping, capture, search, cluster discovery, body fetch, and wait; a non-loopback request must fail with the sandbox denial. Startup/request/shutdown have bounded timeouts. Normal `finally` closes resources, while the orchestrator supervisor handles hangs/kills by terminating the full process group and asserting no PID, listening socket, or locked scratch database remains after injected startup and request failures. `npm run smoke:service` is noninteractive and non-zero on denial/preflight/leak/timeout failure.

The repository-relative migration record captures run/staging IDs, tool preflights, commands/exits, inventory/test/closure/tool counts, provenance/evidence/parity/schema/dependency hashes, final path, branch, clean HEAD/tree, porcelain, and false authority/remote/live-state fields. Independent review starts with `node tools/repository-extraction/echo-context.mjs verify-handoff --record raw/internal/migrations/2026-07-13-135-echo-context.md`; read-only validation covers record schema, target/object existence, candidate identity, HEAD/tree/hashes, branch, cleanliness including untracked files, and no remotes, returning JSON or exit `76`. The candidate remains unchanged through disposition; current daemon/MCP remains authoritative.

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
- `tests/repository-extraction/echo-context.test.ts` — orchestrator commands/failpoints, locks, no-replace/reconcile publication, sandbox network/write probes, process-group cleanup, and handoff.
- `/Users/zhenye/Desktop/echo-context/tests/migration/parity-matrix.test.ts` — exact 211-path/count/hash baseline and one-to-one disposition coverage.
- `/Users/zhenye/Desktop/echo-context/tests/migration/source-evidence.test.ts` — extraction-time object comparison and standalone digest verification with source absent/denied.
- `/Users/zhenye/Desktop/echo-context/tests/migration/context-tool-evidence.test.ts` — per-tool source/blob/schema digests independently constrain manifest and runtime registry.
- `/Users/zhenye/Desktop/echo-context/tests/migration/dependency-set.test.ts` — bare-import-derived exact direct dependency set has no omissions or extras.
- `/Users/zhenye/Desktop/echo-context/tests/migration/committed-source-only.test.ts` — dirty source-worktree bytes cannot enter the extracted candidate.
- `/Users/zhenye/Desktop/echo-context/tests/migration/source-independence.test.ts` — no source/sibling dependencies or path escapes.
- Commands: `npm ci --ignore-scripts=false --no-audit --no-fund`, `npm run typecheck`, `npm run lint`, `npm run check:parity`, `npm run check:context-tools`, `npm test`, `npm run smoke:service`, `tools/verify-source-independence.sh`, and `git diff --check`; each has a named package script or repository-owned executable and non-zero failure contract.

## After Completion (Strategist Notes)

- Do not switch the active ECHO daemon/MCP or migrate live state yet.
- After local parity, propose an explicit state-migration, authority-transfer, and private-remote cutover with rollback.
- The eventual echo-brain integration must consume a versioned read-only context contract, never echo-context source or mutable database files.
