---
task_id: 2026-05-20-064-mcp-compact-view-projection
role: builder
writer: codex-builder
last_updated: 2026-05-20T23:24:09Z
handoff_branch: agent/mcp-compact-view-projection
handoff_head_sha: e42d2467d4f451dbfe84172e60bc09a1ec860646
handoff_run_log: raw/internal/agent-runs/2026-05-20-2026-05-20-064-mcp-compact-view-projection.md
---

## current_thesis

Claimed 064 as Codex builder. The task is to add opt-in `view: "compact"` projection to the existing `find_clusters` and `get_atoms` MCP tools, then switch Raycast's MCP client to request compact while keeping rich/default behavior byte-identical.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at e42d2467d4f451dbfe84172e60bc09a1ec860646.
<!-- builder-state-handoff:end -->

## locked_decisions

- Implement only the two-tool compact projection named in the spec: `find_clusters` and `get_atoms`.
- Keep rich/default behavior byte-identical; compact is opt-in and additive.
- Put shared KEEP/DROP logic in `src/mcp/wire-shape/compact.ts`; no per-tool duplicate filtering.
- Compose compact after existing size projection; do not change numeric wire caps.
- Widen registered output schemas only as needed for compact responses to pass MCP structuredContent validation.
- Switch Raycast's `findClusters()` and `getAtoms()` request bodies to `view: "compact"` and relax the cluster type to match compact.
- Remove only the Raycast cluster debug HTML comment called out by AC6.
- Verify with the specified MCP and Raycast tests; do not add new dependencies.

## open_questions

- None blocking at claim.

## dont_touch

- Do not add compact mode to `search_memories` or `get_atom`.
- Do not implement Raycast rendering/layout/icon redesign beyond the AC6 request-body/type/comment changes.
- Do not relax `WIRE_SHAPE_CAPS` numeric values.
- Do not migrate agent consumers to compact or change rich/default behavior.
- Do not improve daemon-side cluster labeling beyond AC7 UUID-label nulling under compact.
- Do not create new `*_for_display` tools.
- Do not remove or deprecate rich mode.
- Do not edit wiki pages or broader product docs.

## canonical_anchors

- spec: backlog/pending_review/2026-05-20-064-mcp-compact-view-projection.md
