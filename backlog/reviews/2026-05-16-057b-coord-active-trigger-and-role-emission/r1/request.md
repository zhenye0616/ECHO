---
item_id: 2026-05-16-057b-coord-active-trigger-and-role-emission
round: 1
spec_commit_sha: be6dcce8a3d1d2390a447cc64c0e3d5ecfecf724
artifact_path: backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md
class: structural-reform
requested_at: '2026-05-16T06:46:15Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "057b is the active-trigger + role-emission half of the decomposed 057\
  \ spec (057a converged at r8 = claim-ready, terminal commit be6dcce). 057b builds\
  \ ON 057a substrate \u2014 coord_emit/coord_status/registry/deadlines tracker are\
  \ assumed present and unchanged. Verify: (1) AC0 `coord_invoke(role, request_path,\
  \ correlation_id)` \u2014 all three params required; correlation_id matches `^[a-f0-9-]{36}$`;\
  \ request_path matches `^backlog/reviews/[a-z0-9-]+/r[0-9]+/request\\.md$` (no traversal/metachars);\
  \ argv-spawn via subprocess.spawn(argv, {shell:false}) NOT bash -c; reject without\
  \ spawning OR appending coord:reviewer_invoked on input validation failure; (2)\
  \ AC0 causality-safe emission \u2014 daemon appends coord:reviewer_invoked SYNCHRONOUSLY\
  \ BEFORE returning to caller, BEFORE child spawn possibility; concrete ordering\
  \ in code is validate\u2192append\u2192open-deadline\u2192spawn(fire-and-forget)\u2192\
  return; ANY child tick_start cannot precede reviewer_invoked in replay order; (3)\
  \ AC0 pinned-request reviewer mode \u2014 env-var handoff ECHO_COORD_REQUEST_PATH\
  \ + ECHO_COORD_CORRELATION_ID (CLI-flag handoff not implementable since codex exec\
  \ doesn't expose those flags); reviewer skill validates the env-pinned request before\
  \ processing; emits coord:tick_failed_to_bind on validation failure with structured\
  \ reason enum; scan-pick remains launchd-fallback; (4) AC0 best-effort emission\
  \ contract \u2014 bounded HTTP timeouts (2s connect, 5s total); callers tolerate\
  \ non-zero rc; queue durability preserved when daemon down; (5) AC7 two-phase wrapper\
  \ emission \u2014 Phase 1 scheduler_health(tick_run_id, no correlation_id) at log-open;\
  \ Phase 2 tick_start/tick_end (correlation_id) wrapping the review; scheduler_health_done\
  \ before process exit; (6) AC7 tick_end covers EVERY clean exit (outcome enum: completed/stale_combined/duplicate_response/upstream_duplicate);\
  \ only crash before tick_end produces missing-terminal \u2192 correctly fires deadline_missed;\
  \ no-candidate exit emits scheduler_health_done WITHOUT tick_start/tick_end; (7)\
  \ AC7 internal-emitter daemon attribution \u2014 daemon writes reviewer_invoked\
  \ + deadline_missed atoms with emitter_role=daemon distinct from subject_role; AC5\
  \ X-Echo-Role spoof rule applies ONLY to wrapper coord_emit, not internal-emitter;\
  \ new module src/coord/internal-emitter.ts codifies; (8) AC7 skill-side post-push\
  \ hooks \u2014 coord_invoke called ONLY from skills/review-queue-watch.md Step 3(b)\
  \ + skills/review-pending.md + skills/merge-and-cleanup.md + skills/process-backlog.md;\
  \ request.py is NEVER a coord_invoke caller (tests/coord/no-pre-push-spawn.test.ts\
  \ asserts); (9) AC7 correlation_id field in request.py + request.schema.json; request.py\
  \ generates uuid4 at write time NO MCP call; backward compat: pre-057 requests without\
  \ correlation_id treated as no-coord-tracked-round; (10) AC8 fixtures. ops lens:\
  \ spawn safety under malicious request_path/correlation_id input; daemon shutdown\
  \ during in-flight coord_invoke; bounded HTTP timeout actually bounded under daemon\
  \ unresponsiveness; correlation_id propagation through env vars when codex exec\
  \ spawns inherit subprocess; backward-compat when watcher resumes on a mixed-state\
  \ ledger (some atoms have correlation_id, others don't)."
---

# What to review

Read `backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md` at commit `be6dcce8a3d1d2390a447cc64c0e3d5ecfecf724`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
