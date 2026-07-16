---
id: 2026-07-15-138-echo-context-cutover-substrate-rehearsal
title: "Deterministic echo-context cutover substrate and full-cycle rehearsal"
status: proposed
priority: HIGH
estimate: 6d
created: 2026-07-15
blocked_by:
  - 2026-07-15-137-echo-context-installable-shadow-runtime
task_state_ref: 2026-07-15-138-echo-context-cutover-substrate-rehearsal
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - /Users/zhenye/Desktop/echo-context/package.json # controller build/rehearsal entrypoints
  - /Users/zhenye/Desktop/echo-context/package-lock.json # exact controller dependency closure
  - /Users/zhenye/Desktop/echo-context/src/cutover/** # NEW phase machine, backup, migration, client, authority, rollback, and recutover
  - /Users/zhenye/Desktop/echo-context/schemas/** # NEW plan/checkpoint/backup/rollback/rehearsal schemas; consume 137 authority schema unchanged
  - /Users/zhenye/Desktop/echo-context/provenance/** # controller inventory and predecessor/runtime bindings
  - /Users/zhenye/Desktop/echo-context/tools/** # deterministic controller build/verify and guarded rehearsal
  - /Users/zhenye/Desktop/echo-context/tests/cutover/** # NEW mutation-boundary and full-cycle fixture tests
  - /Users/zhenye/Desktop/echo-context/docs/context-cutover.md # reviewed operator contract for item 139
  - package.json # residual/fenced-full package build and version identity
  - package-lock.json # exact Project_echo residual/rollback closure
  - src/daemon/index.ts # full-daemon authority fence before PID/DB/socket mutation
  - src/daemon/lifecycle.ts # owns pre-open side effects (data-dir mkdirSync, PID-file write); AC2's fence must execute before these, so fence hooks/reordering land here
  - src/daemon/legacy-residual.ts # NEW product/loop-only composition root
  - src/daemon/context-authority.ts # NEW canonical authority-record validator
  - src/mcp/server.ts # explicit context/full/residual roster profiles
  - src/storage/context-service.ts # NEW authenticated client constrained by the 137 consumer contract
  - src/storage/coord-store.ts # NEW residual coordination authority store/import
  - src/storage/coord-mirror.ts # NEW transactional outbox and idempotent context observation mirror
  - src/cli/commands/daemon.ts # packaged residual and fenced rollback-full definitions
  - src/cli/commands/init.ts # split endpoint/client naming defaults
  - src/cli/commands/selftest.ts # two-endpoint fixture verification
  - src/cli/inverse/cursor-config.ts # reversible split-client transform
  - src/echo-home/adapters/** # pure Codex/Claude/Cursor two-endpoint transforms
  - src/brain/brain.ts # explicit authenticated context endpoint caller
  - src/surfaces/ceo-slack-responder/responder.ts # explicit authenticated context/residual caller classification
  - skills/** # canonical explicit context-versus-residual endpoint callers
  - .claude/commands/** # generated Claude adapters from canonical skills
  - tools/install-echo-codex-skills.sh # rendered Codex adapter endpoint/auth contract
  - tools/coord-status.sh # residual endpoint/auth caller
  - tools/review-queue/** # residual coordination endpoint/auth callers
  - tools/context-cutover/** # NEW Project_echo-side artifact and rehearsal helpers
  - tests/daemon/** # residual composition and pre-open full-fence tests
  - tests/mcp/** # exact residual roster and descriptor-continuity tests
  - tests/storage/** # context service, coord import, outbox, and mirror tests
  - tests/echo-home/** # lossless client transform fixtures
  - tests/integration/context-cutover-rehearsal.test.ts # full old-to-new-to-old-to-new ceremony under scratch roots
  - raw/internal/migrations/2026-07-15-138-echo-context-cutover-rehearsal.md # NEW redacted cross-repo rehearsal record
  - raw/internal/agent-runs/** # workflow-owned failure/completion run log
  - backlog/task-state/2026-07-15-138-echo-context-cutover-substrate-rehearsal/** # workflow continuity pointers
  - backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md # proposal and review revisions
  - backlog/ready/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md # watcher-owned promotion target
  - backlog/claimed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md # workflow claim target
  - backlog/pending_review/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md # workflow handoff target
  - docs/BACKLOG.md # generated stage-derived index
spec_refs:
  - backlog/complete/2026-07-15-137-echo-context-installable-shadow-runtime.md # exact runtime, authority schema, consumer contract, and shadow proof
  - backlog/complete/2026-07-15-136-echo-context-canonical-repository-release-substrate.md # canonical target source/release authority
  - backlog/complete/2026-07-13-135-local-echo-context-source-extraction.md # context roster/state/capture boundary
  - backlog/complete/2026-07-13-134-local-echo-loop-source-extraction.md # coordination authority/store semantics
  - backlog/complete/2026-07-13-133-local-echo-brain-source-extraction.md # product ownership remains separate
  - raw/internal/decisions/2026-07-15-echo-context-successor-repository-execution.md # cross-repo worktree/review/landing protocol
  - raw/internal/decisions/2026-07-12-g2-terminal-dispositions-and-repository-topology.md # per-repo authority checkpoint
  - src/daemon/index.ts # current mixed composition/startup order
  - src/mcp/tools/coord-emit.ts # wait/search descriptor that the mirror must preserve
  - src/coord/deadlines.ts # full-ledger reconstruction and watermark semantics
  - src/echo-home/adapters/codex-config.ts # current single echo client key
  - src/echo-home/adapters/claude-code-mcp.ts # current single echo client key
  - src/echo-home/adapters/cursor-config.ts # current single echo client key
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

# Deterministic echo-context cutover substrate and full-cycle rehearsal

## Why this spec exists

Item 137 proves one exact echo-context runtime as an authenticated, capture-off shadow. Live cutover still needs a Project_echo residual, an old-full authority fence, populated-state and coordination migration, client transforms, and rollback/recutover. Combining that source work with real credential/state/launchd mutation would execute unreviewed code and violate the normal backlog handoff.

This gate builds and independently reviews all cutover substrate in both canonical repositories, then exercises the complete ceremony against representative temporary state and fake service controls. It ends with authority:false and no founder-machine mutation. Item 139 alone builds the final operator/residual artifacts from the read-back landed SHAs and executes the live switch.

This internal substrate exists because unified machine context across Codex, Claude Code, and Cursor is required by ECHO's development and Team-product delivery workflow. It is not a parallel commercial product or maturity advancement.

## Acceptance Criteria

### AC1 — Implement one closed, replayable phase machine behind a hard mutation boundary

Add a controller with closed phases planned, backed_up, migrated, prepared, active, rolled_back, and recutover_prepared. One canonical transaction record on one filesystem is the commit point; immutable configs and non-authoritative projection records reference its generation/hash. Every filesystem, SQLite, service-control, client-config, clock, secret, process, port, and artifact operation is behind an injected interface with precondition/result journaling. Crash replay either finishes the current idempotent step or restores its protected before image; it never advances two authorities.

The only mutation-capable command in this item is the rehearsal entrypoint: package script `rehearse` in /Users/zhenye/Desktop/echo-context/package.json, run as `npm run rehearse -- --root <path>` with the echo-context checkout as working directory, writing only under the supplied root, exiting 0 only on a completed ceremony and non-zero on every failure. A `--root` naming a nonexistent path or empty directory initializes a new rehearsal; a root containing a valid canonical transaction record resumes crash replay of that rehearsal; any other root content is rejected. Root validation is descriptor-relative and refuses symlinked components; a per-root exclusive lock prevents two rehearse processes from binding the same root. A production mutation guard rejects the real HOME, /Users/zhenye/Library, ~/.echo*, real client configs, launchctl GUI domains, ports 38478/38479, non-fixture processes, and any path outside the supplied root before file/socket/spawn mutation. Guard rejections and root-validation failures that occur before the root is trusted write nothing anywhere: they emit a redacted reason on stderr and exit non-zero with zero filesystem mutation — the exit code plus captured stderr is the unattended-run contract. After the root is trusted, every unrecoverable replay stop writes a redacted phase/error record under the root and exits non-zero. The rehearse command is permanently root-scoped and fake-service-only: this item ships no live-capable mutation mode, flag, or environment override, and the controller archive handed to item 139 contains no bypass of the mutation guard — live mutation becomes possible only through item 139's separately reviewed exact-artifact/execute authorization path. The controller consumes item 137's context-authority schema unchanged and cannot create a live record without item 139's exact artifact/execute authorization.

### AC2 — Package an explicit residual and fence every supported old-full start path

Add src/daemon/legacy-residual.ts as a separate root. It starts no generic fs/git/Granola/Claude/Codex/Cursor capture, context enrichment/storage, or eight context MCP registrars. Its exact seven-tool roster is propose_decision, pending_decisions, get_role_state, list_task_states, coord_emit, coord_status, and coord_invoke. Repository-backed task-state, pending-decision, and reviewer-invocation data intentionally remain Project_echo-owned; runtime code is package-installed and repo-independent except for explicit repository data arguments.

Product meeting/brief/intake/health consumers access context only through src/storage/context-service.ts, whose operations must be a subset of item 137's sealed product-context-consumer-contract.v1.json. Local-versus-HTTP conformance pins ordering, filters, caps, IDs, errors, and restart behavior. Any new/uncovered operation fails the residual build and requires a new reviewed context runtime; no fallback opens either context DB.

The checksum-bound Project_echo package contains both the residual entrypoint and a rollback-full entrypoint whose authority fence executes before PID lock, data-dir creation, SQLite open, workers, or socket bind. It replaces/neutralizes every supported global echoctl daemon-start path during the future live ceremony. Prepared/active generations reject full mode before mutation; only an absent or rolled_back canonical generation with a valid rollback authorization permits it. The fence decision is serialized with controller phase transitions through an exclusive lock on the canonical transaction record: the rollback-full startup path and every controller transition acquire it, recheck generation state while holding it, and complete pre-open side effects or the phase commit before release, so an old-full start can never observe absent or rolled_back, pause, and then mutate PID, database, or socket after the controller commits prepared or active. Before committing prepared or active, the controller neutralizes every supported old start job (plist bootout/disable through the fake service control in rehearsal) so a stale KeepAlive plist cannot relaunch the fenced daemon in a loop; fence rejections write durable, rate-bounded evidence to the packaged daemon's log location. Direct command, old plist, and stale-config fixtures prove the old full daemon cannot reclaim authority; barrier-controlled concurrent start-versus-activation fixtures cover every supported start path; a fake-launchd KeepAlive fixture proves repeated relaunch attempts terminate bounded with the rejection evidence present.

### AC3 — Preserve coordination authority and the existing wait/search promise

Residual coord.sqlite is canonical coordination authority. Offline import preserves all pre-cutover coord IDs, bytes, append order, replay watermark, idempotency state, open deadlines, and coord_status snapshot. New coord emission commits the canonical event and an outbox row in one transaction; loss after either write is impossible.

The mirror worker sends a stable-ID generic coord:* observation through item 137's authenticated idempotent append-with-caller-ID service operation. Identical repeats succeed without a duplicate. A differing-ID collision or retry exhaustion stops the mirror and persists a terminal error state — the last error plus the current watermark — in residual coord.sqlite, where coord_status/health reads surface it and it remains visible across restart; the failure can never look healthy while observations silently stop advancing. Bounded retry/restart reconciliation drains gaps and records a watermark. Deadline/status/invoke paths read only residual coord.sqlite; context search_memories and wait_for_new_turns may see the mirrored observations, keeping coord_emit's existing descriptor truthful. Mirror lag never changes coordination authority or loses canonical writes.

Rollback imports only residual rows after baseline coordination sequence C into the restored old ledger. Recutover rebuilds residual authority from the new old-ledger cut and reconciles context mirrors without duplicates.

### AC4 — Make all endpoint/client transforms pure, lossless, and classified

Add parse-plan-apply-undo transforms for Codex TOML, Claude JSON, Cursor JSON, canonical skills, rendered Claude/Codex adapters, CLI/selftest/inverse config, brain, Slack responder, review queue, and operator tools. Retain client key echo for context at 38478 and add echo-project-residual at 38479. Replace ambiguous ECHO_MCP_URL/ECHO_DAEMON_PORT use with explicit ECHO_CONTEXT_MCP_URL or ECHO_RESIDUAL_MCP_URL plus protected auth references.

Every current 38478/echo caller is classified as context, residual, or both in a committed manifest. Unknown/ambiguous callers fail. Transforms preserve unrelated settings and exact before bytes for undo, reject duplicate/unsupported auth or format drift, and never reveal header values. This item uses committed fixture configs and temporary installed-skill roots only; no real client or global skill path is read or written.

### AC5 — Build deterministic controller and Project_echo package candidates

Add deterministic build/verify workflows for an operator-only echo-context cutover-controller archive and a Darwin x64 Project_echo residual/rollback-full package. The workflows are named package scripts created by this item — `candidates:build` and `candidates:verify` in /Users/zhenye/Desktop/echo-context/package.json (controller archive) and in Project_echo's package.json backed by tools/context-cutover/** (residual/full package) — each run from its repository root, reading only committed inputs, and writing only under its repository's build/output directory. Manifests bind both canonical source SHA/tree inputs, item 137's exact source/runtime artifacts, locks/SBOMs, bundled/runtime Node decisions, platform/architecture, entrypoints, schemas, inventories/modes, consumer/caller manifests, and authority_active_at_release false. Archives contain no source repository path, credential, state, client config, mutable cache, live-capable entrypoint, mutation-guard bypass, or environment-override hook, and reject traversal/symlink/hardlink/native/manifest drift; a named extracted-archive inspection test asserts the no-bypass properties on the exact controller archive handed to item 139.

Rehearsal builds from reviewed feature heads are test candidates only. Following the successor-repository protocol, the target branch lands first, then the Project_echo branch. Item 139 alone builds/releases the execute artifacts from fresh detached clones of both read-back canonical landed SHAs; no feature-head artifact may reach live paths.

### AC6 — Rehearse populated backup, migration, coordination import, and preexisting-home quarantine

Generate a deterministic representative legacy database/WAL/sidecar set with null metadata, binary embeddings, every source class, product-derived events, and at least 1,000 ordered coord events including open deadlines/idempotency rows. The fake mixed service quiesces; SQLite backup API writes an authenticated encrypted bundle; wrong key/tamper/partial/WAL drift fails; a scratch restore is mandatory.

Migrate only a restored copy into an absent 0700 final context root, translate the explicit nonsecret capture sidecar allowlist, and import the complete coord ledger into residual. Versioned length-prefixed logical digests prove row IDs/bytes/order/count/max-rowid/per-source parity, sidecar schemas, integrity, populated eight-tool hashes, and coord reconstruction equivalence.

The planner explicitly handles the founder Mac's known preexisting ~/.echo-context scaffold: only the exact inventoried shape of empty adapters/roles/skills/workflows plus state/onboarding.json and state/projects.json may be atomically moved whole into protected generation quarantine after hash/type/mode/owner recheck. It is never merged into new state or deleted. Unknown entries, DBs, nonempty support dirs, symlinks, mount/owner/mode change, or post-plan hash drift fail. Rehearsal proves rollback restores the exact scaffold and recutover quarantines it again.

### AC7 — Prove lossless cutover, rollback, and new-generation recutover

Run the exact candidate controller/package/runtime under a temporary HOME, ephemeral ports, and fake launchd: old full to prepared split to active generation G1. Assert exact eight-plus-seven rosters, one context writer, residual remote-context conformance, populated history, coord mirror convergence, and no repository dependency.

After G1, inject events from all six context sources, a product-derived append, coord/deadline writes, client rewiring, service restarts, and failures before/after every journal checkpoint. The W and C high-water cuts are taken under an explicit writer freeze: the controller quiesces the context and coordination writers, drains the coord outbox, verifies the final high-water marks while the freeze is held, and commits the cut and the authority flip in one canonical-transaction-record step before writers resume — no context or coordination write can land after its snapshot but before the transition and be absent from both authorities. Rollback exports target rows after W, residual rows after C, and current checkpoints; restores an old-full staging copy plus exact clients/quarantine; and proves zero loss/duplicates.

While rolled back, inject additional old-full context and coord events. Recutover creates new generation G2 with a fresh cut taken under the same writer-freeze protocol, backup, migrated context DB, rebuilt residual coord DB, client plan, and authority record; it never reactivates G1. After G2, all pre-cutover, G1-era, and rollback-era events appear exactly once, coord status matches, mirrors converge, and failures always resume to exactly old-authoritative or new-authoritative.

### AC8 — Land reviewed substrate and emit a redacted go/no-go handoff

Independent reviewers inspect both exact repository heads, run all target and Project_echo suites, and validate the paired migration record. The founder separately approves target-main and Project_echo-main landings per the successor-repository landing protocol; canonical readback fills both landed SHAs. The readback values are recorded in a subsequent evidence-only commit — never inside the landing commit itself — into this item's completed frontmatter (`target_landed_sha`, `project_landed_sha`) and the migration record; that frontmatter at origin/main, cross-checked against the migration record and verified reachable from each canonical remote, is the sole SHA authority item 139 pins. No live artifact is released and no user path/service/credential/config is touched.

raw/internal/migrations/2026-07-15-138-echo-context-cutover-rehearsal.md binds landed SHAs/trees, candidate-build hashes, phase/crash matrix, fixture logical digests/counts, rosters, coord mirror lag/reconstruction, client/caller classification, mutation-guard sentinel before/after hashes, and verdict without content/secrets. Completion says cutover substrate ready; runtime authority remains Project_echo and item 139 is the only live gate.

## Out of Scope (Don't Drift)

- No read/write of live ~/.echo*, ~/Library, ~/.codex, ~/.claude, ~/.cursor, global installed skills/packages, LaunchAgents, listeners, credentials, or databases.
- No port 38478/38479 bind, real launchctl operation, Slack token rotation/send, live shadow rebind, live client rewiring, live state migration, live authority activation, live rollback, or freeze.
- No rebuild/patch of item 137's runtime and no live use of a feature-head/candidate artifact.
- No new context MCP tool/semantic, storage redesign, embeddings/backfill, product feature, echo-brain/echo-loop install, or Team-product graduation.
- No generic multi-repo/migration framework, public release, other platform, Fleet, cloud, or cross-machine sync.
- No wiki edit or deletion of any source/target/quarantine/backup state.

## Risks

- A fixture-only rehearsal can miss launchd/filesystem races. Production adapters are narrow and phase-injected; item 139 repeats every preflight and stops rather than patching.
- Coord mirroring can be mistaken for authority. The residual store is the only canonical read path for deadlines; the context copy is named and tested as an observation.
- Product consumers can exceed the sealed service contract. Static closure and build failure prevent runtime fallback or silent drift.
- Client formats and installed adapters can drift. Pure transforms preserve before bytes, classify every caller, and fail on unknown formats.
- Cross-repo artifacts can bind the wrong heads. Candidate evidence is non-live; item 139 builds only from completed canonical landed SHAs.
- Rollback/recutover can reorder or duplicate rows. Stable IDs, explicit W/C cuts, binary digests, collision aborts, and G2 tests close the path.
- The preexisting home can be mistaken for live context. Its exact whole-root quarantine is separate and never merged.

## Tests

- /Users/zhenye/Desktop/echo-context/tests/cutover/phase-machine.test.ts and mutation-guard.test.ts cover journal replay, zero real-path/process/socket access, initialize-versus-resume root semantics, per-root exclusive locking, a table-driven root-rejection matrix (forbidden, symlinked, unwritable, and invalid-content roots each exit non-zero with zero filesystem mutation and no record written), and extracted-controller-archive inspection rejecting live adapters, guard-disable flags, or environment bypasses.
- /Users/zhenye/Desktop/echo-context/tests/cutover/backup-migrate.test.ts covers WAL backup, encryption/tamper, restore, logical parity, sidecars, coord import, and quarantine.
- /Users/zhenye/Desktop/echo-context/tests/cutover/client-adapters.test.ts covers lossless Codex/Claude/Cursor and installed-skill transforms with unsupported-format/auth failures.
- /Users/zhenye/Desktop/echo-context/tests/cutover/rollback-recutover.test.ts and crash-resume.test.ts prove W/C deltas, writer-freeze cut races at every cut/flip boundary, G1 rollback, rollback-era writes, fresh G2, and one authority.
- tests/daemon/legacy-residual.test.ts and authority-fence.test.ts prove residual exclusions, pre-open rejection of every full start path, lock-serialized concurrent start-versus-activation, and bounded KeepAlive relaunch termination under fake launchd.
- tests/mcp/legacy-residual-roster.test.ts proves exact authenticated seven; existing target tests prove exact eight; union/classification equals the prior 15.
- tests/storage/context-service.test.ts proves the sealed consumer subset; coord-continuity-mirror.test.ts proves import, deadline snapshot, atomic outbox, retry, stable-ID idempotency, wait/search visibility, and the durable collision/retry-exhaustion terminal state surfacing through coord_status/health across restart.
- tests/echo-home/adapters/split-mcp-config.test.ts and caller-classification.test.ts cover every active/generated endpoint consumer.
- tests/integration/context-cutover-rehearsal.test.ts runs the full isolated old-to-G1-to-old-to-G2 ceremony with all source/product/coord deltas and crash points.
- Both repository typecheck/lint/full suites, the `candidates:build`/`candidates:verify` package scripts, runtime inventory, tools/sync-skills.sh --check, tools/install-echo-codex-skills.sh --dry-run, git diff --check, and mutation sentinels remain green.

## After Completion (Strategist Notes)

- Update no wiki page; no live authority changed.
- Promote item 139 only when both canonical landed SHAs and the redacted rehearsal verdict are present.
- Item 139 owns exact-artifact build/release, credentials, live backup/migration, client/installed-skill wiring, activation, rollback/recutover, acceptance, and context-plane freeze.
