---
item_id: 2026-05-25-073-onboarding-wizard
round: 1
combined_at: '2026-05-26T02:45:56Z'
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

Note: findings 1+4, 2+5, and 3+6 are logically convergent (codex / codex-ops landed on the same three concerns); they appear as divergent rows only because their primary `where:` line ranges diverged in detail. Dispositioned as three logical groups.

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | backlog/ready/2026-05-25-073-onboarding-wizard.md:122-143,181-183; src/storage/interface.ts:64-67; src/storage/sqlite.ts:55-59 | accepted — patched | r1 spec patch: AC1.3 defines `openExistingAtomStoreReadOnly(dbPath)` with explicit `fs.existsSync` short-circuit + read-only `better-sqlite3` open + `query_only=ON` pragma + no migrations / no canonicalizeTimestamps; AC2.3 routes through same helper; AC1 / AC2 DetectDeps comments + R1 risk + R6 risk + field-name terminology (`source`, `timestamp`, `metadata.repo_root`) corrected. Test AC8.1 case 8 + AC8.2 case 6 pin fresh-install no-FS-side-effects regression guard. |
| 2 | MEDIUM | codex | backlog/ready/2026-05-25-073-onboarding-wizard.md:307-326,451-462,498-499; backlog/ready/2026-05-25-072-adapter-sync-engine.md:285-295 | accepted — patched | r1 spec patch: new AC5.7 pins the `syncResult.syncLock` populated path — no cache writes, no onboarding.json mutation, `onboardingStateUpdated: false`, `cacheUpdates: []`, syncResult returned verbatim. AC8.5 case 11 (new) asserts byte-identical onboarding.json + zero cache writes when mock returns the lock-failure shape. Out of Scope §13 updated to reference AC5.7. |
| 3 | MEDIUM | codex | backlog/ready/2026-05-25-073-onboarding-wizard.md:322,393-407,475-480,487-488 | accepted — patched | r1 spec patch: AC5.5 contradictory CLARIFICATION line removed; the bullet now explicitly states `markCompleted()` is the sole writer of `completed: true` and `summary()` is purely read-only. AC7 `Wizard.summary()` jsdoc rewritten to assert read-only contract. |
| 4 | HIGH | codex-ops | backlog/ready/2026-05-25-073-onboarding-wizard.md:86,143,183; src/storage/sqlite.ts:55-65 | accepted — patched (same as finding 1) | Same AC1.3 / AC2.3 / AC8 patch covers codex-ops's read-only-opener concern. The `query_only=ON` pragma is a defense-in-depth ask from codex-ops; included in the helper. |
| 5 | MEDIUM | codex-ops | backlog/ready/2026-05-25-073-onboarding-wizard.md:286-324,499-511 | accepted — partial; broader scope deferred to follow-up trigger | The narrow ask (handle 072's lock-failure return) is fully addressed by finding 2's AC5.7. The broader ask (wizard-level lock around `cache.read → syncAll → cache write → onboarding write` window) is NOT added in V1 — adding a second lock now would be premature mechanism per the "prefer removal over deeper patching" discipline and V1 cohort runs `echo init` once-per-machine. R5 risk updated with an explicit follow-up trigger (cache-divergence symptom, onboarding.json corruption from interleaved writes, or coord-event evidence of repeat-wizard races → file 075-class spec extending 072's lock surface OR adding a wizard mutex). |
| 6 | MEDIUM | codex-ops | backlog/ready/2026-05-25-073-onboarding-wizard.md:322,385-399,407,477-480,488 | accepted — patched (same as finding 3) | Same AC5.5 + AC7 patch covers codex-ops's completed-flag ownership concern. |

## Convergence call

needs R2 — focus_hints: Verify (1) AC1.3 `openExistingAtomStoreReadOnly()` definition is implementable against `src/storage/sqlite.ts` (better-sqlite3 supports `{ readonly: true, fileMustExist: true }` and `pragma query_only=ON`); (2) AC2.3 routes through the same helper; (3) AC8.1 case 8 + AC8.2 case 6 actually pin fresh-install no-FS-side-effects (diff readdir pre/post); (4) AC5.7 lock-failure path is unambiguous (no cache writes, no onboarding mutation, `onboardingStateUpdated: false`, `cacheUpdates: []`); (5) AC8.5 case 11 pins byte-identical onboarding.json; (6) AC5.5 + AC7 completed-flag ownership is consistent (`markCompleted()` sole writer; `summary()` read-only); (7) R5 follow-up trigger is concrete enough that future dogfooding can fire it; (8) terminology corrections (`Storage`, `source`, `timestamp`) didn't regress anywhere else in the spec.

