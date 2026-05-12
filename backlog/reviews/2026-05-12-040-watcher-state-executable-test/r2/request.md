---
item_id: 2026-05-12-040-watcher-state-executable-test
round: 2
spec_commit_sha: 8a6b863d09db0619a6430ea8fd565be0f09150a5
artifact_path: backlog/ready/2026-05-12-040-watcher-state-executable-test.md
class: narrow
requested_at: '2026-05-12T09:38:47Z'
requested_reviewers:
- codex
- cursor
focus_hints: "Verify R1 dispositions landed cleanly: (a) AC1 (b)/(c) now specs os.replace\
  \ (overwrite-allowed in-place atomic update) not os.link (create-only); the prose\
  \ explicitly forbids os.link for combined.md mutations and explains why (file already\
  \ exists at helper invocation time); (b) AC1 (a) tuple list now reads 'verdict \u2208\
  \ {proceed, pushback} AND patches-applied=false' (not just proceed); (c) Helper\
  \ signature includes [--spec-sha=<sha>] with pass-through note to request.py; (d)\
  \ Goal paragraph + AC2 'Helper/watcher boundary' block + AC1 prose all agree the\
  \ helper is file-mutations-only and the watcher slash-command runs a single git\
  \ add+commit+push block for both r{N}/combined.md AND r{N+1}/request.md; (e) AC3\
  \ fixture 1 wording uses 'markdown body below closing --- unchanged; next_round\
  \ is the only frontmatter semantic delta; combined.md after-state schema-validates'.\
  \ Five load-bearing patches; check each for follow-on second-order implications.\
  \ Also: are there any new gaps introduced by the patches (e.g., does the single-git-block\
  \ introduce a new race-window between helper-returns and commit)? AC6 still observational\
  \ not implemented."
---

# What to review

Read `backlog/ready/2026-05-12-040-watcher-state-executable-test.md` at commit `8a6b863d09db0619a6430ea8fd565be0f09150a5`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
