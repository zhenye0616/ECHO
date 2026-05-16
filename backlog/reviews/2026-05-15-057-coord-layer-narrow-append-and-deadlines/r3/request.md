---
item_id: 2026-05-15-057-coord-layer-narrow-append-and-deadlines
round: 3
spec_commit_sha: d9f09b267b26637ed648cfe7d6c1b248dd833dbd
artifact_path: backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md
class: structural-reform
requested_at: '2026-05-16T03:53:39Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "Verify r2 5-fix set on the clean spec sha (the previous e40394e had\
  \ merge-conflict markers from autostash; fixed in 4528f23 + 9cb0561). Specifically:\
  \ (1) request.py is REMOVED from coord_invoke caller list; only watcher post-push\
  \ hooks invoke; tests/coord/no-pre-push-spawn.test.ts asserts this; (2) AC3 close-then-open\
  \ state machine generalizes ALL event_type transitions; reconstruction handles overdue\
  \ reviewer_invoked + non-overdue closed flows; (3) daemon internal-emitter attribution:\
  \ emitter_role=daemon + subject_role=<reviewer>; source=coord:<subject_role>; coord_status()\
  \ correctly groups; (4) wrapper two-phase emission: Phase 1 scheduler_health (no\
  \ correlation_id) at log-redirect-open then Phase 2 tick_start (with correlation_id)\
  \ after candidate selection; both phases survive daemon-down (best-effort emission\
  \ contract). Decay curve: r1=9 \u2192 r2=5; r3 target convergence or substantially\
  \ fewer findings."
---

# What to review

Read `backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md` at commit `d9f09b267b26637ed648cfe7d6c1b248dd833dbd`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
