---
item_id: 2026-05-13-046-context-fatigue-via-role-typed-state
verdict: merge with founder fixups
reviewed_at: 2026-05-14T05:15:00Z
test_counts: { passed: 878, failed: 0, skipped: 21 }
---

## Verdict

`merge with founder fixups`. The subagent code-reviewer initially graded `redo before merge` because the two R5 strategist-dispositioned MEDIUMs (F1 dirty-tree blast radius + F2 concurrent abort-log writer race in `tools/task-state/push-round-state.sh`) were not applied — the builder ran tests, lint, typecheck, and sync-skills clean (878/0/21) but missed reading `backlog/reviews/.../r5/combined.md`'s builder-applied patch dispositions. The strategist downgraded to `merge with founder fixups` because (a) R5's verdict was explicitly `proceed_after_patches` — the patches are documented and mechanical, not a fresh design pass; (b) the 045 cycle established this exact pattern (R2 builder-applied fixups landed during /merge-and-cleanup as "founder reconciliation"); (c) the fixups are surgical — two script edits + two test additions, no AC scope change.

All 8 ACs are otherwise Met (AC1 Partial only because of the F1/F2 omission inside AC1 step 6's helper). MCP read-contract, lint, schema extensions, journal-by-proxy rule, cold-start primer, and recursive dogfooding all land correctly. Test verification re-run inside worktree: 878 pass / 0 fail / 21 skipped; lint clean; typecheck clean; sync-skills `--check` clean.

The 3 agent open questions in `agent_notes` are all `STAND` (no rename, no relocate, no revert needed). See "Design-choice judgments" below.

## Pre-merge fixups

- [ ] **F1 — `tools/task-state/push-round-state.sh:67` — apply option-a (precondition gate; preferred per R5 disposition).** Before the unconditional `git reset --hard origin/main`, add: `if git status --porcelain | grep -v "^.. backlog/task-state/<task-id>/round-state.md$" | grep -v "^?? " | grep -q .; then echo "ROUND_STATE_HELPER_DIRTY_TREE: other tracked files dirty; abort before reset" >&2; exit 2; fi`. The clean-other-than-target invariant must be documented in the script header. Rationale: prevents the helper from wiping unrelated in-flight strategist/watcher edits (e.g., dogfooding journal mid-append) during CAS-violation abort.

- [ ] **F2 — `tools/task-state/push-round-state.sh:69-71,74` — replace single-file append with per-event files.** Replace `echo "$row" >> raw/internal/queue-errors.md` with: `mkdir -p raw/internal/queue-errors && printf '%s\n' "$row" > "raw/internal/queue-errors/$(date -u +%Y%m%dT%H%M%SZ)-${MY_REVIEWER:-${USER}}-${TASK_ID}.md"`. Update the subsequent `git add` to add the new per-event file path. Also update `skills/role-typed-task-state.md:98,105` (and re-sync to `.claude/commands/`) to describe the per-event-file shape rather than the single-file append. Rationale: matches the existing `backlog/reviews/<task>/r<N>/<reviewer>.md` per-event pattern from 039/043; eliminates the rebase-conflict race for concurrent abort-log writers.

- [ ] **F1+F2 tests — `tests/task-state/push-round-state.test.ts` — add two fixtures.**
  - (i) Dirty-other-than-target fixture: write an unrelated tracked file (e.g. `raw/internal/dogfooding/mcp-interactions-journal.md`) with local edits before invoking the helper; assert the helper exits with the new error code AND the unrelated file's edits are preserved AND origin/main does NOT contain the stale round-state rewrite AND origin/main DOES contain the abort-row per-event file.
  - (ii) Two-writer concurrent-abort fixture: spawn two simultaneous helper invocations; assert each writes its own per-event file under `raw/internal/queue-errors/` with a distinct path, neither rebase-conflicts, both files reach origin/main.

- [ ] **Re-verify** `npm test` / `npm run lint` / `npm run typecheck` / `tools/sync-skills.sh --check` clean after the four fixups land in the worktree. Then push the new head, and `/merge-and-cleanup` records the post-fixup SHA in the item's `head_sha` field as part of its standard flow.

## Expected merge conflicts

Branch-point appears to be after all recent main commits in the touched-file set, so no auto-conflicts expected on `--no-ff` merge. Files this branch touches that main has touched recently (informational, not conflict-predictive):

- `CLAUDE.md` — main last touched at `6d29f51` (skills-relocation decision); branch HEAD is post-that. No conflict.
- `backlog/README.md` — main last touched at `65916fa`. No conflict expected.
- `package.json` — main last touched at `720ad60`. Branch adds `lint:task-state` script; no overlapping edits expected.
- `src/mcp/server.ts` — main last touched at `09f0e77`. Branch adds `repo_root` constructor option. No overlapping edits expected.
- `tools/review-queue/validate.py` — main last touched at `cd02160`. Branch adds AC3 field-aware fresh-eyes detection. No overlapping edits expected.
- `tools/review-queue/schemas/*.schema.json` — main last touched at `a13e52b`. Branch extends reviewer schema with `consumed_task_state` optional bool. No overlapping edits expected.

If any unexpected conflict surfaces during `/merge-and-cleanup` step C3, founder reconciliation per CLAUDE.md "Reviewer independence rule" applies.

## Follow-up items (defer, do not block merge)

- **Spec body vs implementation path divergence.** AC1 step 6 in the spec body literally says `tools/review-queue/push-round-state.sh`, but the builder placed the helper at `tools/task-state/push-round-state.sh` (sibling to `lint.py`). The builder also updated `skills/role-typed-task-state.md` to reference the new path. At merge time when the item moves to `complete/`, the strategist may want to reconcile the spec body text against the implemented path for the historical record — but this is a cosmetic fixup, not load-bearing.
- **Per-event abort log aggregation.** Once F2 is applied, downstream consumers (humans reading `queue-errors`) may want a single rendered view. Spec explicitly punts this; file a successor item if/when a real consumer surfaces.
- **F1 option-b consideration.** R5 disposition allowed either option-a (precondition gate, recommended) or option-b (targeted restore via `git checkout origin/main -- <path>` + `git reset HEAD~1 --mixed`). If during dogfooding the watcher's typical run-state has its own staged-but-uncommitted `combined.md`, option-a would block the watcher unnecessarily and option-b becomes preferable. File as observational follow-up; current recommendation is option-a.

## Design-choice judgments (3 agent open questions)

**(a) `skills/using-superpowers.md` as NEW ECHO-namespaced file (vs. plugin's same-named):** STAND. Slash command names distinct (`superpowers:using-superpowers` vs `using-superpowers`); coexistence is correct per the cross-tool-protocol decision (`raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md`). A rename would require touching AC7's body + the recursive `task-state/.../strategist.md` pointer. No functional benefit; meaningful churn.

**(b) `tests/echo-mcp/role-state.test.ts` at literal spec path:** STAND. Spec text names the path; vitest discovers it via `tests/**/*.test.ts`; relocating would create a spec-vs-implementation divergence with zero functional benefit.

**(c) `push-round-state.sh` post-rebase blob-equality check (defensive, beyond literal spec):** STAND. The check defends against the silent-merge-resolved-by-taking-remote variant of the same class of failure the protocol defends against. Spec says "if pull-rebase introduces ANY conflict, run the abort sequence"; a silent overwrite is strictly worse. Conservative belt-and-braces; spec-aligned in spirit.

## R5 builder-applied MEDIUMs status

| R5 MEDIUM | Status | Where |
|---|---|---|
| F1 codex — dirty-tree blast radius | **NOT APPLIED** | `tools/task-state/push-round-state.sh:67` |
| F2 codex-ops — concurrent abort-log race | **NOT APPLIED** | `tools/task-state/push-round-state.sh:69-71,74` + skill doc lines 98,105 |

Both surface as pre-merge fixups above. The builder's run log "Decisions Made" + "Anything I Almost Did But Stopped" sections never reference F1 or F2 — strong signal the builder read the spec body (which lacked F1/F2 patch text) but not `backlog/reviews/.../r5/combined.md` (which carried them). Lesson for future cycles: spec_refs should include the cycle's final combined.md when `proceed_after_patches` shipped fixups.

## Subagent reference

Subagent agent_id: `a50b81c668c2caf4d` (reachable via SendMessage if deeper analysis needed). Subagent's full review available in the orchestrator's tool-call result for this /review-pending invocation.
