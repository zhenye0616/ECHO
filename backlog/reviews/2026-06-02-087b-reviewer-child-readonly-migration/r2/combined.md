---
item_id: 2026-06-02-087b-reviewer-child-readonly-migration
round: 2
combined_at: '2026-06-03T06:35:30Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 3
combined_verdict: divergent
escalated_to_founder: true
---

# Combined findings

**Divergent verdicts** — codex='proceed_after_patches', codex-ops='pushback' cross the `{proceed*, pushback}` boundary; founder escalation per §Out of Scope #7.


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | ...087b...md:57,65,69 + 087 schema reviewer-bindings.schema.json:71 (`stdout` not a valid enum value) | accepted — patched | 50f4ff9d — `stdout` is not in 087's `capture.kind` enum (`committed_file\|stdout_json\|stdout_text\|stderr_text\|none`). Changed to `stdout_text` across Locked-1a, AC2, AC5(iii), AC6 + spec_ref note. |
| 2 | HIGH | codex | ...087b...md:65,68 (queue-error ≠ terminal; infinite re-poll) | accepted — patched | 50f4ff9d — AC2 now requires capture-failure to (a) log queue-errors.md AND (b) write a terminal/skip marker the round-eligibility scanner consults, so the failed round is not reselected; AC5(iv) tests next-scan-does-not-reselect. Mechanism (per-round marker / bounded-retry) is builder's call; the eligibility change + test are required. |
| 3 | MEDIUM | codex | ...087b...md:64,68 (wrapper tick_start needs wrapper-owned selection) | accepted — patched | 50f4ff9d — AC1 + Locked-1(c): request selection + bind-validation move into the wrapper pre-spawn, so the wrapper owns the `correlation_id` and classifies no-candidate/stale_combined/bind_failed/duplicate/upstream_duplicate; AC5(vi) tests the pre-spawn branches. |
| 4 | HIGH | codex-ops | ...087b...md:64-68 (read-only child still does non-stdout writes) | accepted — patched | 50f4ff9d — AC1 + Locked-1(d)/3: wrapper does git-sync (pull/rebase) + prepares an immutable review packet pre-spawn; the migrated child does NO write except stdout; AC5(vii) proves a write-free child happy path under read-only. |
| 5 | MEDIUM | codex-ops | ...087b...md:65-68 (terminal queue-state) | accepted — patched (same root as #2) | 50f4ff9d — see #2: explicit terminal/skip marker + non-reselect test (AC2 + AC5(iv)). |

## Convergence call

needs R3 — **FOUNDER-ADJUDICATED (2026-06-02).** r2 escalated on a `{proceed*, pushback}` boundary cross (codex=proceed_after_patches, codex-ops=pushback); the findings were substantively convergent (both reviewers, same 4 issues — only the severity label diverged). Founder adjudicated **proceed → patch all 4, dispatch r3** (not pushback/rescope). All 5 rows accepted-and-patched at spec SHA `50f4ff9d` (#1 enum-name bug, #2≡#5 terminal queue-state, #3 wrapper-owned selection, #4 write-free child). focus_hints for r3: verify (1) `stdout_text` is used consistently (no bare `stdout` as a kind); (2) the terminal/non-reselect capture-failure state + AC5(iv) test; (3) wrapper-owned pre-spawn selection/bind-validation + AC5(vi); (4) write-free child / immutable packet + AC5(vii) under read-only; (5) full-write-free-before-flip ordering (Locked-3) holds. Note for r3 reviewers: the proceed-vs-pushback severity split was founder-resolved as proceed; assess whether the r2 patches make the runtime contract safe, not whether to re-litigate that call.

