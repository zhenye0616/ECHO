---
item_id: "2026-05-25-075-first-demo-workflow"
round: 1
reviewer: "codex-ops"
artifact_sha: "a98957d61802bd74a7318d42b1525481bd67e0cd"
completed_at: '2026-05-26T08:31:15Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-075-first-demo-workflow.md:143-176; backlog/ready/2026-05-25-075-first-demo-workflow.md:247-257"
    finding: >-
      The default workflow can be absent from a packed/runtime install while onboarding still appears to succeed. 075 adds assets/echo-workflows/change-review.toml and syncs from assets/echo-workflows, but the inherited 074 package files allowlist packs only dist, package.json, and README, while this spec explicitly forbids package.json changes. Combined with AC2.2 treating source-missing as non-error and AC3 not requiring workflowsResult to participate in overallOk, echoctl init can finish without installing ~/.echo/workflows/change-review.toml; the first demo then fails later with no workflow installed. Patch the spec to include the workflow asset in the packed install contract, require syncAll/overallOk to fail or visibly report missing default workflow assets, and add a pack/install or syncAll test that proves change-review.toml is present and copied in the installed runtime shape.
  - severity: "high"
    where: "backlog/ready/2026-05-25-075-first-demo-workflow.md:88-93; backlog/ready/2026-05-25-075-first-demo-workflow.md:184-192"
    finding: >-
      AC1.3 says Priority 3 covers working tree plus index, but the exact command is plain git diff, which excludes staged changes. In a common staged-only demo repo, Priority 3 returns empty, the agent falls through to git diff HEAD~1..HEAD, and the review reports on the previous commit instead of the user's current staged diff. Patch the prompt invariant and tests to use a staged-aware command such as git diff HEAD (or an explicit cached+unstaged pair) before the last-commit fallback.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-075-first-demo-workflow.md:167-178; backlog/ready/2026-05-25-075-first-demo-workflow.md:228-233"
    finding: >-
      AC3 wires a new write target under ECHO_HOME_PATHS.workflows, but it does not require extending syncAll's directory-component symlink guard to that directory. The copied role-sync helper only refuses a symlink at the final workflow file path; if ~/.echo/workflows or a parent component is a symlink, mkdirSync/atomicWrite can write the default workflow outside ~/.echo during init. Patch AC3 to add ECHO_HOME_PATHS.workflows to the existing syncAll dirChecks and extend the adapter-sync integration test with a symlinked workflows directory/component failure case.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The spec is close, but there are runtime holes that would show up in the first unattended or packed-install demo path. The main fixes are to make the workflow asset actually ship and affect onboarding success, correct the prompt's staged-diff command, and apply the established symlink guard to the new workflows write target.
