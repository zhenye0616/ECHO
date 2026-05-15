---
item_id: 2026-05-14-051-merge-lock-cross-vendor-enforcement
round: 5
spec_commit_sha: e2eb804c7f1fd909c49e75947b3a60c92074563e
artifact_path: backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md
class: narrow
requested_at: '2026-05-15T07:42:43Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: R5 is the convergence-target round. Verify R4 simplification (AC1 test
  dropped tree-equality, kept only ^2 existence check). Verify AC2 step 2 now requires
  both prompt fixtures. Do NOT re-raise the 2 deferred codex-ops findings (filed as
  051-followup-A and -B in _followups.md per friction-first directive).
---

# What to review

Read `backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md` at commit `e2eb804c7f1fd909c49e75947b3a60c92074563e`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
