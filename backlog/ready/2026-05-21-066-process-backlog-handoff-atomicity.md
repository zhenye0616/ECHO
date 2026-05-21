---
id: 2026-05-21-066-process-backlog-handoff-atomicity
title: "P1 - Atomic state transition (consumer: process-backlog work-item stage move)"
status: ready
priority: HIGH
estimate: 0.25-0.5d
created: 2026-05-21
blocked_by: []
task_state_ref: 2026-05-21-066-process-backlog-handoff-atomicity
requested_reviewers: []  # resolved by current routing configuration; P1 does not hardcode vendors
files_to_modify:
  - skills/process-backlog.md  # current consumer: make the work-item stage move satisfy P1 with a bounded publish block and deterministic recovery from on-disk state
  - .claude/commands/process-backlog.md  # generated adapter; refresh only through tools/sync-skills.sh
  - tests/skills/atomic-state-transition-harness.test.ts  # reusable P1 harness plus current-consumer specialization
spec_refs:
  - backlog/_followups.md  # P1 primitive plus 2026-05-21 065 postmortem rows P1/P6/P7/P11, which empirically validate the primitive and name the merger as the next P1 consumer
  - skills/process-backlog.md  # current consumer whose work-item stage move instantiates P1
  - skills/merge-and-cleanup.md  # named future P1 consumer; read C7/C8/C9/C11 and failure modes to shape the generic fixture, but do not modify it in 066
  - tools/task-state/patch-builder-state.py  # current consumer dependency; records --spec-path verbatim into canonical_anchors.spec
  - tools/sync-skills.sh  # adapter sync check for process skill changes
  - backlog/reviews/2026-05-21-066-process-backlog-handoff-atomicity/r1/codex.md  # r1 technical corrections that must remain pinned
  - backlog/reviews/2026-05-21-066-process-backlog-handoff-atomicity/r1/codex-ops.md  # r1 technical corrections that must remain pinned
  - raw/internal/decisions/  # drift-event destination if the primitive exposes a non-obvious coupling

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
review_notes: ""
agent_notes: ""
---

# P1 - Atomic state transition (consumer: process-backlog work-item stage move)

## Why this spec exists

`backlog/_followups.md` now names P1 - Atomic state transition as a priority reliability primitive:

> Any state change touching more than one file or one field MUST be observable as a single durable commit OR be fully self-resumable from on-disk state alone.

The current process-backlog work-item stage move is the first consumer. It changes more than one durable surface: the work item changes stage, handoff fields are written, task-state anchors may be refreshed, and the run log is added. The current draft made those specific steps safer, but still read as a patch to one role pipeline. This respec makes P1 the load-bearing contract and treats the existing stage move as a worked example.

The trigger is operational: as soon as multiple actors can run the same workflow family, a half-finished stage transition becomes observable by another process. P1 prevents that class of bug without baking in today's role names, tool vendors, actor count, lock mechanism, durability substrate, or human recovery path.

### Evidence base

The 2026-05-21 065 merge postmortem in `backlog/_followups.md` moved this from abstract risk to observed evidence. Row P1 records a rebase replay that dropped a multi-surface backlog-stage transition from an earlier local merge commit. Row P6 records cleanup running before C11 push, leaving branch/worktree cleanup ahead of the durable publish boundary. Row P7 records three repeated rebase retries that re-presented the same conflict work instead of replaying a resolved transition cheaply. Row P11 records three founder escalations after push-rejection retry paths exhausted the skill's programmatic resolver. Together, those rows prove the primitive applies beyond `process-backlog`: the `skills/merge-and-cleanup.md` publish sequence is the named second P1 consumer.

## The architectural primitive (P1, restated for this spec's scope)

P1 applies to any actor executing a multi-stage state transition that touches more than one file, field, row, object, ref, or durable marker.

The invariant:

