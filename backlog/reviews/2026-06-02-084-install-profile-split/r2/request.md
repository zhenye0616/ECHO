---
item_id: 2026-06-02-084-install-profile-split
round: 2
spec_commit_sha: 8b24d18b9b779dc1351273261e41da352ca84aad
artifact_path: backlog/ready/2026-06-02-084-install-profile-split.md
class: narrow
requested_at: '2026-06-02T07:52:05Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 169e7767-a7a6-4ea6-8ae5-3820a19dac77
focus_hints: 'Verify r1 patches at 8b24d18b9b779dc1351273261e41da352ca84aad: (1) AC2b
  customer install prunes echo-owned dogfood skills(hop-1+hop-2)+roles+workflows,
  marker-gated (no user-file deletion); AC6(ii) seeds stale artifacts+asserts removal.
  (2) AC4 deterministic: no onboarding file=>customer, valid pre-084 file w/o profile=>dogfood,
  keyed on pre-existence before resolution; both branches tested. (3) AC3 customer
  skip = successful no-op (computeOverallOk true), not degraded; adapter-sync tests
  added. (4) J6 prune safety covers skills+roles+workflows. (5) blocked_by 083 covers
  shared init.ts/smoke. AC8 no scope beyond expanded files_to_modify.'
---

# What to review

Read `backlog/ready/2026-06-02-084-install-profile-split.md` at commit `8b24d18b9b779dc1351273261e41da352ca84aad`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
