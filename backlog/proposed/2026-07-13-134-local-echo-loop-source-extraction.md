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

The committed orchestrator entrypoint is `node tools/repository-extraction/echo-loop.mjs <start|resume|status|quarantine-lock|verify-handoff>`. `start` requires run ID/source SHA; `quarantine-lock` requires run ID plus expected stale nonce (or ownerless inode+mtime) and reason and returns `{new_nonce,resume_token,quarantine_path}`; `resume` requires the single-use token. Exit codes are `0`, `64`, `65`, `73`, `74`, `75`, `76`, and `78` with the meanings already defined. Test-only fault and root-injection flags (`target/state/staging/record/source`) require `ECHO_EXTRACTION_TEST_MODE=1`, are rejected in production, and every lifecycle test uses unique temp roots.

Production uses one target-keyed `/Users/zhenye/Desktop/.echo-extractions/locks/echo-loop.lock`. All start/resume/quarantine transitions serialize under an OS-released `fcntl` advisory guard whose embedded helper bytes are hashed with the script. Under the guard, quarantine verifies/terminates and probes stale supervised PGID, moves old lock to immutable quarantine with `RENAME_EXCL`, fsyncs, creates a reserved replacement owner with new nonce and hashed one-use token, and returns it; resume consumes the token under the guard. Concurrent attempts yield one winner; ownerless mkdir recovery uses inode+mtime. Tests cover distinct-run starts, two quarantiners/resumers, token replay, and crash-before-owner.

State at `/Users/zhenye/Desktop/.echo-extractions/134/<run-id>/state.json` uses atomic/fsynced updates. Before candidate writes the script/profile/helper must be clean and committed; state records orchestrator commit and blob/SHA-256 identities, and all later operations reject drift. A spawned wrapper waits on a pipe until parent persists PGID, leader start identity, command/input hashes, and nonce; EOF before release exits. Quarantine/resume proves the group and its handles dead before takeover. Exact-hash checkpoints make steps idempotent; unknown/mismatched state/paths/control identities are preserved and refused.

Before publication the tool deterministically renders the complete migration record externally and binds its canonical SHA-256 in fsynced `ready_to_publish` together with run/item/source, orchestrator identity, branch, HEAD/tree, provenance/source-plan/dependency/cache/package hashes. Committed `candidate.v1.json` holds immutable identity. Publication uses `renameatx_np(RENAME_EXCL)` plus fsync; reconcile publishes only those pre-rendered bytes atomically or accepts a byte-identical record, then finalizes only on exact candidate/control match. Failpoints cover every boundary and foreign-target race. Final echo-loop is clean on its migration branch with no remote.

### AC2 — Give echo-loop accurate orchestration ownership

`/Users/zhenye/Desktop/echo-loop/package.json:1` names private package/binary `echo-loop`, pins Node/npm, and has a committed lock. `provenance/source-plan.v1.json:1` classifies every considered path plus static imports, runtime file reads, shell `source` edges, package-script executables, and literal child-process binaries. Npm executables bind to exact packages in `dependency-set.v1.json`; system executables bind to recorded capability preflights or require rewrite/exclusion. Tests seed each edge type and reject undeclared source/host-tool dependencies. Direct packages still derive from bare imports plus the fixed dev set at exact source-lock versions. `/Users/zhenye/Desktop/echo-loop/src/:1`, `skills/:1`, and `tools/:1` own only vendor-neutral orchestration; product/context code is forbidden.

### AC3 — Split orchestration MCP/coord surfaces from context retrieval

`/Users/zhenye/Desktop/echo-loop/src/api/:1` exposes only loop-owned operations such as coordination emission/invocation, role-state reads, skill/protocol reads, and queue status. It must not register `search_memories`, `find_clusters`, `get_atom(s)`, capture controls, Granola retrieval, or any client-product action. Loop state lives only at validated absolute, non-symlink `ECHO_LOOP_HOME/state/coord.sqlite`; race-safe 0700 directory creation and transactional schema migration support two simultaneous first opens. Every connection sets WAL, `foreign_keys=ON`, `synchronous=FULL`, and `busy_timeout=5000` and uses bounded 50/100/200/400 ms busy retry before atomically writing an operator diagnostic under `ECHO_LOOP_HOME/logs` and failing.

One `BEGIN IMMEDIATE` transaction canonicalizes operation name + payload as sorted-key UTF-8 JSON and persists its SHA-256 request fingerprint beside the caller idempotency key, inserts the immutable event, and applies role/deadline projection. On conflict, the same transaction returns the original sequence/result only when fingerprints match; mismatched reuse fails without changing event/projection and atomically writes a durable diagnostic. Concurrent same-key/same-payload and same-key/different-payload tests prove the contract. Busy, corrupt/truncated DB, schema mismatch, killed initialization, and migration failures all produce atomic logs with operation, DB identity, error class, and recovery guidance; tests assert evidence. It may not import `echo-context`.

### AC4 — Ship project-local protocol templates, not Project_echo history

