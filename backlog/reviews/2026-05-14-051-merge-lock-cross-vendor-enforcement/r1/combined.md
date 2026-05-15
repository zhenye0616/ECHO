---
item_id: 2026-05-14-051-merge-lock-cross-vendor-enforcement
round: 1
combined_at: '2026-05-15T06:38:26Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
patch_commit_sha: '555eb65 — see issue log 2026-05-14 23:40 PDT for attribution caveat'
next_round: 2
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | both (convergent on `backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:80`) | backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:80 | accepted | Patched AC2 lock-path primitive from `git rev-parse --git-path` to `git rev-parse --git-common-dir` + `/echo-merge-in-progress`. Updated Risk R2 prose to reflect the corrected behavior. Both reviewers caught the same false claim about worktree resolution; the patch corrects the primitive choice so linked-worktree invocations see the main-checkout writer's sentinel. Patch SHA: `555eb65` (autostash-swept attribution) |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:66 | accepted | Patched AC1 from `--rebase --rebase-merges` (invalid syntax, exit 129 "unknown option") to `--rebase=merges` (the supported form per `git pull -h`). Codex verified the bad form empirically; without this fix, every reviewer push retry would crash before reaching `git push`. Load-bearing correctness fix. Patch SHA: `555eb65` (autostash-swept attribution) |
| 2 | MEDIUM | codex | backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:69 | accepted | Patched AC1 test assertion to NOT require SHA equality with pre-rebase feature tip — `--rebase=merges` rewrites the merged side, so the `^2` SHA changes even though tree content is preserved. New assertion: `^2` returns non-error (merge preserved as merge) AND `^2^{tree}` matches the pre-rebase feature tip's tree. Patch SHA: `555eb65` (autostash-swept attribution) |
| 3 | HIGH | codex-ops | backlog/ready/2026-05-14-051-merge-lock-cross-vendor-enforcement.md:79 | accepted | Patched AC2 lifecycle insertion point: lock check now placed AFTER LOG_DIR/LOG_FILE/mkdir/rotation block (lines 47–57), not after line 45. Under `set -euo pipefail`, the lock-present branch (which writes to `$LOG_FILE`) now has the variable defined and the directory created before it runs. Restores the spec's intended "exit 0 cleanly" semantics. Patch SHA: `555eb65` (autostash-swept attribution) |

## Convergence call

`needs R2 — focus_hints: verify all 4 patches landed correctly; verify spec body Risk R2 prose matches AC2's `--git-common-dir` choice; verify AC1's test assertion language is unambiguous about tree-vs-SHA semantics; verify no other place in the spec still references the obsolete `--rebase-merges` flag or `--git-path` primitive.`
