---
item_id: 2026-06-02-087b-reviewer-child-readonly-migration
round: 1
spec_commit_sha: 09f831d153c2895fd84c23fd6c1a276d2c65dd92
artifact_path: backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md
class: structural-reform
requested_at: '2026-06-03T06:06:28Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 579abe6d-a47f-4093-99a8-12e9e02bebed
focus_hints: "Trust-boundary migration (child\u2192wrapper commit, then read-only\
  \ flip). KEY CHECKS: (1) Capture tension \u2014 AC2 says the wrapper recovers review\
  \ CONTENT via 087's capture.kind, but 087 only WIRED capture.kind=committed_file\
  \ (child writes <reviewer>.md), which a read-only child CANNOT do; AC6 forbids 'new\
  \ capture kind beyond what 087 defined'. Is wiring a 087-enum-DEFINED-but-unwired\
  \ kind (e.g. final_message/stdout) in scope, or is this an 085-style self-contradiction?\
  \ Must be resolved. (2) Migration ORDER \u2014 Locked-3 says commit-move BEFORE\
  \ sandbox-flip within the item; verify ACs enforce that ordering and that no intermediate\
  \ state has a read-only child still self-committing (the 085 trap). (3) hang/crash\
  \ \u2192 durable queue-error, never silent miss (AC2, the rc=143 class). (4) wrapper\
  \ retains git/worktree capability; only the AI child is constrained (AC3). (5) all\
  \ 4 reviewer skills + regenerated adapters stay sync-check-clean."
---

# What to review

Read `backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md` at commit `09f831d153c2895fd84c23fd6c1a276d2c65dd92`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
