---
item_id: 2026-06-03-088-proposed-stage-pipeline
round: 1
combined_at: '2026-06-03T21:25:17Z'
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
| 1 | HIGH | codex | backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:15,92-96 | accepted — patched | **Converges with #4.** Added the TERMINAL-PROMOTABLE predicate to AC4 (no unfilled `_strategist fills_` rows; `escalated_to_founder:false`; `next_round:null`; terminal convergence marker present; no `r<N+1>/request.md`). Promotion recovery keys off this, never combined.md existence. AC8/promote.test gains the crash-after-combine-before-disposition NEGATIVE case. Patched in spec-r1-patches. |
| 2 | MEDIUM | codex | backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:17,97-100,132-133 | accepted — patched | Resolved the unbuildable choice: `--check` is **fixture-only** (validates generator vs fixtures, not the live tracked file); builder ships the generator ONLY and never writes `docs/BACKLOG.md` (stays off files_to_modify, forbidden builder write like wiki/index.md); live regen is the strategist post-merge step. AC5 + files_to_modify bullet patched. |
| 3 | MEDIUM | codex | backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:24,112-115 | accepted — patched | Replaced the `tests/backlog/blocked.test.*` placeholder with the real shipped harness `tools/test_blocked.py` in files_to_modify + AC8; AC8 now requires `python3 tools/test_blocked.py` green so the spec_review assertions get reworked, not left stale. |
| 4 | HIGH | codex-ops | backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:92-96; skills/review-queue-watch.md:75-120 | accepted — patched | **Converges with #1** — same TERMINAL-PROMOTABLE predicate fix. The watcher pre-step recovers ONLY terminal-promotable rounds; a crash after combine.py-push-before-disposition cannot promote an unpatched proceed_after_patches/pushback spec. |
| 5 | MEDIUM | codex-ops | backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:76-79,92-96,101-107 | accepted — patched | Gave the stale-ready bounce a concrete scheduled owner: a **watcher pre-step** scans `ready/` for ready_content_sha mismatches and calls promote.py's bounce, logging a `queue-errors.md` entry on fire-or-fail. blocked.py stays report-only (J3 resolved). AC4 + promote.py bullet + J3 patched. |

_Reframe gate: not triggered — r1 has no prior-round `spec-r*-patches` commits, so all five findings target original spec text (must-patch, not patch-on-patch). No fresh-context investigator required._

## Convergence call

`needs R2` — focus_hints: verify (1) the TERMINAL-PROMOTABLE predicate in AC4 actually excludes a merely-combined round and the AC8 negative test pins it; (2) AC5 fixture-only `--check` keeps `docs/BACKLOG.md` off the builder write path while still catching generator drift; (3) AC8 names `tools/test_blocked.py` with the required command; (4) the stale-ready bounce watcher pre-step + queue-errors logging is a complete unattended owner. All r1 verdicts were `proceed_after_patches` (no boundary cross); patches applied, r2 verifies.

