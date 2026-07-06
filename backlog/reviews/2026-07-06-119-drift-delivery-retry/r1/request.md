---
item_id: 2026-07-06-119-drift-delivery-retry
round: 1
spec_commit_sha: 4f346177632468c1016598330d82158b7155bfe6
artifact_path: backlog/proposed/2026-07-06-119-drift-delivery-retry.md
class: narrow
requested_at: '2026-07-06T00:36:17Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 539d463f-2e5d-424f-81ed-b097db8c3816
focus_hints: 'Judge the transport-failure vs ambiguous-crash split: is ''control returned
  to deliverPair''s catch = provably-not-delivered = safe to retry'' vs ''durable
  delivery-intent left by a crash = ambiguous = at-most-once'' a sound structural
  distinction? Is reusing delivery-deferred (non-terminal, blocks watermark) + a bounded
  retry_count (default 5, mirroring the seed store) correct, and does retry_count
  only incrementing on an observed failed post (not on cap-defer) keep the two defer
  reasons from cross-contaminating budgets? Is the optional retry_count with schema_version
  staying 1 genuinely backward-compatible given loadDriftSweepCheckpoint''s loose
  cast? Does the exhaustion-terminal path preserve AC1 watermark semantics?'
---

# What to review

Read `backlog/proposed/2026-07-06-119-drift-delivery-retry.md` at commit `4f346177632468c1016598330d82158b7155bfe6`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
