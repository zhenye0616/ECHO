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
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-21T23:00:00Z"
branch: "agent/process-backlog-handoff-atomicity"
worktree: "~/Desktop/Project_echo--process-backlog-handoff-atomicity"
head_sha: "329e946156abb601682e3b7638b4c26c233d58b4"
pr_url: ""
review_notes: |
  Merged on 2026-05-21 (PDT) / 2026-05-22T06:00Z via founder reconciliation. Verdict from
  /review-pending sidecar (2026-05-22T06:34:29Z): "merge as-is" (test_counts: 1170 passed, 0 failed).

  Conflicts resolved:
  - None. Clean ort-strategy merge; only three files changed (skills/process-backlog.md,
    .claude/commands/process-backlog.md, tests/skills/atomic-state-transition-harness.test.ts).

  C3.5 cross-vendor consult: none invoked — no conflicts surfaced, sidecar's expected-conflicts
  list said "none expected" and was correct.

  Fixups applied:
  - None. Sidecar declared no pre-merge fixups.

  Fixups deferred to follow-up items:
  - None.

  Verify: 1170/1170 tests pass (21 skipped, unchanged from main); lint clean; typecheck clean;
  tools/sync-skills.sh --check OK (adapter is byte-identical to canonical skill).

  Follow-up items (non-blocking):
  - Make caller-provided variable names around skills/process-backlog.md (OUTCOME, HEAD_SHA, LOG)
    even more explicit in prose so future agents don't misread the canonical P1 transcript as a
    standalone shell snippet. Filed to backlog/_followups.md in C10.
agent_notes: |
  AC1+AC2+AC3 implemented. Step E2 of skills/process-backlog.md replaced with
  the canonical P1 transcript: rollback-only recover_p1_stage_move with prefix
  guard + per-surface dispatch covering tracked-in-HEAD AND staged-but-not-in-HEAD
  paths; caller-side finish-path block; --autostash post-recovery pull; explicit
  git add "$DEST"; patcher with --spec-path "$DEST" before rename. Adapter at
  .claude/commands/process-backlog.md refreshed via tools/sync-skills.sh.
  tests/skills/atomic-state-transition-harness.test.ts adds the AC1 reusable
  harness (P1ConsumerFixture interface, generic invariant assertions, two
  neutral fixtures, key-scoped concurrency) plus 14 AC3 current-consumer tests
  using a local bare repo as origin. All 32 tests pass. sync-skills.sh --check
  passes; git diff --check clean; tsc --noEmit clean.
  One judgment call documented in the run log (Decision #1) — broadened the
  per-surface dispatch filter from "in HEAD" to "tracked (HEAD or index)" to
  fix AC3 test 5 (post-git-mv crash recovery); the original r2 codex-ops F4
  filter excluded staged-but-not-in-HEAD paths and routed them to
  `git rm --cached`, which refuses without -f when staged content is unique.
  The broadened filter preserves r2's intent (avoid git restore aborts on
  unknown paths) while fixing the test-5 gap.
  Review fixups applied at af56e4bdeda7953732ddbf8915515a9383a20248:
  restored the E2.5/E2.6 process-backlog protocol markers, updated the generic
  P1 harness to verify every pre-publish step as an independent crash point,
  and asserted dirtySurfaces against allowedDirtySurfaces. Observed verification:
  npm test passed (101 files passed, 1 skipped; 1167 tests passed, 21 skipped);
  npm run lint passed; npm run typecheck passed; tools/sync-skills.sh --check
  passed; git diff --check passed.
  Second review fixups applied at c4ec6b0ffdfac9ca939f31b3d11f1760367ee0e5:
  restored the benign `git rm --cached --ignore-unmatch -- "$path"` cleanup
  branch, pinned it in the embedded handoff script and structural markers,
  expanded test 12 to prove the benign git-rm path plus real rm failure path,
  and replaced the separate-repo concurrency check with a same-substrate
  different-key fixture. Observed verification: npm test passed (101 files
  passed, 1 skipped; 1168 tests passed, 21 skipped); npm run lint passed;
  npm run typecheck passed; tools/sync-skills.sh --check passed; git diff
  --check passed.
  Third review fixups applied at 329e946156abb601682e3b7638b4c26c233d58b4:
  added `set -euo pipefail` to the canonical handoff transcript and embedded
  test script, updated the hard-stop prose to name the fail-fast contract, and
  added test 3b proving `lint.py` failure exits before `git mv`, commit, or
  push. Observed verification: npm test passed (101 files passed, 1 skipped;
  1170 tests passed, 21 skipped); npm run lint passed; npm run typecheck
  passed; tools/sync-skills.sh --check passed; git diff --check passed.
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

