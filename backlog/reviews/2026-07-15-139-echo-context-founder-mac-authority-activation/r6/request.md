---
item_id: 2026-07-15-139-echo-context-founder-mac-authority-activation
round: 6
spec_commit_sha: 8b72e02d1f3cdf2271fc80db02deb87ca840e70d
artifact_path: backlog/proposed/2026-07-15-139-echo-context-founder-mac-authority-activation.md
class: structural-reform
requested_at: '2026-07-16T04:23:45Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 05f9596f-0e79-449b-8a4e-83ae96e8753c
focus_hints: "Verify the r5 propagation pass at the new spec SHA: (1) AC4/AC6 \u2014\
  \ the com.echo.daemon no-restart fence is established/journaled at AC4 before any\
  \ checkpoint/backup, held through the AC6 prepared commit with crash/resume re-proof,\
  \ AC6 is re-verification only, and the whole fence stays a consumption requirement\
  \ on item 138's landed controller with stop-and-escalate on missing capability;\
  \ (2) AC1/AC6 \u2014 the one-time approved-byte deployment carve-out (item-137 prepare-final\
  \ command + residual package artifact install path, installed-byte hash readback)\
  \ cannot be read as permitting rebuild, lifecycle/build scripts, or dependency reinstall\
  \ post-approval; (3) AC1/AC8/AC10 \u2014 the hash-bound six-adapter source-slot\
  \ inventory (explicit disabled slots, missing/duplicate/unknown-index rejection)\
  \ as sole expected-key source, the canonical single-line JSON row encoding with\
  \ exact keys/types, mechanical UTC ts\u2192America/Los_Angeles date derivation,\
  \ current-generation and plan-membership checks, zero-count-observed invalidity,\
  \ and the 7-civil-dates-times-inventory expected set are internally consistent and\
  \ falsifiable end-to-end including the Tests negative-check bullet; (4) AC1/AC4/AC7\
  \ \u2014 the stop-and-escalate-to-strategist gates leave no residual in-item proposal-creation\
  \ authority and files_to_modify needs no expansion."
---

# What to review

Read `backlog/proposed/2026-07-15-139-echo-context-founder-mac-authority-activation.md` at commit `8b72e02d1f3cdf2271fc80db02deb87ca840e70d`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
