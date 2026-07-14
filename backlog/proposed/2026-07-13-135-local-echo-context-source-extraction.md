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

One assigned builder lane owns `/Users/zhenye/Desktop/echo-context`; sibling lanes never touch it. Existing-target cleanup is founder-owned outside this item; builder aborts on EEXIST. As a precondition, the founder/orchestrator provisions missing `.echo-migration-evidence` and `135` parents one component at a time with non-recursive mode-0700 mkdir after parent owner/mode/device/inode/no-symlink validation. It records that preflight in the Project_echo agent-run log; an absent-parent fixture must succeed, while any pre-attempt failure emits the full diagnostic to stderr and appends it to that stable log. Before target mutation, the orchestrator validates a lowercase UUID attempt ID and creates `/Users/zhenye/Desktop/.echo-migration-evidence/135/<attempt-id>` by one non-recursive mode-0700 mkdir; EEXIST aborts. The builder creates/compiles the retained capsule publisher described in AC8, creates mode-0700 `failures`, opens it with `O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC`, verifies its descriptor tuple, and only then enables top-level finalizer coverage. Every spawn closes all descriptors except an explicit numeric allowlist; the failures FD is never inherited, and only the trusted publisher child receives a controlled duplicate as FD 3 with close-on-exec cleared in that child. A hostile-child fixture enumerates its descriptors and cannot mutate failures. Bootstrap failure before that boundary uses stderr plus the stable Project_echo log and performs no cleanup. After it confirms target-parent integrity, target absence, and prior-process quiescence, the builder's first target mutation is non-recursive `mkdir /Users/zhenye/Desktop/echo-context`; before it no target-path write occurs, and afterward this builder is the only writer inside. It initializes branch `migration/2026-07-13-135` with fixed identity/no remote. `provenance/toolchain.v1.json` pins `/usr/local/bin/git` 2.37.3, `/usr/local/bin/node` 22.22.1, `/usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/bin/npm-cli.js` 10.9.4, shell, native build closure, and sandbox-exec by path/version/hash; every command uses env-i and controlled absolute entry points. Final checks prove target-local storage, no alternate/promisor/replace state, and `git fsck --full`.

This is an attended one-time build. Do not add a Project_echo extraction CLI, daemon, lifecycle state, locks/takeover, publication helper, or recovery framework. An interrupted target is incomplete and unaccepted; the orchestrator inspects and archives it before assigning a fresh run. No agent automatically adopts, deletes, resumes, or repairs it.

The accepted target ends clean with committed local history, exactly the migration branch, and no remote. Its README records scope, pinned source, item, active Project_echo daemon authority, no-live-state rule, and later cutover gate.

### AC2 — Give echo-context accurate capture/retrieval ownership

`/Users/zhenye/Desktop/echo-context/package.json:1` pins Node/npm and owns a committed lockfile. `/Users/zhenye/Desktop/echo-context/src/:1` contains only generic context behavior: capture adapters/gate, normalization/identity, trace/enrichment that remains generic, append-only storage/migrations, source/workspace matching, clustering/search/body retrieval/wait, permissions, health/logging, and context-only MCP/service surfaces.

Direct dependencies derive from final imports plus fixed dev tools at exact versions. `provenance/runtime-inventory.v1.json:1` lists discovered imports, dynamic reads, package scripts, spawned executable names, and JavaScript CLI entry points with owned/excluded rationale; target `tools/check-runtime-inventory.mjs` recomputes them and fails on missing/extra edges. No verification command uses `npm run` or `node_modules/.bin`: each JavaScript CLI launches only as pinned `/usr/local/bin/node <absolute-target-local-js-entry>`, while non-JS tools use approved absolute paths. Package scripts are audited aliases whose tokenized command must match the direct-entry verification plan; a deliberate bare-CLI mutation fails before execution. The actual child PATH is recorded and contains only the verified attempt tool-bin. Product decision/rationale/action extraction, cards/briefs/manual approval/product health, loop coordination/task-state/review tools, and Project_echo/sibling dependencies are forbidden.

### AC3 — Pin and prove the context-only retrieval surface

`context-tools.v1.json:1` registers exactly eight tools: `echo_ping`, `echo_resolve_mru`, `find_clusters`, `get_atom`, `get_atoms`, `get_recent_work_context`, `search_memories`, and `wait_for_new_turns`. Loop coordination/review/task-state and product tools must be absent.

