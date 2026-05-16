---
item_id: "2026-05-15-057-coord-layer-narrow-append-and-deadlines"
round: 4
reviewer: "codex-ops"
artifact_sha: "d9aa9ca3a95bac9044b09c9488ed32261d37c0fa"
completed_at: '2026-05-16T04:06:32Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:229"
    finding: >-
      AC5 still lists `request.py` as a wrapper-side curl/MCP emission path, while AC0 now says `request.py` makes zero MCP calls and only writes the local `correlation_id`. At runtime this stale instruction is dangerous: a builder following AC5 can reintroduce pre-push coordination traffic for a round that is not yet visible on origin/main, which is the exact false-healthy/no-candidate class AC0 is trying to remove. Remove `request.py` from the V1 emission-path list and keep its coord responsibility to UUID generation only.
  - severity: "high"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:129"
    finding: >-
      `coord_invoke(role, request_path?, correlation_id?)` does not require the spawned reviewer to bind its scan to that `request_path`. AC7 still says the wrapper performs the normal Step 2 scan and then reads the selected request's `correlation_id`. In a real queue with an older pending request, the active spawn for round R can review a different candidate, emit `tick_start` for that other request, and leave the daemon's `reviewer_invoked(correlation_id=R)` deadline open until a false `deadline_missed` fires. The spec needs either a pinned-request reviewer mode or an explicit invariant that active invokes cannot pass/open a round correlation until the wrapper has selected that exact request.
  - severity: "high"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:256"
    finding: >-
      AC7 only emits `tick_end` after the response file is committed and pushed. Normal clean no-op exits after `tick_start` are not covered: `combined.md` can appear during the review window, the same reviewer can lose the local `os.link` race, or the 050 upstream duplicate guard can exit 0 after another cadence tick already pushed the response. Those are expected launchd/active-trigger overlap paths, but the open `tick_start -> tick_end` deadline would remain unclosed and later page the operator with a false `deadline_missed`. Require a terminal coord event (for example `tick_end` with `outcome=stale_combined|duplicate_response`) for every clean exit after `tick_start`, or move the round-scoped open until after all duplicate/stale guards that can exit 0.
---

# codex-ops review

Verdict: proceed_after_patches.

The r4 fixes close the main correlation-id and scheduler-tier shape issues, but the spec still has three unattended-runtime traps that would show up as false health signals or false deadline misses under normal queue cadence overlap.
