---
item_id: "2026-05-20-064-mcp-compact-view-projection"
round: 2
reviewer: "codex"
artifact_sha: "125bb8d771702804e9c7016a0fbec3825c2bae25"
completed_at: '2026-05-20T22:25:55Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:75; src/mcp/tools/find-clusters.ts:178"
    finding: >-
      AC4's compact cluster keep-list omits `open_loop_hints_omitted`, even though
      the existing projector emits that field whenever `open_loop_hints` is capped.
      Compact also drops `result_caps`, so a compact response with more than
      `SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP` hints would show a shortened
      `open_loop_hints` array with no truncation signal. Patch AC4 to keep
      `open_loop_hints_omitted` (or emit an equivalent compact warning) and add a
      compactCluster/find_clusters test with a >30-hint cluster.
  - severity: "medium"
    where: "backlog/ready/2026-05-20-064-mcp-compact-view-projection.md:19; src/mcp/tools/get-atoms.ts:97-106; src/mcp/tools/get-atoms.ts:312-320"
    finding: >-
      The AC5 test note says `view=compact + fields=["content"]` composes as
      `compact keep-list ∩ fields`. Taken literally, that drops `id`, `source`,
      `timestamp`, and `truncations`, but the current `get_atoms` fields contract
      always keeps those fields and `getAtomsOutputSchema` requires them. Patch the
      spec/test expectation to say `fields[]` narrows the optional payload fields
      after compact projection while `id`/`source`/`timestamp`/`truncations` remain
      always-on; otherwise a builder can produce a compact+fields response that
      conflicts with the registered schema.
---

# Codex review

Verdict: `proceed_after_patches`.

The five r1 patches landed in the requested places: paths now match `tests/mcp`, Raycast has a required POST-body test, server-schema widening is required, byte-budget checks are explicitly post-projection, and the Raycast cluster type is nullable/optional for compact. The remaining gaps are smaller contract issues in the compact shape itself.

I did not consume task-state; this review used the r2 request plus the artifact at `125bb8d` and code at the same commit.
