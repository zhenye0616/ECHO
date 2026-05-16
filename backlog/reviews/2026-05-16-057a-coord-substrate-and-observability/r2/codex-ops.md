---
item_id: "2026-05-16-057a-coord-substrate-and-observability"
round: 2
reviewer: "codex-ops"
artifact_sha: "3e571c070d4506b938805e40e6cb3707c724a1c8"
completed_at: '2026-05-16T05:03:02Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:158,165-167"
    finding: >-
      The restart idempotency path still leaves an overdue record open. Reconstruction first rebuilds the in-memory cache from durable coord:deadline_missed atoms, then replays the original open event and calls fireMissedDeadline for overdue records. But fireMissedDeadline says a cache hit returns before the terminal removal step, so any record whose miss was already persisted before a daemon crash/restart can remain in the open map forever: every 1s heartbeat rechecks it, no duplicate atom is appended, and coord_status keeps reporting a stale open deadline. Patch the spec so a cache-hit miss is terminal too, either by removing R before returning on cache hit or by having reconstruction suppress already-missed records, and add a restart-after-fired fixture that asserts no stale open record remains.
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:145-147"
    finding: >-
      The daemon loader is required to read tools/review-queue/coord-roles.json during startMcpServer(), but the spec does not pin path resolution to the repo/module root or a configured absolute path. In unattended launchd/cron-style starts the process cwd is often not the repository root, so a valid config can turn into a startup failure for the whole MCP daemon. Patch AC2 to require cwd-independent resolution and a startup test that chdirs outside the repo before calling startMcpServer().
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:100,106,167-168"
    finding: >-
      Reconstruction and periodic reconciliation replay coord atoms in emitted_at order even though emitted_at is caller-supplied and only canonicalized, not daemon-assigned. A delayed or clock-skewed wrapper can therefore make restart replay diverge from live ingest order: for example a tick_start with an earlier emitted_at than reviewer_invoked replays first, fails to close the invocation, and the later reviewer_invoked reopens a stale tick_start deadline that can miss after restart. Patch the spec to replay by durable append order/atom id, or require the daemon to reject/normalize out-of-order event times enough that emitted_at sorting is safe, with a fixture for out-of-order emitted_at values.
---

# codex-ops review

Verdict: `proceed_after_patches`.

Findings:

1. [high] Restart idempotency still has a stale-open-record path. If a `deadline_missed` atom is already durable before restart, reconstruction loads its key into the cache, rebuilds the original overdue open record, and then `fireMissedDeadline()` returns on the cache hit before removing the record. That turns a crash-after-append or ordinary restart-after-fire into a permanent heartbeat/status loop unless the cache-hit branch is also terminal.

2. [medium] `coord-roles.json` path resolution is not operationally pinned. `startMcpServer()` should not depend on the daemon's current working directory, especially under launchd or cron-style starts.

3. [medium] Replay order should not depend on caller-supplied `emitted_at`. The durable ledger has append order; reconstruction/reconciliation should use that, or the daemon needs a stricter timestamp contract that makes `emitted_at` ordering equivalent to ingest order.

Notes:

- The r2 spec closes the earlier subject-role, startup-gate, source-prefix, and status-horizon issues at the contract level.
- I do not see a new launchd cadence overlap issue in 057a itself because production wrapper emission remains out of scope until 057b.
