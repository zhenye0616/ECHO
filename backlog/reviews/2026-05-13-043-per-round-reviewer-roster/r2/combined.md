---
item_id: 2026-05-13-043-per-round-reviewer-roster
round: 2
combined_at: '2026-05-13T06:34:37Z'
codex_response: codex.md
cursor_response: null
patch_commit_sha: null
next_round: null
combined_verdict: single_reviewer_timeout
escalated_to_founder: true
---

# Combined findings

**Single-reviewer disposition (off-protocol override, founder-authorized).** Strategist drives single-reviewer disposition; AC8 stays at 0. Codex verdict: `pushback` again (R1 was also pushback). Decay-curve flagged to founder; founder chose to keep iterating (path-a from R2 surface).


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC2 request/reviewer validation + AC6h 3-reviewer fixture + combined.schema.json response fields | **Accept patch.** AC2 gets a new "Adding a Reviewer: changelist" sub-section enumerating the 4 explicit schema files that must be updated (reviewers.json + request.schema.json:requested_reviewers enum + reviewer.schema.json:reviewer enum + combined.schema.json:properties declaration). AC6h must exercise the full request.py → validate.py(reviewer) → combine.py → validate.py(combined) → commit-reviewer-response.sh pipeline using a synthetic `codex-arch` reviewer with all 4 schema patches applied in the fixture setup. The test is the falsification of "actually adding a 3rd reviewer works end-to-end." | Spec-patched in r2 disposition commit |
| 2 | HIGH | codex | AC6 Phase 3 cross-reference matching regression | **Accept patch.** AC6 Phase 3 code replaced: group findings by `normalize_where(f["where"])[0]` (the primary anchor) NOT raw `where`; AND preserve `cross_refs_match()` override semantics from current combine.py:67. Add two regression tests: AC6k (two-reviewer-default-deploy cross_ref convergence — falsification guard for current behavior) and AC6l (three-reviewer cross_ref convergence — extension test). | Spec-patched in r2 disposition commit |
| 3 | HIGH | codex | Cross-round roster propagation gap | **Accept patch.** Add new AC1f: `dispatch-next-round.py` reads current round's `request.requested_reviewers` and passes them to `request.py` via `--reviewers=<comma-list>`. Without this, r2 silently drops any non-default-roster reviewer that r1 had. Add dispatch-next-round.py to Files Touched. Test: synthetic 3rd reviewer in r1 request; strategist dispositions; assert r2/request.md has identical requested_reviewers. | Spec-patched in r2 disposition commit |
| 4 | MEDIUM | codex | `_reviewers.py` skeleton caches list, not tuple | **Accept patch.** Convert `reviewers: list[Reviewer]` to `reviewers_tuple = tuple(reviewers)` before caching; cache and return the tuple. AC2b extended: assert `isinstance(result, tuple)` AND `result is load_reviewers()` (identity check requires tuple). | Spec-patched in r2 disposition commit |
| 5 | MEDIUM | codex | `_run_reviewer.sh` PYTHONPATH | **Accept patch.** `_run_reviewer.sh` sets `PYTHONPATH="$REPO_ROOT/tools/review-queue:${PYTHONPATH:-}"` before the inline `python3 -c "from _reviewers import ..."` invocation. Same fix in `_install_reviewer_launchd.sh`. AC3c test assertion changed from "stderr matches `/ghost not found in reviewers.json/i`" to literal-string match (no `ModuleNotFoundError` allowed in stderr). | Spec-patched in r2 disposition commit |

## Convergence call

`needs R3 — focus_hints: Verify AC2's new "Adding a Reviewer: changelist" enumerates the 4 schema files; verify AC6h test exercises request.py → validate.py → combine.py end-to-end with all 4 schemas patched in fixture; verify AC6 Phase 3 code uses normalize_where AND preserves cross_refs_match; verify AC6k+AC6l tests cover both two-reviewer-default cross_ref regression AND three-reviewer cross_ref extension; verify new AC1f propagates requested_reviewers via dispatch-next-round.py with test; verify _reviewers.py returns tuple identity; verify _run_reviewer.sh PYTHONPATH set.`

