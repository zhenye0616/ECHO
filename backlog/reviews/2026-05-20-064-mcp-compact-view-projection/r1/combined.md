---
item_id: 2026-05-20-064-mcp-compact-view-projection
round: 1
combined_at: '2026-05-20T22:13:20Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 2
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
| 1 | HIGH | codex | backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:17 | accepted — patched | `a800b2d` — Test paths `test/mcp/...` corrected to `tests/mcp/...` in all four `files_to_modify` entries + AC2 + AC3 + AC5 inline references. Confirmed `vitest.config.ts` only includes `tests/**/*.test.ts`; existing layout is `tests/mcp/find-clusters.test.ts` (no `tools/` subdir), `tests/mcp/get-atoms.test.ts`, `tests/mcp/wire-shape/match.test.ts`. |
| 2 | MEDIUM | codex | backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:20 | accepted — patched | `a800b2d` — `tools/raycast-echo/test/mcp.test.ts` promoted from "IF EXISTS, extend" to mandatory NEW (~30 lines: mock global `fetch`, assert POST body includes `view: "compact"` for both `findClusters()` and `getAtoms()`). Without this, daemon-side AC2 coverage cannot prove Raycast actually opts in. |
| 3 | MEDIUM | codex | backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:105 | accepted — patched (overlap with #6) | `a800b2d` — AC6 + `files_to_modify` line 15 updated: `FindClustersCluster.rank` becomes optional, `rank_reason` becomes optional, `label?: string` → `label?: string \| null` to match compact's drops (AC4) + AC7's UUID-fallback emission. Single relaxed type rather than splitting into a `CompactFindClustersCluster` (Raycast only issues compact calls per AC6). |
| 4 | HIGH | codex-ops | backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:77-80; src/mcp/tools/find-clusters.ts:274-309 | accepted — patched | `a800b2d` — New paragraph under AC4 mandates widening the registered `findClustersOutputSchema` so `query` + `result_caps` become optional (else compact responses fail `registerTool`'s structuredContent validation and schema-aware MCP clients reject before the human sees anything). Same requirement for `getAtomsOutputSchema` verify-and-widen-if-needed. Added `tests/mcp/server.test.ts` to `files_to_modify` for the new server-level test calling `tools/call` with `view: "compact"`. |
| 5 | HIGH | codex-ops | backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:84-100; src/mcp/tools/get-atoms.ts:254-278; src/mcp/tools/find-clusters.ts:228-258 | accepted — patched | `a800b2d` — New paragraph under AC5 mandates budget accounting AFTER view-specific projection. `get_atoms` prefix-drop loop + `find_clusters` `buildResult` envelope trim both currently size on rich/default-projected atoms; without this fix the 207KB codex case still drops atoms based on rich-mode fields compact would have removed — defeating the entire reason this spec exists. Added overflow tests: rich `atoms_dropped > 0` AND same request in compact `atoms_dropped: 0` (or strictly fewer) when byte savings fit the 25k ceiling. Same shape for clusters. |
| 6 | MEDIUM | codex-ops | backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:104-106; tools/raycast-echo/src/lib/mcp.ts:29-37 | accepted — patched (overlap with #3) | `a800b2d` — Same patch as finding #3 (codex and codex-ops both flagged the same Raycast type misalignment from different `where:` anchors). Single edit to AC6 + line-15 files_to_modify addresses both. |

## Convergence call

`needs r2 — focus_hints: verify the five r1 patches in spec commit a800b2d resolve the original findings without introducing new mechanism bugs. (1) tests/ paths in files_to_modify + AC2 + AC3 + AC5 all consistent with the existing tests/mcp/ layout; (2) AC4's findClustersOutputSchema widening + tests/mcp/server.test.ts test instruction is implementable as one server-test addition (verify getAtomsOutputSchema requirements too); (3) AC5's budget-after-projection requirement is unambiguous about WHICH bytes the prefix-drop loop sizes on, and the overflow tests are constructable from existing fixtures; (4) AC6 + line-15 FindClustersCluster type update is the right scope (single relaxed type vs. introducing a compact-specific type); (5) tools/raycast-echo/test/mcp.test.ts NEW requirement composes with the existing Raycast vitest config without new infrastructure. No removal-over-deeper-patching consideration this round — all 5 findings target the original spec text, not a prior round's patch.`

