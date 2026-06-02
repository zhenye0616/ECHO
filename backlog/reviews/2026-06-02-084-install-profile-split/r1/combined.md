---
item_id: 2026-06-02-084-install-profile-split
round: 1
combined_at: '2026-06-02T07:49:03Z'
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
| 1 | HIGH | codex | spec:75-80; skill-sync.ts; skill-sync.test.ts | accepted — patched (PAIRED w/ #4) | The load-bearing finding: filtering future copies doesn't prune stale dogfood artifacts, so a prior full/dogfood install keeps `using-echo-coord` + roles + workflows after `--profile customer` returns success → 084's promise is false. NEW **AC2b**: customer install MUST prune echo-owned `audience: dogfood` artifacts (hop-1 + hop-2 skills + roles + workflows), marker-gated (074) so user files are safe. AC6(ii) seeds stale artifacts + asserts removal; AC7 covers it. `cli/inverse/skill-files.ts` + `adapter-sync.test.ts` added to files_to_modify; J6 added. |
| 2 | MEDIUM | codex | spec:61,75,78; scaffold.ts | accepted — patched (PAIRED w/ #5) | AC4 missing-profile was builder-discretion (dogfood OR customer) — ambiguous + footgun both ways. Rewrote AC4 to a single deterministic rule keyed on onboarding.json pre-existence captured from `ensureEchoHome()` BEFORE resolution: no file ⇒ customer (fresh); valid schema-v1 file lacking `profile` ⇒ dogfood (legacy, no founder downgrade) + migration note. |
| 3 | MEDIUM | codex | spec:77,80-81; adapter-sync.ts; adapter-sync.test.ts | accepted — patched (PAIRED w/ #6) | `computeOverallOk` reads missing `workflowsResult` as failure → a correct customer install could exit non-zero/degraded. AC3 now requires the customer skip to be a **successful skipped/no-op** result. `tests/echo-home/adapter-sync.test.ts` added to files_to_modify (AC7). |
| 4 | HIGH | codex-ops | spec:69,76-80 | accepted — patched (CONVERGENT w/ #1) | Same prune gap from the ops lens (stale `~/.echo/skills` + vendor commands + roles + workflows survive). Resolved by AC2b + AC6(ii) seeded-stale-artifact smoke. Both reviewers independently HIGH on this = strong signal it's load-bearing. |
| 5 | MEDIUM | codex-ops | spec:61,75,78 | accepted — patched (CONVERGENT w/ #2) | Same AC4 ambiguity; deterministic rule (no-file⇒customer, legacy-no-profile⇒dogfood) is exactly codex-ops's prescription. |
| 6 | MEDIUM | codex-ops | spec:77,80-81 | accepted — patched (CONVERGENT w/ #3) | Same syncAll success-contract; AC3 now mandates skipped-as-success + adapter-sync tests. |

## Convergence call

**needs R2** — 6 findings = 3 convergent pairs, all accepted + patched (no removals; all target original ACs). Both reviewers independently HIGH on the prune gap → load-bearing; new AC2b added (estimate bumped 0.5-1d → 1-1.5d). R2 verifies the patched spec. focus_hints: (1) AC2b — customer install prunes echo-owned dogfood artifacts (hop-1 + hop-2 skills + roles + workflows), marker-gated so user files are never deleted; AC6(ii) seeds stale artifacts and asserts removal. (2) AC4 — deterministic missing-profile rule (no onboarding file ⇒ customer; valid pre-084 file without `profile` ⇒ dogfood) keyed on pre-existence captured before resolution; both branches tested. (3) AC3 — customer skip is a successful no-op in syncAll (computeOverallOk stays true), not a degraded/failed run; adapter-sync tests added. Confirm J6 prune-safety (marker covers skills; roles/workflows ownership check or known-asset-name fallback). Confirm blocked_by 083 still covers shared init.ts/smoke seams. Confirm AC8 no scope beyond the expanded files_to_modify.