This consumer satisfies P1 by using **the pushed ref `origin/main:$DEST`** as its durable boundary (not the local commit alone) and by combining a rollback-only recovery procedure with a separate caller-side finish path for the post-commit-pre-push state. The mechanism is local to this consumer:

- Edit handoff metadata while the item is still at the source path.
- Run the task-state patcher before the rename, but pass the final destination path as `--spec-path` because the patcher records that string verbatim into `canonical_anchors.spec`.
- Enter a tight publish block: `git mv`, explicit `git add "$DEST"`, add remaining touched paths, `git commit`, then `tools/review-queue/push-with-retry.sh` to advance the boundary to `origin/main:$DEST`.
- If a crash occurs before the local commit, the caller's `recover_p1_stage_move` rolls allowed touched surfaces back to the source state; the caller then replays the transition.
- **If a crash occurs after the local commit but before the boundary is observed remotely**, the caller's separate finish-path block (`if p1_local_commit_unpushed; then push-with-retry.sh + boundary verification`) advances the commit to the remote boundary — the local commit is NOT rolled back, it is finished.
- If `origin/main:$DEST` is already observed, the transition is complete; the caller exits 0 via the idempotent `p1_boundary_published_remotely` check.

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
  finishUnpublishedTransition?(): Promise<DurableBoundaryObservation>;
  assertPublished(boundary: DurableBoundaryObservation): Promise<void>;
  assertCleanSourceState(): Promise<void>;
  assertNoConcurrentTransitionsOnSameKey?(other: P1ConsumerFixture): Promise<void>;
};
```

This interface is the explicit cross-consumer contract. Any future P1 consumer implements the fixture; the harness validates the primitive without knowing consumer-specific path names, command names, stage labels, or storage substrate.

The contract distinguishes two distinct recovery paths (r3 codex F1 — separating these eliminates the rollback-vs-finish contract conflict):

- **`recover()` is rollback-only.** It returns the consumer to a clean source state OR is a no-op if no rollback is needed. It does NOT finish unpublished work, retry network operations, or advance the transition. Pre-commit dirty state and idempotent no-op are its only two outcomes.
- **`finishUnpublishedTransition()` is the optional finish path.** A consumer whose durable boundary is observable separately from the local commit point (e.g., `observerScope: "remote"` requiring a push) implements this method to handle the "committed locally but boundary not observed yet" state. Returns the published `DurableBoundaryObservation`. Consumers whose local-commit IS the boundary (e.g., `observerScope: "local"`) omit this method entirely.

The generic harness MUST assert these P1 properties for any fixture:

1. Before `publishThroughDurableBoundary()`, every named crash point is either still source-visible with no completed target state, OR `recover()` can deterministically return to a clean source state, OR (if the fixture exposes `finishUnpublishedTransition()`) the transition can be deterministically finished to the published state. These three outcomes — clean-source-rollback, idempotent-noop, deterministic-finish — are the complete set of programmatic-convergence options for a partial transition.
2. `targetMayBeVisible: true` is permitted on a pre-publish step. The harness MUST NOT assume target visibility is always false before publish. Instead, if the target is visible before the declared durable boundary, the fixture must prove the state is either not complete or is recoverable from on-disk state alone (via `recover()` rollback OR `finishUnpublishedTransition()` finish). This is what lets the same contract fit the future merger consumer, where `backlog/complete/<id>.md` can exist locally before C11 push.
3. `recover()` and `finishUnpublishedTransition()` do NOT prompt, branch on prose instructions, or require an operator decision. They run from fixture-provided on-disk state only.
4. After `publishThroughDurableBoundary()`, the fixture reports its durable boundary. The harness asserts `published === true`, validates the declared boundary shape, and calls `assertPublished()` to prove every required surface moved together. The harness does not dictate whether the boundary is one commit, a rename plus commit, a multi-commit sequence, a pushed ref, or a non-git transaction.
5. Re-running `recover()` after a published transition is a no-op. Re-running `finishUnpublishedTransition()` after the boundary is published is also a no-op.
6. The harness does not know this consumer's path names. Paths, expected file status entries, durability tokens, and recovery commands come from the fixture.
7. Concurrency assertions are key-scoped, not global. A fixture may expose `assertNoConcurrentTransitionsOnSameKey()` for same-item protection, but the harness MUST NOT fail merely because two transitions on different `transitionKey` values run at the same time. It must assert that different-key transitions do not observe each other's intermediate touched surfaces.

The test file MUST include at least one small generic harness-only fixture where `targetMayBeVisible` is false before publish and one harness-only fixture where `targetMayBeVisible` is true before publish. The visible-before-publish fixture MUST also exercise `finishUnpublishedTransition()` to prove the contract supports the finish path. These fixtures are not workflow implementations; they exist only to prove the contract is substrate-, visibility-, and finish-path-neutral. AC3 remains the only real consumer specialization in 066.

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
# CREATES OR MUTATES. The run log ($LOG) is intentionally NOT in this set: it
# is pre-existing agent-authored content written during E1 (before this stage
# move), and the recovery procedure must NOT touch it — see r2 codex F2.
# The transition only `git add`s $LOG inside the publish block (Step 3).
P1_ALLOWED_RECOVERY_PREFIXES=("backlog/" "backlog/task-state/")
P1_TOUCHED_SURFACES=("$ITEM_FILE" "$DEST" "$POINTER")

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

# Returns 0 if `origin/main:$DEST` exists (boundary observed remotely).
# This is the *real* durable boundary for this consumer — a local commit
# alone is NOT sufficient (r2 codex F1 + codex-ops F5 convergent HIGH). The
# next-process observability gate is the pushed ref on origin/main.
p1_boundary_published_remotely() {
  git fetch --quiet origin main 2>/dev/null || return 1
  git cat-file -e "origin/main:$DEST" 2>/dev/null
}

# Detect the partial state where the local commit exists but the push
# failed. The caller-side finish-path block (NOT recover_p1_stage_move,
# which is rollback-only per r3 codex F1) retries the push via the
# push-with-retry pattern. The local commit is not rolled back.
p1_local_commit_unpushed() {
  git cat-file -e "HEAD:$DEST" 2>/dev/null && ! p1_boundary_published_remotely
}

recover_p1_stage_move() {
  local surfaces=("$@")
  local path

  p1_assert_allowed_recovery_surfaces "${surfaces[@]}" || return $?

  # recover_p1_stage_move is STRICTLY rollback-only (r3 codex F1). It does
  # not finish unpushed commits, does not retry pushes, does not advance the
  # transition. The contract is: detect pre-commit partial state, roll back
  # this consumer's touched surfaces to the source state, verify clean. The
  # caller handles "finish unpushed commit" as a separate explicit step
  # below (`p1_local_commit_unpushed` branch) so AC1's recover() contract
  # stays semantically narrow.

  # Idempotency: if the boundary is already observed remotely, the transition
  # is complete and no rollback work exists.
  if p1_boundary_published_remotely; then
    return 0
  fi

  # If a local commit exists but the boundary isn't published remotely, the
  # caller handles the finish path. Recovery is NOT the right place for that —
  # rolling back a committed transition would discard work, and finishing it
  # would conflict with AC1's rollback-only recover() contract.
  if p1_local_commit_unpushed; then
    return 0
  fi

  STATUS="$(git status --porcelain -- "${surfaces[@]}")"
  [ -z "$STATUS" ] && return 0

  # Per-surface dispatch (r2 codex-ops F4): `git restore` aborts on pathspecs
  # not in HEAD. Filter into "tracked-in-HEAD" (restore) vs "transition-created
  # untracked" (unstage + rm). No hidden failure suppression in either branch
  # (r3 codex F2 — the earlier `>/dev/null 2>&1 || true` on `git rm --cached`
  # was failure-hiding; removed). `--ignore-unmatch` makes "not staged" a
  # benign return 0 at the git level; a real `git rm` failure (corrupt index,
  # I/O error, etc.) returns non-zero and is surfaced as exit code 4.
  for path in "${surfaces[@]}"; do
    if git cat-file -e "HEAD:$path" 2>/dev/null; then
      git restore --staged --worktree -- "$path" || return 4
    else
      git rm --cached --ignore-unmatch -- "$path" || return 4
      rm -f -- "$path" || return 4
    fi
  done

  # Verify clean. Return 5 (distinct code) if any touched surface is still
  # dirty post-recovery — this is a hard failure, NOT human triage. The
  # caller's `|| exit $?` guard turns this into a non-zero process exit
  # without proceeding to pull/rebase.
  git diff --quiet -- "${surfaces[@]}" || return 5
  git diff --cached --quiet -- "${surfaces[@]}" || return 5

  # Rollback ordering: this function runs BEFORE pull/rebase. A pull/rebase
  # against a dirty index or dirty touched surface can abort or replay on top
  # of a partial transition, turning a deterministic rollback into human
  # triage. The safe order is: classify local partial state -> roll back only
  # this consumer's touched surfaces -> verify clean -> caller handles finish-
  # path if applicable -> pull/rebase -> replay the transition.
}

# Caller MUST guard the recovery return code (r2 codex F3) — recovery
# failures must block pull/publish. Without `|| exit $?`, the transcript can
# proceed to pull/rebase on top of a partial-but-not-recovered state.
recover_p1_stage_move "${P1_TOUCHED_SURFACES[@]}" || exit $?

# Idempotent done: boundary already observed remotely.
if p1_boundary_published_remotely; then
  exit 0
fi

# Caller-side finish path (relocated from recover()'s former State 2 per r3
# codex F1). When the local commit exists but origin doesn't observe $DEST,
# the transition is committed but not published. Retry the push via the
# existing helper; verify the boundary is then observed remotely.
if p1_local_commit_unpushed; then
  tools/review-queue/push-with-retry.sh "review: $ITEM_ID" || exit 3
  p1_boundary_published_remotely || { echo "ERROR: push reported success but origin/main:$DEST not visible" >&2; exit 6; }
  exit 0
fi

# Pull with --autostash (r3 codex-ops F3 + F4). The broader process-backlog
# flow writes/appends $LOG (agent run log) before this stage move, and the
# push-with-retry helper can append a PUSH-RACE-FALLBACK entry to
# raw/internal/queue-errors.md on race-recovery paths. Both files are tracked
# and may be dirty when this transcript runs — without --autostash, the pull
# aborts with "cannot pull with rebase: You have unstaged changes" and the
# transition can't proceed. --autostash stashes any tracked dirty content
# before the rebase and restores it after, regardless of whether the file is
# in P1_TOUCHED_SURFACES. The stash/restore is generic git behavior; this
# consumer doesn't need to enumerate every tracked-dirty file the surrounding
# flow may have touched.
git -c rebase.autoStash=true pull --rebase origin main || exit $?

# Idempotency after pull: a completed prior run is already covered by the
# p1_boundary_published_remotely check above. We only reach here if there's
# real publish work to do.

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
# After git commit, push-with-retry.sh is the boundary publisher — its
# success is what makes origin/main:$DEST observable, which IS the durable
# boundary for this consumer (r2 codex F1 + codex-ops F5).
git mv "$ITEM_FILE" "$DEST"
git add "$DEST"
[ -f "$POINTER" ] && git add "$POINTER"
git add "$LOG"
git commit -m "review: $ITEM_ID"
tools/review-queue/push-with-retry.sh "review: $ITEM_ID"

# Final boundary verification: the push-with-retry helper is the publisher,
# but the boundary CONTRACT requires us to confirm the remote observed it.
# If this check fails after push-with-retry returned 0, we have a serious
# integrity problem (network split or remote rejected the push silently) —
# exit non-zero so the next process can re-run the caller-side finish-path block.
p1_boundary_published_remotely || { echo "ERROR: push reported success but origin/main:$DEST not visible" >&2; exit 6; }
```

