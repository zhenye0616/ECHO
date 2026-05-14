---
item_id: 2026-05-13-046-context-fatigue-via-role-typed-state
round: 5
spec_commit_sha: 6be1eec280ba1b1df6680e19a6fcad50c0447de2
artifact_path: backlog/ready/2026-05-13-046-context-fatigue-via-role-typed-state.md
class: structural-reform
requested_at: '2026-05-14T04:31:07Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: 'R4 dispositioned: single mechanical patch (reorder step 6 abort sequence).
  Founder authorized auto-disposition via convergence-treatment of severity-divergent
  same-finding.


  R5 NARROW focus (last-mile):

  - AC1 step 6 durable-log abort sequence: 4-step ordering reset->append->commit+push->exit.
  Verify both observability and queue-cleanliness invariants hold under concurrent-writer
  push rejection. The intended invariant: after a CAS-violation abort, origin/main
  contains the ROUND_STATE_WRITE_CAS_ABORT_PUSH row in queue-errors.md AND does NOT
  contain the stale round-state rewrite.

  - Test fixture tests/task-state/push-round-state.test.ts: verify the tmpdir+bare-origin+two-clones
  shape is buildable (concurrency.test.ts is the closest precedent in the existing
  harness).

  - All else: stable. Quick re-read only.


  R5 target: BOTH reviewers proceed or proceed_after_patches with LOW findings only
  = convergence/claim-ready. Decay pattern 9->5->2->1->expected 0-1 matches 042/044/045
  shape.


  If a NEW HIGH appears at R5 outside AC1, escalate to founder.'
---

# What to review

Read `backlog/ready/2026-05-13-046-context-fatigue-via-role-typed-state.md` at commit `6be1eec280ba1b1df6680e19a6fcad50c0447de2`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
