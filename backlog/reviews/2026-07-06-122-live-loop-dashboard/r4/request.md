---
item_id: 2026-07-06-122-live-loop-dashboard
round: 4
spec_commit_sha: 565ab8c004c55e54fd3f14727fac10b9db9934fd
artifact_path: backlog/proposed/2026-07-06-122-live-loop-dashboard.md
class: narrow
requested_at: '2026-07-07T02:03:57Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: bfa6d8e5-8f6c-4dd1-88cf-8eafcb997254
focus_hints: "Verify: AC5 scopes the doctor fail-soft tests to whichever doctor path\
  \ the builder ships \u2014 an in-process-only build tests the in-process degraded\
  \ path (injected report that throws/times out); the child-specific cases (missing/stale\
  \ dist, nonzero exit, hung child, parse failure) are required ONLY when the child\
  \ fallback is wired; this is now internally consistent with AC2/AC4's in-process-primary\
  \ / optional-child contract. No other open findings (r3 codex-ops was proceed)."
---

# What to review

Read `backlog/proposed/2026-07-06-122-live-loop-dashboard.md` at commit `565ab8c004c55e54fd3f14727fac10b9db9934fd`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
