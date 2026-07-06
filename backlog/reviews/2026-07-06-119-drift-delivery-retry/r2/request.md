---
item_id: 2026-07-06-119-drift-delivery-retry
round: 2
spec_commit_sha: b5ebcfa764d962f8503e6064660f0f90594597aa
artifact_path: backlog/proposed/2026-07-06-119-drift-delivery-retry.md
class: narrow
requested_at: '2026-07-06T01:27:56Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 02de78e4-9dc9-4295-84f3-ac21bdb0a1d1
focus_hints: 'Verify (founder-adjudicated): AC1 retries ONLY proven-rejection (received
  429 / ok:false via a typed DriftDeliveryRejectedError), sends every unknown-outcome
  throw (timeout/reset/DNS/untyped) straight to terminal delivery-failed with zero
  retries incl. the negative timeout-after-send test; AC2 retry_count = failed-attempts-so-far
  terminalizing at exactly DRIFT_DELIVERY_MAX_RETRIES visible attempts (no off-by-one
  sixth post); AC3 ambiguous-crash unchanged.'
---

# What to review

Read `backlog/proposed/2026-07-06-119-drift-delivery-retry.md` at commit `b5ebcfa764d962f8503e6064660f0f90594597aa`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
