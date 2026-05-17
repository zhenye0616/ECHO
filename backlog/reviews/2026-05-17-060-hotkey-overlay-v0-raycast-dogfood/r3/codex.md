---
item_id: "2026-05-17-060-hotkey-overlay-v0-raycast-dogfood"
round: 3
reviewer: "codex"
artifact_sha: "34f29a83cf604c0c02d58a54bab655562c77ee37"
completed_at: '2026-05-17T21:37:38Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-17-060-hotkey-overlay-v0-raycast-dogfood.md:63"
    finding: >-
      The cluster detail fetch slices `cluster.atom_ids` before applying `prefer: newest_first`. In the pinned repo state, cluster atom ids are sorted lexicographically in `connectedComponents` (`src/trace/cluster.ts:151-156`) and then passed through unchanged by `buildRecentWorkContext`/`find_clusters` (`src/trace/index.ts:117-134`, `src/mcp/tools/find-clusters.ts:144-179`). For any cluster with more than three atoms, `cluster.atom_ids.slice(0,3)` is therefore an arbitrary id-ordered subset; `get_atoms(..., prefer: newest_first)` can only sort that already-truncated subset. Patch the spec to define a chronology-safe selection policy, e.g. fetch up to the `get_atoms` max and display the newest returned atoms, or explicitly accept arbitrary representative atoms instead of implying newest-first detail content.
  - severity: "low"
    where: "backlog/ready/2026-05-17-060-hotkey-overlay-v0-raycast-dogfood.md:17,48,211"
    finding: >-
      Stale AC numbering remains after the AC6/AC7 to AC8/AC9 move: `files_to_modify` still says README dogfooding expectation is per AC6, the intro says AC7 makes V1 deferral explicit, and After Completion says `When AC6 fires`. The actual post-merge gates are AC8 and AC9. This is unlikely to break implementation, but it should be patched so the builder and later strategist do not chase nonexistent acceptance criteria.
---

# Codex review - round 3

Verdict: `proceed_after_patches`.

The Raycast API names I checked are current enough for the spec shape (`List`, `ActionPanel`, programmatic `Clipboard.copy`/`Clipboard.paste`, failure toasts, and action-based paste/copy patterns). The daemon-side assumptions also line up with the pinned repo state: `/mcp` is loopback HTTP, the four retrieval tools are registered without `X-Echo-Role`, and the trace viewer only serves the bare index route.

## Findings

1. **MEDIUM - cluster detail atom selection is not chronology-safe.** The spec says cluster selection calls `get_atoms(cluster.atom_ids.slice(0,3), format: "minimal", prefer: "newest_first")`. At the pinned SHA, `connectedComponents()` sorts cluster IDs lexicographically before they ever reach `find_clusters`, so slicing first chooses an arbitrary id-ordered subset. `prefer: "newest_first"` then only sorts those three arbitrary atoms. Patch the spec to either fetch a larger bounded set before choosing newest returned atoms, or make clear that v0 intentionally shows arbitrary representatives.

2. **LOW - stale AC references survived the post-merge gate rewrite.** Lines 17, 48, and 211 still refer to AC6/AC7 even though the live gates are AC8/AC9. Patch the numbering references before build handoff.
