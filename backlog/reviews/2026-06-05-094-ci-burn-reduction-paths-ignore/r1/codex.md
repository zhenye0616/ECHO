---
item_id: "2026-06-05-094-ci-burn-reduction-paths-ignore"
round: 1
reviewer: "codex"
artifact_sha: "f0ad7483e1fdf9fe6b8837f981adcf16845800c1"
completed_at: '2026-06-06T00:01:21Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-05-094-ci-burn-reduction-paths-ignore.md:70"
    finding: "AC3's fallback allows moving branch-rehearsal filtering into a job-level if, but files_to_modify, Locked decision 3, and AC5 all restrict the builder to trigger-block-only edits. Patch the spec so the tag-safe fallback is allowed explicitly, or constrain AC3 to a trigger-only mechanism that is actually implementable inside the two workflow files."
  - severity: "medium"
    where: "backlog/proposed/2026-06-05-094-ci-burn-reduction-paths-ignore.md:63"
    finding: "The spec chooses trigger-level paths-ignore for pull_request without addressing GitHub's required-check behavior when a workflow is skipped by path filters. Patch AC1/AC2 or Risks to state that no required checks currently depend on these skipped workflows, or require a job-level/no-op status approach for PRs if branch protection expects ci.yml or release.yml checks."
---