1. A multi-surface transition MUST publish through one durable boundary that observers can treat as the transition point, OR every non-published intermediate state MUST contain enough on-disk information for a process to classify it and deterministically resume, finish, or roll it back.
2. Before the durable boundary, observers MUST NOT see the target state as complete unless the recovery procedure can prove completion from on-disk state alone.
3. After the durable boundary, observers MUST see all required surfaces for the transition together, with no missing handoff fields, stale anchors, orphaned side artifacts, or prematurely cleaned supporting resources.
4. Recovery MUST NOT require a person to decide whether a partial transition should be finished or reverted. The procedure may choose a conservative rollback-and-replay path, but the choice must be encoded in executable checks.

"Fully self-resumable from on-disk state" means the recovery procedure can inspect only durable local state and answer:

- Which transition, if any, is in progress.
- Which source and destination states are involved.
- Which paths, refs, fields, or resources are allowed to be dirty for that transition.
- Whether the transition is already durably published.
- Which deterministic action to run next: no-op, finish, rollback, or rollback-and-replay.
- Whether recovery succeeded, expressed as a clean observable state or a machine-readable failure.

What P1 does not assume:

- No specific role name. The primitive applies to actors and processes, not to the current pipeline's role labels.
- No specific vendor or model. Vendor selection is routing configuration, not the transition contract.
- No specific actor count. The primitive must hold for one actor, many actors, or a future scheduler.
- No human-in-loop dependency. Human escalation may be configured for policy, but cannot be required to recover a partial transition.
- No specific durability substrate. A Git commit is one possible durable boundary. A rename plus commit, multi-commit sequence, pushed ref, database transaction, append-only log entry, object-store manifest, or message-bus commit can also satisfy the primitive if the fixture declares that boundary explicitly.
- No global serialization requirement. Two transitions for different keys may run concurrently if they cannot observe or mutate each other's intermediate surfaces. P1 forbids unscoped intermediate visibility, not legitimate parallelism.
- No specific lock primitive. A lock can reduce concurrency, but P1 is still required if a transition mutates multiple surfaces.

## Worked example - current consumer

The current consumer is the process-backlog work-item stage move that takes one work item from `backlog/claimed/` to `backlog/pending_review/` after implementation work is complete. In today's implementation, that transition also writes handoff fields, may refresh `backlog/task-state/<id>/builder.md`, and adds `raw/internal/agent-runs/<date>-<id>.md`.

The violation today is not that the final Git commit is non-atomic. The violation is that the transition has an observable pre-commit window where the destination path can exist before all required fields and side artifacts are staged together. A reader can see a work item at the target stage with stale or empty handoff metadata, or a rerun can encounter a dirty index and require human cleanup.

This consumer satisfies P1 by using Git as its local durable boundary and by adding a deterministic rollback-and-replay recovery recipe for all partial pre-boundary states. The mechanism is local to this consumer:

- Edit handoff metadata while the item is still at the source path.
- Run the task-state patcher before the rename, but pass the final destination path as `--spec-path` because the patcher records that string verbatim into `canonical_anchors.spec`.
- Enter a tight publish block: `git mv`, explicit `git add "$DEST"`, add remaining touched paths, then `git commit`.
- If a crash occurs before the commit, recover from on-disk state by rolling the allowed touched surfaces back to the source state and replaying the transition.
- If the commit exists, treat the transition as published and do not replay.

The explicit `git add "$DEST"` after `git mv` is required. The reviewed throwaway-repo reproduction showed that `git mv` after editing the source stages the rename at the old blob while leaving the destination's edited contents unstaged. Without `git add "$DEST"`, the commit can publish stale handoff fields and leave the edited destination dirty.

These mechanism choices are local to this consumer. A future consumer, such as the `merge-and-cleanup` publish sequence, inherits P1's invariant and the harness contract but not this Git path layout, patcher call, file names, or single-commit recipe.

## Acceptance Criteria

### AC1 - P1 is codified as a generic structural test contract

Add a reusable P1 test harness in `tests/skills/atomic-state-transition-harness.test.ts`. The harness MUST be parameterized over a consumer fixture instead of hardcoding this spec's paths.

The fixture interface MUST include the equivalent of:

