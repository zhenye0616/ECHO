---
item_id: 2026-05-19-063-raycast-sessions-as-objects
round: 6
spec_commit_sha: 13fd977842aeb717bcddc04ed143b55367cf647d
artifact_path: backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md
class: structural-reform
requested_at: '2026-05-19T23:39:12Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: fa38794e-35c7-4d33-83db-e985bcf83400
focus_hints: "Verify (a) all four files_to_modify comments + sessions.ts component\
  \ description + EmptyState component description are now internally consistent with\
  \ the AC body (no remaining single-key/source-app/eager-fork wording); (b) AC6.4\
  \ final-flush ordering (cancel debounce \u2192 synchronous final update \u2192 recordSessionEnd)\
  \ is unambiguous AND AC8.12 covers both the under-interval exit race + the on-boundary\
  \ concurrent-fire case; (c) decay-shape signal \u2014 if r6 lands at 0-2 findings\
  \ the spec is convergence-ready (claim-ready); if r6 surfaces NEW mechanism findings\
  \ (not stale prose), the spec needs another round."
---

# What to review

Read `backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md` at commit `13fd977842aeb717bcddc04ed143b55367cf647d`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
