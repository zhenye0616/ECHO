---
item_id: 2026-05-29-082-retrieval-quality-eval-harness
round: 1
combined_at: '2026-05-29T22:55:30Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: dffc61eb30fab93fbd6f2c787e3467238393fbc8
next_round: 2
combined_verdict: pushback
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:94 | accepted - patched | dffc61eb - AC1 now separates harness correctness from retrieval-quality pass/fail. Baseline expected-fail cases are legal only for named current behavior gaps; schema/fixture/budget/silent-loss failures remain harness failures. |
| 2 | MEDIUM | codex | backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:104 | accepted - patched | dffc61eb - AC2 now defines `$query`, `$case.*`, `$steps.<id>.*`, and `$labels.*` placeholder binding, per-query-variant scoring, dynamic hydration selectors, and `primary_discovery` for top-rank scoring. |
| 3 | MEDIUM | codex | backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:137 | accepted - patched | dffc61eb - AC2/AC4/AC5 now require `reference_now` and absolute windows or clock injection; ambient `new Date()` is forbidden for committed CI cases. Same patch covers #4's clock portion. |
| 4 | HIGH | codex-ops | backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:102-104,127-137,141-148; src/mcp/internal/cluster-engine.ts:180-188; src/mcp/tools/find-clusters.ts:191-195 at a6ba1c7 | accepted - patched | dffc61eb - same fixed-clock patch as #3; runner must pass `reference_now` into `findClusters`, and determinism tests must prove no ambient wall-clock dependency. |
| 5 | HIGH | codex-ops | backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:102,118-123,141-150; src/mcp/util/source-app.ts:17-24; src/mcp/util/repo-path.ts:35-38; src/mcp/tools/search-memories.ts:181-187,208-224 at a6ba1c7 | accepted - patched | dffc61eb - AC3/AC4 now require `$EVAL_HOME`/`$EVAL_REPO` virtual tokens and runner-side source/repo rewriting before appending fixtures, plus a regression fixture whose original provenance path differs from the test root. |
| 6 | MEDIUM | codex-ops | backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:121-135,196-198; src/storage/memory.ts:39-43,120-126 at a6ba1c7 | accepted - patched | dffc61eb - AC3 now forbids reliance on random UUID tie-breaks by rejecting or deterministically disambiguating duplicate timestamps; tests add a duplicate-raw-timestamp determinism case. |

## Convergence call

**needs R2** - focus_hints: Verify spec @ dffc61eb30fab93fbd6f2c787e3467238393fbc8 against all r1 accepted patches:

1. AC1 must no longer require all seeded P0 retrieval-quality cases to pass as the builder handoff gate. Confirm harness correctness is distinct from baseline retrieval-quality status, and expected current-behavior failures cannot hide schema/fixture/budget/silent-loss failures.
2. AC2/AC4 must define a concrete recipe binding language: `$query`, `$case.*`, `$steps.<step_id>.matches[*].id`, `$steps.<step_id>.clusters[0].atom_ids`, `$labels.*`, per-query-variant scoring, aggregate status, and a single `primary_discovery` step for top-rank scoring.
3. AC2/AC4/AC5/tests must require fixed `reference_now` or absolute windows so committed CI cases cannot depend on the ambient clock.
4. AC3/AC4/tests must require host-independent fixture rewriting via `$EVAL_HOME` and `$EVAL_REPO`, including source_app/repo_path cases that run on non-founder machines.
5. AC3/tests must prevent random UUID tie-order drift by rejecting or deterministically disambiguating duplicate scored timestamps.

Both requested reviewers returned `pushback`, but neither rejected the core premise of a retrieval-quality eval harness. Full-auto disposition accepted all findings and patched the spec; R2 should focus on whether these deterministic-runner and baseline-status contracts are sufficient without drifting into production retrieval changes.
