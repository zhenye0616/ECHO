---
item_id: "2026-06-21-106-granola-meeting-signal-extraction"
round: 2
reviewer: "codex"
artifact_sha: "248910e3e30091875312fd3d220c79f7c4cc373a"
completed_at: '2026-06-22T06:23:01Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC4 — Durable lease"
    finding: "The claims file mechanism says temp-file + rename, which makes writes atomic but not claim acquisition atomic across concurrent workers. Two ticks can both read no claim, both write, and both extract. Patch AC4 to require a real acquisition primitive such as an exclusive per-note claim file, lockfile around read-modify-write, or compare-and-swap stale reclaim, and make the overlap test assert that only one contender acquires the lease."
  - severity: "medium"
    where: "AC3/AC4 — Latest-wins and failed-run manifests"
    finding: "Failed-run manifests are introduced in AC4 but not reconciled with AC3's current-run definition. As written, a failed manifest can become the unsuperseded current run and retrieval may return no signals or hide the last successful extraction. Patch the spec to define manifest status semantics explicitly, including whether failed attempts supersede successful runs, how retrieval selects the latest successful signal run, and what source updated_at or input fingerprint prevents retry spin until the next settled update/version bump."
---
