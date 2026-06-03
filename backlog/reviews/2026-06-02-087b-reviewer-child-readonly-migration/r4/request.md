---
item_id: 2026-06-02-087b-reviewer-child-readonly-migration
round: 4
spec_commit_sha: af3bd184b49e8efa9177980e3c4e52b23d518cad
artifact_path: backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md
class: structural-reform
requested_at: '2026-06-03T06:55:10Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 0fba65ae-9a63-416b-9d52-109bfe8e0d5b
focus_hints: "Verify r3 patches at spec SHA 71e4d0bd: (1) publisher/capture/read-only\
  \ migration is SCOPED to codex/codex-ops everywhere \u2014 AC1, AC4 docs, files_to_modify\
  \ (cursor/claude = prose-only), OoS successor \u2014 no lingering 'all 4 prompts\
  \ migrate' claim or AC1-vs-AC6 contradiction; cursor/claude keep landing responses.\
  \ (2) capture-failure skip-marker + queue-errors row are committed+pushed to origin\
  \ via push-with-retry BEFORE wrapper exit / 050 $WT cleanup; AC5(iv) regression\
  \ scans a FRESH origin-backed worktree and does not reselect the failed round. (3)\
  \ no regression in the r2-established contracts: stdout_text capture kind, wrapper-owned\
  \ pre-spawn selection/bind-validation, write-free child + immutable packet, full-write-free-before-sandbox-flip\
  \ ordering (Locked-3)."
---

# What to review

Read `backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md` at commit `af3bd184b49e8efa9177980e3c4e52b23d518cad`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
