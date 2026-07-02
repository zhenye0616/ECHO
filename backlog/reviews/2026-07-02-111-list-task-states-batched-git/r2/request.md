---
item_id: 2026-07-02-111-list-task-states-batched-git
round: 2
spec_commit_sha: b79a812bdcb54ecdeb230e21ca679e95bad3437f
artifact_path: backlog/proposed/2026-07-02-111-list-task-states-batched-git.md
class: narrow
requested_at: '2026-07-02T07:26:28Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: ebcbf5a3-0e08-4824-846c-1b4992abd3ba
focus_hints: 'Verify: enumerated 8-spawn budget is complete including pinned task-id
  discovery via the single recursive ls-tree at <sha>; AC2 checked-in expected-JSON
  baseline (generated once from pre-rewire impl on the fixture repo) is well-defined
  and reproducible; AC6 lifecycle (stdin close, exit await, kill+reap on error, no
  orphaned children test) and streaming/max-buffer sizing with the >=10x high-cardinality
  fixture are testable as written.'
---

# What to review

Read `backlog/proposed/2026-07-02-111-list-task-states-batched-git.md` at commit `b79a812bdcb54ecdeb230e21ca679e95bad3437f`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
