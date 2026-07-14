---
id: 2026-07-13-134-local-echo-loop-source-extraction
title: "Local standalone echo-loop orchestration source extraction and parity proof"
status: proposed
priority: HIGH
estimate: 5d
created: 2026-07-13
blocked_by: []
task_state_ref: 2026-07-13-134-local-echo-loop-source-extraction
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - /Users/zhenye/Desktop/echo-loop/**                          # NEW standalone orchestration source repository; local only
  - /Users/zhenye/Desktop/.echo-migration-evidence/134/**      # NEW retained source-oracle/sandbox/run evidence through review
  - raw/internal/migrations/2026-07-13-134-echo-loop.md        # NEW Project_echo handoff/provenance/parity record
  - raw/internal/agent-runs/**                                 # workflow-owned failure/completion run log
  - backlog/task-state/2026-07-13-134-local-echo-loop-source-extraction/builder.md # workflow continuity pointer
  - backlog/ready/2026-07-13-134-local-echo-loop-source-extraction.md # workflow claim source
  - backlog/in_progress/2026-07-13-134-local-echo-loop-source-extraction.md # workflow claimed item
  - backlog/pending_review/2026-07-13-134-local-echo-loop-source-extraction.md # workflow handoff item
  - docs/BACKLOG.md                                           # generated stage-derived index on claim/handoff
spec_refs:
  - raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md # one-time attended build; no migration controller
  - CLAUDE.md                                                  # roles, pipeline, and protocol ownership
  - backlog/README.md                                          # backlog/review/claim mechanics
  - docs/AGENT_INSTRUCTIONS.md                                 # builder loop and drift rules
  - skills/role-typed-task-state.md                            # role-state and fresh-eyes contract
  - backlog/complete/2026-05-11-039-cross-tool-review-dispatch-queue.md # review queue contract
  - backlog/complete/2026-05-13-046-context-fatigue-via-role-typed-state.md # task-state substrate
  - backlog/complete/2026-05-16-057a-coord-substrate-and-observability.md # coordination substrate
  - backlog/complete/2026-06-03-088-proposed-stage-pipeline.md # proposed-review gate
  - tools/review-queue/reviewer-bindings.json                  # current bindings
  - tools/review-queue/reviewers.json                          # current roster
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Local standalone echo-loop orchestration source extraction and parity proof

## Why this spec exists

The founder has named the internal agent-orchestration system `echo-loop`: the vendor-neutral skills, backlog/task-state protocol, review queue, coordination/deadline substrate, builder/reviewer/merge workflows, and operator tooling. This item materializes that closure from Project_echo commit `2971310441b69735cbe759293abd8c4d044bf347` into `/Users/zhenye/Desktop/echo-loop` and proves it against disposable repositories. Project_echo remains the active loop, historical backup, and authority. Installation, remote creation, and cutover are later checkpoints.

### AC1 — Materialize one local Git repository without shipping migration machinery

One assigned builder lane owns every pre-target evidence step and `/Users/zhenye/Desktop/echo-loop`; sibling lanes never touch either. Existing-target cleanup is a founder-owned prerequisite outside this item: the builder always aborts on EEXIST and never archives. Founder/orchestrator provisioning of `/Users/zhenye/Desktop/.echo-migration-evidence/134` is a fail-closed prerequisite: every ancestor is lstat-verified as an expected real directory, evidence directories are current-UID mode 0700, and the builder creates one lowercase-UUID leaf by non-recursive mode-0700 mkdir with EEXIST failure. It records and revalidates the canonical path plus device/inode/uid/gid/mode tuples. All later evidence, cache, oracle, clone, log, and scratch writes stay beneath that leaf; this item performs no evidence cleanup.

The ordered lane is: evidence preflight/leaf; pinned source inventory and dependency plan; isolated source export/install; sealed oracle/vector/baseline; target-parent revalidation and absence; plain non-recursive target mkdir; target materialization/commit; private-clone verification/audit; Project_echo handoff. The target mkdir is the first mutation under the target path; before it, no target-path write occurs, and afterward this builder is the only writer inside. It initializes branch `migration/2026-07-13-134` with local identity `ECHO Migration Agent <migration@echo.local>`, signing/hooks/templates/global/system config disabled, and no remote. The single attended lane assumes no hostile concurrent local filesystem actor; security claims cover EEXIST and sandboxed fixture escape, not malicious parent-swap races.

`provenance/toolchain.v1.json:1` pins `/usr/local/bin/git` 2.37.3, `/usr/local/bin/node` 22.22.1, resolved npm CLI `/usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/bin/npm-cli.js` 10.9.4, `/bin/sh`, and `/usr/bin/sandbox-exec` by path/version/hash; mismatch fails preflight. Every source, target, clone, fixture, and audit Git example means `/usr/bin/env -i HOME=<scratch-home> XDG_CONFIG_HOME=<scratch-xdg> TMPDIR=<scratch-tmp> PATH=<attempt-tool-bin> GIT_CONFIG_NOSYSTEM=1 GIT_ATTR_NOSYSTEM=1 GIT_NO_REPLACE_OBJECTS=1 /usr/local/bin/git ...`, with repository/index/object/common-dir/alternates, config-count/key/value, replace/graft/ceiling, askpass/SSH/proxy variables absent. Tests capture argv/env, include hostile system gitattributes, and fail if another executable or variable is used. Final checks prove target-local Git dirs/index/objects, no alternates/replace/graft/promisor state, and `git fsck --full`. Source bytes come from the pinned explicit repository/full SHA only.

This is an attended one-time build. Do not add a Project_echo extraction CLI, daemon, lifecycle state, locks/takeover, publication helpers, or recovery framework. An interrupted target is incomplete and unaccepted; the orchestrator inspects and archives it before a fresh assigned run. No other agent automatically adopts, deletes, resumes, or repairs it.

The accepted target ends clean with a committed local history, exactly the migration branch, and no remote. Its README identifies the scope, pinned source, item, active Project_echo authority, and later installation/cutover gate.

### AC2 — Give echo-loop accurate orchestration ownership

`/Users/zhenye/Desktop/echo-loop/package.json:1` pins Node/npm, owns a committed lockfile, and defines `check:provenance`, `check:dependencies`, `check:skills`, `test:task-state`, `test:review-queue`, `test:coord`, `test:workflows`, and fail-closed aggregate `verify:extraction`; the aggregate runs every named command plus typecheck/lint/full test/source-independence and propagates any nonzero exit. `/Users/zhenye/Desktop/echo-loop/src/:1`, `skills/:1`, and `tools/:1` contain only agent-loop capabilities.

The source universe starts with the AC1 sanitized Git contract plus `-C <explicit-source> ls-tree -rz --full-tree 2971310441b69735cbe759293abd8c4d044bf347 -- <roots> package.json package-lock.json tsconfig.json tsconfig.*.json`. The parser consumes NUL-delimited `mode type OID<TAB>path` records, rejects non-blob entries/symlinks/submodules, preserves executable modes, and reconciles mode/OID/path in both manifests. Committed `provenance/resolution-rules.v1.json` is a versioned binding-aware table of repository-capable sources/sinks and resolution rules: TS/JS static/dynamic imports, CommonJS, package imports/import maps, workspace and TypeScript path aliases; all async/sync child-process exec/spawn/execFile/fork forms; Worker and static filesystem operands; Python import/subprocess/file forms; shell shebang/source/exec/interpreter operands; package scripts; schema refs; and template/includes. Node/Python built-ins, bare packages, and external interpreters are classified explicitly. Every discovered sink must match one table row; unknown/unparsed/computed repository-capable edges fail closed unless the exact source location and rationale are excluded. Fixtures cover positive, binding alias, sync/async, computed, missing, duplicate, escaping, external, import-map, workspace, and TS-path cases.

Roots are `skills/`, `tools/review-queue/`, `tools/task-state/`, `tools/backlog/`, `tools/blocked.py`, `tools/backlog_index.py`, `tools/coord-status.sh`, `src/coord/`, `tests/review-queue/`, `tests/task-state/`, `tests/coord/`, `backlog/README.md`, and `docs/AGENT_INSTRUCTIONS.md`. Committed `provenance/schemas/source-plan.v1.schema.json` and `source-extraction.v1.schema.json` require schema version, source mode/type/OID, NFC UTF-8 byte-sorted normalized POSIX path, SHA-256 source identity, disposition, conditional destination/hash/mode, origin/rationale, and forbid unknown fields. Every source appears exactly once as `copied`, `relocated`, `rewritten`, or `excluded`; materialized mappings are one-source/one-unique-destination, excluded rows have no destination, and target-only files appear once as `authored` or `generated` with no source fields. Schema validation precedes reconciliation. `source-plan.v1.json` and `source-extraction.v1.json` agree one-to-one on the source universe and partition the complete committed target blob tree, excluding only self-referential manifests and untracked build/install output. Tests cover malformed, mode drift, ambiguous, duplicate destination, one-to-many, target-only, and manifest-disagreement rows.

`provenance/dependency-plan.v1.json` maps every bare import and external script/helper to the pinned source `package.json` declaration and exact `package-lock.json` node/version/integrity; missing, unused, ranged, workspace, link, path, Git, or conflicting mappings fail. A deterministic target `tools/build-lock.mjs` consumes only that plan plus pinned source lock bytes and emits exact target package/lock bytes without registry access. The isolated source export retains pinned package/lock/tsconfig metadata and runs the AC7 exact fetch/offline install before its oracle. The target lock exists before target `npm ci`, is re-derived byte-identically by audit, and its imports/scripts reconcile one-to-one with the dependency plan.

### AC3 — Preserve loop-owned coordination semantics without claiming external exactly-once action

Package exports are normative: `./coord` exposes `emitCoordEvent({actor,role,kind,correlationId,payload}): Promise<{eventId,sequence}>` and `invokeRole({role,taskId,correlationId,deadlineMs?}): Promise<{invocationId,status:"accepted"|"duplicate"}>`; `./task-state` exposes `readTaskState({root,taskId,role,ref}): Promise<TaskStateSnapshot>`; `./skills` exposes `readSkill({root,name,ref}): Promise<{name,sha256,body}>`; `./queue` exposes `getQueueStatus({root}): Promise<QueueStatus>`. Versioned `schemas/api/*.v1.json` define every input/output, `TaskStateSnapshot`, `QueueStatus`, error details, CLI success/diagnostic document, identifier/token grammar, absolute-root/ref containment, and duplicate-key rejection. Sequence is monotonically scoped to one ECHO_LOOP_HOME database; idempotency key is `(actor,kind,correlationId)`, with payload mismatch INVALID_STATE. Deadline admission and idempotency lookup occur in one transaction before invocation publication. Inputs are strict JSON, deadlineMs is 1..300000, and errors are `EchoLoopError {code:"USAGE"|"INVALID_STATE"|"BUSY"|"NOT_FOUND"|"TIMEOUT"|"ENVIRONMENT",message,details}`. `tests/api-contract.test.ts` validates schemas, concurrency tables, transaction points, and source anchors.

CLI grammar is `echo-loop init --root <absolute>`, `validate --root <absolute>`, `status --root <absolute>`, and test-only `run-once --root <absolute> --fixture <file>` rejected unless `ECHO_LOOP_TEST_MODE=1`; every success is canonical JSON plus LF. `tests/cli-contract.test.ts` pins: success→0, USAGE→64, INVALID_STATE→65, NOT_FOUND→66, BUSY→73, TIMEOUT→75, ENVIRONMENT→78, and unexpected child/internal/cleanup-only failure→70. Catchable SIGINT/SIGTERM/SIGHUP perform cleanup, emit one diagnostic, and exit 130/143/129. Direct SIGKILL has no CLI stderr/cleanup guarantee; the supervisor observes signal 9 (shell convention 137). A child signal while the parent lives maps to 70 with child-signal detail; the original error outranks cleanup failure, otherwise cleanup failure maps 70. Failures emit empty stdout and one canonical diagnostic except uncatchable termination. Read commands have no side effects; init uses atomic temp/fsync/rename and leaves no partial state; test-only run-once may mutate only its disposable fixture root. Supervising-process tests cover every signal/precedence row. Allowed child executables are enumerated/default-denied. Context/product tools remain absent. `ECHO_LOOP_HOME` is absolute/no-symlink; private `state/coord.sqlite` schema/migrations are pinned by the source oracle.

Before target creation, the builder writes create-new `<attempt-root>/oracle/{runner.mjs,comparator.mjs,parity-vectors.v1.json}`, pins every vector to named source test/assertion anchors for transaction ordering, retry/idempotency, role/deadline projection, busy/failure diagnostics, review publication, and workflow outcomes, records SHA-256, fsyncs, and makes the files read-only. They are never copied from or replaced by the target. A trusted parent launches each subject as a separately sandboxed child that may read only its own implementation root, private ECHO_LOOP_HOME/fixture root, vector file, pinned toolchain, and dependencies; it cannot read the baseline, comparator, other implementation, Project_echo, or surrounding evidence. The child writes only framed stdout; the trusted parent creates source/target result files. Vectors inject fixed clock, entropy, IDs, and deadlines; canonical projection replaces the two declared absolute roots with `$ROOT`, rejects undeclared volatile fields, recursively sorts object keys, and preserves arrays.

The sealed comparator requires exact projected JSON equality with per-case/aggregate SHA-256 and tool versions. Negative controls cover a constant runner, attempted baseline/evidence read, coupled target/vector mutation, and behavioral mutation; each must fail or be sandbox-denied. Independent review rejects target-supplied runner/vector/comparator substitutions. No criterion promises exactly-once external effects.

### AC4 — Ship reusable protocol templates, not Project_echo history

`/Users/zhenye/Desktop/echo-loop/templates/project/:1` contains the minimal installable backlog stages, AGENTS/CLAUDE fragments, task-state layout, review schemas, and adapter sources needed to initialize another repository. It must not copy Project_echo's completed backlog/review archive, wiki, raw corpus, meetings, journals, product decisions, or project-specific queue items. `/Users/zhenye/Desktop/echo-loop/backlog/:1` is echo-loop's own empty/current queue.

### AC5 — Preserve cross-vendor and fresh-eyes invariants

`/Users/zhenye/Desktop/echo-loop/tests/review-queue/:1` proves request SHA pinning, requested-reviewer enforcement, content-only reviewer bindings, wrapper-owned publication, response validation, combination, convergence, and founder checkpoints. It also covers duplicate same-reviewer ticks, watcher reads during publication, one atomic response/no partial combine, concurrent upstream push preservation, dirty-tree refusal without autostash loss, cleanup failure, and durable operator error before ephemeral cleanup. `/Users/zhenye/Desktop/echo-loop/tests/task-state/:1` proves pointer schema, line caps, anchors, ref pinning, and that reviewer ticks never read task state. Vendor adapters remain derived from canonical skills and drift checks fail.

### AC6 — Prove claim/build/review/merge safety on disposable repositories

`/Users/zhenye/Desktop/echo-loop/tests/workflows/local-fixture-loop.test.ts:1` creates only disposable scratch Git repositories and local fixture bare remotes. It proves proposed items are unclaimable, ready seals are fresh, claims are single-winner, worktrees isolate builders, builders cannot self-review/merge, watcher promotion is deterministic, and founder merge/push checkpoints remain explicit.

Every fixture child receives an explicit allowlisted environment and executes inside a scratch-write-only sandbox: scratch HOME/XDG/TMPDIR, disabled system/global config/hooks/templates/signing/askpass/SSH/proxies/alternates, fixed identity, and explicit Git/worktree/index/object paths under the fixture root. File transport operands are revalidated beneath the root immediately before use; symlink-swap and two-contender fixtures prove outside sentinels unchanged. No real repository, credential, network transport, or global config may influence tests.

### AC7 — Preserve provenance and prove source independence

`/Users/zhenye/Desktop/echo-loop/provenance/source-extraction.v1.json:1` maps every source blob/hash to destination hash/disposition/reason. A deliberate dirty source-worktree mutation cannot enter the target. Final scans/tests reject symlinks, submodules, absolute source paths outside provenance, escaping imports/process reads, and dependencies on echo-brain, echo-context, or Project_echo.

After target HEAD, each verifier captures exact 40-hex HEAD/tree, clones beneath the verified attempt root with `--no-local --no-hardlinks`, detaches that OID, verifies commit/tree, removes origin, proves clean/no-remotes/no-alternates/no-promisor, and rechecks shared HEAD unchanged.

Committed target profiles `tests/sandbox/fetch.sb.in` and `offline.sb.in` fail closed if sandbox-exec is unavailable. Source and target each use distinct mode-0700 HOME/XDG/TMPDIR/config/cache/install roots beneath the attempt. Every phase uses `env -i`, empty 0600 user/global npm configs, `npm_config_script_shell=/bin/sh`, and exact `PATH=<attempt-root>/tool-bin:<private-root>/node_modules/.bin`; tool-bin contains only verified links for inventoried helpers. Phase 1 invokes `/usr/local/bin/node <pinned-npm-cli> ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org/ --cache <actor-cache-fetch> --userconfig <actor-empty> --globalconfig <actor-empty>` in the fetch profile. It verifies lock integrities, seals/hashes an immutable actor cache seed, and deletes node_modules. Phase 2 copies that seed to a distinct writable actor cache and invokes the same absolute Node/npm CLI with `ci --offline --ignore-scripts --no-audit --no-fund --cache <actor-cache-offline> --userconfig <actor-empty> --globalconfig <actor-empty>` plus deny-all network. The source export uses the pinned source package/lock; target uses the deterministically derived target package/lock. Enumerated rebuilds/scripts use the pinned shell/PATH/offline cache; all exits propagate, resolutions are recorded, and immutable seeds remain unchanged. Hostile HOME/project/global config, PATH, registry, TLS, proxy, cache, and lifecycle-script fixtures plus read/write/network probes are mandatory.

Both source and target oracle runs use different private `ECHO_LOOP_HOME` directories and different fixture-only repository roots beneath the attempt root. Each runs with sanitized environment inside the offline scratch-write-only sandbox, deny-all network, synthetic identities/time, and outside source/target/Project_echo/live-loop/credential sentinels. The runner fails if any outside path changes or if a child/listener survives. Profiles, cache hashes, commands, oracle state manifests, and exits remain in attempt evidence.

The one-shot operator audit is retained evidence at `<attempt-root>/operator/audit-extraction.mjs` with `audit-result.v1.schema.json`; it is not Project_echo product machinery. Exact invocation is `/usr/local/bin/node <audit> --source-repo <explicit-source> --source-sha <pin> --source-inventory <nul-record> --source-plan <target-clone>/provenance/source-plan.v1.json --dependency-plan <target-clone>/provenance/dependency-plan.v1.json --target <private-clone> --target-head <oid> --evidence-root <attempt-root> --out <create-new-audit-result>`. The audit runs under the pinned offline profile, writes only its create-new result/log paths, derives the source universe, re-derives target package/lock, recomputes blobs/modes/content hashes, reconciles manifests/target partition, invokes the sealed comparator, and then invokes target-owned `/usr/local/bin/node tools/verify-extraction.mjs --out <create-new-target-result>` as a constrained child. `package.json` script `verify:extraction` is exactly that target command and needs no source access. Any nonzero child/audit step propagates. The migration record stores audit/result/target-verifier hashes and commands. Failures record phase/command/exit and stable evidence paths; this item cleans no attempt evidence.

### AC8 — Record the local handoff and stop before installation

After all checks pass, the builder writes `raw/internal/migrations/2026-07-13-134-echo-loop.md` in its isolated Project_echo feature worktree. The record contains source SHA, commands/exits, target path/branch/HEAD/tree, package/lock/source-plan/dependency/skill hashes, test summaries, no-remotes/clean status, exclusions/differences, and `authority:false`, `installed:false`. The builder commits that record with the backlog handoff and does not mutate target history afterward.

Independent review inspects the target read-only, runs the operator audit and `verify:extraction` from unique private clone/output roots, and compares record hashes. Passing proves only a local source split; the active Project_echo loop, launchd jobs, user-level skill adapters, and repository authority remain unchanged.

## Out of Scope (Don't Drift)

- Do not create/configure a remote, publish/install a package, or change launchd/user skill adapters.
- Do not build reusable extraction, crash-recovery, lock, takeover, or publication-control machinery.
- Do not copy Project_echo history/wiki/raw/backlog archives into echo-loop.
- Do not include product meeting logic or context capture/storage/retrieval tools.
- Do not mutate any real repository, remote, live state, credentials, or active loop.
- Do not redesign founder approvals, add a scheduler, or transfer authority.
- Do not touch sibling targets, wiki, or holdout-131.

## Risks

- **MCP/storage entanglement:** loop operations share current server/storage code. Mitigation: extract loop-owned operations behind private state and reject retrieval tools/source dependencies.
- **History leakage:** copying backlog wholesale would make product history into loop source. Mitigation: installable templates plus explicit source plan/exclusions.
- **False parity:** tests may invoke Project_echo or global Git state. Mitigation: exported-head verification, sanitized fixture environment, sandbox denial, and hostile sentinels.
- **Interrupted build:** direct materialization can leave an incomplete target. Mitigation: one attended lane; incomplete targets are never accepted or auto-resumed.

## Tests

- `/Users/zhenye/Desktop/echo-loop/tests/review-queue/` — request, binding, response, combination, convergence, and fresh-eyes contracts.
- `/Users/zhenye/Desktop/echo-loop/tests/task-state/` — schema, anchors, ref pinning, and line cap.
- `/Users/zhenye/Desktop/echo-loop/tests/coord/` — loop-owned event/role/deadline/storage behavior.
- `/Users/zhenye/Desktop/echo-loop/tests/workflows/local-fixture-loop.test.ts` — proposed through reviewed merge on isolated fixtures.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/committed-source-only.test.ts` — dirty source bytes excluded.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-plan.test.ts` — deterministic closure and history/product/context exclusions.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/dependency-set.test.ts` — exact dependencies.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-independence.test.ts` — no source/sibling/history escape.
- Migration record review — target HEAD/tree, commands, no-remotes, clean status, and false-authority evidence.

## After Completion (Strategist Notes)

- Do not install or switch the active Project_echo loop.
- Propose remote/installation/authority transfer separately after local parity.
- Preserve Project_echo as historical backup; echo-loop becomes authoritative only at the later founder checkpoint.
