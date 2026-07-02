---
item_id: 2026-07-02-110-packaged-daemon-brain-boundary
round: 2
spec_commit_sha: 185b6b042f0cb260c22c29e9cfccb871d418ebad
artifact_path: backlog/proposed/2026-07-02-110-packaged-daemon-brain-boundary.md
class: narrow
requested_at: '2026-07-02T07:11:54Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 19274ba5-e272-4c8d-9c38-07fd4d68d5e1
focus_hints: "Verify: AC3 packed-file-set pinning is airtight \u2014 the guard must\
  \ read the actual npm pack output (or shared dry-run manifest) with no rules-approximation\
  \ loophole, temp cleanup, and red-verification against pre-fix main; AC4 carve is\
  \ tight \u2014 recent-calls-endpoint (item 111) is the SOLE allowed exception, void\
  \ once 111 merges, shell-reachable unconditional."
---

# What to review

Read `backlog/proposed/2026-07-02-110-packaged-daemon-brain-boundary.md` at commit `185b6b042f0cb260c22c29e9cfccb871d418ebad`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
