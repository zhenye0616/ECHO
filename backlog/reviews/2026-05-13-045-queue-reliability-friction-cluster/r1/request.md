---
item_id: 2026-05-13-045-queue-reliability-friction-cluster
round: 1
spec_commit_sha: 8252b2d73c282854f13975d57917011939ac5118
artifact_path: backlog/ready/2026-05-13-045-queue-reliability-friction-cluster.md
class: narrow
requested_at: '2026-05-13T21:47:34Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "6 ACs bundling 7 recurring frictions from the 044 cycle. AC1: reviewer-side\
  \ YAML emission validation gate (5-cycle recurrence). AC2: smoke gate fail-closed.\
  \ AC3: orphan-cleanup test fix (3-cycle deferral). AC4: cosmetic prose alignment.\
  \ AC5a+b: /merge-and-cleanup robustness (worktree node_modules + post-mv staging).\
  \ AC6: /review-pending sidecar commit gap. Explicit out-of-scope: F-G through F-P\
  \ (process discipline, cron-during-cycle, path-c waiver, round-to-round drift, etc.).\
  \ class:narrow with explicit scope-creep defense per 044's lesson. Same 2-codex\
  \ roster as 044; Cursor omitted. Target \u22643 rounds."
---

# What to review

Read `backlog/ready/2026-05-13-045-queue-reliability-friction-cluster.md` at commit `8252b2d73c282854f13975d57917011939ac5118`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
