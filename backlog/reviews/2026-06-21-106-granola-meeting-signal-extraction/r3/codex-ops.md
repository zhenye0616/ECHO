---
item_id: "2026-06-21-106-granola-meeting-signal-extraction"
round: 3
reviewer: "codex-ops"
artifact_sha: "21f83e99a2e36e8a4fe9b7e19b2f9f583792a287"
completed_at: '2026-06-22T06:36:17Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-21-106-granola-meeting-signal-extraction.md:AC4 no-spin checkpoint"
    finding: "AC4 says the checkpoint records the last-attempted raw updated_at + extractor_version and suppresses re-attempts until either changes, while also saying a crash after signal atoms but before manifest must re-run next tick. Patch the spec to make checkpoint advancement ordered and outcome-scoped: never write/advance the checkpoint at attempt start; write it only after a terminal handled failure after retries, or after a success manifest has been durably appended. Otherwise an implementation can checkpoint first, crash before the manifest, and permanently suppress that note with no current run until Granola updated_at or extractor_version changes."
---
