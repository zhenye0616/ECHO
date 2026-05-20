---
item_id: "2026-05-20-064-mcp-compact-view-projection"
round: 1
reviewer: "codex-ops"
artifact_sha: "8a2e87bbf68ab78655f7c52b73a23d2887769058"
completed_at: '2026-05-20T22:07:59Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:77-80; src/mcp/tools/find-clusters.ts:274-309"
    finding: >-
      AC4 makes compact find_clusters drop top-level `query` and `result_caps`, but the live registered `findClustersOutputSchema` requires both fields and is advertised through `server.registerTool`. A Raycast call over MCP can therefore produce structuredContent that violates the tool's own output schema, and schema-aware MCP clients or SDK validation can reject the exact compact response before the human sees anything. Patch AC4/AC2 to require widening the registered output schema for compact mode, and add an MCP server-level test that `tools/call find_clusters` with `view: "compact"` succeeds while omitting `query` and `result_caps`.
  - severity: "high"
    where: "backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:84-100; src/mcp/tools/get-atoms.ts:254-278; src/mcp/tools/find-clusters.ts:228-258"
    finding: >-
      The spec defines compact projection as a field filter after the existing projection, but it does not say the existing 25k envelope budget must size the compact envelope. Today `get_atoms` decides prefix-drop using the atom returned by `projectAtom`, and `find_clusters` trims using `buildResult` with the rich envelope. If the builder applies compact after those loops, the live 207KB codex case still drops atoms or clusters based on fields compact would have removed, so Raycast sees `atoms_dropped` instead of the compact payload this item exists to unlock. Patch AC5/AC4 to require budget accounting after the view-specific projection, and add tool-level tests where a rich/default response overflows but the same request with `view: "compact"` returns the expected atom/cluster under the ceiling.
  - severity: "medium"
    where: "backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:104-106; tools/raycast-echo/src/lib/mcp.ts:29-37"
    finding: >-
      AC6 says the existing Raycast types are already a correct structural subset, but `FindClustersCluster` currently requires `rank` and `rank_reason`, while compact mode drops `rank` and often omits `rank_reason`; AC7 also allows `label: null` while the type is `label?: string`. That makes the Raycast client lie about the runtime response shape, so future UI code can compile while reading fields that compact never sends. Patch AC6 to update the Raycast type surface for compact results, either by making those fields optional/null-aware or by introducing a compact result type for the two compact callers.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The substrate shape is the right direction, but two runtime contracts need to be nailed down before a builder starts: compact responses must still satisfy the live MCP tool schema, and the byte-budget loops must account for compact bytes rather than rich/default bytes. The Raycast type patch is smaller, but it prevents the compact response from becoming an unvalidated runtime surprise in later UI work.
