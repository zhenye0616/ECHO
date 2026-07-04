---
item_id: 2026-07-04-113-signal-window-interface
round: 2
combined_at: '2026-07-04T19:33:33Z'
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
| 1 | MEDIUM | codex | AC1 — the contract | accepted — mechanism dropped | `limit`-vs-`nextSinceSeq` skip bug. Root cause is the r1-introduced `nextSinceSeq` return itself, not missing prose around it. Dropped `nextSinceSeq`; caller advances by `max(entry.sequence_id)+1`, which is limit-safe by construction (you only advance past rows returned). |
| 2 | HIGH | codex-ops | AC1 — the contract | accepted — mechanism dropped | Same limit-skip bug (converges with #1). Same disposition: `nextSinceSeq` removed; caller-derived advancement cannot skip a truncated row. |
| 3 | HIGH | codex-ops | AC1 / AC3 | accepted — mechanism dropped | Snapshot-consistency: `entries` and `nextSinceSeq` from separate observations could advance past an unseen append. Removing `nextSinceSeq` dissolves it — caller advances only to `max(seen)+1`; on empty windows the cursor does not move (re-poll from same `sinceSeq`), so no concurrent append can be skipped. No transaction/snapshot mechanism needed. |

Reframe gate: **triggered** — r2, ≥2 findings (all 3) target the `nextSinceSeq` return mechanism introduced by the r1 `spec-r1-patches` commit (301784c7); the original spec returned "one ordered list" only. Findings #1/#2 are the same limit-skip bug in that mechanism; #3 is a snapshot-consistency bug in it. Fresh-context investigator run (`codex exec --sandbox read-only`) returned `kind: structural_cut`, recommending `nextSinceSeq` be dropped rather than patched deeper, because `sequence_id` per entry + AC3's `getCurrentSequence()` already provide the durable-cursor primitives. Investigator consumed as validate-and-apply: its diagnostic_check (does deleting only `nextSinceSeq` still satisfy load-bearing requirements — entry `sequence_id` present, AC3 `getCurrentSequence()` present, AC4 late-arrival intact, no consumer needs API-level atomic empty-window cursor) verified true against the spec — AC4 uses `getCurrentSequence()` directly, and API-level empty-window advancement was itself the skip-bug source, so "don't advance on empty" is the correct behavior. Recommendation accepted, not overridden.

Removal proof matrix (disposition uses removal language):
- **state_removed:** the `nextSinceSeq` field is deleted from the `getSignalWindow` return contract, along with the "high-watermark + 1, defined even when entries is empty" computation.
- **behavior_removed:** `getSignalWindow` no longer computes or returns a next-cursor; API-level empty-window cursor advancement no longer exists; the limit-truncation cursor rule and the separate-observation watermark read are both gone.
- **owners_removed:** `src/trace/signal-window.ts` no longer owns cursor computation / watermark bundling; that responsibility is dissolved, not relocated (caller derives from `entry.sequence_id`; storage's `getCurrentSequence()`, already owned via AC3/`interface.ts`, is unchanged).
- **tests_removed_or_changed:** the `nextSinceSeq present + empty-window advancement` assertions are removed; the contract test now asserts caller-side `max(entry.sequence_id)+1` advancement is limit-safe and that empty windows leave the cursor unmoved (assert-absence-of-skip); no interleaving/concurrency test is needed for a mechanism that no longer exists.
- **remaining_invariants:** every entry carries `sequence_id`; AC3 `getCurrentSequence()` watermark accessor stays (AC4 + bootstrap); AC4 late-arrival unchanged; durable cursor advancement is caller-derived and limit-safe by construction. No new compensating contract or mechanism is introduced in the module — the removal is genuine, not relabeling.

## Convergence call

`needs R3` — verification round. All 3 findings accepted as **structural cut**: `nextSinceSeq` removed from AC1's return; caller-derived, limit-safe cursor advancement documented; Tests updated to assert no-skip under limit truncation and empty-window cursor-hold. Removal is a spec change → default branch (b): dispatch a verification round (a removal-only patch typically converges in the next round).
focus_hints: Verify AC1 returns only the ordered `entries` list (no `nextSinceSeq` / no returned cursor anywhere); every entry still carries `sequence_id`; the caller-derived advancement rule (`max(entry.sequence_id)+1`, empty window → cursor unchanged) is stated and limit-safe; AC3 `getCurrentSequence()` and AC4 late-arrival are intact; Tests assert limit-truncation no-skip and empty-window cursor-hold, with all `nextSinceSeq` assertions gone; no snapshot/transaction mechanism was added in its place.

