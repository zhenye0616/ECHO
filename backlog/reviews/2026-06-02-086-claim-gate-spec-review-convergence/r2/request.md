---
item_id: 2026-06-02-086-claim-gate-spec-review-convergence
round: 2
spec_commit_sha: 920ce51937959b65f9ba9a0ea58fecd39222a19e
artifact_path: backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md
class: narrow
requested_at: '2026-06-02T19:57:07Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: c6e57e4d-ad2f-4f7b-b310-84835cb1eece
focus_hints: 'Verify r1 patches @920ce519 only: F1 normalized-reviewed-content staleness
  (marker-only delta=FRESH, AC-body delta=STALE; spec_review_sha=reviewed spec_commit_sha
  not marker commit); F2 inline-list requested_reviewers parse + load_items preservation
  + fail-CLOSED on unparseable roster; F3a AC6 extends tools/test_blocked.py; F3b
  AC5 rejects converged-with-missing/malformed-sha. Flag only NEW gaps these patches
  introduce.'
---

# What to review

Read `backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md` at commit `920ce51937959b65f9ba9a0ea58fecd39222a19e`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
