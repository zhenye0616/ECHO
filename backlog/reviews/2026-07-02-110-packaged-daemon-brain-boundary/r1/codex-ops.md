---
item_id: "2026-07-02-110-packaged-daemon-brain-boundary"
round: 1
reviewer: "codex-ops"
artifact_sha: "52272d3339d7033fdcdb9b5e69e83e9fbfb082e0"
completed_at: '2026-07-02T07:06:07Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-02-110-packaged-daemon-brain-boundary.md:AC3"
    finding: "AC3 allows the import-closure guard to walk dist/ against package files rules instead of inspecting the actual npm-packed file set. The runtime failure occurs after npm pack/install, so a rules approximation can silently diverge from npm packaging semantics and leave the unattended daemon crash undetected. Require the guard to resolve imports against the actual packed tarball or dry-run manifest shared with packed-manifest.test.ts, with temp artifact cleanup."
  - severity: "medium"
    where: "backlog/proposed/2026-07-02-110-packaged-daemon-brain-boundary.md:AC4 / Out of Scope"
    finding: "AC4 requires npm run test:product to pass while Out of Scope states tests/mcp/recent-calls-endpoint.test.ts is a known separate failure for item 111. If item 111 has not landed first, the builder cannot satisfy AC4 without touching an out-of-scope failure, which makes the unattended queue stall or report a false failure. Either add item 111 as blocked_by or carve the verification contract to the package and launchd tests until 111 is fixed."
---

## Ops Review

The boundary direction is operationally sound: hoist the shared brain modules into a packaged location and keep the 076 responder exclusion intact. The hoist list includes `preflightBrain`, which is the important runtime dependency for the daemon path.

The required patches are about making the unattended verification deterministic: the closure guard should test the actual package artifact, and the product-test contract should not conflict with the known item 111 failure.
