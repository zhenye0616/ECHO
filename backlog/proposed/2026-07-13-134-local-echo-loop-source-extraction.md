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

One assigned builder lane owns `/Users/zhenye/Desktop/echo-loop`; sibling lanes never touch it. Existing-target cleanup is a founder-owned prerequisite outside this item: the builder always aborts on EEXIST and never archives. After the founder/orchestrator confirms all parent components are real non-symlink directories and no prior process remains, the builder's first mutation is plain non-recursive `mkdir /Users/zhenye/Desktop/echo-loop`; only that invocation may write inside. It initializes branch `migration/2026-07-13-134` with local identity `ECHO Migration Agent <migration@echo.local>`, signing/hooks/templates/global/system config disabled, and no remote. The single attended lane assumes no hostile concurrent local filesystem actor; security claims cover EEXIST and sandboxed fixture escape, not malicious parent-swap races.

`provenance/toolchain.v1.json:1` pins `/usr/local/bin/git` 2.37.3, `/usr/local/bin/node` 22.22.1, `/usr/local/bin/npm` 10.9.4, and `/usr/bin/sandbox-exec`; mismatch fails preflight. Every source/target Git command uses `env -i` with those absolute tools and scratch config, clearing repository/index/object/common-dir/alternates, config-count/key/value, replace/graft/ceiling, askpass/SSH/proxy variables and setting `GIT_NO_REPLACE_OBJECTS=1`. Final checks prove target-local Git dirs/index/objects, no alternates/replace/graft/promisor state, and `git fsck --full`. Source bytes come from the pinned explicit repository/full SHA only.

This is an attended one-time build. Do not add a Project_echo extraction CLI, daemon, lifecycle state, locks/takeover, publication helpers, or recovery framework. An interrupted target is incomplete and unaccepted; the orchestrator inspects and archives it before a fresh assigned run. No other agent automatically adopts, deletes, resumes, or repairs it.

The accepted target ends clean with a committed local history, exactly the migration branch, and no remote. Its README identifies the scope, pinned source, item, active Project_echo authority, and later installation/cutover gate.

### AC2 — Give echo-loop accurate orchestration ownership

`/Users/zhenye/Desktop/echo-loop/package.json:1` pins Node/npm, owns a committed lockfile, and defines `check:provenance`, `check:dependencies`, `check:skills`, `test:task-state`, `test:review-queue`, `test:coord`, `test:workflows`, and fail-closed aggregate `verify:extraction`; the aggregate runs every named command plus typecheck/lint/full test/source-independence and propagates any nonzero exit. `/Users/zhenye/Desktop/echo-loop/src/:1`, `skills/:1`, and `tools/:1` contain only agent-loop capabilities.

The source universe starts with command `git -C <explicit-source> ls-tree -r --name-only 2971310441b69735cbe759293abd8c4d044bf347 -- <roots>`. A deterministic resolver parses literal TS/JS static import/export and literal `import()`, shell source/shebang, package-script executable/path operands, JSON schema `$ref`, and template/include paths; it resolves against the referencing path, follows only pinned-tree files, and fails on computed/dynamic/unresolved/escaping edges unless that exact edge is excluded with rationale. Symlinks/submodules fail. Roots are `skills/`, `tools/review-queue/`, `tools/task-state/`, `tools/backlog/`, `tools/blocked.py`, `tools/backlog_index.py`, `tools/coord-status.sh`, `src/coord/`, `tests/review-queue/`, `tests/task-state/`, `tests/coord/`, `backlog/README.md`, and `docs/AGENT_INSTRUCTIONS.md`. `source-plan.v1.json` and `source-extraction.v1.json` reconcile one-to-one across this universe and partition the complete target tree, excluding only self-referential manifests and declared build/install output. Normalization/dispositions/hashes follow AC2's schema; negative tests cover computed, missing, duplicate, escaping, and manifest-disagreement edges.

### AC3 — Preserve loop-owned coordination semantics without claiming external exactly-once action

Package exports are normative: `./coord` exposes `emitCoordEvent({actor,role,kind,correlationId,payload}): Promise<{eventId,sequence}>` and `invokeRole({role,taskId,correlationId,deadlineMs?}): Promise<{invocationId,status:"accepted"|"duplicate"}>`; `./task-state` exposes `readTaskState({root,taskId,role,ref}): Promise<TaskStateSnapshot>`; `./skills` exposes `readSkill({root,name,ref}): Promise<{name,sha256,body}>`; `./queue` exposes `getQueueStatus({root}): Promise<QueueStatus>`. Inputs are strict JSON, deadlineMs is 1..300000, and errors are `EchoLoopError {code:"USAGE"|"INVALID_STATE"|"BUSY"|"NOT_FOUND"|"TIMEOUT",message,details}`. `tests/api-contract.test.ts` pins schemas, transaction/timeout behavior, and source anchors.

CLI grammar is `echo-loop init --root <absolute>`, `validate --root <absolute> [--json]`, `status --root <absolute> --json`, and test-only `run-once --root <absolute> --fixture <file>` rejected unless `ECHO_LOOP_TEST_MODE=1`. Success stdout is canonical JSON plus LF, diagnostics go to stderr, and exit codes are 0 success, 64 usage, 65 invalid data/state, 73 conflict/busy, 78 environment. `tests/cli-contract.test.ts` pins every case. Allowed child executables are enumerated/default-denied. Context/product tools remain absent. `ECHO_LOOP_HOME` is absolute/no-symlink; private `state/coord.sqlite` schema/migrations are pinned by the source oracle.

