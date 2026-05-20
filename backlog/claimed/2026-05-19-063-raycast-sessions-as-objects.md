---
id: 2026-05-19-063-raycast-sessions-as-objects
title: Raycast ECHO — sessions as objects (D + narrow C persistence model)
status: ready
priority: HIGH
estimate: 2-3d
created: 2026-05-19
blocked_by: []
task_state_ref: 2026-05-19-063-raycast-sessions-as-objects
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - tools/raycast-echo/src/echo.tsx  # AC1, AC2, AC7 — restructure as a thin router across the five states (Empty / Typing / Live / SessionDetail / SessionsBrowse); split AnswerView, SessionDetail, SessionsList, Empty into separate component files (see below). Target: shrink echo.tsx from 1069 lines to ≤400 lines by extracting components.
  - tools/raycast-echo/src/components/EmptyState.tsx  # AC1 — NEW. State 1: Resume row (warm last session) + Open loops · Today + Today's sessions + Yesterday + This week (matches AC1.4 exactly: sessions older than 7 days are NOT surfaced in EmptyState — those are browsable via ⌘S → SessionsList only). Reads from sessions.ts + existing useClusters(). Session row uses AGENT-KIND icon (claude→Stars/orange, codex→Terminal/purple, custom→Dot/grey per AC1.3 — NOT a source-app icon; r4 codex F3 + r5 codex F2/codex-ops F3).
  - tools/raycast-echo/src/components/TypingState.tsx  # AC2 — NEW. State 2: synthetic "Ask ECHO about \"<query>\"" row at top + matching atoms/clusters. Visually distinct primary row.
  - tools/raycast-echo/src/components/AnswerView.tsx  # AC3, AC4, AC7 — EXTRACTED from echo.tsx (was lines 726–1016). Adds AuditTimeline subcomponent for State 3 (live) and State 4 (resumed) rendering of per-call detail.
  - tools/raycast-echo/src/components/AuditTimeline.tsx  # AC3 — NEW. Renders audit-call rows: tool · args_shape · result_shape · duration · status. Shape derived strictly from what the daemon endpoint already serves per item 062 AC5; no new daemon work.
  - tools/raycast-echo/src/components/SessionsList.tsx  # AC5 — NEW. State 5: ⌘S sessions browse, grouped by day (Today / Yesterday / This week / Older). Filterable by AGENT-KIND (all/claude/codex/custom) via List.Dropdown per AC5.3 — NOT by source-app, since the Session interface has agentKind and the audit shape does not derive a reliable source app for session rows (r5 codex F2/codex-ops F3).
  - tools/raycast-echo/src/components/SessionDetail.tsx  # AC4 — NEW. State 4 load-bearing screen: full answer + audit timeline + evidence chips + sources + subprocess log path with [Open] + [Tail] + launch row + ⌘R fork.
  - tools/raycast-echo/src/lib/sessions.ts  # AC6 — NEW. Session checkpoint persistence layer. Full Session interface: `{ id, question, agentKind, startedAt, completedAt, status: "running"|"done"|"cancelled"|"errored"|"historical", answer, auditCalls, subprocessLogPath, sourceBreakdown, evidenceClusters, forkedFrom }` (full enum + forkedFrom per the AC4.5/AC6.1 specifications below). **Per-row LocalStorage layout (r4 founder-resolution; r5 codex F1 polish):** each session lives at `echo.sessions.v1.row.<id>`; list derived via `LocalStorage.allItems()` + key-prefix filter; `mergeRowAndWrite(id, patch)` touches only the target row's key. Cap at MAX_SESSIONS (default 100, per-key `removeItem` eviction per AC6.5). Migration (AC6.1) reads legacy `echo.recent-asks` (and any hypothetical legacy `echo.sessions.v1` array), writes each historical row to its own `echo.sessions.v1.row.<id>` key with the FULL Session shape (including default `auditCalls: []`, `forkedFrom: null`, etc.), writes `echo.recent-asks.backup`, deletes the legacy key(s), and sets the `echo.sessions.v1.migrated` sentinel for idempotency.
  - tools/raycast-echo/src/lib/recent-asks.ts  # AC10 — DELETE. Replaced by sessions.ts. The one-time migration in sessions.ts preserves the last-3 history.
  - tools/raycast-echo/src/lib/audit.ts  # AC3 — EXTEND. Already fetches GET /mcp/recent-calls?since=…&until=… per item 062. Add a per-call body shape that the AuditTimeline component reads (no new daemon work; just expose what's already returned in a typed shape).
  - tools/raycast-echo/src/lib/agent-runner.ts  # AC3, AC4, AC6, AC8 — EXTEND (was spec_ref in r1; promoted to files_to_modify per r1 codex F1 + codex-ops F1). Currently returns `{ events, cancel }` and keeps `sessionPath` private (existing code at lines 93, 227-245, 248-255). Expose the absolute per-session log path so SessionDetail [Open]/[Tail] target the correct file (NOT `latest.log`, which races under overlapping runs). Contract: extend `AgentRun` to include `sessionLogPath: string | null` (null only when log creation failed), set synchronously before `startAgent()` returns, immutable for the lifetime of the run. Existing private `sessionPath` becomes the source.
  - tools/raycast-echo/test/agent-runner.test.ts  # AC8.5 — EXTEND existing (already 9 tests). Add: two overlapping `startAgent` calls return distinct non-null `sessionLogPath` values pointing to different files; closing one runner does NOT affect the other's log path.
  - tools/raycast-echo/test/sessions.test.ts  # AC8 — NEW. Vitest. Tests per AC8.1+AC8.6+AC8.7+AC8.10+AC8.11+AC8.12: write+read roundtrip, AC6.1 migration shape + idempotency, MAX_SESSIONS per-key eviction, lifecycle status transitions, AC6.6 startup reconciliation (stale running rows → cancelled), AC6.7 mergeRowAndWrite contract (composite key, monotonic status, Partial scoping, per-row keys layout), AC6.4 awaited final-flush ordering. **No dedup-on-relaunch policy** — r6 codex F1: that wording was r1-era leftover; the spec does not require dedup on relaunch. Re-firing the same question creates a NEW session row.
  - tools/raycast-echo/test/audit-timeline.test.tsx  # AC8 — NEW. Component test for AuditTimeline rendering modes (live · done · errored · empty).
  - tools/raycast-echo/test/session-detail.test.tsx  # AC8 — NEW. Component test for SessionDetail render + the DEFERRED ⌘R fork flow per AC4.5/AC8.8 (⌘R navigates to TypingState with prefilled text; row creation happens at ↩-time, NOT at ⌘R-time; cancelling out creates no row; submit creates a row with `forkedFrom=<source_id>`). The source session is never mutated. r5 codex F3.
  - tools/raycast-echo/README.md  # AC9 — UPDATE: replace the "Ask ECHO" usage section with the new five-state UX walkthrough; add Sessions concept note (one object model: ask = session); document ⌘R "Ask again from this" semantics (fork, not continuation).
  # NOTE: docs/BACKLOG.md is NOT in this list per docs/AGENT_INSTRUCTIONS.md:363; strategist adds the Ready-table row at spec-commit time.
