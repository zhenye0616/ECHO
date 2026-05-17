---
id: 2026-05-17-060-hotkey-overlay-v0-raycast-dogfood
title: V0 hotkey overlay — Raycast extension for founder dogfooding (V1 spec deferred until v0 surfaces friction)
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-05-17
blocked_by: []
task_state_ref: 2026-05-17-060-hotkey-overlay-v0-raycast-dogfood
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - tools/raycast-echo/package.json  # AC1 — Raycast extension manifest (commands, preferences, dependencies); name "echo-context"; one command "search-context" with title "Search ECHO Context"
  - tools/raycast-echo/src/search-context.tsx  # AC1 + AC2 — the command entry point; React/Raycast list view; two-state (empty input → find_clusters, typed → debounced search_memories); detail pane via get_atom / get_atoms; action menu per AC2
  - tools/raycast-echo/src/lib/mcp.ts  # AC1 — thin MCP client wrapper over the daemon's StreamableHTTPServerTransport at http://127.0.0.1:38478/mcp; uses @modelcontextprotocol/sdk client; one helper per tool call (findClusters, searchMemories, getAtom, getAtoms); no X-Echo-Role header (these tools don't need it)
  - tools/raycast-echo/src/lib/format.ts  # AC2 — markdown bundle formatter: header line `## <source_app> · <PDT timestamp>` then content body; concatenates multi-atom selections with `---` separators
  - tools/raycast-echo/tsconfig.json  # AC1 — TS config matching Raycast's expected shape (target ES2022, strict)
  - tools/raycast-echo/README.md  # AC4 — install + dogfooding instructions (3 sections: install via `ray develop`, hotkey binding via Raycast preferences, dogfooding-journal expectation per AC6)
  - docs/BACKLOG.md  # add Ready-table row pointing at this item
spec_refs:
  - wiki/surfaces/hotkey-overlay.md  # the planned V1 surface this v0 will INFORM but not yet build — V1 quality bar (<100ms summon, <500ms retrieval, native chrome) does NOT apply to v0
  - wiki/principles/felt-not-seen.md  # principle the v0 partially honors (Raycast hides chrome when dismissed) but doesn't fully embody (Raycast's own chrome is visible during use — acceptable v0 compromise; V1 redesigns chrome)
  - wiki/principles/clipboard-and-launch.md  # the Layer-3 push delivery pattern; v0 ships clipboard-only (↩ copy + ⌘↩ copy-and-paste); explicit app-launch (⌘L "open in Cursor / Claude / browser") is V1 territory
  - wiki/principles/compose-not-capture.md  # architectural commitment; v0 calls existing capture surfaces' retrieval primitives only — does not add new capture or new MCP tools
  - wiki/product/v1-spec.md  # V1 scope locked 2026-04-30; the hotkey overlay is one of two `planned` surfaces (other: audit-page); this v0 is the first build step toward V1, NOT the V1 itself
  - src/mcp/server.ts  # the daemon-side HTTP endpoint the extension consumes: `http://127.0.0.1:38478/mcp`, StreamableHTTPServerTransport, sessionIdGenerator:undefined (stateless), enableJsonResponse:true; tools called: find_clusters, search_memories, get_atom, get_atoms (X-Echo-Role NOT required for any of these)
  - raw/internal/dogfooding/mcp-interactions-journal.md  # the dogfooding sink — AC6's "≥10 entries / ≥3 days" defines v0 done; journal entries become the V1 spec inputs
  - https://developers.raycast.com/api-reference  # external; Raycast extension API docs (List, ActionPanel, Clipboard, showToast); builder reads the relevant subset

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
review_notes: ""
agent_notes: ""
---

# V0 hotkey overlay — Raycast extension for founder dogfooding

## Why this spec exists

The V1 hotkey overlay spec at `wiki/surfaces/hotkey-overlay.md` is `status: planned` and was written before any version of the overlay existed in the founder's hands. Its quality bar (<100ms summon, <500ms retrieval, native Swift/AppKit chrome) and its V1 user flow (6-step composer → preview → action → disappear) are taste-driven proposals informed by Wispr Flow and Raycast, not by empirical dogfooding. Per the 2026-05-17 strategist Q&A session (claude_code session `e3fa3405-...`, turns 15 / 20 / 22), the load-bearing observation was: *"you've built the entire substrate but can't see the form — and the form is probably 4-7 days of building an ugly hotkey overlay away from resolving."*

