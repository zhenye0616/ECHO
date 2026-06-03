---
item_id: 2026-06-03-088-proposed-stage-pipeline
round: 6
spec_commit_sha: 61dedb5c9e4a84abfd147ae24ee39721bd80d10f
artifact_path: backlog/ready/2026-06-03-088-proposed-stage-pipeline.md
class: structural-reform
requested_at: '2026-06-03T22:11:39Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 5810e3df-58b5-423f-834c-308733e08ee6
focus_hints: 'Verify path-(c) cut is enforced in dispatch-next-round.py: a proposed-stage
  artifact + proceed_after_patches + --patches-applied=false must reject branch (c)
  / force path b, while a non-proposed artifact still takes branch (c); AC8 pins both.'
---

# What to review

Read `backlog/ready/2026-06-03-088-proposed-stage-pipeline.md` at commit `61dedb5c9e4a84abfd147ae24ee39721bd80d10f`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
