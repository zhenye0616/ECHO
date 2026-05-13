---
item_id: 2026-05-13-043-per-round-reviewer-roster
round: 6
combined_at: '2026-05-13T07:13:52Z'
codex_response: codex.md
cursor_response: null
patch_commit_sha: null
next_round: 7
combined_verdict: single_reviewer_timeout
escalated_to_founder: true
---

# Combined findings

**Single-reviewer timeout** — `cursor.md` is missing past the timeout. Strategist must escalate to founder per §AC4 verdict roll-up.


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC6h fixture config routing through tooling | **Accept patch.** Add `ECHO_SCHEMA_DIR` and `ECHO_REVIEWERS_CONFIG` env-var overrides in `_lib.py` (parallel to existing `ECHO_REVIEW_QUEUE_REPO_ROOT`). `_lib.SCHEMA_DIR` and `_lib.REVIEWERS_CONFIG` become module-level constants that read env-var fallback. validate.py + combine.py + _reviewers.py all naturally use these via _lib. Shell-side `commit-reviewer-response.sh` inherits env from parent. AC6h fixture setup sets all three env vars to route to fixture-local files. | Spec-patched in r6 disposition commit |
| 2 | MEDIUM | codex | `cross_refs_match` ignores `finding_index` | **Accept patch.** Extend signature from `cross_refs_match(a, a_round, a_reviewer, b, b_round, b_reviewer)` to `cross_refs_match(a, a_round, a_reviewer, a_index, b, b_round, b_reviewer, b_index)`. Compare cross_ref.finding_index against b_index (and symmetrically). Thread index through Phase 3b's `all_findings = [(slug, idx, finding)]`. Add AC6n test: cursor has 2 findings; codex cross_ref points at finding 2; assert convergent only with cursor finding 2 (not finding 1). | Spec-patched in r6 disposition commit |
| 3 | MEDIUM | codex | Union-find bucket-collapse uses `.update()` (overwrites lists) | **Accept patch.** Replace `merged_buckets.setdefault(root, {}).update(by_reviewer)` with a loop that EXTENDS per-reviewer lists: `for slug, finding_list in by_reviewer.items(): target.setdefault(slug, []).extend(finding_list)`. Add AC6o test: 3-reviewer fixture where one reviewer has findings at two anchors that get unioned by cross_ref; assert both findings preserved (not dropped by .update). | Spec-patched in r6 disposition commit |
| 4 | MEDIUM | codex | AC6 comma-list rendering breaks AC7 byte-identical baseline | **Accept patch.** Preserve EXACT 2-reviewer rendering (`Source: both (convergent on \`<anchor>\`)`) when contributing reviewers are exactly `{codex, cursor}` (default deploy). Comma-list `Source: codex, codex-arch, cursor` only fires for N≥3 OR for non-default 2-reviewer pairs. Implementation: branch on `len + set` check. AC7 byte-identical fixture stays valid; AC6i comma-list assertion validates N=3 path. | Spec-patched in r6 disposition commit |

## Convergence call

`needs R7 — focus_hints: Verify F1 ECHO_SCHEMA_DIR + ECHO_REVIEWERS_CONFIG env-var routing in _lib.py (compose with existing ECHO_REVIEW_QUEUE_REPO_ROOT). Verify F2 cross_refs_match signature extended with finding_index (AC6n test). Verify F3 union-find collapse extends lists (AC6o test). Verify F4 2-reviewer default rendering preserved (AC7 byte-identical) AND N≥3 uses comma-list (AC6i). Trend: 6 rounds in. Verdict stable at proceed_after_patches. R7 should converge if these are clean — or proposes path-c terminal if Codex agrees nothing material remains.`

