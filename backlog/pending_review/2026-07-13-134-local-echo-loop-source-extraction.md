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
ready_content_sha: 135bab0fd87554cc4ff3c052764d98b90debded4056ed8532c2cac0b9ebcb086
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
  - raw/internal/migrations/2026-07-13-134-echo-loop-source-policy.v1.json # SEALED read-only: blob dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a, sha256 44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a
claimed_by: "fable-builder-134"
claimed_at: "2026-07-14T05:49:30Z"
branch: "agent/134-echo-loop"
worktree: "/Users/zhenye/Desktop/Project_echo--134-echo-loop"
head_sha: "ee3bc0e9616a2ea9699ad673856518e8ba90744c"
pr_url: ""
agent_notes: |
  FIX CYCLE complete (codex-ops REJECT ca82e523 addressed); re-handoff for
  re-review, not a completion claim. All four HIGH + one MEDIUM resolved with
  green tests: 97 tests / 21 files, tsc clean, dual-route 14-row roster
  byte-identical (8c81ece2) verdict pass.
  F1: tests/task-state/ + tests/review-queue/ substantive suites (test:task-state
  and test:review-queue exit 0). F2: verification-workload.v1.json = full sealed
  roster, recursion solved via vitest.workload.config.ts. F3:
  source-seed-fixture.test.ts with independent oracle. F4: AC5 recovery fixtures
  (crash-before/after-push, gc-anchor-survival, both-orders,
  mismatched-digest-after-transition) + own-pgid isolation (detached spawn +
  deadline-bound reap). F5: npm route binds outer launcher argv + npm banner.
  Portability: python-invoking tests run under arch -arm64 (node here is
  x86_64/Rosetta; jsonschema wheel is arm64).
  Target /Users/zhenye/Desktop/echo-loop UNACCEPTED pending re-review, no remote,
  not installed; HEAD 2aeb1ede, tree a56fe5e0, 14 commits, fsck clean. head_sha
  above is the fix-cycle builder head (agent/134-echo-loop), rebased onto the
  reviewer child ca82e523. Non-blocking design note (not a residual): lock is
  npm-generated (no drift/extraneous), not hand-minimized. Reviewer child-commit
  ceremony is the independent reviewer's leg.
review_notes: ""
---

# Local standalone echo-loop source extraction and fixture proof

## Why this spec exists

The founder named the internal orchestration system `echo-loop`: vendor-neutral skills, backlog/task-state, review queue, coordination/deadlines, builder/reviewer/merge workflows, and operator tooling. This item materializes that closure from Project_echo commit `2971310441b69735cbe759293abd8c4d044bf347` into `/Users/zhenye/Desktop/echo-loop` and proves it only on disposable repositories. Project_echo remains the active loop and authority; installation and cutover are later checkpoints.

## Acceptance Criteria

### AC1 — Create one ordinary local repository from raw pinned Git objects

One builder owns `/Users/zhenye/Desktop/echo-loop`; sibling lanes never touch it. It verifies absence, performs one non-recursive mkdir that fails on EEXIST, and initializes `migration/2026-07-13-134` with fixed local identity, hooks/signing/templates disabled, and no remote. The accepted target is clean with one branch/root history, no alternates/promisor/replace state, and passing `git fsck --full`.

Source reads use pinned `/usr/local/bin/git` 2.37.3 under explicit config-free environment with `GIT_CONFIG_NOSYSTEM=1`, empty global config, `GIT_ATTR_NOSYSTEM=1`, and replacement objects disabled. Commit/tree/blob types are verified and bytes come from literal `ls-tree` plus `cat-file --batch`, never checkout/archive filters or dirty files. Replacement, graft, alternate, promisor, symlink, submodule, filter, and export-subst fixtures fail.

This is a trusted attended build. Do not create migration controllers, evidence publishers, capsules, process watchers, or custom handoff/recovery. An interrupted target is unaccepted and founder-archived before retry. Builders use the existing Project_echo builder workflow for claim/commit/push.

### AC2 — Give echo-loop accurate orchestration ownership and source closure

