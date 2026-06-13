---
item_id: 2026-06-13-102-orchestration-init-per-project
round: 3
spec_commit_sha: 815272edcaf757c0f7fe820248ba8c96c13726db
artifact_path: backlog/proposed/2026-06-13-102-orchestration-init-per-project.md
class: structural-reform
requested_at: '2026-06-13T09:21:06Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: df3ea91a-d9ab-43ea-b262-dafb2508513f
focus_hints: "R3 verify after r2 patch 6db3680b. (1) AC5 now covers READ/SELECT +\
  \ write on coord_ref \u2014 confirm full surface, no remaining coord_ref gap. (2)\
  \ AC6 was deliberately NARROWED (command-dir override \u2192 item 104), not gapped\
  \ \u2014 confirm 102 can still run a review round on an onboarded repo with reviewer\
  \ command files synced/in-repo. NOTE to reviewer: r1 and r2 each found gaps in the\
  \ prior round's patches; if you find yet another patch-on-patch issue rather than\
  \ clean closure, say so explicitly \u2014 that signals splitting the item, not deeper\
  \ patching. Otherwise return proceed."
---

# What to review

Read `backlog/proposed/2026-06-13-102-orchestration-init-per-project.md` at commit `815272edcaf757c0f7fe820248ba8c96c13726db`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
