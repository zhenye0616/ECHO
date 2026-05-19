---
item_id: 2026-05-19-063-raycast-sessions-as-objects
round: 3
spec_commit_sha: 30ea59b3c4c243d8a321a3d8655707d689f1f194
artifact_path: backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md
class: structural-reform
requested_at: '2026-05-19T23:01:11Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: bb06e3fa-a4c7-423d-b130-3166ac90d09c
focus_hints: "Verify (a) AC6.6 with log-mtime predicate DROPPED (removal-only patch\
  \ per disposition discipline) is safe under sleep/wake, quiet headless agent, missing\
  \ log AND AC8.6 regression-guard catches re-additions; (b) AC6.2 'immediately after\
  \ startAgent returns' ordering is implementable AND AC8.7 'within one microtask'\
  \ is testable; (c) AC6.7 mergeAndWrite field-level merge semantics (last-write-wins\
  \ on scalars, UNION on auditCalls, row-author-wins on answer) are correct AND AC8.10\
  \ covers two-writer race; (d) AC4.5 \u2318R-to-TypingState fork flow is internally\
  \ consistent across Component description, Data flow #5, AC4.5, AC8.8; (e) AC4.2\
  \ log-stat fallback ladder is complete and try/catch wrapping is at the right render\
  \ boundary."
---

# What to review

Read `backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md` at commit `30ea59b3c4c243d8a321a3d8655707d689f1f194`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