This spec ships the ugly version. The chrome is whatever Raycast renders; the keyboard binding is whatever Raycast lets the founder bind; the retrieval is whatever the daemon's existing MCP tools return. The only thing this spec is responsible for is putting ⌘⇧E in the founder's hands today so that V1's questions ("is the composer shape right?" "what cards should we render?" "how does paste-and-launch feel?") get answered with dogfooding data instead of theory.

**The V1 spec is deliberately deferred.** AC7 below makes this explicit: no V1 backlog item is written until v0 dogfooding surfaces ≥10 journal entries across ≥3 calendar days AND the founder can articulate the top-3 retrieval-quality issues to fix in V1. The dogfooding journal IS the V1 spec input.

## The minimum-viable shape

A Raycast extension at `tools/raycast-echo/` with one command, `Search ECHO Context`. The command opens a list view with two states:

| Input state | MCP call | List rendering |
|---|---|---|
| Empty input (just hit ⌘⇧E) | `find_clusters()` no-args (daemon's V1.5.7 auto-expand handles 4h→24h widening) | Each cluster → list item; title = `cluster.label \|\| <derived from source_breakdown>`; subtitle = `<rank_reason joined> · <time_range.from..to in PDT>` |
| Typed query (debounced 200ms) | `search_memories({query, limit:15})` | Each match → list item; title = `<source_app> · <timestamp PDT>`; subtitle = `<content[0..120]>` |

Selecting a list item populates Raycast's detail pane:

- Cluster selected → `get_atoms(cluster.atom_ids.slice(0,3), format:"minimal", prefer:"newest_first")`, concatenated with `---` separators
- Search match selected → `get_atom(match.id)`, single body verbatim

The action menu (Raycast's `ActionPanel`):

- `↩` (primary) → write the assembled markdown bundle to the OS clipboard via Raycast's `Clipboard.copy()`; show toast "ECHO context copied"
- `⌘↩` → `Clipboard.copy()` then `Clipboard.paste()` (Raycast's paste-into-frontmost-app helper)
- `⌘O` → open the atom's source file in default app (skip if source is a `git:` or `fs:` prefix without a resolvable on-disk path — toast "no source file" instead)
- `⌘B` → open `http://127.0.0.1:38479/?atom=<id>` in default browser (the daemon trace visualizer; if `:38479` doesn't accept that query-string shape, builder picks the closest equivalent and notes in agent_notes)
- `⌘C` → copy raw atom JSON for debugging (`JSON.stringify(atom, null, 2)`)

The "assembled markdown bundle" format (in `src/lib/format.ts`):

```markdown
## <source_app> · <PDT timestamp>

<atom.content verbatim>
```

Multi-atom selections (clusters) concatenate with a `---` separator between atoms. No synthesis, no summarization — paste the raw bundle into Cursor/Claude/ChatGPT and let those models do the synthesis. This matches the [[compose-not-capture]] commitment and keeps the v0 surface area small.

## Architecture

```
┌─────────────────────────────────────┐
│  Raycast (host, owns hotkey + UI)   │
│  ┌──────────────────────────────┐   │
│  │ "Search ECHO Context" cmd    │   │
│  │  tools/raycast-echo/         │   │
│  │  TS + React + Raycast API    │   │
│  └──────────┬───────────────────┘   │
└─────────────┼───────────────────────┘
              │  JSON-RPC over HTTP POST
              │  (@modelcontextprotocol/sdk client)
              ▼
┌─────────────────────────────────────┐
│  ECHO daemon (already running)      │
│  http://127.0.0.1:38478/mcp         │
│  StreamableHTTPServerTransport      │
│  stateless, enableJsonResponse:true │
└─────────────────────────────────────┘
```

No new daemon code. The extension imports `@modelcontextprotocol/sdk` and connects to the daemon's existing endpoint. The X-Echo-Role header is NOT set — it's only required for coord-surface emissions, and the four tools called here (`find_clusters`, `search_memories`, `get_atom`, `get_atoms`) all work without it.

## Acceptance Criteria

### AC1 — Extension scaffold installable via `ray develop`

- `tools/raycast-echo/package.json` declares a Raycast extension with `name: "echo-context"`, `title: "ECHO Context"`, one command (`name: "search-context"`, `title: "Search ECHO Context"`, `mode: "view"`).
- Dependencies: `@raycast/api`, `@raycast/utils` (for `useDebouncedValue`-style hooks), `@modelcontextprotocol/sdk`. No other runtime deps.
- `tools/raycast-echo/tsconfig.json` compiles cleanly under `npx ray develop` (Raycast's bundler). Strict TS.
- `tools/raycast-echo/README.md` documents two steps: (1) `cd tools/raycast-echo && npm install && npx ray develop`, (2) bind a hotkey via Raycast Preferences → Extensions → ECHO Context → Search ECHO Context → Hotkey (suggested: ⌘⇧E).

### AC2 — Two-state list view + detail pane + action menu

- Empty input: `find_clusters()` no-args; renders each cluster as a list item with title/subtitle per the table above. Empty result set → list message "no recent context — typing will search the full corpus."
- Typed input: 200ms debounce, then `search_memories({query, limit:15})`. Empty result → list message "no matches for `<query>`."
- Selecting a list item populates the detail pane via `get_atoms` (cluster) or `get_atom` (match) as specified above. Detail body is markdown-rendered.
- ActionPanel attached to every list item with five actions: ↩ Copy / ⌘↩ Paste / ⌘O Open Source / ⌘B Open in Trace Viewer / ⌘C Copy Raw JSON, behaviors per the spec body.
- Format of the copied bundle matches `src/lib/format.ts`: `## <source_app> · <PDT timestamp>\n\n<content>` per atom, atoms separated by `\n---\n`.

### AC3 — Daemon-unreachable handled gracefully

- If the daemon at `http://127.0.0.1:38478/mcp` is unreachable (connection refused / timeout / non-2xx), the extension shows a Raycast toast with `Style.Failure`, title `"ECHO daemon unreachable"`, message `"Check 'npm run daemon' in Project_echo"`. The toast appears within 2 seconds of the failed call; the extension does NOT hang, does NOT retry automatically, does NOT cache.
- On daemon recovery (any subsequent call succeeds), the extension renders normally; no special "back online" UI.

### AC4 — README documents the dogfooding contract

- `tools/raycast-echo/README.md` has a "Dogfooding (v0 contract)" section that states verbatim:
  > Every invocation of ⌘⇧E should be logged to `raw/internal/dogfooding/mcp-interactions-journal.md` using the 6-field template (Trigger / Query inputs / Returned / Sources / Verdict / Note). The v0 is "done" when the journal contains ≥10 entries across ≥3 calendar days AND the founder can articulate the top-3 retrieval-quality issues to fix in V1. AC6/AC7 below are the gate.
- The same section calls out: this is NOT a multi-user installable; do NOT publish to the Raycast Store; do NOT add Sentry / analytics / telemetry.

### AC5 — `npm test` / `tsc --noEmit` clean

- `cd tools/raycast-echo && npx tsc --noEmit` reports zero errors.
- `cd tools/raycast-echo && npx ray build` produces a valid Raycast bundle without errors (the bundle is NOT committed — `.gitignore` adds `tools/raycast-echo/dist/` and `tools/raycast-echo/node_modules/`).
- No new unit tests required (this is a UI shell over four existing MCP tools that have their own test coverage). The "test" is AC6's empirical dogfooding bar.

### AC6 — Dogfooding gate (defines "v0 done")

This AC is NOT verified by the builder. It's verified by the founder over the days following the merge. The builder ships AC1–AC5 and the item moves to `complete/`; AC6 is the gate on whether a V1 spec gets written.

- The founder uses ⌘⇧E (or whatever hotkey was bound) ≥10 times across ≥3 calendar days.
- Each invocation is logged to `raw/internal/dogfooding/mcp-interactions-journal.md` with the 6-field template, including a `Verdict` (✅/🟡/❌) and a `Note` observation.
- The founder articulates (in the journal or in a fresh strategist conversation) the top-3 retrieval-quality issues to fix in V1.
- **Only then** does the V1 hotkey overlay spec get written. The V1 spec is item 06X (TBD ID, future), not this one.

### AC7 — V1 spec is deferred, not pre-empted

- This spec MUST NOT include any V1 acceptance criteria, V1 quality bars, or V1 design choices beyond what's necessary to make v0 buildable.
- The wiki page `wiki/surfaces/hotkey-overlay.md` is NOT updated by this spec (it stays `status: planned`). The wiki updates only when V1 ships, per CLAUDE.md.
- The After-Completion section below explicitly notes "no wiki update on v0 ship."
- If the builder discovers a V1-shape question while implementing v0 (e.g., "should the composer render results inline or in a dropdown?"), the answer is **don't decide — log it as a journal observation and defer to V1.** The whole point of v0 is to surface those questions empirically, not pre-decide them.

## Out of Scope (Don't Drift)

1. **Native Swift / Tauri / Electron / standalone-app implementation.** Raycast extension only. If the founder later decides V1 needs a native app, that's V1's call; v0 is bounded by Raycast's chrome.
2. **New MCP tools or new daemon endpoints.** The extension uses `find_clusters`, `search_memories`, `get_atom`, `get_atoms` verbatim from the existing MCP surface. If the builder thinks a 5th tool is needed for v0, stop and re-read this OoS.
3. **Synthesis / summarization of retrieved atoms.** The clipboard bundle is raw concatenated markdown. Downstream LLMs (Cursor's Claude, Claude.ai, ChatGPT) do the synthesis after paste. No LLM call from inside the extension.
4. **Auto-detection of `repo_path` from frontmost-app context.** V0 ships unscoped — `find_clusters` and `search_memories` are called without `repo_path`. A Raycast preference for a default `repo_path` is also out of scope; the founder lives in one repo today (`Project_echo`) and unscoped is fine.
5. **Voice input, multi-turn conversation, ambient surfacing, embedded suggestions.** All deferred to V2 per `wiki/surfaces/hotkey-overlay.md` line 42-45. Not even a stub.
6. **Audit page.** Separate `planned` surface in `wiki/surfaces/audit-page.md`. Different spec, different time.
7. **Telemetry, error reporting (Sentry/etc.), analytics.** This is a single-user dogfooding tool. Zero phone-home.
8. **Raycast Store submission, multi-user installer, code signing.** All distribution concerns are V1+ territory. V0 runs via `ray develop`, period.
9. **Updating `wiki/surfaces/hotkey-overlay.md` or any other wiki page.** Per CLAUDE.md, wiki updates happen only post-V1-shipment. This spec ships a v0; the wiki stays `status: planned` until V1 lands.
10. **Pre-writing the V1 spec inside this item.** AC7 covers this. V1 is a future backlog item informed by v0 dogfooding data, not a sibling section of this spec.
11. **Performance optimization beyond what Raycast/MCP-SDK give for free.** The V1 quality bar (<100ms summon, <500ms retrieval) is the target Raycast's existing infrastructure either meets or doesn't; v0 doesn't add caching, preloading, or speculative-fetch logic. If retrieval feels slow, that's a V1 signal — log it, don't fix it here.
12. **Adding any capture surface or extractor.** This is a retrieval-side UI; touching `src/capture/` or `src/extractors/` is out of scope.
13. **Auth, rate limiting, or any access control on the daemon endpoint.** The daemon is loopback-only; v0 inherits that posture verbatim.
14. **Multi-result-window / pinned-result / favorites / history.** Single-shot retrieval per invocation. Raycast remembers nothing across invocations; we don't add state.

## Risks

- **R1 — Raycast's MCP-SDK compatibility.** Raycast extensions ship in a Node-ish runtime; the MCP SDK is Node-compatible but Raycast's bundler may surprise on some `node:` imports (e.g., `node:crypto` if the transport uses it). Mitigation: if the SDK won't bundle cleanly, fall back to a thin `fetch`-based JSON-RPC client (~30 lines) — the daemon's StreamableHTTPServerTransport with `enableJsonResponse:true` accepts a single POST with `Content-Type: application/json` and returns JSON. Builder picks the cleaner path and notes in `agent_notes`.
- **R2 — Hotkey binding collides with another Raycast command.** If ⌘⇧E is already bound (e.g., to a built-in), Raycast surfaces a conflict UI. README's "bind a hotkey" step accepts whatever the founder chooses; the spec doesn't lock ⌘⇧E. The Wispr Flow analog in `wiki/surfaces/hotkey-overlay.md` line 14 says "default ⌘⇧E"; v0 treats that as a suggestion, not a requirement.
- **R3 — Daemon trace-viewer URL shape (⌘B).** The trace viewer at `:38479` exists per `wiki/architecture/` / journal references, but the URL parameterization for a specific atom may not be `?atom=<id>` exactly. If the builder discovers the route is `/atoms/<id>` or `/trace?atom_id=<id>`, use the actual route and note in `agent_notes`. If the trace viewer has no per-atom deep-link, ⌘B opens `http://127.0.0.1:38479/` (the index) and a toast says "viewer doesn't support per-atom links yet — open in trace viewer instead."
- **R4 — Founder uses a non-Raycast launcher.** If founder switches to Alfred or LaunchBar mid-cycle, the v0 doesn't help. Acceptable v0 risk; the choice (a → Raycast) was confirmed in the 2026-05-17 brainstorm. If switched, file a follow-on backlog item for the new host; do NOT retrofit this spec.
- **R5 — Dogfooding journal discipline slips.** AC6's gate is journal-discipline-dependent. If the founder forgets to log invocations, AC6 can't fire and V1 stays in "intuition-only" territory. Mitigation: README's Dogfooding section is the structural reminder; founder's existing memory `feedback_log_every_echo_mcp_call.md` already covers MCP-call discipline (the hotkey is itself a chain of MCP calls).

## Tests

No new unit tests. The four MCP tools called (`find_clusters`, `search_memories`, `get_atom`, `get_atoms`) have existing test coverage in `tests/mcp/` and `tests/trace/`. The "test" for v0 is AC5's `tsc --noEmit` clean + `ray build` clean + AC6's empirical dogfooding bar.

If the builder feels strongly about a smoke test, the cheapest acceptable shape is a single Vitest file at `tools/raycast-echo/test/format.test.ts` that asserts the `formatBundle(atoms)` function in `src/lib/format.ts` produces the exact markdown shape per AC2. That test runs in pure Node (no Raycast runtime needed). Builder's option, not a requirement.

## Definition of Done

- AC1: extension scaffold at `tools/raycast-echo/` installs cleanly via `npm install && npx ray develop`; one command "Search ECHO Context" registers.
- AC2: two-state list view + detail pane + 5-action menu all working against the live daemon; bundle format matches the markdown shape in `src/lib/format.ts`.
- AC3: daemon-unreachable shows the documented Raycast toast within 2 seconds; no hang.
- AC4: README documents install + hotkey binding + dogfooding contract verbatim.
- AC5: `npx tsc --noEmit` and `npx ray build` clean; `.gitignore` adds `tools/raycast-echo/{dist,node_modules}/`.
- AC6 / AC7: gate on V1 spec; not builder-verified, founder-verified post-merge.
- Builder pushes feature branch, moves item to `pending_review/` with `agent_notes` summary and `head_sha`.

## After Completion (Strategist Notes)

- **No wiki update on v0 ship.** `wiki/surfaces/hotkey-overlay.md` stays `status: planned`. The wiki updates only when V1 ships, per CLAUDE.md. This is doubly important here: a v0 page would prematurely lock the form the V1 spec is supposed to learn from.
- **The first V1 spec input is the dogfooding journal**, not the existing wiki page. When AC6 fires, the strategist's job is to read the ≥10 journal entries, distill the top-3 retrieval-quality issues, and write a fresh V1 backlog item (`2026-XX-XX-06X-hotkey-overlay-v1-...`). The V1 spec MAY contradict the current `wiki/surfaces/hotkey-overlay.md` content — that's the point of the v0 → V1 sequencing.
- **Update `raw/internal/dogfooding/mcp-interactions-journal.md` post-merge** with a "v0 hotkey overlay shipped" entry containing the binding command and a reminder of the 6-field template requirement. One-liner, not a writeup.
- **Optional follow-on if v0 dogfooding goes well:** spec the audit page (the other `planned` surface in `wiki/product/v1-spec.md`). Independent of the hotkey overlay V1; can be written in parallel once founder has bandwidth.
- **If v0 dogfooding goes badly** (founder doesn't use it, journal stays empty after 3 days): write a strategist conversation note in `raw/internal/decisions/` analyzing why — wrong host shell (should have been B or C in Q2), wrong retrieval shape, wrong trigger ergonomics, etc. Then either iterate v0 with a follow-on backlog item, or rethink V1 entirely.
- **The 2026-05-17 brainstorm context** (claude_code session `e3fa3405-...` turns 11–22) is the spec's load-bearing pre-history. If a reviewer wants to challenge any AC, the journal entries from that day are the strategist's justification — particularly turn 20 (20:22 PDT, "do I have enough to build the hotkey overlay") and turn 22 (20:40 PDT, the pseudo-overlay test that surfaced the 7-codex-storm anomaly).
