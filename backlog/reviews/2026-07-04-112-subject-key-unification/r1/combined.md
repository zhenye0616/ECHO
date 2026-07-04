---
item_id: 2026-07-04-112-subject-key-unification
round: 1
combined_at: '2026-07-04T19:23:02Z'
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
| 1 | MEDIUM | codex | files_to_modify / AC3 | accepted — patched | Added `src/mcp/tools/search-memories.ts` (the AC3 retrieval locus: in-tool `metadata_match`/free-text filter) + `tests/mcp/tools/` to `files_to_modify`, and rewrote AC3 to name that path and grant the builder authority to adjust the filter there if the AC3 test proves the new-atom path isn't already satisfied. New-atom retrieval is expected to work purely from AC2 writing `canonical_subject` (already in the tool's in-tool filter set); the authority + AC5 fallback cover the failure case. |
| 2 | MEDIUM | codex | Acceptance Criteria | accepted — patched | Added a concrete `## Tests` section naming real files (`tests/enrich/granola-signals.test.ts`, `tests/surfaces/ceo-slack-responder/decision-store-latest-wins.test.ts`, `tests/mcp/tools/search-memories.test.ts`) with load-bearing assertions, including a **byte-stable pre-change `team-decision:<normalized>` dedupe fixture** (assert against a hardcoded literal) and a **mixed-generation store fixture** proving latest-wins legacy fallback. |
| 3 | MEDIUM | codex-ops | backlog/proposed/2026-07-04-112-subject-key-unification.md:30 | accepted — patched | Real gap: AC4 covered only the `decision-store.ts` read path, so a `canonical_subject` drift/`loop` query via `search-memories.ts` would silently omit every legacy decision atom (the recurring source-omission failure mode). Added **AC5**: the in-tool `metadata_match: {canonical_subject}` filter falls back to `normalized_subject` for team-decision atoms — the search-path twin of AC4. Scoped to the structured `metadata_match` filter only; free-text semantics and shared search behavior are explicitly held out of scope in the Out-of-Scope section (behavior change to the in-tool predicate, not a schema/whitelist change — consistent with the spec's own "read-side fallback covers them"). |

## Convergence call

`needs R2` — three MEDIUM findings, all accepted-and-patched (no deferrals, no divergence). Reframe gate did not fire: this is r1, no prior-round patches exist, so all findings target original spec text. Because patches materially change the spec (new AC5, new files_to_modify entries, new Tests section) and the artifact is in `backlog/proposed/`, dispatch routes to a verification round per the skill's branch (b) — a patched proposed spec always gets verified before promotion.

focus_hints for R2 — Verify: (AC5) the new `metadata_match` legacy fallback in `search-memories.ts` is scoped to team-decision atoms and does not alter matching for signal/other atoms; (AC3) new-atom retrieval genuinely works from AC2's key-write alone, and the granted builder authority over `search-memories.ts` is bounded (no schema/whitelist change); (Out of Scope) the free-text-vs-metadata_match boundary for legacy atoms is coherent — legacy decisions reachable via structured filter, not free-text; (Tests) the byte-stable dedupe fixture and mixed-generation fixture are concrete enough to catch format/fallback drift.

