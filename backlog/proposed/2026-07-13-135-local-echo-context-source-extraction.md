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

The committed entrypoint is `node tools/repository-extraction/echo-context.mjs <start|resume|status|quarantine-lock|verify-handoff>`. `start` requires run ID/source SHA; `quarantine-lock` requires expected stale nonce (or ownerless inode+mtime) and reason and returns `{new_nonce,resume_token,quarantine_path}`; `resume` consumes the one-use token. Exit codes remain `0/64/65/73/74/75/76/78`. Fault and target/state/staging/record/source root overrides require `ECHO_EXTRACTION_TEST_MODE=1`, are rejected in production, and every lifecycle test uses unique temp roots.

Production uses one target-keyed `/Users/zhenye/Desktop/.echo-extractions/locks/echo-context.lock`. Start/resume/quarantine serialize under an OS-released `fcntl` guard whose embedded helper bytes are hashed with the script. Under the guard, quarantine verifies or TERM/KILLs and probes the stale recorded PGID, RENAME_EXCL-moves old lock to immutable quarantine, fsyncs, creates reserved replacement ownership with new nonce/hashed token, and returns it; resume consumes the token. Concurrent attempts yield one winner; ownerless recovery uses inode+mtime. Tests cover distinct-run starts, competing quarantine/resume, replay, and crash-before-owner.

State at `/Users/zhenye/Desktop/.echo-extractions/135/<run-id>/state.json` is atomic/fsynced. Before writes, script/profile/helper bytes must be clean and committed; orchestrator commit and blob/SHA-256 identities bind every later operation and handoff. Before spawn, child waits on a pipe until parent persists PGID, leader start identity, command/input hashes, and nonce; EOF before release exits. Quarantine/resume proves the entire group, sockets, and SQLite locks quiescent before takeover. Unknown/mismatched paths/state/control identities are preserved and refused; exact-hash checkpoints are idempotent.

Before publication the tool deterministically renders the full migration record externally and binds its canonical SHA-256 in fsynced `ready_to_publish` with run/item/source, orchestrator, cache, branch, HEAD/tree, provenance/evidence/parity/tool-schema/dependency/package hashes. Committed `candidate.v1.json` holds identity. RENAME_EXCL publication and reconcile atomically publish only pre-rendered record bytes or accept byte-identical existing bytes, then finalize only on exact matches. Failpoints cover every boundary and target race. Final echo-context is clean on the migration branch with no remote.

### AC2 — Give echo-context accurate capture/retrieval ownership

`/Users/zhenye/Desktop/echo-context/package.json:1` pins Node/npm and has a committed lock. Direct packages derive from bare imports plus fixed dev tools at exact source-lock versions. Runtime file/script/child-process executable edges also enter dependency evidence: npm binaries bind exact packages; system/compiler/native-build tools bind capability preflights or are rewritten/excluded. Before writes, Git, Node/npm, Python/RENAME_EXCL, sandbox network filters, shasum, process-group timeout, and all install-script toolchain edges are recorded. `/Users/zhenye/Desktop/echo-context/src/:1` owns only capture/retrieval platform behavior; product/loop behavior is forbidden.

### AC3 — Split retrieval MCP from loop coordination tools

`context-tools.v1.json` pins exactly the eight sorted context IDs. Exact checkpoint command `node tools/repository-extraction/echo-context.mjs snapshot-source-tools --source-sha <sha> --source-archive <dir> --npm-cache <run-cache> --output <evidence>` exports the pinned source, performs offline install/build, launches that source MCP against scratch state, calls `tools/list`, and executes pinned per-tool fixture calls to derive request/response schema, readOnlyHint, defaults, caps, and envelope values independently of target code. Canonicalization recursively sorts object keys, preserves array order/integers, represents absent as `{"$absent":true}` and other non-JSON values as a hard error, and appends one LF. Per-field and aggregate SHA-256s bind source paths/blobs and outputs. Synthetic source mutations to schema/default/cap/envelope must change the source snapshot and fail `source-evidence-verified`; manifest and target runtime are separately compared to that evidence. Exactly eight tools register; loop/product tools are forbidden.

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