The recovery guard's surface list is parameterized by design. For this consumer, the touched file surfaces are the source item path, destination item path, and optional builder pointer — the run log is **explicitly excluded** because it is pre-existing agent-authored content that the transition only `git add`s (r2 codex F2). For the future merger consumer, a separate `recover_p1_merge_publish()` should use the same shape with that consumer's touched surfaces (pending-review item, complete item, sidecar, branch/worktree resources) and that consumer's own boundary definition. 066 does not implement that merger function.

**The durable boundary for this consumer is `origin/main:$DEST` existing**, not the local commit. A local commit is a necessary intermediate state but not the boundary observers gate on. The `p1_boundary_published_remotely` helper IS the observability gate; `push-with-retry.sh` is the publisher. The corresponding `DurableBoundaryObservation` declared by this consumer's fixture is:

```ts
{
  kind: "pushed-ref",
  count: 1,
  token: "origin/main:" + DEST,
  published: <result of p1_boundary_published_remotely>,
  observerScope: "remote",
}
```

Load-bearing corrections preserved from r1 review:

1. `git add "$DEST"` after `git mv` is required. It stages the edited destination contents; `git mv` alone can stage the rename at the old blob.
2. `--spec-path "$DEST"` is required even though the patcher runs before `git mv`, because the patcher records that argument verbatim into `canonical_anchors.spec`.
3. Tests that inspect the commit shape MUST use `git diff-tree -r -M --no-commit-id --name-status HEAD` or an equivalent recursive, rename-detecting command.

