---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 4
reviewer: "codex"
artifact_sha: "9997f07362d9fa7849c4069642019c536657ff77"
completed_at: '2026-07-15T23:14:42Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC6 — cross-version partial-state preflight"
    finding: "The publish-release job must decide whether existing tags, releases, and assets are attributed by raw/internal/migrations/2026-07-15-136-echo-context-repository-bootstrap.md, but that record is in Project_echo while AC4 forbids checking out Project_echo and no permitted API credential, dispatch input, or target-local ledger exposes it. Define a machine-readable authority source available under the declared permissions, or scope this first release to an empty namespace where every pre-existing tag, release, or asset stops for founder disposition; add fixtures for attributed, unattributed, and inaccessible state."
  - severity: "high"
    where: "AC6 — publication staging and run-owned identifier logging"
    finding: "Logging an API-returned identifier after creation is not atomic with the external write: runner loss after the server commits a draft, asset, or tag but before the response is logged leaves precisely the unattributable state this mechanism claims to prevent, and the location and owner of the referenced run log are undefined. Put run ID and run attempt into durable server-side metadata in each creation transaction where possible (for example the draft body and annotated-tag message, with assets owned through that draft), define recovery from a lost response, and test success-with-lost-response and cancellation fixtures."
  - severity: "medium"
    where: "AC6 — non-cancelling concurrency"
    finding: "Native GitHub Actions concurrency with cancel-in-progress false protects the running release but does not guarantee that every queued dispatch waits; GitHub retains at most one pending run and replaces an older pending run when another is queued. Patch the contract to permit and record replacement of a not-yet-started run before external writes, or prescribe a durable queue that provides the stated waiting semantics, and make the workflow-policy test assert the chosen behavior."
---
