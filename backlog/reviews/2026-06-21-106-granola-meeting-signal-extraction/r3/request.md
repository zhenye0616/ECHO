---
item_id: 2026-06-21-106-granola-meeting-signal-extraction
round: 3
spec_commit_sha: 21f83e99a2e36e8a4fe9b7e19b2f9f583792a287
artifact_path: backlog/proposed/2026-06-21-106-granola-meeting-signal-extraction.md
class: narrow
requested_at: '2026-06-22T06:33:40Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 8b88016d-4ea3-4895-aba0-1a1f37084510
focus_hints: "Verify the r2 structural cut at 21f83e99: lease/claims file fully removed;\
  \ mutual exclusion is 104 single-in-flight only; failed extractions write NO manifest\
  \ (latest-wins reads success only); no-spin is the worker checkpoint keyed by raw\
  \ updated_at + extractor_version. Removal round \u2014 if clean, claim-ready."
---

# What to review

Read `backlog/proposed/2026-06-21-106-granola-meeting-signal-extraction.md` at commit `21f83e99a2e36e8a4fe9b7e19b2f9f583792a287`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
