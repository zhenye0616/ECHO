---
item_id: 2026-05-13-043-per-round-reviewer-roster
round: 3
spec_commit_sha: 2b264f396ef2513cb91577d5c9e8bcef1ed94257
artifact_path: backlog/ready/2026-05-13-043-per-round-reviewer-roster.md
class: structural-reform
requested_at: '2026-05-13T06:39:07Z'
requested_reviewers:
- codex
- cursor
focus_hints: "Verify R2's 5 findings fully patched: (1) AC2 'Adding a Reviewer changelist'\
  \ enumerates 5-file edit + AC6h test exercises full request.py\u2192validate.py\u2192\
  combine.py pipeline through patched schemas; (2) AC6 Phase 3 preserves normalize_where\
  \ + cross_refs_match (AC6k regression guard for 2-reviewer cross_ref convergence);\
  \ (3) AC1f propagates requested_reviewers via dispatch-next-round.py --reviewers\
  \ flag; (4) _reviewers.py caches tuple not list (AC2b identity check); (5) _run_reviewer.sh\
  \ PYTHONPATH set (AC3c literal-string assertion). Trend question: R1+R2 both pushback;\
  \ R3 should transition to proceed_after_patches if patches actually resolve the\
  \ findings or pushback if deeper structural gap."
---

# What to review

Read `backlog/ready/2026-05-13-043-per-round-reviewer-roster.md` at commit `2b264f396ef2513cb91577d5c9e8bcef1ed94257`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
