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
  - raw/internal/migrations/2026-07-13-134-echo-loop-review.md # independent same-host review record
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

## Acceptance Criteria

### AC1 — Create one ordinary local repository from raw pinned Git objects

One builder owns `/Users/zhenye/Desktop/echo-loop`; sibling lanes never touch it. It verifies absence, performs one non-recursive mkdir that fails on EEXIST, and initializes `migration/2026-07-13-134` with fixed local identity, hooks/signing/templates disabled, and no remote. The accepted target is clean with one branch/root history, no alternates/promisor/replace state, and passing `git fsck --full`.

Source reads use pinned `/usr/local/bin/git` 2.37.3 under explicit config-free environment with replacement objects disabled. Commit/tree/blob types are verified and bytes come from literal `ls-tree` plus `cat-file --batch`, never checkout/archive filters or dirty files. Replacement, graft, alternate, promisor, symlink, submodule, filter, and export-subst fixtures fail.

This is a trusted attended build. Do not create migration controllers, evidence publishers, capsules, process watchers, or custom handoff/recovery. An interrupted target is unaccepted and founder-archived before retry. Builders use the existing Project_echo builder workflow for claim/commit/push.

### AC2 — Give echo-loop accurate orchestration ownership and source closure

`package.json` pins Node/npm and defines `check:provenance`, `check:dependencies`, `check:skills`, `test:task-state`, `test:review-queue`, `test:coord`, `test:workflows`, and fail-closed `verify:extraction`. `src/`, `skills/`, `tools/`, and `templates/` contain only orchestration capabilities; product meeting logic, context capture/storage/retrieval, MCP retrieval tools, and Project_echo history are excluded.

Committed `provenance/source-seed.v1.json` is the literal reviewed-policy manifest: exact raw pinned-SHA seed files plus directory rules for `skills/`, review-queue/task-state/backlog/coord tools, `src/coord/`, their tests, `backlog/README.md`, and `docs/AGENT_INSTRUCTIONS.md`; every expansion uses NUL-delimited `git ls-tree -rz --full-tree`, UTF-8 byte ordering, and recorded mode/OID. Before traversal, exact-name filtering enumerates package/workspace/import-map manifests and every `tsconfig*.json`, then canonical JSON binds workspace/exports/imports/extends/alias context. Independent fixtures contain expected seed bytes rather than using the resolver under test.

Versioned `provenance/edge-record.v1.schema.json` defines resolution precedence and one class for every JS/TS/CommonJS import, Node built-in (`node:` and legacy names), repository file/schema/template, npm package/CLI, shell command/script, Python module/script, worker, and dynamic literal filesystem/process sink. A byte-sorted fixed point keys `(path,blob,binding-context-hash)`; ambiguity, context-changing cycles, computed repository-capable edges, and unknown sinks fail. Fixtures cover variant tsconfig/workspace-only aliases, Node builtins, shell/Python tools, metacharacter paths, multiple queue orders, transitive helpers, and cycles.

The final captured target HEAD is rescanned. Every edge maps exactly once: repository-local edges resolve to a tracked target blob plus inventory row; npm imports/CLIs resolve to exact package/lock rows; interpreters/helpers resolve to toolchain rows. Rewrites, authored, and generated target files participate. Missing, unused, ranged, path/Git/link/workspace, cross-class, or mutable-checkout-only edges fail. The derived lock closes peers, matching-platform optionals, and bundled dependencies with no extraneous packages.

### AC3 — Preserve coordination semantics without external exactly-once claims

`./coord` exports `emitCoordEvent` and `invokeRole`. Public `emitCoordEvent` rejects reserved kind `role.invoked`; the database generic unique index has `WHERE kind <> 'role.invoked'`. Invocation key is `(role,taskId,correlationId)` and deterministic invocation/event ID is SHA-256 over its versioned canonical JSON. Canonical payload JSON additionally includes normalized deadline; its SHA-256 is immutable. Before retrying PENDING or returning duplicate for PUBLISHED, the stored/requested payload hashes must match; mismatch throws `INVOCATION_CONFLICT` with no row/event mutation. Invocation events use unique `(kind,invocationId)` and may share actor/correlation across tasks.

One 2,000ms monotonic deadline begins at `invokeRole` entry and includes initial create/read, all transactions, waits, backoffs, and best-effort error recording. The exact schedule is ten attempts, each SQLite busy timeout clamped to `min(100ms,remaining)`, with a post-failure sleep clamped to `min(25ms,remaining)`; fake-clock tests own time. Creator returns `accepted` and retries `duplicate` only after PUBLISHED. Exhaustion leaves PENDING, records error when remaining/store permits, and returns `PUBLISH_FAILED` by the deadline; later same-payload call retries. Held-lock, mismatch at PENDING/PUBLISHED, death, and concurrency fixtures prove bounded/no-mutation behavior.

Init creates a same-directory unique temporary SQLite DB in `journal_mode=DELETE`, commits schema, closes all validation handles, verifies temp/final sidecars absent, fsyncs the file, and publishes with Node `fs.linkSync(temp, state/coord.sqlite)`—an atomic no-replace hard link on the same filesystem. It fsyncs `state`, unlinks only its temp, fsyncs `state` again, reopens the winner read-only, validates integrity/schema/DELETE mode, closes it, and rechecks all final sidecars. EEXIST reconciles by read-only winner validation; valid winner returns BUSY/73 unchanged and invalid winner fails. Crash/two-contender/stale-sidecar fixtures cover every boundary.

### AC4 — Ship reusable protocol templates, not Project_echo history

