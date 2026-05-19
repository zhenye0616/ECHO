# ECHO MCP interactions journal — May 2026 shard

This is the **May 2026 monthly shard** of ECHO's cross-tool MCP-call journal. Entries after the archive cutover land here until 2026-06-01. The historical monolith is frozen at `mcp-interactions-journal-archive-through-2026-05-17.md`; do not append to it.

**Originating item:** [`2026-05-06-018-recent-work-context-tool`](../../../backlog/complete/2026-05-06-018-recent-work-context-tool.md)
**Sources active in store:** claude-code, codex, cursor, git
**Timezone convention:** all times in this journal are **founder's local time (PDT, America/Los_Angeles)** unless explicitly noted. Source data stores ISO 8601 UTC; entries here are converted on write.

## Quick-Fill Template

```
### YYYY-MM-DD HH:MM PDT — <one-line context>

- **Trigger:** <why the tool was called>
- **Query inputs:** <tool(args), one line or compact numbered list>
- **Returned:** <N clusters/M atoms, N matches, N turns, warnings, top label/rank reasons>
- **Sources:** <source_breakdown | source_resolved | per-match prefixes | exact paths>
- **Verdict:** <✅ right | 🟡 partial | ❌ wrong> — <short reason>
- **Note:** <what felt useful/off>
- **Conjecture:** <optional>
```

## Rotation Rule

On the first MCP-call journal append of each new calendar month, create `mcp-interactions-journal-YYYY-MM.md` with this preamble template and update `CLAUDE.md`'s current-shard pointer in the same commit. See also `mcp-interactions-journal-archive-through-2026-05-17.md` for entries before this shard.

## Interactions

### 2026-05-17 22:18 PDT — Founder live-test of raycast-echo v0 — FIRST runtime finding

- **Trigger:** Founder ran `npx ray develop` inside `tools/raycast-echo/` for the first time after merge.
- **Query inputs:** N/A — pre-query bring-up phase. `ray build` succeeded; `tsc --noEmit` clean.
- **Returned:** Raycast runtime warning at extension import: `The shortcut prop provided to the Action Paste is reserved by Raycast and has been removed. Please use another shortcut instead of {"modifiers":["cmd"],"key":"enter"}`. Warning fires twice (once per render, presumably from the dual-mode list re-render). Paste action loses its shortcut; remains accessible via the action menu but ⌘↩ doesn't trigger it.
- **Sources:** `tools/raycast-echo/src/search-context.tsx:180` (the `<Action.Paste shortcut={{cmd, enter}} />` declaration). Reserved-shortcut list NOT in `@raycast/api` types — discoverable only at runtime via the Component Stack error.
- **Repo:** Project_echo.
- **Verdict:** 🟡 partial — the EXTENSION IS RUNNING (compile clean, registers in Raycast, hotkey works, primary Copy action works), but the secondary Paste action's shortcut got silently neutralized. Hit on first invocation; would have been discovered eventually if not at first launch.
- **Note:** **This is the v0's first dogfooding-only finding** — codex's 7-round deeper-API-tracing across r1-r7 caught Clipboard.paste signature, @raycast/utils nonexistent hook, Style.Failure vs Toast.Style.Failure, ALL via type-level checks. But `⌘↩` reserved-shortcut is a *runtime-only* constraint — no type signature carries the reserved list. This is exactly the AC7 v0/V1 split working as designed: things that need runtime feedback get caught here, not at spec review.
- **Conjecture:** (observation only) The full list of Raycast-reserved shortcuts isn't surfaced in `@raycast/api` types or in their public docs in a single grep-able list — it accumulates from runtime warnings. Strategic implication: the V1 spec should NOT enumerate shortcuts at spec time; instead say "primary action = ↩ (Raycast-bound); secondary actions need non-reserved shortcuts surfaced via `ray develop` dry-run before committing." That defers shortcut choice from spec to build-gate, mirroring the F1-r5 manifest-defer pattern.
- **Patch applied inline (dev hot-reload):** changed `shortcut={{cmd, enter}}` → `shortcut={{cmd, shift, enter}}` for the Paste action. Ergonomically close to the spec's intent. Founder re-tests on hot-reload.

### 2026-05-18 00:16 PDT — Founder live-test of raycast-echo v0 — DESIGN ITERATION (Direction C)

