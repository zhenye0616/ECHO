---
item_id: "2026-07-06-120-worker-heartbeat-artifacts"
round: 1
reviewer: "codex"
artifact_sha: "4f346177632468c1016598330d82158b7155bfe6"
completed_at: '2026-07-06T00:52:42Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Acceptance Criteria / AC1-AC2"
    finding: "Define the concrete exported TypeScript shape for `WorkerHeartbeat.counters` and the result-to-heartbeat status mapping. AC2 requires writing heartbeats for `ok`/`skipped`/`error`/`degraded` results, but AC1 only allows heartbeat statuses `ok`/`degraded`/`disabled`, so builders cannot know how `skipped` and `error` map without guessing."
  - severity: "medium"
    where: "Acceptance Criteria / AC4"
    finding: "Specify the implementation predicate for `degraded:true` using fields the drift sweep actually tracks or requiring a new local retryable-failure counter. The current text says every judge attempt must be a retryable infra failure, but the listed `DriftSweepResult` counters only expose aggregate `judge_failed`, so an implementation could incorrectly mark terminal judge failures as degraded."
  - severity: "medium"
    where: "Artifact / Tests"
    finding: "Add a concrete `## Tests` section with exact test file paths and commands. The ACs describe expected cases, but the spec does not name the test files to create under `tests/enrich/` or the vitest command/filter that proves the heartbeat contract, boot-disable writes, degraded drift case, malformed overwrite, and swallowed write failure."
---
