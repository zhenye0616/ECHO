---
item_id: 2026-07-06-118-drift-join-nomination
round: 1
combined_at: '2026-07-06T00:56:55Z'
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
| 1 | MEDIUM | codex | Acceptance Criteria / AC3 | accepted — patched | Pinned `DRIFT_NOMINATION_JACCARD_THRESHOLD = 0.2` and `DRIFT_MAX_NOMINATIONS_PER_STATEMENT = 5` into AC3 with rationale (0.25 openai example nominates with margin; 0.2 = inclusive floor for one shared token across two 3-word subjects; cap 5 bounds judge load to statements_seen×5); added inclusive/exclusive boundary tests + cap-truncation test. Converges with codex-ops F1 (row 3). |
| 2 | MEDIUM | codex | Acceptance Criteria / AC3 and AC4 | accepted — patched | Added a total-order deterministic tie-breaker (score desc → normalized subject asc → dedupe_key asc) to AC3 nomination top-k AND AC4 near-miss selection; a tie fixture asserts *which* five capped candidates and *which* near-miss subject, not just counts (seam decision 11 byte-identical answer). Converges with codex-ops F2 (row 4). |
| 3 | MEDIUM | codex-ops | backlog/proposed/2026-07-06-118-drift-join-nomination.md:AC3 | accepted — patched | Duplicate of row 1: values locked + budget rationale + threshold/cap tests. |
| 4 | MEDIUM | codex-ops | backlog/proposed/2026-07-06-118-drift-join-nomination.md:AC3/AC4 | accepted — patched | Duplicate of row 2: deterministic tie-breaker on both nomination and near-miss selection + tie fixture. |
| 5 | MEDIUM | codex-ops | backlog/proposed/2026-07-06-118-drift-join-nomination.md:AC3 | accepted (partial) — patched | Adopted the observability half: added `decisions_scored` to `DriftSweepResult` + `drift_sweep_ok` log and precompute-decision-token-sets-once-per-tick, so scoring volume is operator-visible before `statements_seen × decisions_scored` overruns the interval. REJECTED the pool-bounding half with rationale: bounding the decision pool to the window would break the join (it must see every latest-per-subject decision, matching 114's accepted full-scan-per-tick). |

## Convergence call

`needs R2 — focus_hints:` Verify the pinned threshold=0.2 / cap=5 values + rationale and their boundary tests (0.25 nominates, exactly-0.2 inclusive, just-below excluded, >5 tied truncates to a deterministic five); the total-order tie-breaker (score desc → normalized subject asc → dedupe_key asc) applied to BOTH AC3 nomination and AC4 near-miss selection with a tie fixture; and the `decisions_scored` metric + once-per-tick token-set precompute (pool deliberately unbounded, matching 114 full-scan).