- **Trigger:** Founder ran Claude Design (claude.ai/design) to mock up 3 directions for the Raycast list/grid appearance, picked Direction C (Storytelling), and requested its implementation. Bundle fetched from `api.anthropic.com/v1/design/h/91GV5Hxa5Yxb3hUu2j2vtw` as a gzip'd tar (98.3KB) containing 13 files including a drop-in `overlay.tsx` (production @raycast/api code).
- **Query inputs:** N/A — pure UI redesign work, no MCP retrieval. The implementation calls the same 4 MCP tools (`find_clusters`, `search_memories`, `get_atom`, `get_atoms`) at the same daemon endpoint.
- **Returned:** Wholesale rewrite of `tools/raycast-echo/src/search-context.tsx` (~560 lines, was ~230 lines). New shape: time-bucketed `<List.Section>`s (Last hour / Today / Yesterday / This week / Older), per-source-app colored `appIcon` (claude_code=Stars/orange, cursor=Code/blue, codex=Terminal/purple, git=CodeBlock/red, unknown=Dot/grey), narrative subtitles ("Open loop — last touched in Claude" instead of paths), metadata sidebar for clusters (atoms / time range / sources tag list / ranked-by tag list), markdown detail for matches (source + PDT + code-fenced for cursor/git), `<Grid>` alt view at ⌘⇧V (LocalStorage-persisted), `<List.Dropdown>` source filter in search bar, two empty states ("ECHO is listening" vs "No atoms match X"). Action panel: Copy primary (markdown bundle), Paste at ⌘⇧↩ (frontmost), Copy as… submenu at ⌘⇧F (Markdown / Plain text / Chat prompt / Atoms verbatim), Open Source at ⌘O (resolves git: → repo dir, fs: → file path), Open Trace Viewer at ⌘B (`http://127.0.0.1:38479/`), Copy Raw JSON at ⌘C, Hydrated JSON at ⌘⇧C (matches only), Toggle View at ⌘⇧V.
- **Sources:** Design bundle README + `ECHO Direction C.html` + `overlay.tsx` + `chat1.md` (founder's prompt + assistant's 3-direction analysis) extracted to `/tmp/echo-design-fetch/`. Existing `lib/format.ts` (`formatPdtTimestamp`, `derivedApp`, `formatAtomBundle`) reused verbatim — the design's `Copy as… → Atoms (verbatim)` submenu option invokes our existing `formatAtomBundle`, preserving the AC2 contract enforced by `test/format.test.ts` (5/5 pass post-rewrite). Existing `lib/mcp.ts` reused verbatim — the design's mock-data hooks (`useClusters`, `useMatches`) adapted to call our real MCP layer with proper `EchoDaemonError` toast handling. `tsc --noEmit` + `ray build` both clean.
- **Repo:** Project_echo.
- **Verdict:** ✅ right — wholesale UI redesign landed cleanly, all build gates green, existing AC2 contract preserved via the "Atoms (verbatim)" submenu hatch.
- **Note:** Three observations on the design-to-implementation translation.
  - **(1) AC2's `formatAtomBundle` survives as a Copy-as option, not the primary.** The design's primary Copy uses the richer cluster/match-shaped markdown (label + time range + source breakdown for clusters; source + PDT + content body for matches), which is materially more useful for pasting into Cursor/Claude than the bare atom-body concat. The AC2 contract is honored — `formatAtomBundle` is still exported, still tested, still reachable — but the v0 default behavior has shifted in response to design taste. Per AC8/AC9 (V1 spec deferred), this is the right kind of shift: dogfooding-driven, not pre-decided.
  - **(2) Type adaptations needed.** Design's `Cluster.id` ↔ our `FindClustersCluster.cluster_id`; design's typed `RankReason` enum ↔ our `string[]`; design's `Cluster.narrative` (optional) ↔ our clusters never carry it (fallback paths exercise every time, which is fine — the narrative helpers derive from `dominantApp` + `rank_reason`). Design's `useViewMode` had a `setView(v => ...)` functional-update bug given the `(v: ViewMode) => void` setter type — fixed by returning a proper `Dispatch<SetStateAction<ViewMode>>` and persisting via a separate useEffect.
  - **(3) Hot-reload + dogfooding gate alignment.** Founder is mid-dogfooding; ray develop watches the file; this rewrite triggers a rebuild without restart. Founder's existing journal entries (n=1 prior to this) accumulate against AC8's "≥10 entries / ≥3 days" gate — the redesign DOES NOT reset the count; it just changes what each future entry will observe.
- **Conjecture:** (observation only) The design's `<List.Section>` time-bucketing collapses to a single "Last hour" section for today's bursty work pattern (the founder has been live for ~1.5h and most/all atoms cluster into one section). For a richer dogfooding signal, the founder should ideally come back to ⌘⇧E after sleeping + working in Cursor for a few hours so the buckets actually populate ("Today" + "Yesterday" + "This week"). First-touch impressions on the current state will under-represent the section-design value.
