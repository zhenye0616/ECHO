---
id: 2026-05-17-060-hotkey-overlay-v0-raycast-dogfood
title: V0 hotkey overlay — Raycast extension for founder dogfooding (V1 spec deferred until v0 surfaces friction)
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-05-17
blocked_by: []
task_state_ref: 2026-05-17-060-hotkey-overlay-v0-raycast-dogfood
requested_reviewers: ["codex", "claude"]
files_to_modify:
  - tools/raycast-echo/package.json  # AC1 — Raycast extension manifest (commands, preferences, dependencies); name "echo-context"; one command "search-context" with title "Search ECHO Context"
  - tools/raycast-echo/src/search-context.tsx  # AC1 + AC2 — the command entry point; React/Raycast list view; two-state (empty input → find_clusters, typed → debounced search_memories); detail pane via get_atom / get_atoms; action menu per AC2
  - tools/raycast-echo/src/lib/mcp.ts  # AC1 — thin MCP client wrapper over the daemon's StreamableHTTPServerTransport at http://127.0.0.1:38478/mcp; uses @modelcontextprotocol/sdk client; one helper per tool call (findClusters, searchMemories, getAtom, getAtoms); no X-Echo-Role header (these tools don't need it)
  - tools/raycast-echo/src/lib/format.ts  # AC2 — markdown bundle formatter: header line `## <source_app> · <PDT timestamp>` then content body; concatenates multi-atom selections with `---` separators
  - tools/raycast-echo/tsconfig.json  # AC1 — TS config matching Raycast's expected shape (target ES2022, strict)
  - tools/raycast-echo/README.md  # AC4 — install + dogfooding instructions (3 sections: install via `ray develop`, hotkey binding via Raycast preferences, dogfooding-journal expectation per AC8)
  - docs/BACKLOG.md  # add Ready-table row pointing at this item
spec_refs:
  - wiki/surfaces/hotkey-overlay.md  # the planned V1 surface this v0 will INFORM but not yet build — V1 quality bar (<100ms summon, <500ms retrieval, native chrome) does NOT apply to v0
  - wiki/principles/felt-not-seen.md  # principle the v0 partially honors (Raycast hides chrome when dismissed) but doesn't fully embody (Raycast's own chrome is visible during use — acceptable v0 compromise; V1 redesigns chrome)
  - wiki/principles/clipboard-and-launch.md  # the Layer-3 push delivery pattern; v0 ships clipboard-only (↩ copy + ⌘↩ copy-and-paste); explicit app-launch (⌘L "open in Cursor / Claude / browser") is V1 territory
  - wiki/principles/compose-not-capture.md  # architectural commitment; v0 calls existing capture surfaces' retrieval primitives only — does not add new capture or new MCP tools
  - wiki/product/v1-spec.md  # V1 scope locked 2026-04-30; the hotkey overlay is one of two `planned` surfaces (other: audit-page); this v0 is the first build step toward V1, NOT the V1 itself
  - src/mcp/server.ts  # the daemon-side HTTP endpoint the extension consumes: `http://127.0.0.1:38478/mcp`, StreamableHTTPServerTransport, sessionIdGenerator:undefined (stateless), enableJsonResponse:true; tools called: find_clusters, search_memories, get_atom, get_atoms (X-Echo-Role NOT required for any of these)
  - raw/internal/dogfooding/mcp-interactions-journal.md  # the dogfooding sink — AC8's "≥10 entries / ≥3 days" defines v0 done; journal entries become the V1 spec inputs
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

**The V1 spec is deliberately deferred.** AC9 below makes this explicit: no V1 backlog item is written until v0 dogfooding surfaces ≥10 journal entries across ≥3 calendar days AND the founder can articulate the top-3 retrieval-quality issues to fix in V1. The dogfooding journal IS the V1 spec input.

## The minimum-viable shape

A Raycast extension at `tools/raycast-echo/` with one command, `Search ECHO Context`. The command opens a list view with two states:

