---
status: shipped
topic: Architecture
subtopic: Retrieval Composition
aliases:
  - MCP Compact View Projection
  - view=compact
  - Compact View
---

# MCP Compact View Projection

## Definition

The compact view projection is a daemon-side **field-hygiene** filter shared by [[mcp-find-clusters|`find_clusters`]] and [[mcp-get-atoms|`get_atoms`]]. When a consumer passes `view: "compact"` in tool arguments, the response is run through a single shared projector at `src/mcp/wire-shape/compact.ts` that drops substrate/runtime debug fields and keeps only the fields a human (or any consumer with a tight context budget) actually needs. The default is `view: "rich"`, so AI agents and pre-existing callers observe byte-identical output to the pre-compact daemon. Shipped 2026-05-20 as item [[2026-05-20-064-mcp-compact-view-projection|064]] (V1.6+).

## Why a projection, not per-consumer filtering

The motivating consumer was the Raycast hotkey-overlay extension: a human reads `find_clusters` / `get_atoms` results directly in a 5-second interaction. ECHO's pre-064 MCP wire shape was designed assuming consumers are AI agents capable of self-denoising. A single live codex atom with 50 `exec_command` tool calls reached ~207 kB of `metadata_bytes_elided` after the existing per-key caps ran; opaque bubble UUIDs, byte offsets, debug `rank_reason` values (`"recent_activity"`, `"dense"`), nested `codex.{sandbox_*, permission_*}` config blocks, and a pass-through `<!-- ECHO cluster ${id} -->` HTML comment all leaked into the rendered surface.

The strategist's first instinct was per-consumer filtering — let Raycast hide what Raycast doesn't render. A codex strategist consult (2026-05-20) reframed the diagnosis: **the fields claude labelled "Raycast-specific noise" were not Raycast-specific. They were substrate leakage.** If every future consumer (V1 browser extension, future overlay surfaces) has to re-learn what to hide, ECHO is exporting capture/runtime internals through its substrate contract. The smallest correct change is a projection knob on the existing tools, not a new tool and not per-consumer filtering. See [[compose-not-capture]] for the principle clarification this consult produced.

## KEEP / DROP rules

The projector lives at `src/mcp/wire-shape/compact.ts` and exports `compactCluster(cluster)` + `compactAtom(atom)`. Both tools import the same module — zero per-tool duplication. Compact **composes with** the existing per-content + per-key cap projector at `src/mcp/wire-shape/match.ts`, not replaces it: in compact mode, atoms run through `match.ts`'s size caps first (size hygiene), then through `compact.ts`'s field filter (noise hygiene).

### Cluster compact contract

- **KEEP:** `cluster_id`, `atom_ids`, `source_breakdown`, `time_range.from`, `time_range.to`, `label` (with UUID-fallback emitted as `null`), `open_loop_hints` + `open_loop_hints_omitted` when the existing 30-hint cap fired, `atom_ids_truncated`, `atom_ids_total`.
- **DROP:** `rank` (sort order conveys it), `rank_reason` values other than `"has_open_loop"` (drop `"recent_activity"`, `"dense"`, `"matches_artifact_hint"`).
- **Envelope KEEP:** `schema_version`, `tool`, `clusters[]`, `warnings[]`.
- **Envelope DROP:** `query` (echoed args), `result_caps`.

### Atom compact contract (after `match.ts` caps have already run)

- **KEEP (universal):** `id`, `source`, `timestamp`, `content`, `truncations`.
- **KEEP (universal metadata when present):** `metadata.session_id`, `metadata.repo_root`, `metadata.tool_call_total` (only when > 0), `metadata.had_tool_use`, `metadata.tool_calls_by_name`, `metadata.files_referenced`.
- **KEEP (per-source promoted):**
  - claude_code: `metadata.model`, `metadata.permission_mode` (when non-default), `metadata.branch`.
  - cursor: `metadata.is_continuation` (when `true`), `metadata.context` (sub-fields `attached_files`, `referenced_files`, `deleted_files`), `metadata.thinking` (when not already a substring prefix of `content`).
  - codex: `metadata.codex.model`, `metadata.codex.reasoning_effort`, `metadata.git.branch`.
- **DROP (universal):** `metadata.mtime`, `metadata.byte_offset`, `metadata.tool_calls` (redundant with `tool_calls_by_name`), `metadata.tool_calls_truncated`, `bytes_elided`, `metadata_bytes_elided`, `metadata_keys_projected`, `metadata_keys_elided`.
- **DROP (per-source debug/plumbing):** claude_code `cli_version` / `project` / `git_state`; cursor `composer_id` / `*_bubble_id` / `bubble_text_sources` / `continuation_*`; codex `codex.{cli_version, model_provider, personality, approval_policy, sandbox_*, permission_*, file_system_*}`, `codex.source`, `git.{sha, origin_url}`, `git_state`, `cwd`.

