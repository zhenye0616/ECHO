---
item_id: 2026-07-13-132-product-graduation-foundation
round: 4
spec_commit_sha: e79638649056ec653f5ac93218da477a1821ce76
artifact_path: backlog/proposed/2026-07-13-132-product-graduation-foundation.md
class: narrow
requested_at: '2026-07-13T09:46:32Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 982348d7-df7d-4bac-9d7f-cea2d71fce37
focus_hints: 'Verify r3 patch set at 03817c4e (4th round; all patches complete already-accepted
  contracts). (1) AC1 fence-tool-first + --seed-inventory: circularity gone? (2) AC2
  unique-deepest-match, /-fallback-only, equal-depth=unknown: unambiguous, fixture-forced?
  (3) AC4 static closure child_process ban (incl. sync variants) + spawnSanitizedChild
  sole owner + tools/product/ scoped out as build machinery: complete without over-claiming?
  (4) ci.yml non-qualification scratch lineage (never uploaded/named) before unconditional
  test:product: does AC7 build-once stay intact? Converge unless a NEW load-bearing
  defect is found; do not reopen accepted mechanisms for wording preferences.'
---

# What to review

Read `backlog/proposed/2026-07-13-132-product-graduation-foundation.md` at commit `e79638649056ec653f5ac93218da477a1821ce76`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