`package.json` pins Node/npm and defines `check:provenance`, `check:dependencies`, `check:skills`, `typecheck`, `lint`, `test`, `test:task-state`, `test:review-queue`, `test:coord`, `test:workflows`, `test:source-independence`, and fail-closed `verify:extraction`. Fsck and recursive diff-tree remain explicit non-npm rows in the ordered workload manifest. `src/`, `skills/`, `tools/`, and `templates/` contain only orchestration capabilities; product meeting logic, context capture/storage/retrieval, MCP retrieval tools, and Project_echo history are excluded.

Project_echo's reviewed `raw/internal/migrations/2026-07-13-134-echo-loop-source-policy.v1.json` is sealed at blob OID `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a` (SHA-256 `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a`); the builder loads it by that OID via `git cat-file`, never modifies it, and aborts on hash mismatch. It is copied byte-identically to target `provenance/source-policy.v1.json`; its Project_echo blob OID/SHA-256 and target blob OID/SHA-256 are bound in the migration/review records. That artifact—not builder judgment—defines every literal seed file, recursive source root, accepted Git mode, directory expansion command/order, manifest field, edge class, resolution precedence, and exclusion. `provenance/source-seed.v1.json` records the artifact hash plus exact raw pinned-SHA expansion rows; every expansion uses NUL-delimited `git ls-tree -rz --full-tree`, UTF-8 byte ordering, and recorded mode/OID. Before traversal, its exact-name/pattern rules enumerate package/workspace/import-map manifests and every `tsconfig*.json`, then canonical JSON binds workspace/exports/imports/extends/alias context. Independent fixtures contain expected seed bytes rather than using the resolver under test.

Versioned `provenance/edge-record.v1.schema.json` accepts only the artifact's closed edge enum and precedence. A byte-sorted fixed point keys `(path,blob,binding-context-hash)`; ambiguity, context-changing cycles, computed repository-capable edges, and unknown sinks fail. Fixtures cover variant tsconfig/workspace-only aliases, Node builtins, shell/Python tools, metacharacter paths, multiple queue orders, transitive helpers, and cycles.

Preserved suites whose pinned-source import closure reaches excluded capabilities (`src/mcp/server`, `src/mcp/tools/*`, `src/storage/*`, `src/capture/*`, `src/echo-home/*`, `src/logging/*`) — at the pinned SHA this includes most of `tests/coord/` and parts of `tests/task-state/` — are `rewritten` rows targeting echo-loop's own coord and stores, not byte-identical ports; each rewrite records source blob, target blob, and rationale. `src/coord` itself is a `rewritten` lane implementing AC3's design; its pinned-source imports of capture/logging/echo-home/storage do not enter the closure. The final captured target HEAD is rescanned. Every edge maps exactly once: repository-local edges resolve to a tracked target blob plus inventory row; npm imports/CLIs resolve to exact package/lock rows; interpreters/helpers resolve to toolchain rows. Rewrites, authored, and generated target files participate. Missing, unused, ranged, path/Git/link/workspace, cross-class, or mutable-checkout-only edges fail. The derived lock closes peers, matching-platform optionals, and bundled dependencies with no extraneous packages.

### AC3 — Preserve coordination semantics without external exactly-once claims

`./coord` exports `emitCoordEvent` and `invokeRole`. The coord store uses `better-sqlite3` pinned by the derived lock; its native build runs only as the explicit named workload row `npm rebuild better-sqlite3 --offline --foreground-scripts` with `npm_config_nodedir=/usr/local/Cellar/node@22/22.22.1_1` (mirroring the echo-context contract); all other lifecycle hooks remain forbidden. Public `emitCoordEvent` rejects reserved kind `role.invoked`; the database generic unique index has `WHERE kind <> 'role.invoked'`. Invocation key is `(role,taskId,correlationId)` and deterministic invocation/event ID is SHA-256 over versioned canonical immutable input `{role,taskId,correlationId,deadlineMs}`, where `deadlineMs` is a relative non-negative integer or null. No wall-clock deadline is hashed. Before retrying PENDING or returning duplicate for PUBLISHED, the stored/requested payload hashes must match; mismatch throws `INVOCATION_CONFLICT` with no row/event mutation. Invocation events use unique `(kind,invocationId)` and may share actor/correlation across tasks.