spec_refs:
  - tools/raycast-echo/src/echo.tsx  # current 1069-line surface being restructured
  - tools/raycast-echo/src/lib/mcp.ts  # existing MCP client wrapper; unchanged
  - tools/raycast-echo/src/lib/launch.ts  # existing launch actions; reused verbatim
  - tools/raycast-echo/src/lib/agent-profiles.ts  # existing; unchanged
  - tools/raycast-echo/src/lib/system-prompt.ts  # existing; unchanged
  - src/mcp/server.ts  # daemon's /mcp/recent-calls endpoint per item 062 AC5; consumed by AuditTimeline; NOT modified
  - src/mcp/request-log.ts  # ring buffer per item 062 AC5; provides the shape AuditTimeline renders
  - backlog/complete/2026-05-18-062-ask-echo-raycast-llm-qa.md  # predecessor; this spec replaces its UX with a richer session model
  - backlog/complete/2026-05-17-060-hotkey-overlay-v0-raycast-dogfood.md  # v0 dogfood that motivated this spec
  - raw/internal/dogfooding/mcp-interactions-journal-2026-05.md  # the 2026-05-19 15:20 PDT codex strategist consult entry is the design-rationale source of truth for this spec
  - wiki/surfaces/hotkey-overlay.md  # planned V1 surface; this spec promotes it toward "shipped"
  - wiki/principles/compose-not-capture.md  # the architectural commitment this spec honors; ⌘R "Ask again from this" is the canonical worked example of giving continuity without becoming a destination
  - wiki/principles/felt-not-seen.md  # Raycast invisible-when-not-summoned; preserved
  - wiki/principles/context-as-moat.md  # "never ship a chat UI" — this spec is the structural defense
  - wiki/principles/drift-prevention.md  # Pattern 5 (chat UI trap) is the temptation this spec explicitly refuses
  - https://developers.raycast.com/api-reference/user-interface/list  # List + List.Section + List.Item.Detail + List.Dropdown
  - https://developers.raycast.com/api-reference/user-interface/detail  # Detail.Metadata
  - https://developers.raycast.com/api-reference/storage  # LocalStorage API for sessions persistence

# --- agent-managed fields (filled in during run) ---
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-20T04:08:29Z"
branch: "agent/raycast-sessions-as-objects"
worktree: ""
head_sha: ""
pr_url: ""
review_notes: ""
agent_notes: ""
---

# Raycast ECHO — sessions as objects (D + narrow C persistence model)

## Background

Item 062 shipped Ask ECHO as a single-shot Q&A surface. The unified `echo` command from item 060 fused search + ask. Headless-agent observability (per-session tee logs, live audit polling, `tail-mcp.sh`) shipped in commit `cca021b` on 2026-05-19.

During live dogfooding on 2026-05-19, the founder named four pains in the Raycast surface:

1. **Sessions exist but no details** — per-session subprocess log files exist on disk but the UI doesn't surface their content.
2. **Atom counts but no info** — the audit sidebar shows "Live (N calls so far)" without per-call detail.
3. **Navigation unclear** — the omnibox has multiple modes (open loops / today / recent asks / typing / cluster-detail / answer) but transitions are not obvious.
4. **No persistent Q&A** — each AnswerView is one-shot; exit destroys the state; re-fire from scratch.

The founder framed this as wanting "persistent Q&A sessions." A peer codex strategist consult on 2026-05-19 15:20 PDT (journaled in `raw/internal/dogfooding/mcp-interactions-journal-2026-05.md`) reframed the diagnosis: the root pain is **loss of continuity and inspectability**, not absence of chat. Building chat threads would violate the V1 wedge (ECHO is not a destination) and the `compose-not-capture` + `context-as-moat` ("never ship a chat UI") principles.

This spec implements codex's recommendation: ship **D (sessions list) + narrow C (warm resume)**, explicitly reject A (rolling chat) and B (topic threads).

## Goals

1. Make every ask a **durable, inspectable, relaunchable object** — a session.
2. Surface the per-session subprocess log + the per-call audit detail in the UI, killing pains #1 and #2.
3. Collapse the omnibox's modes into one coherent object model (search result · ask session · cluster detail), killing pain #3.
4. Keep the last session warm across Raycast exits + offer sessions browse (⌘S) for prior work, killing pain #4 without becoming a chat surface.
5. Reduce `echo.tsx` from 1069 lines to ≤400 by extracting per-state components — a project_v15_cleanup-aligned reduction, not new architecture.

## Non-goals

Codex's explicit cut list, mirrored here:

- **No infinite chat transcript.** Answers are bullets; sessions are objects; conversations are not modeled.
- **No topic-thread management.** No notion of "this ask continues a prior ask" except via the ⌘R fork mechanic (which writes a NEW session row, not a turn in an existing one).
- **No daemon-side conversation memory.** The daemon stays MCP-only; no chat state, no thread IDs, no server-side session store.
- **No custom session DB beyond Raycast `LocalStorage` + existing tee log files.** Sessions live in LocalStorage; subprocess output lives in `~/.config/raycast/extensions/echo-context/sessions/<ts>.log` (already in place per cca021b). No new on-disk format, no new MCP tool, no daemon changes.
- **No "continue conversation" semantics.** ⌘R "Ask again from this" forks. It does NOT add a turn to a thread.
- **No UI that makes ECHO the place where the work finishes.** Launch row (Open in Cursor / Send to Claude.ai / Send to ChatGPT / Copy packet) remains the primary CTA in every session detail view.
- **No new daemon endpoints.** AuditTimeline consumes `GET /mcp/recent-calls` exactly as defined in item 062 AC5; if the daemon's `result_shape` is insufficient (e.g. for "top source" derivation), the UI either degrades gracefully or files a follow-up — it does NOT amend the daemon contract in this spec.
- **No browser-tab primary detection.** `detectPrimary()` desktop-app-only behavior preserved from item 062.

## Architecture overview

One Raycast command (`echo`), five UI states, one object model:

```
┌─ State 1: Empty ─┐  ⌘N   ┌─ State 2: Typing ─┐  ↩    ┌─ State 3: Live ─┐  done  ┌─ State 4: SessionDetail ─┐
│  Resume warm    │ ────▶ │  Synthetic Ask row │ ────▶ │  Streaming +    │ ─────▶ │  Full answer + audit +   │
│  Open loops     │       │  + matching atoms  │       │  live audit     │        │  sources + log + launch  │
│  Today's sess.  │       │  + clusters        │       │  timeline       │        │  + ⌘R fork              │
└──────────────────┘       └────────────────────┘       └─────────────────┘        └──────────────────────────┘
       │                                                                                       │
       │ ⌘S                                                                                    │ ⌘R fork
       ▼                                                                                       ▼
┌─ State 5: SessionsList ─┐                                                          (writes a NEW session
│  Today / Yesterday /    │ ← all states navigate here via ⌘S                          row; does NOT mutate
│  This week / Older      │                                                            the source session)
└─────────────────────────┘
```

**Session object** (the single load-bearing data model):

```ts
interface Session {
  id: string;                              // e.g. "ses_2026-05-19T21-58-32-353Z_a7f3"
  question: string;
  agentKind: "claude" | "codex" | "custom";
  startedAt: string;                       // ISO UTC
  completedAt: string | null;              // ISO UTC, null while running
  status: "running" | "done" | "cancelled" | "errored" | "historical";  // canonical enum; NO "warm" value (warm is a derived selector — see AC1.1)
  answer: string;                          // accumulated agent stdout markdown
  auditCalls: AuditCall[];                 // [startedAt, completedAt-or-now] slice of process-global /mcp/recent-calls ring buffer; concurrent MCP calls from other surfaces (parallel Claude Code, Cursor, coord ticks, tail-mcp.sh) WILL appear here — known V1.6 limitation per AC3.6 + Risk #6
  subprocessLogPath: string | null;        // absolute path to per-session tee log; null only when log creation failed; set synchronously by startAgent before it returns (see agent-runner.ts contract change)
  sourceBreakdown: Record<string, number>; // best-effort: only set when derivable from current audit result_shape; else {} (see AC4.2 + OoS #9)
  evidenceClusters: string[];              // best-effort: only set when derivable from current audit result_shape; else [] (capped at 5; see AC4.2)
  forkedFrom: string | null;               // source session id when this row was created via ⌘R "Ask again from this"; null otherwise (see AC4.5)
}
```