Load-bearing corrections from r2 review:

4. The durable boundary is `origin/main:$DEST`, NOT the local commit (r2 codex F1 + codex-ops F5 convergent HIGH). The **caller-side finish-path block** (not `recover_p1_stage_move`, per r3 codex F1 which split rollback from finish) retries `push-with-retry.sh` when `p1_local_commit_unpushed` returns true. AC3 test 9 crashes between `git commit` and `push-with-retry.sh` and asserts the rerun completes via the caller's finish path (not via recovery rolling the commit back).
5. `$LOG` is NOT in `P1_TOUCHED_SURFACES` (r2 codex F2). The recovery procedure does not touch agent-authored content; it only rolls back transition-created mutations on `$ITEM_FILE`, `$DEST`, `$POINTER`.
6. `recover_p1_stage_move`'s return code IS gated (r2 codex F3). The caller does `recover_p1_stage_move "${P1_TOUCHED_SURFACES[@]}" || exit $?` — a recovery failure is a hard process exit, NOT a fall-through to pull/rebase. **Documented return codes from the recovery function:** `return 2` (prefix-guard violation — `p1_assert_allowed_recovery_surfaces` rejected an unsafe path or one outside the documented allowed prefixes); `return 4` (per-surface dispatch failure — `git restore`, `git rm --cached`, or `rm -f` returned non-zero for a real error); `return 5` (post-recovery dirty-check failure — touched surfaces are still dirty after rollback). Codes 3 and 6 are independent caller-side `exit` values, NOT recovery returns: `exit 3` (caller's `push-with-retry.sh` failed in the finish-path block) and `exit 6` (caller's post-push `p1_boundary_published_remotely` check failed — push reported success but the remote doesn't observe the boundary).
7. `git restore` is per-surface and split by HEAD existence (r2 codex-ops F4). For paths in HEAD, use `git restore --staged --worktree`; for transition-created untracked paths, use `git rm --cached --ignore-unmatch` followed by `rm -f`. No `2>/dev/null || true` hiding failures; each branch returns a distinct non-zero code if it can't complete.

