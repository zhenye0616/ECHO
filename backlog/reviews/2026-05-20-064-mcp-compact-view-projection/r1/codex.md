---
item_id: "2026-05-20-064-mcp-compact-view-projection"
round: 1
reviewer: "codex"
artifact_sha: "8a2e87bbf68ab78655f7c52b73a23d2887769058"
completed_at: '2026-05-20T21:58:46Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:17"
    finding: >-
      The spec's daemon test paths are outside the configured test tree. It names
      `test/mcp/wire-shape/compact.test.ts`, `test/mcp/tools/find-clusters.test.ts`,
      and `test/mcp/tools/get-atoms.test.ts`, but this repo uses `tests/` and
      `vitest.config.ts` only includes `tests/**/*.test.ts`; the existing files are
      `tests/mcp/find-clusters.test.ts`, `tests/mcp/get-atoms.test.ts`, and
      `tests/mcp/wire-shape/*.test.ts`. A builder following the spec can create
      the requested files under `test/` and `npm test` will not execute the AC2-AC5
      regression coverage. Patch the spec to use the existing `tests/mcp/...` paths.
  - severity: "medium"
    where: "backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:20"
    finding: >-
      AC6's Raycast POST-body assertion is currently untestable because
      `tools/raycast-echo/test/mcp.test.ts` does not exist, and the spec says not
      to introduce it when absent. The fallback to AC2 daemon-side coverage cannot
      prove `tools/raycast-echo/src/lib/mcp.ts` actually sends `view: "compact"` in
      `params.arguments`, so the main consumer could keep requesting rich output
      while the daemon tests pass. Require a Raycast-side fetch/callTool test, either
      by adding this test file or by naming an existing Raycast test file to extend.
  - severity: "medium"
    where: "backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:105"
    finding: >-
      AC6 says the existing Raycast TypeScript types already match compact, but
      `tools/raycast-echo/src/lib/mcp.ts` currently requires `FindClustersCluster.rank`
      and `rank_reason`, while AC4 drops `rank` and often omits `rank_reason`; it also
      types `label?: string` even though AC7 emits `label: null`. Patch AC6 to require
      the existing type to make rich-only fields optional and `label` nullable, or
      explicitly allow a separate compact cluster type. As written, the "types remain"
      instruction conflicts with the compact wire contract.
---

# Codex review

Verdict: `proceed_after_patches`.

The substrate shape is implementable, but the spec needs the patches above before a builder can rely on the tests and TypeScript contract. I did not consume task-state; this review used the request body plus the artifact at `8a2e87b`.
