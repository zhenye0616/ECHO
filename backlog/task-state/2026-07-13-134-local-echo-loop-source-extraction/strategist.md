## current_thesis

Materialize the internal orchestration protocol as a source-independent local `echo-loop` repository while leaving the active Project_echo loop untouched. Judge the final repo and fixture evidence, not migration machinery.

## locked_decisions

- `echo-loop` owns agent skills, backlog/task-state, review queue, coordination/deadlines, builder/reviewer/merge workflows, and operator tooling.
- Source is pinned to `Project_echo@2971310441b69735cbe759293abd8c4d044bf347`; dirty checkout bytes are excluded.
- After orchestrator preflight, one builder atomically `mkdir`s absent target `/Users/zhenye/Desktop/echo-loop`; siblings never touch it and the builder refuses EEXIST.
- The builder creates local branch `migration/2026-07-13-134` under fully scrubbed Git/object/index/config environment with no remote or external object state.
- Project_echo gains no extraction CLI, lifecycle state, lock/takeover, publication/recovery helper, committed sandbox profile, or migration-framework tests.
- An interrupted target is incomplete/unaccepted and manually archived before a fresh assigned run; no automatic adoption/resume/delete.
- Copy protocol implementation and installable templates, not Project_echo history/wiki/raw/backlog archives or product/context code.
- Loop APIs exclude retrieval MCP; loop state is private and tests preserve source transaction/order/role/deadline/idempotency behavior without promising external exactly-once effects.
- Preserve proposed-review, ready seals, atomic claims, worktree isolation, reviewer independence, fresh eyes, and founder checkpoints.
- Fixture Git runs only in scratch repos with explicit environment/config/object/index/transport containment.
- Mode/OID-aware fixed-point traversal bootstraps resolver config, uses literal Git pathspecs, keys binding context, and resolves transitive edges under multiple queue orders.
- Dependency plan separates npm/toolchain classes and reconciles the final rewritten/authored/generated target tree; exact peer/optional/platform/bundled closure derives a no-extraneous offline lock.
- `invokeRole` has deterministic invocation-event identity, atomically PENDING-or-PUBLISHED state, and synchronous retry recovery through the same public call; it never returns accepted/duplicate before publication.
- Coordination init forces single-file SQLite DELETE mode, proves sidecar absence, validates before/after descriptor-relative no-replace publication, and covers every fsync crash boundary.
- Watchers CAS a unique item/round/spec-SHA claim so two watcher ticks yield exactly one terminal repository action.
- Builder-owned runner/vector/comparator files are sealed outside target; trusted parent captures subjects that cannot read baseline/evidence, with fixed volatile inputs and negative controls.
- One-shot retained operator audit has an exact path/argv/result schema and invokes target-owned `verify:extraction`; migration record binds both.
- `verify:extraction` runs from pinned clone cwd through distinct direct/npm outputs with a versioned success/failure schema and exact normalized equality.
- Offline npm uses direct npm-cli with inherited/project config stripped and lifecycle scripts forbidden; every command has bounded streams, one shutdown latch, and fsynced survivor diagnostics.
- The migration record pins target HEAD/tree, hashes, commands, tests, no-remotes, clean state, false authority, and not-installed.
- Active Project_echo loop, launchd, user skills, remote state, and authority remain unchanged.

## open_questions

- R14 by independent `codex` and `codex-ops` must confirm resolver bootstrap/literal paths, final-tree dependency reconciliation, public-call PENDING recovery, sidecar-free init, watcher CAS, lifecycle denial, bounded diagnostics, and verifier result equality.
- Later cutover decides installation, per-repository queue state, and authority transfer.

## dont_touch

- Do not change active loop/launchd/user skill adapters or any real repo/remote/state.
- Do not include product meeting logic, context capture/retrieval, or historical corpus.
- Do not touch siblings, wiki, or holdout-131.

## canonical_anchors

- decision: raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md
- spec: backlog/proposed/2026-07-13-134-local-echo-loop-source-extraction.md
- reviews: backlog/reviews/2026-07-13-134-local-echo-loop-source-extraction/
