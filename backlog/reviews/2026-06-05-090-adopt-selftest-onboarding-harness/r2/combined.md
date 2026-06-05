---
item_id: 2026-06-05-090-adopt-selftest-onboarding-harness
round: 2
combined_at: '2026-06-05T20:24:02Z'
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


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

**Reframe gate:** ≥2 r2 findings target r1's patch commit `79e8c9fb` (the AC1 reproducibility framing, AC2 port mechanism, the AC3 voting wording, the AC1 voting smoke test). Mandated fresh-context investigator run (`codex exec --sandbox read-only`) → `kind: structural_cut`, validated against file facts: F1+F3+codex-ops are r1-patch-introduced → removal/cut is root-cause; F2 is satisfiable with existing daemon `:0` support (no `files_to_modify` expansion); F4 is a genuine test-coverage completion. Investigator risk noted (real packaged path under-tested) → mitigated by keeping the onboarding job visible (non-voting, not deleted) + an anti-drift assertion on the unit smoke.

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | spec_refs / AC1 | accepted — mechanism dropped | r2 79e8c9fb→patched: removed the worktree as load-bearing — deleted its `spec_refs` entry, stripped orphaned line anchors from `files_to_modify`; AC1 check-id contract is the sole authority. |
| 2 | MEDIUM | codex | AC2 — Port allocation | accepted — propagation-completion | AC2 now names the EXISTING atomic mechanism: `ECHO_MCP_PORT=0` → daemon binds `:0` (`mcp/server.ts`→`boundPort`) → resolved port read from `mcp_port`/`mcp_url` (`daemon/index.ts:71`). No daemon change, no `files_to_modify` expansion. |
| 3 | MEDIUM | codex | ci.yml / AC3 | accepted — mechanism dropped (structural cut) | Dropped "green onboarding legs vote" (the contradiction): the ENTIRE onboarding matrix is `continue-on-error: true` in 090; `quality` is the sole voting gate. |
| 4 | MEDIUM | codex | AC2 — Cleanup | accepted — patched | Cleanup test now asserts temp-state removal on success/failure/timeout AND no-daemon-left on failure/timeout. |
| 5 | MEDIUM | codex-ops | AC1 / AC3 / AC4 | accepted — mechanism dropped (structural cut) | Removed real-selftest from the voting path: the voting `tests/cli/selftest.test.ts` is now a fake-runner unit test (no real daemon); the real end-to-end selftest runs ONLY in the non-voting onboarding job. Nothing that executes real selftest votes → green-main holds on every OS. |

### Removal proof matrix (rows 1, 3, 5 — removal dispositions)

- **state_removed:** the orphaned-worktree dependency (spec_refs entry + authoritative line anchors); the "green legs vote" conditional; the real-`echoctl selftest` invocation inside the voting `npm test` path.
- **behavior_removed:** the build no longer reads the orphaned worktree; onboarding legs no longer vote (all `continue-on-error`); the voting suite no longer spawns the real daemon / runs real selftest on any OS.
- **owners_removed:** `spec_refs` no longer owns the worktree file; `files_to_modify`'s `selftest.ts` entry no longer owns orphaned line numbers; the voting `npm test` no longer owns real end-to-end execution (relocated to the pre-existing non-voting onboarding job — not a new owner).
- **tests_removed_or_changed:** `tests/cli/selftest.test.ts` changes from "runs full `echoctl selftest --json`" to a fake-runner unit test asserting shape/exit only; the real selftest is no longer a voting test.
- **remaining_invariants:** AC1 check-id contract still defines selftest's coverage; the real packaged selftest still RUNS (visibly, non-voting) in the onboarding job; the 38478-sentinel + parallel + cleanup tests still assert hermeticity. (The anti-drift assertion on the unit smoke is a minor guard, not a reintroduction of the removed real-execution behavior.)
- **Failure-mode check:** state/behavior/owners are all genuinely removed (not relabeled); the lone remaining "compensating" item is a one-line anti-drift assert, not a new mechanism carrying the removed behavior. ✓ true removal.

## Convergence call

`needs R3 — focus_hints:` verify (a) the worktree is no longer load-bearing (AC1 self-contained, no orphaned anchors); (b) AC2 port names the existing `ECHO_MCP_PORT=0`→`mcp_port` path (no daemon change) + sentinel/parallel/cleanup tests cover all 3 exit paths; (c) AC3 onboarding wholly `continue-on-error`, `quality` sole voting gate, no "green legs vote" residue; (d) AC1/AC4 voting selftest test is fake-runner (no real daemon), real selftest only in non-voting onboarding.