`templates/project/` contains only the minimal backlog stages, AGENTS/CLAUDE fragments, task-state layout, review schemas, and adapter sources needed to initialize another repository. It must not contain Project_echo's completed backlog/review archive, wiki, raw corpus, meetings, journals, product decisions, or project-specific queue items. Target `backlog/` is echo-loop's own empty/current queue.

### AC5 — Preserve cross-vendor, fresh-eyes, and recoverable watcher actions

Tests preserve request SHA pinning, requested-reviewer enforcement, content-only bindings, wrapper-owned publication, validation, combination, convergence, task-state exclusion for reviewers, founder checkpoints, dirty-tree refusal, and upstream-push preservation.

Watcher disposition never mutates a founder checkout/index. In an ephemeral detached worktree plus private temporary index, it creates a candidate commit whose single parent is the probed authoritative remote-ref SHA and whose tree/action/input hashes match PREPARED. PREPARED also binds a founder approval token hashing candidate/ref/expected-old; without it no push transition is legal. Durable state is `PREPARED -> APPLYING(owner_token,lease_expiry) -> APPLIED|ESCALATED`; conditional SQLite transitions serialize owners, expired same-digest APPLYING is resumable, and a mismatched digest can escalate only after acquiring that transition. No autostash, force checkout, or primary-ref `update-ref` is permitted.

APPLYING re-probes remote: candidate already present becomes APPLIED; expected old uses one ordinary non-force fast-forward `git push --porcelain origin <candidate>:<full-ref>`; another OID becomes ESCALATED. After any push outcome/restart it re-probes: candidate -> APPLIED, old -> PREPARED/retryable, other/unreachable -> ESCALATED with durable reason. APPLIED means authoritative remote ref equals candidate; local worktrees remain untouched and founder push checkpoint is the explicit transition authorizing this push. Fixtures cover crashes before/after push and state write, lease expiry, mismatched digest, concurrent upstream advance, dirty/concurrently changed founder worktree, and both watcher orders.

### AC6 — Prove claim/build/review/merge safety on disposable repositories

`tests/workflows/local-fixture-loop.test.ts` uses only scratch Git repos and fixture bare remotes. It proves proposed items are unclaimable, ready seals are fresh, claims are single-winner, worktrees isolate builders, builders cannot self-review/merge, watcher recovery is deterministic, and founder merge/push checkpoints remain explicit. Each fixture has scratch HOME/XDG/TMP, disabled global/system config/hooks/signing/askpass/proxies/alternates, fixed identity, and explicit object/index/ref paths. Real repositories, credentials, and network transports are forbidden.

### AC7 — Prove source independence and verifier equivalence

After committing target HEAD, builder and reviewer each allocate separate private clones, install trees, caches, and output roots. Each route envelope uses `env -i` with only scratch HOME/XDG/TMP, `LC_ALL=C`, `TZ=UTC`, pinned Node/npm/shell/Git paths, empty npm configs, explicit cache, and verifier-owned `GIT_CONFIG_NOSYSTEM=1`/empty global config; all other Git/Node/shell/proxy/DYLD/LD/npm variables are absent. Locked installs are offline after lock-authorized cache fill. Automatic install hooks are forbidden across the full closure; explicit scripts are named verification commands.

Direct and npm routes run in either order and write distinct results. Before workload entry, each launcher synthesizes the same exact canonical workload environment (no inherited PATH/npm variables; only pinned tool-bin, fixed inputs, and normalized root tokens). Versioned canonical serializer emits UTF-8/LF, byte-sorted object keys, preserved arrays, and exact compared fields: roster/order, workload env/inputs, per-row status/hash, HEAD/tree, verdict. Route envelopes retain differing launcher argv/cwd/npm banners separately. Hostile system config, node_modules/.bin/PATH, npm-variable canaries, and reversed order must not affect inner bytes.

Both routes run provenance, dependency, skill drift, task-state, review queue, coord, workflow, typecheck, lint, full tests, source-independence, fsck, and recursive diff-tree checks. Any command failure stops the attended build. The spec makes no adversarial descendant-containment claim.

### AC8 — Record the normal builder handoff and stop before installation

The builder follows `docs/AGENT_INSTRUCTIONS.md` and stops at pending_review. The immutable feature-head migration record binds source SHA, target HEAD/tree, package/lock/source-plan/dependency/skill hashes, direct/npm inner-result hash, commands/exits, no-remotes/clean status, exclusions/differences, `authority:false`, and `installed:false`. Target history is unchanged and has no remote.

An independent same-host reviewer binds request bytes/`spec_commit_sha`, pending-review feature commit, migration-record hash, and target HEAD/tree; reruns source-object checks and AC7; and writes `raw/internal/migrations/2026-07-13-134-echo-loop-review.md` with reviewer identity/independence, exact commands, result hashes, and verdict. Passing proves only a local split; active Project_echo remains authoritative.

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
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-seed-fixture.test.ts` — independent expected seeds and edge-class precedence including Node/shell/Python.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/dependency-set.test.ts` — final-HEAD local/npm/toolchain partition and exact lock.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/verification-result.test.ts` — route envelopes and identical inner projection.
- `/Users/zhenye/Desktop/echo-loop/tests/migration/source-independence.test.ts` — no source/sibling/history escape.
- Independent migration-record review — accepted HEAD/tree, rerun results, no remote, and false authority.

## After Completion (Strategist Notes)

- Do not install or switch the active Project_echo loop.
- Propose remote/installation/authority transfer separately after local parity.
