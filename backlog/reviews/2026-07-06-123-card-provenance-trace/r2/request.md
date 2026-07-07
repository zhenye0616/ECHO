---
item_id: 2026-07-06-123-card-provenance-trace
round: 2
spec_commit_sha: c4e0172ab08d3b9be5d07242cd04593f4189d725
artifact_path: backlog/proposed/2026-07-06-123-card-provenance-trace.md
class: narrow
requested_at: '2026-07-07T04:33:22Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 817d7ed6-1bdc-4956-82de-f0b2f10c165a
focus_hints: 'Verify: AC1 card_atom_status marker durability + non-maskability under
  duplicate-suppressed reruns; AC2 tri-state capture_status completeness (capture_failed
  != zero_retrievals) + single-hop addressability from card atom via classifier_run.run_id;
  AC3 renders all three capture states + provenance-loss banner; AC5 covers injected
  atom-write failure and all three capture states; patches must not contradict the
  fail-soft observability-never-blocks-posting invariant'
---

# What to review

Read `backlog/proposed/2026-07-06-123-card-provenance-trace.md` at commit `c4e0172ab08d3b9be5d07242cd04593f4189d725`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
