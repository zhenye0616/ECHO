---
item_id: 2026-05-13-043-per-round-reviewer-roster
round: 4
spec_commit_sha: 7f96cd066cb5089b51fe24f6f13170ea32a6e93c
artifact_path: backlog/ready/2026-05-13-043-per-round-reviewer-roster.md
class: structural-reform
requested_at: '2026-05-13T06:47:10Z'
requested_reviewers:
- codex
- cursor
focus_hints: "Verify F1: AC6 Phase 2 loops over schema-declared reviewers (not just\
  \ requested), emits null for unrequested AND validate.py combined exits 0 for codex-only\
  \ round (AC1b assertion). Verify F2: commit-reviewer-response.sh case statement\
  \ dropped per R3 HIGH #2. Verify F3: Adding-a-Reviewer changelist row 3 updates\
  \ BOTH reviewer enums in reviewer.schema.json + AC6l asserts cross_ref-to-new-reviewer\
  \ validates. Trend question: R1/R2/R3 pushback; finding count 4\u21925\u21923. If\
  \ R4 transitions to proceed_after_patches OR has \u22642 findings, the spec is converging;\
  \ if R4 is pushback with \u22653 NEW findings, the decay-curve is broken."
---

# What to review

Read `backlog/ready/2026-05-13-043-per-round-reviewer-roster.md` at commit `7f96cd066cb5089b51fe24f6f13170ea32a6e93c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
