---
item_id: 2026-05-14-052-sync-skills-check-in-merge-and-cleanup
round: 2
spec_commit_sha: 8be6fca287e41aabcf5e4e3922ccaf7cb923df07
artifact_path: backlog/ready/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md
class: narrow
requested_at: '2026-05-15T08:08:53Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "Verify codex-side: (1) AC3's three-branch idempotent installer (content-differs\
  \ / unchanged / mode-repair-on-byte-identical-but-non-executable) is internally\
  \ coherent and the chmod-on-mode-repair branch actually fires before discarding\
  \ the temp file; (2) AC3's hook path resolution (core.hooksPath > git rev-parse\
  \ --git-path hooks/pre-commit, with mkdir -p) handles the linked-worktree case correctly;\
  \ (3) AC4's block-extraction regex anchors (^#+ .*[Cc]5[^a-zA-Z] start, ^#+ next-heading\
  \ end) are stable against plausible heading-depth variations in skills/merge-and-cleanup.md\
  \ and do not silently widen on a malformed C5 block; (4) the three codex R1 false-positive\
  \ findings (F1 id-mismatch, F2 nonexistent spec_ref, F3 commit-reviewer-response.sh\
  \ reference) do not recur \u2014 verified at the pinned SHA the spec id IS 052 and\
  \ the spec_refs do NOT contain the claimed path."
---

# What to review

Read `backlog/ready/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md` at commit `8be6fca287e41aabcf5e4e3922ccaf7cb923df07`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