Before target code is finalized, the builder exports the pinned source to scratch, installs from the pinned source lock in a source-only cache/root, launches source MCP over stdio/network-denied, calls `tools/list`, and runs `tests/fixtures/context-tool-parity.v1.json`. Sidecar bytes are exactly lowercase SHA-256 of manifest bytes plus LF and are verified before JSON parsing. Case IDs are unique visible ASCII excluding NUL/LF and byte-sorted. Manifest/canonical responses use UTF-8/LF, recursively sorted object keys, preserved arrays, and failure on undeclared volatile fields; case digest is SHA-256 of canonical response bytes. Aggregate framing is `case-id + NUL + 64-lowercase-hex + LF`. The manifest pins exact request bytes, fresh seed state, fixed clock/random/ID/timeouts, and named volatile JSON pointers only.

The manifest has an explicit per-tool case matrix. Source may expose its full mixed roster; the source projector requires the eight context IDs uniquely present, byte-projects only them, and records/classifies all ignored non-context IDs. Target must expose exactly the eight IDs and no extras. Canonical projection contains `name`, `description`, input/output schemas, and annotations; source/target bytes and aggregate hash must match. Descriptor-only and semantic mutations fail. Each case owns fresh process group/state with readiness barriers and bounded reap.

### AC4 — Own isolated context state and migrations

`src/state/paths.ts:1` resolves mutable state under explicit `ECHO_CONTEXT_HOME` with a local default distinct from echo-brain, echo-loop, and `~/.echo`. `src/storage/:1` owns its schema/migrations, append order, source matching, request logs, and context health. Tests use only synthetic scratch state. Implicit reads, copies, migrations, or mutations of the live context database, checkpoints, credentials, or user config are forbidden.

### AC5 — Resolve Granola overlap without product coupling

`src/capture/granola/:1` may own raw Granola capture only as a generic context source. Decision/rationale/action extraction, post-meeting briefs, intake classifiers, cards, approval, and product health remain excluded. Echo-brain may separately own a minimal product adapter; neither repository imports or synchronizes the other's source. Provenance records the deliberate duplication boundary.

### AC6 — Preserve capture, storage, and retrieval behavior

The pinned inventory is the LF-sorted output of `git ls-tree -r --name-only 2971310441b69735cbe759293abd8c4d044bf347 -- src/capture src/normalize src/storage src/trace src/echo-home src/enrich src/logging src/mcp src/util tests/capture tests/normalize tests/storage tests/trace tests/echo-home tests/enrich tests/logging tests/mcp tests/util`: exactly 211 paths (109 source, 102 test/fixture), SHA-256 `e1fde9ae3f2730572dfaec621dc6531665594696917d81b31b9d997d5fd08f62`.

`provenance/source-evidence.v1.json:1` records source command/SHA, sorted paths, blobs, content hashes, and aggregate/tool hashes. `provenance/parity-matrix.v1.json:1` gives every row one destination/assertion and `ported`, `rewritten`, or `excluded` rationale, explicitly excluding product and loop behavior. Direct-Node `tools/check-parity.mjs` validates exact counts/hash, evidence, one-to-one matrix, and destination assertions without Project_echo access.

Target tests prove capture allow/reject, normalization determinism, identity, SQLite/memory conformance, migrations, append ordering, metadata/current-source matching, clustering/open-loop hints, search pagination, source/session resolution, newest-first body retrieval, caps/truncation, wait semantics, and stateless MCP transport.

### AC7 — Preserve provenance and prove source independence

`provenance/source-extraction.v1.json:1` covers the independently derived 211-path source universe plus every regular tracked file blob at target HEAD. The fixed exclusion set is exactly `provenance/source-extraction.v1.json` itself; every other tracked blob must have one row, and untracked build/install output is outside HEAD rather than excluded. Paths are normalized/byte-sorted and hashes SHA-256. Source-backed and target-only dispositions have strict conditional fields; dirty source bytes, symlinks, submodules, escaping reads/imports, and sibling/Project_echo dependencies fail.

After target HEAD is committed, every verifier treats the shared target read-only, records its exact 40-hex HEAD and tree, creates a unique private `git clone --no-local --no-hardlinks` at that exact commit, detaches HEAD, removes `origin`, proves no remotes/alternates/promisor/replace state, and rechecks that shared HEAD/tree did not move.

