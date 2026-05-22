---
item_id: 2026-05-21-066-process-backlog-handoff-atomicity
round: 4
spec_commit_sha: e8cf9936927110acb251c44886410b1ef338439b
artifact_path: backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md
class: narrow
requested_at: '2026-05-22T04:25:20Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 93f9ab90-06a6-491b-b033-6c3394736e60
focus_hints: 'Verify three root-fixes in dc7904e: (a) recover() now rollback-only
  + caller-side finish-path block + AC1 split contract (rollback + optional finishUnpublishedTransition);
  (b) all failure-hiding suffixes removed from git rm --cached and rm -f; (c) post-recovery
  pull uses --autostash for tracked-dirty paths outside P1_TOUCHED_SURFACES ($LOG,
  queue-errors.md). 4 new AC3 tests (9 rewritten, 12-14 added).'
---

# What to review

Read `backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md` at commit `e8cf9936927110acb251c44886410b1ef338439b`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
