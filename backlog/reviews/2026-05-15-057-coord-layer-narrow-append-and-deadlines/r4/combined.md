---
item_id: 2026-05-15-057-coord-layer-narrow-append-and-deadlines
round: 4
combined_at: '2026-05-16T04:08:32Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
patch_commit_sha: null
next_round: null
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
| 1 | MEDIUM | codex | AC1 lines 153; AC3 lines 206-209; AC5 lines 230-234; AC7 lines 254-258 | accepted; AC1 coord_emit signature now per-tier discriminated input (round-tier needs correlation_id; scheduler-tier needs tick_run_id; cross-tier rejected); tests/coord/coord-emit-per-tier-input.test.ts | patched at r4 spec commit 93331c1 + r5 verifies |
| 2 | HIGH | codex | AC0 line 129; AC2 lines 169-198; AC7 line 258 | accepted (real security concern); coord_invoke now (a) argv-vector invocation NOT bash-c shell-string, (b) strict input validation (uuid4 regex on correlation_id, repo-relative path regex on request_path), (c) pinned-request reviewer mode; tests/coord/coord-invoke-input-validation.test.ts + pinned-request-mode.test.ts | patched at r4 spec commit 93331c1 + r5 verifies |
| 3 | HIGH | codex-ops | backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:229 | accepted (stale-text cleanup); AC5 V1 emission-path list explicitly excludes request.py; request.py is UUID4 generator only, zero MCP calls | patched at r4 spec commit 93331c1 + r5 verifies |
| 4 | HIGH | codex-ops | backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:129 | accepted (convergent with codex F2 — same root cause); coord_invoke required-args now include request_path; pinned-request reviewer mode binds wrapper to EXACT request not scan-pick; tick_failed_to_bind atom emitted if mismatch | patched at r4 spec commit 93331c1 + r5 verifies |
| 5 | HIGH | codex-ops | backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md:256 | accepted (real production hole — false deadline_missed on every clean no-op exit); tick_end now covers EVERY clean exit after tick_start: completed/stale_combined/duplicate_response/upstream_duplicate; only wrapper crash leaves deadline open (correct behavior); tests/coord/tick-end-covers-clean-exits.test.ts | patched at r4 spec commit 93331c1 + r5 verifies |

## Convergence call

needs R5 — focus_hints: verify r4 5-fix set on clean spec sha 93331c1 (yet another autostash conflict-marker incident; cleaned). Load-bearing: (a) coord_invoke is argv-spawn (NOT bash -c); strict regex validation on inputs; pinned-request mode binds wrapper; tick_failed_to_bind atom if mismatch; (b) coord_emit per-tier discriminated input — round-tier vs scheduler-tier mutually exclusive; (c) AC5 V1 emission list explicitly excludes request.py; (d) tick_end covers every clean exit (completed/stale_combined/duplicate_response/upstream_duplicate); only crash leaves deadline open. Decay: r1=9 → r2=5 → r3=4 → r4=5 (asymptotic 049 pattern). NOTE: recurring watcher autostash artifact filed as followup; not part of 057. Convergence check: do these patches expose yet more adjacent gaps OR close r4 cleanly?

