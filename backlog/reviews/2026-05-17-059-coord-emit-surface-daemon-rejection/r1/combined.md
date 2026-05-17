---
item_id: 2026-05-17-059-coord-emit-surface-daemon-rejection
round: 1
combined_at: '2026-05-17T07:52:28Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: claude.md
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
| 1 | MEDIUM | codex | backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:116 | accepted — patched | Real spec-shape gap: ECHO specs require a standalone `## Tests` section after `## Risks` and before `## Definition of Done`. Added one that pins the three new test cases by file path + per-case assertion set + no-regression invariants + explicit out-of-scope-for-tests list. Definition-of-Done rewritten to match the locked AC1/AC3 contract (rejection / HTTP non-2xx / unreachable). |
| 2 | LOW | codex | backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:96 | accepted — patched | Port-1 trick replaced with the bind-port-0-then-close (`pickClosedPort()`) pattern. Patch adds a TypeScript helper directly in AC3 and rewrites test (ii) to use it. Accepted minor TOCTOU window between `probe.close()` and the wrapper's `curl` is documented in the AC text as "millisecond order, negligible in unit-test harness." |
| 3 | MEDIUM | codex-ops | backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:59,75,96-99,111 | accepted — patched | Locked the daemon-unreachable stderr posture to **silent, no env flag**. State table row at line 59 rewritten; AC1 unreachable-branch bullet (line 75) committed to a single sentence; AC3 test (ii) rewritten to assert `expect(r.stderr).not.toMatch(/coord-emit\.sh:/)`; Out of Scope #7 rewritten from "leaves to reviewer disposition" to "no third stderr-state, period"; R3 rewritten to drop the "if AC1 chooses…" framing. Subsumes r1 claude F1 (line 75) which made the same recommendation. |
| 4 | MEDIUM | codex-ops | backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:78,88-101 | accepted — patched | Added test case (iii) for the HTTP non-2xx (wrong-transport) branch: in-process `node:http` fixture returning 500 + body `{"error":"boom"}`, wrapper asserts `r.status === 0`, stderr contains `coord-emit.sh: daemon returned HTTP 500`, stderr does NOT contain `coord-emit.sh: daemon rejected`. Closes the production failure mode codex-ops named: stale `ECHO_MCP_URL` reaching the wrong local service or daemon-side 500. AC3 heading updated from "Two new test cases" to "Three new test cases"; Tests section enumerates all three. |
| 5 | LOW | claude | backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:75 | accepted — subsumed by #3 | Same recommendation as codex-ops F1 (lock unreachable branch to silent, no env flag). Single combined patch resolves both. The combined.md table shows them as separate rows because their `where` lines don't overlap; the disposition is shared. |
| 6 | LOW | claude | backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:118 | accepted — patched | R1 risk rewritten to commit to fixed-length truncation (500 chars + `…[truncated]`) instead of the body-dump fallback. AC1 parsing-constraint clause also tightened with the same truncation contract so the spec has a single shape, not two. Eliminates the masking risk claude correctly identified: AC3 test (i) would pass with a body-dump because the daemon error text is a substring of the body. |
| 7 | LOW | claude | backlog/ready/2026-05-17-059-coord-emit-surface-daemon-rejection.md:130 | accepted — patched | Added Out of Scope #11 forbidding auto-generalization of the parse-isError pattern to other `|| true` callsites in the same commit (`coord_invoke`, `push-with-retry.sh`, scheduler-tier emitters in `_run_reviewer.sh`, etc.). Closes the symmetric door against parallel-wrapper edits; AC2 already gates the caller-prose path, this gates the cross-wrapper-pattern-copy path. Reinforces the After-Completion "second spec is the trigger" rule by naming concrete candidate sites the builder might be tempted to touch. |

## Convergence call

`needs R2 — focus_hints: verify the `## Tests` section is well-formed and matches the locked AC1/AC3 contract; confirm the port-0-bind-close pattern in test (ii) does what AC3 says (no listener at the resolved port + `expect(r.stderr).not.toMatch(/coord-emit\.sh:/)`); confirm the HTTP non-2xx test (iii) uses an in-process `node:http` fixture NOT the MCP daemon and asserts the literal `coord-emit.sh: daemon returned HTTP 500` substring; confirm the 500-char truncation contract is the single shape (no body-dump anywhere); confirm Out of Scope #11 names the same candidate callsites the prior strategist drift-prevention pattern would have called out; spot-check Definition of Done line-up with the three locked AC contracts.`

