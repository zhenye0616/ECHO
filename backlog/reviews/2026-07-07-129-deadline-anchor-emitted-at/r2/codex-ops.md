---
item_id: "2026-07-07-129-deadline-anchor-emitted-at"
round: 2
reviewer: "codex-ops"
artifact_sha: "1409e5e47e07bf450455b34eadbc352aa1a92251"
completed_at: '2026-07-07T18:09:04Z'
verdict: "proceed"
findings: []
---

## Codex-Ops Review

No required operational patches. The spec covers the restart/runtime failure mode directly: deadline derivation is anchored on `emitted_at`, replay invariance is tested, late-appended old events expire truthfully, and malformed `emitted_at` falls back without throwing or producing invalid math. The gate also names concrete commands and isolates the two tolerated flakes, which is sufficient for unattended review-queue execution.
