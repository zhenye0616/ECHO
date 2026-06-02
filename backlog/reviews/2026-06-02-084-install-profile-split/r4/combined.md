---
item_id: 2026-06-02-084-install-profile-split
round: 4
combined_at: '2026-06-02T08:16:00Z'
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
| 1 | MEDIUM | codex | spec AC1; run-wizard.ts | accepted — patched | Real scope gap: the public `Wizard.wire()` init.ts calls lives in `run-wizard.ts` and its `Pick<WireOpts,...>` excludes `profile`, so threading profile would typecheck-fail while AC8 forbids editing an unlisted file. Added `src/echo-home/wizard/run-wizard.ts` to files_to_modify. (Same class as r3's render.ts find.) |
| 2 | MEDIUM | codex-ops | spec AC4; wire.ts/init.ts ordering | accepted — discriminator DROPPED (not patched deeper) | Second crash window in r3's `completed`/agents discriminator: `wire()` writes `agents` BEFORE completion, so a fresh-customer install crashing mid-wire shows `completed:false`+agents+no-profile → reclassified dogfood. Per removal discipline (the discriminator surfaced a NEW window every round r2→r3→r4) I removed legacy-inference entirely: **missing profile ⇒ customer unconditionally** (AC4/Locked#2/J7). No state to misread → the whole partial-scaffold class is dissolved; founder opts into dogfood explicitly + a loud warning prevents silent downgrade. Dissolves this finding AND all prior partial-scaffold findings. |

## Convergence call

**needs R5** — 2 findings: #1 a scope add (run-wizard.ts), #2 the SECOND crash-window in the r3 discriminator → legacy-inference **removed** (missing profile ⇒ customer always; J7). The removal dissolves the entire partial-scaffold class that consumed r2–r4. One verification round. focus_hints: confirm (1) AC4 = missing profile ⇒ customer UNCONDITIONALLY, no `completed`/`agents`/file-presence inference anywhere; the only dogfood paths are explicit flag / answer-file / recorded value; (2) the pre-084 loud-warning path (existing profile-less file + no flag ⇒ customer + restore warning); (3) `run-wizard.ts` now in files_to_modify so profile threads through `Wizard.wire()` without an AC8 violation; (4) no remaining reference to a discriminator, partial-scaffold inference, or `had_onboarding_before_init`. Removal + 1 scope add — expect convergence.

