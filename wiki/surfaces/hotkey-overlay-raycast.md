---
status: shipped
topic: Form Factor
subtopic: Hotkey Overlay
aliases:
  - Hotkey Overlay (Raycast v0)
  - Raycast Extension
  - ask-echo
  - search-context
---

# Hotkey Overlay — Raycast v0

## Definition

The shipped v0 of the [[hotkey-overlay|V1 hotkey overlay]] — a Raycast extension at `tools/raycast-echo/` that gives the founder a single global hotkey to summon ECHO's retrieval, ask LLM-mediated questions against it, and resume prior sessions without leaving the keyboard. The extension borrows Raycast as the host shell (window chrome, hotkey binding, command palette) and consumes the daemon's existing MCP surface at `http://127.0.0.1:38478/mcp`.

V0 is deliberately a **learning instrument**, not the V1 surface. Its purpose is to put ECHO retrieval in the founder's daily flow so [[hotkey-overlay|V1]] gets specced from empirical dogfooding data, not from theory. The [[hotkey-overlay|V1 quality bar]] (<100ms summon, <500ms retrieval, native chrome) does **not** apply here — Raycast's chrome is whatever Raycast renders, and v0 inherits its perf envelope verbatim.

Shipped across five backlog items between 2026-05-17 and 2026-05-25:
[[2026-05-17-060-hotkey-overlay-v0-raycast-dogfood|060]] (search-context + dogfooding contract), [[2026-05-18-062-ask-echo-raycast-llm-qa|062]] (ask-context + audit endpoint), [[2026-05-19-063-raycast-sessions-as-objects|063]] (sessions-as-objects + five-state UX), [[2026-05-20-065-raycast-cluster-resume|065]] (cluster-click resume + singleflight), [[2026-05-22-069-raycast-cold-start-continuity-hero|069]] (cold-start Continue hero).

## Why Raycast for v0

Three constraints made Raycast the lightest credible host:

1. **Hotkey binding is already solved.** Raycast Preferences → Extensions → ECHO Context → Hotkey is one click; no LSEvent / accessibility-permission dance, no Swift code, no installer.
2. **Window chrome is already drawn.** A `List` + `Detail` + `Form` API renders out-of-the-box; v0 spends its budget on retrieval shape, not pixel-pushing.
3. **MCP-client posture is native.** The daemon's `StreamableHTTPServerTransport` accepts any JSON-RPC POST; the extension uses a thin `fetch`-based wrapper (`tools/raycast-echo/src/lib/mcp.ts`) — no daemon changes.

Trade-off accepted: Raycast's own chrome is visible during use, which partially violates [[felt-not-seen]]. The compromise is bounded — Raycast hides itself when dismissed — and V1 owns the redesign.

## Commands Shipped

The extension ships **one command, `echo`**, that fuses search and ask. Earlier items shipped two commands (`search-context`, `ask-context`); [[2026-05-19-063-raycast-sessions-as-objects|063]] unified them under the five-state router below.

### search-context (060)

The empty-state and typed-query halves of the unified command. Two-state list:

| Input | MCP call | Renders |
|---|---|---|
| Empty | `find_clusters()` no-args (auto-expand 4h→24h handled by daemon) | One row per cluster; title from `cluster.label` or derived from `source_breakdown` |
| Typed (200ms debounce) | `search_memories({query, limit: 15})` | One row per match; title `<derivedApp(source)> · <PDT timestamp>` |

Selection populates Raycast's detail pane: cluster → `get_atoms(cluster.atom_ids.slice(0,3), format: "minimal")` concatenated with `\n---\n`; match → `get_atom(match.id)` verbatim. The action menu copies (`↩`), pastes (`⌘↩`), opens source (`⌘O`), opens trace viewer (`⌘B`, bare index at `http://127.0.0.1:38479/`), or copies the projected atom JSON (`⌘C`).

The "assembled bundle" format lives in `tools/raycast-echo/src/lib/format.ts` and is pinned by a mandatory pure-Node Vitest at `tools/raycast-echo/test/format.test.ts`:

```markdown
## <derivedApp(atom.source)> · <PDT timestamp>

<atom.content verbatim>
```

