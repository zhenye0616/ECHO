---
id: 2026-07-13-134-local-echo-loop-source-extraction
title: "Local standalone echo-loop orchestration source extraction and parity proof"
status: proposed
priority: HIGH
estimate: 5d
created: 2026-07-13
blocked_by: []
task_state_ref: 2026-07-13-134-local-echo-loop-source-extraction
requested_reviewers: ["codex", "cursor"]
files_to_modify:
  - /Users/zhenye/Desktop/echo-loop/**                          # NEW local-only orchestration repository; no remote
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

`/Users/zhenye/Desktop/echo-loop/.git:1` exists on branch `migration/2026-07-13-134-local-echo-loop-source-extraction`, records the pinned source SHA in its initial content commit, and has no configured remote. The target directory must be absent before start. No GitHub repository, tag, release, package publication, launchd installation, or mutation of external project repositories is permitted.

### AC2 — Give echo-loop accurate orchestration ownership

`/Users/zhenye/Desktop/echo-loop/package.json:1` names private package/binary `echo-loop`, owns exact runtime/dev dependencies including `@types/node`, and contains no source-path dependency. `/Users/zhenye/Desktop/echo-loop/src/:1`, `skills/:1`, and `tools/:1` own only the vendor-neutral orchestration protocol: proposed/ready/claim/review/complete mechanics, role-typed task state, review dispatch/validation/combination, coordination roles/deadlines/events, merge/cleanup, builder bindings, and skill installation/adapters. Product meeting logic and general context capture/retrieval are forbidden.

### AC3 — Split orchestration MCP/coord surfaces from context retrieval

`/Users/zhenye/Desktop/echo-loop/src/api/:1` exposes only loop-owned operations such as coordination emission/invocation, role-state reads, skill/protocol reads, and queue status. It must not register `search_memories`, `find_clusters`, `get_atom(s)`, capture controls, Granola retrieval, or any client-product action. If the extracted coord/task-state code needs append-only storage, echo-loop owns a minimal private store/schema; it may not import `echo-context` or point at the context database.

### AC4 — Ship project-local protocol templates, not Project_echo history

`/Users/zhenye/Desktop/echo-loop/templates/project/:1` contains the minimal installable backlog stages, AGENTS/CLAUDE guidance fragments, task-state layout, review schemas, and generated-adapter sources required to initialize another repository. It must not copy Project_echo's complete/archive/review history, product wiki, raw meetings, dogfooding journals, product decisions, or project-specific backlog items. `/Users/zhenye/Desktop/echo-loop/backlog/:1` is echo-loop's own empty/current work queue, not the historical Project_echo queue.

### AC5 — Preserve cross-vendor and fresh-eyes invariants

`/Users/zhenye/Desktop/echo-loop/tests/review-queue/:1` proves request SHA pinning, requested-reviewer enforcement, content-only reviewer bindings, wrapper-owned publication, fresh-eyes prohibition on task-state reads, response validation, combination, round convergence, and founder push checkpoints. `tests/task-state/:1` proves pointer schema, line caps, anchor parsing, and ref-pinned reads. Vendor adapters remain derived from canonical `skills/` sources and drift checks fail on mismatch.

### AC6 — Preserve claim/build/merge safety against fixture repositories

`/Users/zhenye/Desktop/echo-loop/tests/workflows/:1` creates disposable local fixture Git repositories and proves proposed items are unclaimable, ready seals are fresh, atomic claims are single-winner, worktrees are isolated, builders cannot self-review/merge, watcher promotion is deterministic, and merge/push checkpoints remain explicit. Tests use local bare fixture remotes only; they cannot touch `Project_echo`, any target sibling repo, or a network remote.

### AC7 — Record provenance and prove source independence

`/Users/zhenye/Desktop/echo-loop/provenance/source-extraction.v1.json:1` records every copied/relocated/rewritten source with source blob and destination hashes. `tests/migration/source-independence.test.ts:1` rejects symlinks, submodules, absolute source paths outside provenance, imports escaping the repository, and dependencies on `echo-brain`, `echo-context`, or `Project_echo`. Verification runs clean install, typecheck, lint, skill-sync check, backlog selector tests, task-state tests, review-queue tests, coord tests, fixture end-to-end workflow, and package smoke from the native repo.

### AC8 — Stop before installation or authority transfer

`/Users/zhenye/Desktop/Project_echo/raw/internal/migrations/2026-07-13-134-echo-loop.md:1` records local head, commands/exit codes, test counts, closure counts, provenance hash, and `candidate_authority:false`, `remote_created:false`, `external_projects_mutated:false`. The current Project_echo orchestration remains operational and authoritative until a later founder-accepted cutover; this item does not install echo-loop globally or change review launchd jobs.

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
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-independence.test.ts` — no source/sibling dependency or history leakage.
- Commands: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run skills:check`, `python3 tools/blocked.py --selftest` (or native equivalent), fixture workflow smoke, package smoke, and `git diff --check`.

## After Completion (Strategist Notes)

- Do not install or switch the active Project_echo loop yet.
- After local parity, propose authority transfer and per-repository installation contracts separately.
- Preserve Project_echo as the full historical backup; echo-loop owns protocol implementation only after the later cutover.
