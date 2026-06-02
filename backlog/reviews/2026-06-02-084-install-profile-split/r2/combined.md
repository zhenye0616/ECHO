---
item_id: 2026-06-02-084-install-profile-split
round: 2
combined_at: '2026-06-02T07:57:00Z'
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
| 1 | MEDIUM | codex | spec AC2b; cli/inverse/skills.ts | accepted — mechanism DROPPED (PAIRED w/ #2, #4) | Real: AC2b named a non-existent inverse file (`skill-files.ts` vs real `skills.ts`) and the existing helper removes hop-2 only by comparing to a hop-1 source the prune deletes first (→ `source-missing` skip). This is a bug in the r1-added prune. Per removal-over-deeper-patching + the reprofile case being impossible in V1 (fresh coworker; founder stays dogfood via AC4(b)), I **removed AC2b** and narrowed AC2's guarantee to FRESH installs — codex r1 F1's own sanctioned alternative. No inverse-module change needed → AC8 scope concern dissolves. |
| 2 | MEDIUM | codex | spec AC2b; role-sync.ts / workflow-sync.ts | accepted — mechanism DROPPED (PAIRED w/ #1) | The decisive one: roles/workflows carry **no ownership marker** (raw TOML by filename), so AC2b's "marker-gated removal" was impossible for them and any name-based delete risks user data-loss. Rather than invent an ownership predicate (scope creep + risk), the prune is removed (OoS#1b); a safe reprofile cleanup with a real predicate is a filed followup. No file-deletion path ships in 084. |
| 3 | MEDIUM | codex-ops | spec AC1/AC4; partial-scaffold race | accepted — patched | NOT a prune finding — a real lifecycle hole: `ensureEchoHome()` writes onboarding.json before profile persists, so an interrupted fresh customer install → rerun reads "valid file, no profile" → resolves dogfood → reinstalls coord surface. AC4 hardened: capture `had_onboarding_before_init` BEFORE `ensureEchoHome()` and persist `profile` atomically BEFORE any fallible sync/wire step; AC6(ii) + AC7 add the no-flip-on-rerun / partial-scaffold regression. |
| 4 | MEDIUM | codex-ops | spec AC2b/AC6/AC7; user-file safety | accepted — mechanism DROPPED (PAIRED w/ #1, #2) | The data-loss worry (prune could delete same-named user roles/workflows/commands lacking a marker) is fully dissolved by removing the prune — 084 ships no deletion path, so user files in `~/.echo/{skills,roles,workflows}` + vendor command dirs are untouched by construction. The seed-non-echo-owned-files-survive test it asked for is moot (nothing deletes). |

## Convergence call

**needs R3** — 4 findings: 3 (#1/#2/#4) are bugs in the r1-added AC2b prune → **mechanism removed** (not patched deeper); 1 (#3) is a real AC4 lifecycle race → patched. Net: 084 now ships NO file-deletion path; the clean-surface guarantee is fresh-customer-installs-only (reprofile = OoS#1b + filed followup). One verification round to confirm the removal converges. focus_hints: confirm (1) no AC/test/file references a prune, inverse helper, or stale-artifact removal anymore (AC2b gone; `cli/inverse/*` out of files_to_modify); (2) AC2 guarantee is explicitly fresh-install-scoped + OoS#1b documents reprofile-out; (3) AC4 resolves+persists profile atomically before any fallible step, with had_onboarding_before_init captured pre-`ensureEchoHome` (codex-ops r2 F3) + the partial-scaffold/no-flip regression in AC6(ii)/AC7; (4) AC3 customer-skip-as-success unchanged. Removal + one targeted patch — expect convergence.

