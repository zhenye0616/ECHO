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
  - /Users/zhenye/Desktop/echo-context/**                       # NEW standalone context capture/retrieval repository; local only
  - raw/internal/migrations/2026-07-13-135-echo-context.md     # NEW Project_echo handoff/provenance/parity record
spec_refs:
  - raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md # one-time attended build; no migration controller
  - wiki/architecture/system-architecture.md                   # capture-middle-retrieval architecture
  - wiki/architecture/storage.md                               # storage/source contracts
  - wiki/architecture/capture-gate.md                          # capture chokepoint behavior
  - wiki/surfaces/mcp-server.md                                # retrieval surface
  - backlog/complete/2026-04-30-004-capture-gate.md            # capture rejection contract
  - backlog/complete/2026-04-30-008-sqlite-storage.md          # storage contract
  - backlog/complete/2026-05-09-030-mcp-toolkit-reshape-and-group-session.md # retrieval toolkit
  - backlog/complete/2026-05-11-038-mcp-toolkit-atomicity-refactor.md # discovery/body semantics
  - backlog/complete/2026-06-18-104-granola-meeting-capture.md # Granola raw capture seam
  - product/source-boundary.v1.json                            # product logic to exclude
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

The founder has named the cross-tool capture and retrieval layer `echo-context`. It owns source adapters, normalization/identity, append-only storage, clustering/retrieval, permissions/health, and context APIs; it does not own the commercial meeting-to-decision product or agent orchestration. This item materializes that closure from Project_echo commit `2971310441b69735cbe759293abd8c4d044bf347` into `/Users/zhenye/Desktop/echo-context` and proves it on synthetic state. Project_echo remains the active daemon/MCP, backup, and authority. Live-state migration, installation, remote creation, and cutover are later checkpoints.

### AC1 — Materialize one local Git repository without shipping migration machinery

One assigned builder lane owns `/Users/zhenye/Desktop/echo-context`; sibling lanes never touch it. The absent target is created directly and initialized on branch `migration/2026-07-13-135` with local identity `ECHO Migration Agent <migration@echo.local>`, signing/hooks/templates/global and system Git config disabled, and no remote. Source bytes come only from pinned commit objects via `git show`/`git archive`, never from dirty working-tree files.

This is an attended one-time build. Do not add a Project_echo extraction CLI, daemon, lifecycle state, locks/takeover, publication helper, or recovery framework. An interrupted target is incomplete and unaccepted; the orchestrator inspects and archives it before assigning a fresh run. No agent automatically adopts, deletes, resumes, or repairs it.

The accepted target ends clean with committed local history, exactly the migration branch, and no remote. Its README records scope, pinned source, item, active Project_echo daemon authority, no-live-state rule, and later cutover gate.

### AC2 — Give echo-context accurate capture/retrieval ownership

`/Users/zhenye/Desktop/echo-context/package.json:1` pins Node/npm and owns a committed lockfile. `/Users/zhenye/Desktop/echo-context/src/:1` contains only generic context behavior: capture adapters/gate, normalization/identity, trace/enrichment that remains generic, append-only storage/migrations, source/workspace matching, clustering/search/body retrieval/wait, permissions, health/logging, and context-only MCP/service surfaces.

Direct dependencies derive from final imports plus fixed dev tools at exact versions. Runtime reads, scripts, and child executables are inventoried. Product decision/rationale/action extraction, cards/briefs/manual approval/product health, loop coordination/task-state/review tools, and Project_echo/sibling dependencies are forbidden.

### AC3 — Pin and prove the context-only retrieval surface

`context-tools.v1.json:1` registers exactly eight tools: `echo_ping`, `echo_resolve_mru`, `find_clusters`, `get_atom`, `get_atoms`, `get_recent_work_context`, `search_memories`, and `wait_for_new_turns`. Loop coordination/review/task-state and product tools must be absent.

Before target code is finalized, the builder exports the pinned source to scratch, installs from the pinned source lock in a source-only cache/root, launches the source MCP over stdio with all network denied, calls `tools/list`, and runs `/Users/zhenye/Desktop/echo-context/tests/fixtures/context-tool-parity.v1.json`. That committed fixture manifest pins its own digest, exact JSON-RPC request bytes, per-case fresh seed-state bytes, fixed clock/random/ID inputs, timeouts, and expected volatile-field normalization. Each tool includes default, explicit bounded, invalid-schema, cap/truncation, and named tool-specific success/miss/timeout cases. Canonical per-case and aggregate hashes bind source schema/output behavior. The target runs the same request/seed bytes in fresh state under the identical environment and must match every hash; mutating a target handler result without changing its registry must fail parity.

### AC4 — Own isolated context state and migrations

`src/state/paths.ts:1` resolves mutable state under explicit `ECHO_CONTEXT_HOME` with a local default distinct from echo-brain, echo-loop, and `~/.echo`. `src/storage/:1` owns its schema/migrations, append order, source matching, request logs, and context health. Tests use only synthetic scratch state. Implicit reads, copies, migrations, or mutations of the live context database, checkpoints, credentials, or user config are forbidden.

### AC5 — Resolve Granola overlap without product coupling

`src/capture/granola/:1` may own raw Granola capture only as a generic context source. Decision/rationale/action extraction, post-meeting briefs, intake classifiers, cards, approval, and product health remain excluded. Echo-brain may separately own a minimal product adapter; neither repository imports or synchronizes the other's source. Provenance records the deliberate duplication boundary.

### AC6 — Preserve capture, storage, and retrieval behavior

The pinned inventory is the LF-sorted output of `git ls-tree -r --name-only 2971310441b69735cbe759293abd8c4d044bf347 -- src/capture src/normalize src/storage src/trace src/echo-home src/enrich src/logging src/mcp src/util tests/capture tests/normalize tests/storage tests/trace tests/echo-home tests/enrich tests/logging tests/mcp tests/util`: exactly 211 paths (109 source, 102 test/fixture), SHA-256 `e1fde9ae3f2730572dfaec621dc6531665594696917d81b31b9d997d5fd08f62`.

`provenance/source-evidence.v1.json:1` records source command/SHA, sorted paths, blobs, content hashes, and aggregate/tool hashes. `provenance/parity-matrix.v1.json:1` gives every row one destination/assertion and `ported`, `rewritten`, or `excluded` rationale, explicitly excluding product and loop behavior. Standalone `npm run check:parity` validates exact counts/hash, evidence, one-to-one matrix, and destination assertions without Project_echo access.

Target tests prove capture allow/reject, normalization determinism, identity, SQLite/memory conformance, migrations, append ordering, metadata/current-source matching, clustering/open-loop hints, search pagination, source/session resolution, newest-first body retrieval, caps/truncation, wait semantics, and stateless MCP transport.

### AC7 — Preserve provenance and prove source independence

`provenance/source-extraction.v1.json:1` maps every copied/relocated/rewritten/excluded source blob/hash to destination hash/reason. A deliberate dirty source-worktree mutation cannot enter the target. Final scans/tests reject symlinks, submodules, absolute source paths outside provenance, escaping imports/process reads, and dependencies on echo-brain, echo-loop, or Project_echo.

After target HEAD is committed, verification exports it to a fresh temp directory and performs a separate clean install from the target lock into a target-only cache/root. Source and target lock hashes, install roots, cache manifests, and command exits are recorded independently; caches and `node_modules` are never shared between phases. Both installs use scratch HOME/XDG/npm config with auth/proxy variables removed. All stdio MCP fixture/parity checks run with every network family denied and a temporary macOS sandbox denial for Project_echo, siblings, live `~/.echo`, credentials, and external writes. Loopback is enabled only for the isolated service test, whose client receives the exact ephemeral endpoint from its run-owned server and whose environment contains no live daemon endpoint. A hostile HOME/npm/Git/PATH/source/sibling/live-daemon sentinel must not affect output.

Exact dependency, evidence/parity, source-versus-target tool fixtures, typecheck, lint, capture/normalize/storage/retrieval tests, service smoke, source-independence, and `git diff --check` commands must pass from exported HEAD. Network tests prove loopback bind/connect on ephemeral ports and reject non-loopback service exposure; unavailable host IPv6 is recorded as an environment limitation rather than silently treated as semantic parity.

### AC8 — Prove local service parity and record the handoff

`tests/integration/context-service.test.ts:1` launches against synthetic `ECHO_CONTEXT_HOME`, binds only loopback port `0`, and proves ping, capture, search, cluster discovery, body fetch, wait, bounded startup/request/shutdown, and resource cleanup. It never reads or mutates live state and exposes no non-loopback listener.

After all checks pass, the builder writes `raw/internal/migrations/2026-07-13-135-echo-context.md` in its isolated Project_echo feature worktree. The record contains source SHA, commands/exits, target path/branch/HEAD/tree, package/lock/provenance/evidence/parity/tool/dependency hashes, test/service results, no-remotes/clean status, differences, and `authority:false`, `live_state_migrated:false`. The builder commits that record with backlog handoff and does not mutate target history afterward.

Independent review reruns target-local checks and compares record hashes. Passing proves only a local source split; the Project_echo daemon/MCP and live state remain authoritative.

## Out of Scope (Don't Drift)

- Do not create/configure a remote, publish/install the package, or change daemon/MCP/launchd configuration.
- Do not build reusable extraction, crash-recovery, lock, takeover, or publication-control machinery.
- Do not read/copy/migrate/mutate live databases, checkpoints, credentials, Keychain, or user config.
- Do not include echo-brain product semantics or echo-loop protocol/workflows.
- Do not add sources, embeddings, retrieval algorithms, or behavior changes.
- Do not remove/freeze current Project_echo paths or touch sibling targets, wiki, or holdout-131.

## Risks

- **Server/tool entanglement:** retrieval and loop tools share current MCP code. Mitigation: exact eight-tool roster, identical source/target fixtures, and rejection tests.
- **Storage drift:** current storage serves multiple domains. Mitigation: synthetic context-only conformance and explicit product/loop exclusions.
- **Live-state contamination:** defaults could open founder state. Mitigation: distinct ECHO_CONTEXT_HOME, exported-head sandbox verification, and hostile live-state sentinels.
- **Interrupted build:** direct materialization can leave an incomplete target. Mitigation: one attended lane; incomplete targets are never accepted or auto-resumed.

## Tests

- `/Users/zhenye/Desktop/echo-context/tests/capture/` — gate, pipeline, and owned adapters.
- `/Users/zhenye/Desktop/echo-context/tests/normalize/` — deterministic normalization/identity.
- `/Users/zhenye/Desktop/echo-context/tests/storage/` — migrations, append, matching, metadata, conformance.
- `/Users/zhenye/Desktop/echo-context/tests/retrieval/` — clustering, search, pagination, caps, source resolution, wait.
- `/Users/zhenye/Desktop/echo-context/tests/api/context-only-roster.test.ts` — exact eight tools; loop/product absent.
- `/Users/zhenye/Desktop/echo-context/tests/integration/context-service.test.ts` — synthetic loopback service end-to-end.
- `/Users/zhenye/Desktop/echo-context/tests/migration/parity-matrix.test.ts` — exact 211/109/102 count/hash and dispositions.
- `/Users/zhenye/Desktop/echo-context/tests/migration/context-tool-evidence.test.ts` — identical source/target fixture hashes.
- `/Users/zhenye/Desktop/echo-context/tests/migration/dependency-set.test.ts` — exact dependencies.
- `/Users/zhenye/Desktop/echo-context/tests/migration/committed-source-only.test.ts` — dirty source bytes excluded.
- `/Users/zhenye/Desktop/echo-context/tests/migration/source-independence.test.ts` — no source/sibling/path escape.
- Migration record review — target HEAD/tree, commands, no-remotes, clean status, and false-authority/live-state evidence.

## After Completion (Strategist Notes)

- Do not switch daemon/MCP or migrate live state.
- Propose remote, service installation, state migration/rollback, and authority transfer separately after local parity.
- Echo-brain must later consume a versioned read-only context contract, never echo-context source or mutable database files.