```ts
type DurableBoundaryObservation = {
  kind: "git-commit" | "rename-plus-commit" | "multi-commit" | "pushed-ref" | "non-git";
  count: number;
  token: string;
  published: boolean;
  observerScope: "local" | "remote" | "external";
};

type P1ConsumerFixture = {
  name: string;
  transitionKey: string;
  allowedTouchedSurfacePrefixes: string[];
  setup(): Promise<void>;
  touchedSurfaces(): Promise<string[]>;
  observe(): Promise<{
    durableBoundary: DurableBoundaryObservation;
    sourceVisible: boolean;
    targetVisible: boolean;
    targetComplete: boolean;
    stagedOrPreparedSurfaces: string[];
    dirtySurfaces: string[];
  }>;
  prePublishSteps: Array<{
    name: string;
    run(): Promise<void>;
    allowedDirtySurfaces: string[];
    targetMayBeVisible: boolean;
  }>;
  publishThroughDurableBoundary(): Promise<DurableBoundaryObservation>;
  recover(): Promise<void>;
  assertPublished(boundary: DurableBoundaryObservation): Promise<void>;
  assertCleanSourceState(): Promise<void>;
  assertNoConcurrentTransitionsOnSameKey?(other: P1ConsumerFixture): Promise<void>;
};
```

This interface is the explicit cross-consumer contract. Any future P1 consumer implements the fixture; the harness validates the primitive without knowing consumer-specific path names, command names, stage labels, or storage substrate.

The generic harness MUST assert these P1 properties for any fixture:

1. Before `publishThroughDurableBoundary()`, every named crash point is either still source-visible with no completed target state, or `recover()` can deterministically return to a clean source state.
2. `targetMayBeVisible: true` is permitted on a pre-publish step. The harness MUST NOT assume target visibility is always false before publish. Instead, if the target is visible before the declared durable boundary, the fixture must prove the state is either not complete or is recoverable from on-disk state alone. This is what lets the same contract fit the future merger consumer, where `backlog/complete/<id>.md` can exist locally before C11 push.
3. `recover()` does not prompt, branch on prose instructions, or require an operator decision. It runs from fixture-provided on-disk state only.
4. After `publishThroughDurableBoundary()`, the fixture reports its durable boundary. The harness asserts `published === true`, validates the declared boundary shape, and calls `assertPublished()` to prove every required surface moved together. The harness does not dictate whether the boundary is one commit, a rename plus commit, a multi-commit sequence, a pushed ref, or a non-git transaction.
5. Re-running `recover()` after a published transition is a no-op.
6. The harness does not know this consumer's path names. Paths, expected file status entries, durability tokens, and recovery commands come from the fixture.
7. Concurrency assertions are key-scoped, not global. A fixture may expose `assertNoConcurrentTransitionsOnSameKey()` for same-item protection, but the harness MUST NOT fail merely because two transitions on different `transitionKey` values run at the same time. It must assert that different-key transitions do not observe each other's intermediate touched surfaces.

The test file MUST include at least one small generic harness-only fixture where `targetMayBeVisible` is false before publish and one harness-only fixture where `targetMayBeVisible` is true before publish. These fixtures are not workflow implementations; they exist only to prove the contract is substrate- and visibility-neutral. AC3 remains the only real consumer specialization in 066.

This AC is the reusable gate for future P1 consumers. It is not a new workflow, scheduler, lock manager, or storage abstraction.

### AC2 - The current consumer implements P1 with a deterministic publish and recovery recipe

Modify `skills/process-backlog.md` so the work-item stage move uses the following shape. Variable names may be adapted to the surrounding prose, but the ordering, recovery guard, prefix check, and review corrections are load-bearing.

Canonical current-consumer transcript:

