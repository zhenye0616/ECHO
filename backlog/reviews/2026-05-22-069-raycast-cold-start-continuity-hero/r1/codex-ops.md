---
item_id: "2026-05-22-069-raycast-cold-start-continuity-hero"
round: 1
reviewer: "codex-ops"
artifact_sha: "dab0bbb"
completed_at: '2026-05-22T19:58:13Z'
verdict: "pushback"
findings:
  - severity: high
    where: "backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md:130"
    finding: >
      The cluster-derived hero cannot fire in the production Raycast path because Raycast calls `find_clusters` with `view: "compact"` (`tools/raycast-echo/src/lib/mcp.ts:91-92`), and the compact projection currently preserves only `has_open_loop` in `rank_reason` (`src/mcp/wire-shape/compact.ts:66-68`). AC2 gates on `has_unresolved_open_loop` and `code_session_anchor`, but neither reason reaches `EmptyState` unless the spec adds `src/mcp/wire-shape/compact.ts`/client type updates and a wire-shape test. At runtime this ships as “running session only”; the cold-start cluster hero silently never appears.
  - severity: high
    where: "backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md:121"
    finding: >
      The freshness gate reads `top.time_range.most_recent`, but the current `find_clusters` and Raycast client shapes expose `time_range: { from, to }` (`src/mcp/tools/find-clusters.ts:100-101`, `tools/raycast-echo/src/lib/mcp.ts:51`). If implemented literally, `new Date(undefined).getTime()` yields `NaN`, so `fresh` is always false and the cluster hero never renders. The spec needs to either use `time_range.to` everywhere or explicitly change the wire shape and tests.
  - severity: high
    where: "backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md:101"
    finding: >
      The `code_session_anchor` contract collapses the production trust gate. It says the substrate signal can treat `cluster_id !== undefined` as the session anchor fallback (`backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md:104`), but `Cluster.cluster_id` is required for every cluster (`src/trace/types.ts:65-76`), so every fresh unresolved cluster becomes code-anchored even when it has no repo/file/git/session evidence. The same bullet also names artifact `kind`s `repo_root` and `file_ref`, while the current normalized artifacts use `type: 'repo' | 'file' | 'commit'` (`src/normalize/artifacts.ts:33-140`). In production this either over-promotes generic unresolved chatter or misses real code anchors, depending on how the builder interprets the mismatch; both break the no-best-guess invariant.
---

## Operational Review

Verdict: pushback.

The spec is aiming at the right failure mode, but three runtime contracts are not yet aligned with the shipped MCP/Raycast shapes. The patch should tighten the wire path and anchor definition before a builder starts, otherwise the unattended Raycast open will either show no cluster hero at all or show a low-confidence one.
