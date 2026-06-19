---
item_id: 2026-06-19-105-ceo-loop-reasoning-brain
round: 3
spec_commit_sha: e05233718c4926767e5f40dd3252aada1d8356d2
artifact_path: backlog/proposed/2026-06-19-105-ceo-loop-reasoning-brain.md
class: narrow
requested_at: '2026-06-19T22:32:33Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 1a45f377-0f98-4c38-a7eb-89dc655fcf98
focus_hints: 'Verify the two r1-contract propagation fixes are consistent + complete:
  codex argv now includes --json and brain.test.ts asserts it; AC4 mandates process-group
  termination (detached/setsid + kill -pid SIGTERM->SIGKILL) with a descendant-survival
  regression test. Confirm no NEW inconsistency introduced; expected convergence round.'
---

# What to review

Read `backlog/proposed/2026-06-19-105-ceo-loop-reasoning-brain.md` at commit `e05233718c4926767e5f40dd3252aada1d8356d2`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
