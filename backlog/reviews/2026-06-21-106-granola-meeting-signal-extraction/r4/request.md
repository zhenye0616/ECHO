---
item_id: 2026-06-21-106-granola-meeting-signal-extraction
round: 4
spec_commit_sha: 2b1903d4567c4613d0822ebb992d407e6741c000
artifact_path: backlog/proposed/2026-06-21-106-granola-meeting-signal-extraction.md
class: narrow
requested_at: '2026-06-22T06:41:37Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 6f28f7b5-105a-4257-a0ec-22de05d87a00
focus_hints: "Verify checkpoint advancement ordering at 2b1903d4: never advance at\
  \ attempt-start; success fingerprint only after atoms+manifest durable; failure\
  \ fingerprint only after retry-exhaustion; manifest/current-run authoritative so\
  \ a pre-manifest crash re-runs. Tight single-rule verification \u2014 if clean,\
  \ claim-ready."
---

# What to review

Read `backlog/proposed/2026-06-21-106-granola-meeting-signal-extraction.md` at commit `2b1903d4567c4613d0822ebb992d407e6741c000`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
