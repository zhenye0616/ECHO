---
item_id: 2026-07-06-122-live-loop-dashboard
round: 2
spec_commit_sha: cb7bb2767b6b270ef472f053aa1c9a40f201360e
artifact_path: backlog/proposed/2026-07-06-122-live-loop-dashboard.md
class: narrow
requested_at: '2026-07-07T01:48:23Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: c737489d-8778-426b-a724-65a3c3cf25b0
focus_hints: "Verify: AC1 port precedence (--port \u2192 ECHO_LOOP_DASHBOARD_PORT\
  \ \u2192 default 38480) + invalid-port fatal non-zero exit; AC2 top-level /api/status\
  \ schema is stable + falsifiable (generated_at, cache, serving, stations status\
  \ enum, heartbeats error-entry); AC2 in-process buildDoctorReport/buildLoopReport\
  \ is primary, child fallback same-ECHO_HOME + timeout-bounded + fail-soft (missing/stale\
  \ dist, nonzero exit, hung child, parse failure \u2192 degraded not 500/stall);\
  \ AC2 single-flight recomputation under overlapping polls (no duplicate computation/child\
  \ pileup); AC3 fail-soft doctor case renders as unmissable degraded not blank; AC4\
  \ no-write test exercises the shipped doctor path (child rooted at scratch ECHO_HOME\
  \ or in-process reuse)."
---

# What to review

Read `backlog/proposed/2026-07-06-122-live-loop-dashboard.md` at commit `cb7bb2767b6b270ef472f053aa1c9a40f201360e`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
