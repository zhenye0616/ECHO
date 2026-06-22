---
item_id: "2026-06-21-106-granola-meeting-signal-extraction"
round: 2
reviewer: "codex-ops"
artifact_sha: "248910e3e30091875312fd3d220c79f7c4cc373a"
completed_at: '2026-06-22T06:26:06Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-21-106-granola-meeting-signal-extraction.md:105"
    finding: "The lease is described as a JSON temp-file-plus-rename checkpoint, but that is durable storage, not mutual exclusion. Two overlapping daemon ticks can both read no active claim, both rename their updated JSON, and both start the LLM extraction. Patch AC4 to require an atomic compare-and-set under a file lock or a per-note exclusive lock/claim file, and add a concurrent-acquisition test proving only one worker enters extraction."
  - severity: "medium"
    where: "backlog/proposed/2026-06-21-106-granola-meeting-signal-extraction.md:108"
    finding: "The stale-claim TTL is reclaimable after 15 minutes, but the spec does not require the provider call to time out before that TTL or renew the lease while alive. A slow but still-running LLM call can be reclaimed by the next tick, creating overlapping calls and duplicate manifests. Patch AC4 to define either a heartbeat/lease extension or an extraction timeout strictly below GRANOLA_SIGNAL_LEASE_TTL_MS, with a slow-extractor test."
  - severity: "medium"
    where: "backlog/proposed/2026-06-21-106-granola-meeting-signal-extraction.md:95"
    finding: "Failed-run manifests are introduced as retry blockers, but latest-wins current-run resolution does not define how status:\"failed\" manifests participate. If failed manifests become current, a transient provider outage can hide the last successful signals; if they are ignored, the worker can reattempt every tick despite the no-spin contract. Patch AC3/AC4/AC5 to define failed-manifest semantics explicitly and test retrieval plus retry-blocking behavior after a failed run."
---
