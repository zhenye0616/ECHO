---
item_id: "2026-05-19-063-raycast-sessions-as-objects"
round: 7
reviewer: "codex-ops"
artifact_sha: "59e50258061f9d4bac20b702478c878534ea587c"
completed_at: '2026-05-19T23:54:23Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md:256"
    finding: >-
      AC6.4 cancels the pending debounce timer and then awaits the final update/end writes, but it does not require draining an already-fired debounced recordSessionUpdate whose async LocalStorage read/modify/write is still in flight. At runtime, the 80ms timer can fire just before subprocess exit, read an older running row, then resolve after the final update + recordSessionEnd sequence; that stale write can either resurrect status="running" or overwrite the final answer/auditCalls with a truncated mid-run snapshot, depending on how mergeRowAndWrite applies terminal precedence. AC8.12(b) names the 80ms boundary, but it only asserts no duplicate/lifecycle regression and AC8.12(c) only proves final-update-before-terminal-end ordering; neither forces a stale in-flight debounced write to resolve after the terminal write while preserving the full final body. Require a per-session write queue or an explicit await/invalidation of any in-flight debounced flush before step 2, and extend AC8.12(b) to use the delayed-async LocalStorage mock with an already-started stale flush that resolves last.
---

## Review Notes

The r7 patch set correctly removes Older from EmptyState, makes Delete conditional on running status, and makes the final update/end writes explicitly awaited. The remaining issue is a production ordering case at the debounce boundary: cancellation only stops future timers, not a LocalStorage write that already began.
