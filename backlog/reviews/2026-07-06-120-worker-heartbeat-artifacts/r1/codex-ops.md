---
item_id: "2026-07-06-120-worker-heartbeat-artifacts"
round: 1
reviewer: "codex-ops"
artifact_sha: "4f346177632468c1016598330d82158b7155bfe6"
completed_at: '2026-07-06T00:54:21Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-06-120-worker-heartbeat-artifacts.md:AC2"
    finding: "AC2 says heartbeats are written for ok/skipped/error/degraded results but the heartbeat status union has only ok/degraded/disabled, so unattended tick failures can be mapped inconsistently or hidden as ok. Patch the spec to define the status mapping explicitly, at minimum skipped -> ok and tick error -> degraded with a reason."
  - severity: "medium"
    where: "backlog/proposed/2026-07-06-120-worker-heartbeat-artifacts.md:AC1"
    finding: "writeWorkerHeartbeat is required to use ECHO_HOME_PATHS.state but the spec does not require creating or verifying the parent state directory before atomicWrite. In a fresh or launchd-created ECHO_HOME where the state dir is missing, every heartbeat write can be swallowed as best-effort logging and the worker stays invisible. Patch AC1/AC5 to mkdir the parent directory recursively before the atomic overwrite and add a fresh-home test."
---

## Findings

1. AC2 needs an explicit heartbeat status mapping for non-ok worker results. Without it, the runtime contract consumed by the doctor can vary by worker, and an unattended tick failure may still look healthy.

2. The writer should ensure the heartbeat directory exists before calling `atomicWrite`. Best-effort swallowing is correct for protecting workers, but a missing parent directory is a common first-run operational failure that would otherwise erase the observability this item is meant to add.
