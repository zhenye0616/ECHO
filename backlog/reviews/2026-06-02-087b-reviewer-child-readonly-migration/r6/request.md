---
item_id: 2026-06-02-087b-reviewer-child-readonly-migration
round: 6
spec_commit_sha: 56fda75f2413b1cbe043c65cc64160276dbd0f2e
artifact_path: backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md
class: structural-reform
requested_at: '2026-06-03T07:22:29Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 06fcead2-0dd6-45c5-811d-3e77daec35b9
focus_hints: 'Verify r5 patch at spec SHA 296b57f4: the durable queue-errors.md row/marker
  carries a BOUNDED diagnostic summary (rc + failure class + truncated parse-error/stderr
  snippet) so a terminal capture-failure is diagnosable without the vanished $WT raw
  captures (AC2 + AC5 iv). Confirm this is bounded and does NOT drift into the evidence-dir
  successor (full raw-blob persistence stays OoS). No regression in prior contracts
  (stdout_json final-message parse, terminal-marker commit+push-before-cleanup, wrapper-owned
  selection/lifecycle, write-free child, codex/codex-ops-only scope, ordering).'
---

# What to review

Read `backlog/ready/2026-06-02-087b-reviewer-child-readonly-migration.md` at commit `56fda75f2413b1cbe043c65cc64160276dbd0f2e`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