`derivedApp` mirrors `src/mcp/util/source-app.ts` in reverse, returning one of `cursor | claude_code | codex | git | unknown`. No synthesis, no summarization — paste targets the founder's existing LLM clients per [[compose-not-capture]] and [[clipboard-and-launch]].

### ask-context (062)

The LLM-mediated half. ⌘⇧A opens a `Form`; on submit, the extension spawns a **headless agent subprocess** (default `codex`, alternative `claude`, or a `custom` shell template) with a pinned system prompt + the question on stdin. Stdout streams into a `Detail` view as markdown (throttled to one `setMarkdown` per 80ms or on subprocess exit); the `Detail.Metadata` sidebar populates from a new daemon endpoint `GET /mcp/recent-calls`.

**Architectural posture:** ECHO does NOT host the LLM loop. The agent binary owns provider auth, streaming, retries, and tool-use; ECHO contributes the MCP tools, the audit endpoint, and the Raycast UI. Vendor-agnosticism lives at the **agent-profile registry** (`tools/raycast-echo/src/lib/agent-profiles.ts`), not at an LLM SDK layer — adding a third agent is one profile entry, not new TypeScript. This is the structural payoff of [[mcp-server|ECHO MCP]] as substrate: AI clients consume it as peers; ECHO does not special-case per vendor.

**Daemon side (item 062 AC5).** A new in-memory ring buffer at `src/mcp/request-log.ts` (cap 1000) records every MCP tool invocation's start/end/status/duration. `src/mcp/server.ts` exposes this via `GET /mcp/recent-calls?since=<ms>[&until=<ms>][&status=...]` on the same listener as the JSON-RPC endpoint. Projection is a **deterministic per-tool switch** — `args_shape` and `result_shape` carry only lengths, counts, presence flags; never raw atom content, raw query text, or full paths. The naming choice is load-bearing: "shape" names what the projection is, "summary" would invite synthesis-by-daemon.

**Single-shot by design.** No threading, no history, no follow-ups — the structural defense against drifting into "another chat product" ([[context-as-moat]], [[drift-prevention]] Pattern 5). The Detail view renders one continuous markdown answer; the only way to ask a follow-up is to dismiss and re-fire.

## Sessions-as-Objects Model (063)

Item [[2026-05-19-063-raycast-sessions-as-objects|063]] reframed the four pains the founder named during 062 dogfooding (sessions exist but no details / atom counts but no info / navigation unclear / no persistent Q&A) as **broken object identity, not absent chat**. Codex's strategist consult proposed `D (sessions list) + narrow C (warm resume)`, explicitly rejecting rolling chat and topic threads. 063 shipped that cut.

**One object model:** every ask is a durable, inspectable, relaunchable `Session`:

```ts
interface Session {
  id: string;                              // ses_<iso>_<rand>
  question: string;
  agentKind: "claude" | "codex" | "custom";
  startedAt: string;                       // ISO UTC
  completedAt: string | null;
  status: "running" | "done" | "cancelled" | "errored" | "historical";
  answer: string;
  auditCalls: AuditCall[];                 // slice of /mcp/recent-calls
  subprocessLogPath: string | null;        // per-session tee log
  sourceBreakdown: Record<string, number>;
  evidenceClusters: string[];
  forkedFrom: string | null;               // source id when ⌘R "Ask again from this"
  clusterId?: string;                      // added by 065 — see Cluster Resume
}
```

**Five UI states**, one Raycast command, navigated via keyboard:

```
Empty ──⌘N──▶ Typing ──↩──▶ Live ──done──▶ SessionDetail
  │                                              │
  └──⌘S──▶ SessionsList ◀──────────────────────⌘R fork
```

State files live under `tools/raycast-echo/src/components/`: `EmptyState.tsx`, `TypingState.tsx`, `AnswerView.tsx`, `AuditTimeline.tsx`, `SessionDetail.tsx`, `SessionsList.tsx`.

