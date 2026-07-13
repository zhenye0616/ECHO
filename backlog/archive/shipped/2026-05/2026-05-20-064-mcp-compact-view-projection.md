---
id: 2026-05-20-064-mcp-compact-view-projection
title: MCP `view: "compact"` projection — substrate-level human-noise filter on `find_clusters` + `get_atoms`
status: pending_review
priority: HIGH
estimate: 1-1.5d
created: 2026-05-20
blocked_by: []
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - src/mcp/tools/find-clusters.ts  # AC1, AC4, AC7 — accept `view?: "compact" | "rich"` (default "rich"); when compact, run cluster array through the new compact projector before envelope emission; suppress `query` echo + `result_caps` from envelope; keep `warnings[]`. The existing `format?: "skeleton"` parameter is orthogonal to `view` (skeleton controls atom-body inclusion; view controls field hygiene).
  - src/mcp/tools/get-atoms.ts  # AC1, AC5 — accept `view?: "compact" | "rich"` (default "rich"); when compact, run atom array through the new compact projector after the existing wire-shape projection. The existing `fields?: string[]` projection composes with `view`: `view=compact` defines the default keep-list; `fields=[...]` further restricts the OPTIONAL payload fields (r2 codex F2 MED — but the existing always-on fields `id`/`source`/`timestamp`/`truncations` required by `getAtomsOutputSchema` are preserved regardless of `view` or `fields`); `view=rich + fields=[...]` retains rich keep-list further restricted (same always-on rule).
  - src/mcp/wire-shape/compact.ts  # AC3 — NEW. Single module exporting `compactCluster(cluster)` and `compactAtom(atom)`. Defines the canonical KEEP/DROP rules per Section 2 of the design (this spec). Imported by both tools; no per-tool duplication. Lives alongside the existing `match.ts` cap projector (which compact composes WITH, not replaces).
  - src/mcp/wire-shape/match.ts  # AC2, AC3 — no semantic change; verify the existing per-content + per-key projector still runs in compact path (compact removes FIELDS, match.ts caps SIZES; they compose).
  - tools/raycast-echo/src/lib/mcp.ts  # AC6 — `findClusters()` and `getAtoms()` both pass `view: "compact"` in their tools/call args. **TypeScript type updates required (r1 codex F3 + codex-ops F6 MED, overlapping):** `FindClustersCluster.rank` becomes optional, `rank_reason` becomes optional, `label?: string` becomes `label?: string | null`. `EchoAtom` is already structurally compatible and needs no change.
  - tools/raycast-echo/src/echo.tsx  # AC6 — remove the client-side `<!-- ECHO cluster ${c.cluster_id} -->` HTML-comment emission in `clusterBundleMarkdown` (it was Raycast-side debug bleed; compact does NOT carry cluster_id into the rendered markdown header anyway — the field is still in JSON for follow-up calls).
  - tests/mcp/wire-shape/compact.test.ts  # AC3, AC4, AC5 — NEW (r1 codex F1 HIGH: path corrected from `test/` to `tests/` to match vitest config). Unit tests for `compactCluster` + `compactAtom` covering each KEEP/DROP field with representative atoms from each source (claude_code, cursor, codex, git). Includes the AC5 size-reduction assertion: a 50-tool-call codex atom drops from `metadata_bytes_elided` ~207KB to <2KB in compact mode.
  - tests/mcp/find-clusters.test.ts  # AC2 (existing) + AC4 — EXTEND (r1 codex F1 HIGH: path corrected from `test/mcp/tools/` to `tests/mcp/`; the existing file lives directly under `tests/mcp/`, not under a `tools/` subdir). Add: `view: "compact"` produces compact-shaped clusters; default + `view: "rich"` produce byte-identical-to-current envelopes (regression guard for AC2). AC7 fixture: a cluster whose label matches `/^discussion about [0-9a-f-]{36}$/` returns `label: null` under compact, unchanged under rich.
  - tests/mcp/get-atoms.test.ts  # AC2 (existing) + AC5 — EXTEND (r1 codex F1 HIGH: path corrected — see AC2 fix above). Add: `view: "compact"` produces compact-shaped atoms; default + `view: "rich"` produce byte-identical-to-current envelopes; **`view=compact + fields=[...]` composition (r2 codex F2 MED clarification):** the existing always-on fields contract for `get_atoms` (`id`, `source`, `timestamp`, `truncations` — required by `getAtomsOutputSchema`) is preserved regardless of `view` or `fields`. `fields=[...]` narrows the remaining-optional payload fields AFTER compact projection. So `view=compact + fields=["content"]` returns atoms with `{id, source, timestamp, truncations, content}` (no metadata at all), NOT `compact keep-list ∩ fields` literally (which would incorrectly drop the always-on fields and conflict with the registered schema). Test fixture: a `view=compact + fields=["content"]` call returns at least `{id, source, timestamp, truncations, content}` on every atom and excludes `metadata` entirely.
  - tests/mcp/server.test.ts  # AC4 — EXTEND (r1 codex-ops F4 HIGH new requirement). Server-level test: `tools/call find_clusters` with `view: "compact"` succeeds against the registered `findClustersOutputSchema` without structuredContent validation errors (after the schema is widened per AC4). Same for `tools/call get_atoms` with `view: "compact"` against `getAtomsOutputSchema` (if the schema requires `atoms_dropped` / `atoms_dropped_ids` / `warnings` as non-optional; verify and widen as needed).
  - tools/raycast-echo/test/mcp.test.ts  # AC6 — NEW (r1 codex F2 MED: file was previously "IF EXISTS, extend"; now mandatory so the Raycast `view: "compact"` opt-in is testable). Asserts both `findClusters()` and `getAtoms()` POST bodies include `view: "compact"` in `params.arguments`. ~30 lines: mock global `fetch`, call each function, inspect the recorded request body. Without this test, the daemon-side AC2 coverage cannot prove Raycast actually opts in to compact — the main consumer could keep requesting rich while daemon tests pass.
  # NOTE: docs/BACKLOG.md is NOT in this list per docs/AGENT_INSTRUCTIONS.md; strategist adds the Ready-table row at spec-commit time.
