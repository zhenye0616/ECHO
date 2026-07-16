---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 4
combined_at: '2026-07-15T23:16:21Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: null
claude_response: claude.md
patch_commit_sha: 28f70ee057ddbeb588c5f0ca9e4bd77d3506bb03
next_round: 5
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

Reframe gate: TRIGGERED — all three findings target the cross-version release-state, run-identifier, and concurrency mechanisms introduced by prior `spec-r2/r3-patches` commits. The mandatory fresh-context investigator ran (`codex exec --sandbox read-only`, gpt-5.6-sol) and returned `structural_cut`: item 136 is a one-shot repository/bootstrap release, so the root-cause fix is to remove the reusable cross-version release-manager behavior, retain fail-closed server-object recovery for this first release, and move any later-release generalization to item 137. Diagnostic applied: the cut must make every nonempty or incompletely listed release namespace stop without consulting Project_echo; every ambiguous write response must resolve to exactly one same-run server marker plus exact tuple/hash readback or stop before another write; and concurrency tests must reproduce one running plus one pending, with a newer dispatch replacing only the not-yet-started pending run.

Removal proof matrix:

- `state_removed`: Project_echo migration-record attribution as an input to release-namespace admission.
- `behavior_removed`: multi-version/prior-release adoption and the promise that every queued release run waits.
- `owners_removed`: `publish-release` no longer depends on Project_echo evidence to classify pre-existing release state.
- `tests_removed_or_changed`: attributed prior-release fixtures become blocking nonempty-namespace fixtures; concurrency tests assert pre-start pending replacement and post-start no-cancel behavior.
- `remaining_invariants`: build once; exactly three release assets; the existing seven-field inner plus two-field outer founder-approval tuple; main/ref/API agreement; minimal permissions; founder-only protected approval; no clobber; draft verification before publish; exact same-run ambiguous-response recovery; best-effort cleanup; and no Project_echo checkout.


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC6 — cross-version partial-state preflight | accepted — structural cut | `28f70ee0`: scope item 136 to its first release from an authenticated, fully paginated empty release namespace; any tag, draft/published release, asset, listing failure, or pagination uncertainty stops for founder disposition. Remove Project_echo migration-record attribution and require item 137 to own a separately reviewed later-release generalization before publishing its successor release. |
| 2 | HIGH | codex | AC6 — publication staging and run-owned identifier logging | accepted — patched within the cut | `28f70ee0`: persist a canonical same-run ownership marker in the draft body and annotated-tag message before the corresponding write; bind draft/assets/tag to the approved tuple; after any lost/ambiguous response, list/read back and continue only on exactly one marker plus exact name, source, bytes, and digest match. Zero/multiple/mismatch stops before repeating creation. The run log remains evidence only and no fourth asset is added. |
| 3 | MEDIUM | codex | AC6 — non-cancelling concurrency | accepted — corrected to platform semantics | `28f70ee0`: `cancel-in-progress:false` protects the running run, but a newer dispatch may replace a not-yet-started pending run. Accept replacement only when platform/API history proves no job began and no external write occurred; cancellation after any job start follows the partial-state stop path. |

## Convergence call

needs R5 — focus_hints: Verify the r4 structural cut: (1) item 136 is first-release/empty-release-namespace only and no longer reads Project_echo attribution; all nonempty/inaccessible/incompletely paginated state blocks; (2) draft-body and annotated-tag server markers plus exact tuple/hash readback recover each ambiguous response without a fourth asset, adoption, or repeat write; (3) concurrency distinguishes pre-start pending-run replacement from cancellation after job start; (4) the existing three release assets, seven-plus-two approval tuple, build/publish split, no-rebuild rule, founder-only protected approval, main/ref/API triple check, minimal permissions, and best-effort same-run cleanup remain intact; (5) item 137 owns any later-release generalization before its successor publication.
