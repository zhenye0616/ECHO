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
  - tools/repository-extraction/echo-loop.mjs                  # NEW one-shot extract/status/discard plus post-publish evidence/handoff entrypoint
  - tools/repository-extraction/helpers/echo-loop-rename-excl.py # NEW pinned renameatx_np(RENAME_EXCL) directory helper
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

The committed entrypoint is `node tools/repository-extraction/echo-loop.mjs <extract|status|publish-record|verify-handoff|discard>`. One-shot `extract` requires run ID and the pinned source SHA; exit codes are `0/64/73/76/78`. Test roots require test mode. Preflight binds the canonical isolated Project_echo worktree/common-dir, branch ref, clean index/worktree, control HEAD, and committed script/profile/target-specific Python RENAME_EXCL-helper blobs. The helper calls macOS `renameatx_np(..., RENAME_EXCL)` through `ctypes` and is an immutable control input.

Lifecycle is `ABSENT -> RUNNING -> PUBLISHED | FAILED`. The tool builds and fsyncs a complete initial state in `/Users/zhenye/Desktop/.echo-extractions/new/134-<run-id>`, then RENAME_EXCL-renames that initialized directory to fixed claim `/Users/zhenye/Desktop/.echo-extractions/134` and fsyncs the parent; that rename elects the run. Pre-claim crashes/losers archive only their unclaimed directory. All mutable run material is beneath the claim. State updates are temp-write/file-fsync/atomic-rename/directory-fsync. Each child group waits behind a bound parent gate until PID, PGID, process start identity, and executable are durably recorded; EOF exits before work. Later invocations never signal. Exact live identity blocks discard; reused PID with different birth/executable is quiescent. Normal signals are handled only by the active supervisor.

`discard` requires target absence and quiescent exact identities, then one RENAME_EXCL move of the whole claim directory to `/Users/zhenye/Desktop/.echo-extractions/archive/134-<run-id>-<state-digest>` plus parent fsync. Pre-rename failure is retryable discard; post-rename a fresh initialized claim can win. Invalid/foreign contents are refused. Tests cover pre/post claim election, state/gate, discard, and durability boundaries.

After recursive staging file/directory fsync, the helper RENAME_EXCL-publishes `/Users/zhenye/Desktop/echo-loop` and fsyncs its parent. Target + committed `candidate.v1.json` define PUBLISHED independently of Project_echo evidence; an explicitly recorded rename/fsync error remains fail-closed. `publish-record` runs only afterward: it uses exact run-local bytes and the bound isolated worktree, temporary index, `commit-tree`, and expected-old-SHA `update-ref` CAS to create one record-only child commit. It refuses drift/unrelated changes, then updates the bound index under lock and proves clean; retry accepts the exact child and repairs only the exact post-CAS index window. Evidence failure never mutates target. Final target is clean on its migration branch with no remote.

### AC2 — Give echo-loop accurate orchestration ownership

`/Users/zhenye/Desktop/echo-loop/package.json:1` pins Node/npm and owns a committed lock. `source-plan.v1.json` classifies static/dynamic imports, literal/computed runtime reads, shell sourcing/shebangs, scripts, PATH resolution, and child executables. Separate executable and `runtime-closure.v1.json` manifests bind realpaths/hashes for tools plus interpreter, Git exec-path, Node/npm module, dynamic-library, and immutable system-runtime reads; validate immediately before use. Production sandbox permits only candidate/run roots and manifested runtime reads, denies undeclared host reads and all post-acquisition network, and must pass the full cold-cache workflow. Product/context code remains forbidden.

### AC3 — Split orchestration MCP/coord surfaces from context retrieval

`/Users/zhenye/Desktop/echo-loop/src/api/:1` exposes only loop-owned operations such as coordination emission/invocation, role-state reads, skill/protocol reads, and queue status. It must not register `search_memories`, `find_clusters`, `get_atom(s)`, capture controls, Granola retrieval, or any client-product action. Loop state lives only at validated absolute, non-symlink `ECHO_LOOP_HOME/state/coord.sqlite`; race-safe 0700 directory creation and transactional schema migration support two simultaneous first opens. Every connection sets WAL, `foreign_keys=ON`, `synchronous=FULL`, and `busy_timeout=5000` and uses bounded 50/100/200/400 ms busy retry before atomically writing an operator diagnostic under `ECHO_LOOP_HOME/logs` and failing.

One `BEGIN IMMEDIATE` transaction keys uniqueness by literal `caller_identity + idempotency_key`. Caller identity must match `[a-z][a-z0-9-]{0,63}` and key `[A-Za-z0-9._:-]{1,128}`; there is no Unicode, whitespace, or case normalization. Fingerprint bytes are canonical UTF-8 JSON of `{caller_identity,operation,payload}` with recursively sorted keys, preserved arrays, finite safe integers only, strict non-JSON rejection, and LF. Exact matches return the original transactional result; mismatch fails without mutation. This guarantee applies only when every effect is committed in the same SQLite transaction. External actions are forbidden; a transaction may emit an outbox intent but does not claim exactly-once delivery. Tests cover validation, caller scope, canonicalization, concurrency, and kills before/after commit.

