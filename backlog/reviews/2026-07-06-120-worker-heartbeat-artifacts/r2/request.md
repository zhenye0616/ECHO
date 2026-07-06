---
item_id: 2026-07-06-120-worker-heartbeat-artifacts
round: 2
spec_commit_sha: c86836a28c401b134f2345007bdee1ef0c0be82a
artifact_path: backlog/proposed/2026-07-06-120-worker-heartbeat-artifacts.md
class: narrow
requested_at: '2026-07-06T01:04:00Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: ce705df0-f9ce-408a-8bcc-4c5a08aef3d7
focus_hints: 'Verify: total result->status mapping in AC2 (skipped/brain_unavailable->degraded,
  error->degraded, no tick failure reading ok); AC4 tick-local retryable_failures
  counter + exact degraded predicate (no terminal progress miscounted); AC1 mkdirSync-before-atomicWrite
  + AC5 fresh-home test; named tests/enrich/worker-heartbeat.test.ts target.'
---

# What to review

Read `backlog/proposed/2026-07-06-120-worker-heartbeat-artifacts.md` at commit `c86836a28c401b134f2345007bdee1ef0c0be82a`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
