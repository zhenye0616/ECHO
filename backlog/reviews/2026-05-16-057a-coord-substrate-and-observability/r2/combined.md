---
item_id: 2026-05-16-057a-coord-substrate-and-observability
round: 2
combined_at: '2026-05-16T05:04:36Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 3
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
| 1 | HIGH | codex | …057a….md:168 + storage/interface.ts:12 (no append-order seam) | accepted — AC3 + storage interface patched (convergent w/ codex-ops F6) | spec_sha b504b9e: added `Storage.iterateCoordAtomsByAppendOrder({sinceSeq?, untilSeq?, limit?})` to `src/storage/interface.ts`; SqliteStorage uses `rowid`, MemoryStorage uses monotonic counter. Reconstruction + reconciliation now replay in durable append order (sequence_id), not `emitted_at`. New AC8 fixture `tests/storage/iterate-coord-by-append-order.test.ts` proves parity across backends. Verify r3. |
| 2 | MEDIUM | codex | …057a….md:144 + package.json:34 (no JSON-Schema validator dep) | accepted — AC2 patched (ajv added) | spec_sha b504b9e: AC2 names `ajv@^8` + `ajv-formats@^3` as direct runtime deps; package.json added to files_to_modify. Loader uses `ajv` for schema validation + TypeScript code for the cross-field `max_deadline_sec > default_deadline_sec` constraint that JSON Schema draft-07 can't express. Verify r3. |
| 3 | MEDIUM | codex | …057a….md:165, 197 (event_type ambiguity in last-miss) | accepted — AC6 patched (key disambiguated) | spec_sha b504b9e: `coord:deadline_missed` atom payload now carries BOTH `metadata.coord.opened_event_type` AND `metadata.coord.expected_event_type`. AC6 per-role-last-miss list is keyed by `(subject_role, expected_event_type)` — the event the operator was waiting for. Clearing: successful event whose `event_type == expected_event_type` clears the entry; opener events do NOT clear. New AC8 fixture `last-miss-cleared-by-successful-close.test.ts`. Verify r3. |
| 4 | HIGH | codex-ops | …057a….md:158,165-167 (cache-hit leaves stale open record) | accepted — AC3 patched (real bug introduced by r1 patch) | spec_sha b504b9e: `fireMissedDeadline` cache-hit branch is now ALSO terminal — cache hit means the durable atom already exists, so skip append BUT STILL remove R from the open map. Restart-after-fired is now safe: reconstruction's cache priming + cache-hit-also-terminal invariant + first heartbeat → open record removed; no permanent heartbeat/status loop. New AC8 fixture `restart-after-fired-no-stale-open.test.ts`. Verify r3. |
| 5 | MEDIUM | codex-ops | …057a….md:145-147 (cwd-dependent path resolution) | accepted — AC2 patched (cwd-independent) | spec_sha b504b9e: loader resolves `coord-roles.json` via `new URL("../../tools/review-queue/coord-roles.json", import.meta.url)` (relative to the loader module's location), with `ECHO_COORD_ROLES_PATH` env override for tests. Daemon never depends on `process.cwd()`. New AC8 fixture `coord-roles-cwd-independent-path.test.ts` (chdir to / before startMcpServer). Verify r3. |
| 6 | MEDIUM | codex-ops | …057a….md:100,106,167-168 (emitted_at replay order vulnerability) | accepted — AC3 patched (convergent w/ codex F1) | spec_sha b504b9e: same fix as F1 — durable append order is the replay primitive; `emitted_at` is canonicalized but never used for ordering replay. Out-of-order `emitted_at` cannot corrupt the rebuilt open-record set. New AC8 fixture `out-of-order-emitted-at-replay.test.ts`. Verify r3. |

## Convergence call

needs r3 — verify_focus: (1) AC2 ajv dependency + cwd-independent path resolution via `import.meta.url`; (2) AC3 storage append-order seam (`iterateCoordAtomsByAppendOrder` shape across SqliteStorage rowid + MemoryStorage counter) is correctly threaded through reconstruction + reconciliation; (3) AC3 `fireMissedDeadline` cache-hit-also-terminal invariant — every code path through the function removes `R` from the open map (closes the r1-patch-introduced bug); (4) AC6 atom payload contract (`metadata.coord.opened_event_type` + `expected_event_type`) and (subject_role, expected_event_type) keying for last-miss; (5) AC8 the 5 NEW r2 fixtures (out-of-order-emitted-at-replay, restart-after-fired-no-stale-open, last-miss-cleared-by-successful-close, coord-roles-cwd-independent-path, iterate-coord-by-append-order) cover the load-bearing invariants. r1→r2 trend: finding count 7→6, severity 4H/3M→2H/4M — declining. r3 either converges or surfaces a third generation of issues introduced by r2 patches.

