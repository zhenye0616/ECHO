---
item_id: 2026-06-05-094-ci-burn-reduction-paths-ignore
round: 3
spec_commit_sha: 476d3f1f4c9b0e0bfbfe6a520f91f61db5c898c7
artifact_path: backlog/proposed/2026-06-05-094-ci-burn-reduction-paths-ignore.md
class: narrow
requested_at: '2026-06-06T00:37:43Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 112ddb5e-f606-45a3-8f1b-7a6ead447790
focus_hints: 'Verify the r2 structural cut at 32f97f4e: (1) AC2b is now a pure spec-time-recorded
  decision (no builder verification mechanism, no standing-note obligation) and the
  captured plan-shaped-403 evidence (protection + rulesets) is sufficient and unambiguous;
  (2) Locked-1''s bounded-diff (300-file) limit documentation matches GitHub''s actual
  semantics and the residual-risk argument holds for this repo''s push profile; (3)
  nothing else in the spec still references the removed AC2b mechanisms.'
---

# What to review

Read `backlog/proposed/2026-06-05-094-ci-burn-reduction-paths-ignore.md` at commit `476d3f1f4c9b0e0bfbfe6a520f91f61db5c898c7`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