| Input state | MCP call | List rendering |
|---|---|---|
| Empty input (just hit ⌘⇧E) | `find_clusters()` no-args (daemon's V1.5.7 auto-expand handles 4h→24h widening) | Each cluster → list item; title = `cluster.label \|\| <derived from source_breakdown>`; subtitle = `<rank_reason joined> · <time_range.from..to in PDT>` |
| Typed query (debounced 200ms) | `search_memories({query, limit:15})` | Each match → list item; title = `<derivedApp(match.source)> · <timestamp PDT>`; subtitle = `<content[0..120]>` |

**`derivedApp(source)` helper** (R2 codex F1 — MED; R3 codex F1 — MED, folded into existing file) — the MCP returns `source` (e.g. `fs:/Users/.../Cursor/...`, `git:/Users/.../Project_echo`), NOT a canonical `source_app` field. Define `derivedApp` as a small top-of-file helper inside `tools/raycast-echo/src/lib/format.ts` (already listed in `files_to_modify` — no new file added) that mirrors `src/mcp/util/source-app.ts` in reverse: iterate `buildSourceAppMap()` entries and return the key whose value is a prefix of the input `source`; fallback `"unknown"`. The builder MAY import `src/mcp/util/source-app.ts` directly if Raycast's bundler allows the cross-tree import; otherwise duplicate the four-entry map verbatim inside `format.ts` (drift risk is bounded — the map has not changed since item 037 shipped). Either path is acceptable as long as the resulting strings are one of `cursor | claude_code | codex | git | unknown`. Co-locating with the formatter keeps the markdown-shape contract and its source-name derivation in one file; no separate `source-app.ts` needed.

Selecting a list item populates Raycast's detail pane:

- Cluster selected → `get_atoms(cluster.atom_ids.slice(0,3), format:"minimal")`, concatenated with `---` separators. (R3 codex F1 — MED dropped `prefer:"newest_first"`: `connectedComponents` in `src/trace/cluster.ts:151-156` sorts cluster IDs lexicographically before passing them through `find_clusters`, so `slice(0,3)` selects 3 lex-ordered atoms and `prefer:newest_first` would only sort those 3 — not the cluster's newest 3. V0 accepts "3 representative atoms" in lex-id order; whether chronology-correct selection matters enough for V1 is a v0-dogfooding-discovery question. Codex's recommended alternative — "fetch up to the `get_atoms` max [50] and display the newest returned atoms" — is the V1 candidate fix if dogfooding flags it.)
- Search match selected → `get_atom(match.id)`, single body verbatim

The action menu (Raycast's `ActionPanel`):

- `↩` (primary) → write the assembled markdown bundle to the OS clipboard via Raycast's `Clipboard.copy()`; show toast "ECHO context copied"
- `⌘↩` → `Clipboard.copy()` then `Clipboard.paste()` (Raycast's paste-into-frontmost-app helper)
- `⌘O` → open the atom's source file in default app (skip if source is a `git:` or `fs:` prefix without a resolvable on-disk path — toast "no source file" instead)
- `⌘B` → open `http://127.0.0.1:38479/` (trace viewer index) in default browser. (R2 codex F2 — MED — `tools/serve-trace.ts:161-176` only routes exact `/` or `/index.html` today; a `?atom=<id>` deep-link route does not exist and would 404. Per-atom deep-linking is V1 territory and explicitly out of scope for v0; if the builder finds it gratifying to add, file a follow-on backlog item — do NOT include here.)
- `⌘C` → copy raw atom JSON for debugging (`JSON.stringify(atom, null, 2)`)

The "assembled markdown bundle" format (in `src/lib/format.ts`):

```markdown
## <derivedApp(atom.source)> · <PDT timestamp>

<atom.content verbatim>
```

Where `derivedApp` is the helper defined above; the output is one of `cursor`, `claude_code`, `codex`, `git`, or `unknown` (see R2 codex F1).

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

**Placement note (R2 claude F1 — LOW).** `tools/raycast-echo/` is deliberately treated as v0-dogfooding scaffolding rather than a shipped surface, hence the `tools/` junk-drawer placement alongside `tools/review-queue/`, `tools/raycast-monitor/`, etc. When V1 lands, the V1 strategist should choose the durable home (likely `clients/raycast/` or similar `clients/<host>/<adapter>/` taxonomy), and that V1 spec includes the move. This OoS-honest placement avoids creating premature top-level taxonomy for a single v0 item per `[[drift-prevention]]`.

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
- ActionPanel attached to every list item with five actions: ↩ Copy / ⌘↩ Paste / ⌘O Open Source / ⌘B Open in Trace Viewer (opens `http://127.0.0.1:38479/`) / ⌘C Copy Raw JSON, behaviors per the spec body.
- Format of the copied bundle matches `src/lib/format.ts`: `## <derivedApp(atom.source)> · <PDT timestamp>\n\n<content>` per atom, atoms separated by `\n---\n`. `derivedApp` is the inline helper described in the spec body (R2 codex F1).

### AC3 — Daemon-unreachable handled gracefully

- If the daemon at `http://127.0.0.1:38478/mcp` is unreachable (connection refused / timeout / non-2xx), the extension shows a Raycast toast with `Style.Failure`, title `"ECHO daemon unreachable"`, message `"Check 'npm run daemon' in Project_echo"`. The toast appears within 2 seconds of the failed call; the extension does NOT hang, does NOT retry automatically, does NOT cache.
- On daemon recovery (any subsequent call succeeds), the extension renders normally; no special "back online" UI.

### AC4 — README documents the dogfooding contract

- `tools/raycast-echo/README.md` has a "Dogfooding (v0 contract)" section that states verbatim:
  > Every invocation of ⌘⇧E should be logged to `raw/internal/dogfooding/mcp-interactions-journal.md` using the 7-field template (Trigger / Query inputs / Returned / Sources / **Repo** / Verdict / Note). The **Repo** field (R2 claude F2 — LOW) captures the active repo at hotkey-fire time — typically the frontmost Cursor/VS Code/terminal repo root, or `none` if invoked from a non-repo context. This disambiguates "wrong retrieval" verdicts that are actually "wrong repo scope" — feeds AC8/AC9 below with cleaner V1-spec inputs. The v0 is "done" when the journal contains ≥10 entries across ≥3 calendar days AND the founder can articulate the top-3 retrieval-quality issues to fix in V1. AC8/AC9 below are the gate.
- The same section calls out: this is NOT a multi-user installable; do NOT publish to the Raycast Store; do NOT add Sentry / analytics / telemetry.

### AC5 — `npm test` / `tsc --noEmit` clean

- `cd tools/raycast-echo && npx tsc --noEmit` reports zero errors.
- `cd tools/raycast-echo && npx ray build` produces a valid Raycast bundle without errors. The bundle is NOT committed; the root `.gitignore` already ignores `node_modules/` and `dist/` (R2 codex F4 — LOW removed the redundant per-extension `.gitignore` mention).
- No new unit tests required (this is a UI shell over four existing MCP tools that have their own test coverage). The "test" is AC8's empirical dogfooding bar.

_(R2 codex F3 — MED: AC6/AC7 were originally in Acceptance Criteria, which conflicted with builder-loop semantics — the builder cannot prove a multi-day dogfooding threshold before moving the item to review. They are now AC8/AC9 in a separate Post-Merge Gate section below, and removed from Definition of Done. AC1–AC5 are the only builder-verifiable gates; the item moves to `pending_review/` once those pass.)_

## Post-Merge Gate (V1 spec trigger)

These are NOT builder-verified. They are founder-verified over the days following the v0 merge to `main`. The builder ships AC1–AC5 and the item moves to `pending_review/` → `complete/` on the normal pipeline; AC8/AC9 then gate whether (and when) a V1 hotkey-overlay backlog spec gets written. They live in this same item file for traceability — when both fire, the strategist references this section as the trigger for writing the V1 spec.

### AC8 — Dogfooding gate (defines "v0 done as a learning instrument")

- The founder uses ⌘⇧E (or whatever hotkey was bound) ≥10 times across ≥3 calendar days post-merge.
- Each invocation is logged to `raw/internal/dogfooding/mcp-interactions-journal.md` with the 7-field template (Trigger / Query inputs / Returned / Sources / **Repo** / Verdict / Note) defined in AC4. **Repo** field is the R2 claude F2 — LOW addition: captures the active repo at hotkey-fire time so journal entries are interpretable when the V1 strategist reads them back.
- The founder articulates (in the journal or in a fresh strategist conversation) the top-3 retrieval-quality issues to fix in V1.
- **Only then** does the V1 hotkey overlay spec get written. The V1 spec is a future backlog item (ID TBD; sequenced after AC8 fires), NOT a sibling section of this one.

### AC9 — V1 spec is deferred, not pre-empted

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
10. **Pre-writing the V1 spec inside this item.** AC9 covers this. V1 is a future backlog item informed by v0 dogfooding data, not a sibling section of this spec.
11. **Performance optimization beyond what Raycast/MCP-SDK give for free.** The V1 quality bar (<100ms summon, <500ms retrieval) is the target Raycast's existing infrastructure either meets or doesn't; v0 doesn't add caching, preloading, or speculative-fetch logic. If retrieval feels slow, that's a V1 signal — log it, don't fix it here.
12. **Adding any capture surface or extractor.** This is a retrieval-side UI; touching `src/capture/` or `src/extractors/` is out of scope.
13. **Auth, rate limiting, or any access control on the daemon endpoint.** The daemon is loopback-only; v0 inherits that posture verbatim.
14. **Multi-result-window / pinned-result / favorites / history.** Single-shot retrieval per invocation. Raycast remembers nothing across invocations; we don't add state.

## Risks

- **R1 — Raycast's MCP-SDK compatibility.** Raycast extensions ship in a Node-ish runtime; the MCP SDK is Node-compatible but Raycast's bundler may surprise on some `node:` imports (e.g., `node:crypto` if the transport uses it). Mitigation: if the SDK won't bundle cleanly, fall back to a thin `fetch`-based JSON-RPC client (~30 lines) hitting `http://127.0.0.1:38478/mcp` with **both** `Content-Type: application/json` AND `Accept: application/json, text/event-stream` (R3 codex F2 — MED — the daemon's `StreamableHTTPServerTransport` content-negotiates and 406-rejects MCP POSTs missing either media type in `Accept`; same constraint that 057b r9 codex F1 HIGH locked for `coord_invoke`; same constraint enforced by `tools/review-queue/coord-emit.sh`). Body is a single JSON-RPC envelope (`{jsonrpc:"2.0", id:1, method:"tools/call", params:{name, arguments}}`); response is JSON (no SSE parsing needed under `enableJsonResponse:true`). Builder picks the cleaner path (SDK vs fetch) and notes in `agent_notes`.
- **R2 — Hotkey binding collides with another Raycast command.** If ⌘⇧E is already bound (e.g., to a built-in), Raycast surfaces a conflict UI. README's "bind a hotkey" step accepts whatever the founder chooses; the spec doesn't lock ⌘⇧E. The Wispr Flow analog in `wiki/surfaces/hotkey-overlay.md` line 14 says "default ⌘⇧E"; v0 treats that as a suggestion, not a requirement.
- **R3 — Daemon trace-viewer URL shape (⌘B).** R2 codex F2 — MED resolved this by pinning ⌘B to the bare index URL `http://127.0.0.1:38479/` (the only route `tools/serve-trace.ts:161-176` serves today). Per-atom deep-linking is V1 territory; no fallback heuristics needed in v0.
- **R4 — Founder uses a non-Raycast launcher.** If founder switches to Alfred or LaunchBar mid-cycle, the v0 doesn't help. Acceptable v0 risk; the choice (a → Raycast) was confirmed in the 2026-05-17 brainstorm. If switched, file a follow-on backlog item for the new host; do NOT retrofit this spec.
- **R5 — Dogfooding journal discipline slips.** AC8's gate is journal-discipline-dependent. If the founder forgets to log invocations, AC8 can't fire and V1 stays in "intuition-only" territory. Mitigation: README's Dogfooding section is the structural reminder; founder's existing memory `feedback_log_every_echo_mcp_call.md` already covers MCP-call discipline (the hotkey is itself a chain of MCP calls).

## Tests

No new unit tests. The four MCP tools called (`find_clusters`, `search_memories`, `get_atom`, `get_atoms`) have existing test coverage in `tests/mcp/` and `tests/trace/`. The "test" for v0 is AC5's `tsc --noEmit` clean + `ray build` clean; AC8's empirical dogfooding bar is the V1-trigger gate, not a builder-time test.

If the builder feels strongly about a smoke test, the cheapest acceptable shape is a single Vitest file at `tools/raycast-echo/test/format.test.ts` that asserts the `formatBundle(atoms)` function in `src/lib/format.ts` produces the exact markdown shape per AC2. That test runs in pure Node (no Raycast runtime needed). Builder's option, not a requirement.

## Definition of Done

_(Builder-verifiable scope only. R2 codex F3 — MED: AC8/AC9 are post-merge founder-verified gates and live in the Post-Merge Gate section above; they are NOT in the builder's DoD.)_

- AC1: extension scaffold at `tools/raycast-echo/` installs cleanly via `npm install && npx ray develop`; one command "Search ECHO Context" registers.
- AC2: two-state list view + detail pane + 5-action menu all working against the live daemon (⌘B opens the bare trace-viewer index per R2 codex F2); bundle format matches the markdown shape in `src/lib/format.ts` (header uses `derivedApp(atom.source)` per R2 codex F1).
- AC3: daemon-unreachable shows the documented Raycast toast within 2 seconds; no hang.
- AC4: README documents install + hotkey binding + the 7-field dogfooding template (R2 claude F2) verbatim.
- AC5: `npx tsc --noEmit` and `npx ray build` clean (root `.gitignore` already covers `node_modules/` and `dist/` per R2 codex F4 — no per-extension `.gitignore` edit needed).
- Builder pushes feature branch, moves item to `pending_review/` with `agent_notes` summary and `head_sha`.

## After Completion (Strategist Notes)

- **No wiki update on v0 ship.** `wiki/surfaces/hotkey-overlay.md` stays `status: planned`. The wiki updates only when V1 ships, per CLAUDE.md. This is doubly important here: a v0 page would prematurely lock the form the V1 spec is supposed to learn from.
- **The first V1 spec input is the dogfooding journal**, not the existing wiki page. When AC8 fires, the strategist's job is to read the ≥10 journal entries, distill the top-3 retrieval-quality issues, and write a fresh V1 backlog item (`2026-XX-XX-06X-hotkey-overlay-v1-...`). The V1 spec MAY contradict the current `wiki/surfaces/hotkey-overlay.md` content — that's the point of the v0 → V1 sequencing.
- **Update `raw/internal/dogfooding/mcp-interactions-journal.md` post-merge** with a "v0 hotkey overlay shipped" entry containing the binding command and a reminder of the **7-field** template (Trigger / Query inputs / Returned / Sources / **Repo** / Verdict / Note) defined in AC4 for ⌘⇧E invocations specifically (R3 codex F3 — MED — corrects an earlier 6-field reference here that contradicted AC4/AC8/DoD). One-liner, not a writeup. **Note:** the canonical cross-tool journal template per CLAUDE.md preamble remains 6-field for every other MCP caller; the **Repo** addition is v0-Raycast-scoped only per the R2 claude F2 disposition. If V1 dogfooding shows the **Repo** field is generally useful for other callers, a separate operating-model item promotes it to the cross-tool template.
- **Optional follow-on if v0 dogfooding goes well:** spec the audit page (the other `planned` surface in `wiki/product/v1-spec.md`). Independent of the hotkey overlay V1; can be written in parallel once founder has bandwidth.
- **If v0 dogfooding goes badly** (founder doesn't use it, journal stays empty after 3 days): write a strategist conversation note in `raw/internal/decisions/` analyzing why — wrong host shell (should have been B or C in Q2), wrong retrieval shape, wrong trigger ergonomics, etc. Then either iterate v0 with a follow-on backlog item, or rethink V1 entirely.
- **The 2026-05-17 brainstorm context** (claude_code session `e3fa3405-...` turns 11–22) is the spec's load-bearing pre-history. If a reviewer wants to challenge any AC, the journal entries from that day are the strategist's justification — particularly turn 20 (20:22 PDT, "do I have enough to build the hotkey overlay") and turn 22 (20:40 PDT, the pseudo-overlay test that surfaced the 7-codex-storm anomaly).
