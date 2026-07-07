---
item_id: 2026-07-06-123-card-provenance-trace
round: 1
spec_commit_sha: 175e4c4b112ce8a230fc59cbbad397204c9b6f8b
artifact_path: backlog/proposed/2026-07-06-123-card-provenance-trace.md
class: narrow
requested_at: '2026-07-07T03:48:13Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 61f01b2a-b15a-47e8-b843-74aa3aecefd8
focus_hints: "AC1/AC2 boundary: card-atom emission is channel-agnostic and fail-soft\
  \ \u2014 verify fail-soft cannot mask silent provenance loss; AC2 retrieval-correlation\
  \ contract: is 'recoverable from the store + survives process exit + explicit zero-retrievals'\
  \ falsifiable without prescribing mechanism; idempotency under duplicate-suppression\
  \ re-runs; AC3 missing-stage walk for pre-123 cards; AC4 read-only conformance to\
  \ 117/122 precedent; estimate realism for the brain.ts hook"
---

# What to review

Read `backlog/proposed/2026-07-06-123-card-provenance-trace.md` at commit `175e4c4b112ce8a230fc59cbbad397204c9b6f8b`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
