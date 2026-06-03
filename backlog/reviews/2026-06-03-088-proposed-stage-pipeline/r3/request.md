---
item_id: 2026-06-03-088-proposed-stage-pipeline
round: 3
spec_commit_sha: 1a4d3eb8d5032941623ad835160f7240dcf85943
artifact_path: backlog/ready/2026-06-03-088-proposed-stage-pipeline.md
class: structural-reform
requested_at: '2026-06-03T21:40:31Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 3c5772f0-4543-49ef-bb71-5d5b5ab787a6
focus_hints: 'Verify: (1) promote.py two-mode split (stage-only mutate vs commit+push)
  is unambiguous; stage-only/terminal path yields exactly one folded audit commit
  with combined.md; (2) pre-promotion content-identity gate compares normalized current
  proposed/ vs request.spec_commit_sha and REFUSES on mismatch (stay in proposed/,
  queue-errors.md, dispatch verification round); (3) AC8 promote.test pins the mode
  boundary + mismatch-refuses negative case.'
---

# What to review

Read `backlog/ready/2026-06-03-088-proposed-stage-pipeline.md` at commit `1a4d3eb8d5032941623ad835160f7240dcf85943`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
