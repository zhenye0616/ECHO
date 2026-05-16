---
item_id: "2026-05-15-057-coord-layer-narrow-append-and-deadlines"
round: 1
reviewer: "codex-ops"
artifact_sha: "c9b712865f67a6c7a5aab6ed07ce4ef40461d695"
completed_at: '2026-05-16T03:35:05Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:113-122,167-169,207,219"
    finding: >-
      The deadline model still starts only after a reviewer emits tick_start, so it does not catch the motivating unattended failure class where launchd/coord_invoke starts a wrapper and the wrapper dies before it can emit anything. AC0 says coord_invoke returns after spawn and AC7 emits tick_start from the wrapper, while AC3 only opens deadlines on tick_start and AC8's silent-fail fixture also emits tick_start before exiting. If production fails in the current pre-tick_start zone (bad repo root, missing TMPDIR, bad prompt path, curl unavailable, shell gate failure), no coord atom is appended and no deadline_missed can ever fire, so the strategist is back to waiting for file-side outcomes or combine timeouts. Patch the spec to create a durable pre-spawn/pre-wrapper expectation, such as coord:reviewer_invoked or coord:tick_expected from coord_invoke/request.py that expects tick_start, and add a merge-blocking test where the fake wrapper exits before any coord_emit call.
  - severity: "high"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:114-117,207"
    finding: >-
      The spec makes the coord layer additive and keeps launchd polling as the durability fallback, but it never says coord_emit/coord_invoke failures are non-fatal or bounded. The current wrapper runs under set -euo pipefail, so adding an unguarded curl POST to 127.0.0.1:38478 can abort the reviewer tick when the daemon is down, or hang the wrapper long enough to overlap the next StartInterval when the daemon accepts a connection but stalls. The same applies to request.py after the request.md commit: if coord_invoke failure returns non-zero, operators will retry a request that already exists and may create duplicate active triggers. Patch AC0/AC7 to require short connect/total timeouts, best-effort emission with stderr/log diagnostics, and success of the underlying queue operation even when coord observation is unavailable.
  - severity: "medium"
    where: "backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:113-118,167-169,195-199"
    finding: >-
      The deadline_missed idempotency key is sha256(correlation_id + '|deadline_missed'), but AC0 uses one correlation_id to coordinate a round across multiple reviewers and AC6 reports per-role missed deadlines. If codex and codex-ops share the same correlation_id and both miss tick_end, the first deadline_missed atom suppresses the second during heartbeat or boot reconstruction, leaving coord_status with a false per-role health picture. Patch the key to include at least role, event_type, expected completion event, and schema_version (or require per-role correlation_ids and document the aggregation key separately), then cover the two-reviewer-same-correlation miss case in the reconstruction/idempotency tests.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The substrate direction is workable, but these patches are needed before build: the silent-fail test has to cover no-`tick_start`, coord instrumentation must not be able to break the fallback queue path, and missed-deadline idempotency needs to stay per-role under shared round correlation.