```bash
cd ~/Desktop/Project_echo

ITEM_BASENAME="$(basename "$ITEM_FILE")"
ITEM_FILE="backlog/claimed/$ITEM_BASENAME"
DEST="backlog/pending_review/$ITEM_BASENAME"
TASK_ID="${ITEM_ID}"
POINTER="backlog/task-state/$TASK_ID/builder.md"

# P1 recovery surfaces are the set of file paths this consumer's transition
# touches and is allowed to roll back through git restore/rm. Do not reuse this
# list as "all dirty files in the repo"; it is consumer-owned transition scope.
P1_ALLOWED_RECOVERY_PREFIXES=("backlog/" "backlog/task-state/" "raw/internal/agent-runs/")
P1_TOUCHED_SURFACES=("$ITEM_FILE" "$DEST" "$POINTER" "$LOG")

p1_assert_allowed_recovery_surfaces() {
  local path prefix ok
  for path in "$@"; do
    case "$path" in
      ""|/*|../*|*/../*|*/..|.)
        echo "ERROR: unsafe P1 recovery path: $path" >&2
        return 2
        ;;
    esac

    ok=0
    for prefix in "${P1_ALLOWED_RECOVERY_PREFIXES[@]}"; do
      case "$path" in
        "$prefix"*) ok=1 ;;
      esac
    done
    if [ "$ok" -ne 1 ]; then
      echo "ERROR: P1 recovery path outside allowed prefixes: $path" >&2
      return 2
    fi
  done
}

recover_p1_stage_move() {
  local surfaces=("$@")

  p1_assert_allowed_recovery_surfaces "${surfaces[@]}" || return $?

  if git cat-file -e "HEAD:$DEST" 2>/dev/null; then
    # Already published in HEAD. Nothing to recover.
    return 0
  fi

  STATUS="$(git status --porcelain -- "${surfaces[@]}")"
  [ -z "$STATUS" ] && return 0

  # Rollback must run BEFORE pull/rebase. A pull/rebase against a dirty index or
  # dirty touched surface can abort or replay on top of a partial transition,
  # turning a deterministic rollback into human triage. The safe order is:
  # classify local partial state -> roll back only this consumer's touched
  # surfaces -> verify clean -> pull/rebase -> replay the transition.
  git restore --staged --worktree -- "${surfaces[@]}" 2>/dev/null || true

  for path in "${surfaces[@]}"; do
    if ! git cat-file -e "HEAD:$path" 2>/dev/null; then
      rm -f -- "$path"
    fi
  done

  git diff --quiet -- "${surfaces[@]}"
  git diff --cached --quiet -- "${surfaces[@]}"
}

recover_p1_stage_move "${P1_TOUCHED_SURFACES[@]}"
git pull --rebase origin main

# Idempotency after pull: a completed prior run is a no-op.
if git cat-file -e "HEAD:$DEST" 2>/dev/null && [ ! -f "$ITEM_FILE" ]; then
  exit 0
fi

# Step 1 - edit handoff metadata on the source path.
# Edit head_sha / pr_url / agent_notes in place on $ITEM_FILE.

# Step 2 - refresh task-state pointer if this item uses one. The patcher
# records --spec-path verbatim into canonical_anchors.spec without reading
# the file from that path, so pass the final destination path before git mv.
HAS_TASK_STATE_REF=$(
  awk '/^---$/{c++; next} c==1 && /^task_state_ref:/{print; exit}' "$ITEM_FILE"
)
if [ -n "$HAS_TASK_STATE_REF" ] || [ -f "$POINTER" ]; then
  python3 tools/task-state/patch-builder-state.py \
    --task-id "$TASK_ID" \
    --outcome "$OUTCOME" \
    --spec-path "$DEST" \
    --branch "agent/$SLUG" \
    --head-sha "$HEAD_SHA" \
    --run-log "$LOG"
  if [ -f "$POINTER" ]; then
    python3 tools/task-state/lint.py "$POINTER"
  fi
fi

# Step 3 - durable publish block. No subprocess that can wait on network,
# no prose edit, and no tool startup belongs between git mv and git commit.
git mv "$ITEM_FILE" "$DEST"
git add "$DEST"
[ -f "$POINTER" ] && git add "$POINTER"
git add "$LOG"
git commit -m "review: $ITEM_ID"
git push origin main
```

