---
id: 2026-07-15-137-echo-context-installable-shadow-runtime
title: "Versioned per-user echo-context shadow runtime and exact-artifact founder-Mac proof"
status: proposed
priority: HIGH
estimate: 5d
created: 2026-07-15
blocked_by:
  - 2026-07-15-136-echo-context-canonical-repository-release-substrate
task_state_ref: 2026-07-15-137-echo-context-installable-shadow-runtime
requested_reviewers: ["codex", "cursor"]
files_to_modify:
  - /Users/zhenye/Desktop/echo-context/package.json # runtime build, CLI entrypoint, and prerelease identity
  - /Users/zhenye/Desktop/echo-context/package-lock.json # exact runtime build closure
  - /Users/zhenye/Desktop/echo-context/README.md # shadow-install posture and operator contract
  - /Users/zhenye/Desktop/echo-context/CHANGELOG.md # NEW versioned runtime changes
  - /Users/zhenye/Desktop/echo-context/src/runtime/** # NEW production config, composition root, HTTP/auth, health, and main
  - /Users/zhenye/Desktop/echo-context/src/cli/** # NEW install/lifecycle/status/doctor/uninstall CLI
  - /Users/zhenye/Desktop/echo-context/src/install/** # NEW artifact, layout, secret, launchd, and ownership logic
  - /Users/zhenye/Desktop/echo-context/src/mcp/server.ts # authenticated routing seam without tool-semantic drift
  - /Users/zhenye/Desktop/echo-context/src/echo-home/** # remove runtime dependency on Project_echo onboarding/project defaults
  - /Users/zhenye/Desktop/echo-context/src/storage/interface.ts # adjudicate coordination-specific vocabulary at the runtime boundary
  - /Users/zhenye/Desktop/echo-context/schemas/** # runtime config/install state/artifact manifest contracts
  - /Users/zhenye/Desktop/echo-context/provenance/** # successor runtime inventory and source-artifact linkage
  - /Users/zhenye/Desktop/echo-context/tools/** # deterministic runtime build/verify and shadow ceremony
  - /Users/zhenye/Desktop/echo-context/tests/runtime/** # NEW config/composition/auth/health tests
  - /Users/zhenye/Desktop/echo-context/tests/cli/** # NEW command and machine-readable truth tests
  - /Users/zhenye/Desktop/echo-context/tests/install/** # NEW archive/layout/launchd/ownership tests
  - /Users/zhenye/Desktop/echo-context/tests/security/** # NEW secret and runtime-closure fences
  - /Users/zhenye/Desktop/echo-context/tests/integration/** # production-root and repo-free shadow install proof
  - "/Users/zhenye/Library/Application Support/echo-context/**" # per-user immutable releases/config/secrets/install ownership
  - /Users/zhenye/Library/LaunchAgents/com.echo.context.plist # per-user shadow service definition
  - /Users/zhenye/Library/Logs/echo-context/** # owned bounded service logs
  - /Users/zhenye/.local/bin/echo-context # optional stable user shim owned by the installer
  - /Users/zhenye/.echo-context-shadow/** # disposable shadow-only state
  - raw/internal/migrations/2026-07-15-137-echo-context-shadow-runtime.md # NEW redacted exact-artifact proof
  - raw/internal/agent-runs/** # workflow-owned failure/completion run log
  - backlog/task-state/2026-07-15-137-echo-context-installable-shadow-runtime/** # workflow continuity pointers
  - backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md # proposal and review revisions
  - backlog/ready/2026-07-15-137-echo-context-installable-shadow-runtime.md # watcher-owned promotion target
  - backlog/claimed/2026-07-15-137-echo-context-installable-shadow-runtime.md # workflow claim target
  - backlog/pending_review/2026-07-15-137-echo-context-installable-shadow-runtime.md # workflow handoff target
  - docs/BACKLOG.md # generated stage-derived index
spec_refs:
  - backlog/complete/2026-07-15-136-echo-context-canonical-repository-release-substrate.md # exact private source-artifact handoff
  - backlog/complete/2026-07-13-135-local-echo-context-source-extraction.md # sealed eight-tool and source-independence contract
  - raw/internal/migrations/2026-07-15-136-echo-context-repository-bootstrap.md # source SHA/version/artifact/check evidence
  - raw/internal/decisions/2026-07-15-echo-context-successor-repository-execution.md # founder-authorized cross-repo execution/review protocol
  - raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md # build-once and exact-artifact discipline
  - raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md # context is internal infrastructure, not a second product
  - /Users/zhenye/Desktop/echo-context/schemas/service-api.v1.json # tested service contract to promote from harness to runtime
  - /Users/zhenye/Desktop/echo-context/tools/verify-service-parity.mjs # current test-only composition that must not become production by accident
  - /Users/zhenye/Desktop/echo-context/src/mcp/server.ts # current unauthenticated loopback server and eight registrations
  - /Users/zhenye/Desktop/echo-context/src/echo-home/paths.ts # residual onboarding/project/coord defaults to exclude from runtime
  - /Users/zhenye/Desktop/echo-context/src/mcp/util/role-state-git.ts # task-state implementation outside context runtime ownership
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
target_repo: "/Users/zhenye/Desktop/echo-context"
target_remote: "https://github.com/zhenye0616/echo-context"
target_branch: ""
target_worktree: ""
target_head_sha: ""
target_pr_url: ""
target_landed_sha: ""
project_landed_sha: ""
---

# Versioned per-user echo-context shadow runtime and exact-artifact founder-Mac proof

## Why this spec exists

Item 136 makes echo-context the canonical private source authority and hands off a checksum-bound source artifact, but that artifact is intentionally non-installable. Item 135's service proof is a test harness, package version is extraction-era, there is no production composition root or CLI, and the current MCP server has no bearer-auth boundary. Installing those source bytes directly would confuse test parity with an operable machine service.

This second gate verifies item 136 as the immutable predecessor, implements the runtime on descendant echo-context commits, seals one reviewed item-137 successor source SHA/artifact, and builds one Darwin x64 runtime artifact from that successor. It installs those same runtime bytes as a per-user LaunchAgent on the founder Mac and proves lifecycle, authentication, health, isolation, and repository independence. It runs on a separate shadow port/home with all live capture disabled and authority:false. Project_echo stays live on 38478; item 138 builds/rehearses cutover substrate and item 139 alone migrates live state, rewires clients, and transfers authority.

This is internal ECHO-development infrastructure needed to make unified context available across Codex, Claude Code, and Cursor. It is not a separate commercial product, client release, or Team-product graduation.

## Acceptance Criteria

### AC1 — Add one production composition root with a closed runtime configuration

Add schemas/runtime-config.v1.json, schemas/context-authority.v1.json, and src/runtime/config.ts, authority.ts, composition.ts, and main.ts. The authority schema is closed now for items 138/139: it defines prepared, active, and rolled_back states and required structured bindings for generation; context runtime artifact/config/home/DB/label/port; residual and controller artifact identities; source cut line/digest/backup; capture workers and secret references; client before/after hashes; operator/time; and rollback window. This item ships the validator but creates no live record, and no field may be added during cutover without rebuilding/re-reviewing the runtime. The production root owns one SQLite instance, the exact eight-tool MCP server, the versioned service API already described by schemas/service-api.v1.json, authenticated readiness, and an explicit capture-worker allowlist. Startup is ordered and transactional: validate all config/paths/secrets first, acquire the single-writer lease, open/migrate storage, start allowed workers, then bind HTTP. Failure unwinds in reverse; SIGTERM/SIGINT stop intake, drain bounded requests, stop workers/server, checkpoint/close SQLite, and release the lease within fixed deadlines.

The literal shadow configuration is host 127.0.0.1, port 39478, label com.echo.context, home /Users/zhenye/.echo-context-shadow, authority false, accept_capture false, and capture_workers []. Port 38478 remains Project_echo; 38479 is reserved for the later residual product/loop endpoint. The same runtime bytes and schema must validate the future final home /Users/zhenye/.echo-context, port 38478, explicit capture-worker allowlist, per-adapter credential references, and authority-record reference. The runtime may enter authority true only when that record is schema-valid, binds its exact artifact/config/home/port, and is active; item 137 cannot create such a record, and its install/start commands refuse final activation.

The runtime must not import src/echo-home/paths.ts, onboarding customer/dogfood profiles, project reviewer/spec/coord defaults, src/mcp/util/role-state-git.ts, task-state parsers/tools, review-queue code, or any Project_echo/sibling path. Invalid/unknown config fields, relative/traversing/symlinked/colliding homes, port/label conflicts, non-loopback hosts, and state/config/release overlap fail before opening a DB or socket.

### AC2 — Authenticate every data-bearing loopback route

Refactor src/mcp/server.ts only through a transport/auth seam and add src/runtime/server.ts, auth.ts, and health.ts. Bind IPv4 loopback only, keep Host/DNS-rebinding validation, cap headers/bodies/concurrency, and use constant-time credential comparison. Every /mcp, /mcp/recent-calls, and /v1/* request that reads or writes context requires exactly one Authorization: Bearer header. Missing, wrong, duplicate, query-string, cookie, or malformed credentials are rejected before body parsing and never appear in logs/errors/metrics.

An optional unauthenticated /live endpoint may return only a fixed live:true process signal. Authenticated readiness returns schema version, service version, source/artifact identity, exact eight-tool roster, state-schema status, capture status, and authority false. POST /v1/capture returns 403 in the shadow configuration even with valid auth; read-only service and MCP retrieval remain available over synthetic shadow state.

The MCP roster remains exactly echo_ping, echo_resolve_mru, find_clusters, get_atom, get_atoms, get_recent_work_context, search_memories, and wait_for_new_turns. No install/health/capture/admin operation becomes a ninth MCP tool and no descriptor or response semantics change.

Before sealing the artifact, generate provenance/product-context-consumer-contract.v1.json from a static import/call graph over the named current Project_echo product consumers at pinned commit 9024d5a00a153d422d8e2afcb33435db70aacbb5, plus one explicitly declared future residual operation: idempotent append-with-caller-ID for coordination observation mirroring. The manifest names every root, method, filter/order/cap/ID/error requirement, and source blob; it does not depend on a future legacy-residual composition root. The versioned service API must cover that exact generic subset with local-Storage-equivalent behavior and no product/coordination semantics. Contract tests run each manifest fixture once against local SqliteStorage and once through authenticated HTTP. Item 138 may compose only consumers/operations sealed here; an uncovered operation blocks that item rather than rebuilding this runtime.

### AC3 — Keep credentials out of plists, artifacts, argv, environment, and logs

Add src/install/secrets.ts. Install generates 32 cryptographically random bytes and atomically creates /Users/zhenye/Library/Application Support/echo-context/secrets/mcp-bearer-token under a 0700 directory as a 0600 regular file owned by the current user. The config schema also accepts separately named 0600/owner-checked secret_ref values for capture adapters such as Granola, without reading them while the worker is disabled. Existing symlinks, hardlinks, wrong owner/mode, unexpected content length, or a path outside the owned support root fail. Same-artifact restart/reinstall reuses the MCP credential; no automatic rotation is needed in this item.

Runtime config and the LaunchAgent store only the absolute secret_ref path. Credential bytes must never enter a plist, manifest, artifact, Git object, argv, process environment, install state, status/doctor JSON, readiness response, log, error, or migration record. A repository/artifact/live-file scan proves that boundary without printing the token. Doctor verifies the reference, owner, type, and mode, then proves no-token/wrong-token 401 and correct-token authenticated readiness.

This item does not read, copy, or rotate Project_echo's Slack credential. The exposed legacy plist credential is a blocking preflight owned by item 139 before live cutover.

### AC4 — Build exactly one verified Darwin x64 runtime artifact

Add schemas/runtime-artifact-manifest.v1.json and tools/build-runtime-artifact.mjs and verify-runtime-artifact.mjs. The builder first verifies item 136's source archive, checksum, manifest, source SHA/tree, version, lock hash, and baseline ancestry. After implementation and independent review, it seals the descendant item-137 source SHA/tree as version 0.1.0-dev.137.1 and uses item 136's deterministic source-artifact machinery to emit and verify a successor source archive. The runtime is built exactly once from that committed successor source archive and emits one echo-context-0.1.0-dev.137.1-darwin-x64-runtime.tgz, checksum, SBOM, and manifest.

The manifest binds both lineages: the item-136 predecessor source-artifact SHA-256/manifest/source SHA/tree and the actual item-137 successor source-artifact SHA-256/manifest/source SHA/tree. It also binds runtime version, runtime artifact SHA-256/size, successor package-lock and SBOM hashes, darwin/x64, entrypoint, exact member path/mode/content inventory, authority_capable true, authority_active_at_release false, and authority_activation_requires context-authority.v1.

The runtime artifact bundles the official Node 22.22.1 Darwin x64 distribution verified against its official checksum, including Node's license and required third-party notices; the LaunchAgent invokes that bundled absolute node path. It also contains all six generic capture adapters, the exact native better-sqlite3 closure for that bundled ABI, schemas, CLI, and license/provenance needed to operate and verify it. It includes the authority-record validator and complete generic service contract needed for item 138, but no authority record or migration controller. It excludes source/tests/dev tools/cache, credentials/state/config/logs, absolute build/repository paths, Project_echo/siblings, host Node fallback, /usr/bin/env node, and lifecycle scripts that would rebuild native code on the founder machine.

The artifact is built once in the reviewed release job. All clean-home and real-user installs consume those exact bytes; no npm install, npm rebuild, source checkout, compiler, or alternative artifact is allowed after the artifact hash is recorded. Tamper, wrong platform/Node/source, native ABI mismatch, missing/extra/unsafe member, checksum/SBOM/lock drift, or repository-path leakage fails before extraction.

### AC5 — Install safely as a per-user service with an ownership manifest

Add src/cli/index.ts; CLI commands install, start, stop, restart, disable, status --json, doctor --json, uninstall, internal serve --config, and offline prepare-final --authority-record; and src/install/layout.ts, artifact.ts, launchd.ts, install-state.ts. Refuse root/sudo and /Library/LaunchDaemons. Verify the runtime artifact before extracting through path-traversal/symlink/hardlink/type/mode limits into the immutable owned directory /Users/zhenye/Library/Application Support/echo-context/releases/<version>-<artifact-prefix>/.

The stable shim /Users/zhenye/.local/bin/echo-context may point only to the owned immutable release. The per-user plist /Users/zhenye/Library/LaunchAgents/com.echo.context.plist invokes that release's executable with the owned config path, contains no token or repository path, sets no secret environment variable, and writes only to /Users/zhenye/Library/Logs/echo-context/stdout.log and stderr.log. launchctl actions verify GUI user domain, label, PID/start time, executable realpath, and artifact identity rather than trusting a stale PID file.

Install is idempotent for the same manifest bytes and refuses a foreign label, path, shim, plist, owner marker, or unexpected mutable release. Uninstall disables/bootouts first, removes only files enumerated by the install ownership manifest, and preserves state and secret by default. An explicit purge flag is shadow-only in this item, refuses the final/live home, and requires a stopped matching service. No command touches com.echo.daemon, ~/.echo, Project_echo, client MCP configs, or ports 38478/38479.

prepare-final is the only supported shadow-to-final rebind. It requires the service stopped plus a schema-valid prepared authority record binding the exact artifact, final config/home/port, and transaction journal. It writes protected before images, atomically/replayably updates config, plist, and install-state hashes without changing release bytes, and either completes or restores the shadow definition after crash. It never creates/activates the authority record, starts final capture, rewires clients, or removes the shadow home; item 138/139 may invoke it but may not edit installer-owned files ad hoc.

### AC6 — Make status and doctor report operational truth

status --json and doctor --json emit a versioned schema with installed, runtime_authority, source SHA/tree, source-artifact and runtime-artifact hashes, runtime version, lock/SBOM hashes, label, port, home, PID/start time, executable realpath, launchd state, authenticated readiness, exact tool roster, capture acceptance/worker list, config/plist/secret ownership and modes, listener addresses, repo_dependency, and overall verdict.

Doctor is read-only over installed state and must fail honestly for a stale/mismatched executable, modified release/config/plist, bad modes/ownership/type, port or label collision, non-loopback listener, missing/wrong auth, unexpected tool, DB integrity/schema error, capture enabled, authority true, open repository dependency, or service/launchd disagreement. It never repairs, starts, stops, writes a fixture, or prints a credential. A separate scratch selftest owns write/retrieval proof.

The authoritative completion evidence is machine-readable doctor output plus independently recomputed file/artifact/listener/PID observations; a healthy launchctl status alone is insufficient.

### AC7 — Prove clean-home lifecycle and install the exact same bytes as a live shadow

Add tools/shadow-install-smoke.mjs. First, under a repo-free temporary HOME/support/log/state prefix with ECHO_* variables cleared, verify the checksum, install, start, authenticate, list exactly eight tools, run the service fixture, restart, disable and prove the listener is gone, exercise prepare-final crash/recovery against disposable prepared records without activation, re-enable, uninstall, and prove state/secret preservation. Timeouts terminate the process group and report only bounded redacted stderr.

Then, at a founder execute checkpoint, install the identical runtime artifact bytes into the real per-user paths using label com.echo.context, port 39478, and /Users/zhenye/.echo-context-shadow. Seed only the committed synthetic service fixture through the scratch/selftest path; live capture remains disabled. Prove stop/start/restart and doctor, and leave the shadow installed and healthy with authority:false.

Independent lsof/PID/executable checks must show no open path under Project_echo, /Users/zhenye/.echo, /Users/zhenye/.echo-context, or /Users/zhenye/Library/Application Support/ECHO. Project_echo stays healthy at 38478, 38479 stays unused/reserved, no Claude Code/Codex/Cursor config changes, and no capture worker or live-state write occurs. The live evidence exists only as a protected operator output under the owned Application Support tree; the Project_echo migration record binds its schema/hash plus the same artifact tuple and redacted summary. It is never committed back into the already-landed target source head. This is founder-machine proof for an internal asset, not Team-product FOUNDER LIVE, QUALIFIED, or CLIENT LIVE.

All target changes use an isolated echo-context worktree/feature branch. After independent target review, the founder merges to echo-context/main and readback proves the canonical landed SHA/tree. The successor source and runtime artifacts are then built from a fresh detached clone of that landed SHA, never from the feature worktree. A founder-approved private prerelease durably publishes the exact runtime tgz, manifest, checksum, and SBOM without rebuild, and the installer keeps a mode-0600 owned cache copy; download and cache readback must reproduce the artifact hash used by the real shadow and later cutover.

### AC8 — Preserve context behavior and close the item-135 vocabulary/default-path debt

Consume item 136's successor provenance rather than rewriting frozen item-135 evidence. Runtime inventory and artifact negative fixtures prove that onboarding profiles, project reviewer/spec defaults, task-state Git readers/parsers, coordination producers/tools, review workflow, Project_echo defaults, sibling repository paths, and the test-harness entrypoint do not enter the installed runtime.

Adjudicate opaque historical source vocabulary separately from protocol ownership: context storage/retrieval may preserve and explicitly filter/search existing coord:* atoms as generic captured events because changing that would break retrieval compatibility and rollback, but it must not own coordination semantics, emit coord events, expose coord tools, or ship coordination-specific default configuration. Runtime-facing append-order APIs are generic; any legacy coordination-named compatibility seam stays outside the runtime closure or is covered by a reviewed source-only adapter.

The runtime's only mutable roots are its explicit config support root, selected ECHO_CONTEXT_HOME, secret reference, and logs. It never falls back to ECHO_HOME, ~/.echo, a repository checkout, onboarding.json, projects.json, or Project_echo capture paths. Existing context parity, storage, capture, schema, and service tests remain green; README and CHANGELOG say installed shadow, capture disabled, authority false, and cutover pending.

## Out of Scope (Don't Drift)

- No creation/publication of item 136's remote or source artifact and no rebuild/substitution of its handoff.
- No read/copy/migration of Project_echo's live DB, WAL/SHM, capture checkpoints, onboarding/project state, client config, or credential.
- No enabling fs/git/Granola/Claude Code/Codex/Cursor capture in the real shadow and no live context writes.
- No client rewiring, 38478 takeover, residual 38479 service, old-daemon disable, Project_echo freeze, or runtime/state authority transfer.
- No rotation of the exposed Project_echo Slack token; item 139 blocks on founder completion of that credential boundary.
- No new MCP tool, retrieval semantic, storage schema redesign, embedding/backfill, or product/loop feature.
- No auto-update, public registry/release, other OS/architecture/Node support, root daemon, Fleet, or cross-machine sync.
- No echo-brain/echo-loop install and no Team-product maturity advancement.

## Risks

- A test harness could be mistaken for the production service. AC1 creates a separate closed composition root and artifact entrypoint.
- A Darwin native dependency could rebuild or drift on install. AC4 pins ABI/toolchain, packages the verified native closure, and forbids post-build npm/rebuild.
- The shadow could accidentally become a second writer. Config validation, accept_capture:false, empty worker list, distinct home, and live lsof/state assertions fail that condition.
- Bearer credentials could leak through plist/env/log/status. AC3 uses a file reference with ownership/mode checks and negative scans.
- A foreign LaunchAgent or shim could be overwritten. The installer requires its own ownership manifest and refuses collisions.
- Uninstall/purge could delete user or future live state. Default uninstall preserves both; purge is constrained to the exact stopped shadow home.
- Source-only coordination names could be over-removed and change context retrieval. AC8 preserves opaque event compatibility while excluding protocol ownership/runtime defaults.
- A green status could hide artifact or listener drift. Doctor cross-checks manifest bytes, executable realpath, launchd identity, auth, roster, listener, and storage.

## Tests

- tests/runtime/config.test.ts covers the exact shadow config, a validation-only future final config with capture credential/authority references, active-record/artifact mismatch rejection, unknown/colliding/traversing/symlink/non-loopback rejection, and zero DB/socket mutation on failure.
- tests/runtime/composition.test.ts injects every startup/shutdown failure boundary and proves reverse unwind, bounded drain, SQLite close, lease release, capture disabled, and exact eight-tool registration.
- tests/runtime/auth.test.ts proves missing/wrong/duplicate/query/cookie auth rejection before body read, correct-token access, constant response shape, Host defense, and no token/header logging.
- tests/runtime/service-adapter-conformance.test.ts runs the statically enumerated Project_echo product-consumer Storage subset against local SQLite and authenticated HTTP and compares ordering, filtering, caps, IDs, errors, and restart results.
- tests/install/runtime-artifact.test.ts validates source linkage, platform/ABI, native closure, inventory, SBOM/lock, determinism, and tamper/unsafe-path/repository-leak mutations.
- tests/install/bundled-node.test.ts validates the official Node checksum/license, bundled absolute launch path, ABI match, and rejection of host Node or /usr/bin/env fallback.
- tests/install/launchd.test.ts and tests/cli/lifecycle.test.ts prove plist contents, GUI-user launchctl identity, idempotence, collision refusal, restart/disable/uninstall, state preservation, and constrained purge.
- tests/cli/prepare-final.test.ts injects crashes across config/plist/install-state replacement and proves prepared-record binding, exact recovery, no activation, and unchanged runtime bytes.
- tests/cli/doctor.test.ts covers every required JSON field and injected artifact, plist, owner/mode, auth, listener, roster, DB, capture, authority, and repo-dependency failure.
- tests/security/runtime-closure.test.ts rejects onboarding/task-state/review/coord-producer/default-path/test-harness/sibling imports while allowing opaque coord:* event filtering only.
- tests/integration/shadow-install.test.ts performs the repo-free clean-home lifecycle with the exact artifact; tools/shadow-install-smoke.mjs repeats it on the founder shadow and emits redacted evidence.
- Existing tests/api/context-only-roster.test.ts, tests/integration/context-service.test.ts, storage/capture/retrieval tests, typecheck, lint, runtime inventory, source-artifact verification, and git diff --check remain green.
- Private-release/cache acceptance downloads and rereads the exact tgz, manifest, checksum, and SBOM and reproduces the installed hash without a rebuild.

## After Completion (Strategist Notes)

- Update no wiki page; this is internal machine-context installation, not a shipped commercial surface.
- Mark item 135's onboarding/task-state/coord/default-path/auth debt closed for the installed runtime boundary; live credential rotation and endpoint exposure remain item 139.
- Feed item 138 the sealed runtime/service/authority contracts for rehearsal and item 139 the exact source/runtime artifact tuple, installed executable realpath, shadow label/home/port, doctor schema, roster, and authority:false evidence.
- Do not call Project_echo deprecated: it remains the active full daemon and live-state authority until the separately reviewed item-139 operation succeeds.
