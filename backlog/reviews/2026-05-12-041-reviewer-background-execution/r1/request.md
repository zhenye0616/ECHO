---
item_id: 2026-05-12-041-reviewer-background-execution
round: 1
spec_commit_sha: 8b409de1166153883b0898c236649d221331f34e
artifact_path: backlog/ready/2026-05-12-041-reviewer-background-execution.md
class: narrow
requested_at: '2026-05-12T21:21:48Z'
requested_reviewers:
- codex
- cursor
focus_hints: "041 closes the 040 'founder activation friction' gap via 8 ACs incorporating\
  \ Codex's pre-spec diagnosis. Verify each: (1) AC1+AC2+AC3 \u2014 launchd plist\
  \ + wrapper + verified Codex invocation (--sandbox danger-full-access, no --ask-for-approval,\
  \ < redirection) is the correct Mac-native shape; (2) AC4 \u2014 tools/review-queue/commit-reviewer-response.sh\
  \ is the right substrate for Codex's minor pushback (validate before commit must\
  \ be mechanically unbypassable, NOT just added to reviewer-prompt prose); does the\
  \ helper's signature + the queue-errors.md append on validation failure cover the\
  \ failure modes you anticipate? (3) AC5 \u2014 synthetic-request smoke test isolation:\
  \ copy-repo-into-tmpdir vs symlink for sandbox safety; (4) AC6 \u2014 Cursor degradation\
  \ policy is explicit; single_reviewer_timeout treated as expected, not bug; (5)\
  \ AC7 \u2014 atom_id\u2192id scoped audit (Codex Gap #1 fold-in); (6) AC8 observational\
  \ target \u22641 founder activation per cycle from pre-041 baseline ~5; (7) out-of-scope\
  \ discipline: any in-scope items that should be cut? Any in-scope items missing\
  \ (e.g., is launchd plist install really atomic-enough; does the install script\
  \ need to handle macOS Sonoma+ bootstrap/bootout vs older load/unload)? (8) spec-template\
  \ question: is splitting the reviewer commit logic into a separate helper script\
  \ (AC4) the right factoring vs leaving it as inline shell in each reviewer slash-command\
  \ with validation prepended? Codex's pushback says helper-substrate; strategist\
  \ accepted \u2014 confirm or push back."
---

# What to review

Read `backlog/ready/2026-05-12-041-reviewer-background-execution.md` at commit `8b409de1166153883b0898c236649d221331f34e`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
