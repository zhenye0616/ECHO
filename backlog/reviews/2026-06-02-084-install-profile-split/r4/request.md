---
item_id: 2026-06-02-084-install-profile-split
round: 4
spec_commit_sha: 01156081573c10cba0b4e0d2646a6a34c72600d2
artifact_path: backlog/ready/2026-06-02-084-install-profile-split.md
class: narrow
requested_at: '2026-06-02T08:10:54Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: f54535c8-6ecf-4bdd-98af-87c2ff8da414
focus_hints: 'Verify r3 at 01156081573c10cba0b4e0d2646a6a34c72600d2: (1) AC4 inference
  keys on completed/agents (no-file or completed:false+empty-agents => customer; completed:true/agents-without-profile
  => dogfood), NOT file-presence; AC7 asserts all 3 on-disk shapes incl partial-scaffold.
  (2) AC1 precedence CLI > answer-file > recorded > inferred + no-TTY answer-file
  test. (3) AC5 doctor profile in BOTH text (render.ts now in files_to_modify) + JSON.
  (4) AC8 scope matches expanded files_to_modify. All r3 patches, no new mechanism.'
---

# What to review

Read `backlog/ready/2026-06-02-084-install-profile-split.md` at commit `01156081573c10cba0b4e0d2646a6a34c72600d2`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
