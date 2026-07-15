---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 2
reviewer: "codex"
artifact_sha: "a3d83d7d8eae4d67854a0c57fe429d7dc808f79c"
completed_at: '2026-07-15T22:37:52Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC6 — source-release.yml dispatch and protected-environment trust boundary"
    finding: "The source SHA is checked against main, but the workflow definition itself is not bound to reviewed main. GitHub permits workflow_dispatch at another ref, so require `github.ref == refs/heads/main`, `github.sha == inputs.source_sha`, and the API-read main HEAD to agree; restrict the source-release environment deployment policy to main, read that policy back, and assert these guards in workflow-policy.test.ts."
  - severity: "medium"
    where: "AC6 — founder tuple presentation and publish-release inputs"
    finding: "A protected-environment approval does not itself encode the stated artifact tuple, and the spec does not define how expected lock/manifest inputs are compared with build results or how publish-release consumes the exact build outputs. Require build-artifact to emit the canonical tuple to the run summary and an immutable machine-readable record, export the artifact ID/digest and hashes as job outputs, fail on every expected-value mismatch, and make publish-release download by artifact ID and revalidate every tuple field; add static policy assertions."
  - severity: "medium"
    where: "AC6 — publication atomicity and no-clobber behavior"
    finding: "The initial main-head check plus final readback does not cover main advancing before publication or a failure after creating the tag/release but before all assets are verified. Re-read main immediately before the first write, stage the release as a draft, upload and verify all three assets before publishing it, and define safe same-run cleanup or founder disposition for partial tag/draft/upload state so retries cannot silently dead-end behind the no-clobber rule."
  - severity: "medium"
    where: "AC3, AC6, and Tests — fresh-clone artifact-verification contract"
    finding: "The generic fresh-clone script is required to run `verify:artifact` even when no release assets exist, while the post-release clone downloads three assets, but neither script has an argument or environment contract. Define exact archive/checksum/manifest and source-SHA/version inputs, distinguish source-only CI acceptance from post-release artifact acceptance without optional skips, and state the exact invocations and negative tests."
---
