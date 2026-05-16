---
item_id: 2026-05-16-057a-coord-substrate-and-observability
round: 4
combined_at: '2026-05-16T05:52:10Z'
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
| 1 | MEDIUM | both (convergent at L216-217) | …057a….md:216-217 (last-miss restart blind spot — in-memory slot universe + clear watermark map empty after restart) | accepted — AC6 fully patched | spec_sha 1ba9440: slot universe is now derived deterministically from `coord-roles.json` (roles × event_types-with-expects); clearing rule applied DURING the on-demand atom-log scan (no separate in-memory watermark map). After restart, `coord_status()` does a fresh O(coord-atom-count) scan and reconstructs both slot universe AND clear state from the durable atom log alone. No restart blind spots remain. Verify r5. |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | …057a….md:177-186 (storage seam boundary semantics + time-to-seq under skewed emitted_at) | accepted — AC3 storage seam rewritten | spec_sha 1ba9440: dropped `getCoordSequenceAtOrAfter` entirely (timestamp-order semantics couldn't compose with append-order replay). V1 reconstruction does full-ledger replay from `sequence_id=1` to `getCurrentCoordSequence()` snapshot at boot. Boundary now half-open `[sinceSeq, +∞)` filtered to `sequence_id <= highSeq`. `getCurrentCoordSequence` returns `max(rowid)` (not `max+1`). Boundary-safety asserted by new AC8 fixture: append after watermark, re-iterate from `last_full_replay_watermark + 1`, the new atom is iterated — no skip. V1 ceiling: substrate atom volume < 3k/day, full scan in milliseconds. V1.5+ may re-add bounded-scan with append-time watermarks. Verify r5. |
| 2 | MEDIUM | codex-ops | …057a….md:176-186 (boot replay can skip late-appended/skewed-emitted_at atoms) | accepted — AC3 storage seam rewritten (same fix as codex F1) | spec_sha 1ba9440: same root cause; same fix. codex-ops explicitly named full-replay as an acceptable option. AC8 fixture covers late-appended atom with old emitted_at not skipped at boot (full-ledger replay processes it). Verify r5. |

## Convergence call

needs r5 — verify_focus: (1) AC3 storage seam reduced to two methods (`iterateCoordAtomsByAppendOrder` half-open + `getCurrentCoordSequence` returns max(rowid)); `getCoordSequenceAtOrAfter` removed entirely; (2) V1 reconstruction algorithm: full-ledger replay from `sequence_id=1` to snapshot of `getCurrentCoordSequence()` at boot, no time horizon, V1.5+ deferral explicit; (3) reconciliation boundary semantics — half-open + watermark-plus-one ensures no skip and no double-processing across pass boundaries; (4) AC6 last-miss derives slot universe from `coord-roles.json` (deterministic across restart); clearing rule applied DURING the scan (no in-memory watermark map); the durable atom log is the SOLE source of truth; (5) AC8 fixtures: boundary-safety (append after watermark → next pass picks it up); late-appended-with-old-emitted_at not skipped at boot; restart-fresh-process-no-preloaded-state for last-miss visibility. Convergence trend r1→r2→r3→r4: 7→6→5→3 findings; 4H/3M → 2H/4M → 1H/4M → 0H/3M. r5 expected to produce 0-1 findings if patches close cleanly; ≥3 findings is the asymptote signal.

