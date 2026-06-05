---
item_id: "2026-06-05-092-release-workflow-and-voting-ci"
round: 1
reviewer: "codex"
artifact_sha: "374de35bc27f21981bb6c3e148cf3a666b583b45"
completed_at: '2026-06-05T20:58:14Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Acceptance Criteria / AC1-AC2"
    finding: "The spec says every OS validates the SAME .tgz, but it does not require a build-once artifact handoff. Patch AC1/AC2 to mandate one build job that runs npm pack, uploads the tarball plus checksum, validation jobs that download and verify that exact artifact on ubuntu/macos/windows, and a publish job that uses the downloaded artifact only after all validation jobs pass."
  - severity: "medium"
    where: "Acceptance Criteria / AC2 and files_to_modify / package.json"
    finding: "The release tag, package.json version, and packed tarball name can drift. Patch AC2 to require an explicit assertion that GITHUB_REF_NAME without the leading v equals package.json version before publishing, or define the exact versioning step that makes them match."
  - severity: "medium"
    where: "Acceptance Criteria / AC3"
    finding: "A GitHub required branch-protection check cannot be made required by editing .github/workflows/ci.yml alone unless the repo already uses a required aggregate job. Patch AC3 to define the repo-local mechanism: either make the existing required aggregate job depend on onboarding/windows-compat, or state that branch-protection/ruleset configuration is a founder/manual follow-up outside this file list."
  - severity: "medium"
    where: "Acceptance Criteria / AC4 and files_to_modify / tests/packaging/packed-manifest.test.ts"
    finding: "The packed-manifest snapshot contract is underspecified and may require files not listed in files_to_modify. Patch AC4 to specify that the test parses npm pack --dry-run --json, snapshots only a sorted files[].path list with stable normalization, and either uses an inline snapshot in tests/packaging/packed-manifest.test.ts or adds the external snapshot file path to files_to_modify."
  - severity: "medium"
    where: "Acceptance Criteria / AC6"
    finding: "AC6 says not to touch backlog/, but the builder protocol for this repo requires lifecycle edits such as moving the item to pending_review and recording agent notes. Patch AC6 to scope the restriction to implementation/product files, with an explicit carve-out for required backlog lifecycle metadata and run-log updates."
---

## Review

The proposed release shape is implementable, but the spec needs the patches above before a builder can execute it without guessing at artifact identity, CI voting semantics, snapshot ownership, and required lifecycle edits.
