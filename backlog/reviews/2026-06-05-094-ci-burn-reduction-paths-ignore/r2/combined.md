---
item_id: 2026-06-05-094-ci-burn-reduction-paths-ignore
round: 2
combined_at: '2026-06-06T00:08:07Z'
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

Reframe gate: FIRED — findings #1/#2/#3 all target AC2b, a mechanism introduced by r1's patch commit `6834ecc2` (3 ≥ 2 threshold). Mandatory fresh-context investigator (codex exec read-only) returned `kind: structural_cut`: r1's reviewers asked for an explicit required-checks DECISION; the build-time `gh api` re-verification and standing-note requirements were strategist inflations, and all r2 AC2b findings are bugs in those inflations. Investigator's diagnostic_check applied before patching: `gh api .../branches/main/protection` AND `.../rulesets` both return plan-shaped 403 ("Upgrade to GitHub Pro or make this repository public") — NOT auth/scope-shaped — so no required checks exist or can exist on this plan; the cut is safe and the captured body doubles as the durable evidence.

Removal proof matrix (AC2b cut):
- state_removed: AC2b's builder-side `gh api` re-verification requirement + the "standing note for the future aggregate-gate item" requirement (both spec-text obligations; no repo state existed yet).
- behavior_removed: no build-time branch-protection probing by the builder; no builder obligation to author future-spec notes.
- owners_removed: none added in r1, none to remove — finding #2's complaint (no implementable artifact in files_to_modify) is dissolved rather than satisfied.
- tests_removed_or_changed: none (mechanism never reached code).
- remaining_invariants: AC2b retains the spec-time-recorded DECISION (PR paths-ignore is safe; plan-shaped-403 evidence captured verbatim 2026-06-05) — exactly what r1's reviewers asked for; the forward obligation moved to After Completion as strategist-owned.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC2b | accepted — mechanism dropped (structural cut per investigator + proof matrix above) | 32f97f4e — re-verification requirement removed; spec-time plan-shaped-403 evidence (protection + rulesets) recorded verbatim instead |
| 2 | MEDIUM | codex | AC2b / files_to_modify / AC5 | accepted — mechanism dropped (the unimplementable standing-note requirement is removed, not given an artifact) | 32f97f4e — forward obligation moved to After Completion as strategist-owned; no files_to_modify change needed |
| 3 | MEDIUM | codex-ops | AC2b - required-checks ground truth recorded | accepted — mechanism dropped (convergent in substance with #1) | 32f97f4e — 403-ambiguity dissolved at spec time: captured body is explicitly plan-shaped, ruling out auth/scope |
| 4 | MEDIUM | codex-ops | Locked decision 1 / AC1 / AC2 | accepted — text_patch (targets ORIGINAL mechanism, not the r1 patch; real operational limit) | 32f97f4e — Locked-1 now documents the bounded-diff (300-file) evaluation limit, why this repo's push profile makes it residual, and the >300-mixed-push workflow_dispatch operator note (also in After Completion) |

## Convergence call

needs R3 — focus_hints: verify the r2 structural cut at 32f97f4e: (1) AC2b is now a pure spec-time-recorded decision (no builder verification mechanism, no standing-note obligation) and the captured plan-shaped-403 evidence is sufficient and unambiguous; (2) Locked-1's bounded-diff limit documentation is accurate to GitHub's actual semantics and the residual-risk argument holds; (3) nothing else in the spec still references the removed AC2b mechanisms.

