---
item_id: "2026-07-04-113-signal-window-interface"
round: 2
reviewer: "codex-ops"
artifact_sha: "301784c7a241d4bcef2e7a8780906afafa585477"
completed_at: '2026-07-04T19:31:55Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 — the contract"
    finding: "`limit` is present in opts, but AC1 always defines `nextSinceSeq` as the current scope high-watermark + 1; an unattended consumer using a limited page can persist a cursor past entries that were never returned. Patch the spec to define limit-aware cursor advancement: either disallow/ignore `limit` for cursor reads, or return `nextSinceSeq = last returned sequence_id + 1` when a limited page is truncated, with a test covering the skipped-row case."
  - severity: "high"
    where: "AC1 — the contract / AC3 — generalized append-order seam"
    finding: "`entries` and `nextSinceSeq` can be read from separate storage observations; if an atom appends after the entries query but before the watermark lookup, the returned cursor can advance past an unseen atom. Patch the contract to require a single consistent snapshot/transaction, or capture a pre-query high-watermark and bound the returned rows to that watermark, with an interleaving/concurrency test proving no append can be skipped."
---
