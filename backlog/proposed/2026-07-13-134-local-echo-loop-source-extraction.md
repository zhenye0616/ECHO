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
  - tools/repository-extraction/echo-loop.mjs                  # NEW orchestrator-owned one-shot extract/status/discard/handoff entrypoint
  - tools/repository-extraction/profiles/echo-loop.sb.in       # NEW scoped source/network/write sandbox policy template
  - tests/repository-extraction/echo-loop.test.ts              # NEW lifecycle, failpoint, publication, and handoff tests
  - raw/internal/migrations/2026-07-13-134-echo-loop.md        # NEW orchestrator-owned provenance, parity, and local-head record
spec_refs:
  - raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md # reviewed lifecycle simplification shared by all three lanes
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

The committed entrypoint is `node tools/repository-extraction/echo-loop.mjs <extract|status|verify-handoff|discard>`. One-shot `extract --run-id <uuid> --source-sha 2971310441b69735cbe759293abd8c4d044bf347` is founder-monitored; exit codes are `0/64/73/76/78`. Test-only faults/root overrides require `ECHO_EXTRACTION_TEST_MODE=1`. The tool snapshots and hashes committed script/profile/helper bytes once before candidate writes; the later record-only evidence commit may advance Project_echo HEAD but may not alter those bound blobs.

Lifecycle is `ABSENT -> RUNNING -> PUBLISHED | FAILED`. Atomic `mkdir /Users/zhenye/Desktop/.echo-extractions/134` claims this target; state records run, owner, child group IDs, staging, control hashes, and outcomes. Automatic resume/takeover, quarantine tokens, fcntl guards, checkpoint reuse, and signaling by later processes are forbidden. Normal signals terminate the active group and fail the run. `discard --expected-run-id <id> --reason <text>` refuses a final target or possibly-live process, then RENAME_EXCL-archives state/staging/record/cache/output without deletion; the next attempt is a fresh pinned extraction.

After verification, `extract` commits candidate identity, deterministically renders and RENAME_EXCL-publishes the migration record (EEXIST requires byte equality), then RENAME_EXCL-publishes staging to `/Users/zhenye/Desktop/echo-loop` and fsyncs the parent. Target + record + committed identity define `PUBLISHED`; status/handoff derive it read-only even after a post-rename hard kill. Before target publication, failure requires discard; after it, discard/resume are forbidden. Tests cover every boundary and foreign target/record races. Final echo-loop is clean on its migration branch with no remote.

### AC2 — Give echo-loop accurate orchestration ownership

`/Users/zhenye/Desktop/echo-loop/package.json:1` pins Node/npm and owns a committed lock. `source-plan.v1.json` classifies static/dynamic imports, literal/computed runtime reads, shell sourcing/shebangs, package scripts, PATH resolution, and literal/computed child executables. Final sandbox policy is default-deny for host reads and exec: only candidate/cache/scratch plus hashed, absolute, preflighted OS tools/interpreters are allowed; unresolved dynamic edges fail extraction. Npm executables bind exact packages. Tests cover computed reads/exec, shell expansion, shebangs, poisoned PATH, and undeclared host dependencies. Product/context code remains forbidden.

### AC3 — Split orchestration MCP/coord surfaces from context retrieval

`/Users/zhenye/Desktop/echo-loop/src/api/:1` exposes only loop-owned operations such as coordination emission/invocation, role-state reads, skill/protocol reads, and queue status. It must not register `search_memories`, `find_clusters`, `get_atom(s)`, capture controls, Granola retrieval, or any client-product action. Loop state lives only at validated absolute, non-symlink `ECHO_LOOP_HOME/state/coord.sqlite`; race-safe 0700 directory creation and transactional schema migration support two simultaneous first opens. Every connection sets WAL, `foreign_keys=ON`, `synchronous=FULL`, and `busy_timeout=5000` and uses bounded 50/100/200/400 ms busy retry before atomically writing an operator diagnostic under `ECHO_LOOP_HOME/logs` and failing.

One `BEGIN IMMEDIATE` transaction keys uniqueness by normalized `caller_identity + idempotency_key`. Fingerprint bytes are canonical UTF-8 JSON of `{caller_identity,operation,payload}` with recursively sorted object keys, preserved array order, finite safe-integer numbers only, rejection of undefined/NaN/infinity/bigint/functions, and one LF. Exact matches return the original result without reprojection; mismatches fail without state change. Tests cover nested key order, caller scope, same/different payload concurrency.

Store initialization writes and fsyncs an external intent marker before schema work; the next opener converts a leftover intent into a durable interrupted-initialization diagnostic. Every busy/corrupt/schema/init/migration terminal failure uses collision-safe O_EXCL filenames, file+parent fsync, and includes operation/DB/error/recovery; if logging also fails, structured stderr/caller error preserves both failures. Tests cover kill/reopen, concurrent diagnostics, and unwritable/full log roots. It may not import `echo-context`.

### AC4 — Ship project-local protocol templates, not Project_echo history

`/Users/zhenye/Desktop/echo-loop/templates/project/:1` contains the minimal installable backlog stages, AGENTS/CLAUDE guidance fragments, task-state layout, review schemas, and generated-adapter sources required to initialize another repository. It must not copy Project_echo's complete/archive/review history, product wiki, raw meetings, dogfooding journals, product decisions, or project-specific backlog items. `/Users/zhenye/Desktop/echo-loop/backlog/:1` is echo-loop's own empty/current work queue, not the historical Project_echo queue.

