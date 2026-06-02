---
item_id: "2026-06-02-084-install-profile-split"
round: 1
reviewer: "codex-ops"
artifact_sha: "d817b39ffef281bb29f56b7a8003be2af671ac8c"
completed_at: '2026-06-02T07:46:48Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:69; backlog/ready/2026-06-02-084-install-profile-split.md:76-80"
    finding: >-
      AC2/AC3/AC6 assert that a customer install leaves no coord skill, roles, or workflows, but the spec only requires filtering what future sync copies. It never requires pruning dogfood artifacts already copied by an earlier all-surface install or by a prior dogfood-profile run. The current sync path is write/noop oriented, so `~/.echo/skills/using-echo-coord.md`, vendor command copies, `~/.echo/roles/`, and `~/.echo/workflows/` can survive and keep surfacing `/using-echo-coord` after `echoctl init --profile customer` returns success. Patch AC2/AC3/AC6 to require removal of echo-owned dogfood-only files when the resolved profile is customer, including second-hop vendor commands and role/workflow outputs, and add a smoke/test seeded with stale dogfood artifacts.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:61; backlog/ready/2026-06-02-084-install-profile-split.md:75; backlog/ready/2026-06-02-084-install-profile-split.md:78"
    finding: >-
      Locked #2 and AC1 require fresh installs to default to customer while recorded profiles are respected, but AC4 leaves a missing `profile` in pre-084 `onboarding.json` as `dogfood` OR `customer` at builder discretion. At runtime those are different states: no onboarding state is a fresh customer install, while a valid old onboarding file without `profile` is the founder/dogfood compatibility path. If both collapse to customer, the next unattended re-init on the founder's existing machine strips the coord surface; if both collapse to dogfood, a fresh install can inherit the wrong profile once state is scaffolded before resolution. Patch AC4 to make the transition deterministic, e.g. no onboarding file => customer, existing valid schema-v1 onboarding missing `profile` => dogfood (or an explicit migration warning) before any profile-gated sync runs.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-084-install-profile-split.md:77; backlog/ready/2026-06-02-084-install-profile-split.md:80-81"
    finding: >-
      AC3 says the customer profile skips role/workflow sync, but AC6/AC7 do not require the existing `syncAll` success contract to treat that skip as healthy. The current `computeOverallOk` path treats a missing `workflowsResult` as failure, so a straightforward gate can install the correct customer surface and still make default `echoctl init` exit non-zero or render degraded during the foreign-install smoke. Patch AC3/AC7 to require customer-profile skipped roles/workflows to be represented as successful no-op/skipped results, and cover that with adapter-sync/init tests rather than merely omitting the calls.
---

# codex-ops review

Verdict: proceed_after_patches.

## Findings

1. HIGH - Customer-profile reruns need to prune stale dogfood files, not only filter future copies. Otherwise an upgraded or previously dogfood-wired machine can keep exposing `/using-echo-coord` after a customer re-init reports success.

2. MEDIUM - The missing-profile migration rule needs to distinguish fresh no-state installs from valid pre-084 onboarding files. The current builder-choice wording can either downgrade the founder's dogfood surface or make a fresh install default dogfood depending on where resolution happens.

3. MEDIUM - Skipping roles/workflows must still be a successful `syncAll` result. Without an explicit no-op/skipped success contract, the default customer install can become operationally correct on disk but still fail init/smoke because `workflowsResult` is absent.

## Ops notes

The judgment calls otherwise look operationally sound: explicit `--profile` beats brittle auto-detection, hop-1 filtering is the right customer boundary, untagged skills defaulting to customer is acceptable, and skipping roles/workflows for customer is the right product shape once the cleanup and success-result contracts are made explicit.
