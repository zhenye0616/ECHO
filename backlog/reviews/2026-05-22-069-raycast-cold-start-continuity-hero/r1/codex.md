---
item_id: "2026-05-22-069-raycast-cold-start-continuity-hero"
round: 1
reviewer: "codex"
artifact_sha: "dab0bbbebd1c133dc4a7cff1b946fc1389ad5233"
completed_at: '2026-05-22T20:12:16Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md:130; src/mcp/wire-shape/compact.ts:16-27; src/mcp/wire-shape/compact.ts:50-68; tools/raycast-echo/src/lib/mcp.ts:91-93"
    finding: >-
      The cluster hero cannot fire through the current Raycast path unless the compact wire projection is patched. Raycast calls `find_clusters` with `view: "compact"`, but `compactCluster` currently narrows `rank_reason` to exactly `["has_open_loop"]` and drops every other reason. AC1 only adds `has_unresolved_open_loop` and `code_session_anchor` in `rankReasonsFor`; AC2 then gates on those strings in Raycast, so the downstream UI will never see them. Add `src/mcp/wire-shape/compact.ts` to `files_to_modify`, widen the compact `rank_reason` type/projection to pass the new additive reason strings, and add a compact wire-shape test that proves both reasons survive into `FindClustersCluster.rank_reason`.
  - severity: "high"
    where: "backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md:101-105; src/trace/types.ts:65-76; src/normalize/types.ts:47-52; src/normalize/artifacts.ts:33-53; src/normalize/artifacts.ts:80-101; src/normalize/artifacts.ts:132-139"
    finding: >-
      The `code_session_anchor` contract is not code-grounded as written. `Cluster.cluster_id` is a required string, so the substrate-side `cluster_id !== undefined` branch makes `code_session_anchor` true for every cluster and collapses the intended anchor gate to unresolved+fresh. The other anchor predicates also use non-current field names: artifacts expose `type`, not `kind`, with values `repo`, `file`, and `commit`, and atoms expose `source.app`, not `source_app`. Patch AC1 to remove the tautological `cluster_id !== undefined` rank predicate, use the current artifact/source fields, and if linked sessions should count as an anchor, make that a Raycast-side `sessions.some((s) => s.clusterId === top.cluster_id)` condition in `pickHero` instead of a rank signal.
  - severity: "medium"
    where: "backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md:81-85; backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md:121; backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md:133-135; tools/raycast-echo/src/lib/mcp.ts:45-53; src/mcp/wire-shape/compact.ts:16-23"
    finding: >-
      AC2's hero pseudocode and row contract reference data the compact cluster does not have. The current `FindClustersCluster.time_range` shape is `{ from, to }`, so `top.time_range.most_recent` will not compile and should be `top.time_range.to`. The fallback "newest USER atom's text preview from `cluster.atom_ids[last]`" is also underspecified because compact clusters only carry IDs, not atom bodies, and `EmptyState` currently receives no `clusterPreviews` map. Either pass the existing preview data into the hero seam and test that fallback, or narrow V1 to `cluster.label`/atom-count fallback so the builder is not forced to invent a fetch path.
  - severity: "medium"
    where: "backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md:149-155; backlog/ready/2026-05-22-069-raycast-cold-start-continuity-hero.md:189-200; tsconfig.json:16-24; tools/raycast-echo/package.json:62-67"
    finding: >-
      The verification contract does not run the Raycast package checks that cover the edited TSX. Root `npm test` uses the root Vitest config, root `npm run typecheck` explicitly excludes `tools/raycast-echo/**/*`, and the spec names a non-existent `tests/raycast-echo/` path. Patch the Tests/Definition of Done to run the root trace test plus `(cd tools/raycast-echo && npm test && npm run typecheck)`, and keep `tools/raycast-echo/test/empty-state-hero.test.tsx` under the Raycast package's Vitest config.
---

# Codex review

Verdict: `proceed_after_patches`.

The product cut is implementable, but the ready spec needs the patches above before a builder claims it. The main blocker is mechanical: the Raycast command consumes the compact `find_clusters` shape, and that projection currently strips the exact reason strings the new hero gate needs. The anchor predicate also needs tightening so `code_session_anchor` remains a real confidence signal instead of becoming true for every cluster.