Sessions are written/updated as the run progresses: `recordSessionStart` runs IMMEDIATELY AFTER `startAgent()` returns (capturing the synchronously-returned `sessionLogPath` onto the new `status="running"` row — see AC6.2 for ordering rationale); the run's `runner.events` async iterator drives `recordSessionUpdate` via the existing 80ms debounced flush (writing accumulated answer + auditCalls), and the runner's exit event drives `recordSessionEnd` (writing `completedAt` + final status + sourceBreakdown + evidenceClusters). The React layer subscribes via state + a LocalStorage `useEffect`. **Per-row storage layout (AC6.7 r4 founder resolution):** each session lives under its own `echo.sessions.v1.row.<id>` LocalStorage key; the list is derived via `LocalStorage.allItems()` + key prefix filter. `recordSessionUpdate` + `recordSessionEnd` go through `mergeRowAndWrite(id, patch)` which touches ONLY that session's key — eliminating the cross-row race two overlapping extension processes had under the r1–r3 single-key contract. On `useSessions()` first read at Raycast start, AC6.6 reconciliation (age-ceiling only — no log-mtime predicate, per r2 disposition) transitions any stale `running` rows to `cancelled` so leaked rows cannot bypass MAX_SESSIONS eviction.

## Components

### `src/lib/sessions.ts` (new)
- `useSessions()` hook returning `{ sessions, warmSession, recordSessionStart, recordSessionUpdate, recordSessionEnd, forkSession }`. `warmSession` is a DERIVED selector — the most-recent `status="done"` row — NOT a status value.
- **Per-row LocalStorage layout (r4 founder-resolved):** each session is stored at its own key `echo.sessions.v1.row.<id>`; the session list is derived at read time via `LocalStorage.allItems()` → filter by key prefix `echo.sessions.v1.row.` → parse + sort by `startedAt`. The `mergeRowAndWrite(id, patch)` helper underlying `recordSessionUpdate` + `recordSessionEnd` touches ONLY that session's key.
- **One-time migration (AC6.1)** on first read (sentinel `echo.sessions.v1.migrated` absent): read legacy `echo.recent-asks` (and any hypothetical legacy `echo.sessions.v1` array key) → for each row, write a FULLY-SHAPED Session at `echo.sessions.v1.row.<id>` per the AC6.1 defaults + `launchedTo→agentKind` mapping → write `echo.recent-asks.backup` (defensive) → delete legacy key(s) → set the sentinel. Idempotent (second call sees sentinel and no-ops).
- Cap at `MAX_SESSIONS = 100`. Eviction priority: `status="historical"` first, then oldest `startedAt`. Eviction uses per-key `removeItem`, NOT a single-array re-serialization. Never evict: any `status="running"` row, OR the single most-recent `status="done"` row (the derived warm session).
- AC6.6 startup reconciliation runs immediately after migration on first read — see AC6.6.

### `src/components/EmptyState.tsx` (new)
- State 1 render. Sections (in order, matching AC1 exactly): **Resume** (1 row, warm session) · **Open loops · Today** (clusters from existing `useClusters()`) · **Today's sessions** · **Yesterday** · **This week** (Mon–today, PDT-anchored, excluding Today + Yesterday). Sessions older than 7 days are NOT surfaced in EmptyState (browse via ⌘S → SessionsList) — r6 codex F1: the prior "Older" wording was r1-era leftover and contradicted AC1.4. Each session row: **agent-kind icon** (claude→Stars/orange, codex→Terminal/purple, custom→Dot/grey — per AC1.3; NOT a source-app icon, since the Session interface has agentKind, not sourceApp; r5 codex-ops F3), question title, accessory text `HH:MM · agent · N calls`.

### `src/components/TypingState.tsx` (new)
- State 2 render. Top row: synthetic `Ask ECHO about "<query>"` with `Color.OrangeRed` accessory icon + `subtitle="<agentKind> · ↩"` for visual elevation (Raycast `List.Item` exposes `icon`, `accessories`, `subtitle`, `keywords`, `actions`, `detail` — there is no `style`/CSS prop; r1 codex F4). Below: matching atoms + matching clusters, identical to current behavior.

### `src/components/AnswerView.tsx` (extracted from echo.tsx, then extended)
- State 3 render. Two-column markdown via Raycast `Detail.Metadata`. Left: streamed answer (existing behavior). Right: AuditTimeline component (new). Running pill in nav title with elapsed seconds.
- On spawn-end transition: writes session.completedAt, status, answer, auditCalls, subprocessLogPath, sourceBreakdown to sessions.ts. View pushes to SessionDetail on next idle (or stays in the same view; either way the session is durable).