### AC5 — Preserve cross-vendor and fresh-eyes invariants

`/Users/zhenye/Desktop/echo-loop/tests/review-queue/:1` proves request SHA pinning, requested-reviewer enforcement, content-only reviewer bindings, wrapper-owned publication, fresh-eyes prohibition on task-state reads, response validation, combination, round convergence, and founder push checkpoints. `tests/task-state/:1` proves pointer schema, line caps, anchor parsing, and ref-pinned reads. Vendor adapters remain derived from canonical `skills/` sources and drift checks fail on mismatch.

### AC6 — Preserve claim/build/merge safety against fixture repositories

`/Users/zhenye/Desktop/echo-loop/tests/workflows/:1` creates disposable local fixture Git repositories and proves proposed items are unclaimable, ready seals are fresh, atomic claims are single-winner, worktrees are isolated, builders cannot self-review/merge, watcher promotion is deterministic, and merge/push checkpoints remain explicit. Each fixture uses its own temporary `HOME`, `XDG_CONFIG_HOME`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, disabled hooks, empty credential helpers, and explicit author identity. Git commands permit `protocol.file` only for an absolute fixture-owned bare remote, validate the resolved remote remains beneath the fixture root before push, and clean worktrees/remotes in `finally`; system/global config, hooks, URL rewrites, credentials, external repositories, and network transports cannot influence a test.

### AC7 — Record provenance and prove source independence

`/Users/zhenye/Desktop/echo-loop/provenance/source-extraction.v1.json:1` records every copied/relocated/rewritten source with source blob, destination hash, disposition, and change rationale. Every source byte is materialized with `git show 2971310441b69735cbe759293abd8c4d044bf347:<path>` or an equivalent archive of that commit; a test dirties the source worktree deliberately and proves the dirty bytes never enter the candidate. `tests/migration/source-independence.test.ts:1` rejects symlinks, submodules, absolute source paths outside provenance, imports escaping the repository, and dependencies on `echo-brain`, `echo-context`, or `Project_echo`.

Before isolation, `dependency-cache-ready` runs `npm ci --ignore-scripts --no-audit --no-fund --cache <run>/npm-cache` in a scratch lock-copy. Cache admission is based on source-lock cryptographic integrity, not an unenforceable URL/redirect claim; a sorted cache manifest is recorded and acquisition `node_modules` removed. All later npm/scripts have network denied. Under `env -i` with explicit absolute tool PATH and cache/scratch roots, the active supervisor runs offline install and every named check/test/smoke. Empty operator cache succeeds; missing staged content fails. Normal timeout/signal terminates the active group; hard-kill survivors make discard refuse.

### AC8 — Stop before installation or authority transfer

The record includes control/cache/provenance/source-plan/dependency hashes and false authority/remote/mutation. `verify-handoff --expected-run-id <id>` derives canonical non-symlink state/record/target paths from production roots; caller-selected alternate bundles are forbidden. It compares record/state/candidate identity, validates the originally bound control commit/blobs despite the later record-only evidence commit, and checks Git objects/tree/cleanliness/branch/no-remotes. Candidate stays unchanged; active loop remains authoritative.

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
- **Interrupted one-shot work:** a crash can discard completed local work. Mitigation: attended execution, archived evidence/cache, and a fresh deterministic run; no automatic ownership transfer.

## Tests

- `/Users/zhenye/Desktop/echo-loop/tests/review-queue/` — request, wrapper, response, combination, convergence, and fresh-eyes contracts.
- `/Users/zhenye/Desktop/echo-loop/tests/task-state/` — role-state schema, anchors, ref pinning, and line cap.
- `/Users/zhenye/Desktop/echo-loop/tests/coord/` — loop-owned event/role/deadline behavior on private storage.
- `/Users/zhenye/Desktop/echo-loop/tests/workflows/local-fixture-loop.test.ts` — proposed through reviewed merge on disposable local repositories with explicit founder checkpoints.
- `tests/repository-extraction/echo-loop.test.ts` — one-shot claim/fail/discard/fresh-run; publication races; cold-cache/offline install; control snapshots; hard-kill refusal; canonical handoff; isolated roots.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/committed-source-only.test.ts` — dirty source-worktree bytes are excluded from commit-object materialization.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-plan.test.ts` — deterministic source disposition and transitive-import closure reject history/product/context leakage.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/dependency-set.test.ts` — bare-import-derived exact dependency set has no omissions or extras.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-independence.test.ts` — no source/sibling dependency or history leakage.
- Coord tests include same-key/same-payload idempotent retry, same-key/different-payload rejection, and durable evidence for every terminal store-open/migration failure.
- Commands start with offline `npm ci`, then exact type/lint/source/dependency/skill/backlog/task-state/review/coord/workflow/package/full-test/source-independence checks and `git diff --check`; any failure requires discard + fresh extract.

## After Completion (Strategist Notes)

- Do not install or switch the active Project_echo loop yet.
- After local parity, propose authority transfer and per-repository installation contracts separately.
- Preserve Project_echo as the full historical backup; echo-loop owns protocol implementation only after the later cutover.