spec_refs:
  - src/mcp/tools/search-memories.ts  # NOT modified — explicitly deferred (see OoS#1)
  - src/mcp/tools/get-atom.ts  # NOT modified — explicitly deferred (see OoS#1)
  - src/mcp/server.ts  # not modified; parameter dispatch already passes args through verbatim
  - src/storage/interface.ts  # CaptureEvent type — unchanged
  - tools/raycast-echo/src/echo.tsx:252  # current `clusterBundleMarkdown` site that emits the debug HTML comment
  - raw/internal/dogfooding/mcp-interactions-journal-2026-05.md  # 2026-05-20 14:03–14:08 PDT entries (claude + codex parallel data-shape probes), plus the 14:08 codex-strategist consult verdict that motivated this spec
  - wiki/principles/compose-not-capture.md  # explicitly addressed in Why (the codex strategist consult clarified this principle does NOT defend raw MCP output)
  - wiki/surfaces/mcp-find-clusters.md  # current contract for find_clusters; this spec adds `view` parameter
  - wiki/surfaces/mcp-get-atoms.md  # current contract for get_atoms; this spec adds `view` parameter

# --- agent-managed fields (filled in during run) ---
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-20T22:47:41Z"
branch: "agent/mcp-compact-view-projection"
head_sha: "e42d2467d4f451dbfe84172e60bc09a1ec860646"
pr_url: ""
agent_notes: |
  Implemented on branch `agent/mcp-compact-view-projection` at `e42d2467d4f451dbfe84172e60bc09a1ec860646`. Added shared compact projection for `find_clusters` and `get_atoms`, preserved rich/default behavior, switched Raycast MCP calls to `view: "compact"`, added the requested daemon/Raycast tests, and journaled a live Raycast-client compact probe against a feature-branch daemon. `tools/raycast-echo/src/components/EmptyState.tsx` needed a one-line null-safe `rank_reason` read to keep the new relaxed Raycast cluster type compiling.