Source and target dependency acquisition use separate roots/caches/manifests. Every root has mode 0700 beneath the attempt; `HOME`, `XDG_CONFIG_HOME`, `TMPDIR`, `TMP`, and `TEMP` point there, empty 0600 npm user/global configs are explicit, and default temp paths must remain unchanged. `PATH` contains only `<attempt-root>/tool-bin`; every JavaScript CLI is invoked as `/usr/local/bin/node <absolute-js-entry>`.

Npm never has network access. Retained `<attempt-root>/operator/fetch-lock-deps.mjs` (later byte-identical target copy) parses lock URLs, requires HTTPS/exact hosts, validates DNS plus TLS SNI/certificate, tracks visited URLs, permits at most 5 redirects only to exact lock-listed URLs, and rejects DNS changes. Each response is capped at 268,435,456 bytes; aggregate quarantine is capped at 2,147,483,648 bytes while reserving 536,870,912 bytes for failure evidence. It downloads to no-follow partials, drains/hashes, verifies integrity, no-replace admits, and removes only its exact partial on failure. A network-denied step cache-adds byte-sorted admitted tarballs, then source and target installs each invoke exact `/usr/local/bin/node /usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/bin/npm-cli.js ci --offline --ignore-scripts --no-audit --no-fund --cache <own-cache> --userconfig <empty-0600> --globalconfig <empty-0600>` under the default-deny sandbox. Project `.npmrc` must be absent or canonical empty and all inherited npm-config environment keys are stripped. The exec policy proves ci spawned no lifecycle child; only commands explicitly listed in `lifecycle-plan.v1.json` may run afterward. Wrong-host/same-IP, cyclic/unlisted redirects, DNS rebinding, oversized/aggregate-quota, short/tampered, unlisted URL, hostile `.npmrc`, and install/postinstall-write fixtures fail while capsule reserve remains. Path/link/workspace/Git lock resolutions fail.

The verifier writes `provenance/lifecycle-plan.v1.json` from locked package manifests. Each package is `no-script`, `verified-packaged-artifact`, or names one exact offline rebuild command, working directory, inputs, outputs, SDK/header set, and executable closure. The current `better-sqlite3` row must either verify a lock/package-owned ABI-compatible `.node` artifact or run `/usr/local/bin/node /usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js rebuild --release --directory <private-install>/node_modules/better-sqlite3 --nodedir /usr/local/Cellar/node@22/22.22.1_1` under deny-all network. `provenance/node-headers.v1.json` hashes every consumed file under `/usr/local/Cellar/node@22/22.22.1_1/include/node`.

Native builds use prevention rather than an unprivileged tracing claim. Committed `native-toolchain.v1.json` is a closed executable manifest derived from the lifecycle plan and generated gyp/Makefile command tokens; it pins every allowed executable realpath/hash plus compiler, linker, SDK, and header closure. Retained `<attempt-root>/operator/exec-policy-probe.mjs` renders a sandbox-exec profile with default `deny process-exec` and literal allow rules only for that manifest, launches an allowed nested fork/spawn and direct absolute executable, then proves an unlisted PATH and direct-absolute sentinel are denied before any native build. The readiness result and rendered-profile hash are create-new evidence; unavailable enforcement, malformed profile, or denied allowed-probe fails closed. Both clean rebuilds run under that profile, use exact lifecycle commands, rescan generated command files, and require the static executable set to equal the manifest before and after; unexpected or tampered tools cannot execute. Writes stay in private roots and source/target cache/install roots remain separate.

Committed target profiles `tests/sandbox/stdio.sb.in`, `tests/sandbox/service-server.sb.in`, and `tests/sandbox/service-client.sb.in` plus direct-Node `tools/verify-stdio-parity.mjs` and `tools/verify-service-parity.mjs` fail if enforcement is unavailable. Stdio parity denies all network and probes Project_echo/sibling/live-state/credential/external-write/nonloopback/loopback denials. The server profile permits only its run-owned scratch root and loopback bind/accept, denies outbound connections, and reports its exact `127.0.0.1` or `::1` port through a dedicated readiness FD. Only after that readiness record is parsed may the separately sandboxed client start; the client may connect only to that exact endpoint. Unrelated loopback/nonloopback sentinel access and server outbound attempts must fail. A hostile HOME/npm/Git/PATH/source/sibling/live-daemon sentinel must not affect output.

