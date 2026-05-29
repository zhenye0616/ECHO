---
item_id: 2026-05-29-082-retrieval-quality-eval-harness
round: 2
combined_at: '2026-05-29T23:05:13Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: c68895dd93fb5bdf7c805b9bc0929d0dbf3eb40d
next_round: 3
combined_verdict: divergent
escalated_to_founder: false
---

# Combined findings

**Divergent verdicts** — codex='pushback', codex-ops='proceed_after_patches' cross the `{proceed*, pushback}` boundary. Founder already directed this run to use two codex reviewers for full-auto spec review until convergence, so the strategist dispositioned the findings and requested R3.


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:96-99,166-168,184-188 | accepted - patched | c68895dd - AC1/AC4/AC5 now distinguish production tool warnings from eval-derived source/loss warnings, so stale/degraded source gaps are measurable without changing production retrieval. `must_warn[]` declares acceptable origins, and stale-source cases may allow `origin: "eval"` in this measurement-only item. |
| 2 | MEDIUM | codex | backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:122-123; src/mcp/tools/find-clusters.ts:68-70; src/mcp/tools/get-atoms.ts:27-31,240-251 | accepted - patched | c68895dd - AC2/AC4 now require collection hydration controls: `ids_limit <= 50` with deterministic ordering or `paginate: true`, with every 50-id chunk counted against `budgets.max_calls`. Uncontrolled over-50 placeholders fail validation before scoring. |
| 3 | MEDIUM | codex | backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:99,108,125,184 | accepted - patched | c68895dd - AC1/AC2/AC6 now reserve `pass` and `expected_fail_current_behavior` for case-input baseline status; `expected_fail_matched`, `expected_fail_mismatched`, and `unexpected_fail` are runner result statuses only. |
| 4 | MEDIUM | codex-ops | backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:108; backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:125; backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:161-162; backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:184 | accepted - patched | c68895dd - AC2/tests now require structured `expected_failure` with allowed failed metrics/refs/warning gaps, optional required observed warnings, and matched/mismatched output so expected-fail variants cannot hide unrelated regressions. |
| 5 | MEDIUM | codex-ops | backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:146-155; backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:172-184; backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:214 | accepted - patched | c68895dd - AC4/AC6/tests now require default and `--case <id>` runs to load the same committed fixture universe; `--case` narrows only scoring/output and reports corpus mode for reproducibility. |

## Convergence call

**needs R3** - focus_hints: Verify spec @ c68895dd93fb5bdf7c805b9bc0929d0dbf3eb40d against all R2 patches:

1. Stale/degraded-source warning cases must be measurable without production retrieval changes; confirm `must_warn[]` origin semantics and eval-derived source/loss warnings are sufficient and not crediting production behavior incorrectly.
2. Hydration placeholders that bind more than 50 IDs must be controlled by `ids_limit` or pagination, and over-50 uncontrolled bindings must fail before scoring.
3. Case-input baseline status vocabulary must be consistent: only `pass` and `expected_fail_current_behavior`; matched/mismatched/unexpected are runner result statuses.
4. Expected-fail variants must be machine-checkable via structured `expected_failure`, and mismatched expected failures must be visible in JSON/Markdown output.
5. Focused `--case` runs must preserve the same fixture corpus as all-case suite runs and only filter scoring/output.
