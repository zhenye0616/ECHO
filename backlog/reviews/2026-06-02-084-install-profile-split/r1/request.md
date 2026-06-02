---
item_id: 2026-06-02-084-install-profile-split
round: 1
spec_commit_sha: d817b39ffef281bb29f56b7a8003be2af671ac8c
artifact_path: backlog/ready/2026-06-02-084-install-profile-split.md
class: narrow
requested_at: '2026-06-02T07:44:13Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: d410623d-4c01-49e7-986e-1c6c91b3032d
focus_hints: 'Check the 5 judgment calls (J1 flag-vs-detect, J2 frontmatter-audience-vs-dir-split,
  J3 hop-1-vs-hop-2 filter point, J4 untagged-skill-defaults-customer, J5 customer-skips-roles/workflows).
  Verify Locked #2 (default customer for fresh installs but persist + respect recorded
  profile so the founder''s dogfood machine isn''t downgraded) is coherent against
  onboarding.json read/write. Confirm the AC4 backward-compat call (pre-084 installs
  with no profile field). Confirm blocked_by 083 covers all shared init.ts/smoke seams.
  Flag any leak path where a customer install could still surface /using-echo-coord.'
---

# What to review

Read `backlog/ready/2026-06-02-084-install-profile-split.md` at commit `d817b39ffef281bb29f56b7a8003be2af671ac8c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
