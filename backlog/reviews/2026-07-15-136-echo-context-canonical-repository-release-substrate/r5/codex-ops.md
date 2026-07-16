---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 5
reviewer: "codex-ops"
artifact_sha: "28f70ee0595ab062cd6bef628c85a0cadfabf119"
completed_at: '2026-07-16T03:24:50Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC6 — release publication contract"
    finding: "The exact tag/ref name and GitHub release flags are unspecified. A workflow could publish the prerelease version as a normal/latest release while satisfying the current readback. Define the tag/ref and release fields, require `draft: true` during staging, `prerelease: true` and `make_latest: false` at publication, and verify them after ambiguous responses and final readback."
  - severity: "medium"
    where: "AC6 — empty-namespace checks and publication concurrency"
    finding: "The exhaustive namespace check occurs only before the first write; workflow concurrency does not exclude concurrent manual, API, or other-workflow mutations. The current final readback could therefore declare success despite an extra tag, release, or asset. Require paginated stage-specific exact-set checks before subsequent writes and a final check proving the namespace contains only the marked tag, release, and three assets."
  - severity: "medium"
    where: "AC6 — cancellation, rerun, and migration evidence"
    finding: "The marker uses `run_attempt`, but the durable record requires only each dispatch run ID and terminal conclusion. GitHub reruns reuse the run ID, leaving failed attempts, orphaned workflow artifacts, and cleanup outcomes ambiguous. Require a per-attempt ledger containing run ID, run attempt, job start/conclusion, workflow artifact ID/digest, and cleanup disposition, with recovery tests after upload and each external-write boundary."
---
