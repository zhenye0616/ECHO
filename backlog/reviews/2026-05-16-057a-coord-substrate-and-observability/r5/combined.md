---
item_id: 2026-05-16-057a-coord-substrate-and-observability
round: 5
combined_at: '2026-05-16T06:03:46Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
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
| 1 | MEDIUM | codex | …057a….md:153,168-171,216-217 (slot-universe sourced from "registry" but expects lives in coord-roles.json) | accepted — AC6 patched | spec_sha e26d4b0: slot universe explicitly built from `coord-roles.json["roles"][*].events.<event_type>.expects` ONLY. AC1 type-registry carries tier + subject-role policy but NOT `expects`. Single source of truth aligns with AC3 close/open/reconstruction which already reads from coord-roles.json. AC8 `coord-status-shape.test.ts` extended to assert slot universe is built from that one source. Verify r6. |
| 2 | MEDIUM | codex-ops | …057a….md:176-184, 217 (V1 perf bound not falsifiable; "bounded retention" misstatement) | accepted — AC6 patched | spec_sha e26d4b0: dropped "bounded retention" claim (storage is append-only). Added falsifiable AC8 perf fixture `coord-volume-perf.test.ts` — 100k atom ledger → reconstruction <1500ms, coord_status() <300ms. Added runtime startup warning: when `getCurrentCoordSequence() > 100_000` at boot, log structured `coord-substrate-volume-threshold-exceeded` AND emit a `coord:scheduler_health` atom with `metadata.coord.warning="volume-threshold"`. V1.5+ chooses actual mitigation (index / snapshot / retention) when threshold is approached. Verify r6. |

## Convergence call

needs r6 — verify_focus: (1) AC6 slot universe explicitly sourced from `coord-roles.json["roles"][*].events.<event_type>.expects` ONLY; AC1 registry is not referenced for `expects`; (2) AC6 V1 perf bound falsifiable — 100k-atom perf fixture asserts reconstruction <1500ms AND coord_status() <300ms; (3) AC6 volume-threshold warning — startup logs structured warning + emits coord:scheduler_health atom with metadata.coord.warning="volume-threshold" when getCurrentCoordSequence() > 100_000; (4) the "bounded retention" misstatement removed entirely from AC6; (5) no new architectural concerns introduced. Trend r1→r2→r3→r4→r5: 7→6→5→3→2 findings; 4H/3M → 2H/4M → 1H/4M → 0H/3M → 0H/2M. r6 expected to be 0-1 LOW/MED finding (terminal); ≥2 findings or HIGH/pushback signals 049 asymptote.

