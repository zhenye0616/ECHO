---
item_id: 2026-05-20-064-mcp-compact-view-projection
round: 2
combined_at: '2026-05-20T22:28:12Z'
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
| 1 | MEDIUM | codex | backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:75; src/mcp/tools/find-clusters.ts:178 | accepted — patched | `10b69a9` — AC4 KEEP list now includes `open_loop_hints_omitted` (the existing projector at `src/mcp/tools/find-clusters.ts:178` emits this companion whenever `open_loop_hints` exceeds `SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP=30`). Without it, a >30-hint cluster under compact silently loses the truncation signal that rich mode rebuilds via `result_caps`. Test fixture added: a synthetic 35-hint cluster under `view: "compact"` returns `open_loop_hints.length === 30` AND `open_loop_hints_omitted === 5`. |
| 2 | MEDIUM | codex | backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:19; src/mcp/tools/get-atoms.ts:97-106; src/mcp/tools/get-atoms.ts:312-320 | accepted — patched | `10b69a9` — AC5 + line-19 `files_to_modify` entry + line-12 `files_to_modify` (`src/mcp/tools/get-atoms.ts`) all clarify the `view=compact + fields=[...]` composition rule: the existing always-on fields contract for `get_atoms` (`id`, `source`, `timestamp`, `truncations` — required by `getAtomsOutputSchema`) is preserved regardless of `view` or `fields`. `fields=[...]` narrows the remaining-optional payload AFTER compact projection. So `view=compact + fields=["content"]` returns atoms with `{id, source, timestamp, truncations, content}`, NOT a literal set intersection (which would conflict with the registered schema). Test fixture added. |

## Convergence call

`needs r3 — focus_hints: verify the two r2 patches in spec commit 10b69a9 resolve the original findings without introducing new mechanism bugs. (1) AC4's `open_loop_hints_omitted` KEEP addition + the 35-hint test fixture instruction is implementable as one test case in tests/mcp/find-clusters.test.ts; (2) AC5's clarified `view=compact + fields=[...]` composition rule is unambiguous about which fields are always-on vs optional-narrowable, the line-12 + line-19 + AC5-body all carry the same wording, and the test instruction in tests/mcp/get-atoms.test.ts is constructable. No removal-over-deeper-patching consideration — both r2 findings targeted original spec text (not r1's patches). codex-ops r2 was already `proceed` with zero findings; codex r2 verification is the primary r3 concern; codex-ops r3 should be a quick confirmation that the operational contracts (output schemas, budget loops, server-test coverage) survive the r2 KEEP/composition additions intact.`

