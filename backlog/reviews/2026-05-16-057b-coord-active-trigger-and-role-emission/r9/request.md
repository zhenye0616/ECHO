---
item_id: 2026-05-16-057b-coord-active-trigger-and-role-emission
round: 9
spec_commit_sha: 401867bb82a56dac51d9307d03a2abef5914230f
artifact_path: backlog/pending_review/2026-05-16-057b-coord-active-trigger-and-role-emission.md
class: narrow
requested_at: '2026-05-16T18:46:28Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "POST-BUILD review at builder branch head_sha=38246c1972957ef3ba5f3b90599f02c48d15b8d4\
  \ (agent/057b-coord-active-trigger-and-role-emission). Spec body unchanged since\
  \ r8 convergence; the implementation is the artifact to review. Focus: (1) AC0 5-step\
  \ role-validation gate ordering in src/coord/paths.ts \u2014 does shape regex reject\
  \ BEFORE loadCoordRoles(), does roster reject BEFORE path math? Falsifiable in tests/coord/paths-resolution.test.ts;\
  \ (2) Causality contract \u2014 src/coord/internal-emitter.ts:emitReviewerInvoked\
  \ sync-appends + opens deadline BEFORE coord_invoke returns to caller, before spawn();\
  \ verify in src/mcp/tools/coord-invoke.ts + tests/coord/causality-reviewer-invoked-before-tick-start.test.ts;\
  \ (3) child.on('error') BEFORE child.unref() in coord-invoke.ts \u2014 spawn-error\
  \ noncrash invariant; (4) coord-emit.sh portability \u2014 Accept: application/json,\
  \ text/event-stream (else StreamableHTTPServerTransport 406-rejects); BSD date seconds-precision\
  \ (no %3N); REVIEWER_NAME \u2192 X-Echo-Role transit; (5) AC7c pinned-mode bind_failed\
  \ outcome enum \u2014 tick_end with reason=request_not_found|correlation_id_mismatch|role_not_in_roster|already_combined|already_responded;\
  \ (6) AC7d post-push hooks in review-queue-watch + review-pending \u2014 coord_invoke\
  \ per headless reviewer; review-pending is scaffolding-only (no current call site);\
  \ (7) AC8 scope \u2014 10 of 20 spec-listed test files shipped (load-bearing covered);\
  \ is the missing 10 (active-trigger-roundtrip, pre-spawn-deadline-fires, scheduler-health-two-phase,\
  \ correlation-id-shared, pinned-request-mode, tick-end-covers-clean-exits, pinned-request-bind-failed-closes-deadline,\
  \ spawn-error-noncrash, scheduler-health-bootstrap-scope, silent-fail-detection)\
  \ merge-blocking or follow-on-OK? Out of Scope: 057a substrate is consumed as-is\
  \ (no deadlines.ts changes); deadline_missed atom emitter_role attribution unchanged\
  \ in 057a; cursor IDE-mode emission deferred."
---

# What to review

Read `backlog/pending_review/2026-05-16-057b-coord-active-trigger-and-role-emission.md` at commit `401867bb82a56dac51d9307d03a2abef5914230f`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