`/Users/zhenye/Desktop/echo-loop/templates/project/:1` contains the minimal installable backlog stages, AGENTS/CLAUDE guidance fragments, task-state layout, review schemas, and generated-adapter sources required to initialize another repository. It must not copy Project_echo's complete/archive/review history, product wiki, raw meetings, dogfooding journals, product decisions, or project-specific backlog items. `/Users/zhenye/Desktop/echo-loop/backlog/:1` is echo-loop's own empty/current work queue, not the historical Project_echo queue.

### AC5 — Preserve cross-vendor and fresh-eyes invariants

`/Users/zhenye/Desktop/echo-loop/tests/review-queue/:1` proves request SHA pinning, requested-reviewer enforcement, content-only reviewer bindings, wrapper-owned publication, fresh-eyes prohibition on task-state reads, response validation, combination, round convergence, and founder push checkpoints. `tests/task-state/:1` proves pointer schema, line caps, anchor parsing, and ref-pinned reads. Vendor adapters remain derived from canonical `skills/` sources and drift checks fail on mismatch.

### AC6 — Preserve claim/build/merge safety against fixture repositories

`/Users/zhenye/Desktop/echo-loop/tests/workflows/:1` creates disposable local fixture Git repositories and proves proposed items are unclaimable, ready seals are fresh, atomic claims are single-winner, worktrees are isolated, builders cannot self-review/merge, watcher promotion is deterministic, and merge/push checkpoints remain explicit. Each fixture uses its own temporary `HOME`, `XDG_CONFIG_HOME`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, disabled hooks, empty credential helpers, and explicit author identity. Git commands permit `protocol.file` only for an absolute fixture-owned bare remote, validate the resolved remote remains beneath the fixture root before push, and clean worktrees/remotes in `finally`; system/global config, hooks, URL rewrites, credentials, external repositories, and network transports cannot influence a test.

### AC7 — Record provenance and prove source independence

`/Users/zhenye/Desktop/echo-loop/provenance/source-extraction.v1.json:1` records every copied/relocated/rewritten source with source blob, destination hash, disposition, and change rationale. Every source byte is materialized with `git show 2971310441b69735cbe759293abd8c4d044bf347:<path>` or an equivalent archive of that commit; a test dirties the source worktree deliberately and proves the dirty bytes never enter the candidate. `tests/migration/source-independence.test.ts:1` rejects symlinks, submodules, absolute source paths outside provenance, imports escaping the repository, and dependencies on `echo-brain`, `echo-context`, or `Project_echo`.

Before isolation, `dependency-cache-ready` runs `npm ci --ignore-scripts --cache <run>/npm-cache` in a scratch candidate-lock acquisition copy, allows registry fetch only for lockfile resolved URLs, verifies every integrity field, records a sorted cache content-hash manifest, deletes acquisition `node_modules`, and capability-checks all install-script/native-tool edges. The sandbox then denies source reads, all network, and external writes. Under `env -i` with explicit cache and scratch roots, the supervisor runs `npm ci --offline --cache <run>/npm-cache --ignore-scripts=false --no-audit --no-fund` and every named check/test/smoke. Empty operator cache must succeed; removing a required staged object must fail. Timeout/signal kills and probes the recorded group; diagnostics remain external.

### AC8 — Stop before installation or authority transfer

The migration record includes control/cache/provenance/source-plan/dependency hashes and false authority/remote/mutation fields. Review runs `node tools/repository-extraction/echo-loop.mjs verify-handoff --record <record> --state <published-state> --expected-item 2026-07-13-134-local-echo-loop-source-extraction --expected-source-sha 2971310441b69735cbe759293abd8c4d044bf347 --expected-run-id <run-id>`. It compares trusted flags across published state, record, and committed candidate identity; validates bound record digest, control revision, Git objects/tree/cleanliness/branch/no-remotes, and exits `76` on mismatch. Candidate remains unchanged; active loop stays authoritative.

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
- `tests/repository-extraction/echo-loop.test.ts` — commands/failpoints; live/stale/ownerless locks; no-replace/reconcile; cold-cache offline install; control binding; orphan-group cleanup; serialized takeover; trusted handoff; isolated roots.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/committed-source-only.test.ts` — dirty source-worktree bytes are excluded from commit-object materialization.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-plan.test.ts` — deterministic source disposition and transitive-import closure reject history/product/context leakage.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/dependency-set.test.ts` — bare-import-derived exact dependency set has no omissions or extras.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-independence.test.ts` — no source/sibling dependency or history leakage.
- Coord tests include same-key/same-payload idempotent retry, same-key/different-payload rejection, and durable evidence for every terminal store-open/migration failure.
- Commands start with `npm ci --offline --cache <run>/npm-cache --ignore-scripts=false --no-audit --no-fund`, then exact named type/lint/source/dependency/skill/backlog/task-state/review/coord/workflow/package/full-test/source-independence checks and `git diff --check`; each is checkpointed with non-zero failure.

## After Completion (Strategist Notes)

- Do not install or switch the active Project_echo loop yet.
- After local parity, propose authority transfer and per-repository installation contracts separately.
- Preserve Project_echo as the full historical backup; echo-loop owns protocol implementation only after the later cutover.
