---
item_id: 2026-07-06-122-live-loop-dashboard
round: 3
spec_commit_sha: 3fc0263f741849590b335415d1066a582c3e823c
artifact_path: backlog/proposed/2026-07-06-122-live-loop-dashboard.md
class: narrow
requested_at: '2026-07-07T01:59:25Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: cda31080-8f98-445b-afd1-d3f6c7435a91
focus_hints: "Verify: AC2 cold-start single-flight \u2014 two concurrent /api/status\
  \ polls before any cached document spawn exactly ONE computation, both receive a\
  \ contract-shaped response (joined result, or degraded/unknown skeleton on timeout/failure),\
  \ never undefined/500/stall; warm-overlap case (last cached + cache.stale:true)\
  \ unchanged; AC2(b) heartbeats iterate 120's exported expected worker-name set (WorkerName\
  \ / *_WORKER constants), an absent expected file surfaces as { error } not a dropped\
  \ key; AC5 covers cold-start overlap + missing-expected-heartbeat shape."
---

# What to review

Read `backlog/proposed/2026-07-06-122-live-loop-dashboard.md` at commit `3fc0263f741849590b335415d1066a582c3e823c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
