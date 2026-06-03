---
item_id: 2026-06-03-088-proposed-stage-pipeline
round: 5
spec_commit_sha: 6725e43426d5f4d28e9221e9664cf028f3de644d
artifact_path: backlog/ready/2026-06-03-088-proposed-stage-pipeline.md
class: structural-reform
requested_at: '2026-06-03T22:03:49Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 1b3dfc8e-793c-477f-94c8-c12b4a5cb79f
focus_hints: "Verify: (1) path-(c) cut is complete \u2014 no path edits the proposed\
  \ spec after request.spec_commit_sha and still terminalizes with next_round:null\
  \ (the AC4 (a)/(c)-only diagnostic); (2) promote.py bullet + AC4 + watcher bullet\
  \ + AC8 all agree mismatch is refuse-only and waiver-after-content-patch forces\
  \ a round (no stale contradictions); (3) 087b authorized migration-only in files_to_modify\
  \ + claimability assertion."
---

# What to review

Read `backlog/ready/2026-06-03-088-proposed-stage-pipeline.md` at commit `6725e43426d5f4d28e9221e9664cf028f3de644d`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