Load-bearing corrections from r3 review:

8. `recover_p1_stage_move` is **strictly rollback-only** (r3 codex F1). The earlier State 2 "retry-push" branch is relocated to a **separate caller-side block** that runs after recovery returns 0. AC1's contract was split into rollback-only `recover()` + optional `finishUnpublishedTransition()` so consumers can declare the finish path explicitly without bleeding it into rollback semantics. AC3 test 9 was updated to assert the rerun completes via the caller's finish path (not via recovery).
9. `git rm --cached --ignore-unmatch` no longer hides failures (r3 codex F2). The earlier `>/dev/null 2>&1 || true` suffix is removed; `--ignore-unmatch` already returns 0 for the "not staged" benign case at the git level, so the suppression was hiding real `git rm` errors (corrupt index, I/O). The line now reads `git rm --cached --ignore-unmatch -- "$path" || return 4` plus `rm -f -- "$path" || return 4`. AC3 test 12 pins this.
10. The post-recovery `git pull` is now `git -c rebase.autoStash=true pull --rebase origin main || exit $?` (r3 codex-ops F3 + F4). The broader process-backlog flow can leave tracked-dirty files outside `P1_TOUCHED_SURFACES` (agent-authored `$LOG` from E1; race-recovery entries appended to `raw/internal/queue-errors.md` by `push-with-retry.sh`). Without --autostash, the pull aborts on either; with it, both are stashed before rebase and restored after. AC3 tests 13 + 14 pin this for $LOG and queue-errors.md respectively.

