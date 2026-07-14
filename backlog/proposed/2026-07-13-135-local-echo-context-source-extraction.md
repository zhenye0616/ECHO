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
  - /Users/zhenye/Desktop/.echo-migration-evidence/135/**      # NEW retained failure/sandbox/oracle evidence through review
  - raw/internal/migrations/2026-07-13-135-echo-context.md     # NEW Project_echo handoff/provenance/parity record
  - raw/internal/agent-runs/**                                 # workflow-owned failure/completion run log
  - backlog/task-state/2026-07-13-135-local-echo-context-source-extraction/builder.md # workflow continuity pointer
  - backlog/ready/2026-07-13-135-local-echo-context-source-extraction.md # workflow claim source
  - backlog/in_progress/2026-07-13-135-local-echo-context-source-extraction.md # workflow claimed item
  - backlog/pending_review/2026-07-13-135-local-echo-context-source-extraction.md # workflow handoff item
  - docs/BACKLOG.md                                           # generated stage-derived index on claim/handoff
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

One assigned builder lane owns `/Users/zhenye/Desktop/echo-context`; sibling lanes never touch it. Existing-target cleanup is founder-owned outside this item; builder aborts on EEXIST. As a precondition, the founder/orchestrator provisions missing `.echo-migration-evidence` and `135` parents one component at a time with non-recursive mode-0700 mkdir after parent owner/mode/device/inode/no-symlink validation. It records that preflight in the Project_echo agent-run log; an absent-parent fixture must succeed, while any pre-attempt failure emits the full diagnostic to stderr and appends it to that stable log. Before target mutation, the orchestrator validates a lowercase UUID attempt ID and creates `/Users/zhenye/Desktop/.echo-migration-evidence/135/<attempt-id>` by one non-recursive mode-0700 mkdir; EEXIST aborts. The builder creates/compiles the retained capsule publisher described in AC8, creates mode-0700 `failures`, opens it with `O_DIRECTORY|O_NOFOLLOW`, verifies its descriptor tuple, and only then enables top-level finalizer coverage. Bootstrap failure before that boundary uses stderr plus the stable Project_echo log and performs no cleanup. After it confirms target-parent integrity, target absence, and prior-process quiescence, the builder's first target mutation is non-recursive `mkdir /Users/zhenye/Desktop/echo-context`; before it no target-path write occurs, and afterward this builder is the only writer inside. It initializes branch `migration/2026-07-13-135` with fixed identity/no remote. `provenance/toolchain.v1.json` pins `/usr/local/bin/git` 2.37.3, `/usr/local/bin/node` 22.22.1, `/usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/bin/npm-cli.js` 10.9.4, shell, native build closure, and sandbox-exec by path/version/hash; every command uses env-i and controlled absolute entry points. Final checks prove target-local storage, no alternate/promisor/replace state, and `git fsck --full`.

This is an attended one-time build. Do not add a Project_echo extraction CLI, daemon, lifecycle state, locks/takeover, publication helper, or recovery framework. An interrupted target is incomplete and unaccepted; the orchestrator inspects and archives it before assigning a fresh run. No agent automatically adopts, deletes, resumes, or repairs it.

The accepted target ends clean with committed local history, exactly the migration branch, and no remote. Its README records scope, pinned source, item, active Project_echo daemon authority, no-live-state rule, and later cutover gate.

### AC2 — Give echo-context accurate capture/retrieval ownership

`/Users/zhenye/Desktop/echo-context/package.json:1` pins Node/npm and owns a committed lockfile. `/Users/zhenye/Desktop/echo-context/src/:1` contains only generic context behavior: capture adapters/gate, normalization/identity, trace/enrichment that remains generic, append-only storage/migrations, source/workspace matching, clustering/search/body retrieval/wait, permissions, health/logging, and context-only MCP/service surfaces.

Direct dependencies derive from final imports plus fixed dev tools at exact versions. `provenance/runtime-inventory.v1.json:1` lists discovered imports, dynamic reads, package scripts, spawned executable names, and JavaScript CLI entry points with owned/excluded rationale; target `tools/check-runtime-inventory.mjs` recomputes them and fails on missing/extra edges. No verification command uses `npm run` or `node_modules/.bin`: each JavaScript CLI launches only as pinned `/usr/local/bin/node <absolute-target-local-js-entry>`, while non-JS tools use approved absolute paths. Package scripts are audited aliases whose tokenized command must match the direct-entry verification plan; a deliberate bare-CLI mutation fails before execution. The actual child PATH is recorded and contains only the verified attempt tool-bin. Product decision/rationale/action extraction, cards/briefs/manual approval/product health, loop coordination/task-state/review tools, and Project_echo/sibling dependencies are forbidden.

### AC3 — Pin and prove the context-only retrieval surface

`context-tools.v1.json:1` registers exactly eight tools: `echo_ping`, `echo_resolve_mru`, `find_clusters`, `get_atom`, `get_atoms`, `get_recent_work_context`, `search_memories`, and `wait_for_new_turns`. Loop coordination/review/task-state and product tools must be absent.

Before target code is finalized, the builder exports the pinned source to scratch, installs from the pinned source lock in a source-only cache/root, launches source MCP over stdio/network-denied, calls `tools/list`, and runs `tests/fixtures/context-tool-parity.v1.json`. Sidecar bytes are exactly lowercase SHA-256 of manifest bytes plus LF and are verified before JSON parsing. Case IDs are unique visible ASCII excluding NUL/LF and byte-sorted. Manifest/canonical responses use UTF-8/LF, recursively sorted object keys, preserved arrays, and failure on undeclared volatile fields; case digest is SHA-256 of canonical response bytes. Aggregate framing is `case-id + NUL + 64-lowercase-hex + LF`. The manifest pins exact request bytes, fresh seed state, fixed clock/random/ID/timeouts, and named volatile JSON pointers only.

The manifest has an explicit per-tool case matrix: ping message/missing; MRU match/miss; clusters default/compact; atom found/miss; atoms duplicate/missing; recent bounded/truncated; search filter/pagination; wait new/timeout, plus schema-invalid where supported. The canonical descriptor projection contains exactly `name`, `description`, recursively canonicalized `inputSchema`, present-or-null `outputSchema`, and present-or-empty canonical `annotations`, with unknown descriptor fields rejected. Source and target projections for the exact eight IDs must have identical UTF-8/LF bytes and aggregate SHA-256; missing, duplicate, or extra IDs fail. A descriptor-only mutation with unchanged tool behavior must fail. Each case owns a fresh process group/state. Wait-new uses a scripted subscription-ready barrier before post-subscription append/clock advance. Every exit path performs bounded TERM, KILL, wait/reap and listener checks; injected failures prove no child/listener survives. A target semantic mutation must fail.

### AC4 — Own isolated context state and migrations

`src/state/paths.ts:1` resolves mutable state under explicit `ECHO_CONTEXT_HOME` with a local default distinct from echo-brain, echo-loop, and `~/.echo`. `src/storage/:1` owns its schema/migrations, append order, source matching, request logs, and context health. Tests use only synthetic scratch state. Implicit reads, copies, migrations, or mutations of the live context database, checkpoints, credentials, or user config are forbidden.

### AC5 — Resolve Granola overlap without product coupling

`src/capture/granola/:1` may own raw Granola capture only as a generic context source. Decision/rationale/action extraction, post-meeting briefs, intake classifiers, cards, approval, and product health remain excluded. Echo-brain may separately own a minimal product adapter; neither repository imports or synchronizes the other's source. Provenance records the deliberate duplication boundary.

### AC6 — Preserve capture, storage, and retrieval behavior

The pinned inventory is the LF-sorted output of `git ls-tree -r --name-only 2971310441b69735cbe759293abd8c4d044bf347 -- src/capture src/normalize src/storage src/trace src/echo-home src/enrich src/logging src/mcp src/util tests/capture tests/normalize tests/storage tests/trace tests/echo-home tests/enrich tests/logging tests/mcp tests/util`: exactly 211 paths (109 source, 102 test/fixture), SHA-256 `e1fde9ae3f2730572dfaec621dc6531665594696917d81b31b9d997d5fd08f62`.

`provenance/source-evidence.v1.json:1` records source command/SHA, sorted paths, blobs, content hashes, and aggregate/tool hashes. `provenance/parity-matrix.v1.json:1` gives every row one destination/assertion and `ported`, `rewritten`, or `excluded` rationale, explicitly excluding product and loop behavior. Direct-Node `tools/check-parity.mjs` validates exact counts/hash, evidence, one-to-one matrix, and destination assertions without Project_echo access.

Target tests prove capture allow/reject, normalization determinism, identity, SQLite/memory conformance, migrations, append ordering, metadata/current-source matching, clustering/open-loop hints, search pagination, source/session resolution, newest-first body retrieval, caps/truncation, wait semantics, and stateless MCP transport.

### AC7 — Preserve provenance and prove source independence

`provenance/source-extraction.v1.json:1` covers the independently derived 211-path source universe plus every authored/generated target file, excluding only self-referential manifests and build/install output. Paths are normalized unique byte-sorted POSIX paths and hashes are SHA-256. Source-backed rows use copied/relocated/rewritten/excluded with conditional destination fields; authored/generated rows have destination/hash/origin and no source fields. A deliberate dirty source-worktree mutation cannot enter the target. Final scans/tests reject symlinks, submodules, absolute source paths outside provenance, escaping imports/process reads, and dependencies on echo-brain, echo-loop, or Project_echo.

After target HEAD is committed, every verifier treats the shared target read-only, records its exact 40-hex HEAD and tree, creates a unique private `git clone --no-local --no-hardlinks` at that exact commit, detaches HEAD, removes `origin`, proves no remotes/alternates/promisor/replace state, and rechecks that shared HEAD/tree did not move.

Source and target dependency acquisition use separate roots/caches/manifests. Every root has mode 0700 beneath the attempt; `HOME`, `XDG_CONFIG_HOME`, `TMPDIR`, `TMP`, and `TEMP` point there, empty 0600 npm user/global configs are explicit, and default temp paths must remain unchanged. `PATH` contains only `<attempt-root>/tool-bin`; every JavaScript CLI is invoked as `/usr/local/bin/node <absolute-js-entry>`.

Npm never has network access. Before target creation the builder creates retained `<attempt-root>/operator/fetch-lock-deps.mjs`; the target later commits a byte-identical `tools/fetch-lock-deps.mjs`. This Node-builtins-only runner parses lock `resolved` URLs, requires HTTPS and an exact hostname allowlist, uses URL hostname for DNS plus TLS SNI/certificate verification, permits redirects only to another exact lock-listed URL/host, downloads to a no-follow quarantine path, and streams integrity verification before a no-replace move to admitted tarballs. A separate network-denied step invokes pinned Node/npm CLI `cache add <admitted-tarball> --cache <actor-cache>` for each byte-sorted artifact, then `npm ci --offline --ignore-scripts --no-audit --no-fund` with explicit cache/config flags. The fetch process alone receives the host-aware network profile; npm and all later phases deny network. Wrong-host/same-IP, cross-host/same-host unlisted redirects, DNS answer change/rebinding, non-registry egress, short/tampered tarball, and unlisted URL fixtures must fail without admitted bytes. Path/link/workspace/Git lock resolutions are rejected.

The verifier writes `provenance/lifecycle-plan.v1.json` from locked package manifests. Each package is `no-script`, `verified-packaged-artifact`, or names one exact offline rebuild command, working directory, inputs, outputs, SDK/header set, and executable closure. The current `better-sqlite3` row must either verify a lock/package-owned ABI-compatible `.node` artifact or run `/usr/local/bin/node /usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js rebuild --release --directory <private-install>/node_modules/better-sqlite3 --nodedir /usr/local/Cellar/node@22/22.22.1_1` under deny-all network. `provenance/node-headers.v1.json` hashes every consumed file under `/usr/local/Cellar/node@22/22.22.1_1/include/node`.

Before admission, a clean configure phase statically scans generated gyp/Makefiles for absolute execs and command tokens while a poisoned-PATH tool-bin of logging shims records every bare child. `provenance/native-toolchain.v1.json` pins the complete transitive closure, including shell, make, clang/clang++, ld/ar, mkdir/rm/touch/cp, Python, xcrun/xcode-select/xcodebuild when actually observed, SDK root/version, and headers by realpath/version/hash. The accepted clean-root rebuild runs again with a default-deny process-exec sandbox allowing only that manifest and fails on an unexpected tool; tests prove every exec was logged/allowlisted. Writes are limited to private install/build/temp roots. Source and target fetches seal distinct cache seeds, copy to writable offline caches, install offline, then run lifecycle plans exactly. A second clean-root rebuild repeats install/lifecycle/native load. Source and target roots never share cache, install, or node_modules.

Committed target profiles `tests/sandbox/stdio.sb.in`, `tests/sandbox/service-server.sb.in`, and `tests/sandbox/service-client.sb.in` plus direct-Node `tools/verify-stdio-parity.mjs` and `tools/verify-service-parity.mjs` fail if enforcement is unavailable. Stdio parity denies all network and probes Project_echo/sibling/live-state/credential/external-write/nonloopback/loopback denials. The server profile permits only its run-owned scratch root and loopback bind/accept, denies outbound connections, and reports its exact `127.0.0.1` or `::1` port through a dedicated readiness FD. Only after that readiness record is parsed may the separately sandboxed client start; the client may connect only to that exact endpoint. Unrelated loopback/nonloopback sentinel access and server outbound attempts must fail. A hostile HOME/npm/Git/PATH/source/sibling/live-daemon sentinel must not affect output.

Before cloning, the target itself must pass `git diff --check`, clean/no-remotes/object checks, and the read-only operator audit. In the private clone, direct-Node dependency/runtime-inventory, evidence/parity, source-versus-target tool fixtures, typecheck, lint, capture/normalize/storage/retrieval tests, service smoke, `tools/check-whitespace.mjs`, source-independence, and sandbox commands must pass. Package-script aliases are never the verification entrypoint. The operator audit recomputes all source blobs/content hashes from the pinned commit, validates dispositions/rewrites against target HEAD, and records rerunnable commands/exits. Unavailable host IPv6 is recorded as an environment limitation rather than silently treated as semantic parity.

### AC8 — Prove local service parity and record the handoff

`tests/integration/context-service.test.ts:1` launches against synthetic `ECHO_CONTEXT_HOME`, binds only loopback port `0`, waits for the dedicated readiness-FD endpoint record before starting clients, and proves ping, capture, search, cluster discovery, body fetch, wait, bounded startup/request/shutdown, and resource cleanup. Each service case owns a process group. Success, timeout, assertion failure, signal, and partial-start paths perform bounded TERM, then KILL, then wait/reap and listener-survivor checks. It never reads or mutates live state and exposes no non-loopback listener.

A single-entry top-level finalizer covers every nonzero exit and catchable signal after the failures-directory bootstrap: export, dependency, lifecycle, audit, sandbox, parity, service, record generation, process stop, and handoff publication. The first cause/status is immutable; reentrant signals set a pending flag and cannot recursively publish or overwrite it. Before coverage, the builder writes retained `<attempt-root>/operator/capsule-publish.c`, compiles it with pinned clang, records source/binary hashes, and the target later commits byte-identical source for tests. The helper accepts an already-open failures-directory FD plus temp/final leaf names and uses descriptor-relative openat/fsync, macOS `renameatx_np(..., RENAME_EXCL)`, and descriptor-relative reopen; unavailable no-replace semantics fail closed. The finalizer terminates/reaps the owned process group and publishes `failures/<sequence>.json` through that helper. Sequence collisions advance to the next of 100 bounded candidates without touching existing bytes. Parent-swap, destination-collision, signal-reentry, and bootstrap-failure tests preserve existing capsules.

Command timeout is 900 seconds; TERM and KILL waits are 5 seconds each. Streams are drained fully without backpressure deadlock while SHA-256 is computed over original bytes. Capsule JSON is canonical UTF-8; binary stdout/stderr/diagnostics are base64 with original-byte hashes and truncation metadata. The serialized outer cap is 2,621,440 bytes and always wins: the serializer allocates measured encoded-byte budget first to required status/path/hash/truncation metadata, then sandbox diagnostics, stderr, and stdout; lower-priority payload is shortened first until the measured final JSON bytes fit. Fault tests use simultaneous binary and escape-heavy over-cap streams and verify exact outer size, full hashes, child reap, and no lost required metadata. If publication fails, scratch/worktree remain and both causes go to stderr/Project_echo log. This item performs no automatic target repair/delete.

After all checks pass, the builder writes `raw/internal/migrations/2026-07-13-135-echo-context.md` in its isolated Project_echo feature worktree. The record contains source SHA, operator-audit and build commands/exits, target path/branch/HEAD/tree, package/lock/provenance/evidence/parity/tool/runtime/dependency hashes, test/service results, no-remotes/clean status, differences, and `authority:false`, `live_state_migrated:false`. The builder commits that record with backlog handoff. It records remote URL hash, exact local commit, destination feature ref, and pre-push `/usr/local/bin/git ls-remote --refs origin <ref>` OID; any non-null OID is terminal before push. It then makes one bounded process-group `/usr/local/bin/git push --porcelain origin <commit>:<ref>`; no autostash/rebase/merge/force/retry is allowed. After every return/timeout/reset it TERM/KILL/wait-reaps the push group, then performs one bounded identical ref probe. Remote OID equal to intended commit is success; a different OID is terminal divergence; unreachable probe records `observed_oid:null`, last-known OID, probe error, and `handoff_status:unknown`. Accept-then-disconnect, timeout-before-update, unreachable-probe, and competing-update fixtures prove no overlapping push and no false failure/success. The local worktree/commit remain on any non-success, and target history is never changed afterward.

Independent review inspects target read-only, runs audit/checks from unique private clone/scratch roots, and compares record hashes. Passing proves only a local source split; the Project_echo daemon/MCP and live state remain authoritative.

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
