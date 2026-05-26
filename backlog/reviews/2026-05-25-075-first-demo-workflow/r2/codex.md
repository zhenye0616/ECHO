---
item_id: "2026-05-25-075-first-demo-workflow"
round: 2
reviewer: "codex"
artifact_sha: "00246ec3241bb5346a210241350a4fdcbbc081f3"
completed_at: '2026-05-26T20:13:14Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC9.1-AC9.3 lines 275-289; src/echo-home/adapter-sync.ts:186-192 and 474-493 at 00246ec"
    finding: >-
      AC9 can pass while the packed-install path still cannot reach workflow sync. At the pinned SHA, repo-root discovery requires both package.json and skills/ before syncAll computes rolesSourceDir or workflowsSourceDir; when AC9.2 forbids adding skills/** to package.json files, a packed install still has no skills/ directory, so syncAll returns the repoRoot error before syncDefaultWorkflows can produce the source-missing/result behavior AC9.1 describes. The pack-shape test only proves the TOML is in the tarball, not that echoctl init can install it. Patch the spec to either include the root-discovery prerequisite in this scope/test, or explicitly narrow AC9 to an asset-packaging-only guard and move the packed echoctl init behavior to the 074 follow-up.
  - severity: "medium"
    where: "AC6.3 line 250; SyncResult interface in src/echo-home/adapter-sync.ts:124-141 at 00246ec"
    finding: >-
      The source-missing failure-path test asks for existing overallOk:false reason fields to expose the workflow failure, but SyncResult has no generic reason-field channel today - only typed fields like skillsPopulated, agents, roles, repoRoot, syncLock, and directorySymlink. Leaving the field name reviewer-tunable forces the builder either to invent a new public result field that the AC never names, or to satisfy an assertion against a non-existent surface. Name the exact field/shape to add, or make workflowsResult itself the required diagnostic channel.
  - severity: "medium"
    where: "AC6.3 line 251; syncAll order in src/echo-home/adapter-sync.ts:432-540 at 00246ec"
    finding: >-
      The suggested per-file error setup is likely to fail before workflow-sync runs. If the test chmods the ECHO_HOME_PATHS.workflows parent to 0000, syncAll cannot traverse ECHO_HOME to acquire the state lock, populate skills, or sync roles, so the function returns an earlier syncLock/skills failure with no workflowsResult instead of the expected workflowsResult.results[0].action === 'error'. Specify a setup that isolates writability to the workflows directory (for example precreate state/skills/roles, keep ECHO_HOME traversable, and make only the workflows target unwritable), or move this case to the syncDefaultWorkflows unit test where the targetDir can be controlled directly.
---

# Codex review

Verdict: `proceed_after_patches`.

The r2 dispositions cover the original diff-source, symlink-guard, overallOk, and narrow package asset points. The remaining gaps are in the acceptance contract rather than the intended mechanism: AC9 currently gives false confidence for packed installs because repo-root discovery still depends on a package path AC9 forbids shipping, and AC6.3 asks the builder to test/result-surface behavior that is not concretely available in the current `SyncResult` shape.

Patch those spec contracts and proceed.
