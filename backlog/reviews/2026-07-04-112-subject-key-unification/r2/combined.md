---
item_id: 2026-07-04-112-subject-key-unification
round: 2
combined_at: '2026-07-04T19:30:25Z'
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

**Reframe gate: FIRED (3 prior-patch-targeting findings ≥ 2 threshold).** F1, F2, F4 target the AC5 mechanism + Tests section introduced by the r1 patch (`spec-r1-patches` @ 3f914b7a); not purely mechanical (AC-semantics + test effects), so bypass not allowed. Mandatory fresh-context investigator run (`codex exec --sandbox read-only`). Verdict: **propagation_completion, not structural cut** — AC5 is load-bearing (removing it reopens codex-ops's r1 legacy-omission finding and breaks 113's single `{canonical_subject}` join). Investigator's diagnostic_check validated against code: team-decision atoms carry a stable `source === 'derived:team-decisions'` (`TEAM_DECISION_SOURCE`, unchanged by AC2) + `metadata.decision_atom_type === 'team_decision'`, so `search-memories.ts` has a reliable scoping predicate and the investigator's stated risk (legacy atoms unrecognizable → needs structural helper) does not materialize. Disposition uses propagation/tightening language, not removal, so the removal proof matrix does not fire.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC5 — legacy decision atoms stay findable by the join key | accepted — patched (propagation) | Named the exact scoping predicate in AC5: fallback fires ONLY for `event.source === 'derived:team-decisions'` (`TEAM_DECISION_SOURCE`; equiv. `metadata.decision_atom_type === 'team_decision'`), and explicitly forbade the generic "any atom with `normalized_subject`" rule. Legacy decision atoms retain this source (unchanged by AC2), so the predicate reaches them. |
| 2 | MEDIUM | codex | Tests — AC3 + AC5 | accepted — patched (propagation) | Added a **required negative fixture** to the search-memories test contract: a non-team-decision atom carrying only `normalized_subject == S` (no `canonical_subject`) must NOT be returned by `metadata_match: {canonical_subject: S}`, proving scope + no over-inclusion of unrelated atom types on the drift/loop path. |
| 3 | MEDIUM | codex | After Completion (Strategist Notes) | accepted — patched | Reworded the note: `canonical_subject` is the only forward cross-source join key; `normalized_subject` survives ONLY for team-decision backcompat (still written by AC2, read as AC4/AC5 fallback), not as a second join key. Resolves the contradiction with AC2/AC4. |
| 4 | MEDIUM | codex-ops | Tests / AC3 + AC5 — tests/mcp/tools/search-memories.test.ts | accepted — patched (convergent w/ #2) | Same negative-fixture requirement as #2; single patch satisfies both reviewers. |

## Convergence call

`needs R3` — four MEDIUM findings, all accepted-and-patched, no deferrals, no divergence, verdict `proceed_after_patches` from both reviewers. Reframe gate fired and was resolved as propagation_completion (see note above); AC5 kept, its scope tightened. Because the spec changed materially (AC5 predicate, negative test fixture, note reword) and the artifact is in `backlog/proposed/`, branch (b) dispatches a verification round before promotion.

focus_hints for R3 — Verify the r2 patches close their findings without re-introducing looseness: (AC5) the named predicate `source === 'derived:team-decisions'` is the correct/stable identifier for BOTH legacy and new decision atoms and the "forbid generic normalized_subject" clause is unambiguous; (Tests) the required negative fixture is concrete enough that a builder cannot pass AC5 with an over-broad fallback; (After Completion) the reworded note is now consistent with AC2/AC4/AC5. Convergence expected if the propagation is complete.

