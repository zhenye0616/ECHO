---
item_id: 2026-05-12-041-reviewer-background-execution
round: 3
spec_commit_sha: e8edb298c998e290ed7e5e16810a5e927ec22e8a
artifact_path: backlog/ready/2026-05-12-041-reviewer-background-execution.md
class: narrow
requested_at: '2026-05-12T21:43:27Z'
requested_reviewers:
- codex
- cursor
focus_hints: "Verify R2 patches at spec_commit_sha e8edb29: (a) AC1 set -euo pipefail\
  \ + stderr preamble on failed cd naming ECHO_REVIEW_QUEUE_REPO_ROOT and its value\
  \ \u2014 closes convergent Codex L3 + Cursor L2; (b) AC2 <key>Label</key><string>com.echo.review-queue-codex</string>\
  \ normative as FIRST plist entry \u2014 Cursor L1 (manually surfaced after combine.py\
  \ omitted it); (c) AC5 git init -b main on BOTH SMOKE_WORK and SMOKE_ORIGIN; symbolic-ref\
  \ fallback for older git \u2014 Codex M1 load-bearing branch-naming fix; (d) AC5\
  \ hard isolation assertions: smoke origin URL string equality with SMOKE_ORIGIN,\
  \ no other remotes, production GitHub URL absent from .git/config; production-origin\
  \ delta advisory not failure \u2014 Codex L2; (e) Implementation hint: grep reviewer\
  \ prompts for path references when shrinking AC5 copy-set \u2014 Cursor NIT. Five\
  \ patches. If R3 lands proceed/proceed with zero findings, 041 is claim-ready. Verify\
  \ no new second-order gaps introduced. Note: R2 had two combine.py classification\
  \ anomalies (Cursor L1 dropped, Cursor L2 double-listed). If R3 reviewers spot similar\
  \ patterns, that's evidence for a combine.py finding-enumeration follow-up post-041."
---

# What to review

Read `backlog/ready/2026-05-12-041-reviewer-background-execution.md` at commit `e8edb298c998e290ed7e5e16810a5e927ec22e8a`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