Initialization uses O_EXCL intent ownership bound to run token, PID/start identity, and executable before schema work. A contender seeing the exact live owner waits/retries under the bounded busy policy and never diagnoses interruption. Only a dead/mismatched owner with an uninitialized schema is converted to a durable stale-init diagnostic; success removes the marker and fsyncs the parent. Barrier tests pause the winner after marker fsync and prove one migration/no diagnostic, then kill it and prove stale-only conversion. Every terminal store failure uses collision-safe O_EXCL diagnostics with file+parent fsync and structured stderr fallback. It may not import `echo-context`.

### AC4 — Ship project-local protocol templates, not Project_echo history

`/Users/zhenye/Desktop/echo-loop/templates/project/:1` contains the minimal installable backlog stages, AGENTS/CLAUDE guidance fragments, task-state layout, review schemas, and generated-adapter sources required to initialize another repository. It must not copy Project_echo's complete/archive/review history, product wiki, raw meetings, dogfooding journals, product decisions, or project-specific backlog items. `/Users/zhenye/Desktop/echo-loop/backlog/:1` is echo-loop's own empty/current work queue, not the historical Project_echo queue.

### AC5 — Preserve cross-vendor and fresh-eyes invariants

`/Users/zhenye/Desktop/echo-loop/tests/review-queue/:1` proves request SHA pinning, requested-reviewer enforcement, content-only reviewer bindings, wrapper-owned publication, fresh-eyes prohibition on task-state reads, response validation, combination, round convergence, and founder push checkpoints. `tests/task-state/:1` proves pointer schema, line caps, anchor parsing, and ref-pinned reads. Vendor adapters remain derived from canonical `skills/` sources and drift checks fail on mismatch.

### AC6 — Preserve claim/build/merge safety against fixture repositories

`/Users/zhenye/Desktop/echo-loop/tests/workflows/:1` creates disposable local fixture Git repositories and proves proposed items are unclaimable, ready seals are fresh, atomic claims are single-winner, worktrees are isolated, builders cannot self-review/merge, watcher promotion is deterministic, and merge/push checkpoints remain explicit. Each fixture uses its own temporary `HOME`, `XDG_CONFIG_HOME`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, disabled hooks, empty credential helpers, and explicit author identity. Git commands permit `protocol.file` only for an absolute fixture-owned bare remote, validate the resolved remote remains beneath the fixture root before push, and clean worktrees/remotes in `finally`; system/global config, hooks, URL rewrites, credentials, external repositories, and network transports cannot influence a test.

### AC7 — Record provenance and prove source independence

`/Users/zhenye/Desktop/echo-loop/provenance/source-extraction.v1.json:1` records every copied/relocated/rewritten source with source blob, destination hash, disposition, and change rationale. Every source byte is materialized with `git show 2971310441b69735cbe759293abd8c4d044bf347:<path>` or an equivalent archive of that commit; a test dirties the source worktree deliberately and proves the dirty bytes never enter the candidate. `tests/migration/source-independence.test.ts:1` rejects symlinks, submodules, absolute source paths outside provenance, imports escaping the repository, and dependencies on `echo-brain`, `echo-context`, or `Project_echo`.

Acquisition runs under `env -i`, run-owned HOME/XDG/TMPDIR and empty npm configs, scrubbed auth/proxy variables, the manifested runtime closure, and a filesystem sandbox that permits only run/lock/runtime reads plus outbound network. It executes `npm ci --ignore-scripts --no-audit --no-fund --cache <run>/npm-cache`; lock integrity and a sorted cache manifest gate admission. Hostile operator HOME/.npmrc/environment sentinels remain unread/unforwarded. Every later install is exactly `npm ci --offline --no-audit --no-fund --cache <run>/npm-cache --ignore-scripts=false`; all later npm/scripts use the run cache with network denied. Empty/poisoned host cache and PATH cannot affect results.

### AC8 — Stop before installation or authority transfer

The record includes control/cache/runtime/provenance/source-plan/dependency hashes and false authority/remote/mutation. `verify-handoff --expected-run-id <id>` derives canonical no-symlink paths, validates target/state/candidate, and requires Project_echo at the bound control HEAD or exactly one record-only child with exact bytes. Unrelated descendants, ref/worktree drift, dirty target, or any remote fail. Active loop remains authoritative.

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
- `tests/repository-extraction/echo-loop.test.ts` — durable claim/state/gated spawn; atomic whole-claim discard; target fsync/publication; sanitized acquisition/runtime closure; PID reuse; record CAS/ref drift; canonical handoff.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/committed-source-only.test.ts` — dirty source-worktree bytes are excluded from commit-object materialization.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-plan.test.ts` — deterministic source disposition and transitive-import closure reject history/product/context leakage.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/dependency-set.test.ts` — bare-import-derived exact dependency set has no omissions or extras.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-independence.test.ts` — no source/sibling dependency or history leakage.
- Coord tests include strict caller/key validation, same-key/same-payload transactional retry, mismatch rejection, simultaneous/stale initialization, crash boundaries, and durable terminal diagnostics.
- Commands start with offline `npm ci`, then exact type/lint/source/dependency/skill/backlog/task-state/review/coord/workflow/package/full-test/source-independence checks and `git diff --check`; any failure requires discard + fresh extract.

## After Completion (Strategist Notes)

- Do not install or switch the active Project_echo loop yet.
- After local parity, propose authority transfer and per-repository installation contracts separately.
- Preserve Project_echo as the full historical backup; echo-loop owns protocol implementation only after the later cutover.