review_notes: |
  Merged on 2026-05-20 via founder reconciliation.

  Conflicts resolved:
  - tools/raycast-echo/src/echo.tsx: take HEAD wholesale for `ClusterRow` props (richer titleText/subtitle from `aeca3c7` diagnostic restructure) and for `sourceBreakdownSummary` + `clusterBundleMarkdown` (rich evidence/preview/metaLine/whyLine block), with the `<!-- ECHO cluster ${c.cluster_id} -->` trailing line REMOVED per 064's AC. Three outside-conflict-marker `rank_reason` reads converted to null-safe (`?.includes(...) ?? false` and `(c.rank_reason ?? []).filter(...)`) to honor 064 AC6's relaxation of `FindClustersCluster.rank_reason` to optional.

  C3.5 cross-vendor consult: codex @ proceed-with-modifications — applied 1 modification: `AnswerView.tsx:178` rewrote opaque `c.cluster_id` UUID fallback to `"Recent cluster"` literal (also switched `??` to `||` for empty-string label hygiene), preventing 064's compact `label: null` from leaking UUIDs into the human-facing "Top recent clusters" markdown.

  Fixups applied:
  - (none — sidecar listed none; merge proceeded directly to conflict handling)

  Fixups deferred to follow-up items:
  - (none)

  Verify: 1133/1155 root tests pass (1 pre-declared flake, 21 skipped); 73/73 Raycast tests pass; lint, typecheck, and sync-skills --check all clean post-merge.

  Follow-up items (non-blocking) — see backlog/_followups.md:
  - Add wire-shape test that exercises `src/mcp/wire-shape/compact.ts:184` `inferSourceKind` returning `'unknown'` so the universal-only fallback path is explicitly pinned.
  - Promote the rich/compact dispatch in `src/mcp/tools/find-clusters.ts:240-247` to a typed `CompactFindClustersResult` (currently relies on `as unknown as FindClustersResult` cast).
  - Restart resident daemon on 127.0.0.1:38478 after merge so live Raycast hits the new projection (covered by post-Step-D founder-in-the-loop bringup pause).
  - Investigate `tests/mcp/recent-calls-endpoint.test.ts` 5s timeout flake separately — pre-existing on main, accepted at C5 by founder for this merge.
---

# Why

Founder is shipping a Raycast extension where **humans** read MCP results directly in a 5-second hotkey-overlay interaction. ECHO MCP wire-shape was designed assuming consumers are AI agents capable of self-denoising. The high-signal fields a human needs (the question/answer, files touched, who/when, was-it-truncated) are interleaved with substrate noise that AI consumers tolerate but humans cannot: opaque bubble UUIDs, byte offsets, nested `codex.{sandbox_*, permission_*}` config blocks that bloat `metadata_bytes_elided` to ~207KB on a single codex atom, debug `rank_reason` values like `"recent_activity"`/`"dense"` that are already implied by sort order, the daemon's pass-through HTML comment `<!-- ECHO cluster ${id} -->` that leaks into rendered markdown.

The strategist's first instinct was per-consumer filtering (Raycast renders, daemon stays pass-through). Codex strategist consult on 2026-05-20 14:08 PDT (codex turn `5ddf5995` does NOT contain the consult — the consult was a separate `codex exec --sandbox read-only` invocation; verdict captured at journal lines 371+ that day) reframed it: **the fields claude labelled noise are NOT Raycast-specific; they're substrate leakage.** If every future consumer (V1 browser extension per `wiki/product/v1-spec.md`, future overlay surfaces) has to re-learn what to hide, ECHO is exporting capture/runtime internals through its substrate contract. `compose-not-capture` does not defend raw MCP output — composition means ECHO normalises cross-tool context, not that consumers must stare at every capture artifact.

