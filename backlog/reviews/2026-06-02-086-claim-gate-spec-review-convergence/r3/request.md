---
item_id: 2026-06-02-086-claim-gate-spec-review-convergence
round: 3
spec_commit_sha: ac3d50a0944b2c1deea15a1803dff7432c724daf
artifact_path: backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md
class: narrow
requested_at: '2026-06-02T20:06:41Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: d4fc9715-aea3-4c1e-975b-2eb5442e3e33
focus_hints: 'Verify r2 patch @ac3d50a0 only: case-(a) zero-patch terminal writes
  spec_review:converged+reviewed-sha; case-(c) verification-waived terminal writes
  spec_review:waived (no sha, skips staleness). Confirm this removes the self-stale
  path with no NEW edge case and AC1/AC3/AC5 are consistent with two terminal markers.
  Flag only NEW gaps this patch introduces.'
---

# What to review

Read `backlog/ready/2026-06-02-086-claim-gate-spec-review-convergence.md` at commit `ac3d50a0944b2c1deea15a1803dff7432c724daf`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