One separate 2,000ms monotonic publication budget begins at `invokeRole` entry and includes initial create/read, all transactions, waits, backoffs, and best-effort error recording; it is never part of canonical input or payload hash. The exact schedule is ten attempts, each SQLite busy timeout clamped to `min(100ms,remaining)`, with a post-failure sleep clamped to `min(25ms,remaining)`; fake-clock tests own time. PENDING reservation is one transaction. Publication is one later SQLite transaction that inserts the deterministic `role.invoked` event and updates the invocation row to PUBLISHED atomically. A retry seeing PENDING plus a matching event validates canonical payload/event bytes and atomically promotes PUBLISHED; any mismatch is `INVOCATION_CONFLICT`. Creator returns `accepted` and retries `duplicate` only after PUBLISHED. Exhaustion leaves PENDING, records error when remaining/store permits, and returns `PUBLISH_FAILED`; the budget bounds initiation (no new transaction, wait, or sleep begins after expiry) while an in-flight synchronous SQLite or filesystem operation may overrun it — no wall-clock return bound is claimed, and fake-clock tests assert the scheduling contract. A later same-payload call retries. Held-lock, PENDING-with-event recovery, mismatch at PENDING/PUBLISHED, death between transactions, and concurrency fixtures prove bounded/no-mutation behavior.

Init creates same-directory `.coord.sqlite.<uuid>.tmp` in `journal_mode=DELETE`, commits schema, closes validation handles, verifies sidecars absent, fsyncs the file, and publishes with Node `fs.linkSync(temp, state/coord.sqlite)`. It fsyncs `state`, reopens the winner read-only, validates integrity/schema/DELETE mode, then atomically publishes `state/coord.ready` (same-directory exclusive temp, file fsync, rename(2), directory fsync), whose canonical JSON binds schema version plus final device/inode. `state/coord.sqlite` is consumer-visible but not ready: every consumer refuses it until the marker exists and matches; an existing valid DB without a marker is idempotently validated and marker-completed, while invalid/mismatched state fails. Init inventories only `coord.sqlite`, `coord.ready`, `.coord.sqlite.*.tmp`, and SQLite sidecars. It unlinks an orphan temp only when `lstat` proves the same device/inode as the valid final DB, then fsyncs `state`; unrelated temp inodes are retained and reported. EEXIST reconciles/validates the winner and completes readiness. Crash/two-contender/consumer-before-ready/orphan-hard-link/unrelated-temp/stale-sidecar fixtures cover every boundary.

### AC4 — Ship reusable protocol templates, not Project_echo history

`templates/project/` contains only the minimal backlog stages, AGENTS/CLAUDE fragments, task-state layout, review schemas, and adapter sources needed to initialize another repository. It must not contain Project_echo's completed backlog/review archive, wiki, raw corpus, meetings, journals, product decisions, or project-specific queue items. Target `backlog/` is echo-loop's own empty/current queue.

### AC5 — Preserve cross-vendor, fresh-eyes, and recoverable watcher actions

Tests preserve request SHA pinning, requested-reviewer enforcement, content-only bindings, wrapper-owned publication, validation, combination, convergence, task-state exclusion for reviewers, founder checkpoints, dirty-tree refusal, and upstream-push preservation.

Watcher disposition never mutates a founder checkout/index. All probes/worktree/index/commit/push operations use absolute Git under a config-free environment (`GIT_CONFIG_NOSYSTEM=1`, empty global config, `GIT_ATTR_NOSYSTEM=1`) with empty templates/hooks, disabled signing/askpass, and a fixed canonical remote endpoint plus repository identity from `provenance/watcher-project.v1.json`, whose schema, endpoint normalization rule, allowed transport, and SHA-256 are bound in the migration record; substitution fixtures use that sealed digest. In an ephemeral detached worktree plus private temporary index, it creates a candidate commit whose single parent is the probed authoritative full-ref SHA and whose tree/action/input hashes match PREPARED. The candidate is anchored by an internal ref `refs/echo-watcher/prepared/<id>` from PREPARED until a terminal state (then deleted); a crash plus `git gc --prune=now` between states must not orphan an APPROVED candidate. Durable state is `PREPARED -> APPROVED -> APPLYING(owner_token,lease_expiry) -> APPLIED|APPROVED|ESCALATED`; the `APPLYING -> APPROVED` edge is the guarded post-push recovery when the re-probed endpoint still equals expected-old, executed as a conditional SQLite CAS that retains the approval token, with a fixture asserting it. APPROVED is a separate founder-authored durable transition whose token binds candidate, full ref, exact expected-old SHA, action, canonical input digest, fixed endpoint, and repository identity; later transitions revalidate every field after sanitization. Conditional SQLite transitions serialize owners; expired same-digest APPLYING is resumable via an explicit conditional CAS `APPLYING(expired owner_token) -> APPLYING(new owner_token)` that preserves the approval token and candidate (takeover fixture required), and a mismatched digest can escalate only after acquiring that transition. No autostash, force checkout, or primary-ref `update-ref` is permitted.

