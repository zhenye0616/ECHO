---
item_id: 2026-07-02-111-list-task-states-batched-git
round: 3
spec_commit_sha: e2039af104d1a4d063dcde0b2d4184da2de81488
artifact_path: backlog/proposed/2026-07-02-111-list-task-states-batched-git.md
class: narrow
requested_at: '2026-07-02T07:42:32Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 253c5eb8-ba8e-4d9d-98fd-38038b8bd09c
focus_hints: "Verify: single-seam spawn ledger (AC1) closes the raw-streaming-child\
  \ bypass \u2014 all git children incl. AC6 streaming go through one injectable factory,\
  \ exact 8-child argv assertion; AC2 fixture sequence reproducible (pinned GIT_AUTHOR/COMMITTER\
  \ identity+dates -> stable fixture SHAs -> stable ref/last_updated in baseline JSON)\
  \ and ordered pre-rewire generation is enforceable by commit order; files_to_modify\
  \ now consistent with AC2."
---

# What to review

Read `backlog/proposed/2026-07-02-111-list-task-states-batched-git.md` at commit `e2039af104d1a4d063dcde0b2d4184da2de81488`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
