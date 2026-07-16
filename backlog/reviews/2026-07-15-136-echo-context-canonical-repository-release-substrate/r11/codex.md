---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 11
reviewer: "codex"
artifact_sha: "1c7e894c14541db6b46be7d38cc5a42174d0bb11"
completed_at: '2026-07-16T06:12:33Z'
verdict: "pushback"
findings:
  - severity: "medium"
    where: "AC6 — fail-stop paragraph; Tests — response-plus-readback and lost-response fixtures"
    finding: "The artifact requires a cancelled or lost runner to reconcile, record every attempted write and last-observed state, and terminate with a failed conclusion. Those actions cannot run after hard runner loss, and workflow cancellation concludes as cancelled rather than failed, so this contract is not implementable. Separate surviving-controller failures from hard job or runner loss: make post-loss logging and reconciliation best-effort, require terminal non-success, rely on manual read-only reconciliation plus the empty-namespace preflight, and update the fixtures accordingly."
  - severity: "medium"
    where: "AC6 — draft, asset, and publish response-plus-readback mechanism"
    finding: "The REST mutation contract neither disables transport retries nor binds draft and asset readbacks to the stable IDs returned by successful responses. An SDK retry or concurrent delete-and-recreate with identical content could pass the logical trace and be adopted. Specify one mutation controller, exact endpoints and accepted status codes, retries disabled, returned release and asset IDs captured, and exact-ID readback and subsequent mutation; add transport-attempt-count and same-content replacement fixtures."
  - severity: "medium"
    where: "AC1 — repository creation followed by initial main push"
    finding: "Repository creation is an external write followed by the main push, but AC1 provides no unambiguous creation-response plus authenticated empty-repository readback gate. Its existing-repository stop rule also does not distinguish pre-existing state from the repository just created at this checkpoint. Require an absence preflight, exact successful creation response and repository ID, authenticated empty-state readback before push, and a lost or ambiguous creation-response fixture proving zero push."
  - severity: "medium"
    where: "AC3 — tools/fresh-clone-acceptance.sh command-surface contract"
    finding: "The script is required to invoke no executable beyond npm commands and `git fsck --full`, yet source mode explicitly requires `git rev-parse HEAD` and temporary-output management. Expand and test the direct-command allowlist, or move HEAD and temporary-directory handling behind a named package verifier so one falsifiable command-surface contract remains."
  - severity: "medium"
    where: "AC4 — required status-check hosting controls"
    finding: "The required checks are bound only by context names. GitHub branch protection can bind each required check to an expected GitHub App; without that binding, another app can publish the same context on the evaluated SHA and satisfy protection. Require all three check entries to be bound to the GitHub Actions app identity, and make the hosting verifier and negative fixtures reject missing or wrong app IDs."
---
