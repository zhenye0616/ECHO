---
item_id: 2026-06-01-083-init-registers-claude-code-mcp
round: 2
combined_at: '2026-06-02T07:13:52Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 3
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
| 1 | MEDIUM | codex | backlog/ready/2026-06-01-083-init-registers-claude-code-mcp.md:68 and :81 | accepted — mechanism dropped (not patched deeper) | Real catch: `claude mcp get echo` is unscoped and reports the *local* entry under a shadow, so the r1 get→compare→remove/re-add reconcile misclassifies a local shadow as a stale user entry. Per the watcher removal-over-deeper-patching discipline (this finding targets the mechanism r1 *added*) AND because parsing the CLI's human `Scope:` line is the ambient-output-as-API anti-pattern (2026-05-28 root-cause), I **removed the auto-reconcile** rather than add a `Scope:`-parser. Locked#4 + AC3(b) rewritten: exit-1 duplicate → record `already-exists (unverified)`, do NOT parse `get`, do NOT auto remove/re-add; the **probe/doctor + AC2 remediation** is the reachability authority (init must not report claude-code healthy on a duplicate unless probe passes). codex-ops r2 = `proceed` (no findings). |

## Convergence call

**needs R3** — codex-ops already `proceed` (0 findings); codex's single MEDIUM resolved by *removing* the r1 reconcile mechanism (not deepening it). One verification round to confirm the removal converges. focus_hints: confirm Locked#4 + AC3(b) no longer instruct any `claude mcp get`/output-parse or auto remove+re-add; that exit-1 duplicate is handled as `already-exists (unverified)` with probe/doctor + AC2 remediation as the reachability authority; that init cannot report claude-code healthy on a duplicate without an independent probe pass; and that the accepted two-live-daemons V1 limitation is consistent with OoS#8 (active shadow detection deferred). No new mechanism added — this is a removal; expect convergence.

