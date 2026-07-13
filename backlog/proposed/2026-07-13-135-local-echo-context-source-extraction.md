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
  - tools/repository-extraction/echo-context.mjs               # NEW one-shot extract/status/discard plus post-publish evidence/handoff entrypoint
  - tools/repository-extraction/helpers/echo-context-rename-excl.py # NEW pinned renameatx_np(RENAME_EXCL) directory helper
  - tools/repository-extraction/profiles/echo-context.sb.in    # NEW scoped source/write/network sandbox policy template
  - tests/repository-extraction/echo-context.test.ts           # NEW lifecycle, failpoint, publication, network, and handoff tests
  - raw/internal/migrations/2026-07-13-135-echo-context.md     # NEW orchestrator-owned provenance, parity, and local-head record
spec_refs:
  - raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md # reviewed lifecycle simplification shared by all three lanes
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

The committed entrypoint is `node tools/repository-extraction/echo-context.mjs <extract|status|publish-record|verify-handoff|discard>`. One-shot `extract` requires run ID and the pinned source SHA; exit codes are `0/64/73/76/78`. Test roots require test mode. Preflight binds the canonical isolated Project_echo worktree/common-dir, branch ref, clean index/worktree, control HEAD, and committed script/profile/target-specific Python RENAME_EXCL-helper blobs. The helper calls macOS `renameatx_np(..., RENAME_EXCL)` through `ctypes` and is an immutable control input.

Lifecycle is `ABSENT -> RUNNING -> PUBLISHED | FAILED`. The tool builds and fsyncs complete initial state in `/Users/zhenye/Desktop/.echo-extractions/new/135-<run-id>`, then RENAME_EXCL-renames that initialized directory to fixed claim `/Users/zhenye/Desktop/.echo-extractions/135` and fsyncs the parent; that rename elects the run. Pre-claim crashes/losers archive only their unclaimed directory. State/staging/cache/outputs/record bytes all live beneath the claim. State updates are temp-write/file-fsync/atomic-rename/directory-fsync. Child groups wait behind a bound parent gate until PID, PGID, start identity, and executable are durably recorded; EOF exits before work. Later invocations never signal. Exact live identity/resources block discard; PID reuse with different birth/executable is quiescent and never signaled.

`discard` requires target absence and quiescent exact identities/sockets/databases, then one RENAME_EXCL move of the whole claim to `/Users/zhenye/Desktop/.echo-extractions/archive/135-<run-id>-<state-digest>` plus parent fsync. Pre-rename failure retries discard; post-rename a fresh initialized claim can win. Invalid/foreign contents are refused. Tests cover every pre/post claim election, state/gate, discard, and durability boundary.

After recursive staging file/directory fsync, the helper RENAME_EXCL-publishes `/Users/zhenye/Desktop/echo-context` and fsyncs its parent. Target + committed `candidate.v1.json` define PUBLISHED independently of Project_echo evidence; an explicitly recorded rename/fsync error remains fail-closed. Post-publication `publish-record` uses exact run-local bytes, the bound clean isolated worktree, a temporary index, `commit-tree`, and expected-old-SHA `update-ref` CAS to create one record-only child commit. It refuses drift/unrelated changes, then updates the bound index under lock and proves clean; retry accepts the exact child and repairs only the exact post-CAS index window. Evidence failure never mutates target. Final target is clean on its migration branch with no remote.

### AC2 — Give echo-context accurate capture/retrieval ownership

`/Users/zhenye/Desktop/echo-context/package.json:1` pins Node/npm and has a committed lock. Direct packages derive from bare imports plus fixed dev tools at exact source-lock versions. Runtime file/script/child-process executable edges also enter dependency evidence: npm binaries bind exact packages; system/compiler/native-build tools bind capability preflights or are rewritten/excluded. Before writes, Git, Node/npm, Python/RENAME_EXCL, sandbox network filters, shasum, process-group timeout, and all install-script toolchain edges are recorded. `/Users/zhenye/Desktop/echo-context/src/:1` owns only capture/retrieval platform behavior; product/loop behavior is forbidden.

### AC3 — Split retrieval MCP from loop coordination tools

`context-tools.v1.json` pins exactly: `echo_ping`, `echo_resolve_mru`, `find_clusters`, `get_atom`, `get_atoms`, `get_recent_work_context`, `search_memories`, and `wait_for_new_turns`. Internal `source-tool-snapshot` exports the pinned source, uses the exact offline install contract from AC7, launches source MCP under sanitized scratch state/loopback-only sandbox, calls `tools/list`, and runs immutable fixtures. Each tool has default, bounded, invalid, cap/truncation, and named tool-specific cases. Canonicalization sorts object keys, preserves arrays/integers, marks absence, rejects non-JSON, and appends LF. Per-case and aggregate digests bind source paths/blobs/outputs. Before publication, the candidate is launched under the identical environment and exact fixture corpus; every canonical per-case and aggregate output must equal the source snapshot. A target handler semantic mutation with unchanged manifest/registry must fail. Exactly eight tools register; loop/product tools are forbidden.