Before isolation, `dependency-cache-ready` runs `npm ci --ignore-scripts --cache <run>/npm-cache` in a scratch candidate-lock copy, allows fetch only for lockfile resolved URLs, verifies every integrity entry, records a sorted cache hash manifest, deletes acquisition `node_modules`, and preflights install-script/native tools. The OS sandbox then denies source reads, external writes, and non-loopback network. Separate AF_INET and AF_INET6 positive loopback inbound/outbound probes must succeed; for each available non-loopback local interface address, inbound/outbound probes to a deliberately listening local endpoint must fail specifically with sandbox denial, not route/listener absence. Missing required family/filter capability is preflight failure.

Under `env -i` with explicit cache/scratch roots, the supervisor runs `npm ci --offline --cache <run>/npm-cache --ignore-scripts=false --no-audit --no-fund`, checks/tests/smoke. Cold operator cache succeeds; missing staged object fails. The parent-child handshake persists PGID before execution; timeout/orchestrator-kill recovery TERM/KILLs the group and probes PIDs, AF_INET/AF_INET6 sockets, and SQLite locks before takeover. Diagnostics remain external.

### AC8 — Prove local service parity and stop before cutover

`/Users/zhenye/Desktop/echo-context/tests/integration/context-service.test.ts:1` binds only `127.0.0.1` port `0` with synthetic events/scratch state under the OS sandbox and proves ping, capture, search, cluster discovery, body fetch, and wait; a non-loopback request must fail with the sandbox denial. Startup/request/shutdown have bounded timeouts. Normal `finally` closes resources, while the orchestrator supervisor handles hangs/kills by terminating the full process group and asserting no PID, listening socket, or locked scratch database remains after injected startup and request failures. `npm run smoke:service` is noninteractive and non-zero on denial/preflight/leak/timeout failure.

The record captures control/cache/provenance/evidence/parity/schema/dependency hashes and false authority/remote/live-state. Review runs `node tools/repository-extraction/echo-context.mjs verify-handoff --record <record> --state <published-state> --expected-item 2026-07-13-135-local-echo-context-source-extraction --expected-source-sha 2971310441b69735cbe759293abd8c4d044bf347 --expected-run-id <run-id>`. It compares flags across state, record, and candidate identity; validates bound record/control digests, Git objects/tree/cleanliness/branch/no-remotes, and exits `76` on mismatch. Candidate remains unchanged; daemon/MCP stays authoritative.

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
- `tests/repository-extraction/echo-context.test.ts` — commands/failpoints; locks/no-replace/reconcile; sandbox probes; cold-cache offline install; control binding; orphan-group cleanup; serialized takeover; isolated roots; record/trusted handoff.
- `/Users/zhenye/Desktop/echo-context/tests/migration/parity-matrix.test.ts` — exact 211-path/count/hash baseline and one-to-one disposition coverage.
- `/Users/zhenye/Desktop/echo-context/tests/migration/source-evidence.test.ts` — extraction-time object comparison and standalone digest verification with source absent/denied.
- `/Users/zhenye/Desktop/echo-context/tests/migration/context-tool-evidence.test.ts` — per-tool source/blob/schema digests independently constrain manifest and runtime registry.
- `/Users/zhenye/Desktop/echo-context/tests/migration/dependency-set.test.ts` — bare-import-derived exact direct dependency set has no omissions or extras.
- `/Users/zhenye/Desktop/echo-context/tests/migration/committed-source-only.test.ts` — dirty source-worktree bytes cannot enter the extracted candidate.
- `/Users/zhenye/Desktop/echo-context/tests/migration/source-independence.test.ts` — no source/sibling dependencies or path escapes.
- Network tests cover AF_INET/AF_INET6 inbound/outbound loopback allow and non-loopback sandbox denial, plus supervisor-kill PID/socket/SQLite cleanup.
- Commands begin `npm ci --offline --cache <run>/npm-cache --ignore-scripts=false --no-audit --no-fund`, then exact dependency/parity/context-tool/type/lint/test/service/source-independence checks and `git diff --check`; every step is checkpointed with non-zero failure.

## After Completion (Strategist Notes)

- Do not switch the active ECHO daemon/MCP or migrate live state yet.
- After local parity, propose an explicit state-migration, authority-transfer, and private-remote cutover with rollback.
- The eventual echo-brain integration must consume a versioned read-only context contract, never echo-context source or mutable database files.
