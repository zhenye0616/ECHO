---
item_id: 2026-05-14-052-sync-skills-check-in-merge-and-cleanup
round: 3
spec_commit_sha: d4d7f92aad91bb92ffdf227216602cc851a47c52
artifact_path: backlog/ready/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md
class: narrow
requested_at: '2026-05-15T08:17:05Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: 'Verify the AC4 anchored C5 regex (^#+\s+C5(?:[^A-Za-z0-9]|$)) does NOT
  match AC5/BC5/C50/C5A; verify the C6-required end-anchor forbids EOF fallback so
  a malformed successor heading is detected as a distinct failure mode; verify the
  ''first fenced code block inside C5'' extraction is unambiguous against the package-lock
  regeneration sub-fence (the test extracts the FIRST fence, not the last). Verify
  AC3 absolute-vs-relative core.hooksPath branches produce correct paths in both modes;
  verify installer test case #6 actually exercises the relative-from-nested-cwd failure
  (installer invoked from a nested subdirectory while core.hooksPath is relative).
  Flag if any AC3/AC4 prose still permits the failure modes the r2 patches closed.'
---

# What to review

Read `backlog/ready/2026-05-14-052-sync-skills-check-in-merge-and-cleanup.md` at commit `d4d7f92aad91bb92ffdf227216602cc851a47c52`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
