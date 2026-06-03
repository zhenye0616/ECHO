---
item_id: 2026-06-03-088-proposed-stage-pipeline
round: 2
spec_commit_sha: f081dadf310e7f8194a396a0bcc47342d4c9f826
artifact_path: backlog/ready/2026-06-03-088-proposed-stage-pipeline.md
class: structural-reform
requested_at: '2026-06-03T21:29:58Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 37f104a0-cf69-4ca4-afa1-7eba75e87ea7
focus_hints: 'Verify: (1) AC4 TERMINAL-PROMOTABLE predicate excludes a merely-combined
  round + AC8 negative test pins crash-after-combine-before-disposition; (2) AC5 fixture-only
  --check keeps docs/BACKLOG.md off the builder write path while catching generator
  drift; (3) AC8 names tools/test_blocked.py with required command; (4) stale-ready
  bounce watcher pre-step + queue-errors logging is a complete unattended owner.'
---

# What to review

Read `backlog/ready/2026-06-03-088-proposed-stage-pipeline.md` at commit `f081dadf310e7f8194a396a0bcc47342d4c9f826`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