**Persistence.** Sessions live in Raycast `LocalStorage` under per-row keys `echo.sessions.v1.row.<id>`; the list is derived via `LocalStorage.allItems()` + key-prefix filter. `mergeRowAndWrite(id, patch)` touches only the target row's key, eliminating the cross-row race two overlapping extension processes had under an earlier single-array contract. Cap 100; eviction prefers `historical` then oldest `startedAt`; never evicts a `running` row or the single most-recent `done` row (the derived warm session). A one-time migration reads legacy `echo.recent-asks`, writes per-row entries with full Session shape, and sets an `echo.sessions.v1.migrated` sentinel for idempotency.

**`⌘R` "Ask again from this" forks**, it does NOT add a turn to a thread. The fork writes a NEW session row with `forkedFrom: <source.id>`; the source session is never mutated. This is the canonical worked example of giving continuity without becoming a destination ([[compose-not-capture]]).

## Cluster Resume (065)

During live dogfooding on 2026-05-20, the founder hit a continuity regression: clicking a cluster row that had already been answered spawned a fresh agent run, throwing away the prior answer. The bug is **broken object identity, not missing cache** — the cluster row had no edge to the session it had previously produced.

[[2026-05-20-065-raycast-cluster-resume|065]] closed the regression by:

1. Persisting `clusterId` on every session created via the cluster-click path (and on forks of cluster-tagged sessions). `normalizeSession` round-trips the field through every write path so the first answer-flush after `recordSessionStart` does not erase the cluster edge.
2. Adding `findLatestSessionForCluster(clusterId, statuses?)` to `tools/raycast-echo/src/lib/sessions.ts`. Default status filter `["running","done"]` excludes `errored`/`cancelled`.
3. Flipping ClusterRow's primary action: "Open Prior Answer" when a `running`/`done` session exists for the cluster, "Ask ECHO about This Cluster" otherwise. An accessory chip — `Answered {relative_time}` or `Running` — surfaces freshness on the row.
4. Adding a secondary action "Ask Again from This Cluster" (`⌘⇧R`) that is always present, even when a prior session exists.
5. Introducing an **intent-keyed per-cluster singleflight** at `acquireOrAwaitClusterSession(clusterId, intent, factory)`. The composite key `${clusterId}#${intent}` ensures two simultaneous default-intent opens collapse to one factory call, two simultaneous fresh-intent opens likewise, but a mixed pair (one "Open Prior Answer" + one "Ask Again") proceeds in parallel. The owner flag (`createdByThisCall`) plus the source discriminator (`source: "existing" | "created"`) gate `startAgent` so only the owner who actually created a fresh row spawns the subprocess; waiters and lookup-hits replay.

**Brand anchoring:** *"ECHO should remember just enough to avoid making the user repeat themselves, while making freshness and provenance visible only at the moment trust requires it."* The accessory chip and the italics replay banner (`_Replayed from session asked {relative_time}_`) are the [[felt-not-seen]] worked example for this surface — no modal, no interrupt, small honest signal.

## Cold-Start Continuity Hero (069)

The landing view's `Open loops · Today` section was over-approximating: its underlying signal `has_open_loop` counted every open-loop hint, including hints that `src/trace/hints.ts` had already marked `resolved: true`. The first time the founder opened Raycast to "check where I left off" and saw a resolved thread elevated, trust eroded.

[[2026-05-22-069-raycast-cold-start-continuity-hero|069]] replaced the up-to-three list with a single confidence-gated **Continue** hero row.

**Substrate changes:**

- `src/trace/rank.ts` gains two new `RankSignals`: `has_unresolved_open_loop` (`hints.some(h => h.resolved === false)`) and `code_session_anchor` (cluster has a repo/file/commit artifact, OR any atom with `source.app === 'git'`, OR ≥3 distinct apps in `source_breakdown`). The deprecated `has_open_loop` is preserved for backwards compatibility.
- `src/mcp/wire-shape/compact.ts` widens its `rank_reason` allowlist to include both new strings so Raycast's `view: "compact"` calls see them.

