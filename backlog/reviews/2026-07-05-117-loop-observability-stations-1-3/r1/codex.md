---
item_id: "2026-07-05-117-loop-observability-stations-1-3"
round: 1
reviewer: "codex"
artifact_sha: "2aebedfb0799d248162c208c61b0a215fc216e65"
completed_at: '2026-07-05T22:25:55Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Acceptance Criteria / AC4 - serving-code identity"
    finding: "AC4 says to report which process serves the MCP port, but the prescribed source is the existing daemon probe with running/reachable/pid-lock. A pid-lock is not proof of the port owner and can be stale or point at a different process while another process owns :38478, so the B6 fix can falsely classify packaged-dist versus src-dev. Patch AC4 to require a concrete port-owner lookup with fallback behavior, or downgrade the claim and render identity as unknown/degraded when ownership cannot be proven."
  - severity: "medium"
    where: "Acceptance Criteria / AC5 - station 3 packet pipeline"
    finding: "AC5 requires seed-store counts for the canonical path plus the item-116 terminal store, and intake-bridge enabled/disabled per env flag, but it does not name the exact seed-store paths/globs or the env variable/default semantics. Patch AC5 to list the concrete paths under ECHO_HOME or repo state and the exact env flag name, including absent/unset behavior, so implementation and tests are not guessing."
  - severity: "medium"
    where: "Acceptance Criteria / AC3 - station 2 signal worker health"
    finding: "AC3 defines failing-notes as last_failure_at newer than the note's last success, but the spec does not identify the checkpoint field for last success or define behavior when last success is absent. Patch AC3 with the exact fields and comparison rules for failed, never-successful, and recovered notes so the flag is computable and fixture tests are deterministic."
---
