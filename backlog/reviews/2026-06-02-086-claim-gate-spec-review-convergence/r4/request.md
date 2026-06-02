---
item_id: 2026-06-02-086-claim-gate-spec-review-convergence
round: 4
spec_commit_sha: 7d415078dcc22dad61208c91c7cb2e58d4e4f192
artifact_path: backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md
class: narrow
requested_at: '2026-06-02T20:20:05Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: e8e17bfb-13c7-49b8-8e7f-45d74e73e082
focus_hints: "Verify r3 unified patch @7d415078 only: single content-anchored 'converged'\
  \ marker for BOTH terminal paths; spec_review_sha is a digest of normalized reviewed\
  \ content (marker+agent-managed fields excluded). Confirm NO residual one-marker/two-marker\
  \ inconsistency across frontmatter+ACs+body, no self-reference, and case-(a) AND\
  \ case-(c) both stay staleness-checked (no fail-open). Removal/simplification round\
  \ \u2014 flag only a NEW gap in the unified model."
---

# What to review

Read `backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md` at commit `7d415078dcc22dad61208c91c7cb2e58d4e4f192`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
