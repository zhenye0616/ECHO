---
item_id: 2026-06-02-084-install-profile-split
round: 3
combined_at: '2026-06-02T08:07:43Z'
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
| 1 | MEDIUM | codex | spec AC5; src/cli/io/render.ts | accepted — patched (CONVERGENT w/ #4) | Real scope gap: doctor TEXT output renders in `render.ts` (`renderDoctorReport()`), not in files_to_modify, so AC5+AC8 conflicted — builder couldn't print the profile in text mode without violating scope. Added `src/cli/io/render.ts` to files_to_modify; AC5 now requires text+JSON; AC7 asserts the text path. |
| 2 | MEDIUM | codex | spec AC4/AC7; scaffold.ts | accepted — patched (CONVERGENT w/ #3) | The r2 atomic-ordering fix NARROWED but didn't CLOSE the crash window: `ensureEchoHome()` writes a valid profile-less file before init persists, so an interrupted fresh scaffold == legacy install on "valid file, no profile." Fixed AC4 with a **durable discriminator over existing fields**: no-file OR (`completed:false` + empty agents) ⇒ customer; (`completed:true` OR agents) without profile ⇒ dogfood. Independent of persistence timing → closes the collapse. AC7 tests the on-disk shape. |
| 3 | MEDIUM | codex-ops | spec AC4/AC7; scaffold.ts | accepted — patched (CONVERGENT w/ #2) | Same partial-scaffold collapse from the ops lens (unattended retry flips fresh→dogfood after a crash). Resolved by the same AC4 discriminator (`completed`/agents) — exactly codex-ops's suggested "define the persisted discriminator." |
| 4 | MEDIUM | codex-ops | spec AC5; src/cli/io/render.ts | accepted — patched (CONVERGENT w/ #1) | Same doctor text-output scope gap; render.ts added + text assertion required. |
| 5 | MEDIUM | codex-ops | spec AC1/AC7; smoke | accepted — patched | Answer-file `profile` was schema-accepted but absent from resolution order/tests → a scripted `profile: dogfood` could silently come up customer. AC1 now pins explicit precedence: CLI `--profile` > answer-file `profile` > recorded > inferred (AC4); AC7 adds the no-TTY answer-file test. |

## Convergence call

**needs R4** — 5 findings, all NEW spec-completeness gaps (NOT bugs in the r2 removal — the prune removal converged clean), 3 convergent pairs + 1: (#1/#4) doctor text-render scope → render.ts added; (#2/#3) AC4 partial-scaffold crash-window → durable `completed`/agents discriminator (closes it independent of timing); (#5) answer-file precedence → explicit chain + test. All patches, no removals. R4 verifies. focus_hints: (1) AC4 inference keys on `completed`/`agents` (no-file or completed:false+empty-agents ⇒ customer; completed:true/agents-without-profile ⇒ dogfood) — NOT file-presence; AC7 asserts all three on-disk shapes. (2) AC1 precedence CLI > answer-file > recorded > inferred, with the no-TTY answer-file test. (3) AC5 requires doctor profile in BOTH text (render.ts, now in files_to_modify) and JSON. Confirm AC8 scope now matches the expanded files_to_modify.

