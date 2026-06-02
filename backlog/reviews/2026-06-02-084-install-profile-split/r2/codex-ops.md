---
item_id: "2026-06-02-084-install-profile-split"
round: 2
reviewer: "codex-ops"
artifact_sha: "8b24d18b9b779dc1351273261e41da352ca84aad"
completed_at: '2026-06-02T07:55:00Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:78; backlog/ready/2026-06-02-084-install-profile-split.md:82; backlog/ready/2026-06-02-084-install-profile-split.md:84-85"
    finding: >-
      AC4 now deterministically treats an existing valid schema-v1 onboarding file without `profile` as legacy dogfood, but the spec still lets a fresh customer install create that exact intermediate state before profile persistence. If `ensureEchoHome()` writes `onboarding.json` and the process is interrupted or a later init step fails before AC1 persists `profile: customer`, the next unattended rerun has no way to distinguish partial fresh state from legacy state and will resolve dogfood, reinstalling the coord surface on a customer machine. Patch AC1/AC4 to require profile resolution/persistence before any fallible sync/wire step, preferably by deciding `had_onboarding_before_init` before `ensureEchoHome()` and writing the fresh onboarding file with `profile` atomically, and add a retry/partial-scaffold regression to AC6 or AC7.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:74; backlog/ready/2026-06-02-084-install-profile-split.md:80; backlog/ready/2026-06-02-084-install-profile-split.md:84-85"
    finding: >-
      AC2b says customer reprofile pruning must never delete user-authored files, but AC6/AC7 only require seeded echo-owned stale artifacts to be removed. J6 still allows roles/workflows without an ownership marker to fall back to known shipped asset names, which can become a runtime data-loss path if a user has a same-named role/workflow file or a vendor command lacking the echo-owned marker. Patch the test contract to seed non-echo-owned files in `~/.echo/skills`, vendor command dirs, `~/.echo/roles`, and `~/.echo/workflows` and assert they survive a customer install; if roles/workflows have no marker today, require an explicit ownership predicate before pruning them.
---

# codex-ops review

Verdict: proceed_after_patches.

## Findings

1. MEDIUM - The deterministic legacy rule still has a retry hazard: a fresh customer install that is interrupted after onboarding scaffold creation but before profile persistence can be reclassified as legacy dogfood on the next run. Make profile persistence part of the pre-sync scaffold path and cover the partial-state retry.

2. MEDIUM - The prune safety contract needs a preservation test, not only a stale-artifact removal test. Without it, role/workflow pruning can satisfy the leak fix while still deleting user-authored files when ownership markers are absent or incomplete.

## Ops notes

The r1 fixes cover the main production leak: customer installs now prune stale hop-1/hop-2 dogfood skills, roles, and workflows; role/workflow skips are successful no-ops; and fresh-vs-legacy missing-profile behavior is deterministic. The two remaining gaps are failure-retry and deletion-safety edges around those fixes.
