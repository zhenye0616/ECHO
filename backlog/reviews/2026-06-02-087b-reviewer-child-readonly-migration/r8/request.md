---
item_id: 2026-06-02-087b-reviewer-child-readonly-migration
round: 8
spec_commit_sha: f6ae3727dd6179c2779b4fc1b0c05ad5529f2726
artifact_path: backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md
class: structural-reform
requested_at: '2026-06-03T07:50:13Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 304c6cb2-0a6b-4900-9c92-51b4e48b11cb
focus_hints: "r8 verifies the SCOPE BOUNDARY at spec SHA f45f9c49: the terminal capture-failure\
  \ marker is consumed by the reviewer SELECTOR (no reselect, in scope); native combine.py/watcher\
  \ 'capture-failed' classification is explicitly a SUCCESSOR (OoS + _followups) because\
  \ it touches the orchestration layer outside 087b's reviewer-child-migration files_to_modify.\
  \ Safe degradation: terminal failure surfaces via existing partial_responses\u2192\
  founder + closed coord deadline (tick_end) + queue-errors.md cause. Confirm this\
  \ scoping is coherent + acceptable for V1; the migration core (read-only child,\
  \ wrapper-publish, stdout_json final-message parse, wrapper-owned selection/lifecycle,\
  \ terminal-marker durability+diagnostic+tick_end, codex/codex-ops-only scope, ordering)\
  \ is complete. Assess whether 087b is claim-ready; do NOT introduce new orchestration-layer\
  \ scope."
---

# What to review

Read `backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md` at commit `f6ae3727dd6179c2779b4fc1b0c05ad5529f2726`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