The generated command adapter MUST be refreshed with `tools/sync-skills.sh`, and `tools/sync-skills.sh --check` MUST exit 0 after the edit.

### AC3 - The reusable P1 harness has a current-consumer specialization

In `tests/skills/atomic-state-transition-harness.test.ts`, instantiate the AC1 harness for the process-backlog stage move.

The specialization MUST parameterize:

- Source path: `backlog/claimed/<id>.md`.
- Destination path: `backlog/pending_review/<id>.md`.
- Transition-touched paths (the `P1_TOUCHED_SURFACES` set): source item path, destination item path, optional builder pointer at `backlog/task-state/<id>/builder.md`. **The run log at `raw/internal/agent-runs/<date>-<id>.md` is NOT a touched surface for recovery purposes** — it is pre-existing agent-authored content that the publish block only `git add`s. (r2 codex F2)
- Transition key: the work-item id.
- Expected durable boundary: `kind: "pushed-ref"`, `observerScope: "remote"`, `token: "origin/main:" + DEST`. (r2 codex F1 + codex-ops F5)
- Expected committed file status: one rename for the item file, one modify for the task-state pointer when present, and one add for the run log.
- Recovery recipe: rollback-only `recover_p1_stage_move` (idempotent-no-op-if-boundary-published / no-op-if-local-commit-unpushed-deferred-to-caller / pre-commit-dirty per-surface rollback), with caller-side `|| exit $?` return-code gating AND a SEPARATE caller-side `finishUnpublishedTransition` block that invokes `push-with-retry.sh` + boundary verification when `p1_local_commit_unpushed` returns true.
- Finish path: implements the optional `finishUnpublishedTransition()` fixture method via the caller-side block — the consumer's local-commit-but-not-pushed state is finished, not rolled back.
- Post-recovery pull: `git -c rebase.autoStash=true pull --rebase origin main || exit $?`. The `--autostash` flag handles tracked-dirty paths outside `P1_TOUCHED_SURFACES` (e.g., agent-authored `$LOG`, race-recovery entries appended to `raw/internal/queue-errors.md` by `push-with-retry.sh`) — stash before rebase, restore after.

**Test infrastructure note:** AC3 tests require a working `origin` remote so the boundary (`origin/main:$DEST`) is observable. Tests MUST use a **local bare repo as `origin`** — `git init --bare $TMPDIR/echo-test-origin-<uuid>.git` + `git remote add origin <bare>` + push to it. No real-network test, no GitHub. The local bare repo gives full push/fetch semantics without any external dependency. Each test gets its own bare repo, cleaned in `afterEach`.

