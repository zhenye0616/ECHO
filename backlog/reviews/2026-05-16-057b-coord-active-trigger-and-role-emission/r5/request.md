---
item_id: 2026-05-16-057b-coord-active-trigger-and-role-emission
round: 5
spec_commit_sha: e6124c00279112d074df7c5767ac174aa13691ca
artifact_path: backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md
class: structural-reform
requested_at: '2026-05-16T07:41:59Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "r4 produced 2 findings (1 HIGH + 1 LOW). Both accepted; spec patched\
  \ at d7bb1c9. r5 verifies: (1) AC0 step 1 \u2014 resolveReviewerWrapperPath has\
  \ explicit 5-step gate: shape regex ^[a-z][a-z0-9-]*$ \u2192 roster check + headless:true\
  \ via loadCoordRoles \u2192 path.join \u2192 containment check (path.resolve stays\
  \ under ${REPO_ROOT}/tools/review-queue/ AND basename equals run-<role>-reviewer.sh)\
  \ \u2192 existence + executable bit; (2) AC0 step 2 \u2014 role listed alongside\
  \ correlation_id + request_path as validated inputs; (3) AC7 no-candidate exit bullet\
  \ \u2014 scheduler_health_done already emitted by Phase 1 (after bootstrap), do\
  \ NOT re-emit; absence of tick_start between scheduler_health and scheduler_health_done\
  \ is the launchd-fallback-no-op signal; (4) AC8 \u2014 coord-invoke-input-validation.test.ts\
  \ AND paths-resolution.test.ts cover 9 malicious-role cases (\"../\", \"/\", \"\
  foo/../bar\", \"foo;rm\", \"foo bar\", \"\", \"FOO\", \"cursor\", \"nonexistent\"\
  ); (5) no regression in AC1-AC7. Trend r1\u2192r2\u2192r3\u2192r4: 8\u21925\u2192\
  4\u21922 findings; severity 6H/2M \u2192 2H/3M \u2192 1H/2M/1L \u2192 1H/1L. r5\
  \ expected terminal (0 findings = claim-ready). \u22651 finding LOW = likely terminal\
  \ r6; \u22652 findings or HIGH/pushback = re-escalate per 049 asymptote."
---

# What to review

Read `backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md` at commit `e6124c00279112d074df7c5767ac174aa13691ca`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
