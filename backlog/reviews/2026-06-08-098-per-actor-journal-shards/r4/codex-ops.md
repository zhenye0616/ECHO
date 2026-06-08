---
item_id: "2026-06-08-098-per-actor-journal-shards"
round: 4
reviewer: "codex-ops"
artifact_sha: "d558864206d74491ac80cb6cb28d6301baa94871"
completed_at: '2026-06-08T22:26:55Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC4 — No stale-path window"
    finding: "The merge-gate grep only matches concrete numeric bare paths like mcp-interactions-journal-2026-06.md, so an active instruction surface that still tells writers to use placeholder/template forms such as mcp-interactions-journal-YYYY-MM.md or mcp-interactions-journal-$month.md can pass the gate and keep appending to the frozen shared file after cutover. Patch AC4 to use a broader stale-write scan, or an equivalent explicit check, that catches bare shared monthly journal references in numeric, placeholder, and shell-template forms while still allowing shard paths, journal-cat globs, the LD4 historical cutover note, and clearly quoted history."
---
