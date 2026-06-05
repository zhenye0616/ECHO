---
item_id: "2026-06-05-090-adopt-selftest-onboarding-harness"
round: 2
reviewer: "codex"
artifact_sha: "67be1ac2595cd2c5f38a4f8252e015afc15b661f"
completed_at: '2026-06-05T20:16:15Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "spec_refs / AC1"
    finding: "The spec still makes the orphaned worktree load-bearing: `spec_refs` includes `src/cli/commands/selftest.ts` as a must-read reference to `~/Desktop/Project_echo--onboarding-ci`, and `files_to_modify` relies on orphaned line numbers. Patch by removing that entry from `spec_refs` or marking it explicitly optional outside `spec_refs`, and make AC1 fully reconstructable with the exact stable check IDs or check-id inventory required by the JSON contract."
  - severity: "medium"
    where: "AC2 — Port allocation"
    finding: "The atomic port mechanism is still underspecified for an implementer constrained to the listed files. `selftest binds :0 then threads the resolved port to the daemon config` can degrade into check-then-bind unless the daemon itself binds `:0` and exposes the resolved port, or the spec names another concrete handoff that keeps ownership atomic. Patch AC2 to name the exact allowed mechanism, and add any daemon/config file to `files_to_modify` if current code must change to support it."
  - severity: "medium"
    where: ".github/workflows/ci.yml files_to_modify / AC3"
    finding: "The voting contract contradicts itself: the frontmatter says `quality` is the only voting gate in 090, while AC3 says green `onboarding` legs vote. AC3 also refers to onboarding matrix legs without defining the onboarding matrix dimensions. Patch by choosing the intended contract, naming the exact onboarding matrix, and specifying the YAML-level per-leg `continue-on-error` expression or matrix include flag."
  - severity: "medium"
    where: "AC2 — Cleanup"
    finding: "Cleanup requires removing throwaway HOME/ECHO_HOME/CODEX_HOME on success, failure, and timeout, but the explicit test only asserts no spawned daemon remains after forced failure/timeout. Patch the test contract to assert temp-state removal for all three exit paths, plus the no-daemon-left assertion already named."
---
