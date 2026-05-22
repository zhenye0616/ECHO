---
item_id: 2026-05-21-066-process-backlog-handoff-atomicity
round: 2
combined_at: '2026-05-22T04:04:30Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 3
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
| 1 | HIGH | codex | spec :238-240; :267-272; :295; :309 | accepted — patched (paired with codex-ops F5 as ROOT A: pushed-ref boundary) | `7094641` — boundary changed from local commit to `origin/main:$DEST`. New helpers `p1_boundary_published_remotely()` (fetch + cat-file -e origin/main:$DEST) and `p1_local_commit_unpushed()`. Recovery State 2 retries push-with-retry.sh when local commit exists but remote doesn't observe $DEST. Publish block ends with push-with-retry.sh + final boundary verification (exit 6 on silent push failure). DurableBoundaryObservation declaration updated to `kind: "pushed-ref"`, `observerScope: "remote"`. AC3 test 9 added. |
| 2 | MEDIUM | codex | spec :176-180; :223-236; :270; skills/process-backlog.md:145-170 | accepted — patched (ROOT C: $LOG handling) | `7094641` — `$LOG` removed from `P1_TOUCHED_SURFACES`. Recovery never touches agent-authored content. Inline comment cites codex F2. AC3 test 10 added: $LOG bit-identical through recovery. |
| 3 | MEDIUM | codex | spec :205-236; :306; skills/process-backlog.md:62-84 | accepted — patched (ROOT C: return code gating) | `7094641` — Caller-side guard `recover_p1_stage_move ... \|\| exit $?` added. Recovery returns distinct codes (3/4/5) per failure mode. AC3 test 11 added: recovery non-zero blocks publish (asserts no pull occurred). |
| 4 | HIGH | codex-ops | spec :180; :223-232; :304-305 | accepted — patched (ROOT B: per-surface dispatch) | `7094641` — Recovery rewritten with per-surface dispatch: `git restore --staged --worktree` only when path in HEAD; `git rm --cached --ignore-unmatch` + `rm -f` for transition-created untracked paths. Removed `2>/dev/null \|\| true` failure-hiding; each branch returns distinct code (4/5). AC3 test 8 added: crash with $DEST absent + $ITEM_FILE dirty. |
| 5 | HIGH | codex-ops | spec :235-240; :271-272; :295; :368 | accepted — patched (paired with codex F1 as ROOT A) | `7094641` — Same fix as F1: boundary = `origin/main:$DEST`, push-with-retry.sh as publisher, p1_boundary_published_remotely as observability gate. AC3 test-infrastructure note added: tests use local bare repo as origin (no real network). AC3 tests 2/3 extended to verify boundary observability on origin/main via `git fetch` + `git show origin/main:...`. |

## Convergence call

`needs R3 — focus_hints:` Verify three root-fixes in `7094641`. **(a) Boundary = pushed-ref:** confirm `p1_boundary_published_remotely` + `p1_local_commit_unpushed` helpers are correct; confirm recovery State 2 retries via push-with-retry.sh rather than rolling back the local commit; confirm the publish block's final verification (exit 6) catches network-split / silent-rejection cases. **(b) Per-surface dispatch:** confirm the in-HEAD-vs-untracked split is correct; confirm no hidden `|| true` re-introduced; confirm each branch's distinct exit code (4/5). **(c) $LOG exclusion + return-code gating:** confirm $LOG is NOT in P1_TOUCHED_SURFACES; confirm caller guards with `|| exit $?`; confirm AC3 tests 8/9/10/11 are precisely scoped to the patches. **(d) AC3 test-infrastructure note:** confirm local-bare-repo-as-origin pattern is workable and that AC3 tests 2/3 boundary-observation extensions are correct. Both r2 verdicts were `pushback` (homogeneous — no boundary cross); strategist autonomously dispositioned per founder direction "continue with the spec review until convergence".