Required current-consumer tests:

1. **Pre-publish edits do not expose the target stage.** After handoff metadata edit and task-state patcher execution, the item is still under the source path, the target path does not exist, and the index has no staged changes for the transition surfaces.
2. **The publish block creates one durable boundary containing all required surfaces.** Assert with `git diff-tree -r -M --no-commit-id --name-status HEAD` against the LOCAL commit's tree (rename/modify/add entries). Then assert the boundary is also OBSERVED REMOTELY by running `git fetch origin main` and checking `origin/main:$DEST` exists.
3. **The committed destination contents include the edited handoff metadata.** Read via `git show HEAD:backlog/pending_review/<id>.md` and assert `head_sha` is the edited value, proving `git add "$DEST"` is present. Then run `git show origin/main:backlog/pending_review/<id>.md` and assert the same — proving the boundary is what observers see, not just the local index.
4. **Crash after source metadata edit but before `git mv`** is recovered by the recipe without an operator decision; after recovery, source state is clean and replay can publish.
5. **Crash after `git mv` but before `git add "$DEST"`** is recovered by the same recipe without an operator decision; after recovery, source state is clean and replay can publish.
6. **Recovery refuses to run if the touched-surface list contains an absolute path, a `..` traversal, or a path outside the documented allowed prefixes.** This pins the guard against a future bug that would otherwise run `git restore` or `rm` against unrelated work.
7. **Running recovery after the published commit is a no-op.** The `p1_boundary_published_remotely` early-return fires; nothing else runs.
8. **(NEW — r2 codex-ops F4) Crash with `$DEST` absent from HEAD and `$ITEM_FILE` dirty.** Simulate a partial pre-`git mv` state: $ITEM_FILE has uncommitted frontmatter edits; $DEST and $POINTER do NOT exist on disk or in HEAD. Run recovery. Assert: the in-HEAD path ($ITEM_FILE) gets `git restore`d cleanly; the not-in-HEAD paths are no-ops (no `git restore` failure surfaces); recovery returns 0. Without the per-surface dispatch fix, the old `git restore --staged --worktree -- "${surfaces[@]}"` aborted on the not-in-HEAD pathspec, leaving $ITEM_FILE dirty.
9. **(r2 codex F1 + codex-ops F5; UPDATED r3 codex F1) Crash after `git commit` but before `push-with-retry.sh` succeeds — finished by the CALLER's finish path, not by recover().** Simulate by committing locally, then making the bare-repo push fail (temporarily remove the bare repo's write perms, OR pre-push a divergent commit). Re-invoke the canonical transcript. Assert: (a) `recover_p1_stage_move` returns 0 (rollback-only contract; the unpushed-commit state is recognized by the early return and deferred to the caller, NOT rolled back); (b) the caller's `if p1_local_commit_unpushed; then push-with-retry.sh ...` block fires; (c) after the bare repo is restored, the push succeeds and `p1_boundary_published_remotely` returns true; (d) the local commit is NOT discarded. This pins the rollback/finish split that r3 codex F1 named.
10. **(r2 codex F2) `$LOG` is preserved through recovery.** Setup: $LOG exists on disk as a tracked file with agent-authored content. Crash mid-transition (after frontmatter edit, before `git mv`). Run recovery. Assert: `$LOG` content is bit-identical to before recovery (recovery did NOT call `git restore` or `rm` against it because $LOG is not in P1_TOUCHED_SURFACES).
11. **(r2 codex F3) Recovery's non-zero return blocks publish.** Setup: corrupt the recovery preconditions (e.g., pass an unsafe surface that fails the prefix-guard → recovery returns 2; OR make `git rm --cached` fail on a real-error path → recovery returns 4 — NOT just an `--ignore-unmatch` no-op which returns 0 by design; OR leave a touched surface dirty after the per-surface dispatch → recovery returns 5). Assert: recovery returns the appropriate non-zero code (2/4/5 per the documented return-code map in Load-bearing correction #6); the caller's `|| exit $?` triggers process exit BEFORE `git pull --rebase` runs. The test inspects the process exit code and asserts no pull occurred. The test MUST exercise all three failure codes across at least three sub-cases so a future refactor that collapses two of them silently is caught.
12. **(NEW — r3 codex F2) Untracked-cleanup branch surfaces real errors instead of hiding them.** Setup: the recovery encounters a transition-created untracked path AND `git rm --cached --ignore-unmatch` returns 0 (the "not staged" benign case). Assert: recovery proceeds without error. Then setup a second case where `rm -f` fails for a real reason (path is a directory, or has permission issues). Assert: recovery returns 4 (the per-surface dispatch failure code), and the caller's `|| exit $?` triggers process exit. This pins that the r2-introduced `>/dev/null 2>&1 || true` failure-hiding (called out by r3 codex F2) cannot be re-introduced.
13. **(NEW — r3 codex-ops F3) Tracked-dirty `$LOG` does not block the post-recovery pull.** Setup: $LOG exists on disk as a tracked file with content different from HEAD (simulating E1 having just written or appended it). Run the full caller transcript (recovery + boundary check + pull). Assert: the pull command executes `git -c rebase.autoStash=true pull --rebase origin main` and succeeds; after the pull, $LOG is restored bit-identical to the pre-pull state (autostash + restore). Without --autostash, the pull aborts with "cannot pull with rebase: You have unstaged changes."
14. **(NEW — r3 codex-ops F4) Tracked-dirty `raw/internal/queue-errors.md` does not block the post-recovery pull.** Setup: simulate the case where a prior `push-with-retry.sh` race-recovery left a PUSH-RACE-FALLBACK entry as an uncommitted modification to `raw/internal/queue-errors.md`. Run the full caller transcript. Assert: the pull succeeds via --autostash; the queue-errors.md modification is preserved through the pull. This is the same fix as test 13 but proves the fix generalizes to ANY tracked-dirty file outside P1_TOUCHED_SURFACES, not just $LOG.

