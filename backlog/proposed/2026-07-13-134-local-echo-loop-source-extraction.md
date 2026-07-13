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
  - raw/internal/migrations/2026-07-13-134-echo-loop.md        # NEW Project_echo handoff/provenance/parity record
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

One assigned builder lane owns `/Users/zhenye/Desktop/echo-loop`; sibling lanes never touch it. The absent target is created directly and initialized on branch `migration/2026-07-13-134` with local identity `ECHO Migration Agent <migration@echo.local>`, signing/hooks/templates/global and system Git config disabled, and no remote. All source bytes come from pinned commit objects via `git show`/`git archive`, not the dirty source checkout.

This is an attended one-time build. Do not add a Project_echo extraction CLI, daemon, lifecycle state, locks/takeover, publication helpers, or recovery framework. An interrupted target is incomplete and unaccepted; the orchestrator inspects and archives it before a fresh assigned run. No other agent automatically adopts, deletes, resumes, or repairs it.

The accepted target ends clean with a committed local history, exactly the migration branch, and no remote. Its README identifies the scope, pinned source, item, active Project_echo authority, and later installation/cutover gate.

### AC2 — Give echo-loop accurate orchestration ownership

`/Users/zhenye/Desktop/echo-loop/package.json:1` pins Node/npm and owns a committed lockfile. `/Users/zhenye/Desktop/echo-loop/src/:1`, `skills/:1`, and `tools/:1` contain only agent-loop capabilities: skills and derived adapters, backlog/task-state/review protocols, coordination/deadlines, builder/reviewer/merge workflows, fixture-safe operator commands, and package initialization.

`provenance/source-plan.v1.json:1` records every copied/relocated/rewritten/excluded source row and classifies static/dynamic imports, runtime reads, shell/shebang edges, package scripts, PATH lookups, and child executables. Product meeting logic, capture/normalization/storage/retrieval, context MCP tools, Project_echo history, and source/sibling dependencies are forbidden. Direct dependencies derive from final imports and scripts at exact versions.

### AC3 — Preserve loop-owned coordination semantics without claiming external exactly-once action

`/Users/zhenye/Desktop/echo-loop/src/api/:1` exposes only loop-owned coordination emission/invocation, role-state reads, skill/protocol reads, and queue status. It does not register memory search, clusters, atoms, capture controls, Granola retrieval, or client-product actions. Loop state uses validated `ECHO_LOOP_HOME` and a private SQLite store, never echo-context or live Project_echo state.

Target tests preserve current transaction, ordering, role/deadline projection, busy/failure diagnostics, and idempotent retry behavior for effects committed in the same loop store. No acceptance criterion promises exactly-once external effects; external actions remain forbidden. Initialization/concurrency tests pin the observed source behavior rather than adding a new migration lifecycle.

### AC4 — Ship reusable protocol templates, not Project_echo history

`/Users/zhenye/Desktop/echo-loop/templates/project/:1` contains the minimal installable backlog stages, AGENTS/CLAUDE fragments, task-state layout, review schemas, and adapter sources needed to initialize another repository. It must not copy Project_echo's completed backlog/review archive, wiki, raw corpus, meetings, journals, product decisions, or project-specific queue items. `/Users/zhenye/Desktop/echo-loop/backlog/:1` is echo-loop's own empty/current queue.

### AC5 — Preserve cross-vendor and fresh-eyes invariants

`/Users/zhenye/Desktop/echo-loop/tests/review-queue/:1` proves request SHA pinning, requested-reviewer enforcement, content-only reviewer bindings, wrapper-owned publication, response validation, combination, convergence, and founder checkpoints. `/Users/zhenye/Desktop/echo-loop/tests/task-state/:1` proves pointer schema, line caps, anchors, ref pinning, and that reviewer ticks never read task state. Vendor adapters remain derived from canonical skills and drift checks fail.

### AC6 — Prove claim/build/review/merge safety on disposable repositories

`/Users/zhenye/Desktop/echo-loop/tests/workflows/local-fixture-loop.test.ts:1` creates only disposable scratch Git repositories and local fixture bare remotes. It proves proposed items are unclaimable, ready seals are fresh, claims are single-winner, worktrees isolate builders, builders cannot self-review/merge, watcher promotion is deterministic, and founder merge/push checkpoints remain explicit.

Every fixture child receives an explicit allowlisted environment: scratch HOME/XDG/TMPDIR, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, empty credential helpers, disabled hooks/templates/signing/askpass/SSH/proxies/alternate-object variables, fixed identity, and explicit Git/worktree/index/object paths under the fixture root. File transport is permitted only for operands revalidated beneath that root immediately before each operation. No real repository, credential, network transport, or global config may influence tests.

### AC7 — Preserve provenance and prove source independence

`/Users/zhenye/Desktop/echo-loop/provenance/source-extraction.v1.json:1` maps every source blob/hash to destination hash/disposition/reason. A deliberate dirty source-worktree mutation cannot enter the target. Final scans/tests reject symlinks, submodules, absolute source paths outside provenance, escaping imports/process reads, and dependencies on echo-brain, echo-context, or Project_echo.

After target HEAD is committed, verification exports it to a fresh temp directory, installs from its lock under scratch HOME/npm config with auth/proxy variables removed, then runs with network disabled and a temporary macOS sandbox denial for Project_echo, siblings, live state, credentials, and external writes. Exact source-plan, dependency, skills/adapters, backlog, task-state, review, coord, workflow, package, test, source-independence, and `git diff --check` commands must pass from exported HEAD.

### AC8 — Record the local handoff and stop before installation

After all checks pass, the builder writes `raw/internal/migrations/2026-07-13-134-echo-loop.md` in its isolated Project_echo feature worktree. The record contains source SHA, commands/exits, target path/branch/HEAD/tree, package/lock/source-plan/dependency/skill hashes, test summaries, no-remotes/clean status, exclusions/differences, and `authority:false`, `installed:false`. The builder commits that record with the backlog handoff and does not mutate target history afterward.

Independent review reruns target-local checks and fixture workflows and compares record hashes. Passing proves only a local source split; the active Project_echo loop, launchd jobs, user-level skill adapters, and repository authority remain unchanged.

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
