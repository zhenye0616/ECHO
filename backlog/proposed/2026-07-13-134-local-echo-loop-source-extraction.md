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
  - /Users/zhenye/Desktop/echo-loop/**                          # NEW local-only orchestration repository; no remote
  - tools/repository-extraction/echo-loop.mjs                  # NEW orchestrator-owned start/resume/status/publish/handoff entrypoint
  - tools/repository-extraction/profiles/echo-loop.sb.in       # NEW scoped source/network/write sandbox policy template
  - tests/repository-extraction/echo-loop.test.ts              # NEW lifecycle, failpoint, publication, and handoff tests
  - raw/internal/migrations/2026-07-13-134-echo-loop.md        # NEW orchestrator-owned provenance, parity, and local-head record
spec_refs:
  - CLAUDE.md                                                  # current roles, pipeline, and cross-tool protocol ownership
  - backlog/README.md                                          # canonical backlog/review/claim mechanics to preserve
  - docs/AGENT_INSTRUCTIONS.md                                 # builder loop and drift rules
  - skills/role-typed-task-state.md                            # role-state contract and fresh-eyes invariant
  - backlog/complete/2026-05-11-039-cross-tool-review-dispatch-queue.md # original review queue contract
  - backlog/complete/2026-05-13-046-context-fatigue-via-role-typed-state.md # task-state substrate
  - backlog/complete/2026-05-16-057a-coord-substrate-and-observability.md # coordination append/deadline substrate
  - backlog/complete/2026-06-03-088-proposed-stage-pipeline.md # proposed-review gate
  - tools/review-queue/reviewer-bindings.json                  # current cross-vendor bindings
  - tools/review-queue/reviewers.json                          # current reviewer roster
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

The founder has named the internal agent-orchestration system `echo-loop`: the skills that teach agents the loop, backlog/task-state protocol, review queue, coordination/deadline substrate, builder/reviewer/merge workflows, and operator tooling. It must become source-independent from the client product and context platform. This item copies the orchestration closure from `Project_echo@2971310441b69735cbe759293abd8c4d044bf347` into a local `/Users/zhenye/Desktop/echo-loop` repository and proves its workflows against synthetic fixture repositories. `Project_echo` remains the migration source and historical backup; no target remote or authority transfer occurs here.

### AC1 — Create one local echo-loop Git repository with no remote

The committed orchestrator entrypoint is `node tools/repository-extraction/echo-loop.mjs <start|resume|status|quarantine-lock|verify-handoff>`. `start` requires `--run-id <uuid> --source-sha 2971310441b69735cbe759293abd8c4d044bf347`; `resume` requires run ID plus expected stale-owner nonce; tests alone may pass `--fault-after <checkpoint>` with `ECHO_EXTRACTION_TEST_MODE=1`. Exit codes are `0` success, `64` usage, `65` corrupt evidence, `73` conflict, `74` I/O, `75` live owner, `76` handoff mismatch, and `78` preflight. Stdout is one JSON result; stderr plus external state are durable diagnostics.

Mutable lifecycle state lives only at `/Users/zhenye/Desktop/.echo-extractions/134/<run-id>/state.json`, updated by temp-write/file-fsync/rename/parent-fsync. Atomic-mkdir lock ownership records item/source/run, nonce, PID, and `ps` start identity. Children validate the nonce and never reacquire. Live owners reject resume; stale or ownerless locks require explicit `quarantine-lock` with expected nonce—or inode+mtime when ownerless—and an operator reason, after which the same run resumes under a new nonce. Unknown/mismatched state, staging, locks, or targets are preserved and refused. Per-command hash checkpoints make every build/verify step idempotent.

External state is fsynced at `ready_to_publish` with run/item/source, branch, HEAD, tree, provenance, and package hashes; committed `provenance/candidate.v1.json` holds immutable run/item/source identity. Publication uses capability-preflighted `renameatx_np(..., RENAME_EXCL)` plus parent fsync. A post-rename crash enters reconcile-only resume: finalization is allowed only when candidate identity, HEAD/tree/hashes, clean status, branch, and no-remotes exactly match `ready_to_publish`; otherwise no mutation. Tests inject failure after lock mkdir-before-owner, every build/verify checkpoint, rename, report, external `published`, and before unlock, and race a foreign target immediately before publication. `/Users/zhenye/Desktop/echo-loop/.git:1` ends clean on branch `migration/2026-07-13-134-local-echo-loop-source-extraction`, with no remote. No GitHub repository, release, publication, launchd install, or external-project mutation is permitted.

### AC2 — Give echo-loop accurate orchestration ownership

`/Users/zhenye/Desktop/echo-loop/package.json:1` names private package/binary `echo-loop`, sets exact `engines.node:22.22.1` and `packageManager:npm@10.9.4`, and contains no source-path dependency; committed `package-lock.json:1` is the clean-install lock. `provenance/source-plan.v1.json:1` inventories every commit-object path considered from canonical `skills/`, review/backlog/task-state/coord/builder/merge tools and their transitive imports, assigning `copied`, `rewritten`, `template`, or `excluded` with rationale; a checker rejects unclassified transitive imports and historical corpus leakage. `provenance/dependency-set.v1.json:1` derives direct packages from bare imports in that final closure, pins exact versions from the source lock, and adds only pinned `typescript`, `vitest`, `eslint`, and `@types/node`; missing/extra/ranged dependencies fail. The extractor records capability preflights for Git, Node `v22.22.1`, npm `10.9.4`, Python 3/`renameatx_np`, sandbox-exec, shasum, and process-group timeout. `/Users/zhenye/Desktop/echo-loop/src/:1`, `skills/:1`, and `tools/:1` own only the vendor-neutral orchestration protocol: proposed/ready/claim/review/complete mechanics, role-typed task state, review dispatch/validation/combination, coordination roles/deadlines/events, merge/cleanup, builder bindings, and skill installation/adapters. Product meeting logic and general context capture/retrieval are forbidden.

### AC3 — Split orchestration MCP/coord surfaces from context retrieval

`/Users/zhenye/Desktop/echo-loop/src/api/:1` exposes only loop-owned operations such as coordination emission/invocation, role-state reads, skill/protocol reads, and queue status. It must not register `search_memories`, `find_clusters`, `get_atom(s)`, capture controls, Granola retrieval, or any client-product action. Loop state lives only at validated absolute, non-symlink `ECHO_LOOP_HOME/state/coord.sqlite`; race-safe 0700 directory creation and transactional schema migration support two simultaneous first opens. Every connection sets WAL, `foreign_keys=ON`, `synchronous=FULL`, and `busy_timeout=5000` and uses bounded 50/100/200/400 ms busy retry before atomically writing an operator diagnostic under `ECHO_LOOP_HOME/logs` and failing.

One `BEGIN IMMEDIATE` transaction accepts a stable caller-supplied idempotency key, inserts the immutable event with `INTEGER PRIMARY KEY AUTOINCREMENT`, and applies its role/deadline projection before commit. `ON CONFLICT(idempotency_key)` returns the original sequence/result without reapplying the projection; event and projection can never become independently visible. Tests cover concurrent writers, unique monotonic sequence, no loss/reorder, duplicate retry, deadline races, injected rollback between event/projection, killed process, two-process absent-store initialization, busy exhaustion, migration failure, and corrupt/truncated database. It may not import `echo-context` or point at the context database.

### AC4 — Ship project-local protocol templates, not Project_echo history

`/Users/zhenye/Desktop/echo-loop/templates/project/:1` contains the minimal installable backlog stages, AGENTS/CLAUDE guidance fragments, task-state layout, review schemas, and generated-adapter sources required to initialize another repository. It must not copy Project_echo's complete/archive/review history, product wiki, raw meetings, dogfooding journals, product decisions, or project-specific backlog items. `/Users/zhenye/Desktop/echo-loop/backlog/:1` is echo-loop's own empty/current work queue, not the historical Project_echo queue.

### AC5 — Preserve cross-vendor and fresh-eyes invariants

`/Users/zhenye/Desktop/echo-loop/tests/review-queue/:1` proves request SHA pinning, requested-reviewer enforcement, content-only reviewer bindings, wrapper-owned publication, fresh-eyes prohibition on task-state reads, response validation, combination, round convergence, and founder push checkpoints. `tests/task-state/:1` proves pointer schema, line caps, anchor parsing, and ref-pinned reads. Vendor adapters remain derived from canonical `skills/` sources and drift checks fail on mismatch.

### AC6 — Preserve claim/build/merge safety against fixture repositories

`/Users/zhenye/Desktop/echo-loop/tests/workflows/:1` creates disposable local fixture Git repositories and proves proposed items are unclaimable, ready seals are fresh, atomic claims are single-winner, worktrees are isolated, builders cannot self-review/merge, watcher promotion is deterministic, and merge/push checkpoints remain explicit. Each fixture uses its own temporary `HOME`, `XDG_CONFIG_HOME`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, disabled hooks, empty credential helpers, and explicit author identity. Git commands permit `protocol.file` only for an absolute fixture-owned bare remote, validate the resolved remote remains beneath the fixture root before push, and clean worktrees/remotes in `finally`; system/global config, hooks, URL rewrites, credentials, external repositories, and network transports cannot influence a test.

### AC7 — Record provenance and prove source independence

`/Users/zhenye/Desktop/echo-loop/provenance/source-extraction.v1.json:1` records every copied/relocated/rewritten source with source blob, destination hash, disposition, and change rationale. Every source byte is materialized with `git show 2971310441b69735cbe759293abd8c4d044bf347:<path>` or an equivalent archive of that commit; a test dirties the source worktree deliberately and proves the dirty bytes never enter the candidate. `tests/migration/source-independence.test.ts:1` rejects symlinks, submodules, absolute source paths outside provenance, imports escaping the repository, and dependencies on `echo-brain`, `echo-context`, or `Project_echo`.

The orchestrator renders `tools/repository-extraction/profiles/echo-loop.sb.in` with candidate-verification and scratch paths. `/usr/bin/sandbox-exec` denies source reads, all network, and writes outside those declared roots; preflight proves a source read and adversarial external write fail while required scratch/candidate-copy writes succeed. It never renames/chmods/unmounts the source. Under `env -i` with resolved toolchain `PATH`, scratch `HOME`/`TMPDIR`/`ECHO_LOOP_HOME`, locale, and timezone, a bounded process-group supervisor runs: `npm ci --ignore-scripts=false --no-audit --no-fund`, `npm run typecheck`, `npm run lint`, `npm run check:dependencies`, `npm run check:source-plan`, `npm run skills:check`, `npm run test:backlog`, `npm run test:task-state`, `npm run test:review-queue`, `npm run test:coord`, `npm run test:workflows`, `npm run smoke:package`, and `npm test`. Timeout/signal kills all descendants and records remaining PIDs; mutable diagnostics live only in external state.

### AC8 — Stop before installation or authority transfer

The migration record is written only to repository-relative `raw/internal/migrations/2026-07-13-134-echo-loop.md` in the active orchestrator worktree. It records run/staging IDs, resolved toolchain, every command/exit, test/closure counts, provenance/source-plan/dependency hashes, final path, branch, clean HEAD/tree, porcelain, and `candidate_authority:false`, `remote_created:false`, `external_projects_mutated:false`. Independent review starts with `node tools/repository-extraction/echo-loop.mjs verify-handoff --record raw/internal/migrations/2026-07-13-134-echo-loop.md`; read-only validation covers record schema, target/object existence, committed candidate identity, HEAD/tree/hashes, branch, cleanliness including untracked files, and no remotes, returning JSON or exit `76`. The candidate remains unchanged through disposition; active Project_echo orchestration and launchd jobs remain authoritative and untouched.

## Out of Scope (Don't Drift)

- Do not create/configure a remote, publish a package, install launchd jobs, or mutate another repository.
- Do not copy Project_echo's historical backlog/archive/reviews/wiki/raw corpus into echo-loop.
- Do not extract or modify `echo-brain` or `echo-context`.
- Do not include meeting/product logic, capture adapters, normalization, trace clustering, or retrieval MCP tools.
- Do not redesign the backlog/review protocol, add a scheduler, or change founder approval semantics.
- Do not use ECHO MCP or the live context database in tests.
- Do not remove/freeze current Project_echo orchestration paths or advance any product maturity.

## Risks

- **MCP monolith coupling:** coord/task-state tools currently share server/storage code with retrieval. Mitigation: extract only loop-owned operations and give them a minimal private store/API; no cross-repo source dependency.
- **History leakage:** copying `backlog/` wholesale would turn product/context history into loop source. Mitigation: installable templates plus an empty/current echo-loop queue only.
- **False parity from self-hosting:** tests could accidentally invoke Project_echo tools. Mitigation: disposable fixture repositories, sanitized PATH/environment, and inaccessible source path during final verification.
- **Global operator disruption:** installing launchd or skill adapters could break the active loop. Mitigation: local package/fixture tests only; installation is explicitly later.

## Tests

- `/Users/zhenye/Desktop/echo-loop/tests/review-queue/` — request, wrapper, response, combination, convergence, and fresh-eyes contracts.
- `/Users/zhenye/Desktop/echo-loop/tests/task-state/` — role-state schema, anchors, ref pinning, and line cap.
- `/Users/zhenye/Desktop/echo-loop/tests/coord/` — loop-owned event/role/deadline behavior on private storage.
- `/Users/zhenye/Desktop/echo-loop/tests/workflows/local-fixture-loop.test.ts` — proposed through reviewed merge on disposable local repositories with explicit founder checkpoints.
- `tests/repository-extraction/echo-loop.test.ts` — orchestrator start/resume/status/quarantine/handoff commands, all failpoints, live/stale/ownerless locks, no-replace publication, and reconcile-only recovery.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/committed-source-only.test.ts` — dirty source-worktree bytes are excluded from commit-object materialization.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-plan.test.ts` — deterministic source disposition and transitive-import closure reject history/product/context leakage.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/dependency-set.test.ts` — bare-import-derived exact dependency set has no omissions or extras.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-independence.test.ts` — no source/sibling dependency or history leakage.
- Commands: `npm ci --ignore-scripts=false --no-audit --no-fund`, `npm run typecheck`, `npm run lint`, `npm run skills:check`, `npm run test:backlog`, `npm run test:task-state`, `npm run test:review-queue`, `npm run test:coord`, `npm run test:workflows`, `npm run smoke:package`, `npm test`, `tools/verify-source-independence.sh`, and `git diff --check`. Each named script has a non-zero failure contract; no `or native equivalent` escape is allowed.

## After Completion (Strategist Notes)

- Do not install or switch the active Project_echo loop yet.
- After local parity, propose authority transfer and per-repository installation contracts separately.
- Preserve Project_echo as the full historical backup; echo-loop owns protocol implementation only after the later cutover.