Before cloning, the target itself must pass `git diff --check`, clean/no-remotes/object checks, and the read-only operator audit. In the private clone, direct-Node dependency/runtime-inventory, evidence/parity, source-versus-target tool fixtures, typecheck, lint, capture/normalize/storage/retrieval tests, service smoke, `tools/check-whitespace.mjs`, source-independence, and sandbox commands must pass. Package-script aliases are never the verification entrypoint. The operator audit recomputes all source blobs/content hashes from the pinned commit, validates dispositions/rewrites against target HEAD, and records rerunnable commands/exits. Unavailable host IPv6 is recorded as an environment limitation rather than silently treated as semantic parity.

### AC8 — Prove local service parity and record the handoff

`tests/integration/context-service.test.ts:1` launches against synthetic `ECHO_CONTEXT_HOME`, binds only loopback port `0`, waits for the dedicated readiness-FD endpoint record before starting clients, and proves ping, capture, search, cluster discovery, body fetch, wait, bounded startup/request/shutdown, and resource cleanup. Each service case owns a process group. Success, timeout, assertion failure, signal, and partial-start paths perform bounded TERM, then KILL, then wait/reap and listener-survivor checks. It never reads or mutates live state and exposes no non-loopback listener.

A retained non-shipping `<attempt-root>/operator/run-extraction.mjs` owns the run-wide finalizer and invokes exact suites `tests/{fetch,native-exec,capsule,signal,byte-budget,handoff}.test.mjs` from that operator root. Bootstrap argv is `/usr/local/bin/node <runner> --source-repo <pin-repo> --source-sha <sha> --target <path> --evidence-root <attempt> --project-worktree <builder-worktree> --project-expected-parent <sha> --project-claim-ref <full-ref>` under env-i/attempt HOME/PATH; each suite has create-new logs/results. The target repo and every extraction suite remain network-denied; only the later handoff child receives endpoint/auth capabilities. These one-shot evidence files are permitted by the no-controller boundary and never ship in target.

Finalizer first cause/status is immutable and reentry cannot overwrite it. Qualified `<attempt-root>/operator/schemas/capsule.v1.schema.json` rejects unknown fields and requires: `schema_version` constant 1; 36-byte attempt UUID; phase and cause strings at most 128 UTF-8 bytes each; status enum; monotonic timestamps; argv array at most 256 elements/4096 bytes each; PID/PGID/session/start token; exit/signal/timeout; stdout/stderr `{byte_count,sha256,retained_base64,truncated}`; survivor/listener/writer arrays at most 256 bounded rows; and publisher/tool/profile hashes. Retained `capsule-publish` invocation is `capsule-publish --directory-fd 3 --attempt <uuid> --candidate-start 0`; canonical recursively key-sorted UTF-8 JSON plus LF arrives on stdin and no other FD is inherited. Candidate `i=000..099` uses final `failure-<uuid>-<i>.json` and temp `.failure-<uuid>-<i>.tmp`. Relative to failures FD, publisher openat-creates temp with `O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC` 0600, completely writes/fsyncs, calls `renameatx_np(failures_fd,temp,failures_fd,final,RENAME_EXCL)`, fsyncs directory, descriptor-reopens final no-follow, and verifies inode/hash. Temp or final collision advances deterministically without unlinking existing entries. Finalizer coverage begins only after schema/publisher hashes, failures descriptor, FD inheritance probe, and a create-new publisher readiness result all pass.

Every command and Git probe has a fresh process group, attempt-owned descendant ledger keyed by PID/start token, monotonic 900-second timeout, and 5-second TERM/KILL/wait boundaries after every exit including zero. Retained hash-pinned `process-watch` publishes a pre-exec started row, polls `sysctl(KERN_PROC_ALL)` to retain descendant identity across reparenting, and snapshots pinned `/usr/sbin/lsof -nP -F0` for attempt-root writers and TCP/UDP listeners; readiness fixtures prove both observation paths before real commands. The runner refuses later launches after its shutdown latch trips, signals tracked detached descendants as well as the original group, and fails closed if observation is unavailable. Streams drain incrementally while hashing original bytes. Canonical UTF-8 capsule base64-encodes binary and records truncation. Required metadata has bounded schema sizes; measured serialized size must be `<= 2,621,440` bytes, not padded to equality. Budget priority is required metadata, diagnostics, stderr, stdout; lower priority truncates first. Adversarial tests verify caps, hashes, descriptor closure, detached-child/listener/writer reap, and metadata. Publication failure retains scratch/worktree. No target repair/delete occurs.

