---
item_id: 2026-06-02-087-reviewer-invocation-argv-contract
round: 1
combined_at: '2026-06-03T03:18:22Z'
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
| 1 | MEDIUM | codex | backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:11-18,72,76; package.json:12-21 at 0fc8a8c | accepted — patched | 12eb7214 — added `package.json` to files_to_modify (manifest-`files` entry only, no version/dep change) + AC4(vii) packaging-manifest assertion that the `files` whitelist includes reviewer-bindings.json. |
| 2 | MEDIUM | codex | backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:72-75; tools/review-queue/_run_reviewer.sh:124-168 at 0fc8a8c | accepted — patched | 12eb7214 — AC2 now pins the lossless Python→Bash handoff (NUL-delimited argv → `mapfile -d ''` → `exec "${ARGV[@]}" < stdin_from`, no IFS splitting, no second `bash -c`); AC4(v) adds a spaces/metachar regression (space-in-WT/PROMPT path survives as one element). |
| 3 | HIGH | codex-ops | backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:72-75 | accepted — patched | 12eb7214 — AC1 now states the prompt is NOT an argv element for current headless reviewers; it travels via `stdin_from: {{PROMPT}}`, argv keeps only the `-`/`-p` stdin sentinel and MUST NOT contain the prompt path; AC4(vi) asserts no current headless argv contains the prompt path. |
| 4 | MEDIUM | codex-ops | backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:14-18; tools/review-queue/_install_reviewer_launchd.sh:62-104 | accepted — patched | 12eb7214 — added `_install_reviewer_launchd.sh` to files_to_modify; AC2 migrates its install-context preflight off the removed `--print invoke_command` onto the binding/argv resolver; AC4(viii) asserts the removed reference is gone + preflight resolves via the binding file. |

## Convergence call

needs R2 — all four r1 findings accepted-and-patched at spec SHA `12eb7214` (path (b), verification round). No finding re-raised the deferred 087b sandbox/commit migration; all four are r1 build-contract tightenings against the original spec text (not prior-patch mechanism), so all are must-patch, not removable. focus_hints: verify (1) the NUL-delimited argv handoff + spaces regression contract in AC2/AC4(v); (2) the prompt-via-stdin_from contract in AC1 + AC4(vi) no-prompt-in-argv assertion; (3) package.json manifest scope in AC4(vii) + AC5 narrowing; (4) installer preflight migration in AC2/AC4(viii) — and confirm no read-only/commit-move leaked in.

