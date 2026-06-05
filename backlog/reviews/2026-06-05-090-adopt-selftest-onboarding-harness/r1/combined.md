---
item_id: 2026-06-05-090-adopt-selftest-onboarding-harness
round: 1
combined_at: '2026-06-05T20:11:43Z'
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
| 1 | MEDIUM | codex | …090…:spec_refs | accepted — patched | AC1 rewritten: the check-id set (INS/DAE/MCP/INIT/WIR/CAP/REC/DOC) is the authoritative, reproducible contract; the orphaned worktree is advisory-only, so the build no longer depends on an uncommitted external tree. |
| 2 | MEDIUM | codex | …090…:AC2 | accepted — patched | AC2: atomic port allocation (bind `:0`) threaded to daemon + all MCP/client checks; never reads/binds 38478; + sentinel test occupying 38478 that proves selftest succeeds without contacting it. |
| 3 | MEDIUM | codex | …090…:AC3/AC4 | accepted — patched | AC3/AC4: exact YAML — per-leg `continue-on-error: true` for legs red on clean source (≥Windows), voting on green legs (≥macOS); non-voting encoded in YAML, NOT branch protection (outside files_to_modify). |
| 4 | MEDIUM | codex-ops | …090…:AC3/AC4 | accepted — patched (converges w/ #3) | Same disposition as #3: Windows onboarding leg is `continue-on-error: true` until 091, so the new workflow can't fail `main` unattended. |
| 5 | MEDIUM | codex-ops | …090…:AC1/AC2 | accepted — patched | AC2 cleanup clause: terminate child daemon + remove throwaway HOME/ECHO_HOME/CODEX_HOME on success, failure, AND timeout; test asserts no selftest daemon remains listening after a forced failure. |
| 6 | MEDIUM | codex-ops | …090…:AC2 | accepted — patched (converges w/ #2) | AC2 atomic-allocation clause covers the race; + test that two concurrent selftest runs don't collide on a port or touch 38478. |

## Convergence call

`needs R2 — focus_hints:` verify (a) AC2 port allocation is genuinely atomic (`:0`/reserve), threaded to daemon + every MCP/client check, with the 38478 sentinel + parallel-no-collision tests; (b) AC2 cleanup fires on success/failure/timeout with the no-daemon-left assertion; (c) AC3/AC4 non-voting is per-leg `continue-on-error` in YAML (not branch protection), Windows non-voting until 091; (d) AC1 check-id contract is self-contained (reconstructable without the orphaned worktree).