### AC4 — Own isolated context state and migrations

`/Users/zhenye/Desktop/echo-context/src/state/paths.ts:1` resolves state under `ECHO_CONTEXT_HOME` with a local default distinct from echo-brain and echo-loop. `src/storage/:1` owns its SQLite schema/migrations, source matching, append order, checkpoints, request logs, and context health. It cannot read `Project_echo` or the live `~/.echo` database implicitly. Live database migration, copying, or mutation is forbidden; all parity tests use synthetic scratch state.

### AC5 — Resolve Granola overlap without product coupling

`/Users/zhenye/Desktop/echo-context/src/capture/granola/:1` may own raw Granola capture only when it remains a generic context source. Decision/rationale/action extraction, post-meeting briefs, intake classifiers, decision cards, human approval, and product health are excluded. `echo-brain` may independently copy a minimal Granola adapter; neither repository imports or synchronizes the other's source. The provenance manifest records this deliberate duplicate boundary.

### AC6 — Preserve capture, normalization, storage, and retrieval behavior

The pinned candidate inventory is the LF-sorted output of `git ls-tree -r --name-only 2971310441b69735cbe759293abd8c4d044bf347 -- src/capture src/normalize src/storage src/trace src/echo-home src/enrich src/logging src/mcp src/util tests/capture tests/normalize tests/storage tests/trace tests/echo-home tests/enrich tests/logging tests/mcp tests/util`: exactly 211 paths (109 source, 102 test/fixture) with SHA-256 `e1fde9ae3f2730572dfaec621dc6531665594696917d81b31b9d997d5fd08f62`. Before isolation the extractor writes committed `provenance/source-evidence.v1.json:1` containing source SHA, command, sorted paths, blob IDs, content SHA-256s, aggregate inventory digest, tool-schema digests, and extraction-time comparison result. `/Users/zhenye/Desktop/echo-context/provenance/parity-matrix.v1.json:1` contains every evidence row once with destination, owned assertion, and `ported`, `rewritten`, or `excluded` rationale. It explicitly excludes product enrichment, loop coord/task-state, pending decisions, and project-history installers.

Standalone `npm run check:parity` never reads source objects: it validates the evidence bundle, AC6's exact 211 paths (109 source, 102 test/fixture) and pinned hash, one-to-one matrix, and destination hashes/assertions. Internal phase `source-evidence-verified` compares the bundle to pinned commit objects before source denial. Tests run with `Project_echo` absent and sandbox-denied.

`/Users/zhenye/Desktop/echo-context/tests/:1` proves the owned rows' named assertions: allowlisted capture/rejection, normalization determinism, workspace/source identity, SQLite/memory conformance, migrations, append ordering, metadata filters, current-source matching, clustering, open-loop hints, search pagination, source/session resolution, newest-first body retrieval, response caps/truncation signals, wait semantics, and MCP stateless transport. Product and loop tests are absent.

### AC7 — Record provenance and prove source independence

`/Users/zhenye/Desktop/echo-context/provenance/source-extraction.v1.json:1` records all copied/relocated/rewritten files with source blobs, destination hashes, dispositions, and change rationales. Source bytes are read only with `git show 2971310441b69735cbe759293abd8c4d044bf347:<path>` or an equivalent commit-object archive, never from the dirty source worktree; a test deliberately dirties a source file and proves those bytes are excluded. `tests/migration/source-independence.test.ts:1` rejects symlinks, submodules, absolute source paths outside provenance, imports escaping the repo, child-process source access, and dependencies on `echo-brain`, `echo-loop`, or `Project_echo`.

Acquisition runs under `env -i`, run-owned HOME/XDG/TMPDIR and empty npm configs, scrubbed auth/proxy variables, manifested absolute runtime tools, and a filesystem sandbox permitting only run/lock/runtime reads plus outbound network. It executes `npm ci --ignore-scripts --no-audit --no-fund --cache <run>/npm-cache`; lock integrity and a sorted cache manifest gate admission. Hostile operator HOME/.npmrc/environment sentinels stay unread/unforwarded. Acquisition `node_modules` is removed.

The sandbox probe is separate from the loopback-only service test. For AF_INET and AF_INET6, outside-sandbox helpers first prove routable non-loopback listener/client pairs; then sandboxed outbound clients to those known listeners and sandboxed non-loopback bind/accept paths must fail with policy-denial evidence, while sandboxed loopback bind/connect/accept succeeds in both families. If either family lacks a denial-qualified topology, preflight fails rather than skips.

