---
item_id: 2026-06-13-102-orchestration-init-per-project
round: 4
spec_commit_sha: 83b1a5cd8ef53024f18aa0b82d571292e940ed4c
artifact_path: backlog/proposed/2026-06-13-102-orchestration-init-per-project.md
class: structural-reform
requested_at: '2026-06-13T09:26:29Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 74875604-c168-4d56-9e15-11d9a3ac20be
focus_hints: "R4 pure verification after removal-only cleanup 4276bdb4 (finished r2's\
  \ AC6 narrowing in files_to_modify + spec_refs). Confirm: command-dir override is\
  \ fully absent from 102's build surface (files_to_modify, spec_refs); 102 owns only\
  \ reviews_root-relative artifact paths; 102 still describes a runnable review loop\
  \ (reviewer command files reachable in-repo or synced). Expected: proceed, zero\
  \ findings \u2192 convergence. If you find anything new, say so explicitly."
---

# What to review

Read `backlog/proposed/2026-06-13-102-orchestration-init-per-project.md` at commit `83b1a5cd8ef53024f18aa0b82d571292e940ed4c`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
