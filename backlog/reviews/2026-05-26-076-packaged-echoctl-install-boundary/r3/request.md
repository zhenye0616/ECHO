---
item_id: 2026-05-26-076-packaged-echoctl-install-boundary
round: 3
spec_commit_sha: 2b018839a24c78361060fc7908e032056e85a9cb
artifact_path: backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md
class: narrow
requested_at: '2026-05-27T05:24:32Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 55fec985-503e-431d-b7e2-5ac273f873a1
focus_hints: "Verify the 6 r2 dispositions survive fresh-eyes re-read: (a) AC1.5 removal-over-patching\
  \ is sound (existing CoordPathError \u2192 isError-text is V1-sufficient; AC5.1\
  \ step 4 positive assertion proves it without touching src/coord or src/mcp); (b)\
  \ AC3.2 + AC3.3 + AC3.8 + AC5 fully thread ECHO_DATA_DIR + ECHO_DB_PATH through\
  \ plist, install flags, preflight, every-verb overrides, smoke isolation, and production-mtime\
  \ snapshot; (c) AC3.3 step 10 post-bootstrap probe-wait CLOSES the bootout-then-broken-replacement\
  \ upgrade gap; (d) AC5.1 stop-then-start exercises the real start path AND every\
  \ verb in the smoke uses the full $OVERRIDES; (e) AC1.3 'broken' wording matches\
  \ current doctor.ts semantics. No new mechanism \u2014 verification only."
---

# What to review

Read `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md` at commit `2b018839a24c78361060fc7908e032056e85a9cb`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
