---
item_id: "2026-06-11-101-sharpest-five-fix-retro"
round: 3
reviewer: "codex"
artifact_sha: "b34134d0842e0675154a5ccd95be24a3a2fde238"
completed_at: '2026-06-11T18:41:13Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "src/mcp/tools/wait-for-new-turns.ts:39"
    finding: "The lossless paging proof is still too strong for the implemented per-source fetch window. With WAIT_MAX_RETURNED_TURNS=20 and WAIT_PER_POLL_LIMIT_PER_SOURCE=41, a single source containing 19 older rows followed by 30 rows sharing the boundary timestamp will fetch only 22 of that tie group; pollOnce then sets next_since to that timestamp and the next strict-greater query skips the remaining 8 rows. Patch by either increasing the per-source window to cover the documented boundary tie guarantee and adding this regression case, or narrowing the documented guarantee to the actual limit and warning that larger same-ms boundary groups can be skipped."
---
