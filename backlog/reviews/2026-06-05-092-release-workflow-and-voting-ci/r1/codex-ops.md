---
item_id: "2026-06-05-092-release-workflow-and-voting-ci"
round: 1
reviewer: "codex-ops"
artifact_sha: "374de35bc27f21981bb6c3e148cf3a666b583b45"
completed_at: '2026-06-05T20:58:36Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-05-092-release-workflow-and-voting-ci.md:AC3"
    finding: "The spec says editing .github/workflows/ci.yml flips onboarding/windows-compat to a required gate, but required checks are enforced by branch protection or rulesets, not workflow YAML alone. Patch AC3 to either include the repo protection/ruleset update and a gh api verification command, or narrow the claim to an unquarantined failing CI job if protection is managed manually."
  - severity: "medium"
    where: "backlog/proposed/2026-06-05-092-release-workflow-and-voting-ci.md:AC2"
    finding: "The release workflow can fail unattended at publish time if the repository default GITHUB_TOKEN permissions are read-only. Patch AC2/release.yml requirements to set explicit permissions including contents: write for the release publishing job, while keeping validation jobs read-only."
  - severity: "medium"
    where: "backlog/proposed/2026-06-05-092-release-workflow-and-voting-ci.md:AC2 and AC5"
    finding: "The spec requires a dry-run/rehearsal but only defines a v* tag trigger, so review verification may require creating a real tag or release. Patch the acceptance criteria to require a workflow_dispatch dry-run path that runs the same pack plus OS-matrix install/selftest/doctor steps and skips release creation unless invoked by a real v* tag."
---

## Codex-Ops Review

Operationally, the release shape is close, but the spec needs the patches above before a builder can produce an unattended-safe workflow. The main gaps are enforcement and verification surfaces: CI requiredness needs an operator-verifiable branch-protection contract, release publishing needs explicit token permissions, and the rehearsal path needs to be runnable without creating production release state.
