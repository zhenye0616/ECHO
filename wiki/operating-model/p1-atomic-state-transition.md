---
status: shipped
topic: Process
subtopic: Drift Audit
aliases:
  - P1
  - P1 Atomic State Transition
  - Atomic State Transition
---

# P1 — Atomic State Transition

## Definition of P1

P1 is the **harness-level reliability primitive** the ECHO operating model uses to govern any actor that executes a multi-stage state transition touching more than one file, field, row, ref, or durable marker. The primitive was promoted from `backlog/_followups.md` into a load-bearing contract by item [[2026-05-21-066-process-backlog-handoff-atomicity|066]] (shipped 2026-05-21), with the [[merge-protocol|merge-and-cleanup publish sequence]] named as the next consumer.

P1 is **substrate-, vendor-, actor-count-, and human-recovery-path-neutral.** It does not assume Git, does not assume Anthropic, does not assume a single agent, and does not assume a person is available to triage a partial transition. A Git commit is one possible durable boundary; a rename plus commit, multi-commit sequence, pushed ref, database transaction, append-only log entry, object-store manifest, or message-bus commit can all satisfy P1 if the consumer's fixture declares that boundary explicitly.

## The invariant

> Any state change touching more than one file or one field MUST be observable as a single durable commit OR be fully self-resumable from on-disk state alone.

Restated for the contract:

1. A multi-surface transition MUST publish through one durable boundary that observers can treat as the transition point, **OR** every non-published intermediate state MUST contain enough on-disk information for a process to classify it and deterministically resume, finish, or roll it back.
2. Before the durable boundary, observers MUST NOT see the target state as complete unless the recovery procedure can prove completion from on-disk state alone.
3. After the durable boundary, observers MUST see all required surfaces for the transition together — no missing handoff fields, no stale anchors, no orphaned side artifacts, no prematurely cleaned supporting resources.
4. Recovery MUST NOT require a person to decide whether a partial transition should be finished or reverted. The procedure may choose a conservative rollback-and-replay path, but the choice must be encoded in executable checks.

"Fully self-resumable from on-disk state alone" means the recovery procedure can inspect only durable local state and answer: which transition is in progress, which source/destination states are involved, which paths are allowed to be dirty, whether the transition is already durably published, and which deterministic action to run next (no-op, finish, rollback, or rollback-and-replay).

The two recovery paths are **structurally separate**. `recover()` is rollback-only — it returns the consumer to a clean source state or is an idempotent no-op. `finishUnpublishedTransition()` is the optional finish path — a consumer whose durable boundary is observable separately from the local commit point (e.g., `observerScope: "remote"` requiring a push) uses it to advance the "committed locally but boundary not observed yet" state. Splitting these two paths eliminates the rollback-vs-finish contract conflict the earlier review rounds surfaced; see `tests/skills/atomic-state-transition-harness.test.ts` for the codified `P1ConsumerFixture` interface.

## Worked example — process-backlog work-item stage move

The first consumer is the work-item stage move that takes one item from `backlog/claimed/<id>.md` to `backlog/pending_review/<id>.md` after a builder agent completes implementation. This is more than a rename: handoff fields are written to the destination's frontmatter, the task-state pointer at `backlog/task-state/<id>/builder.md` may be refreshed, and the run log at `raw/internal/agent-runs/<date>-<id>.md` is added.

Before 066, the violation was not that the final Git commit was non-atomic — it was that the transition had an observable **pre-commit window** where the destination path could exist before all required fields and side artifacts were staged together. A reader could see an item at the target stage with stale or empty handoff metadata, and a rerun could encounter a dirty index and require human cleanup.

This consumer satisfies P1 by declaring **the pushed ref `origin/main:$DEST` as its durable boundary** (not the local commit alone), with `kind: "pushed-ref"` and `observerScope: "remote"`. The canonical transcript in `skills/process-backlog.md` (which `tools/sync-skills.sh` mirrors to the Claude Code adapter at `.claude/commands/process-backlog.md`) does:

1. Edit handoff metadata while the item is still at the source path.
2. Run the task-state patcher at `tools/task-state/patch-builder-state.py` **before** the rename, passing the final destination path as `--spec-path` because the patcher records that string verbatim into `canonical_anchors.spec`.
3. Enter a tight publish block: `git mv` the item, **explicit `git add "$DEST"`** to stage the edited contents (without this, `git mv` after editing the source stages the rename at the old blob and the commit publishes stale fields), add remaining touched paths, `git commit`, then `tools/review-queue/push-with-retry.sh` to advance the boundary to `origin/main:$DEST`.
4. If a crash occurs before the local commit, the caller's `recover_p1_stage_move` rolls allowed touched surfaces back to the source state; the caller then replays the transition.
5. If a crash occurs **after** the local commit but before the boundary is observed remotely, a separate caller-side finish-path block (`if p1_local_commit_unpushed; then push-with-retry.sh + boundary verification`) advances the commit to the remote boundary — the local commit is NOT rolled back.
6. If `origin/main:$DEST` is already observed, the transition is complete; the caller exits 0 via the idempotent `p1_boundary_published_remotely` check.

