---
item_id: 2026-06-02-087-reviewer-invocation-argv-contract
round: 2
combined_at: '2026-06-03T03:33:10Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
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
| 1 | MEDIUM | codex | backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:74-77 | accepted — patch corrected (not deepened) | e6bfe794 — same issue as codex-ops #4: my r1 AC4(v) wording made `{{PROMPT}}` survive "as ONE argv element," contradicting AC1's prompt-not-in-argv. Reworded AC4(v) into two channels: (v-a) `{{WT}}` survives the argv handoff as one element; (v-b) the PROMPT path is tested as the quoted stdin operand `< "$STDIN_FROM"`, never argv. |
| 2 | MEDIUM | codex | backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:11-20,24,75,78; tools/review-queue/_reviewers.py:117-136; tools/review-queue/schemas/reviewers-config.schema.json:38-48 | accepted — claim narrowed (no new files in scope) | e6bfe794 — narrowed AC2 to "ONE **runtime-read** invocation source": reviewers.json/_reviewers.py/schema stay OUT of scope and unedited; their `invoke_command` remains legacy data the schema still validates but no invocation path reads. AC4(x) asserts no wrapper/installer/gate reads it post-087. Field retirement = OoS #12. Avoids the AC5 trap (don't relax a schema for a file not in files_to_modify). |
| 3 | MEDIUM | codex-ops | backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:75 | accepted — patch corrected (de-prescribed) | e6bfe794 — my r1 AC2 named the rc-swallowing `mapfile -d '' < <(gate)` process-substitution specifically. Loosened: NUL-delimited argv is the model but the gate's non-zero exit MUST be observed before exec (bare process-sub is called out as INSUFFICIENT); wrapper asserts rc==0 AND non-empty argv → durable diagnostic + clean abort otherwise. AC4(ix) adds the gate-failure regression. |
| 4 | MEDIUM | codex-ops | backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:74 | accepted — patch corrected (folded into #1) | e6bfe794 — same root as codex #1; AC4(v-b) now tests the prompt path as the quoted stdin redirection the child actually reads, not argv membership. |

## Convergence call

needs R3 — all four r2 findings accepted at spec SHA `e6bfe794` (path (b), verification round). Two findings (codex #1 + codex-ops #4) were the SAME inconsistency in my own r1 AC4(v) patch; one (codex-ops #3) was my over-prescription of the rc-swallowing process-sub in r1 AC2 — both resolved by **correcting/loosening the prior-round patch, not patching deeper** (disposition discipline). codex #2 was a real source-of-truth honesty gap, resolved by narrowing the claim with NO new files in scope. focus_hints: verify the two-channel AC4(v-a/v-b) split is now internally consistent with AC1; the gate-exit-status contract + AC4(ix) regression; the one-runtime-read-source narrowing + AC4(x) + OoS #12; and that the AC5 scope boundary still holds (reviewers.json untouched). Confirm no read-only/commit-move/SLA-move leaked in.

