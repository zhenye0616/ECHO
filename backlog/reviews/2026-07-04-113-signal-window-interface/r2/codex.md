---
item_id: "2026-07-04-113-signal-window-interface"
round: 2
reviewer: "codex"
artifact_sha: "301784c7a241d4bcef2e7a8780906afafa585477"
completed_at: '2026-07-04T19:31:59Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Acceptance Criteria / AC1 - the contract"
    finding: "The spec exposes opts.limit but requires nextSinceSeq to be the current scope high-watermark + 1. If a cursor window is truncated by limit, persisting that cursor skips matching entries that were not returned. Patch AC1/Tests to define limit cursor semantics, e.g. when limit truncates results nextSinceSeq is last returned sequence_id + 1, otherwise watermark + 1, and add a contract test for a limited cursor read."
---
