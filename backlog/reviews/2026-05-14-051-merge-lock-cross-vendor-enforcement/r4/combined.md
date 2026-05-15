---
item_id: 2026-05-14-051-merge-lock-cross-vendor-enforcement
round: 4
combined_at: '2026-05-15T07:37:34Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
patch_commit_sha: 'e2eb804'
next_round: 5
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

**Decay-curve interpretation:** R1=4, R2=3, R3=1, R4=4 — first non-monotonic round. R4 codex F1 (HIGH) originates from R1 strategist patch (tree-equality assertion was R1's substitution for SHA equality; R4 codex empirically falsifies BOTH). Per 049 retro decay heuristic: SIMPLIFY rather than continue elaborating self-inflicted findings. Codex-ops F1+F2 are scope-expansion findings — deferred to `_followups.md` per friction-first directive. Codex F1+F2 accepted with minimal patches.


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC1 push-with-retry-rebase-merges test assertion | accepted (SIMPLIFY) | R1 introduced tree-equality assertion as a "less brittle than SHA" alternative; R4 codex empirically reproduced that BOTH SHA and tree-equality fail when sibling clone's commit lands on origin/main first (the test's non-fast-forward setup itself). Patch: drop tree-equality assertion entirely. Keep only the `^2` existence check — that IS the load-bearing differential (under buggy `--rebase`, `^2` returns "unknown revision"; under `--rebase=merges`, `^2` returns non-error). Minimal falsifying assertion preserved; over-elaboration removed. Patch SHA: `e2eb804` |
| 2 | MEDIUM | codex | AC2 test step 2 + AC3 parameterization for REVIEWER_NAME=codex-ops | accepted | R3 prompt-fixture patch only mentioned `review-queue-codex.md`; AC3 parameterizes across both reviewers and `_reviewer_gate.py` resolves `codex-ops` to `review-queue-codex-ops` slash_command. Patch: AC2 test step 2 now requires BOTH `review-queue-codex.md` AND `review-queue-codex-ops.md` fixtures. Patch SHA: `e2eb804` |
| 3 | MEDIUM | codex-ops | backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:66-75 | deferred to _followups.md as 051-followup-A | `push-with-retry.sh` rebase-failure recovery is a real operational concern but a SCOPE EXPANSION beyond AC1's 1-line `--rebase`→`--rebase=merges` flag change. Per friction-first directive (CLAUDE.md memory `friction_first_prioritization`): friction-fix specs stay narrow; new scope goes to follow-ups. Filed in `_followups.md` "From 051 R4 — deferred findings" section with full fix shape + estimate. Cross-cut: 050 worktree isolation eliminates this race surface structurally — exposure window is 051-ship to 050-ship only. |
| 4 | LOW | codex-ops | backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:81-83 | deferred to _followups.md as 051-followup-B | Lock-release race between `[ -f "$LOCK_PATH" ]` existence check and `cat "$LOCK_PATH"` holder read. Real edge case but very rare (requires merge-and-cleanup's lock-release trap to fire in the narrow window between the wrapper's two file ops on the same path). Defer until empirically observed; ~5 LOC fix when reactivated. |

## Convergence call

`needs R5 — focus_hints: verify R4 simplification dropped the tree-equality assertion correctly (only ^2 existence check remains); verify AC2 test step 2 now requires both prompt fixtures. Reviewers should NOT re-raise codex-ops F1+F2 — those are filed to _followups.md as 051-followup-A and 051-followup-B respectively, deferred per friction-first directive.`
