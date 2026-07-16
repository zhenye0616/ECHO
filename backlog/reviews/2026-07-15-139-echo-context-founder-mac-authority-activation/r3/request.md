---
item_id: 2026-07-15-139-echo-context-founder-mac-authority-activation
round: 3
spec_commit_sha: cadd1a8ba081629d27ac1549068d41e795b1b119
artifact_path: backlog/proposed/2026-07-15-139-echo-context-founder-mac-authority-activation.md
class: structural-reform
requested_at: '2026-07-16T03:08:12Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: c57c28b2-adef-4a32-b22c-f9048327062d
focus_hints: "Verify the four r2 patches at the new spec SHA: (1) AC1 landed-SHA read\
  \ path \u2014 138 complete-spec frontmatter fields target_landed_sha/project_landed_sha\
  \ cross-checked against the paired migration record, per-repo canonical-remote reachability,\
  \ stop on empty/mismatch/unreachable; (2) AC1 build-once vs post-approval verification-clone\
  \ command boundary is consistent with the Tests section and leaves no rebuild path\
  \ after hash approval; (3) AC7 staged-transaction atomic client rewire \u2014 before-image\
  \ snapshot to the AC3 rollback area, temp-file after images, validate-all-then-rename-all,\
  \ full restore on any partial failure before service activation; (4) AC8/AC10 secret-free\
  \ adapter evidence tuple and forbidden content classes cover all six adapters without\
  \ permitting content leakage."
---

# What to review

Read `backlog/proposed/2026-07-15-139-echo-context-founder-mac-authority-activation.md` at commit `cadd1a8ba081629d27ac1549068d41e795b1b119`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