The tests use throwaway local repos PLUS a local bare repo as origin (per the test infrastructure note above). They do not test real-network or concurrency scheduling beyond the AC1 fixture-level key scoping contract.

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
- The harness interface supports target-visible-before-boundary consumers and durable boundaries beyond a single local commit (including `pushed-ref` with `observerScope: "remote"`) without knowing consumer-specific paths.
- The process-backlog stage move is implemented as one current-consumer specialization of that harness, declaring its boundary as `kind: "pushed-ref"`, `observerScope: "remote"`, `token: "origin/main:" + DEST`.
- The current consumer's publish block runs `git mv "$ITEM_FILE" "$DEST"` + explicit `git add "$DEST"` + remaining path adds + `git commit` + `tools/review-queue/push-with-retry.sh` + `p1_boundary_published_remotely` final verification.
- The task-state patcher is called with `--spec-path "$DEST"` before the rename.
- Recovery from pre-commit dirty state AND post-commit-pre-push state is deterministic from on-disk state, prefix-guarded to the consumer's touched surfaces, run before pull/rebase, has per-surface dispatch (HEAD-existing vs untracked), gates its return code via `|| exit $?`, and requires no human decision.
- The run log (`$LOG`) is NOT in the recovery surface set; agent-authored content is never touched by the recovery procedure.
- `tools/sync-skills.sh --check`, the P1 test file (including the new remote-backed tests 8/9/10/11), and `git diff --check` pass locally.

## After Completion (Strategist Notes)

- After the item lands in `backlog/complete/`, promote P1 into `wiki/principles/atomic-state-transitions.md` or the nearest existing operating-model principles page if the strategist decides the primitive is now durable enough for wiki. The wiki text should document the invariant, not the process-backlog mechanism.
- Update `backlog/_followups.md` under P1 to annotate the current consumer as satisfied by 066 once shipped.
- File the `merge-and-cleanup` P1 consumer as a separate follow-on spec if it is not already filed. That spec should cite 066, instantiate the harness, and address C7/C8/C9/C11 ordering without widening 066.
- If the recovery guard reveals a broader boot-time recovery need, file a separate spec for that consumer rather than folding it into this item.
