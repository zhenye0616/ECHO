---
item_id: 2026-06-03-088-proposed-stage-pipeline
round: 2
combined_at: '2026-06-03T21:37:58Z'
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
| 1 | MEDIUM | codex | backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:15-16,93-97 | accepted — patched | Real contradiction in ORIGINAL spec text (AC4 "terminal commit folds the move" vs promote.py bullet "stamp+move+commit+push"). Split promote.py into **two explicit modes**: (i) stage-only (terminal/convergence: mutate, watcher commits) (ii) commit+push (recovery + bounce own their commit). Pinned in promote.py tests. AC4 + promote.py + watcher bullets patched (spec-r2-patches). |
| 2 | HIGH | codex-ops | backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:93-105,120-126 | accepted — patched | Genuine integrity hole in the ORIGINAL ready_content_sha model: stamping the *current* proposed file never proves it's the *reviewed* content. Added a **pre-promotion content-identity gate** — promote.py compares normalized current proposed/ vs the file at the terminal round's `request.spec_commit_sha`; mismatch ⇒ REFUSE (stay in proposed/, queue-errors.md row, dispatch verification round). AC4 + promote.py + promote.test (AC8) patched. |

_Reframe gate: not triggered. codex #1 targets original AC4↔promote.py commit-boundary text (predates r1); codex-ops #2 targets a content-identity gap in the original `ready_content_sha` design (its `where` brushes the r1 TERMINAL-PROMOTABLE predicate but it is an orthogonal missing dimension, not a bug in the predicate's logic). <2 prior-patch-introduced findings → no fresh-context investigator (per skill: <2 must not spend the founder-cost investigator). Both are must-patch on the original promotion-integrity contract; the fix is a unified contract completion (two modes + identity gate), not patch-on-patch accretion — files_to_modify cardinality unchanged._

## Convergence call

`needs R3` — focus_hints: verify (1) promote.py's two-mode split (stage-only vs commit+push) is unambiguous and the stage-only/terminal path produces exactly one folded audit commit; (2) the pre-promotion content-identity gate compares normalized current proposed/ vs `request.spec_commit_sha` and REFUSES on mismatch (stay in proposed/ + queue-errors.md + verification round); (3) AC8 promote.test pins both the mode boundary and the mismatch-refuses negative case. Both r2 verdicts were `proceed_after_patches` (no boundary cross); patches applied, r3 verifies.

