---
item_id: 2026-07-04-113-signal-window-interface
round: 1
combined_at: '2026-07-04T19:25:12Z'
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
| 1 | MEDIUM | codex | AC1 / AC3 | accepted — patched | AC3 pins the exact predicate (`sequence_id >= sinceSeq`, half-open `[sinceSeq, +∞)`, matching the coord contract in `interface.ts`), the sort keys (append-order `sequence_id ASC` when `cursor` set; event-time `(timestamp DESC, id DESC)` otherwise), and the composition rule (cursor AND since/until/scope/loop intersect). |
| 2 | MEDIUM | codex | AC3 / AC4 | accepted — patched | AC3 adds a generalized watermark accessor mirroring `getCurrentCoordSequence()` (`max(sequence_id)`, `0` if none); AC4 now snapshots `W = getCurrentSequence()`, so the late-arrival test is implementable with no backend-specific probe. |
| 3 | MEDIUM | codex | AC1 / AC6 / files_to_modify | accepted — patched | AC1 states normalization is assembled independently in `signal-window.ts` (no `src/mcp/internal` imports; wire-caps live only in `cluster-engine.ts`); `files_to_modify` marks the independent-impl intent and `spec_refs` re-marks `cluster-engine.ts` as reference-only (read, not modified) — avoids a cluster-engine refactor that Out-of-Scope forbids. |
| 4 | MEDIUM | codex | Tests | accepted — patched | Added a `## Tests` section: concrete file paths + assertions for backend parity, coord-seam non-regression, late-arrival, determinism, scope mapping, union, and the no-wire-cap import-closure check; command `npm test` + `npm run typecheck`. |
| 5 | MEDIUM | codex-ops | :31 (AC1) | accepted — patched | AC1 return is now `{ entries, nextSinceSeq }`: every entry carries `sequence_id`, and `nextSinceSeq` (= high-watermark + 1) is defined even for empty windows so an unattended consumer durably advances. Tests require both non-empty and empty-window advancement. |
| 6 | MEDIUM | codex-ops | :33 (AC3/AC4) | accepted — patched | Same patch as #1/#2 — `>=` vs `>` pinned to `sequence_id >= sinceSeq`; AC4's `sinceSeq: W+1` example aligned (A at `W+1` is returned; `W` is the pre-append watermark). No off-by-one. |
| 7 | MEDIUM | codex-ops | :33 (AC3 coord seam) | accepted — patched | AC3 requires `iterateCoordAtomsByAppendOrder`'s external behavior (coord prefix filter, ordering, `sinceSeq` boundary, watermark) to stay unchanged and `tests/storage/iterate-coord-by-append-order.test.ts` to stay green; the Tests section calls out that existing test as non-regression. |

Reframe gate: not triggered — r1, no prior-round `spec-r*-patches` commits exist for this item, so zero findings target a prior-round patch (< 2). No fresh-context investigator required. All 7 findings target original spec text and are dispositioned as accepted spec-tightening patches.

## Convergence call

`needs R2` — verification round. All 7 MEDIUM findings accepted and patched into the spec (AC1 return contract + `sequence_id`/`nextSinceSeq`, AC3 pinned predicate + generalized watermark accessor + sort/composition + coord-compat, AC4 watermark snapshot, AC6 import-closure test, new `## Tests` section, `files_to_modify`/`spec_refs` normalization-location clarifications). Patches applied → default branch (b): dispatch a verification round.
focus_hints: Verify AC1 `{entries, nextSinceSeq}` return with `sequence_id` per entry and empty-window advancement; AC3 `sequence_id >= sinceSeq` half-open predicate + generalized watermark accessor + sort/composition (cursor AND event-time) + coord-seam non-regression; AC4 `W = getCurrentSequence()` snapshot; AC6 import-closure test; the new `## Tests` section paths are concrete and falsifiable; normalization stays out of `src/mcp/internal`.

