---
item_id: "2026-05-25-074-echo-cli-binary"
round: 4
reviewer: "codex"
artifact_sha: "604e4fdd15e6a4e4a5317bc42b1d3a6d63095e8e"
completed_at: '2026-05-26T06:39:32Z'
verdict: "proceed_after_patches"
findings:
  - severity: medium
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:645"
    finding: >-
      AC7.3 case 5 still says a marker-file symlink conflict exits 0, but AC4.1 step 4 now derives exit 1 whenever cleanupConflicts is non-empty, and AC7.3 case 12 uses the same symlink shape to require exit 1. A builder cannot satisfy both contracts for the same unresolved cleanup conflict. Patch case 5 to say the loop continues and the file is not touched, but the final uninstall exit is 1, or remove it in favor of case 12.
  - severity: medium
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:109,524-547,656-667"
    finding: >-
      J8 requires `echoctl run` to fall back from no `--project` and no git root to the stored `default_project`, but that value lives in `projects.json` per 070 while AC5.4's public seams only expose `stateOnboardingPath` and the step list only reads `onboarding.json`. AC7.4 also never exercises the default-project fallback, only the explicit `--project` branch. Add a `stateProjectsPath`/ProjectsState read to the runRun contract and a git-rootless default-project test, or remove the fallback from J8 so the implementation surface and tests match.
  - severity: medium
    where: "backlog/ready/2026-05-25-074-echo-cli-binary.md:670-671"
    finding: >-
      The new SIGTERM gap tests are directionally right but the described timing is not deterministic enough to prove the gaps. In a normal async dispatch loop, a `setImmediate(() => process.emit('SIGTERM'))` scheduled from step 1 completion runs after the promise continuation that can already spawn step 2, turning case 12a into another mid-step signal test. Case 12b likewise names a Promise.race between `dispatchWorkflow` resolution and the next microtask, but the spec provides no seam that guarantees the signal lands before runRun's exit-code derivation. Patch AC7.4 to specify a deterministic fake-spawn/scheduler hook that emits the signal after the child is closed and no child is in flight but before the next spawn or exit-code branch, then assert the first-priority receivedSignal path is what makes the exit 130/143.
---

# Codex review

Verdict: `proceed_after_patches`.

The r4 artifact closes the r3 load-bearing classes: the binary rename has cascaded, the false absolute-path override is no longer a current contract, the doctor probe now pins the Streamable HTTP headers, and the exit-code priority order checks `receivedSignal.current` first. I do not see a new HIGH design blocker.

The remaining issues are bounded patches: one stale uninstall test expectation, one missing `projects.json` seam/test for the documented project fallback, and one signal-gap test timing detail that should be made deterministic so the previous HIGH stays closed.

## Findings

1. **medium** - `backlog/ready/2026-05-25-074-echo-cli-binary.md:645`

   AC7.3 case 5 still says a marker-file symlink conflict exits 0, but AC4.1 step 4 now derives exit 1 whenever `cleanupConflicts` is non-empty, and AC7.3 case 12 uses the same symlink shape to require exit 1. A builder cannot satisfy both contracts for the same unresolved cleanup conflict. Patch case 5 to say the loop continues and the file is not touched, but the final uninstall exit is 1, or remove it in favor of case 12.

2. **medium** - `backlog/ready/2026-05-25-074-echo-cli-binary.md:109,524-547,656-667`

   J8 requires `echoctl run` to fall back from no `--project` and no git root to the stored `default_project`, but that value lives in `projects.json` per 070 while AC5.4's public seams only expose `stateOnboardingPath` and the step list only reads `onboarding.json`. AC7.4 also never exercises the default-project fallback, only the explicit `--project` branch. Add a `stateProjectsPath`/ProjectsState read to the `runRun` contract and a git-rootless default-project test, or remove the fallback from J8 so the implementation surface and tests match.

3. **medium** - `backlog/ready/2026-05-25-074-echo-cli-binary.md:670-671`

   The new SIGTERM gap tests are directionally right but the described timing is not deterministic enough to prove the gaps. In a normal async dispatch loop, a `setImmediate(() => process.emit('SIGTERM'))` scheduled from step 1 completion runs after the promise continuation that can already spawn step 2, turning case 12a into another mid-step signal test. Case 12b likewise names a `Promise.race` between `dispatchWorkflow` resolution and the next microtask, but the spec provides no seam that guarantees the signal lands before `runRun`'s exit-code derivation. Patch AC7.4 to specify a deterministic fake-spawn/scheduler hook that emits the signal after the child is closed and no child is in flight but before the next spawn or exit-code branch, then assert the first-priority `receivedSignal` path is what makes the exit 130/143.
