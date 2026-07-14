---
id: 2026-07-13-134-local-echo-loop-source-extraction
title: "Local standalone echo-loop source extraction and fixture proof"
status: proposed
priority: HIGH
estimate: 5d
created: 2026-07-13
blocked_by:
  - 2026-07-13-132-product-graduation-foundation
task_state_ref: 2026-07-13-134-local-echo-loop-source-extraction
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - /Users/zhenye/Desktop/echo-loop/**                         # NEW standalone internal orchestration repository; local only
  - raw/internal/migrations/2026-07-13-134-echo-loop.md        # NEW Project_echo provenance/parity record
  - raw/internal/agent-runs/**                                 # workflow-owned failure/completion run log
  - backlog/task-state/2026-07-13-134-local-echo-loop-source-extraction/builder.md # workflow continuity pointer
  - backlog/ready/2026-07-13-134-local-echo-loop-source-extraction.md # workflow claim source
  - backlog/in_progress/2026-07-13-134-local-echo-loop-source-extraction.md # workflow claimed item
  - backlog/pending_review/2026-07-13-134-local-echo-loop-source-extraction.md # workflow handoff item
  - docs/BACKLOG.md                                           # generated stage-derived index on claim/handoff
spec_refs:
  - raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md # attended build; final repo is the acceptance object
  - raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md # loop remains an internal asset
  - raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md # product maturity remains separate
  - raw/internal/decisions/2026-07-12-g2-terminal-dispositions-and-repository-topology.md # source topology/provenance
  - docs/AGENT_INSTRUCTIONS.md                                # builder workflow to preserve
  - backlog/README.md                                         # backlog claim/review contract
  - skills/role-typed-task-state.md                           # task-state protocol
  - tools/review-queue/reviewer-bindings.json                 # current bindings
  - tools/review-queue/reviewers.json                         # current roster
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Local standalone echo-loop source extraction and fixture proof

## Why this spec exists

The founder named the internal orchestration system `echo-loop`: vendor-neutral skills, backlog/task-state, review queue, coordination/deadlines, builder/reviewer/merge workflows, and operator tooling. This item materializes that closure from Project_echo commit `2971310441b69735cbe759293abd8c4d044bf347` into `/Users/zhenye/Desktop/echo-loop` and proves it only on disposable repositories. Project_echo remains the active loop and authority; installation and cutover are later checkpoints.

### AC1 — Create one ordinary local repository from raw pinned Git objects

One builder owns `/Users/zhenye/Desktop/echo-loop`; sibling lanes never touch it. It verifies absence, performs one non-recursive mkdir that fails on EEXIST, and initializes `migration/2026-07-13-134` with fixed local identity, hooks/signing/templates disabled, and no remote. The accepted target is clean with one branch/root history, no alternates/promisor/replace state, and passing `git fsck --full`.

Source reads use pinned `/usr/local/bin/git` 2.37.3 under explicit config-free environment with replacement objects disabled. Commit/tree/blob types are verified and bytes come from literal `ls-tree` plus `cat-file --batch`, never checkout/archive filters or dirty files. Replacement, graft, alternate, promisor, symlink, submodule, filter, and export-subst fixtures fail.

This is a trusted attended build. Do not create migration controllers, evidence publishers, capsules, process watchers, or custom handoff/recovery. An interrupted target is unaccepted and founder-archived before retry. Builders use the existing Project_echo builder workflow for claim/commit/push.

### AC2 — Give echo-loop accurate orchestration ownership and source closure

`package.json` pins Node/npm and defines `check:provenance`, `check:dependencies`, `check:skills`, `test:task-state`, `test:review-queue`, `test:coord`, `test:workflows`, and fail-closed `verify:extraction`. `src/`, `skills/`, `tools/`, and `templates/` contain only orchestration capabilities; product meeting logic, context capture/storage/retrieval, MCP retrieval tools, and Project_echo history are excluded.

The source seed roots are the current review-queue/task-state/backlog/coord tools, `src/coord/`, their tests, `backlog/README.md`, and `docs/AGENT_INSTRUCTIONS.md`. Before traversal, the resolver enumerates raw pinned-tree `package.json`, workspace manifests, import maps, and every `tsconfig*.json` by literal name, byte-filters allowed patterns, and computes canonical binding-context JSON. A byte-sorted fixed point follows JS/TS/CommonJS imports, package maps, extended configs, child/worker/filesystem literals, scripts, schemas, and templates. Queue identity is `(path,blob,binding-context-hash)`; ambiguity, cycles that change context, computed repository-capable edges, and unknown sinks fail. Fixtures cover variant tsconfig/workspace-only aliases, metacharacter filenames, multiple queue orders, transitive helpers, and cycles.

The final captured target HEAD is rescanned. Every edge maps exactly once: repository-local edges resolve to a tracked target blob plus inventory row; npm imports/CLIs resolve to exact package/lock rows; interpreters/helpers resolve to toolchain rows. Rewrites, authored, and generated target files participate. Missing, unused, ranged, path/Git/link/workspace, cross-class, or mutable-checkout-only edges fail. The derived lock closes peers, matching-platform optionals, and bundled dependencies with no extraneous packages.

### AC3 — Preserve coordination semantics without external exactly-once claims

`./coord` exports `emitCoordEvent` and `invokeRole`. Public `emitCoordEvent` rejects reserved kind `role.invoked`; its generic unique key is `(actor,kind,correlationId)`. Invocation key is `(role,taskId,correlationId)`, payload hash includes normalized deadline, and deterministic invocation/event ID is SHA-256 over a versioned canonical key. Invocation events use unique `(kind,invocationId)` and may share actor/correlation across different tasks.

`invokeRole` transactionally creates or reads one PENDING row, then synchronously attempts the atomic event-insert/PUBLISHED transition before returning. SQLite busy timeout is 100ms; at most 10 attempts with deterministic 25ms capped backoff must finish within a 2-second monotonic publication budget. The creator returns `accepted` and retries return `duplicate` only after PUBLISHED. Exhaustion leaves PENDING, records an attempt/error row when the store permits, and throws `PUBLISH_FAILED`; a later call with the same key retries publication. Death/busy/failure/concurrency fixtures prove no duplicate event and no false success.

Init creates a unique temporary SQLite DB in `journal_mode=DELETE`, commits schema, closes handles, proves temp and final `-wal/-shm/-journal` sidecars absent, fsyncs and reopens for integrity/schema validation, publishes the main DB no-replace, fsyncs the directory, and validates the final DB still reports DELETE mode. Any stale final sidecar returns BUSY without deletion. Crash/two-contender fixtures prove one complete winner.

### AC4 — Ship reusable protocol templates, not Project_echo history

`templates/project/` contains only the minimal backlog stages, AGENTS/CLAUDE fragments, task-state layout, review schemas, and adapter sources needed to initialize another repository. It must not contain Project_echo's completed backlog/review archive, wiki, raw corpus, meetings, journals, product decisions, or project-specific queue items. Target `backlog/` is echo-loop's own empty/current queue.

### AC5 — Preserve cross-vendor, fresh-eyes, and recoverable watcher actions

Tests preserve request SHA pinning, requested-reviewer enforcement, content-only bindings, wrapper-owned publication, validation, combination, convergence, task-state exclusion for reviewers, founder checkpoints, dirty-tree refusal, and upstream-push preservation.

Watcher disposition uses durable rows keyed by `(item,round,spec_sha)` with `PREPARED`, `APPLIED`, or `ESCALATED`. PREPARED stores reviewed input hashes, action digest, target ref, expected-old SHA, candidate commit/tree SHA created without moving the ref, and intended terminal action. Any same-digest watcher may reconcile: ref=old performs exact `git update-ref <ref> <new> <old>` CAS; ref=new marks APPLIED; any other ref or mismatched digest marks ESCALATED and performs no mutation. A crash before/after candidate creation, CAS, or terminal write is safely resumed; two watchers yield one ref update and one terminal state.

### AC6 — Prove claim/build/review/merge safety on disposable repositories

`tests/workflows/local-fixture-loop.test.ts` uses only scratch Git repos and fixture bare remotes. It proves proposed items are unclaimable, ready seals are fresh, claims are single-winner, worktrees isolate builders, builders cannot self-review/merge, watcher recovery is deterministic, and founder merge/push checkpoints remain explicit. Each fixture has scratch HOME/XDG/TMP, disabled global/system config/hooks/signing/askpass/proxies/alternates, fixed identity, and explicit object/index/ref paths. Real repositories, credentials, and network transports are forbidden.

### AC7 — Prove source independence and verifier equivalence

After committing target HEAD, builder and reviewer each create a private `--no-local --no-hardlinks` clone, detach the accepted OID, remove origin, and verify clean/no-remotes/no-alternates/no-promisor/no-replace state. `env -i` supplies only exact scratch HOME/XDG/TMP, locale/timezone, pinned Node/npm/shell/Git paths, npm cache/config, and test fixture variables; launch-affecting `NODE_OPTIONS`, `NODE_PATH`, shell startup, proxy, DYLD/LD, Git, and inherited npm variables are absent. Locked installs run offline after a separate lock-authorized cache fill. Automatic install hooks (`preinstall`, `install`, `postinstall`, implicit binding.gyp/node-gyp) are forbidden across root and complete dependency closure; any explicitly supported script is a named verification command, never an install hook.

Direct and npm verification routes write distinct create-new results. Each result contains a route-local envelope (launcher argv/cwd/env/streams) and a canonical inner projection (ordered roster IDs, normalized scratch-root tokens, workload inputs, per-row status/hash, target HEAD/tree, and verdict). Envelopes are validated independently and intentionally differ; only inner projections must be byte-identical. Fixtures prove npm banners/injected safe variables do not cause false inequality and workload differences cannot hide.

Both routes run provenance, dependency, skill drift, task-state, review queue, coord, workflow, typecheck, lint, full tests, source-independence, fsck, and recursive diff-tree checks. Any command failure stops the attended build. The spec makes no adversarial descendant-containment claim.

### AC8 — Record the normal builder handoff and stop before installation

The builder follows `docs/AGENT_INSTRUCTIONS.md` for Project_echo claim, run log, migration record, backlog move, commit, and feature-branch push. The record contains source SHA, target path/branch/HEAD/tree, package/lock/source-plan/dependency/skill hashes, direct/npm inner-result hash, exact commands/exits, no-remotes/clean status, exclusions/differences, `authority:false`, and `installed:false`. Target history is unchanged afterward and has no remote.

Independent review binds the review request bytes/`spec_commit_sha`, accepted target HEAD/tree, and migration-record commit, then reruns source-object checks and AC7 from its own clone. Passing proves only a local source split; active Project_echo remains authoritative.

## Out of Scope (Don't Drift)

- Do not create/configure a target remote, publish/install, or change launchd/user skills.
- Do not build migration/evidence/recovery/process-containment infrastructure.
- Do not copy Project_echo history/wiki/raw/backlog archives or include product/context behavior.
- Do not touch real repos/remotes/state, siblings, wiki, or holdout-131.

## Risks

- **MCP/storage entanglement:** mitigate with explicit source roots and product/context exclusions.
- **History leakage:** mitigate with minimal templates and target-tree scans.
- **False parity:** mitigate with private clones, sanitized disposable fixtures, and independent reruns.
- **Interrupted build:** target remains unaccepted and is manually archived.

## Tests

- `/Users/zhenye/Desktop/echo-loop/tests/review-queue/` — request/binding/publication/convergence/fresh-eyes and watcher CAS recovery.
- `/Users/zhenye/Desktop/echo-loop/tests/task-state/` — schema, anchors, ref pinning, and line cap.
- `/Users/zhenye/Desktop/echo-loop/tests/coord/` — event identity, invokeRole busy/crash/retry behavior, and SQLite init sidecars.
- `/Users/zhenye/Desktop/echo-loop/tests/workflows/local-fixture-loop.test.ts` — proposed through reviewed merge on isolated fixtures.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-plan.test.ts` — raw-object fixed point, binding contexts, and exclusions.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/dependency-set.test.ts` — final-HEAD local/npm/toolchain partition and exact lock.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/verification-result.test.ts` — route envelopes and identical inner projection.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-independence.test.ts` — no source/sibling/history escape.
- Independent migration-record review — accepted HEAD/tree, rerun results, no remote, and false authority.

## After Completion (Strategist Notes)

- Do not install or switch the active Project_echo loop.
- Propose remote/installation/authority transfer separately after local parity.
