---
item_id: "2026-07-06-122-live-loop-dashboard"
round: 1
reviewer: "codex-ops"
artifact_sha: "f33662c1c6924af42986e495c3d1d86c17f3d5c9"
completed_at: '2026-07-07T01:42:36Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-06-122-live-loop-dashboard.md:AC2/AC4"
    finding: "AC2 permits a child-process doctor fallback, but AC4 does not require the selected doctor reuse path itself to be covered by the read-only invariant. Patch the spec so the no-write test exercises whichever doctor path the builder chooses, with the child process rooted at the scratch ECHO_HOME when used; if the fallback cannot be proven read-only, require in-process doctor reuse instead."
  - severity: "medium"
    where: "backlog/proposed/2026-07-06-122-live-loop-dashboard.md:AC2"
    finding: "The `node dist/cli/index.js doctor --json` fallback has no runtime failure contract. On a fresh checkout, stale dist, nonzero doctor exit, or hung child, `/api/status` could 500 or stall instead of making the broken loop visible. Patch AC2/AC3 to require bounded timeout handling and degraded JSON/page output for missing dist, stale dist, nonzero exit, and parse failures."
  - severity: "medium"
    where: "backlog/proposed/2026-07-06-122-live-loop-dashboard.md:AC2"
    finding: "The cache/throttle requirement does not cover overlapping requests. If the cache is cold or expired and status computation is slow, concurrent page polls can start multiple doctor computations or child processes before a cache value is stored. Patch AC2 and tests to require single-flight recomputation, serving the last cached status with an in-flight or stale marker when available, and no unbounded process pileups."
---

## Review

The spec is close operationally, but the read-only and unattended-runtime contracts need the patches above before this is safe for the builder queue.