The recovery guard's surface list is parameterized by design. For this consumer, the touched file surfaces are the source item path, destination item path, optional builder pointer, and run log. For the future merger consumer, a separate `recover_p1_merge_publish()` should use the same shape with that consumer's touched surfaces, such as pending-review item, complete item, sidecar, and any branch/worktree resources guarded by equivalent consumer-specific checks. 066 does not implement that merger function.

Load-bearing corrections preserved from r1 review:

1. `git add "$DEST"` after `git mv` is required. It stages the edited destination contents; `git mv` alone can stage the rename at the old blob.
2. `--spec-path "$DEST"` is required even though the patcher runs before `git mv`, because the patcher records that argument verbatim into `canonical_anchors.spec`.
3. Tests that inspect the commit shape MUST use `git diff-tree -r -M --no-commit-id --name-status HEAD` or an equivalent recursive, rename-detecting command.

The generated command adapter MUST be refreshed with `tools/sync-skills.sh`, and `tools/sync-skills.sh --check` MUST exit 0 after the edit.

### AC3 - The reusable P1 harness has a current-consumer specialization

In `tests/skills/atomic-state-transition-harness.test.ts`, instantiate the AC1 harness for the process-backlog stage move.

The specialization MUST parameterize:

- Source path: `backlog/claimed/<id>.md`.
- Destination path: `backlog/pending_review/<id>.md`.
- Side-effect paths: `backlog/task-state/<id>/builder.md` when present, plus `raw/internal/agent-runs/<date>-<id>.md`.
- Transition key: the work-item id.
- Expected durable boundary: one local Git commit for the transition.
- Expected committed file status: one rename for the item file, one modify for the task-state pointer when present, and one add for the run log.
- Recovery recipe: the rollback-and-replay guard from AC2, not manual `git status` interpretation.

Required current-consumer tests:

1. Pre-publish edits do not expose the target stage. After handoff metadata edit and task-state patcher execution, the item is still under the source path, the target path does not exist, and the index has no staged changes for the transition surfaces.
2. The publish block creates one durable boundary containing all required surfaces. Assert with `git diff-tree -r -M --no-commit-id --name-status HEAD` so the harness sees file-level rename/modify/add entries and does not depend on local Git config.
3. The committed destination contents include the edited handoff metadata. Read via `git show HEAD:backlog/pending_review/<id>.md` and assert `head_sha` is the edited value, proving `git add "$DEST"` is present.
4. A crash after source metadata edit but before `git mv` is recovered by the recipe without an operator decision; after recovery, source state is clean and replay can publish.
5. A crash after `git mv` but before `git add "$DEST"` is recovered by the same recipe without an operator decision; after recovery, source state is clean and replay can publish.
6. Recovery refuses to run if the touched-surface list contains an absolute path, a `..` traversal, or a path outside the documented allowed prefixes. This pins the guard against a future bug that would otherwise run `git restore` or `rm` against unrelated work.
7. Running recovery after the published commit is a no-op.

The tests use throwaway local repos only. They do not push to a remote and do not test concurrency scheduling beyond the AC1 fixture-level key scoping contract.

## Out of Scope (Don't Drift)

1. Generalizing this item to P2-P12. P1 is the only primitive consumed here; P6/P7/P11 are evidence and compatibility checks, not additional deliverables.
2. Pre-building future P1 consumers. This spec ships ONLY the backlog-stage-move consumer plus the reusable harness. The `merge-and-cleanup` publish sequence is a known future P1 consumer and shapes the AC1 fixture contract, but the merger fix is a follow-on spec, not a 066 AC. Do not edit `skills/merge-and-cleanup.md` in this item.
3. Modifying `tools/task-state/patch-builder-state.py`. This item relies on its current `--spec-path` behavior and pins the caller contract.
4. Changing the storage layer, lock primitive, claim algorithm, routing system, or scheduler.
5. Adding a new global recovery daemon. The current consumer gets a deterministic recovery guard; broader boot-time recovery is a separate consumer if needed.
6. Changing commit message formats, backlog directory taxonomy, run-log schema, or task-state schema.
7. Adding human escalation as the recovery mechanism. A machine-readable hard failure is acceptable when an unexpected dirty surface is detected; asking a person to decide normal recovery is not.
8. Editing `wiki/` before shipment.