`provenance/parity-vectors.v1.json:1` names exact inputs for transaction ordering, retry/idempotency, role/deadline projection, busy/failure diagnostics, review publication, and workflow outcomes. The read-only operator runs `node tools/run-source-oracle.mjs --implementation-root <pinned-export> --vectors provenance/parity-vectors.v1.json --out <attempt-root>/source-oracle.v1.json`, then the same command against target clone. Canonical JSON recursively sorts object keys, preserves arrays, uses UTF-8/LF, and stores per-case/aggregate SHA-256 plus tool versions. Exact equality is required. `tools/audit-extraction.mjs --source-repo <explicit-source> --source-sha <pin> --target <clone> --source-oracle <file>` is the named operator audit. A mutation test changing target behavior and target vectors together must still fail against freshly regenerated pinned-source oracle. No criterion promises exactly-once external effects.

### AC4 — Ship reusable protocol templates, not Project_echo history

`/Users/zhenye/Desktop/echo-loop/templates/project/:1` contains the minimal installable backlog stages, AGENTS/CLAUDE fragments, task-state layout, review schemas, and adapter sources needed to initialize another repository. It must not copy Project_echo's completed backlog/review archive, wiki, raw corpus, meetings, journals, product decisions, or project-specific queue items. `/Users/zhenye/Desktop/echo-loop/backlog/:1` is echo-loop's own empty/current queue.

### AC5 — Preserve cross-vendor and fresh-eyes invariants

`/Users/zhenye/Desktop/echo-loop/tests/review-queue/:1` proves request SHA pinning, requested-reviewer enforcement, content-only reviewer bindings, wrapper-owned publication, response validation, combination, convergence, and founder checkpoints. It also covers duplicate same-reviewer ticks, watcher reads during publication, one atomic response/no partial combine, concurrent upstream push preservation, dirty-tree refusal without autostash loss, cleanup failure, and durable operator error before ephemeral cleanup. `/Users/zhenye/Desktop/echo-loop/tests/task-state/:1` proves pointer schema, line caps, anchors, ref pinning, and that reviewer ticks never read task state. Vendor adapters remain derived from canonical skills and drift checks fail.

### AC6 — Prove claim/build/review/merge safety on disposable repositories

`/Users/zhenye/Desktop/echo-loop/tests/workflows/local-fixture-loop.test.ts:1` creates only disposable scratch Git repositories and local fixture bare remotes. It proves proposed items are unclaimable, ready seals are fresh, claims are single-winner, worktrees isolate builders, builders cannot self-review/merge, watcher promotion is deterministic, and founder merge/push checkpoints remain explicit.

Every fixture child receives an explicit allowlisted environment and executes inside a scratch-write-only sandbox: scratch HOME/XDG/TMPDIR, disabled system/global config/hooks/templates/signing/askpass/SSH/proxies/alternates, fixed identity, and explicit Git/worktree/index/object paths under the fixture root. File transport operands are revalidated beneath the root immediately before use; symlink-swap and two-contender fixtures prove outside sentinels unchanged. No real repository, credential, network transport, or global config may influence tests.

### AC7 — Preserve provenance and prove source independence

`/Users/zhenye/Desktop/echo-loop/provenance/source-extraction.v1.json:1` maps every source blob/hash to destination hash/disposition/reason. A deliberate dirty source-worktree mutation cannot enter the target. Final scans/tests reject symlinks, submodules, absolute source paths outside provenance, escaping imports/process reads, and dependencies on echo-brain, echo-context, or Project_echo.

Before target creation, the orchestrator atomically creates unique 0700 `/Users/zhenye/Desktop/.echo-migration-evidence/134/<uuid>` and binds all oracle/profile/log evidence. After target HEAD, each verifier captures exact 40-hex HEAD/tree, clones to an absent unique root with `--no-local --no-hardlinks`, detaches that OID, verifies commit/tree, removes origin, proves clean/no-remotes/no-alternates/no-promisor, and rechecks shared HEAD unchanged.

Committed target profiles `tests/sandbox/fetch.sb.in` and `offline.sb.in` fail closed if sandbox-exec is unavailable. Phase 1 uses env-i/absolute pinned tools and `npm ci --ignore-scripts --no-audit --no-fund --cache <fetch-cache>` inside a filesystem-denial profile with registry network allowed; the result is admitted only after every package integrity matches the lock and a content manifest seals a cache copy, then node_modules is deleted. Phase 2 uses the sealed copy with `npm ci --offline --ignore-scripts --no-audit --no-fund` and deny-all network. Enumerated rebuilds and `npm run verify:extraction` run under offline profile. Positive/negative read/write/network probes and hostile sentinels are mandatory; profiles, cache hashes, commands, and exits remain in attempt evidence.

The named audit derives the source universe with the deterministic resolver, recomputes every blob/content hash, reconciles both manifests/target partition, regenerates source oracle, and validates target equality. Failures record phase/command/exit and stable evidence/scratch paths in the agent-run log/notes; only a unique canonical run-owned scratch root may be cleaned after no-symlink containment checks.

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
