---
item_id: "2026-05-16-057a-coord-substrate-and-observability"
round: 1
reviewer: "codex"
artifact_sha: "6d26e60aa287a40c016bb2a4b600fed600959f88"
completed_at: '2026-05-16T04:44:00Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:90"
    finding: >-
      `subject_role` is load-bearing for AC2/AC3/AC6 but is never defined as an input field or derived value. The tracker keys open records by `(tier-key, subject_role, event_type, expected_by)` and status reports per-role deadlines, while AC1 only requires tier keys plus `event_type`, `emitted_at`, and `schema_version`, and AC5's `X-Echo-Role` only derives the emitter/source. As written, a synthetic `reviewer_invoked` cannot say which reviewer's SLA to open unless the builder guesses that emitter role equals subject role, which breaks invocation-style events. Patch the spec to make `subject_role` explicit: whether it is a required validated field, when it may equal the derived emitter role, and how invalid/unknown roles are rejected, with AC8 assertions that two different subject roles under one correlation_id open and close independently.
  - severity: "high"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:155"
    finding: >-
      Deadline-miss idempotency is specified as a recent-log scan plus append, but AC3 also runs both a 1-second heartbeat and a 10-minute reconstruction/reconciliation path that can fire overdue records. The current storage seam (`src/storage/sqlite.ts:76-89`) has no uniqueness constraint or compare-and-insert primitive, so two in-process firing paths can both observe no existing `deadline_missed` atom and append duplicates for the same idempotency key. Patch AC3 to require a single serialized `fireMissedDeadline` path with an in-memory idempotency side-cache/mutex (or another concrete atomic guard) shared by heartbeat, boot reconstruction, and periodic reconciliation, and add a test that drives heartbeat plus reconciliation on the same overdue record and proves one atom is written.
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:164"
    finding: >-
      The `wait_for_new_turns(source_prefix="coord:")` mailbox contract conflicts with the current tool shape unless the spec explicitly changes validation. Today `WaitForNewTurnsParams` and the MCP schema require non-empty `sources[]` (`src/mcp/tools/wait-for-new-turns.ts:85-97,209-214,299-301`); AC4 calls `source_prefix` an optional sibling and then shows a prefix-only subscriber call. Patch AC4 to define the exact one-of/combined semantics: either `sources[]` or `source_prefix` must be present, prefix-only calls are valid, both together are either unioned or rejected, and legacy `sources[]` calls remain byte-identical. Add direct handler and MCP-schema tests for the prefix-only coord case.
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md:138"
    finding: >-
      AC2 says `_coord_roles.py` is called by `coord-emit.ts`/`coord-status.ts` at daemon startup, but the daemon is TypeScript and the current MCP server registers tools inside each POST request (`src/mcp/server.ts:100-117`), not at process boot. The existing `_reviewers.py` pattern is Python-only for review-queue scripts; it does not define a Node runtime loader contract. Patch the spec to name the real runtime boundary: add a daemon-owned TS role loader passed into `startMcpServer`/deadline tracking, or explicitly require a Python subprocess CLI with argv, output, and failure semantics. The bad-config test should prove daemon startup fails once, not that every tool request reparses config.
---

## Findings

1. HIGH — `subject_role` is never defined even though every deadline key depends on it.

AC3 keys and closes records by `subject_role`, and AC6 reports per-role status. AC1 only defines tier keys and common event fields, while AC5 derives the emitter source from `X-Echo-Role`. Those are different concepts for invocation events. The spec should explicitly define `subject_role`, validate it against `coord-roles.json`, and test two subject roles under one `correlation_id`.

2. HIGH — deadline-miss idempotency is not atomic across heartbeat and reconciliation.

The spec has a 1-second heartbeat, boot reconstruction, and 10-minute reconciliation, all capable of emitting `deadline_missed`. The proposed recent-log scan is not an atomic guard at the storage seam, so duplicate miss atoms are possible. Require one serialized firing path or equivalent in-memory idempotency guard, with a race-shaped test.

3. MEDIUM — `wait_for_new_turns(source_prefix="coord:")` needs an explicit validation contract.

The current implementation requires non-empty `sources[]`. AC4 adds `source_prefix` but does not say that `sources[]` becomes optional or what happens if both are supplied. Patch the one-of/union semantics and test prefix-only coord polling through both the handler and MCP schema.

4. MEDIUM — daemon startup validation for `coord-roles.json` is assigned to the wrong runtime boundary.

`_coord_roles.py` mirrors a Python review-queue helper, but the daemon and MCP tools are TypeScript, and tool registration is currently per POST request. The spec should name a TS daemon loader or a concrete Python subprocess contract, and the bad-config test should fail daemon startup rather than merely fail a tool call.
