---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 13
combined_at: '2026-07-16T07:49:15Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: f130ba6fd89bd598a06e7603b700fb0f66c6dd54
next_round: 14
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

Reframe gate: FIRED. All three R13 findings target the R12 fresh-clone-verifier propagation patch at 46553624 (single initial HEAD read despite three later cleanliness boundaries; incomplete shorthand rather than complete per-mode traces; gitignored owned-temp cleanup inferred from a status probe that cannot observe it), so the mandatory fresh-context investigator ran with `codex exec --sandbox read-only`; task-state pointers were withheld and no ECHO MCP tool was invoked. Investigator verdict: `kind: propagation_completion` — R11 already made the structural owner-consolidation cut to one Node verifier behind the thin exec-only wrapper, while R12 incompletely propagated the pre-existing HEAD-binding, trace, and owned-cleanup invariants inside that seam. Recommendation accepted without override. Diagnostic applied before patching: mechanically derive both complete traces; `HEAD == S` and empty status must each occur exactly three times, source build/derived-verify must be 1/1, release build/caller-verify must be 0/1, and source owned-temp cleanup must be followed by exact-path ENOENT; persistent clean retarget and ignored-temp cleanup-failure fixtures must fail while a non-owned sentinel survives. Recorded risk: these boundary probes are not atomic and do not claim resistance to adversarial transient retarget-and-restore or mutate-and-restore; that stronger threat model would require a separately reviewed structural redesign. The accepted patch retains one verifier and adds no owner, state, retry, authority, adoption, or cleanup target.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC3 — HEAD equality and three cleanliness probes | accepted — propagation completion. The verifier retains the validated full source SHA as immutable `S`; each pre-install, post-`npm ci`, and final boundary now contains an exact `git rev-parse HEAD` equality-to-`S` assertion paired with the exact exit-zero/empty-stdout status probe, and a persistent clean retarget between boundaries must fail. The contract explicitly excludes adversarial transient retarget-and-restore claims. | f130ba6fd89bd598a06e7603b700fb0f66c6dd54 — spec-r13-patches |
| 2 | MEDIUM | codex | AC3 exact per-mode allowlist; Tests scripted fresh-clone acceptance bullet | accepted — propagation completion. Replace shorthand common-template/once-only language with the complete ordered source and release traces, explicit ordinal executable+argv entries and per-command counts: HEAD/status each 3; source build/derived verify 1/1; release build/caller verify 0/1; cleanup and final assertions placed explicitly. Matching tests assert the entire trace, order, counts, and mode exclusions. | f130ba6fd89bd598a06e7603b700fb0f66c6dd54 — spec-r13-patches |
| 3 | MEDIUM | codex | AC3 verifier-owned temporary cleanup; Tests cleanliness fixtures | accepted — propagation completion. Source-mode cleanup remains a Node-internal operation over only the exact recorded owned directory and is followed by an explicit Node filesystem ENOENT assertion; cleanup error or continued existence fails independently of git status. Fixtures inject cleanup failure and a surviving gitignored owned temp while proving a non-owned sentinel is never removed. Release mode creates no unnecessary owned temp directory. | f130ba6fd89bd598a06e7603b700fb0f66c6dd54 — spec-r13-patches |

## Convergence call

needs R14 — focus_hints: Verify at the patched exact SHA that immutable expected source SHA `S` is reasserted together with the empty-status probe at all three boundaries; that the complete source and release traces enumerate every ordinal/executable/argv and exact per-command count (HEAD/status 3 each, source build/derived verify 1/1, release build/caller verify 0/1) with cleanup and final assertions placed unambiguously; and that source owned-temp cleanup is followed by an exact-path Node ENOENT assertion with persistent-clean-retarget, ignored-owned-temp cleanup-failure, and non-owned-sentinel fixtures. Confirm one Node verifier/thin wrapper, no transient-retarget security claim, and no retry/adoption/cleanup-owner/authority expansion.
