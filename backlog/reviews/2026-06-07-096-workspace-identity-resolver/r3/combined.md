---
item_id: 2026-06-07-096-workspace-identity-resolver
round: 3
combined_at: '2026-06-07T19:27:24Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 4
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
| 1 | MEDIUM | codex | files_to_modify / AC1-AC2 | accepted — patched | AC1 branch (i) now defines a **git-only `gitToplevel(path)` primitive** returning `null` on any git failure (no anchor/reported-dir fallthrough); AC2 pins `probeGitState.repo_root` to use `gitToplevel`, NOT `resolveCanonicalRoot`, so 095's `git_state` semantics are preserved. |
| 2 | MEDIUM | codex | AC3 | accepted — patched | AC3 now requires the git watcher to pass the toplevel through the SAME realpath/case canonicalization as `resolveCanonicalRoot` before stamping `canonical_root`, so symlink/case-variant repo paths don't split the `local:workspace:<root>` key. |
| 3 | MEDIUM | codex | AC5-AC6 | accepted — patched | `git_alias` location pinned to ONE place: `context.ambient.git_alias` (single normalized-URL string), never on the workspace artifact, never an ArtifactRef; AC6 + all three adapters + tests use exactly that. |
| 4 | MEDIUM | codex | AC8 | accepted — patched | AC8 now requires direct capture-side assertions that claude_code/git-watcher/codex each stamp `metadata.canonical_root` (AC2/AC3/AC4), not implicit via normalize tests. |
| 5 | MEDIUM | codex-ops | AC1 — Ambient-root guard | accepted — patched | AC1 guard now applies the `$HOME` ceiling ONLY when the start path is under resolved home; outside-home (`/tmp/<ws>`, external volume) and missing-`HOME` (daemon/launchd) contexts walk up normally to find the anchor; AC8 adds temp/external + missing-HOME tests. |

Reframe gate: not triggered — of the 5 findings, only codex-ops #5 targets r1-patch-introduced text (the ambient-root guard); the other four target ORIGINAL spec ambiguities (the `probeGitState`↔resolver interaction, AC3 canonicalization, the AC5 `git_alias` "artifact OR ambient" choice, AC8 capture coverage) reached by a deeper sweep this round. 1 < 2, so the mandatory investigator does not fire. All five are text-pin dispositions (no removal language → no removal proof matrix). Cycle-budget note: finding count 5→2→5, but each round swept disjoint sections (artifact tuple → timeout/case-test → resolver-internals/adapter-wiring); these are precision/correctness, not design re-litigation. If r4 surfaces a fresh wave of NEW (non-verification) findings, escalate to founder per the cycle-length-budget gate.

## Convergence call

`needs R4` — proposed-artifact verification round (forced; all five r3 findings dispositioned `accepted` and patched). focus_hints: verify the `gitToplevel` git-only primitive + `probeGitState.repo_root` git-only preservation (AC1/AC2); AC3 watcher canonicalization; the single pinned `context.ambient.git_alias` location (AC5/AC6); AC8 capture-stamp + outside-HOME/missing-HOME tests. Confirm these are the last ambiguities and no new mechanism/scope was introduced.

