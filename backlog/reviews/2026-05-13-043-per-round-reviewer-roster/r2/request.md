---
item_id: 2026-05-13-043-per-round-reviewer-roster
round: 2
spec_commit_sha: 9725a917ed4eb93a1f94b342ee8fa34c16307737
artifact_path: backlog/ready/2026-05-13-043-per-round-reviewer-roster.md
class: structural-reform
requested_at: '2026-05-13T06:24:22Z'
requested_reviewers:
- codex
- cursor
focus_hints: "Verify R1's 4 HIGH/MED findings are fully patched: (1) AC1 required\xD7\
  mode\xD7timeout matrix is unambiguous (AC1c/d/e test cases enumerate it); (2) AC4\
  \ race-guard now lives in reviewer prompts' Step 5 BEFORE os.link, NOT in commit-reviewer-response.sh;\
  \ (3) AC6 build_combined generalization replaces ALL THREE two-reviewer-hardcoded\
  \ sites (discovery, response-field write, cross-ref matching) \u2014 AC6h test exercises\
  \ actual 3rd reviewer; (4) AC2 _reviewers.py skeleton compiles (re imported, _SLUG_RE\
  \ defined, TypeError\u2192ValueError, mode\xD7timeout_hours contract enforced in\
  \ AC2d). Default-deploy preserved via cursor.required=true (AC7's load-bearing assumption)."
---

# What to review

Read `backlog/ready/2026-05-13-043-per-round-reviewer-roster.md` at commit `9725a917ed4eb93a1f94b342ee8fa34c16307737`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
