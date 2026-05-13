---
item_id: 2026-05-13-043-per-round-reviewer-roster
round: 1
spec_commit_sha: d1d9fbc728f7ad4b0e42fb7ab630b4f24cd6350b
artifact_path: backlog/ready/2026-05-13-043-per-round-reviewer-roster.md
class: structural-reform
requested_at: '2026-05-13T06:13:36Z'
requested_reviewers:
- codex
- cursor
focus_hints: "Generalizes (codex, cursor) hardcoding to N reviewers. AC1 is the load-bearing\
  \ fix (per-round requested_reviewers honored). Codex pushback already vetted the\
  \ design \u2014 11 findings (6 HIGH/5 MED) folded in; see raw/internal/decisions/2026-05-13-043-pushback-findings.md.\
  \ Reviewers: focus on whether the load-bearing fix is correctly scoped (AC1+AC2\
  \ minimum-viable subset) vs over-scoped (AC3 helper factoring premature); verify\
  \ AC7's byte-identical fixture is the right falsification mechanism; check for any\
  \ 12th hardcoding point I still missed."
---

# What to review

Read `backlog/ready/2026-05-13-043-per-round-reviewer-roster.md` at commit `d1d9fbc728f7ad4b0e42fb7ab630b4f24cd6350b`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