### `src/components/AuditTimeline.tsx` (new)
- Renders an array of `AuditCall` rows. Each row shows:
  - timestamp (PDT, `HH:MM:SS` + `(+N.Ns)` relative to first call)
  - tool name (color-coded by tool family)
  - args_shape (compact one-line: `since=…, until=…, format=minimal`)
  - result_shape (e.g. `→ 4 clusters · 30 atoms · 12ms` or `→ 0 matches` or `⏳ running · N.Ns elapsed` for pending)
  - top source (derived from result_shape where the tool's contract includes source_breakdown; ELSE omitted)
- Empty state: "Audit unavailable — daemon may not be reachable." Per-row error state: red status pill + truncated error.

### `src/components/SessionsList.tsx` (new)
- State 5 render. Day-grouped List.Section. List.Dropdown filters by **`agentKind`**: all / claude / codex / custom (matching the Session interface field — per r4 codex F3, NOT a derived source-app). Per-row icon: agent-kind (claude→Stars/orange, codex→Terminal/purple, custom→Dot/grey). Per-row accessories: `HH:MM · agent · N calls · M atoms`. ActionPanel: ↩ Open · ⌘R Ask again from this · ⌘D Delete · ⌘F Filter.

### `src/components/SessionDetail.tsx` (new)
- State 4 render — load-bearing screen. Layout:
  - Title bar: question + agent + ISO timestamp + status pill
  - Main markdown column: full streamed answer (bulletted, fenced where the agent fenced)
  - Metadata sidebar:
    - **Run**: agent · model (if derivable) · N MCP calls · duration · status
    - **Evidence used**: source-breakdown chips
    - **Sources**: jsonl / commit / repo paths from audit (cap 5)
    - **Subprocess log**: path + bytes + `[Open]` (opens via `Action.Open`) + `[Tail]` (push a Detail view streaming the tail)
  - Audit timeline (full): same component as State 3, rendered with completed-state styling
  - Action panel (primary): ↩ Open in Cursor · ⌘1 Send to Claude.ai · ⌘2 Send to ChatGPT · ⌘C Copy packet · ⌘R Ask again from this · ⌘N New ask · ⌘O Open log

### `src/echo.tsx` (restructured)
- Reduce to a thin router: parse search input + recent-session state, branch to EmptyState / TypingState / AnswerView / SessionDetail / SessionsList. Shared hooks (`usePrimary`, `useDebouncedValue`, `useClusters`, `useMatches`) remain in `echo.tsx` or move into `src/lib/` if cleanly extractable. Hard cap: 400 lines.

## Data flow

1. **Cold open (Raycast ⌘⇧E):** `EchoContext` reads sessions.ts. If `warmSession` exists, EmptyState renders with Resume row at top. User types → TypingState; user presses ↩ on Ask row → AnswerView spawns agent + `recordSessionStart` writes a row with `status="running"`.
2. **Live run:** AnswerView streams stdout into the session.answer field (debounced flush at 80ms — existing FLUSH_INTERVAL_MS). AuditTimeline polls `/mcp/recent-calls?since=startedAt` every 600ms (existing 600ms interval); updates session.auditCalls.
3. **Run completes:** subprocess exit handler calls `recordSessionEnd` → status="done" → completedAt set → answer frozen → auditCalls frozen → sourceBreakdown derived from final audit pass.
4. **User exits Raycast and reopens:** EmptyState renders with new warm session (the one just completed) at top. User ⌘S to browse → SessionsList. User ↩ on a row → SessionDetail.
5. **⌘R fork from SessionDetail:** navigates back to **TypingState** (NOT AnswerView — per r2 codex F2) with the source question prefilled in the search bar + a banner "Forking from session <HH:MM PDT>". The user appends their follow-up text, then presses ↩ on the synthetic Ask row to actually spawn the agent. The source session is unmodified. A new session row is created at ↩-time (NOT at ⌘R-time) with `forkedFrom: <source_id>` and the composed prompt (source question + previous answer + follow-up) as its `question`. Cancelling out of TypingState (Esc) creates no row. Specific composed-prompt format: see Acceptance Criteria AC4.5.

## Acceptance criteria

### AC1: State 1 (Empty) renders the four canonical sections in order
- **AC1.1** When `sessions.warmSession !== null`, a single `<List.Section title="Resume">` with one row renders at the top. Row title: warm session's question (truncated to 60 chars + ellipsis). Accessory: `<relative time> · <agent> · <N> calls`.
- **AC1.2** Below Resume: `<List.Section title="Open loops · Today">` from existing `useClusters()`, behavior preserved from current echo.tsx.
- **AC1.3** Below Open loops: `<List.Section title="Today's sessions">` listing all sessions whose `startedAt` is within the founder's local-day window (PDT). Each row: **agent-kind icon** (color-coded by `session.agentKind`: claude→Icon.Stars/orange, codex→Icon.Terminal/purple, custom→Icon.Dot/grey — per r4 codex F3, the source-app palette from search results does NOT apply because sessions have an `agentKind` field but no derivable `sourceApp`), question title, accessory `HH:MM · agent · N calls`.
- **AC1.4** Below Today's sessions: `<List.Section title="Yesterday">` and `<List.Section title="This week">` with the same row shape. Sessions older than 7 days are NOT surfaced in EmptyState (browse via ⌘S → SessionsList).
- **AC1.5** Empty corpus: when `sessions.length === 0`, EmptyState shows only Open loops · Today, then a placeholder row "Your first ask becomes a session." with no actions.

### AC2: State 2 (Typing) elevates the Ask row
- **AC2.1** When `query.length > 0`, the first row of the result list is `<List.Item title="Ask ECHO about \"<query>\"" />` with `Color.OrangeRed` accessory icon + `subtitle="codex · ↩"` (or current agentKind).
- **AC2.2** Below the Ask row: matching atoms (from `useMatches(query)`) and matching clusters (from `useClusters` with substring filter), behavior preserved from current echo.tsx.
- **AC2.3** Pressing ↩ on the Ask row pushes AnswerView with the typed query. The synthetic row is not present in EmptyState.

### AC3: State 3 (Live) shows per-call audit detail
- **AC3.1** AnswerView while `isLoading === true` renders Raycast `Detail.Metadata` with an `<AuditTimeline calls={auditCalls} mode="live" />` block.
- **AC3.2** Each AuditTimeline row renders: `timestamp` (HH:MM:SS · `(+N.Ns)` relative), `tool` (color-coded), `args_shape` (compact one-line), `result_shape` (compact one-line), and `top_source` (derived from result_shape where the tool's contract includes source_breakdown; omitted otherwise).
- **AC3.3** Currently-running call (status="pending" in the daemon's ring buffer) renders with a "running" pill + elapsed seconds, no `result_shape`.
- **AC3.4** When `/mcp/recent-calls` fetch errors, AuditTimeline degrades to a single row "Audit unavailable — daemon at <host>:<port> not reachable" with `Color.Red`. The answer stream is unaffected.
- **AC3.5** AuditTimeline does NOT fetch any data the daemon doesn't already serve. If the daemon's `result_shape` is too coarse for `top_source` derivation, the row simply omits that line. No daemon-side changes are in scope.
- **AC3.6** AuditTimeline's `auditCalls` is the `[startedAt, until=now-on-poll-or-completedAt-on-done]` time-slice of the daemon's PROCESS-GLOBAL `/mcp/recent-calls` ring buffer (r1 codex-ops F2). The daemon's request-log filters by time/status only (see `src/mcp/request-log.ts:105-112`, `src/mcp/server.ts:135-147`); concurrent MCP calls from other surfaces DURING the same window (parallel Claude Code sessions, Cursor MCP clients, coord ticks, `tools/tail-mcp.sh` polling, the watcher's own pulls) WILL be included in this session's `auditCalls`. This is a known V1.6 limitation — see Risk #6. NO client-side run-correlation lock is in scope for V1.6; AC9.4 gates the dogfooding-driven decision on whether to file a daemon-side `correlation_id` follow-up. UI text in SessionDetail should hint at this: "Audit window may include unrelated MCP calls from concurrent surfaces."

### AC4: State 4 (SessionDetail) is the load-bearing screen
- **AC4.1** Full answer renders verbatim from `session.answer`.
- **AC4.2** Metadata sidebar (Raycast `Detail.Metadata`) shows: **Run** (agent, model where derivable, MCP-call count, duration, status), **Evidence used** (source-breakdown chips — BEST-EFFORT; omitted when not derivable from current `/mcp/recent-calls` result_shape per r1 codex F2), **Sources** (top-5 source paths or commit SHAs — BEST-EFFORT; omitted when not derivable, since the daemon's current request-log projects counts and content-lengths only, NOT source paths / SHAs / atom IDs / source_breakdown — see OoS #9 for the daemon-enhancement follow-up), **Subprocess log** — see fallback rules below. If `subprocessLogPath === null` (log creation failed at startAgent time), render the metadata row "Log unavailable — agent-runner emitted no path" and OMIT the `[Open]` / `[Tail]` actions from the ActionPanel. If `subprocessLogPath !== null`, attempt `fs.statSync(subprocessLogPath)`; on success, render `path + bytes + [Open]` (`Action.Open`) + `[Tail]` (push a Detail view streaming the tail). On `fs.statSync` failure (per r2 codex-ops F3: ENOENT / EACCES / EPERM / EIO from user cleanup, permission changes, stale LocalStorage rows pointing at logs that no longer exist), render the metadata row "Log unavailable at `<path>` — `<error.code>`" (path preserved for diagnostics) and OMIT the `[Open]` / `[Tail]` actions. **Per r3 codex F2: Raycast `Action` / `Action.Open` does not expose a `disabled` / `isDisabled` prop, so the r2 "render disabled actions" pattern was unimplementable; this r3 patch simplifies to OMIT the actions when the log isn't openable — the metadata row already communicates the unavailability to the user.** Calling `fs.statSync` MUST be wrapped in try/catch at the SessionDetail render path; an uncaught throw must not take down the detail view or the parent SessionsList. Test (AC8.9): SessionDetail renders the fallback string for both `null` path AND a non-null path that doesn't exist; the `[Open]` / `[Tail]` actions are absent from the ActionPanel; the row is still navigable from SessionsList; no render throw.
- **AC4.3** Audit timeline renders below the answer with `mode="completed"` styling (no live polling).
- **AC4.4** Action panel primary actions: ↩ Open in Cursor, ⌘1 Send to Claude.ai, ⌘2 Send to ChatGPT, ⌘C Copy packet, ⌘R Ask again from this, ⌘N New ask, ⌘O Open log.
- **AC4.5** ⌘R "Ask again from this" pushes the user back to **TypingState** (NOT AnswerView — clarified per r2 codex F2) with the search bar prefilled with the source question text and a banner header `"Forking from session <HH:MM PDT> — add your follow-up below and press ↩ to ask"`. The synthetic Ask ECHO row is the primary action, exactly as in normal State 2. On ↩, AnswerView is pushed with a composed prompt of the form:
  ```
  Continuing from "<source question>" (asked <HH:MM PDT>). Previous answer:

  <source answer body>

  Follow-up:
  <user's typed text from TypingState's search bar, with the prefix "<source question>" stripped if present>
  ```
  The source session is NOT modified. A NEW session row is created in `recordSessionStart` at ↩-time (NOT at ⌘R-time) with `status="running"`, `forkedFrom: <source_id>`, and the composed prompt as the row's `question`. **No session row is created in LocalStorage when the user just presses ⌘R; the row appears only when the user actually submits the follow-up.** Test (AC8.3 + AC8.8): pressing ⌘R from SessionDetail navigates to TypingState with prefilled text but does NOT create a new sessions row; pressing ↩ on the synthetic Ask row creates the row with `forkedFrom` set; cancelling out of TypingState (Esc) creates no row.

### AC5: State 5 (SessionsList) is reachable + filterable
- **AC5.1** ⌘S from any state pushes SessionsList.
- **AC5.2** Sessions grouped by day: Today / Yesterday / This week (Mon–today) / Older. Day buckets are PDT-anchored.
- **AC5.3** List.Dropdown filter with options: all · claude · codex · custom (matching distinct agentKind values present in the corpus).
- **AC5.4** Each row's ActionPanel: ↩ Open (push SessionDetail), ⌘R Ask again from this (fork — same as AC4.5), ⌘D Delete (with `Action.Confirmation`), ⌘F Filter. **Delete is conditionally available (r6 codex-ops F2):** for rows with `status="running"`, the ⌘D Delete action is OMITTED from the ActionPanel. This closes the same-row race vector identified in r6: a live AnswerView is still writing to `echo.sessions.v1.row.<id>` via debounced + final-flush updates; allowing a parallel SessionsList Delete on that same row would either (a) silently resurrect the row when the next write lands (mergeRowAndWrite on a missing key behaves as create), OR (b) violate Risk #7's "no same-id concurrent writers" invariant. The user MUST cancel the run via ⌘. in AnswerView before the row becomes deletable. Test (AC8.13): SessionsList row with `status="running"` does not include the ⌘D Delete action; the same row with `status="done"|"cancelled"|"errored"|"historical"` DOES include ⌘D.

### AC6: Sessions persistence
- **AC6.1** `useSessions()` reads via `LocalStorage.allItems()` and filters by the `echo.sessions.v1.row.` key prefix (see AC6.7 per-row storage layout, r4 founder resolution). On first read AFTER a sentinel `echo.sessions.v1.migrated` key is absent, runs the **two-stage one-time migration** (idempotent — the sentinel guards re-runs):
  1. **Legacy single-key migration (if `echo.sessions.v1` exists from a hypothetical r1–r3 build):** read the legacy array, write each row to its own `echo.sessions.v1.row.<id>` key, then `removeItem(echo.sessions.v1)`. In practice this branch is dead code because the spec ships from r4-resolved; included as a defensive no-op.
  2. **recent-asks migration:** read `echo.recent-asks` (current shape: `{ id: string; question: string; launchedTo: LaunchTargetId; at: string }` per `tools/raycast-echo/src/lib/recent-asks.ts:12-17`). For each entry, write a row at `echo.sessions.v1.row.<id>` with the **full Session shape** populated by these defaults (r4 codex F2):
     - `id`: from the legacy `id` field (verbatim — the makeId format is `${Date.now()}-${random}` which collides with neither the new ses_-prefixed ids nor each other)
     - `question`: verbatim
     - `agentKind`: derived from `launchedTo` via the mapping `{ "claude_app" | "claude_web" → "claude", "cursor" → "claude" (Cursor's primary agent is Claude — not codex), "chatgpt" → "claude" (no codex/chatgpt entries are expected; default to "claude" since recent-asks predates the codex agent), "copy" → "claude" }`. The fallback for any unknown value is `"claude"` (the default for V1.6 single-user dogfooding).
     - `startedAt`: from the legacy `at` field
     - `completedAt`: `at` (assume historical asks completed)
     - `status`: `"historical"`
     - `answer`: `""` (no body preserved)
     - `auditCalls`: `[]`
     - `subprocessLogPath`: `null` (no log preserved)
     - `sourceBreakdown`: `{}` 
     - `evidenceClusters`: `[]`
     - `forkedFrom`: `null`
  3. Write `echo.recent-asks.backup` containing the original JSON verbatim (per Risk #4 defensive backup); then `removeItem(echo.recent-asks)`; then `setItem(echo.sessions.v1.migrated, new Date().toISOString())`.
  Idempotent: second invocation sees the `echo.sessions.v1.migrated` sentinel and exits without touching any keys. AC8.1 + AC8.11 (new) test both the mapping AND the idempotency.
- **AC6.2** `recordSessionStart` writes a new row with `status="running"` IMMEDIATELY AFTER `startAgent()` returns (so the synchronously-returned `sessionLogPath` is available on the row) and BEFORE the next React tick has a chance to render. The async spawn-failure path (process error event from `runner.events`) transitions the row to `status="errored"` via `recordSessionEnd` with the error message stored in `answer`. Pre-`startAgent` row creation was considered and rejected in r2 (codex F3): it would require splitting `startAgent` into `prepare → start` with externally-allocated `sessionId` + `sessionLogPath`, a deeper agent-runner refactor than this spec's project_v15_cleanup intent. The post-return ordering is safe because `startAgent` allocates + opens the log synchronously before it returns (the spawn itself is also synchronous in current code; only stdout/stderr events are async). Test (AC8.7): a row exists in LocalStorage with `status="running"` and non-null `sessionLogPath` within one microtask after `startAgent` returns; on async spawn-error event, the same row transitions to `status="errored"`.
- **AC6.3** `recordSessionUpdate` is called via debounced flush (existing 80ms FLUSH_INTERVAL_MS) and writes the current answer + auditCalls to the row via `mergeRowAndWrite(id, { answer, auditCalls })`. Field-scoped (cannot touch lifecycle fields per AC6.7).
- **AC6.4** `recordSessionEnd` is called on subprocess exit (clean, cancelled, or errored). **Final-flush ordering with AWAITED async semantics (r5 codex-ops F1; r6 codex F2 + codex-ops F1; r7 codex F1 + codex-ops F1 convergent; r8 founder resolution: per-id chain is the load-bearing primitive, explicit drain is defense-in-depth):** the runner's exit handler MUST execute these steps IN ORDER, with each step's `await` load-bearing:
  1. Cancel any pending debounced flush TIMER (so a NOT-YET-FIRED debounced write cannot race past the end-write). Note: this does NOT drain an already-fired debounced `recordSessionUpdate` whose async `mergeRowAndWrite` is still in its `getItem → merge → setItem` sequence — the AC6.7 per-id Promise chain handles that case (see below).
  2. **`await drainInflightWrites(id)`** (defense-in-depth) — explicitly await any in-flight `mergeRowAndWrite` for this session id. Implementation: `await (inflight[id] ?? Promise.resolve())`. **Note (r8 founder resolution, divergent severity-only on AC8.12(d)):** this step is NOT load-bearing for runtime correctness — the AC6.7 per-id Promise chain ALREADY serializes step-3's `recordSessionUpdate` behind any in-flight write by construction. The explicit drain exists as a readability checkpoint that says out loud "we know there might be an in-flight write; we are deliberately waiting for it." Both r8 reviewers convergent: omitting this line and relying purely on the chain produces correct runtime behavior. Builders MUST still include the line for code clarity, but the test (AC8.12(d)) catches per-id-chain absence, not drain-call absence.
  3. `await recordSessionUpdate(id, { answer: finalAnswer, auditCalls: finalAuditCalls })` — guarantees the row contains the FINAL answer body + FINAL auditCalls slice. The mid-run debounced writes may have lagged the actual subprocess output by up to 80ms; this final flush closes that gap. `recordSessionUpdate` returns `Promise<void>`; the await is load-bearing. The AC6.7 per-id chain ensures this write is appended AFTER any in-flight stale write completes.
  4. `await recordSessionEnd(id, { completedAt, status, sourceBreakdown, evidenceClusters })` — writes lifecycle + derived audit fields via `mergeRowAndWrite`. Returns `Promise<void>`; the await ensures the terminal write lands AFTER step 3's final answer write.
  After step 4 resolves, the row is terminal. **Type signatures (r6 codex F2):** `recordSessionUpdate`, `recordSessionEnd`, `mergeRowAndWrite`, `drainInflightWrites` MUST all return `Promise<void>`; the exit handler MUST be `async` and use `await` for each step; non-awaited fire-and-forget calls FAIL typecheck. **Load-bearing primitive:** AC6.7's per-id `inflight[id]` Promise chain (NOT this AC's step 2 drain) is the actual concurrency primitive that prevents the stale-debounce race. AC8.12(d) tests the CHAIN — without a per-id chain a builder fails the test; with the chain (drain or no drain) a builder passes.
- **AC6.5** Cap: MAX_SESSIONS=100. Eviction priority: `status="historical"` first, then oldest `startedAt`. Never evict: any `status="running"` row, OR the single most-recent `status="done"` row (the derived warm session — NOT a status value).
- **AC6.6** Startup reconciliation (r1 codex-ops F3): on `useSessions()` first read AFTER the AC6.1 migration, scan all rows with `status="running"`. For each row, transition to `status="cancelled"` with `completedAt = new Date().toISOString()` and the sentinel `answer` suffix `"\n\n[session reconciled at startup — Raycast extension was closed before completion]"` WHEN AND ONLY WHEN `Date.now() - new Date(startedAt).getTime() > MAX_RUNTIME_MS` (default `MAX_RUNTIME_MS = 300_000` ms = 5 min — matches `agent-runner.ts`'s existing subprocess ceiling). Reconciliation is idempotent (already-cancelled rows are skipped). The log-mtime predicate originally proposed in r1 was DROPPED in r2 (codex F1 + codex-ops F2 convergent): a valid model call can be silent for >60s under the 5-min ceiling (sleep/wake, extension reload, quiet headless agent), and `fs.statSync` throws on missing logs — both produce false-cancellations that hurt the load-bearing "session is durable" property. The 5-min ceiling alone is sufficient: a row older than MAX_RUNTIME_MS cannot have a live subprocess (agent-runner kills its own children at that ceiling), so reconciliation is safe; rows younger than MAX_RUNTIME_MS are left untouched even if silent. Prevents immortal `running` rows from bypassing MAX_SESSIONS eviction.
- **AC6.7** Per-row LocalStorage keys + Partial-patch contract (r2 codex-ops F1; tightened r3 per codex F1 + codex-ops F1/F2; **r4 founder resolution: hybrid (c) — per-row keys for cross-process safety + narrowed claim in Risk #7**):
  - **Storage layout — per-row keys, NOT a single array** (r4 resolution): each session row is stored under its own LocalStorage key `echo.sessions.v1.row.<id>`. The session list is derived at read time via `LocalStorage.allItems()` → filter keys matching `echo.sessions.v1.row.*` → parse each value → sort by `startedAt`. This eliminates the single-key read-merge-write race that both r4 reviewers identified: one process touching its own session key cannot clobber an unrelated session row owned by another process. A legacy `echo.sessions.v1` array key may exist from the r1–r3 design; AC6.1 migration handles it (see AC6.1 patch).
  - **Index rebuild:** `LocalStorage.allItems()` returns all extension keys as a `Record<string, string>`. The helper `listSessions()` filters keys by the `echo.sessions.v1.row.` prefix, parses each value as `Session`, sorts by `startedAt` descending, and returns the array. The "warm" derived selector picks the first row with `status="done"` from that list.
  - **All record* helpers take `Partial<Session>` patches scoped to their specific field set, NOT full Session-shape overrides** (preserves the r3 lifecycle-regression fix):
    - `recordSessionStart(initial: Session)` — `LocalStorage.setItem(\`echo.sessions.v1.row.${initial.id}\`, JSON.stringify(initial))`. This is the only full-row write.
    - `recordSessionUpdate(id, { answer, auditCalls })` — `mergeRowAndWrite(id, { answer, auditCalls })` — read the per-row key, patch ONLY these two fields, write back. Cannot touch lifecycle fields.
    - `recordSessionEnd(id, { completedAt, status, sourceBreakdown, evidenceClusters })` — `mergeRowAndWrite(id, { ... })` — patches lifecycle + derived audit fields.
  - **Monotonic status precedence:** if the existing per-row value's `status` is in `{done, errored, cancelled, historical}` (terminal states), any subsequent write that would set `status` to `running` is dropped. `mergeRowAndWrite` inspects the EXISTING row's status before applying.
  - **auditCalls merge by client-side composite key** `(ts, tool, args_shape)` — NOT by call `id`, because the daemon's public `/mcp/recent-calls` payload strips the internal `id` (see `src/mcp/request-log.ts:120-128` `publicClone()`; `tools/raycast-echo/src/lib/audit.ts:3-10` type) and OoS #4 forbids amending the daemon contract. **Pending → terminal transition is a row UPDATE under the composite key** (not a row ADD); the merge selects the row with higher `status` precedence (terminal > pending; tie-break by max `duration_ms`).
  - **Eviction (AC6.5):** runs at the end of any record* helper. Reads the full session list via `listSessions()`, computes which rows to evict (per AC6.5), and calls `LocalStorage.removeItem(\`echo.sessions.v1.row.${id}\`)` for each evicted row. No array re-serialization needed.
  - **Implementation:** `mergeRowAndWrite(id, patch)` is the single merge helper used by `recordSessionUpdate` + `recordSessionEnd`. It reads ONLY the per-row key, applies the field-scoped + monotonic-status-checked + auditCalls-composite-keyed patch, and writes back to ONLY that key. No reading or writing of unrelated rows.
  - **Per-id write serialization (r7 codex F1 + codex-ops F1 convergent):** `mergeRowAndWrite` MUST serialize concurrent calls for the SAME `id` via a per-id `Promise` chain. Each call appends to `inflight[id] = (inflight[id] ?? Promise.resolve()).then(() => doMergeRowAndWrite(id, patch))` and returns the appended promise. This prevents the in-flight-debounce race: a debounced `recordSessionUpdate` that already started its async LocalStorage `getItem → merge → setItem` sequence will complete BEFORE the next caller's `getItem` runs, even if the next caller's `await` lands microseconds later. The earlier in-flight write resolves first; the later write reads the row AFTER the earlier write committed. No timer-cancellation can drain an already-started in-flight `mergeRowAndWrite`; only this Promise-chain serialization can. AC8.12(d) (new) covers the in-flight stale-debounce race explicitly.
  - **Cross-process safety claim — narrowed (r4 founder resolution):** two overlapping Raycast extension processes each generate their own session `id` at `recordSessionStart` time, so they each write to distinct per-row keys (`echo.sessions.v1.row.<idA>` vs `echo.sessions.v1.row.<idB>`) and cannot lose each other's unrelated rows — the original codex-ops r2 F1 race is closed. The remaining theoretical race vector — TWO writers updating the SAME row's key concurrently — does NOT exist by construction because each `recordSessionStart` allocates a fresh `id` owned exclusively by one writer. **Acknowledged limitation (Risk #7):** the spec does NOT claim ACID semantics; if a future refactor ever has two writers race on the SAME `id` (e.g. background sync rewriting a historical row), the last writer wins. We accept that as out-of-scope for V1.6.

### AC7: Component split reduces echo.tsx to ≤400 lines
- **AC7.1** Post-refactor, `wc -l tools/raycast-echo/src/echo.tsx` returns ≤400.
- **AC7.2** Per-component files target sizes: AnswerView ≤300, SessionDetail ≤250, SessionsList ≤150, EmptyState ≤120, TypingState ≤120, AuditTimeline ≤120.
- **AC7.3** `npx tsc --noEmit` clean; `npx ray build` clean; existing tests pass.

### AC8: Tests cover the new persistence + UI surfaces
- **AC8.1** `test/sessions.test.ts`: 9 tests minimum — write-read roundtrip, migration from recent-asks (idempotent on second read), MAX_SESSIONS eviction, status transitions (running → done, running → errored, running → cancelled), warm-session derived selector returns most-recent done, eviction protection for warm-session derived selector, fork creates new row with `forkedFrom`, fork does not mutate source.
- **AC8.2** `test/audit-timeline.test.tsx`: 4 tests minimum — live mode render with pending row, completed mode render, errored daemon render, empty audit array.
- **AC8.3** `test/session-detail.test.tsx`: 3 tests minimum — full render with all sidebar fields populated (including the `subprocessLogPath === null` fallback string per AC4.2), action panel surfaces all primary actions (↩ Open in Cursor · ⌘1 · ⌘2 · ⌘C · ⌘R · ⌘N · ⌘O), action panel correctly OMITS the `[Open]`/`[Tail]` actions when log is unavailable (per AC4.2 r3 patch). **Note (r3 codex F3 fix):** the fork action's "writes new session" assertion is OWNED BY AC8.8 (deferred fork flow); AC8.3 does NOT make timing assertions about row creation under ⌘R.
- **AC8.4** Total project test count: ≥67 (current 32 + at least 35 new across AC8.1–AC8.13; r7 added AC8.12(d) in-flight-drain test).
- **AC8.5** `test/agent-runner.test.ts` (extend existing): two overlapping `startAgent` calls return distinct non-null `sessionLogPath` values pointing to different files; closing one runner does NOT affect the other's `sessionLogPath`. Closes r1 codex-ops F1's "tests two overlapping runs storing distinct paths" requirement.
- **AC8.6** `test/sessions.test.ts` (additional, AC6.6-specific, post-r2-drop): 3 tests minimum — stale `running` row (startedAt > MAX_RUNTIME_MS) is reconciled to `cancelled` on first read; non-stale `running` row with OLD log mtime (would have triggered the dropped predicate) is LEFT UNTOUCHED (regression guard against re-adding the unsafe mtime branch); second read after reconciliation is a no-op (idempotent).
- **AC8.7** `test/sessions.test.ts` (additional, AC6.2-specific): 2 tests minimum — a session row exists in LocalStorage with `status="running"` and non-null `sessionLogPath` within one microtask after `startAgent` returns; on async spawn-error event, the same row transitions to `status="errored"`.
- **AC8.8** `test/session-detail.test.tsx` (additional, AC4.5-specific): 2 tests minimum — pressing ⌘R from SessionDetail navigates to TypingState with prefilled question text AND does NOT create a new sessions row; pressing ↩ on the synthetic Ask row in the forked TypingState creates a new row with `forkedFrom=<source_id>`; cancelling out of TypingState (Esc) creates no row.
- **AC8.9** `test/session-detail.test.tsx` (additional, AC4.2-specific log-stat fallback, r3-patched): 2 tests minimum — SessionDetail with non-null `subprocessLogPath` pointing at a non-existent file renders "Log unavailable at &lt;path&gt; — ENOENT" AND the `[Open]`/`[Tail]` actions are ABSENT from the ActionPanel (NOT disabled-but-visible — that pattern is unimplementable in Raycast per r3 codex F2); the same row is navigable from SessionsList (no render throw); the path is preserved verbatim in the rendered metadata text.
- **AC8.10** `test/sessions.test.ts` (additional, AC6.7 merge contract, r3-tightened + r4-resolved): 5 tests minimum:
  - **(a)** Two `recordSessionUpdate` calls against DIFFERENT session ids both preserve their target rows after merge (per-row-keys safety — closes r4 codex/codex-ops shared finding on cross-process row loss).
  - **(b)** auditCalls composite-key merge: a `pending` call with `(ts=T, tool=find_clusters, args_shape=X)` followed by an `ok` call with the same composite key UPDATES the row in-place (does NOT add a duplicate); the resulting row has `status="ok"` (terminal > pending precedence).
  - **(c)** Monotonic status precedence: a queued late `recordSessionUpdate({answer, auditCalls})` landing AFTER `recordSessionEnd({status: "done", ...})` does NOT regress the session row back to `status="running"` — the merge helper drops any update that would set `status` to a non-terminal value when the existing row's status is already terminal. (Closes r3 codex-ops F2.)
  - **(d)** Partial-patch scoping: a `recordSessionUpdate` payload that accidentally includes a `status: "running"` field is dropped by the merge helper because update is field-scoped to `{answer, auditCalls}` only — the test asserts the existing row's terminal status survives unchanged.
  - **(e)** Per-row-keys layout (r4 resolution): asserting `LocalStorage.allItems()` returns `echo.sessions.v1.row.<idA>` AND `echo.sessions.v1.row.<idB>` as distinct keys after two `recordSessionStart` calls; eviction (AC6.5) `removeItem`s the legacy-cap-exceeding row's per-row key and leaves all others intact.
- **AC8.11** `test/sessions.test.ts` (additional, AC6.1 migration shape, r4 codex F2 fix): 3 tests minimum — recent-asks migration produces a full Session row with the documented `launchedTo → agentKind` mapping (claude_app/claude_web/cursor/chatgpt/copy all map to `"claude"`); the `echo.recent-asks.backup` key is present after migration with the original JSON verbatim; the `echo.sessions.v1.migrated` sentinel exists; a second invocation is a no-op (sentinel guards re-run).
- **AC8.12** `test/sessions.test.ts` (additional, AC6.4 final-flush ordering, r5 codex-ops F1 fix + r6 codex F2/codex-ops F1 async semantics + r7 codex F1/codex-ops F1 in-flight chain + r8 founder resolution: claim narrowed to per-id chain): 4 tests minimum — (a) a simulated subprocess that emits final stdout + final audit poll and exits within 20ms (well under the 80ms FLUSH_INTERVAL_MS) results in a row with `status="done"` AND `answer` equal to the FULL final body AND `auditCalls` equal to the FULL final slice (no truncation). (b) a subprocess that completes at exactly the 80ms boundary (debounce timer fires concurrently with exit handler) still produces a single terminal row (no duplicate write, no lifecycle regression). (c) **DELAYED-ASYNC LocalStorage mock (r6 codex/codex-ops convergent):** all setItem promises resolve on the next macrotask (NOT synchronously). The exit handler's `await recordSessionUpdate(...)` MUST resolve before `await recordSessionEnd(...)` is issued; if a builder fires-and-forgets either call, the test detects the violation (terminal status writes interleave with the final answer write, leaving a truncated body or `status` set before the final answer). The test instrumentation captures setItem call ordering and asserts the final-update setItem completed BEFORE the terminal-end setItem began. (d) **IN-FLIGHT STALE DEBOUNCE — per-id chain test (r7 codex/codex-ops convergent; narrowed per r8 founder resolution):** start a `recordSessionUpdate(id, { answer: "stale-mid-run", auditCalls: [...mid-run...] })` whose `getItem` resolves immediately but whose `setItem` is held open for 50ms (via the delayed-async mock); BEFORE that setItem resolves, the test triggers the exit handler. With the AC6.7 per-id Promise chain in place, the stale setItem completes BEFORE the exit handler's writes begin (the chain appends behind the in-flight write); without the chain, the stale setItem resolves last and corrupts the row. The test asserts: final row has `answer = finalAnswer` (NOT "stale-mid-run") AND `status="done"`. **What this test actually catches (r8 founder resolution):** a builder implementation WITHOUT the AC6.7 per-id `inflight[id]` chain WILL FAIL this test (runtime corruption). A builder that omits ONLY the explicit AC6.4 step-2 `drainInflightWrites(id)` line but keeps the chain will pass — because the chain already serializes correctly. The test name "in-flight stale debounce — per-id chain" reflects this: it proves the chain works at runtime; the explicit drain in AC6.4 step 2 is documented as defense-in-depth / readability and is NOT separately falsifiable by this test. (Both r8 reviewers converged on this clarification; codex+codex-ops both noted the prior wording overclaimed; founder resolution adopts the agreed test-contract scope.)
- **AC8.13** `test/session-detail.test.tsx` + `test/sessions-list.test.tsx` (additional, AC5.4 delete-on-running fix, r6 codex-ops F2): 2 tests minimum — SessionsList row with `status="running"` does NOT include the ⌘D Delete action in its ActionPanel; the same row with `status` in `{done, cancelled, errored, historical}` DOES include ⌘D. (The session-detail-side test is optional if SessionDetail does not expose Delete — the spec scopes ⌘D to SessionsList per AC5.4.)

### AC9: Dogfooding gate before retiring this spec
- **AC9.1** ≥10 journal entries in `raw/internal/dogfooding/mcp-interactions-journal-YYYY-MM.md` referencing the new five-state UX, across ≥3 distinct days.
- **AC9.2** ≥1 journal entry per pain (#1, #2, #3, #4) confirming the new UX addresses it OR clearly identifying a remaining gap.
- **AC9.3** README updated with the new UX walkthrough; the prior `recent-asks` mention is removed.
- **AC9.4** ≥1 journal entry explicitly addressing AC3.6 audit-contamination: either confirming concurrent-call contamination is invisible/acceptable in practice, OR providing a falsifiable example where contamination materially hurt the SessionDetail inspectability UX. If the latter, file a daemon-enhancement follow-up spec for run-correlation (e.g. `correlation_id` field in request-log + audit query filter). The follow-up is OUT of scope for this item.
- **AC9.5** ≥1 journal entry explicitly addressing the per-row-keys claim (Risk #7, r4 founder resolution): either confirming no cross-process session-row loss is observed across ≥3 deliberately-overlapping Ask ECHO runs, OR documenting a falsifiable case where two writers raced on the same `id` (a vector the spec claims is impossible by construction). If the latter, file a follow-up spec for a real CAS/version-retry primitive. The follow-up is OUT of scope for this item.

### AC10: Recent-asks deprecation
- **AC10.1** `src/lib/recent-asks.ts` deleted. All imports across echo.tsx + components updated to use sessions.ts.
- **AC10.2** Migration in AC6.1 preserves the last 3 historical asks as status="historical" sessions; no founder data lost.

## Out of scope (don't drift)

The following are EXPLICITLY rejected; an agent who finds itself building any of them should STOP and move the item to `pending_review/` with a drift-event note in `agent_notes`:

1. **Multi-turn chat threads** — A and B from the brainstorm. The fork mechanic (⌘R) is the only continuity affordance.
2. **Daemon-side conversation memory** — no chat state in the MCP server, no thread IDs, no server-side session store.
3. **Custom on-disk session format beyond LocalStorage + existing tee log files** — JSON in LocalStorage is the contract; tee log path is the existing contract from cca021b.
4. **New daemon endpoints OR run-correlation in the existing endpoint** — AuditTimeline consumes `/mcp/recent-calls` exactly as defined in item 062 AC5. If `result_shape` is insufficient for top-source derivation, the row degrades. The concurrent-call contamination (r1 codex-ops F2) is acknowledged in AC3.6 + Risk #6, NOT fixed here; do NOT amend the daemon contract in this spec. The daemon-side `correlation_id` follow-up is gated by AC9.4's dogfooding evidence.
5. **Browser-tab primary detection** — `detectPrimary()` desktop-app-only behavior is preserved.
6. **A persistent companion window outside Raycast** — rejected as a destination app.
7. **"Newline = ask, no newline = retrieve" magic** — the synthetic Ask row is the explicit primary action.
8. **Top-level tabs ("Search" / "Ask")** — preserves the split this surface is meant to dissolve.
9. **Daemon-side audit enhancement (top-source derivation, atom-ID-per-call surfacing)** — recognized as a real gap in `backlog/_followups.md` "Evidence-from-audit decoupling"; defer to a separate spec when dogfooding shows it's the bottleneck.
10. **Recent-asks compatibility shim or grace period** — the AC10.1 deletion is one-shot; the AC6.1 migration is one-shot. No backwards-compat layer.

## Risks

1. **Codex's diagnosis is wrong and the founder really does want chat.** If post-merge dogfooding shows the ⌘R fork mechanic is insufficient and the founder repeatedly asks for multi-turn within a session, this spec is the wrong answer. Mitigation: AC9 explicitly journals signal per-pain; if pain #4 isn't addressed by ⌘R, file a follow-up spec with the empirical evidence.
2. **AuditTimeline's per-call detail is too noisy.** The mockup shows 4 audit rows; a real run may produce 15+. Mitigation: collapse repeated calls of the same tool ("find_clusters ×3" with expandable detail); cap at MAX_AUDIT_ROWS=20 with "+N more" overflow.
3. **LocalStorage capacity.** 100 sessions × ~5KB each ≈ 500KB. Raycast LocalStorage has no documented hard cap; if dogfooding shows OOM, drop to MAX_SESSIONS=50 + truncate answer body to 8KB per row.
4. **Migration from recent-asks loses data.** The migration is one-shot. Mitigation: include a defensive backup-write to a `echo.recent-asks.backup` key before the delete; AC6.1 test asserts both the new key has the rows AND the backup key has the original JSON verbatim.
5. **`echo.tsx` ≤400 line target is hard.** Current 1069 lines; some shared helpers may resist extraction. Mitigation: if the AC7.1 target is missed by ≤50 lines, builder may negotiate to 450 in agent_notes; >450 is a hard reject.
6. **Audit contamination from concurrent MCP calls.** `/mcp/recent-calls?since=…&until=…` is a PROCESS-GLOBAL ring buffer; the `[startedAt, completedAt]` time-slice will include MCP calls from any other surface (parallel Claude Code, Cursor, `tools/tail-mcp.sh`, coord ticks) that lands in the same window. In single-user dogfooding the probability is low but real. AC3.6 acknowledges the limitation; AC9.4 gates the dogfooding-driven decision on whether to file a daemon-side `correlation_id` follow-up. Mitigation: client-side run-correlation (env-var-passed session ID + agent forwards as header) is rejected as out-of-scope (requires both daemon AND agent-binary changes — codex/claude are external CLIs we don't control). Acceptable for V1.6; NOT acceptable for V1.7+ unattended/production use.
7. **LocalStorage is not ACID.** Raycast's `LocalStorage.setItem` is async and not transactional. The per-row keys layout (AC6.7, r4 founder resolution) eliminates the cross-row race that the single-key contract had: two writers now touch DIFFERENT keys (`echo.sessions.v1.row.<idA>` vs `echo.sessions.v1.row.<idB>`) and cannot lose each other's unrelated rows. The remaining theoretical race — two writers updating the SAME row's key concurrently — does NOT exist by construction because each `recordSessionStart` allocates a fresh `id` owned exclusively by one writer. The spec explicitly DOES NOT claim ACID semantics; if a future refactor ever has two writers race on the same `id` (e.g. background sync rewriting a historical row from outside `useSessions`), the last writer wins. AC9.5 (new) gates the dogfooding decision on whether the per-row-keys claim holds in practice or surfaces an unexpected vector.

## After Completion (Strategist Notes)

When this item lands in `backlog/complete/`, the strategist should:

1. **Promote `wiki/surfaces/hotkey-overlay.md`** from `status: planned` to `status: shipped` (or `status: shipped (v1.6)` if a finer-grained marker is in use). Add a "Sessions as objects" section documenting the five states + the ⌘R fork mechanic + the explicit non-goals.
2. **Update `wiki/principles/compose-not-capture.md`** with the ⌘R fork mechanic as a worked example: how to give users continuity without becoming a destination. This is the canonical pattern other surfaces (browser extension, future hotkey overlays) should mirror.
3. **Cross-link `wiki/principles/context-as-moat.md`** to this item: the "never ship a chat UI" commitment was structurally enforced by codex's strategist consult + this spec's Out-of-Scope list.
4. **Consider a new principle page `wiki/principles/asks-as-objects.md`** if the sessions model proves load-bearing across other surfaces (browser extension, future overlay). Defer until ≥2 surfaces adopt the pattern.
5. **Update `docs/STATUS.md`** Raycast-surface row.
