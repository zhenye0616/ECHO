---
item_id: "2026-06-05-090-adopt-selftest-onboarding-harness"
round: 1
reviewer: "codex"
artifact_sha: "17c714ac1059fe9e84b5992f5ed58a67d2e0a760"
completed_at: '2026-06-05T20:03:35Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-05-090-adopt-selftest-onboarding-harness.md:spec_refs"
    finding: "The spec depends on an uncommitted external worktree at ~/Desktop/Project_echo--onboarding-ci as the source for src/cli/commands/selftest.ts, so the builder cannot reproduce the port from the pinned repository artifact alone. Patch the spec to either commit/embed the orphaned implementation or replace the external reference with exact implementation requirements and testable contracts."
  - severity: "medium"
    where: "backlog/proposed/2026-06-05-090-adopt-selftest-onboarding-harness.md:AC2"
    finding: "The hermetic port contract is underspecified: 'ephemeral/free port' does not say how that port is allocated, passed to the daemon, and reused by MCP/client checks. Patch AC2 to name the concrete mechanism and require a sentinel test that occupies 38478 while selftest succeeds or fails fast without contacting that listener."
  - severity: "medium"
    where: "backlog/proposed/2026-06-05-090-adopt-selftest-onboarding-harness.md:AC3/AC4"
    finding: "The CI quarantine contract is ambiguous: AC3 asks onboarding/selftest to run across Windows before 091 lands Windows fixes, while AC4 only quarantines windows-compat assertions and says the compat job is non-required. Patch the spec to state the exact YAML behavior for every non-voting or allowed-failure leg, especially Windows onboarding/compat, so 090 can keep main green without relying on branch-protection settings outside files_to_modify."
---

## Review

The direction is implementable after the spec patches above. The main gaps are reproducibility of the orphaned source, the exact port isolation mechanism, and the CI voting/quarantine semantics.
