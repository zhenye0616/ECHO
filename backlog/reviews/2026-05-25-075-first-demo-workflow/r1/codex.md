---
item_id: "2026-05-25-075-first-demo-workflow"
round: 1
reviewer: "codex"
artifact_sha: "a98957d61802bd74a7318d42b1525481bd67e0cd"
completed_at: '2026-05-26T08:31:54Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-075-first-demo-workflow.md:88"
    finding: >-
      AC1.3 pins Priority 3 as plain `git diff` while describing it as "working tree + index". Plain `git diff` excludes staged/index-only changes, so a staged-only diff falls through to `git diff HEAD~1..HEAD` and the first demo reviews the wrong content. Patch the prompt invariant to use `git diff HEAD` or an explicit `git diff --cached` + `git diff` pair, and update AC4.1 to assert a distinct Priority 3 command rather than the ambiguous substring `git diff`.
  - severity: "high"
    where: "backlog/ready/2026-05-25-075-first-demo-workflow.md:167"
    finding: >-
      AC3 wires workflow sync after role sync, but it does not require adding `ECHO_HOME_PATHS.workflows` to `syncAll()`'s directory-component symlink guard. AC2's per-file symlink check only catches the final workflow file; if `~/.echo/workflows` itself is a symlinked directory, `lstat(targetDir/file)` and `atomicWrite` follow that intermediate symlink and can write outside ECHO_HOME. Patch AC3/AC6 to add the workflows directory to the existing `dirChecks` guard and test a symlinked `~/.echo/workflows` directory stays untouched.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-075-first-demo-workflow.md:167"
    finding: >-
      The spec adds `workflowsResult` to `SyncResult`, but never says how workflow-sync outcomes feed `overallOk`, and AC6.2 only asserts the happy copied case. Current `syncAll()` computes `overallOk` from skills, agents, and roles; a builder can satisfy this spec while leaving `source-missing` or `error` workflow results non-fatal, making `echoctl init` report ready even though `echoctl run change-review` will not find the default workflow. Patch AC3 with an explicit `overallOk` policy for workflows and add failure-path adapter-sync tests for missing/error/user-modified workflow outcomes.
---

# Codex Review

Verdict: `proceed_after_patches`.

## Findings

1. **HIGH - Priority 3 misses staged changes** (`backlog/ready/2026-05-25-075-first-demo-workflow.md:88`)

   AC1.3 says Priority 3 should inspect "working tree + index" with `git diff`, but Git's plain `git diff` only shows unstaged working-tree changes. A branch with only staged changes returns empty at Priority 3, then the prompt falls through to `git diff HEAD~1..HEAD` and reviews the previous commit instead of the current diff. Replace that command with `git diff HEAD` or an explicit `git diff --cached` plus `git diff` pair. AC4.1 should also assert a distinct Priority 3 command; the current marker `git diff` is satisfied by the upstream and fallback commands even if the uncommitted priority disappears.

2. **HIGH - workflow directory symlink guard is missing** (`backlog/ready/2026-05-25-075-first-demo-workflow.md:167`)

   The existing `syncAll()` guard checks `ECHO_HOME_PATHS.skills`, `roles`, and `state` before any writes. AC3 adds writes under `ECHO_HOME_PATHS.workflows`, but does not require adding that directory to the same guard. AC2's final-file symlink rule is not enough: if `~/.echo/workflows` is itself a symlinked directory, the final `change-review.toml` path is not a symlink and `atomicWrite()` writes through the intermediate symlink. Add the workflows path to `dirChecks` and add an adapter-sync test where `~/.echo/workflows` points elsewhere and remains untouched.

3. **MEDIUM - workflow sync is not tied to `overallOk`** (`backlog/ready/2026-05-25-075-first-demo-workflow.md:167`)

   AC3/AC6 require returning `workflowsResult`, but do not define whether `source-missing`, `error`, or `user-modified` workflow results make `syncAll().overallOk` false. The current 072 code computes `overallOk` from skills, agents, and roles only. If 075 follows the written ACs literally, onboarding can still report success while the default workflow was not installed, and the first `echoctl run change-review` fails. Pin the policy and tests; at minimum, source-missing/error for the default workflow should fail `overallOk`, with an explicit decision for user-modified workflows.
