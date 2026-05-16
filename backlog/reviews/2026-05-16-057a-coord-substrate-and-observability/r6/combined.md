---
item_id: 2026-05-16-057a-coord-substrate-and-observability
round: 6
combined_at: '2026-05-16T06:10:54Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 7
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
| 1 | MEDIUM | codex | …057a….md:219 (volume-warning metric + atom shape) | accepted — warning mechanism dropped at AC6 + AC8 | spec_sha fa31338: r5 warning was over-engineered relative to r5 codex-ops F2's "perf fixture OR runtime warning" disjunction. Both bugs (rowid-vs-coord-count metric + scheduler_health atom opens unclose-able deadline) argued against shipping the warning at V1. Dropped from AC6 + AC8; V1.5+ adds proper observability (count primitive + non-deadline-opening atom + coord_status visibility) as a single design. Verify r7. |
| 2 | MEDIUM | codex-ops | …057a….md:181-182, 219 (rowid-as-count false-positive) | accepted — same fix as codex F1 (warning dropped entirely) | spec_sha fa31338: same root cause as codex F1's metric concern; same fix. The sparse-coord/busy-capture false-positive scenario codex-ops described is exactly why the warning was wrong-headed at V1. Verify r7. |
| 3 | MEDIUM | codex-ops | …057a….md:219, 223, 246-247 (warning not visible in coord_status/CLI) | accepted — warning dropped entirely | spec_sha fa31338: status-visibility concern is moot once the warning mechanism is dropped. V1.5+ design will surface volume signal in coord_status() output directly. Verify r7. |

## Convergence call

needs r7 — verify_focus: (1) AC6 L219 V1 perf bound is perf-fixture-only — NO runtime warning mechanism; r5 startup-warning text deleted entirely; (2) AC8 L246-247 `coord-volume-perf.test.ts` asserts only the two budgets (reconstruction <1500ms, coord_status <300ms); NO assertion of any warning log line or warning atom; (3) V1.5+ deferral explicit and names three components together (count primitive + non-deadline-opening atom + coord_status visibility); (4) no other regression. Trend r1→r2→r3→r4→r5→r6: 7→6→5→3→2→3 findings; 4H/3M → 2H/4M → 1H/4M → 0H/3M → 0H/2M → 0H/3M. The r6 uptick was contained refinement of an over-engineered r5 patch (the warning I myself drafted). r7 expected to be terminal (0-1 finding); ≥2 findings or HIGH/pushback = re-escalate.

