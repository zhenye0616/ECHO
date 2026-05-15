---
item_id: 2026-05-14-051-merge-lock-cross-vendor-enforcement
round: 3
spec_commit_sha: 21e0a05f37442dd252c35b8338a860f2c93447db
artifact_path: backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md
class: narrow
requested_at: '2026-05-15T07:24:13Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "verify R2 patches landed: (a) bulk replacement of standalone --rebase-merges\
  \ \u2192 --rebase=merges except line 67 falsification reference; (b) frontmatter\
  \ line 12 explicit fix; (c) line 85 lock-absent bullet rewrite. Confirm no remaining\
  \ standalone --rebase-merges references outside line 67. Confirm spec body internally\
  \ consistent for builder."
---

# What to review

Read `backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md` at commit `21e0a05f37442dd252c35b8338a860f2c93447db`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
