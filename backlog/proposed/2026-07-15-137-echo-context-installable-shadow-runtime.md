---
id: 2026-07-15-137-echo-context-installable-shadow-runtime
title: "Versioned per-user echo-context shadow runtime and exact-artifact founder-Mac proof"
status: proposed
priority: HIGH
estimate: 4d
created: 2026-07-15
blocked_by:
  - 2026-07-15-136-echo-context-canonical-repository-release-substrate
task_state_ref: 2026-07-15-137-echo-context-installable-shadow-runtime
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - /Users/zhenye/Desktop/echo-context/package.json # runtime build, CLI entrypoint, and 0.1.0-dev.137.1 identity
  - /Users/zhenye/Desktop/echo-context/package-lock.json # exact runtime and native dependency closure
  - /Users/zhenye/Desktop/echo-context/README.md # capture-off shadow posture and operator contract
  - /Users/zhenye/Desktop/echo-context/CHANGELOG.md # versioned runtime changes
  - /Users/zhenye/Desktop/echo-context/src/runtime/** # NEW config, composition root, auth, health, logging, and main
  - /Users/zhenye/Desktop/echo-context/src/cli/** # NEW install/lifecycle/status/doctor/uninstall commands
  - /Users/zhenye/Desktop/echo-context/src/install/** # NEW artifact, bootstrap, layout, secret, launchd, and ownership logic
  - /Users/zhenye/Desktop/echo-context/src/mcp/server.ts # authenticated transport seam without tool-semantic drift
  - /Users/zhenye/Desktop/echo-context/src/echo-home/** # remove runtime dependency on Project_echo onboarding/default paths
  - /Users/zhenye/Desktop/echo-context/src/storage/interface.ts # keep runtime-facing storage vocabulary generic
  - /Users/zhenye/Desktop/echo-context/schemas/** # runtime config, authority projection, artifact, status, doctor, and install schemas
  - /Users/zhenye/Desktop/echo-context/provenance/** # successor source/runtime inventory and predecessor linkage
  - /Users/zhenye/Desktop/echo-context/tools/** # deterministic runtime build/verify and shadow smoke
  - /Users/zhenye/Desktop/echo-context/tests/runtime/** # config/composition/auth/writer-lock tests
  - /Users/zhenye/Desktop/echo-context/tests/cli/** # lifecycle and machine-readable truth tests
  - /Users/zhenye/Desktop/echo-context/tests/install/** # bundle/bootstrap/layout/launchd/transaction tests
  - /Users/zhenye/Desktop/echo-context/tests/security/** # secret and runtime-closure fences
  - /Users/zhenye/Desktop/echo-context/tests/integration/** # repo-free candidate and real-shadow proof
  - "/Users/zhenye/Library/Application Support/echo-context/**" # owned immutable releases/config/secrets/install state
  - /Users/zhenye/Library/LaunchAgents/com.echo.context.plist # per-user capture-off shadow service
  - /Users/zhenye/Library/Logs/echo-context/** # owned bounded runtime logs
  - /Users/zhenye/.echo-context-shadow/** # isolated synthetic shadow state
  - raw/internal/migrations/2026-07-15-137-echo-context-installable-shadow-runtime-*-delegated-approval.md # coordinator-only exact-operation authorizations
  - raw/internal/migrations/2026-07-15-137-echo-context-shadow-runtime.md # NEW redacted landing/artifact/install evidence
  - raw/internal/agent-runs/** # workflow-owned failure/completion run log
  - backlog/task-state/2026-07-15-137-echo-context-installable-shadow-runtime/** # workflow continuity pointers
  - backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md # proposal and review revisions
  - backlog/ready/2026-07-15-137-echo-context-installable-shadow-runtime.md # watcher-owned promotion target
  - backlog/claimed/2026-07-15-137-echo-context-installable-shadow-runtime.md # workflow claim target
  - backlog/pending_review/2026-07-15-137-echo-context-installable-shadow-runtime.md # workflow handoff target
  - backlog/complete/2026-07-15-137-echo-context-installable-shadow-runtime.md # coordinator-owned completion move
  - docs/BACKLOG.md # generated stage-derived index
spec_refs:
  - backlog/complete/2026-07-15-136-echo-context-canonical-repository-release-substrate.md # exact landed source-only predecessor
  - raw/internal/migrations/2026-07-15-136-echo-context-repository-bootstrap.md # canonical six-field predecessor tuple
  - backlog/complete/2026-07-13-135-local-echo-context-source-extraction.md # sealed eight-tool and source-independence contract
  - raw/internal/decisions/2026-07-15-echo-context-successor-repository-execution.md # cross-repository and shadow-execute protocol
  - raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md # coordinator authority and exact-operation record contract
  - raw/internal/decisions/2026-07-16-136-defer-github-hosted-gates.md # all hosted release surfaces remain deferred
  - backlog/inbox/2026-07-16-140-echo-context-hosted-ci-and-release-governance.md # parked owner of tags/releases/assets/hosted gates
  - raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md # exact-artifact discipline without maturity advancement
  - raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md # context remains internal infrastructure
  - /Users/zhenye/Desktop/echo-context/schemas/service-api.v1.json # existing generic service contract to serve in production
  - /Users/zhenye/Desktop/echo-context/tools/verify-service-parity.mjs # test-only composition that must not become production
  - /Users/zhenye/Desktop/echo-context/src/mcp/server.ts # current loopback server and exact eight registrations
  - /Users/zhenye/Desktop/echo-context/src/echo-home/paths.ts # residual onboarding/project defaults excluded from runtime
  - /Users/zhenye/Desktop/echo-context/src/mcp/util/role-state-git.ts # task-state implementation excluded from runtime
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
target_repo: "/Users/zhenye/Desktop/echo-context"
target_remote: "https://github.com/zhenye0616/echo-context.git"
target_branch: ""
target_worktree: ""
target_head_sha: ""
target_pr_url: ""
target_landed_sha: ""
project_landed_sha: ""
---

# Versioned per-user echo-context shadow runtime and exact-artifact founder-Mac proof

## Why this spec exists

Item 136 completed a source-only DEV substrate. Its handoff is not an archive file or hosted release: it is canonical echo-context commit `78bf523e87c8b9986d31ba28fdf987cf6ea66c29`, tree `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`, version `0.1.0-dev.136.1`, source-archive SHA-256 `3e7a76c930e7198bbf03b7b13390f5eb2341702d2d3c61ba6d89d00090647bef`, lock hash `13ead528470d91adfc4456d349ae628f03f768ba51d78aee8d0b2c42dc12784b`, manifest hash `6a5def0ec7ca27f9230c587f5f9e2bb7caedb0253171198a7bde380877a26e01`, and Project evidence commit `e0506f30c399819305c5aa94e85acce407e738ca`. Item 137 must independently rebuild and verify that tuple before changing target source.

This gate turns a reviewed descendant of that source into one authenticated, capture-off, per-user shadow service. The exact reviewed bytes are installed at `127.0.0.1:39478` with isolated synthetic state while Project_echo stays authoritative at 38478. It proves the runtime and install boundary only. Hosted publication remains parked in item 140; cutover, residual consumers, live data, client rewiring, rollback, and the two successors replacing historical item 139 remain later work.

## Acceptance Criteria

### AC1 — Reconcile the exact predecessor and add one closed production runtime

Before a target branch is created, fetch canonical `echo-context/main`, require it to equal the item-136 commit/tree above, and rebuild and verify the complete six-field tuple in a fresh no-local clone. Any mismatch blocks the item; no copied item-136 artifact, mutable checkout byte, alternate SHA, or local stale `main` is accepted.

Add `schemas/runtime-config.v1.schema.json`, `schemas/context-authority.v1.schema.json`, and `src/runtime/config.ts`, `authority.ts`, `composition.ts`, and `main.ts`. The production root owns one SQLite instance, the existing generic service API, authenticated readiness, and exactly the eight MCP tools. Its literal shadow config is host `127.0.0.1`, port `39478`, label `com.echo.context`, home `/Users/zhenye/.echo-context-shadow`, `authority:false`, `accept_capture:false`, and `capture_workers:[]`.

The authority projection is deliberately minimal: schema version, generation, state `prepared|active|rolled_back`, runtime artifact/config/home/DB/label/host/port identities, and capture-worker plus secret-reference bindings. Controller, residual, source-cut, backup, client-transform, operator-window, and rollback-journal fields do not enter this runtime schema. `authority:true` requires an `active` record matching every runtime/config identity; item 137 creates no authority record and no item-137 command can write or activate one.

The plist supplies only absolute `--config` and `--log-dir` paths. Before parsing configuration, loading native modules, reading secrets, or touching the writer lock/SQLite, the runtime validates the current-user 0700 log directory and opens its 0600 non-link bounded startup sink. Every later pre-listener fatal path writes one typed credential-redacted record there. If even that first open fails, the process exits successfully to suppress launchd restart-on-failure; `status`/`doctor` must then report `startup_logging_unavailable` from independent path and stopped-job evidence. Other deterministic config/secret/permission failures likewise log and exit successfully; only typed transient failures and unexpected crashes exit nonzero and may trigger launchd retry. The launchd-equivalent test matrix proves no silent 10-second failure loop with stdout/stderr at `/dev/null`.

Startup then validates config, paths, and secrets; acquires `flock(2) LOCK_EX|LOCK_NB` on the current-user 0600 regular non-link `<home>/writer.lock`; opens/migrates SQLite; starts enabled workers; and binds HTTP. The runtime process itself holds the close-on-exec descriptor until after SQLite closes. A loser exits before storage or socket access. Shutdown stops intake, drains bounded requests, stops workers/server, checkpoints/closes SQLite, and releases the lock. No owner sidecar, refusal record, supervisor, or second restart authority exists.

### AC2 — Authenticate every data route and keep credentials out of artifacts and process state

Refactor `src/mcp/server.ts` only through a transport/auth seam and add `src/runtime/server.ts`, `auth.ts`, and `health.ts`. Bind IPv4 loopback only, preserve Host/DNS-rebinding defense, cap headers/bodies/concurrency, and compare decoded credentials in constant time. Every `/mcp`, `/mcp/recent-calls`, and `/v1/*` data request requires exactly one bearer header; missing, wrong, duplicate, query, cookie, or malformed credentials fail before body parsing and never enter diagnostics. With `accept_capture:false`, authenticated `POST /v1/capture` always returns typed `403 capture_disabled` before reading its body. An unauthenticated `/live` may return only fixed process liveness. Authenticated readiness reports version/artifact identity, exact roster, storage status, capture disabled, and authority false.

Install creates 32 cryptographically random bytes, encodes them as unpadded base64url, and writes exactly 43 ASCII bytes plus one LF at the resolver-selected `secrets/mcp-bearer-token`, a 0600 regular non-link file inside a current-user 0700 directory. The only accepted header grammar is `Authorization: Bearer <43 canonical base64url characters>` with no padding or whitespace; runtime strips exactly the file's one terminal LF, decodes exactly 32 bytes, and fixed-length-compares those bytes. Candidate mode resolves the file beneath the disposable root; the real shadow resolves it beneath `/Users/zhenye/Library/Application Support/echo-context`. Config and plist contain only the absolute `secret_ref`. Reinstall reuses only a canonical owner/mode/type/length-valid credential and otherwise refuses—never rotates implicitly. Token bytes never enter Git, artifacts, manifests, argv, environment, plist, install state, JSON output, logs, errors, or evidence. This item never reads or rotates Project_echo credentials.

The roster remains `echo_ping`, `echo_resolve_mru`, `find_clusters`, `get_atom`, `get_atoms`, `get_recent_work_context`, `search_memories`, and `wait_for_new_turns`. No ninth tool, Project-specific product-consumer graph, speculative residual operation, coordination producer, or descriptor/response semantic is added.

### AC3 — Build one locally staged, exact runtime installation bundle from landed source

Add the deterministic runtime builder/verifier and `schemas/runtime-artifact-manifest.v1.schema.json`. Before implementation review, the builder may produce non-release candidate bundles for tests only; candidates never enter real user paths or completion evidence. After independent review, a delegated target-main authorization, target landing, and canonical readback, the coordinator uses a fresh detached clone of the landed target SHA to build version `0.1.0-dev.137.1` once from its independently rebuilt successor source archive.

The completed local bundle has exactly four typed assets: runtime tgz, canonical runtime manifest, SBOM, and self-contained POSIX-sh bootstrap. The manifest binds the exact item-136 tuple, actual successor source SHA/tree/version/source-archive/lock/manifest tuple, runtime tgz and SBOM names/sizes/modes/SHA-256 values, bootstrap name/size/mode/SHA-256, Darwin x64, entrypoint, package-lock hash, exact member inventory, `authority_capable:true`, and `authority_active:false`. The separate delegated installation record binds the runtime manifest's own SHA-256 and every typed asset hash, closing the non-self-referential trust chain.

The only network build input is the official `https://nodejs.org/dist/v22.22.1/node-v22.22.1-darwin-x64.tar.gz`, fetched with `/usr/bin/curl --proto '=https' --tlsv1.2 --location --fail --show-error` into a fresh build-input directory and required to match SHA-256 `07b13722d558790fca20bb1ecf61bde24b7a4863111f7be77fc57251a407359a` before extraction. No cache or host-Node fallback is permitted. The tgz bundles that Node distribution's license/notices, the package-lock-pinned `better-sqlite3` and writer-lock closure, generic capture adapters, the manifest-bound synthetic fixture, schemas, CLI, and runtime provenance. The runtime manifest records Node ABI, Mach-O architecture, and every native `.node` member's path/mode/SHA-256; the bundled Node must load each addon in a build-time probe. The bundle excludes source/tests/dev tools/cache, credentials/state/config/logs, host Node/npm/compiler fallback, lifecycle rebuild scripts, absolute repository paths, Project_echo/siblings, and workflow/coordination code. A bounded architecture preflight rejects an incompatible Intel/Apple-Silicon/Rosetta state before real-path mutation; the staged bundled Node is probed before config, secret, plist, or service mutation.

No completed bundle is tagged, uploaded, downloaded as a release asset, published, or named a release; the fixed official Node acquisition above is the sole network exception. There is no release FSM, approval-file challenge, remote asset reconciliation, or private prerelease. If the final build is interrupted or ambiguous, the item stops for coordinator reconciliation; no automatic rebuild, adoption, alternate output, or hidden second artifact is permitted.

### AC4 — Install with one layout resolver, one lifecycle lock, and launchd owning the runtime directly

Add CLI commands `install`, `start`, `stop`, `restart`, `status --json`, `doctor --json`, `uninstall`, `internal serve --config --ready-fd`, and `internal seed-fixture`, plus one closed layout resolver for support, release, state, log, secret, plist, label, port, and GUI-domain values. There is deliberately no `disable` command and no invocation of `launchctl enable|disable`; preflight refuses a pre-existing disabled override for the label rather than taking ownership of persistent GUI-domain state. Refuse root/sudo, LaunchDaemons, symlinked/traversing paths, foreign ownership, and collisions. Candidate mode requires `--candidate-root <absolute-root>`, a run-unique `com.echo.context.candidate.<id>` label, port `0`, and `--no-launchd`; every filesystem path stays below that root. `internal serve` writes exactly one schema-valid `{pid,port,generation}` record plus LF to the inherited ready FD only after loopback bind, and never writes it to stdout/stderr or a shared path. The harness spawns it as a detached process group, owns that pipe, and uses the returned kernel-selected port. The GUI domain is not claimed to be below a filesystem root.

Every mutating lifecycle command and offline fixture seed takes `flock(2) LOCK_EX` on one current-user 0600 regular-file `lifecycle.lock` before recovery/state reads and holds it through filesystem, SQLite, and launchd convergence. `status` and `doctor` take `LOCK_SH` around their complete multi-source observation; failure to acquire within five seconds emits one schema-valid `busy:true` timeout result and exits 4 rather than mixing generations. This lock is distinct from the runtime writer lock. The one permitted pre-intent bootstrap is creating or validating the exact 0700 support root plus empty lock file; a crash there is recoverable only when the root is empty and owner/mode/type match. Before any other real-path mutation, install durably writes an intent enumerating every release/config/secret/log/plist/state path, stages verified bytes, atomically commits the immutable release and ownership receipt, and only then loads the job. Rerun verifies and adopts, rolls back only enumerated owned paths, or refuses. Uninstall bootouts first, removes only receipt-owned install bytes, and preserves secret and shadow state.

The real plist directly invokes the bundled Node/runtime with absolute `--config` and `--log-dir`. It pins `RunAtLoad:true`, `KeepAlive:{SuccessfulExit:false}`, and `ThrottleInterval:10`; stdout/stderr go to `/dev/null`. The runtime, not a supervisor, owns listener, SQLite, writer lock, and one internally rotated current-user log sink capped at 5 MiB per chunk, four chunks, and 32 MiB aggregate.

For `U=/usr/bin/id -u`, domain `gui/$U`, and service `gui/$U/com.echo.context`, the only mutating vectors are `/bin/launchctl bootstrap gui/$U <absolute-plist>`, `/bin/launchctl bootout gui/$U/com.echo.context`, `/bin/launchctl kickstart -k gui/$U/com.echo.context`, and `/bin/launchctl kill SIGTERM gui/$U/com.echo.context`; `/bin/launchctl print` and `print-disabled` are the read-only probes. Source-owned exit mapping treats print-not-found and bootout-not-found as already absent, bootstrap-already-loaded as verify-then-adopt, and every other nonzero as typed failure. `start` bootstraps an absent job or kickstarts a verified loaded/stopped job; `stop` sends SIGTERM and waits for job/PID/listener absence; `restart` stops to convergence then bootstraps; uninstall bootouts to convergence before byte removal. No command changes persistent disabled overrides. Each transition has fixed 30-second job/PID/listener deadlines. No stable user shim, purge, `prepare-final`, supervisor child, last-exit file, or competing restart mechanism exists.

### AC5 — Make status and doctor return bounded machine-readable truth

Add `schemas/status.v1.schema.json` and `schemas/doctor.v1.schema.json`. Each JSON command emits exactly one canonically serialized UTF-8 document plus one LF on stdout for healthy, unhealthy, usage, not-installed, timeout, and internal-error outcomes; stderr is bounded, redacted, and credential-free. Exit precedence is usage `2`, not installed `3`, internal error `5`, probe timeout `4`, unhealthy `1`, healthy `0`. Every probe has a fixed timeout.

The schemas report `busy`; installed state; predecessor and successor source/runtime identities; version and SBOM/lock hashes; label/port/home; direct runtime PID/start time/executable realpath; launchd state; authenticated readiness; exact roster; capture/authority state; config/plist/secret ownership and modes; listener addresses; writer-lock state; startup-logging state; effective log inventory/caps; repository dependency; and overall verdict. Doctor independently recomputes installed-byte, plist, process, listener, auth, roster, SQLite, capture, authority, permission, architecture, startup logging, bounded-log, and repo-independence truth while holding the shared lifecycle lock. It never repairs, starts, stops, writes fixtures, or prints credentials. No supervisor, owner-sidecar, last-refusal, or last-exit fields exist.

### AC6 — Prove a clean candidate, authorize exact operations, and leave one healthy real shadow

`tools/shadow-install-smoke.mjs` performs the repo-free candidate lifecycle from the four protected bundle assets under a disposable root with inherited `ECHO_*`, Node, npm, and repository paths absent. It verifies the bundle, installs with `--no-launchd`, runs `internal seed-fixture --config <absolute> --fixture <manifest-bound-path> --expected-sha256 <digest>` while the service is stopped and under both lifecycle and writer locks, then starts the installed runtime in one owned foreground process group on port 0. The seed operation accepts only the committed manifest member, uses a fixture ID+digest transaction marker for idempotence, and refuses any different/repeated payload; there is no online write path. The smoke authenticates, lists exactly eight tools, exercises that fixture, proves `POST /v1/capture` is 403 without body consumption, restarts, stops, uninstalls, proves state/secret preservation, terminates survivors in `finally`, proves the listener gone, and deletes only receipt-owned candidate paths. Before/after sentinels prove real Application Support, secrets, logs, LaunchAgents, labels, and ports 39478/38478/38479 unchanged.

The target implementation and Project coordination head are reviewed by an agent other than the builder. Before each target-main write and the real-shadow install, the persistent coordinator creates the separate immutable delegated-operation record required by the sequential-program decision, commits/pushes/reads it back from Project `origin/main`, and binds the exact reviewed spec/seal, landed repositories, typed artifacts, preflight/plan, before-image backup, uninstall/restore proof, authority boundary, identities, and nonce. Merge approval never substitutes for installation authorization. For installation, the coordinator copies the four authorized assets into a fresh current-user 0700 directory, rejects links/non-owned files, compares bootstrap and manifest bytes with `/usr/bin/shasum -a 256` against the read-back authorization before invoking anything, and executes that protected bootstrap path with literal `--authorized-manifest-sha256 <digest> --bundle-dir <absolute>`. The bootstrap rechecks its own path plus manifest digest before mutation, then verifies every remaining manifest-bound asset. Device/inode/size/mode are checked before and after execution; any change aborts. A coherently substituted four-asset set must fail against the external authorization.

After final-bundle candidate smoke and installation authorization, install those same protected bytes at label `com.echo.context`, port 39478, and `/Users/zhenye/.echo-context-shadow`; run the same stopped-service manifest-bound seed command for only the committed synthetic fixture; prove stop/start/restart and healthy doctor; and leave the shadow installed with capture and authority false. Independent PID/lsof/hash/listener observations prove no open Project_echo, `~/.echo`, future `~/.echo-context`, or legacy Application Support path; Project_echo remains healthy at 38478; 38479 remains unused; clients/configs are unchanged; and no live state or capture worker is touched. The Project migration record binds both canonical landed SHAs, every artifact hash, authorization records, redacted evidence hash, and exact authority boundary.

## Out of Scope (Don't Drift)

- No GitHub Actions, protection, tag, GitHub Release, hosted/private prerelease, upload, hosted artifact download, remote release asset, release-set manifest, or publication/cache ceremony; item 140 owns every hosted surface. AC3's fixed official Node build input is not a release surface.
- No Project-specific product-consumer graph, residual endpoint, coordination mirror, cutover controller, `prepare-final`, live authority record creation, client transform, migration, rollback, or recutover; item 138 and the two successors replacing historical item 139 own those decisions.
- No read/copy/migration of Project_echo DB/WAL/SHM, checkpoints, onboarding/project state, client config, or credential; no capture worker or live-context write.
- No 38478 takeover, 38479 bind, old-daemon disable/freeze, client rewiring, credential rotation, runtime/state authority transfer, or Project_echo deprecation.
- No supervisor, stable user shim, purge, auto-update, public registry, other OS/architecture/Node support, root daemon, Fleet, or cross-machine sync.
- No new MCP tool/semantic, storage redesign, embedding/backfill, product/loop feature, echo-brain/echo-loop install, wiki edit, or Team-product maturity advancement.

## Risks

- A stale local target could masquerade as the predecessor. AC1 pins and independently rebuilds the complete landed tuple before branching.
- A test harness could be installed as production. AC1 creates a separate composition root and AC3 admits only the manifest-bound runtime entrypoint.
- A local bundle could be substituted before install. AC3 binds all four assets in the canonical delegated authorization and AC6 executes protected verified bytes.
- A crash or concurrent command could leave foreign/unowned paths. AC4's lifecycle lock, intent, ownership receipt, and fail-closed recovery constrain every mutation.
- Launchd or logging could create a second restart/growth loop. Launchd owns the runtime directly; inherited output is `/dev/null`; one bounded internal sink exists.
- A healthy-looking shadow could capture or become authoritative. Closed config, authority-record matching, doctor, and independent listener/process/state observations fail that condition.

## Tests

- `tests/runtime/config.test.ts` covers the exact shadow config, minimal authority projection, active-record mismatch, closed-schema/path/host rejection, and zero prevalidation mutation.
- `tests/runtime/composition.test.ts` and `writer-lock.test.ts` prove ordered startup/unwind, bounded shutdown, direct-process lock lifetime, synchronized exclusion, SIGKILL release, and no storage/socket access by a loser.
- `tests/runtime/auth.test.ts` proves early bearer/Host rejection, capture-disabled 403 before body read, exact 43-byte unpadded-base64url grammar, correct decoded access, binary/newline/padding/malformed-file rejection, bounded inputs, and zero credential logging; existing roster/service parity tests keep exact behavior.
- `tests/install/runtime-artifact.test.ts`, `bundled-node.test.ts`, and `bootstrap.test.ts` verify both source tuples, all four asset identities, official Node URL+SHA/license, empty-cache fetch, substituted host/cache rejection, ABI/native-member hashes and load probes, protected-byte execution, coherent four-asset substitution failure against the external authorization, architecture ordering, tamper/unsafe-path rejection, and no host-toolchain fallback.
- `tests/install/layout.test.ts` proves real/candidate resolution, candidate port 0 and no-launchd restrictions, real-root sentinels, and rejection of ambiguous environment/default paths.
- `tests/install/transaction.test.ts` injects kills from support-root/lock bootstrap through intent, staging, atomic commits, receipt, and job load, plus concurrent lifecycle pairs and shared-reader/exclusive-writer races, proving adopt/rollback/refuse recovery, busy timeout truth, and no unowned mutation.
- `tests/install/launchd.test.ts` and `tests/cli/lifecycle.test.ts` assert the direct-runtime plist, literal bootstrap/bootout/kickstart/kill/print vectors and exit mapping, idempotence, disabled-override refusal, restart/uninstall convergence, `/dev/null`, early-fatal evidence and no retry storm including logger-open failure, bounded logs, exact ready-FD/process-group cleanup, and absence of enable/disable/supervisor/shim/purge/prepare-final surfaces.
- `tests/cli/doctor.test.ts` validates both schemas, shared-lock generation consistency, canonical stdout/LF, combined-failure exit precedence, bounded probes, busy timeout, redacted stderr, startup-logging diagnosis, every required health mismatch, and read-only behavior.
- `tests/security/runtime-closure.test.ts` rejects onboarding/task-state/review/coordination/default-path/test-harness/sibling imports while preserving opaque historical-event retrieval compatibility.
- `tests/integration/shadow-install.test.ts` performs the candidate lifecycle with manifest-bound stopped-service seed/idempotence/substitution negatives, ready-FD restart and failure cleanup, and real-path sentinels; the authorized operator smoke repeats lifecycle and independent observations on the founder shadow.
- Existing typecheck, lint, full CI, source-artifact verification, inventory, secret scan, service parity, and `git diff --check` remain green.

## After Completion (Strategist Notes)

- Update no wiki page; this is an internal capture-off machine-context shadow, not a shipped commercial surface or maturity advancement.
- Revise item 138 against the actual landed runtime, minimal authority projection, install receipt, doctor schemas, and shadow evidence before restarting its review. Do not preserve speculative 137 consumer/cutover fields merely because the old 138 proposal referenced them.
- Historical item 139 remains frozen; after item 138's exit gate, the coordinator creates the two authorized successor items for live cutover/reversibility and seven-day acceptance/deprecation.
- Item 140 remains parked and owns every future hosted CI, tag, release, and asset-publication decision.