The `truncations` array already conveys the bit a human needs ("was content clipped"), so the four `*_elided` / `*_projected` fields are dropped without losing that signal. See [[mcp-get-atoms|`get_atoms`]]'s `truncations` trust signal for the durable contract.

### UUID-shaped labels emit as `null`

When `find_clusters` would emit a `label` matching `/^discussion about [0-9a-f-]{36}$/` (the upstream UUID-fallback when no clean noun is extractable), compact mode emits `label: null`. Rich mode preserves the UUID string for agent debugging. The root-cause fix (better labeling) is a separate concern; compact papers over the symptom at the wire seam so every consumer doesn't have to detect-and-suppress it independently. This is the substrate-hygiene pattern: do it once at the daemon seam, not per-consumer.

## Size reduction evidence

The size-reduction acceptance test in `tests/mcp/wire-shape/compact.test.ts` exercises a synthetic 50-`exec_command`-call codex atom shaped after live atom `014b6f8a-2615-49c4-a032-57d958c47a09` (~207 kB `metadata_bytes_elided` in rich). Under `view: "compact"`, `JSON.stringify(atom.metadata).length < 2048` — a ~100x reduction on the same logical atom. The reduction is not from re-capping (caps are unchanged) but from removing the runtime config blocks the cap projector preserved.

## Composition with `format`, `fields`, and envelope budget

The `view` parameter is independent of the existing `format?: "skeleton"` (find_clusters) and `fields?: string[]` (get_atoms) parameters:

- `format` controls atom-body inclusion; `view` controls field hygiene. They compose.
- `fields=[...]` further restricts the OPTIONAL payload fields after compact projection. The always-on fields required by `getAtomsOutputSchema` (`id`, `source`, `timestamp`, `truncations`) are preserved regardless of `view` or `fields`.
- The 25 kB envelope-overflow prefix-drop loop in both tools sizes its budget on the **post-compact** atom bytes. Without this fix, the live 207 kB codex case would still trigger `atoms_dropped > 0` based on rich-mode metadata fields that compact would have removed — defeating the entire reason this projection exists.

## Output schema widening

`find_clusters` and `get_atoms` are registered via `server.registerTool` with output schemas that previously declared `query` and `result_caps` as required. Compact responses that omit them would fail schema-aware MCP clients' `structuredContent` validation before the human saw anything. As part of 064, both schemas were widened so the dropped envelope fields are optional. A server-level test in `tests/mcp/server.test.ts` calls each tool with `view: "compact"` and asserts no validation error.

## Applies to find_clusters + get_atoms

Both tools accept `view?: "compact" | "rich"` with default `"rich"`. The first consumer to opt into compact was the Raycast v0 client (`tools/raycast-echo/src/lib/mcp.ts`, retired 2026-05-31 per [[hotkey-overlay-raycast|item 081]]); `view` remains a substrate-level contract for any consumer. See [[mcp-find-clusters]] and [[mcp-get-atoms]] for the per-tool documentation of how compact composes with that tool's other parameters.

`search_memories` and `get_atom` are explicitly **deferred** — Raycast does not use them on the resume path. If a future consumer needs compact for those tools, that is a separate item, not a proactive expansion of 064.

## Not in 064

- `search_memories` and `get_atom` compact mode (deferred).
- Raycast UI layout / rendering changes (separate spec; this is the substrate prerequisite that unblocks UI work).
- Removing or deprecating `rich` mode (both modes ship indefinitely; agents are unaffected).
- Changing the existing `WIRE_SHAPE_CAPS` numeric values (compact removes fields; caps are unchanged).
- Root-cause fix for UUID-fallback cluster labels (compact papers over the symptom; the labeling pass fix is a separate item).

## Related

- [[mcp-find-clusters]] — discovery primitive; consumer of the compact cluster contract
- [[mcp-get-atoms]] — body-fetch primitive; consumer of the compact atom contract
- [[mcp-server]] — host transport that registers both tools' output schemas
- [[compose-not-capture]] — the principle clarification this item produced (substrate INPUTS vs OUTPUTS)
- [[atomic-primitives-compose]] — why compact is a parameter on existing tools rather than new `*_for_display` tools
- [[work-trace]] — clustering algorithm whose output compact projects
- [[normalized-context-event]] — atom shape compact filters fields from
