---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 15
reviewer: "codex-ops"
artifact_sha: "47909a315bb4ba83fa4f6bd86bae805e42d4c722"
completed_at: '2026-07-16T10:19:22Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC6 — two manual release workflows and build-artifact discovery"
    finding: >-
      The external workflow_dispatch operations have no executable request, response, or lost-response contract. The build workflow also lacks a unique correlation input and run-name, so overlapping identical builds or an accepted-but-unacknowledged dispatch cannot be bound unambiguously to one run ID without selecting by name or recency, which the tests forbid. Require a production dispatch controller with one retry-disabled attempt, unique build and publish correlation identities, authenticated fully paginated exactly-one run readback, no redispatch after ambiguity, and delayed-run, pending-replacement, overlap, and coordinator-crash fixtures.
  - severity: "high"
    where: "AC6 — public Project_echo authorization-record read"
    finding: >-
      The assertion that the public Project_echo read introduces no credential is not operationally enforced. A normal actions/checkout persists GITHUB_TOKEN through Git configuration, so a later GitHub fetch from that checkout can silently send the target-repository token. Require persist-credentials:false, credential-helper, extra-header, askpass, and token-environment isolation for the public read, provision target mutation authentication only at the exact mutation boundary, and add a production-path test proving that no authorization material is sent.
  - severity: "medium"
    where: "AC6 — create-only release-authorization ref operation"
    finding: >-
      Authorization-ref creation is specified as a shell command, but no production state machine is required to own its preflight, sole mutation, porcelain parsing, authenticated readback, and fail-stop recovery. The fixture test could therefore validate a model that differs from the coordinator's irreversible operation. Add an injected production controller or CLI and exercise that exact path for pre-transport failure, timeout before and after application, malformed or additional porcelain, process death, and readback ambiguity; every uncertain result must consume the build, nonce, and ref and forbid publication.
  - severity: "high"
    where: "AC6 — source-release approval and annotated-tag publication"
    finding: >-
      The approval tuple binds the tag name and a publication-plan hash but does not require the exact annotated tag-object OID, canonical tag-object bytes, or complete tagger metadata, nor a canonical plan artifact from which the verifier must derive them. TAG_OBJECT_OID is selected and merely preverified after authorization, so the pushed object is not demonstrably the exact authorized object. Bind the OID and canonical construction fields or bytes through the approval, Project_echo record, dispatch, and verifier, with tampering fixtures.
  - severity: "medium"
    where: "AC6 — release asset upload response and production adapter tests"
    finding: >-
      The accepted upload response is required to carry an exact release binding and the controller retains release_id, but GitHub's release-asset HTTP 201 body does not provide a release_id field. Define release binding through the captured upload endpoint followed by authenticated enumeration under the captured release ID and exact asset-ID metadata and byte readback. Exercise the production REST, redirect, pagination, and porcelain adapters with protocol-faithful responses so fake dependencies cannot conceal this runtime mismatch.
---
