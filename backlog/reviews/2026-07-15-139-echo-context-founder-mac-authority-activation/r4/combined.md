---
item_id: 2026-07-15-139-echo-context-founder-mac-authority-activation
round: 4
combined_at: '2026-07-16T03:50:28Z'
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

Reframe gate: TRIGGERED — 8 of 9 findings target mechanisms introduced/reshaped by prior patch commits spec-r2-patches bb16485a and spec-r3-patches 696e4710 (disposable-clone test confinement, AC7 controller-step rewire, AC8/AC10 closed-vocabulary evidence, AC10 plan-derived daily matrix); count >= 2, findings non-mechanical, no bypass. Fresh-context investigator ran (codex exec read-only, session 019f690d): `kind: propagation_completion` — r3's structural boundaries were correct but not propagated through Tests, AC6/AC9, AC7, and AC8/AC10; complete the boundaries in one consistency pass, add no new runtime mechanism. Strategist applied the diagnostic check against item 138's spec text before patching: 138 DOES own journaled crash-replayable client transforms with protected before-images (its AC1) and persistent launchd neutralization with bounded KeepAlive termination (its residual-fence AC), so rows 1/4/5 are pure propagation. 138 does NOT literally promise drift-aware (never-overwrite-concurrent-edits) restore — per the investigator's own stated risk, row 6 is patched as a consumption requirement with an explicit stop-and-new-source-item gate, not as choreography re-specified in 139; 138's own active review lane is the right place to bind that semantics upstream. No other override.

Removal proof matrix (rows 2/7, committed reason-code cut): state_removed = the enumerated reason-code field is deleted from the committed evidence-row schema; the closed field set no longer contains it. behavior_removed = committing reason codes (or any adjudication rationale) to the migration/evidence record no longer exists as a behavior. owners_removed = the committed record no longer owns adjudication rationale; it lives only in the protected local evidence area (already in files_to_modify) — no file owner change, a field-level cut. tests_removed_or_changed = the seven-day evidence assertions now check the closed field set with unknown-field rejection (absence check), not reason-code vocabulary conformance. remaining_invariants = verdict enum {observed, disabled-approved, no-activity-approved} (pre-existing), adapter enum, plan slot index, UTC timestamp, generation, typed per-row delta counts, forbidden content classes. No new compensating contract — the verdict enum predates the cut. Matrix passes: genuine narrowing; the reviewer-demanded "enumerate the reason vocabulary" is satisfied by removing the field rather than growing a committed vocabulary that invites free-form drift.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC1 and Tests, first bullet | accepted — propagation completion: Tests-section suite paths made clone-relative (echo-context suites resolve from the AC1 disposable detached echo-context build clone root, residual suites from the Project_echo build clone root); literal /Users/zhenye/Desktop paths removed; new bullet requires realpath evidence (runner cwd, entrypoints, module resolution inside the pinned clone root) and disqualifies any run from the live/sibling checkout | spec-r4-patches 56655205 |
| 2 | MEDIUM | codex | AC8 and AC10 evidence-row schema | accepted — mechanism dropped (see removal matrix): committed rows carry no reason field at all; verdict enum is the complete committed vocabulary; unknown-field/unknown-value rows are invalid evidence and fail their gate | spec-r4-patches 56655205 |
| 3 | MEDIUM | codex | AC10 — daily continuity matrix | accepted — single uniqueness key defined: (generation, America/Los_Angeles date, adapter, plan source-slot index); expected key set mechanically derived from the approved plan's slot inventory; exactly one row per plan slot per day including disabled-approved slots; missing/duplicate/plan-unknown key = unresolved source failure | spec-r4-patches 56655205 |
| 4 | MEDIUM | codex-ops | AC1 and Tests — disposable clone confinement | accepted — same patch as row 1: clone-relative paths + runner/module-resolution/entrypoint realpath confinement evidence bound to the exact candidate artifact bytes | spec-r4-patches 56655205 |
| 5 | HIGH | codex-ops | AC6 and AC9 — com.echo.daemon launchd retirement and rollback | accepted — AC6 now retires com.echo.daemon via the controller's journaled service-control step (138's landed neutralization contract): bootout + persistent disable + atomic plist relocation out of LaunchAgents into the protected snapshot area, with a bootstrap probe proving launchd cannot reload it before the generation commits. AC9 rollback restores the daemon start path only as the authority-fenced rollback-full entrypoint of the approved AC1 package behind the echoctl shim; retired unfenced package bytes/plist stay retention snapshots, never live start paths | spec-r4-patches 56655205 |
| 6 | HIGH | codex-ops | AC7 — rollback after live client-target drift | accepted — abort made drift-aware, never restore-all: restore only targets byte-matching the controller's journaled after-image or the untouched before-image; a target matching neither is left untouched with durable secret-free manual-recovery evidence and services unactivated. Stated as a requirement on 138's landed controller step with an explicit stop-and-new-source-item gate if the landed contract lacks it (139 never re-specifies or hotfixes the semantics); flagged for 138's active review lane as the upstream owner | spec-r4-patches 56655205 |
| 7 | MEDIUM | codex-ops | AC8 and AC10 — committed evidence schema | accepted — same cut as row 2 plus typed count semantics: event/atom counts are non-negative per-row deltas (never cumulative), zero on disabled-approved/no-activity-approved rows; reason must always be absent from committed rows; unknown-value rejection is explicit | spec-r4-patches 56655205 |
| 8 | HIGH | codex-ops | AC10 — daily continuity matrix cardinality | accepted — same patch as row 3: one exact key and mechanically derived expected set resolve the enabled-only vs plan-slot-coverage contradiction; disabled adapters get explicit disabled-approved rows per plan slot, so multi-slot adapters can neither omit sources nor duplicate | spec-r4-patches 56655205 |
| 9 | MEDIUM | codex-ops | AC10 — seven-day acceptance-clock boundary | accepted — window defined in America/Los_Angeles civil time: starts at the first LA midnight after G2 activation (partial activation day never counts), covers seven consecutive complete calendar days (DST days count as one), closes at the midnight ending day seven, freeze approval no earlier than close, resets restart from the next LA midnight | spec-r4-patches 56655205 |

## Convergence call

needs R5 — focus_hints: Verify the r4 propagation-completion pass at the new spec SHA: (1) AC1/Tests — suite paths are clone-relative with realpath confinement evidence (runner cwd, entrypoints, module resolution inside the pinned clone root) and no /Users/zhenye/Desktop literal remains reachable as a satisfying path; (2) AC8/AC10 — the committed row's closed field set is complete and reason-free, count semantics are typed per-row deltas, and unknown-field/value rejection is falsifiable; (3) AC10 — the (generation, LA date, adapter, plan slot index) key plus mechanically derived expected set is internally consistent including disabled-approved slots, and the seven-complete-LA-civil-days window (midnight start/close, DST-as-one-day, reset-to-next-midnight, freeze no earlier than close) is unambiguous; (4) AC6/AC9 — persistent disable + plist relocation + bootstrap probe close the login/KeepAlive reload path, and the rolled-back start path is fenced-rollback-full-only with no unfenced package/plist reinstall; (5) AC7 — the drift-aware abort is stated as a consumption requirement on item 138's landed controller step with a stop-and-new-source-item gate, not as rewire choreography owned by 139; flag if that requirement still exceeds what 138's contract can own.

