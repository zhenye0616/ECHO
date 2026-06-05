---
item_id: 2026-06-04-089-legacy-spec-review-gate-teardown
round: 2
spec_commit_sha: 81d4aa5e8b46ffebb591992c20094a5f206e68ca
artifact_path: backlog/proposed/2026-06-04-089-legacy-spec-review-gate-teardown.md
class: narrow
requested_at: '2026-06-05T05:50:56Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 94ac5477-deae-42f2-b00b-e51ba49b512d
focus_hints: Verify the seal-stability disposition is consistent across decision 3
  / AC3 / AC5 (CONTENT_MARKER_FIELDS retains legacy exclusions; no hash guard; no
  claimability hole) and that the AC3 caller-sweep gate suffices before dropping --spec-review-sha.
---

# What to review

Read `backlog/proposed/2026-06-04-089-legacy-spec-review-gate-teardown.md` at commit `81d4aa5e8b46ffebb591992c20094a5f206e68ca`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
