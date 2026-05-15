---
item_id: 2026-05-14-051-merge-lock-cross-vendor-enforcement
round: 2
spec_commit_sha: 555eb65f48b8dd728473e95490da82f874d15461
artifact_path: backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md
class: narrow
requested_at: '2026-05-15T06:42:30Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: 'verify all 4 R1 patches: --rebase=merges syntax (AC1:67), tree-not-SHA
  assertion (AC1:74), lock check after LOG_FILE setup (AC2:79), --git-common-dir primitive
  (AC2:80) + Risk R2 prose (line 147); confirm no obsolete --rebase-merges or --git-path
  references remain'
---

# What to review

Read `backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md` at commit `555eb65f48b8dd728473e95490da82f874d15461`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