**Raycast side:** `tools/raycast-echo/src/components/EmptyState.tsx` replaces the old section with a `pickHero(clusters, sessions)` decision tree gated by the V1 confidence contract — the hero fires iff EITHER a `running` session exists OR the top cluster satisfies all three of `{has_unresolved_open_loop, time_range.to within 18h, anchored}`, where "anchored" is the disjunction of the substrate `code_session_anchor` reason and the Raycast-side check `sessions.some(s => s.clusterId === top.cluster_id)`. The Raycast client (`tools/raycast-echo/src/lib/mcp.ts`) passes an explicit 18h `since` to `find_clusters` so the daemon's lookback matches the freshness window.

**Architectural invariant:** the hero **never** promotes a cluster ECHO cannot anchor. There is no "best guess" fallback. Trust is preserved by making the hero's appearance itself the confidence signal — it appears iff ECHO is confident.

## Dogfooding Contract

V0 is "done as a learning instrument" only when journal evidence accumulates. The contracts live in each item's post-merge gate:

- **[[2026-05-17-060-hotkey-overlay-v0-raycast-dogfood|060]] AC8:** ≥10 entries / ≥3 calendar days, with founder articulating the top-3 retrieval-quality issues. **Adds a `Repo` field** to the standard 6-field cross-tool template at `raw/internal/dogfooding/mcp-interactions-journal-2026-05.md` — the 7-field shape is Raycast-scoped only; the cross-tool template per `CLAUDE.md` remains 6-field everywhere else.
- **[[2026-05-18-062-ask-echo-raycast-llm-qa|062]] AC9:** ≥5 entries containing the marker line `**Surface:** Ask ECHO` across ≥2 calendar days, ≥1 ✅ and ≥1 🟡/❌. Mechanically checkable via `grep -c`.

Every ⌘⇧E / ⌘⇧A invocation is logged to `raw/internal/dogfooding/mcp-interactions-journal-2026-05.md` in the moment, NOT batched at end-of-day. The journal is the load-bearing V1 spec input — aspirational end-of-week entries are useless; lossy in-the-moment entries are gold. **The README documents this verbatim**, and the extension explicitly does NOT auto-telemeter — single-user dogfooding, zero phone-home.

## Relationship to the V1 Canonical Overlay

[[hotkey-overlay]] remains `status: planned` and unmodified in content. It describes the V1 vision — native macOS chrome, <100ms summon, <500ms retrieval — written before any version of the overlay existed in the founder's hands. Its quality bar and 6-step composer flow are taste-driven proposals informed by Wispr Flow and Raycast; they are **not** what v0 ships.

The v0 → V1 sequencing is deliberate:

- V0 ships the ugly version so the V1 questions ("is the composer shape right?" "what cards should we render?" "how does paste-and-launch feel?") get answered with dogfooding data.
- The V1 backlog item is **deferred until v0 dogfooding gates fire** — see 060 AC8 / 062 AC9. The V1 spec MAY contradict [[hotkey-overlay]]'s current content; that's the point of the sequencing.
- The wiki update for V1 happens only when V1 ships, per `CLAUDE.md`.

V0's `tools/raycast-echo/` placement is also deliberate scaffolding. When V1 lands, the V1 strategist chooses the durable home (likely `clients/raycast/` or a `clients/<host>/<adapter>/` taxonomy), and that V1 spec includes the move. The `tools/` junk-drawer location avoids creating premature top-level taxonomy for a single v0 surface per [[drift-prevention]].

## Related

- [[hotkey-overlay]] — the planned V1 canonical overlay this v0 informs
- [[mcp-server]] — the daemon this extension consumes
- [[mcp-find-clusters]] — empty-state and Continue-hero retrieval
- [[mcp-search-memories]] — typed-query retrieval
- [[mcp-get-atoms]] — cluster body hydration
- [[mcp-get-atom]] — match body hydration
- [[felt-not-seen]] — partially honored (Raycast hides on dismiss), partially compromised (Raycast chrome visible during use)
- [[clipboard-and-launch]] — clipboard-only delivery; explicit launch is V1
- [[compose-not-capture]] — no daemon-side synthesis; agents are external
- [[context-as-moat]] — single-shot Q&A, not a chat product
- [[drift-prevention]] — Pattern 5 (chat UI trap) is the structural temptation v0 refuses
- [[audit-page]] — sibling planned Layer 5 surface; the per-session `Detail.Metadata` sidebar is its in-Raycast precursor
