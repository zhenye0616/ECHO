---
item_id: 2026-05-25-071-role-definition-format-and-defaults
round: 2
spec_commit_sha: f61cc966cc49b0fbafcf76bc7caed337c7075d61
artifact_path: backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md
class: narrow
requested_at: '2026-05-25T23:00:23Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 71bdceb8-4a0b-4b8d-9e29-e9686630e314
focus_hints: 'r2 verifies r1 patches landed: (1) RoleLoadOptions on public surface
  of both loadRoleFromFile + loadRolesFromDir in AC2.2 code block (not just R3 prose);
  (2) smol-toml@^1.6.1 floor in AC2.5 + DoD with GHSA-v3rj-xjv7-4jmq reference; (3)
  AC4.1 tests 15-22 (missing-table/field) + 23-25 (skillsRoot overload) + 26-28 (grammar/traversal)
  all listed; (4) AC4.2 tests 9-12 (assertDefaults) with explicit message-text expectations;
  (5) AC2.4 two-step (grammar BEFORE filesystem lookup + path-containment); (6) Tests
  + DoD counts updated to 40 total. No new structural changes; proceed if patches
  faithful and no new issues.'
---

# What to review

Read `backlog/ready/2026-05-25-071-role-definition-format-and-defaults.md` at commit `f61cc966cc49b0fbafcf76bc7caed337c7075d61`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
