---
item_id: 2026-06-03-088-proposed-stage-pipeline
round: 4
combined_at: '2026-06-03T21:58:36Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 5
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
| 1 | MEDIUM | codex | backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:125-138,164-167 | accepted — **structural cut** | The r2 content-identity gate collides with the existing watcher path (c) (verification-waived-after-mechanical-patch), where current spec ≠ `request.spec_commit_sha` by design → gate wrongly refuses. **Cut path (c) for proposed-stage promotion**: any spec-content patch forces a verification round (path b); the only `next_round:null` terminal that promotes is the clean `proceed` path (no edits → current == request SHA). Gate KEPT (it closes a real reviewed-bytes hole). Promotion invariant + diagnostic added to AC4 + watcher bullet + AC8. Removal-proof matrix below. (spec-r4-patches) |
| 2 | MEDIUM | codex | backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:11-31,147-153 | accepted — patched | Original AC6 gap: live 087b is only in `spec_refs`, so a builder can't perform the required `spec_review:waived`→`ready_content_sha` migration. Added 087b to `files_to_modify` as MIGRATION-ONLY (frontmatter migration only, no body/scope edits) + an AC8 assertion that its `ready_content_sha` keeps it claimable. |
| 3 | MEDIUM | codex-ops | backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:16,133 | accepted — propagation completion | The r3 removal of inline auto-dispatch wasn't propagated to the promote.py `files_to_modify` bullet (line 16), which still said "dispatch a fresh verification round" — contradicting the AC4 prose. Deleted the stale clause; mismatch is now refuse-only at every site. |

**Reframe gate: TRIGGERED** (≥2 findings target prior-round patches — codex #1 hits the r2 content-identity gate, codex-ops #3 is propagation of the r3 removal). Ran the mandatory fresh-context investigator (`codex exec --sandbox read-only`). Verdict: **structural_cut** — "the gate is NOT the drift source; it closes the real reviewed-bytes integrity hole. The patch-on-patch surface is the old verification-waived-after-patch terminal branch colliding with that gate. Cutting that branch for proposed-stage promotion is root-cause." Strategist validated and applied as recommended (kept the gate, cut path (c)). Investigator's `diagnostic_check` (prove no remaining path edits the spec after `request.spec_commit_sha` and still terminalizes with `next_round:null`) is encoded inline in AC4 as the promotion invariant + the (a)/(c)-only enumeration.

**Removal proof matrix (finding #1 — path (c) cut for proposed-stage promotion):**
- `state_removed`: the verification-waived terminal state (`next_round: null` after a content patch) for proposed-stage promotions — no longer reachable.
- `behavior_removed`: the watcher can no longer waive verification after editing a proposed spec; a content patch ALWAYS dispatches a verification round (path b).
- `owners_removed`: removes the watcher's path-(c) waiver branch as a promotion source for proposed items (it remains for non-proposed-stage items — out of this gate's scope).
- `tests_removed_or_changed`: AC8 promote.test gains an assertion that waiver-after-content-patch is NOT a valid proposed-promotion terminal (forces a round); the content-identity gate's reference (`request.spec_commit_sha`) is now provably always == promoted content.
- `remaining_invariants`: promotion certifies only reviewed bytes — `normalized(current) == normalized(@ terminal request.spec_commit_sha)`. NO new compensating mechanism (no waiver-identity marker invented); the cut makes the existing gate's reference always valid. ✅ Passes: behavior + state + a promotion-source owner genuinely removed; the gate (kept) is the original mechanism, not a new one.

## Convergence call

`needs R5` — focus_hints: verify (1) the path-(c) cut is complete — no remaining path edits the proposed spec after `request.spec_commit_sha` and still terminalizes with `next_round:null` (the AC4 (a)/(c)-only diagnostic); (2) the promote.py bullet, AC4, watcher bullet, and AC8 all agree that mismatch is refuse-only and waiver-after-content-patch forces a round (no stale-text contradictions remain); (3) 087b is authorized migration-only in files_to_modify with the claimability assertion. r4 verdicts both `proceed_after_patches` (no boundary cross); 1 structural cut + 1 patch + 1 propagation-completion applied — r5 expected to converge.