Every probe/push child runs in its own process group under a sanitized noninteractive transport envelope with a hard deadline strictly shorter than the APPLYING lease, and is TERM/KILL-reaped before takeover; takeover requires termination evidence plus endpoint re-probe. APPLYING re-probes the fixed endpoint with absolute `/usr/local/bin/git ls-remote <literal-endpoint> <full-ref>` under the config-free envelope and a strict parser requiring exactly one valid OID for the exact ref (missing, malformed, duplicate, and unreachable outcomes are distinct): candidate already present becomes APPLIED; exact expected old uses the sole allowed force form, `/usr/local/bin/git push --porcelain --force-with-lease=<full-ref>:<expected-old> <fixed-endpoint> <candidate>:<full-ref>`, only after proving candidate's sole parent is expected-old. Deletion and non-direct-parent candidates fail. Another OID becomes ESCALATED. After any push outcome/restart it re-probes: candidate -> APPLIED, old -> APPROVED/retryable, other/unreachable -> ESCALATED with durable reason. Each failed attempt persists a sanitized failure class, attempt count, and next-attempt time; retries use bounded backoff and repeated identical failures escalate rather than hot-loop. This exact expected-old server-side lease, not a normal fast-forward race, is the CAS. APPLIED means the authoritative endpoint/ref equals candidate; local worktrees remain untouched and the durable founder APPROVED transition is the explicit push authorization. Fixtures cover endpoint/repository substitution, stale approval, crashes before/after push/state write, lease expiry, mismatched digest, concurrent upstream advance, dirty/concurrently changed founder worktree, and both watcher orders.

### AC6 — Prove claim/build/review/merge safety on disposable repositories

`tests/workflows/local-fixture-loop.test.ts` uses only scratch Git repos and fixture bare remotes. It proves proposed items are unclaimable, ready seals are fresh, claims are single-winner, worktrees isolate builders, builders cannot self-review/merge, watcher recovery is deterministic, and founder merge/push checkpoints remain explicit. Each fixture has scratch HOME/XDG/TMP, disabled global/system config/hooks/signing/askpass/proxies/alternates, fixed identity, and explicit object/index/ref paths. Real repositories, credentials, and network transports are forbidden.

### AC7 — Prove source independence and verifier equivalence

After committing target HEAD, builder and reviewer each use absolute Git under the config-free envelope, empty template directory/hooks path, and `git clone --no-local --no-hardlinks --no-checkout`, followed by hook-disabled detached checkout of the accepted OID and origin removal, to allocate separate private clones, install trees, caches, and output roots. Target init/add/commit/clone/checkout/status/fsck all use this envelope. Each route envelope uses `env -i` with only scratch HOME/XDG/TMP, `LC_ALL=C`, `TZ=UTC`, pinned Node/npm/shell/Git paths, empty npm configs, explicit cache, and verifier-owned `GIT_CONFIG_NOSYSTEM=1`/empty global config/`GIT_ATTR_NOSYSTEM=1`; all other Git/Node/shell/proxy/DYLD/LD/npm variables are absent. Locked installs are offline after lock-authorized cache fill. Automatic install hooks are forbidden across the full closure; explicit scripts are named verification commands.

Committed `provenance/verification-workload.v1.json` fixes ordered workload IDs and exact argv. Direct route is `/usr/local/bin/node tools/run-verification.mjs --manifest provenance/verification-workload.v1.json --route direct --out <absent-dir>`; npm route is `/usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js run verify:extraction -- --manifest provenance/verification-workload.v1.json --route npm --out <different-absent-dir>`. They run in either order and write distinct results. Before workload entry, each launcher synthesizes the same exact canonical workload environment (no inherited PATH/npm variables; only pinned tool-bin, fixed inputs, and normalized root tokens). Versioned canonical serializer emits UTF-8/LF, byte-sorted object keys, preserved arrays, and exact compared fields: manifest hash, roster/order, workload env/inputs, per-row argv/status/hash, HEAD/tree, verdict. Route envelopes retain differing launcher argv/cwd/npm banners separately. Hostile system config, node_modules/.bin/PATH, npm-variable canaries, and reversed order must not affect inner bytes.

