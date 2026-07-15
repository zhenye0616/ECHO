---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 3
reviewer: "codex"
artifact_sha: "9cc29b1493659f8b3cbb433633232448aad3ae2c"
completed_at: '2026-07-15T22:54:38Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC6 — tuple handoff"
    finding: "The tuple record must contain the workflow artifact ID while being included inside that same immutable artifact, but GitHub assigns the ID only after upload finalization and re-uploading creates a new identity. Define a pre-upload inner tuple without artifact ID, then capture artifact ID and workflow-artifact digest as outer job outputs and run-summary fields; founder approval and publish-release must validate the combined tuple while retaining exactly three release assets."
  - severity: "medium"
    where: "AC3 — fresh-clone command and argument contract"
    finding: "The command surface is limited to the named npm scripts plus git fsck, yet the required flow also runs npm ci and directly invokes tools/build-source-artifact.mjs without a named build script or defined build/verify flags, output directory, and source-mode version derivation. Enumerate the exact allowed commands and interfaces, then add a governance test covering unknown, extra, duplicate, and wrong-mode arguments, source-build versus release-no-build behavior, and non-invocation of test:operator."
  - severity: "medium"
    where: "AC6 — publication staging and surviving partial state"
    finding: "Same-run cleanup and a concurrency group cannot enforce the promised founder-disposition stop after cancellation or runner loss, and rejection of only same-name state does not stop later runs for another version. Require a non-cancelling concurrency policy, run-owned markers and captured IDs, a next-run API preflight that detects surviving drafts, tags, or assets and stops, and tests for the exact draft-upload-verify-annotated-tag-publish sequence and cleanup behavior."
  - severity: "medium"
    where: "AC6 and Tests — hash-field and dispatch-input contract"
    finding: "The term artifact SHA-256 ambiguously covers both the source archive and the enclosing workflow artifact, while the approved tuple does not explicitly bind the checksum sidecar and no authoritative producer or test is defined for the pre-dispatch expected manifest hash. Name each hash distinctly, define how every release asset and workflow artifact is bound, specify who computes the expected landed-SHA values with which command, and test wrong expected lock and manifest hashes."
---