## Risks

- Git substrate lock-in. The invariant must stay substrate-neutral. Only the worked example and AC2/AC3 current-consumer specialization may rely on Git commands.
- Lock-primitive confusion. A future lock can reduce concurrent entry, but it does not replace P1; multi-surface transitions still need atomic publication or deterministic recovery.
- Mechanism-vs-invariant confusion. The `git mv` / `git add "$DEST"` / patcher recipe is not the P1 contract. It is only how this consumer satisfies the contract.
- Recovery recipe too broad. The guard must clean only the known transition surfaces. A broad reset, stash, checkout, or unconstrained `rm` would violate repo discipline and risk deleting unrelated work.
- Recovery recipe too manual. If the implementation documents "inspect `git status` and choose" instead of executable branching, it fails P1.
- Test transcription drift. The harness should keep the current-consumer commands close to the skill transcript and name the source section in comments so future edits update both.
- Patcher contract coupling. If a later change makes the patcher read `--spec-path` from disk, this consumer's pre-rename call with destination path must be re-reviewed.

### Forward-compatibility with P1-consumer-#2 (merger)

The 065 postmortem names `skills/merge-and-cleanup.md` as the next P1 consumer: C7 moves the item to `backlog/complete/`, C8 commits, C9 currently cleans worktree/branches, and C11 pushes. 066 does not pre-build that merger fix; it will be a separate spec following this pattern. 066 does validate that `P1ConsumerFixture` is shaped to accept the merger as a second instantiation by generalizing durable boundaries beyond one commit, allowing `targetMayBeVisible: true` before publish, and scoping concurrency by `transitionKey` rather than globally. The merger fix's spec should cite 066 as its parent invariant and reuse the harness; if the harness needs extension at that point, that extension should be additive and non-breaking.

## Tests

Run:

```bash
npm test -- tests/skills/atomic-state-transition-harness.test.ts
tools/sync-skills.sh --check
git diff --check
```

The test file must cover both layers:

- Generic P1 harness tests from AC1, proving the reusable contract is path-, consumer-, substrate-, boundary-, and visibility-parameterized.
- Current-consumer specialization tests from AC3, proving the process-backlog stage move publishes all required surfaces together and recovers from crash points without human decision.

The current-consumer commit-shape assertion MUST use:

```bash
git diff-tree -r -M --no-commit-id --name-status HEAD
```

The committed-content assertion MUST read the destination from the commit object, not the working tree:

```bash
git show HEAD:backlog/pending_review/<id>.md
```

## Definition of Done

- The P1 invariant is represented by a reusable, parameterized test harness.
- The harness interface supports target-visible-before-boundary consumers and durable boundaries beyond a single commit without knowing consumer-specific paths.
- The process-backlog stage move is implemented as one current-consumer specialization of that harness.
- The current consumer's publish block includes `git mv "$ITEM_FILE" "$DEST"`, explicit `git add "$DEST"`, remaining path adds, and one commit.
- The task-state patcher is called with `--spec-path "$DEST"` before the rename.
- Recovery from pre-commit crash points is deterministic from on-disk state, prefix-guarded to the consumer's touched surfaces, run before pull/rebase, and requires no human decision.
- `tools/sync-skills.sh --check`, the P1 test file, and `git diff --check` pass locally.

## After Completion (Strategist Notes)

- After the item lands in `backlog/complete/`, promote P1 into `wiki/principles/atomic-state-transitions.md` or the nearest existing operating-model principles page if the strategist decides the primitive is now durable enough for wiki. The wiki text should document the invariant, not the process-backlog mechanism.
- Update `backlog/_followups.md` under P1 to annotate the current consumer as satisfied by 066 once shipped.
- File the `merge-and-cleanup` P1 consumer as a separate follow-on spec if it is not already filed. That spec should cite 066, instantiate the harness, and address C7/C8/C9/C11 ordering without widening 066.
- If the recovery guard reveals a broader boot-time recovery need, file a separate spec for that consumer rather than folding it into this item.
