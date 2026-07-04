---
item_id: 2026-07-04-113-signal-window-interface
round: 4
combined_at: '2026-07-04T19:47:29Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 5
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
| 1 | MEDIUM | codex | AC3 (line 36) | accepted — patched | `limit` application order was unpinned. Patched AC3's Sort+composition contract: all predicates (`sinceSeq`/`since`/`until`/`scope`/`loop`) filter **before** ordering, and `limit` truncates the ordered, fully-filtered result — never a pre-filter set — so an eligible later row can't be hidden behind filtered-out leading rows. Added a `tests/trace/signal-window.test.ts` limit-after-filter case (cursor+loop/scope with leading filtered-out rows + small limit returns the eligible later row). Semantics clarification, not new mechanism. |
| 2 | MEDIUM | codex | AC1 (line 32) — full-fidelity test gap | accepted — patched | AC1's "full untruncated content/metadata" (original spec requirement) was under-tested; import-closure alone can't catch runtime truncation or a reused capped adapter. Added a full-fidelity round-trip test to `tests/trace/signal-window.test.ts`: insert raw + derived entries with content/metadata exceeding the MCP wire caps, assert exact untruncated round-trip. Additive test hardening. |

Reframe gate: not triggered — only **one** finding (#1) targets a prior-round patch (AC3's Sort+composition contract, added in `spec-r1-patches`). Finding #2 targets AC1's original "full untruncated content/metadata" requirement (present since the first spec) — a test-coverage gap on original text, not a patch-introduced mechanism — so it does not count under the prior-patch primitive. Count = 1 (< 2); no fresh-context investigator required. Both dispositions are pure text patches (a semantics clarification + an additive test); neither uses removal language, so the removal proof matrix does not apply. codex-ops's r4 verdict was `proceed` (zero findings) — the r3 rowid-durability invariant pin converged for codex-ops, and it re-affirmed the r2 structural cut is clean.

## Convergence call

`needs R5` — verification round. Two MEDIUM findings accepted as text patches (AC3 `limit`-after-filter ordering pinned + test; AC1 full-fidelity round-trip test added). Spec changed → default branch (b): dispatch a verification round. Trajectory is converging (r1: 7 → r2: 3 → r3: 1 + codex proceed → r4: 2 + codex-ops proceed); these are last-mile tightening, not patch-on-patch drift.
focus_hints: Verify AC3 pins `limit`-applied-last (all predicates filter before ordering; `limit` truncates the fully-filtered ordered result); Tests include both the limit-after-filter case (cursor+loop/scope, leading filtered-out rows, small limit → eligible later row returned) and the full-fidelity round-trip (oversized content/metadata returned untruncated); confirm no regression to the r2 structural cut (no `nextSinceSeq`) or the r3 rowid durability invariant.

