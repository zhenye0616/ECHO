---
item_id: "2026-05-16-057a-coord-substrate-and-observability"
round: 6
reviewer: "codex-ops"
artifact_sha: "3c8135ed15dffac80b6bec3d776e27bbadcad824"
completed_at: '2026-05-16T06:09:13Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:181-182,219"
    finding: >-
      AC6 uses getCurrentCoordSequence() > 100_000 as the runtime volume threshold, but AC3 defines that method as max(rowid) over coord atoms, not the count of coord atoms. Because rowid is allocated from the shared events table, a production ledger with many normal capture events can have its first few coord atoms at rowid >100_000 and then log/emit volume-threshold warnings on every daemon restart even though coord_status() and reconstruction are scanning only a tiny coord set. This turns the warning into noisy false-positive telemetry and can mask the real high-volume condition later. Patch the warning contract to threshold on an actual coord-row count or measured coord scan latency, and add a sparse-ledger fixture with >100k non-coord events plus a small coord set that must not warn.
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:219,223,246-247"
    finding: >-
      The startup warning is required to be visible through existing log/status surfaces, but the spec only requires stderr plus a coord:scheduler_health atom with metadata.coord.warning. AC6's coord_status() response exposes last_scheduler_health timestamps, recent deadline misses, and per-role last misses; it does not expose scheduler_health metadata or a warnings section, and AC8 only asserts that the log line and atom exist. Under launchd, stderr is easy to miss, and the manual operator surface tools/coord-status.sh can still show a clean-looking status while the threshold warning exists only in forensic atom search. Patch AC6/AC8 to make the warning visible in coord_status() (for example a warnings[] or last_scheduler_health_warning field) and test that tools/coord-status.sh/MCP output carries it.
---

# codex-ops review

Verdict: proceed_after_patches

Findings:

1. [medium] The volume warning uses a sequence watermark as if it were a coord-volume count, which can false-warn on sparse coord ledgers once the shared events rowid is high.

2. [medium] The startup warning atom is not guaranteed to appear in the operator status surface; stderr plus a raw coord atom is not enough for unattended launchd recovery.

Notes:

- The r6 changes close the prior slot-universe source-of-truth issue: AC6 now derives slots from coord-roles.json expects, and AC8 has a direct assertion for that.
- The full-replay performance budget is falsifiable at 100k coord atoms, but the warning threshold and status visibility need the two runtime patches above before this is operationally trustworthy.