The smallest correct change is a **projection knob on the existing tools** (codex's exact words). Add `view?: "compact" | "rich"`; default to `rich` so agents are unaffected; have Raycast request `compact`. Future consumers inherit the same compact projection for free.

# Acceptance Criteria

## AC1 — Parameter wired (both tools)

- `find_clusters` and `get_atoms` accept optional `view?: "compact" | "rich"` in their input schema. Validation: unknown values isError with a clear message naming the two accepted enum members.
- `view` is independent of the existing `format` (find_clusters' `"skeleton"`) and `fields` (get_atoms' projection) parameters.

## AC2 — Default is rich; existing behaviour byte-identical

- Calls without `view` produce **byte-identical output** to the current daemon (regression guard via fixture comparison in `tests/mcp/find-clusters.test.ts` + `tests/mcp/get-atoms.test.ts`).
- Calls with `view: "rich"` produce byte-identical output to calls without `view`.
- Existing tests for both tools pass unchanged (no migration in tests beyond adding new cases).

## AC3 — Compact projection lives in shared module

- Single new file `src/mcp/wire-shape/compact.ts` exports `compactCluster(cluster) → CompactCluster` and `compactAtom(atom) → CompactAtom`.
- Both tools import the same projector — zero per-tool duplication of KEEP/DROP rules.
- `src/mcp/wire-shape/match.ts` (the existing per-content + per-key cap projector) is **composed with**, not replaced: in compact mode, atoms run through `match.ts`'s caps first (size hygiene), then through `compact.ts`'s field filter (noise hygiene).
- Unit tests in `tests/mcp/wire-shape/compact.test.ts` cover every KEEP and every DROP rule with a representative atom from each of the four sources (claude_code, cursor, codex, git).

## AC4 — Cluster compact contract

Under `view: "compact"`, each cluster in the response carries **only** these fields:

- KEEP: `cluster_id`, `atom_ids`, `source_breakdown`, `time_range.from`, `time_range.to`, `label` (per AC7), `open_loop_hints`, `open_loop_hints_omitted` (r2 codex F1 MED — only present when the existing projector at `src/mcp/tools/find-clusters.ts:178` actually capped the hints array at `SKELETON_CLUSTER_OPEN_LOOP_HINTS_CAP=30`; compact MUST keep this companion field or a >30-hint cluster silently loses the truncation signal that rich mode otherwise carries via `result_caps`. Test fixture in `tests/mcp/find-clusters.test.ts`: a synthetic cluster with 35 open-loop hints under `view: "compact"` returns `open_loop_hints.length === 30` AND `open_loop_hints_omitted === 5`), `atom_ids_truncated`, `atom_ids_total`.
- DROP: `rank` (sort order already conveys it), `rank_reason` values other than `"has_open_loop"` (drop `"recent_activity"`, `"dense"`, `"matches_artifact_hint"`; if `"has_open_loop"` is present, emit `rank_reason: ["has_open_loop"]`; if not, omit the field entirely).

Top-level envelope under compact:

- KEEP: `schema_version`, `tool`, `clusters[]`, `warnings[]` (actionable like `[AUTO_EXPAND]`).
- DROP: `query` (the echoed args), `result_caps`.

**Registered output schema must be widened (r1 codex-ops F4 HIGH).** `find_clusters` is registered via `server.registerTool` with `findClustersOutputSchema` (`src/mcp/tools/find-clusters.ts:274-309`), which currently declares `query` and `result_caps` as required fields. Compact responses that omit them would fail the MCP transport's structuredContent validation (schema-aware MCP clients reject the response before the human sees anything). The schema MUST be widened so `query` and `result_caps` are optional. Similarly verify and widen `getAtomsOutputSchema` for AC5's compact atom shape if it requires `atoms_dropped` / `atoms_dropped_ids` / `warnings` non-optionally (the AC5 compact contract keeps all three, but `bytes_elided` / `metadata_bytes_elided` / `metadata_keys_projected` are dropped per-atom — if any of those are declared as required atom-level fields in the registered schema, widen accordingly). A server-level test in `tests/mcp/server.test.ts` calls `tools/call find_clusters` with `view: "compact"` and asserts no structuredContent validation error, same for `get_atoms`. Without this widening + test, compact ships as a runtime regression surface for schema-aware clients.

## AC5 — Atom compact contract

Under `view: "compact"`, each atom in the response carries **only** these fields (after `match.ts`'s existing per-content + per-key caps have already run):

- KEEP (universal): `id`, `source`, `timestamp`, `content`, `truncations`.
- KEEP (universal metadata when present): `metadata.session_id`, `metadata.repo_root`, `metadata.tool_call_total` (only when > 0), `metadata.had_tool_use`, `metadata.tool_calls_by_name`, `metadata.files_referenced` (cross-source — when present).
- KEEP (per-source promoted metadata):
  - **claude_code**: `metadata.model`, `metadata.permission_mode` (only when value !== `"default"`), `metadata.branch`.
  - **cursor**: `metadata.is_continuation` (only when `true`), `metadata.context` (only the sub-fields `attached_files`, `referenced_files`, `deleted_files` if present), `metadata.thinking` (only when present AND not already substring-prefix of `content`).
  - **codex**: `metadata.codex.model`, `metadata.codex.reasoning_effort`, `metadata.git.branch`.
- DROP (per-source debug/plumbing):
  - Universal: `metadata.mtime`, `metadata.byte_offset`, `metadata.tool_calls` (the projected name array — redundant with `tool_calls_by_name`), `metadata.tool_calls_truncated`.
  - claude_code: `metadata.cli_version`, `metadata.project`, `metadata.git_state` (subsumed by `branch`).
  - cursor: `metadata.composer_id`, `metadata.user_bubble_id`, `metadata.assistant_bubble_id`, `metadata.assistant_bubble_ids`, `metadata.bubble_text_sources`, `metadata.continuation_of_assistant_bubble_id`.
  - codex: ALL of `metadata.codex.{cli_version, model_provider, personality, approval_policy, sandbox_policy_type, permission_profile_type, permission_file_system_type, permission_network, file_system_sandbox_kind, sandbox_network_access, sandbox_exclude_tmpdir_env_var, sandbox_exclude_slash_tmp, sandbox_writable_roots}`, `metadata.codex.source`, `metadata.git.{sha, origin_url}`, `metadata.git_state`, `metadata.cwd` (redundant with `repo_root`).
  - All sources: `bytes_elided`, `metadata_bytes_elided`, `metadata_keys_projected`, `metadata_keys_elided` (the `truncations` array already conveys the bit a human needs).
- KEEP top-level envelope: `schema_version`, `tool`, `atoms[]`, `atoms_dropped`, `atoms_dropped_ids`, `warnings[]`.

Size assertion (test fixture in `tests/mcp/wire-shape/compact.test.ts`): a representative codex atom with 50 `exec_command` tool calls (matching the live shape of atom `014b6f8a-2615-49c4-a032-57d958c47a09`, ~207KB metadata_bytes_elided in rich) returns with `JSON.stringify(atom.metadata).length < 2048` in compact.

**Budget accounting must run AFTER view-specific projection (r1 codex-ops F5 HIGH).** `get_atoms`'s prefix-drop loop (`src/mcp/tools/get-atoms.ts:254-278`) currently sizes its envelope check on the rich/default-projected atom returned by `projectAtom`. Under `view: "compact"`, the loop MUST size on the post-compact atom bytes — otherwise the live 207KB codex case still triggers `atoms_dropped > 0` based on rich-mode metadata fields that compact would have removed, defeating the entire reason this spec exists. Same correction applies to `find_clusters`'s `buildResult` envelope trim (`src/mcp/tools/find-clusters.ts:228-258`). Tool-level test in `tests/mcp/get-atoms.test.ts`: construct a request that returns `atoms_dropped: N > 0` in rich mode AND returns `atoms_dropped: 0` with the same `atom_ids` (or strictly fewer dropped) in compact mode when the byte savings would fit under the 25k ceiling. Same shape test in `tests/mcp/find-clusters.test.ts` for clusters dropped vs. retained under compact.

## AC6 — Raycast switches to compact

- `tools/raycast-echo/src/lib/mcp.ts`'s `findClusters()` and `getAtoms()` POST bodies include `view: "compact"` in `params.arguments`.
- **Update `tools/raycast-echo/src/lib/mcp.ts:29-37` (r1 codex F3 + codex-ops F6 MED, overlapping).** The current `FindClustersCluster` type requires `rank` and `rank_reason` and types `label?: string`, but the compact response (AC4) drops `rank`, often omits `rank_reason`, and (AC7) emits `label: null`. Make `rank` optional (`rank?: number`), make `rank_reason` optional (`rank_reason?: string[]`), and change `label?: string` to `label?: string | null`. Existing fields on `FindClustersCluster` keep their current optionality. The `EchoAtom` type is already a structural subset (all metadata is `metadata?: Record<string, unknown>`) and needs no change. **Why not introduce a separate `CompactFindClustersCluster` type:** the Raycast client only ever issues compact calls (AC6 above), so a single relaxed type covers all consumers without splitting the surface. If a future Raycast call site requires `rank`/`rank_reason` (none today), that's a separate spec.
- The client-side `<!-- ECHO cluster ${c.cluster_id} -->` HTML-comment emission in `clusterBundleMarkdown` (`tools/raycast-echo/src/echo.tsx:258`) is removed — it was Raycast-side debug bleed and the cluster_id is still on the JSON for follow-up calls.

## AC7 — UUID-shaped labels emit as `null` under compact

- When `find_clusters` would emit a `label` matching the regex `/^discussion about [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/`, under `view: "compact"` the field is emitted as `label: null` instead. Under `view: "rich"` the label is unchanged (rich preserves the UUID-fallback string for agent debugging).
- Justification: every consumer that sees a UUID-shaped label has to detect-and-suppress it. Doing it once at the daemon seam is the substrate-hygiene pattern; doing it per-consumer is the leakage pattern this spec exists to fix.
- Bounded: ONLY the explicit `"discussion about <uuid>"` form. Any other label content (descriptive nouns, file paths, free-form strings) passes through unchanged.

## AC8 — Dogfooding journal entry on first compact call

- The first time Raycast issues a successful `find_clusters({view: "compact"})` or `get_atoms({view: "compact"})` call against a live daemon, a dogfooding journal entry (per CLAUDE.md preamble) appears in the current month's shard with `view=compact` in the **Query inputs** field. This is the agent's responsibility — claim-time builder writes one entry; not enforced by code.
- Purpose: makes compact dogfooding visible in the journal so we can detect (within 3 days) if compact dropped a field the human actually needed. If observed, the followup is to add the field back to the KEEP list — small targeted patch, not a redesign.

# Out of Scope (Don't Drift)

1. **`search_memories` and `get_atom` compact mode.** Explicitly deferred. Raycast doesn't need them on the resume path today. If Raycast (or another consumer) needs them, separate item. Don't proactively add `view` to all four tools — codex's strategist consult was explicit that the smallest correct change is the two tools Raycast actually uses.
2. **Rendering / layout / icon work in Raycast.** This spec stops at "Raycast asks for compact and the bytes flow through unchanged structurally." How clusters and atoms are rendered (subtitle composition, file-chip rows, tool-use badges, truncation indicators) is the **next** brainstorm — not this spec. If the builder is tempted to add UI affordances "while they're in the file," stop.
3. **Relaxing the existing `WIRE_SHAPE_CAPS.match_content` 2023-char content cap.** Compact does NOT relax that cap. The cap is correct for both modes (size hygiene is independent of field hygiene).
4. **Migration of agent consumers to compact.** Agents keep getting `rich` (default). No breaking changes anywhere. If a future agent consumer benefits from compact, that's a per-consumer opt-in, not a default flip.
5. **Daemon-side cluster labeling improvements.** The underlying reason UUID-fallback labels happen at all (the labeling pass falling through to UUID echo when no clean noun is extractable) is a separate concern. AC7 papers over the symptom at the wire seam; the root cause is a different backlog item.
6. **A new `*_for_display` MCP tool.** Codex's verdict was explicit: surface proliferation for one consumer is the wrong shape. Stop.
7. **Removing or deprecating `rich` mode.** Both modes ship and are supported indefinitely. Do not add deprecation warnings on `rich` calls.
8. **Changing the `WIRE_SHAPE_CAPS` numeric values.** The 2023-char `match_content` cap, the per-key `match_metadata_value` cap, etc. are all unchanged. Compact removes fields; it does not change caps.
9. **New `compose-not-capture` wiki page or principle revision.** The codex strategist consult clarified the principle's scope (it does not defend raw MCP output); that clarification is a journal observation, not a wiki revision. If the founder later promotes the clarification, separate item.
10. **Bundling this with the planned Raycast UI redesign.** This spec is the substrate prerequisite that unblocks the UI redesign. Do not let the UI redesign creep into this spec — the UI brainstorm explicitly happens AFTER this lands.

# After Completion (Strategist Notes)

Wiki promotion targets when this item lands in `complete/`:

- **`wiki/surfaces/mcp-find-clusters.md`** — add a `view` parameter section under "Input schema"; document the compact-mode KEEP/DROP rules; cross-link to a new `wiki/principles/substrate-projection-not-consumer-projection.md` or fold the principle into an existing page.
- **`wiki/surfaces/mcp-get-atoms.md`** — same `view` parameter section + KEEP/DROP rules.
- **NEW `wiki/principles/substrate-projection-not-consumer-projection.md`** (or named more concisely) — the codex-strategist clarification of `compose-not-capture`'s scope, captured as a standalone principle so future consumers inherit it. Cite this item's spec as the reasoning trail. Cross-link from `wiki/principles/compose-not-capture.md`.
- **`wiki/principles/compose-not-capture.md`** — minimal edit: add a clarification paragraph noting that compose-not-capture concerns ECHO's relationship to the tools it ingests FROM, not the relationship between ECHO's substrate and ECHO's consumers. (One paragraph; do not rewrite the page.)

Cross-link backlog items that this spec unblocks:

- The pending Raycast UI redesign (no item ID yet — to be written after this lands). Reference this item as the substrate prerequisite.

Add a journal entry on wiki-promotion noting that the 064-clarified principle ("substrate projection, not consumer projection") was derived from a codex strategist consult, demonstrating the codex-as-strategist binding cycle (per the V1 wedge's "vendor-agnostic at ≥2 bindings" gate per `project_friction_first_prioritization.md`).
