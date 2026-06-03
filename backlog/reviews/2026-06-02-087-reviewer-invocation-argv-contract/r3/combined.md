---
item_id: 2026-06-02-087-reviewer-invocation-argv-contract
round: 3
combined_at: '2026-06-03T03:47:52Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 4
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
| 1 | MEDIUM | codex | AC1/AC2/AC4(x), lines 74-77 | accepted — patched (effectively convergent with #2) | 1dc8e554 — binding shape never said WHERE the slash-command prompt path comes from; today the wrapper reads it from reviewers.json.slash_command, which would break AC2's one-runtime-read-source rule for prompt selection. AC1 now states `stdin_from` resolves to `.claude/commands/review-queue-<reviewer>.md` from a binding-owned source (explicit per-entry path or `{{REVIEWER}}` derivation), WITHOUT reading reviewers.json. AC4(xi) asserts the resolved path == today's per-reviewer prompt path, no legacy read. |
| 2 | MEDIUM | codex-ops | backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:74-75 | accepted — patched (same finding as #1) | 1dc8e554 — same root + same fix as #1: prompt-path source pinned in the binding + AC4(xi) headless-tick resolution regression. (combine.py placed these in the divergent table only because the two reviewers' `where` strings differ verbatim; substantively this was a clean two-reviewer convergence.) |

## Convergence call

needs R4 — single convergent finding (both reviewers, same root) accepted-and-patched at spec SHA `1dc8e554` (path (b), verification round). Findings are decaying cleanly (r1=4, r2=4, r3=1-convergent) and this is a genuine binding-shape completeness gap, not a prior-patch artifact. focus_hints: verify AC1 prompt-path-source clause (`stdin_from` → `.claude/commands/review-queue-<reviewer>.md` from a binding-owned source, no reviewers.json read) + AC4(xi) resolution regression; confirm internal consistency with AC2's one-runtime-read-source rule and AC5 scope (reviewers.json still untouched). Confirm still behavior-preserving.