After checks, builder records exact Project_echo HEAD/tree plus a clean worktree/index baseline, stages only the task item, its builder task-state pointer, one exact `raw/internal/agent-runs/<date>-<item-id>.md`, one exact migration record, and generated `docs/BACKLOG.md`; wildcard allowlists are forbidden. It compares the NUL-delimited staged path set with those per-attempt paths, requires empty unstaged/unexpected-untracked state, runs `git diff --cached --check`, commits once, proves the committed tree differs from the frozen parent only at the allowlist, and then requires clean state. Unrelated state aborts without stash/reset/cleanup. The migration record contains only pre-commit-stable fields and evidence hashes, never its own OID or post-push status.

Distinct post-verification `<attempt-root>/operator/handoff.mjs` owns network/auth. Its exact invocation is `/usr/local/bin/node <handoff> --project-worktree <builder-worktree> --expected-parent <40hex> --commit <40hex> --ref refs/heads/<claimed-branch> --endpoint <literal-https-endpoint> --endpoint-hash <sha256> --receipt-dir-fd 3 --credential-fd 4`; only FDs 0,1,2,3,4 exist. Immediately before network it revalidates Project_echo HEAD/tree/clean state/claimed full ref/allowlisted parent diff and requires `--commit` equal that frozen HEAD. Echo-context remains network-inaccessible and is never published.

The endpoint policy accepts only `https://github.com:443/<expected-owner>/<expected-repo>.git` after exact normalized owner/repo matching and rejects redirects, userinfo, alternate ports, IP literals, scp/file/ext/git/ssh forms, pushurl, multiple URLs, URL rewrites, proxies, hooks, implicit tags, submodules, and push options. Git runs under `env -i` with attempt HOME/XDG, `GIT_CONFIG_NOSYSTEM=1`, empty global config, disabled askpass/terminal/SSH/proxy variables, protocol allowlist `https`, isolated CA settings, and one hash-pinned credential helper that reads only FD 4; no credential fallback exists. Preprobe is pinned Git `ls-remote --refs <literal-endpoint> <full-ref>` and requires exit 0 plus exactly zero well-formed rows. The sole push is `git push --porcelain --no-verify --force-with-lease=<full-ref>: <literal-endpoint> <project-commit>:<full-ref>`; this expected-absent lease is the only force form. After group quiescence, one identical bounded postprobe runs. No retry.

The outcome table is exhaustive. Preprobe timeout/nonzero/malformed/nonzero-row means `push_attempted:false`, null push/postprobe fields, and conclusively `not_updated` because no push process existed. Once push is attempted: postprobe intended OID means `success`; a different well-formed OID means `divergence`; timeout/nonzero/malformed/multiple/zero rows means `unknown` regardless of push exit; no post-attempt zero-row case is called not-updated. Push exit/signal/porcelain fields are evidence, never a substitute for the postprobe. Fixtures cover every Cartesian push exit/signal and postprobe class, delayed completion, accept-disconnect, and competing updates.

Create-new retained `handoff/receipt.v1.json` atomically records attempt, frozen Project_echo parent/commit/tree/ref, endpoint hash, credential-helper hash, push-attempted flag, bounded preprobe/push/postprobe records, last-known/observed OID, and final status. Each raw stream is hashed/count-tracked incrementally, retains at most 262,144 bytes as base64 with truncation flag, and the complete canonical receipt is capped at 1,048,576 bytes. Every terminal outcome publishes by no-follow create-new temp, file fsync, `renameatx_np(...,RENAME_EXCL)`, parent-directory fsync, and descriptor-relative reopen/hash. Local worktree/commit remain on non-success; target history is unchanged.

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
- `<attempt-root>/operator/tests/fetch.test.mjs` and `native-exec.test.mjs` — hostile URL/quota/npm lifecycle cases and fail-closed default-deny executable closure under the retained one-shot runner.
- `<attempt-root>/operator/tests/capsule.test.mjs`, `signal.test.mjs`, and `byte-budget.test.mjs` — descriptor-anchored no-replace publication, reentry, and serialized cap.
- `<attempt-root>/operator/tests/handoff.test.mjs` — exact Project_echo commit/ref binding, HTTPS/auth isolation, expected-absent lease, bounded receipt, exhaustive outcome table, and competing updates.
- Migration record review — target HEAD/tree, commands, no-remotes, clean status, and false-authority/live-state evidence.

## After Completion (Strategist Notes)

- Do not switch daemon/MCP or migrate live state.
- Propose remote, service installation, state migration/rollback, and authority transfer separately after local parity.
- Echo-brain must later consume a versioned read-only context contract, never echo-context source or mutable database files.
