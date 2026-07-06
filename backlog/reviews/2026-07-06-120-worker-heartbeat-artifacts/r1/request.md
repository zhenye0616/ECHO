---
item_id: 2026-07-06-120-worker-heartbeat-artifacts
round: 1
spec_commit_sha: 4f346177632468c1016598330d82158b7155bfe6
artifact_path: backlog/proposed/2026-07-06-120-worker-heartbeat-artifacts.md
class: narrow
requested_at: '2026-07-06T00:36:17Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 0e32b6c0-2668-416e-9146-7509e5a93086
focus_hints: "Judge the exported heartbeat contract (path + WorkerHeartbeat type +\
  \ name constants) as the seam 117's doctor consumes without coupling \u2014 right\
  \ shape, right boundary? Is representing 'degraded' as an additive discriminator\
  \ on DriftSweepResult's ok-branch (not a new status union member) the right non-breaking\
  \ choice, and is the degraded condition (brain invoked + frozen watermark + all-retryable)\
  \ well-defined? Is best-effort writeWorkerHeartbeat (swallow+log all write failures,\
  \ atomic overwrite, never read) sufficient to guarantee heartbeats never harm the\
  \ worker they observe? Do the boot-disable heartbeat writes (status:disabled+reason)\
  \ actually make the f19dc419 silent-self-disable class observable?"
---

# What to review

Read `backlog/proposed/2026-07-06-120-worker-heartbeat-artifacts.md` at commit `4f346177632468c1016598330d82158b7155bfe6`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