Note that the run log `$LOG` is **not** in the recovery surface set. It is pre-existing agent-authored content written during the builder's implementation phase; the publish block only `git add`s it. Recovery never touches agent-authored content.

These mechanism choices — `git mv` + `git add "$DEST"` + patcher contract + `push-with-retry.sh` — are **local to this consumer**. A future consumer inherits P1's invariant and the `P1ConsumerFixture` interface but not this Git path layout, patcher call, or single-commit recipe.

## Recovery contract

The current consumer's recovery procedure is parameterized over a prefix-guarded surface list (`P1_ALLOWED_RECOVERY_PREFIXES=("backlog/" "backlog/task-state/")`) and uses **per-surface dispatch**:

- For paths existing in HEAD: `git restore --staged --worktree -- "$path"`.
- For transition-created untracked paths: `git rm --cached --ignore-unmatch -- "$path"` followed by `rm -f -- "$path"`. The benign `--ignore-unmatch` return-0 for the "not staged" case does not hide real `git rm` errors; a corrupt index or I/O failure still returns non-zero.

The recovery function returns documented codes that gate publish: `2` (unsafe path / prefix-guard violation), `4` (per-surface dispatch failure), `5` (touched surfaces still dirty after rollback). The caller pattern is `recover_p1_stage_move "${P1_TOUCHED_SURFACES[@]}" || exit $?` — recovery failure is a hard process exit, never a fall-through to pull/rebase. Independent caller `exit` codes are `3` (finish-path `push-with-retry.sh` failed) and `6` (post-push boundary check failed — push reported success but the remote doesn't observe `$DEST`).

The post-recovery pull uses `git -c rebase.autoStash=true pull --rebase origin main` so tracked-dirty files outside `P1_TOUCHED_SURFACES` (the agent run log, race-recovery entries in `raw/internal/queue-errors.md` appended by `push-with-retry.sh`) do not block the rebase. The autostash is generic git behavior; this consumer does not need to enumerate every tracked-dirty file the surrounding flow may have touched.

## Test harness as the cross-consumer contract

The reusable harness lives at `tests/skills/atomic-state-transition-harness.test.ts` and is parameterized over the `P1ConsumerFixture` interface — `transitionKey`, `allowedTouchedSurfacePrefixes`, `setup`, `touchedSurfaces`, `observe` (returns `DurableBoundaryObservation` + visibility flags), `prePublishSteps`, `publishThroughDurableBoundary`, rollback-only `recover`, optional `finishUnpublishedTransition`, `assertPublished`, `assertCleanSourceState`, optional `assertNoConcurrentTransitionsOnSameKey`. The harness asserts the P1 properties without knowing consumer-specific path names, command names, stage labels, or storage substrate.

Concurrency is **key-scoped**, not global. A fixture may expose `assertNoConcurrentTransitionsOnSameKey()` for same-item protection, but the harness must NOT fail merely because two transitions on different `transitionKey` values run at the same time — P1 forbids unscoped intermediate visibility, not legitimate parallelism.

The test file includes neutral harness-only fixtures where `targetMayBeVisible` is both false and true before publish, plus a `finishUnpublishedTransition()`-exercising fixture, plus the 14 current-consumer specialization tests that run against a local bare repo as origin (no real-network dependency).

## Future consumers

The 065 merge postmortem in `backlog/_followups.md` names the [[merge-protocol|`skills/merge-and-cleanup.md`]] publish sequence as the next P1 consumer: C7 moves the item to `backlog/complete/`, C8 commits, C9 currently cleans worktree/branches, and C11 pushes. 066 deliberately did NOT pre-build that merger fix; it ships a separate spec citing 066 as parent invariant and reusing the `P1ConsumerFixture` interface. If the harness needs extension at that point, the extension is additive and non-breaking.

P1 is also the right shape for any future boot-time recovery daemon, extractor/watcher checkpoint flush, or coordination-event compaction sequence. Each consumer declares its `DurableBoundaryObservation` (`kind`, `count`, `token`, `published`, `observerScope`) and the harness validates the invariant.

## Out of scope (not P1's contract)

- A specific lock primitive. A lock can reduce concurrent entry, but it does not replace P1 — multi-surface transitions still need atomic publication or deterministic recovery.
- A new global recovery daemon. The current consumer gets a deterministic recovery guard; broader boot-time recovery is a separate consumer.
- Human escalation as the recovery mechanism. A machine-readable hard failure is acceptable when an unexpected dirty surface is detected; asking a person to decide normal recovery is not.
- Generalizing 066 to P2 through P12. P1 is the only primitive consumed there; the others are evidence rows in `backlog/_followups.md`, not 066 deliverables.

## Related

- [[merge-protocol]] — named next P1 consumer (C7/C8/C9/C11 publish sequence)
- [[cross-tool-spec-review]] — the spec-review pattern that produced 066's three-round convergence (r1 → r2 → r3 corrections)
- [[review-queue-protocol]] — operating-model context for how P1 consumers' specs are reviewed
- [[automation-worktree-isolation]] — sibling worktree-isolation primitive consumed by the merger
- [[drift-prevention]] — agents drifting via scope expansion is the failure mode the strategist analogue (patching deeper instead of removing) mirrors; P1 enforces structural correctness so agents can't paper over partial states
