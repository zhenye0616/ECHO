---
item_id: 2026-05-16-057a-coord-substrate-and-observability
round: 1
combined_at: '2026-05-16T04:51:38Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 2
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | …057a….md:90 (subject_role undefined) | accepted — AC1 patched | spec_sha 4203b86: `subject_role` is now a required validated field with registry-driven self-attestation vs invocation semantics; AC8 adds `subject-role-multi-under-one-correlation.test.ts`. Verify r2. |
| 2 | HIGH | codex | …057a….md:155 (atomic idempotency) | accepted — AC3 patched (convergent w/ F5+F6) | spec_sha 4203b86: AC3 rebuilt around single-actor serial mutation lane; `fireMissedDeadline` is the only append path, consults in-memory idempotency cache, removes record after fire. New AC8 fixture `deadlines-reconstruction-concurrency.test.ts` drives heartbeat+reconciliation on same overdue record. Verify r2. |
| 3 | MEDIUM | codex | …057a….md:164 (source_prefix semantics) | accepted — AC4 patched | spec_sha 4203b86: AC4 specifies one-of-required (sources[] OR source_prefix), union-on-both, byte-identical for legacy `sources[]`-only callers. AC8 adds `wait-for-new-turns-source-prefix.test.ts` with snapshot vs pre-AC4 baseline. Verify r2. |
| 4 | MEDIUM | codex | …057a….md:138 (TS loader boundary) | accepted — AC2 patched | spec_sha 4203b86: TS daemon loader at `src/coord/roles.ts` is the runtime boundary, called from `startMcpServer()` at boot; throws on bad config so daemon exits at startup. Python `_coord_roles.py` reduced to CI/static-check sibling. AC8 `coord-roles-validation.test.ts` revised to assert startup-time throw. Verify r2. |
| 5 | HIGH | codex-ops | …057a….md:155-160 (terminal lifecycle) | accepted — AC3 patched (convergent w/ F2+F6) | spec_sha 4203b86: `fireMissedDeadline` removes record from open map after appending (terminal lifecycle); idempotency cache prevents re-fire if race-path duplicate enters lane. New AC8 fixture `deadlines-fire-once-and-remove.test.ts`: 5 heartbeats on same overdue record → exactly 1 atom + record gone from `coord_status()`. Verify r2. |
| 6 | HIGH | codex-ops | …057a….md:149-160 (reconstruction concurrency) | accepted — AC3 patched (convergent w/ F2+F5) | spec_sha 4203b86: reconstruction is a hard startup gate (MCP server does not accept `coord_emit` until reconstruction completes); periodic reconciliation watermarks against `last_processed_atom_id` and runs on the same serial lane so cannot race live ingest. AC8 fixture covers `tick_end`-during-reconstruction and heartbeat-during-reconciliation. Verify r2. |
| 7 | MEDIUM | codex-ops | …057a….md:181-186 (status horizon) | accepted — AC6 patched | spec_sha 4203b86: AC6 widens recent-missed horizon to `max(role.max_deadline_sec)` (≥24h) and adds per-role-per-event-type last-miss list that ignores horizon so an overnight outage's `deadline_missed` atom stays visible until a successful close clears it. AC8 `coord-status-shape.test.ts` extended with 48h-old miss fixture. Verify r2. |

## Convergence call

needs r2 — verify_focus: (1) AC1 `subject_role` self-attestation vs invocation enforcement and registry-driven validation; (2) AC2 TS loader at `src/coord/roles.ts` called BEFORE tool registration in `startMcpServer()` and bad-config behavior is daemon-startup throw not per-request failure; (3) AC3 single-mutation-lane invariant + terminal lifecycle in `fireMissedDeadline` + reconstruction startup gate + reconciliation high-watermark protocol all hang together as one design (the three reviewer findings F2+F5+F6 are convergent on this); (4) AC4 byte-identical legacy `sources[]`-only contract is testable via snapshot; (5) AC6 per-role-per-event-type last-miss persistence-of-failure semantics are unambiguous; (6) AC8 new fixtures cover the load-bearing invariants without 057b dependency.