Separate executable and runtime-read manifests bind tool realpaths/hashes plus interpreter, Git exec-path, Node/npm module, dynamic-library, and immutable system-runtime reads and are validated at use. Every later source/candidate install is exactly `npm ci --offline --no-audit --no-fund --cache <run>/npm-cache --ignore-scripts=false`; every later npm invocation uses that cache with network denied. Empty/poisoned host PATH/cache cannot affect results. Normal timeout/signal is handled by the active supervisor; after hard kill, discard checks PID+PGID+start identity+executable and resource locks, treating PID reuse as quiescent without signaling.

### AC8 — Prove local service parity and stop before cutover

`/Users/zhenye/Desktop/echo-context/tests/integration/context-service.test.ts:1` binds only `127.0.0.1` port `0` with synthetic events/scratch state under the OS sandbox and proves ping, capture, search, cluster discovery, body fetch, and wait; a non-loopback request must fail with the sandbox denial. Startup/request/shutdown have bounded timeouts. Normal `finally` closes resources, while the orchestrator supervisor handles hangs/kills by terminating the full process group and asserting no PID, listening socket, or locked scratch database remains after injected startup and request failures. `npm run smoke:service` is noninteractive and non-zero on denial/preflight/leak/timeout failure.

The record captures control/cache/runtime/provenance/evidence/parity/schema/dependency hashes and false authority/remote/live-state. `verify-handoff --expected-run-id <id>` derives canonical no-symlink paths, validates state/target/candidate, and requires Project_echo at the bound control HEAD or exactly one exact record-only child. Unrelated descendants, drift, dirty target, or any remote fail. Candidate stays unchanged; daemon/MCP remains authoritative.

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
- **Interrupted one-shot work:** a crash can discard completed local work. Mitigation: attended execution, archived evidence/cache, and a fresh deterministic run after process/socket/database quiescence is human-verified.

## Tests

- `/Users/zhenye/Desktop/echo-context/tests/capture/` — gate, pipeline, and owned source adapters.
- `/Users/zhenye/Desktop/echo-context/tests/normalize/` — deterministic normalization and identity.
- `/Users/zhenye/Desktop/echo-context/tests/storage/` — migrations, append order, matching, metadata, and backend conformance.
- `/Users/zhenye/Desktop/echo-context/tests/retrieval/` — clustering, search, pagination, caps, truncation, source resolution, and wait.
- `/Users/zhenye/Desktop/echo-context/tests/api/context-only-roster.test.ts` — retrieval tools present; loop/product tools absent.
- `/Users/zhenye/Desktop/echo-context/tests/integration/context-service.test.ts` — synthetic service end-to-end on ephemeral state/port.
- `tests/repository-extraction/echo-context.test.ts` — durable claim/state/gated spawn; atomic whole-claim discard; PID reuse; target durability; sanitized acquisition/runtime closure; source-vs-candidate fixture equality; record CAS/ref drift; canonical handoff.
- `/Users/zhenye/Desktop/echo-context/tests/migration/parity-matrix.test.ts` — exact 211-path/count/hash baseline and one-to-one disposition coverage.
- `/Users/zhenye/Desktop/echo-context/tests/migration/source-evidence.test.ts` — extraction-time object comparison and standalone digest verification with source absent/denied.
- `/Users/zhenye/Desktop/echo-context/tests/migration/context-tool-evidence.test.ts` — per-tool source/blob/schema digests independently constrain manifest and runtime registry.
- `/Users/zhenye/Desktop/echo-context/tests/migration/dependency-set.test.ts` — bare-import-derived exact direct dependency set has no omissions or extras.
- `/Users/zhenye/Desktop/echo-context/tests/migration/committed-source-only.test.ts` — dirty source-worktree bytes cannot enter the extracted candidate.
- `/Users/zhenye/Desktop/echo-context/tests/migration/source-independence.test.ts` — no source/sibling dependencies or path escapes.
- Network tests cover independent AF_INET/AF_INET6 inbound/outbound loopback allow and known-listener non-loopback policy denial, plus active-supervisor cleanup and hard-kill discard refusal.
- All post-acquisition npm installs use the exact offline command/cache; then dependency/parity/source-and-candidate-tool/type/lint/test/service/source-independence checks and `git diff --check` run with network denied; failure requires discard + fresh extract.

## After Completion (Strategist Notes)

- Do not switch the active ECHO daemon/MCP or migrate live state yet.
- After local parity, propose an explicit state-migration, authority-transfer, and private-remote cutover with rollback.
- The eventual echo-brain integration must consume a versioned read-only context contract, never echo-context source or mutable database files.
