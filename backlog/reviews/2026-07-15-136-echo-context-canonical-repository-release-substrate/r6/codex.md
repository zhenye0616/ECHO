---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 6
reviewer: "codex"
artifact_sha: "3d74d33bdf0a3bd81c409478b83b3702d4704c67"
completed_at: '2026-07-16T03:50:11Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC6 — run_attempt guard; Tests — rerun-rejection fixture"
    finding: "GitHub Actions cannot both fail a rerun and reject it before every job step executes: job-level `if: github.run_attempt == 1` skips jobs and can leave an all-skipped run successful, while a failed conclusion requires a step. Permit one read-only, permissions-empty rerun guard job to fail before any checkout, build, upload, environment, or publication step; put job-level run-attempt guards on all real jobs and update the fixture accordingly. Alternatively, explicitly accept and test an all-skipped rerun conclusion."
  - severity: "medium"
    where: "AC6 — workflow_dispatch inputs and build-artifact job; Tests — dispatch-input fixtures"
    finding: "The dispatch `version` input is never required to equal the version derived from package.json and the manifest, so it can be unused or can diverge from the tag, release, and asset identity. Require equality before workflow-artifact upload, use only that verified value for every tuple, filename, tag, and release field, and add a wrong-version fixture that fails before upload or deployment."
  - severity: "medium"
    where: "AC6 — manifest-hash lifecycle"
    finding: "The statement that the manifest hash is computed exactly once conflicts with publish-release re-hashing every contained file and fresh-clone verification. Clarify that the authoritative approved hash is first derived by the single build and is never supplied by dispatch or substituted, while every verifier must recompute and compare it."
  - severity: "medium"
    where: "AC6 — draft creation, annotated-tag readback, and final postcondition"
    finding: "An annotated `refs/tags/v<version>` ref points to a tag-object SHA, not directly to the approved source commit, and the draft has no testable target before that tag exists unless `target_commitish` is fixed. Require draft creation with `target_commitish` equal to the approved source SHA, prove no tag was implicitly created, then read `ref -> tag object -> commit` and verify the annotation, message, and peeled commit SHA. Add lightweight-tag and wrong-peeled-target fixtures."
  - severity: "medium"
    where: "AC6 — release publish flags and release-identity fixtures"
    finding: "`make_latest` is an update request parameter rather than a normal Release GET readback field, so requiring every readback to verify it directly is not implementable. Require the publish request's API wire value to be `make_latest: \"false\"`, read back `draft:false` and `prerelease:true`, and separately verify the release is not latest through a supported semantic endpoint or GraphQL field; align the fixtures with those checks."
  - severity: "medium"
    where: "AC6 — workflow-artifact ID and digest handoff"
    finding: "The spec does not define a fail-closed mechanism for validating the uploaded workflow artifact's digest before extraction; an ordinary exact-ID download can extract files without exposing the original archive bytes for the required comparison. Specify step-to-job output mappings, the pinned action or Actions artifact API, required `actions: read` permission, run/name/expiry ownership checks, raw archive hashing before safe extraction, and negative fixtures for wrong ID, wrong run ownership, expiration, and digest mismatch."
---
