---
item_id: 2026-07-06-118-drift-join-nomination
round: 2
spec_commit_sha: 3fc0f162662c9911452517496a9de123f83ea066
artifact_path: backlog/proposed/2026-07-06-118-drift-join-nomination.md
class: narrow
requested_at: '2026-07-06T00:59:58Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 04d50fe8-213b-4beb-9568-18ef829d9d27
focus_hints: 'Verify: pinned threshold=0.2 / cap=5 + rationale and boundary tests
  (0.25 nominates, exactly-0.2 inclusive, just-below excluded, >5 tied truncates to
  a deterministic five); total-order tie-breaker (score desc -> normalized subject
  asc -> dedupe_key asc) on BOTH AC3 nomination and AC4 near-miss with a tie fixture;
  decisions_scored metric + once-per-tick token-set precompute (pool deliberately
  unbounded matching 114 full-scan).'
---

# What to review

Read `backlog/proposed/2026-07-06-118-drift-join-nomination.md` at commit `3fc0f162662c9911452517496a9de123f83ea066`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