Both routes run provenance, dependency, skill drift, task-state, review queue, coord, workflow, typecheck, lint, full tests, source-independence, fsck, and recursive diff-tree checks. Any command failure stops the attended build. The spec makes no adversarial descendant-containment claim.

### AC8 — Record the normal builder handoff and stop before installation

The builder follows `docs/AGENT_INSTRUCTIONS.md` and stops at pending_review. The immutable feature-head migration record binds source SHA, target HEAD/tree, package/lock/source-plan/dependency/skill hashes, direct/npm inner-result hash, commands/exits, no-remotes/clean status, exclusions/differences, `authority:false`, and `installed:false`. Target history is unchanged and has no remote.

An independent `codex-ops` binding/session reviewer binds request bytes/`spec_commit_sha`, immutable Claude-builder feature head, migration-record hash, and target HEAD/tree; reruns source-object checks and AC7; then creates a fresh detached Project_echo worktree at the immutable builder head (never attaching the builder-owned branch), adds exactly `raw/internal/migrations/2026-07-13-134-echo-loop-review.md` (one-path tree delta), commits on detached HEAD with the builder head as sole parent, and pushes the explicit child OID to the full feature-branch ref with expected-old equal to the builder head. The item's `head_sha` remains the immutable builder-head OID (a pre-existing object, never the self-referential child); downstream merge tooling accepts the branch tip only if it is a sole-parent child of `head_sha` whose tree delta is exactly the review record, learning the child OID from the remote ref, never from the child's own tree. Push and probe address the literal Project_echo origin URL recorded in the migration record (never a bare remote name) under absolute config-isolated Git (`GIT_CONFIG_NOSYSTEM=1`, empty global config, `GIT_ATTR_NOSYSTEM=1`, fixed reviewer identity, hooks/signing/askpass disabled, clean index; no pull/rebase/merge/autostash/generic force), preceded by a fail-closed check that no `url.*.insteadOf`/`pushInsteadOf`, `remote.*.pushurl`, or config include is active in the shared repository config; the probe is `/usr/local/bin/git ls-remote <endpoint> <full-ref>` with a strict exactly-one-valid-OID parser distinguishing missing, malformed, duplicate, and unreachable outcomes. After an ambiguous push exit it re-probes: remote-equals-child is success; any other state stops and appends expected, child, and observed-or-`unknown` OIDs plus probe evidence to the item's workflow-owned run log under `raw/internal/agent-runs/` on `main` (a durable sink surviving worktree cleanup, outside the feature ref). This feature-branch push needs no separate founder authorization; founder checkpoints remain at merge and main-push. The record names reviewer binding/session independence, exact commands, result hashes, and verdict; its child becomes the pending-review head and target history remains unchanged. Passing proves only a local split; active Project_echo remains authoritative.

## Out of Scope (Don't Drift)

- Do not create/configure a target remote, publish/install, or change launchd/user skills.
- Do not build migration/evidence/recovery/process-containment infrastructure.
- Do not copy Project_echo history/wiki/raw/backlog archives or include product/context behavior.
- Beyond the three authorized operations (pinned read-only Project_echo source reads, creation of the local no-remote target, and the AC8 feature-branch push), do not touch real repositories/remotes/state, siblings, wiki, or holdout-131; watcher and workflow tests use only disposable fixture repositories.

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

## Founder disposition (2026-07-14): lane PAUSED

Second codex-ops REJECT (record at feature-branch child c2a33138) surfaced two deep gaps —
finding C (watcher process-containment/takeover invariants) and finding D (source-plan
implements 3 of the sealed policy's 14 edge classes) — that require a properly-sized fix
campaign, not another quick cycle. With the 2026-07-18 demo freeze imminent and Project_echo
remaining the active loop regardless (per this spec's own scope), the founder paused this lane.
Item remains in pending_review with the REJECT record standing; target /Users/zhenye/Desktop/echo-loop
remains INCOMPLETE/UNACCEPTED at 2aeb1ede, authority:false, installed:false, DEV. Resume via a
founder-authorized fix campaign scoped to findings A-E after the freeze.
