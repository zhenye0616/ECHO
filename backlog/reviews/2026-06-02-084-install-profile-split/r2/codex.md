---
item_id: "2026-06-02-084-install-profile-split"
round: 2
reviewer: "codex"
artifact_sha: "8b24d18b9b779dc1351273261e41da352ca84aad"
completed_at: '2026-06-02T07:55:41Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:16,80; src/cli/inverse/skills.ts:6-18,37-45 at 8b24d18"
    finding: >-
      AC2b points the builder at `src/cli/inverse/skill-files.ts`, but that file does not exist at the pinned SHA; the existing helper is `src/cli/inverse/skills.ts`. Because AC8 forbids touching files outside `files_to_modify`, the builder cannot safely change the actual inverse helper without either violating scope or inventing a new duplicate module. The existing helper also removes second-hop Claude commands only when it can compare them to a source copy under `echoSkillsDir`, so a customer prune that deletes/filters the hop-1 dogfood skill first can make the hop-2 command skip as `source-missing`. Patch the spec to name the real inverse file and pin the removal source/order, e.g. compare vendor commands against the packaged dogfood asset or remove hop-2 before deleting hop-1.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:74,80,84; src/echo-home/adapters/role-sync.ts:47-165 and src/echo-home/adapters/workflow-sync.ts:46-168 at 8b24d18"
    finding: >-
      AC2b still says role/workflow removal is gated by the existing echo-owned marker / 074 skill inverse discipline, but the current role and workflow sync code writes raw TOML by filename and never stamps an ownership marker. J6 mentions a possible known-asset-name fallback, but the acceptance criteria do not require a concrete safety predicate. A builder can satisfy the smoke by deleting seeded role/workflow files by name while still risking user-authored files with the same names, or avoid pruning them because the promised marker does not exist. Patch AC2b/AC6/AC7 to require the exact safe deletion rule for roles/workflows, such as only removing known default filenames when the target is a regular file whose bytes match the packaged source asset, while skipping symlinks and user-modified content.
---

# Codex Review - R2

Verdict: `proceed_after_patches`.

The r2 spec closes the r1 profile-default, stale-skill, and skipped-role/workflow success-contract gaps. Two implementability details still need patching before a builder starts: the inverse helper path/API is wrong for AC2b, and the role/workflow prune safety rule is not concrete against the current unmarked TOML files.

I did not read any task-state pointer. I reviewed the request, the pinned spec at `8b24d18b9b779dc1351273261e41da352ca84aad`, and the code surfaces needed to validate the AC2b/AC6 implementation seams.
