---
item_id: 2026-05-16-057b-coord-active-trigger-and-role-emission
round: 4
spec_commit_sha: 3d88d39c58eda9b26ea258c7f37c513bf7d72bff
artifact_path: backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md
class: structural-reform
requested_at: '2026-05-16T07:32:12Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "r3 produced 4 findings (1 convergent HIGH + 2 MED + 1 LOW). All accepted;\
  \ spec patched at 615a894. r4 verifies: (1) NEW file src/coord/paths.ts listed in\
  \ files_to_modify; lives at src/coord/ depth (same as 057a's src/coord/roles.ts);\
  \ exports REPO_ROOT (with ECHO_REPO_ROOT env override) + resolveReviewerWrapperPath(role);\
  \ coord-invoke.ts imports the helper, NOT raw import.meta.url; (2) AC0 step 2 +\
  \ request.schema.json use canonical uuid4 regex ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$\
  \ (version-4 nibble + variant byte enforced); (3) Why-this-spec L105 \u2014 motivation\
  \ acknowledges coord_invoke + correlation_id additions while preserving 'no 057a\
  \ substrate touches' boundary; (4) AC7 Phase 1 \u2014 scheduler_health_done emitted\
  \ AFTER bootstrap completes (worktree, env, prompt routing), BEFORE codex exec /\
  \ review work starts; round-tier tick_start/tick_end takes over for long reviews;\
  \ (5) AC8 \u2014 new fixtures paths-resolution.test.ts + scheduler-health-bootstrap-scope.test.ts;\
  \ (6) no regression. Trend r1\u2192r2\u2192r3: 8\u21925\u21924 findings, 6H/2M \u2192\
  \ 2H/3M \u2192 1H/2M/1L. r4 expected terminal (0 findings = claim-ready) or 0-1\
  \ LOW; \u22652 findings or HIGH/pushback = re-escalate per 049 asymptote rule."
---

# What to review

Read `backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md` at commit `3d88d39c58eda9b26ea258c7f37c513bf7d72bff`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
