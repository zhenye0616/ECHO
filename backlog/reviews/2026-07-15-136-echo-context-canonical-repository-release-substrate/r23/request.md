---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 23
spec_commit_sha: 5326b4bb5111e9932d18795ae1cae21221c403e6
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: narrow
requested_at: '2026-07-16T17:28:22Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: c12f0762-f623-4d34-97bb-032c44fede19
focus_hints: 'Verify only patch 5326b4bb5111e9932d18795ae1cae21221c403e6: every child
  outcome gates reporting and advance on direct exit, stdout/stderr closure, and PGID
  absence; an ordinary pre-T nonzero exit with a surviving descendant receives the
  same idempotent TERM/five-second/KILL ceremony and remains pending until absence.
  No supervisor, Worker, controller, extra production child, hosted surface, or client-facing
  behavior was added.'
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `5326b4bb5111e9932d18795ae1cae21221c403e6`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
