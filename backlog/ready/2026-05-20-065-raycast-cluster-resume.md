---
id: 2026-05-20-065-raycast-cluster-resume
title: Raycast ECHO — cluster-click resume (broken object identity fix; default open prior session over re-asking)
status: ready
priority: HIGH
estimate: 1-1.5d
created: 2026-05-20
blocked_by: []
task_state_ref: 2026-05-20-065-raycast-cluster-resume
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - tools/raycast-echo/src/lib/sessions.ts  # AC1, AC6, AC8 — add optional `clusterId?: string` to Session shape + `recordSessionStart` payload; persist on every session that originated from a cluster click (cluster row → runAsk path) so the cluster_id ↔ session edge is durable. New ASYNC lookup: `findLatestSessionForCluster(clusterId: string, statuses?: ReadonlyArray<Session["status"]>): Promise<Session | null>` returning the most-recent session matching the cluster + status filter — Promise-returning because the existing session store is async LocalStorage (`listSessions()` awaits migration; r1 codex F1). Default statuses = `["running", "done"]` (excludes `errored` and `cancelled`; AC6 punts opening past failures as a separate UX). Storage shape is additive — existing sessions without `clusterId` continue to load and behave as today. **clusterId round-trip preservation (r1 codex-ops F4)**: `normalizeSession` MUST preserve `clusterId` through `mergeRowAndWrite`, `recordSessionUpdate`, and `recordSessionEnd`; without this, the first flush after `recordSessionStart` would silently erase the cluster edge. AC1's test contract awaits the helper AND drives the full lifecycle (start → update → end) before asserting the cluster_id is still discoverable.
  - tools/raycast-echo/src/echo.tsx  # AC1, AC2, AC3, AC4, AC5, AC7, AC8 — `runAsk` becomes `runAsk(question, { forkedFrom?, clusterId?, forceFreshAgent? })`; new helper `resumeOrAskForCluster(cluster: FindClustersCluster)` is the decision site for cluster-click default behavior. ClusterRow's primary action becomes "Open Prior Answer" when `findLatestSessionForCluster(cluster.cluster_id, ["running","done"])` resolves to non-null; otherwise stays "Ask ECHO about This Cluster". A new secondary action "Ask Again from This Cluster" (cmd-shift-r) ALWAYS starts a fresh agent run with the cluster_id stamped on the new session AND `forceFreshAgent: true`. The decision lookup is reactive — EchoContext threads a new `onSessionChanged` callback (calls `useSessions()` refresh) into AnswerView so that completing a fresh ask flips the same row's primary from "Ask" to "Open Prior" without a Raycast re-summon (r1 codex F3 + codex-ops F6).
  - tools/raycast-echo/src/components/EmptyState.tsx  # AC2 — ClusterRow's accessory chips gain an `Answered {relative_time}` chip when the latest session for the cluster has status `done`, OR a `Running` chip when status is `"running"` (both states honor the unified `["running","done"]` lookup contract). Gated on session presence — clusters with no prior session show no resume chip. Chip is to the LEFT of the existing recency chip so the visual scan reads `loop status · prior-answer state · recency`. Tooltip on the chip: `session.id` + completed_at (PDT) for done; `started_at` for running. Because the lookup is async, ClusterRow consumes the already-loaded `sessions` array from `useSessions()` (a synchronous derive) rather than calling the async helper during render — the helper is for AnswerView's async-mount-time lookup. Two read paths share the same disposition contract; both honor `["running","done"]`.
  - tools/raycast-echo/src/components/AnswerView.tsx  # AC1, AC4, AC7, AC8 — `AnswerViewProps` gains optional `clusterId?: string`, `forceFreshAgent?: boolean`, and `onSessionChanged?: () => void` (the refresh callback for the reactive row-flip contract, r1 codex F3 + codex-ops F6). When `clusterId` is present AND `forceFreshAgent` is not true AND `await findLatestSessionForCluster(clusterId, ["running","done"])` at MOUNT TIME returns a non-null session: AnswerView short-circuits. For `status: "done"` short-circuit: skip `startAgent`, skip `recordSessionStart`, set `answer` from persisted content, mark `isLoading=false`, render `_Replayed from session asked {relative_time}_` italics line above the answer body. For `status: "running"` short-circuit (r1 codex-ops F5): replay the buffered answer at mount but do NOT call `startAgent`; the banner reads `_Replayed from in-progress session started {relative_time} — current answer may continue to grow_`. Existing actions (Copy, Paste, etc.) work against the replayed content. A "Ask Again from This Cluster" action re-pushes AnswerView with the same `clusterId` AND `forceFreshAgent: true`. **Concurrency reservation (r1 codex-ops F7, AC8)**: when starting a fresh run, `recordSessionStart` MUST resolve to a persisted row in `status: "running"` BEFORE `startAgent(invocation)` is called. The await order is: cluster-lookup → (short-circuit OR continue) → recordSessionStart (awaits row write) → startAgent. This guarantees a near-simultaneous second open of the same cluster sees the running row from step 1's lookup and short-circuits, rather than spawning a duplicate agent. `onSessionChanged` is invoked AFTER `recordSessionStart` resolves AND AFTER `recordSessionEnd` resolves so parent list state observes both transitions.
  - tools/raycast-echo/src/components/SessionDetail.tsx  # AC4 — no behavior change; verified to be the same shape the AnswerView replay path renders so the two surfaces stay visually consistent. The replay path INSIDE AnswerView is deliberately chosen over `push(<SessionDetail/>)` because SessionDetail lacks the unified AnswerView actions (paste-to-frontmost, fork, etc.) that founders use post-resume. Strategist/PM both flagged "cluster click is a deep link into the sessions object model" — this implements it by giving AnswerView the dual-mode capability rather than splitting the rendering.
  - tools/raycast-echo/src/components/TypingState.tsx  # AC1, AC3 (r1 codex F2) — `ForkTypingState.onAsk` currently calls `onAsk(buildForkPrompt(source, value), source.id)` (positional forkedFrom). Update to options-shaped call site: `onAsk(buildForkPrompt(source, value), { forkedFrom: source.id, clusterId: source.clusterId })`. Forked sessions inherit the source session's `clusterId` when present so a fork off a Statellite cluster session is itself discoverable by Statellite-cluster lookup. No UI changes; the change is purely the options-shape threading through the existing fork flow.
  - tools/raycast-echo/test/sessions.test.ts  # AC1, AC6, AC8 — EXTEND. Cases: (a) `recordSessionStart({ clusterId })` persists; subsequent `await findLatestSessionForCluster` finds it; (b) returns the MOST-RECENT match when multiple sessions exist for the same cluster_id (newest by `startedAt`); (c) default status filter excludes `errored` and `cancelled` (filter is `["running","done"]`); (d) returns null when no session matches; (e) returns null when `clusterId` is undefined on the call (defensive); (f) the LocalStorage migration path: a session persisted in old shape (no `clusterId` field) loads cleanly without throwing and is correctly invisible to cluster lookup; **(g) full lifecycle round-trip (r1 codex-ops F4)**: start({ clusterId }) → recordSessionUpdate(answer="...") → recordSessionEnd({status: "done"}) → re-load via listSessions and assert `clusterId` is still present on the row, AND `findLatestSessionForCluster` still finds it. This proves `normalizeSession` preserves the field across every write path; without this assertion the bug regresses silently.
  - tools/raycast-echo/test/cluster-resume.test.tsx  # AC1, AC2, AC4, AC7, AC8 — NEW (or extend an existing component test if the maintainer prefers). Renders ClusterRow with mocked `useSessions()` returning {none, done-only, running-only, both} states; asserts (a) action panel primary string changes correctly per state (`Open Prior Answer` for done/running, `Ask ECHO about This Cluster` for none); (b) accessory chips include `Answered <time>` for done OR `Running` for running OR no chip for none; (c) "Ask Again from This Cluster" action is ALWAYS present regardless of prior session state. AnswerView tests: mount with `clusterId` pointing at (a) no session — startAgent is called exactly once after `recordSessionStart` resolves (AC8 ordering check); (b) done session — zero startAgent calls, replay banner rendered, answer text matches persisted; (c) running session — zero startAgent calls, running banner rendered. **Integration test for reactive row-flip (AC7)**: mount EchoContext, click ClusterRow with no prior session (primary = "Ask ECHO..."), wait for fresh agent run to complete via mocked agent-runner, observe `onSessionChanged` invoked, observe ClusterRow primary text re-renders to "Open Prior Answer" and `Answered <time>` chip appears WITHOUT a Raycast re-summon. **Concurrency test for AC8**: simulate two near-simultaneous calls to `resumeOrAskForCluster` for the same cluster; assert exactly one `startAgent` invocation happens (the second observes the running session from the first's recordSessionStart write).
spec_refs:
  - tools/raycast-echo/src/lib/sessions.ts  # current Session shape; recordSessionStart, recordSessionUpdate, recordSessionEnd entry points
  - tools/raycast-echo/src/echo.tsx  # runAsk + ClusterRow current shape (no clusterId threading today; ClusterRow only knows about the cluster, not whether a session exists for it)
  - tools/raycast-echo/src/components/AnswerView.tsx  # startup() unconditional startAgent at line 145; the load-bearing change site
  - tools/raycast-echo/src/components/EmptyState.tsx  # ClusterRow rendering + the existing accessory chips (loop chip + file chip + recency) added in prototype/raycast-cluster-density branch — note that branch is NOT merged; spec assumes only main shape but reviewers should verify the accessories array shape they're targeting
  - tools/raycast-echo/src/components/SessionDetail.tsx  # storage-replay surface; will not be modified but referenced for visual-consistency check
  - raw/internal/dogfooding/mcp-interactions-journal-2026-05.md  # 2026-05-20 19:46 PDT live-test entry + 2026-05-20 21:00–21:30 PDT prototype-iteration entries that frame the bug behaviorally (founder reported clicking a cluster row always triggers a fresh agent call even immediately after the prior session completed)
  - backlog/complete/2026-05-19-063-raycast-sessions-as-objects.md  # the predecessor spec that introduced sessions-as-objects; THIS spec closes the continuity regression where cluster-origin asks bypass the sessions object identity
  - wiki/principles/felt-not-seen.md  # the brand discipline the resume behavior must honor: surface disappears into the flow, no modal interrupting the 5-second hotkey-overlay glance
  - wiki/product/v1-spec.md  # V1 cohort (indie AI builders) + form-factor constraints driving the "no destination app" stance

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
agent_notes: |
---

# Why

**Bug founder observed during live dogfooding (2026-05-20 21:25 PDT):**

> "When I click into one [cluster row in Open loops · Today], it will start the live agent call. But if I exit, everything is gone. Even when the session is done I exit, go back, live call restarts."

Concretely: `echo.tsx:83 runAsk()` unconditionally pushes a fresh `<AnswerView>`, whose `startup()` at `AnswerView.tsx:145` unconditionally calls `startAgent(invocation)`. The session is persisted via `recordSessionUpdate` + `recordSessionEnd` (in `sessions.ts`), but there is no edge between "I just clicked the same cluster row I asked about earlier" and "show me the prior answer." A separate `SessionsList → SessionDetail` flow does storage-replay, but no path connects cluster-click to that storage.

## Brainstorm convergence (2026-05-20 21:25–21:35 PDT)

Two codex consults — one in the established **strategist** role, one in a freshly-prompted **senior PM** role (the latter as a vendor-agnostic role-creation experiment) — agreed on the core decision and diverged productively on scope.

**Convergence (V1 cut):**

- Default behavior on repeat cluster click: **resume the prior session, do not re-ask.**
- Escape hatch: an explicit `Ask Again from This Cluster` action — NOT a modal that interrupts the 5-second click.
- Running-session edge case (both flagged independently): if the prior session for the cluster is still `running`, attach to it; do not spawn a duplicate.
- Sessions architecture relationship: cluster click becomes a *deep link into the sessions object model*; the existing `SessionsList` stays as browse/history. Complementary, not redundant.
- Cost: defaulting to resume reduces API spend, not increases it.

**Productive divergence (informs V1 vs V1.5+ cut):**

- Strategist proposed `cluster_id + atom-fingerprint + generated-query` as the resume identity key, with fingerprint changes opening the old answer but making re-ask primary.
- PM proposed the simpler `cluster_id`-only lookup with explicit re-ask as the user-controlled escape hatch.
- **This spec ships the PM's simpler scope.** Atom-fingerprint freshness check is V1.5+ — fire only if dogfooding shows real staleness complaints. The PM's argument that informed the cut: *"silent staleness is the failure mode that would lose sleep — V1 must make age visible on the row and keep `Ask Again from This Cluster` one shortcut away. Resume should feel like opening a file, not like pretending computation happened."*

**Reframe both voices agreed on:** the bug is broken object identity, not missing cache. The fix isn't "add a cache lookup before startAgent"; it's "give the cluster row a stable session reference, then route accordingly."

## Brand principle anchoring

Per the strategist's closing principle: *"ECHO should remember just enough to avoid making the user repeat themselves, while making freshness and provenance visible only at the moment trust requires it."* The `Answered {relative_time}` accessory chip + the `_Replayed from session asked {time}_` italics-line ABOVE the replayed answer body are the "freshness visible only at the moment trust requires it" surface — no modal, no interrupt, just a small honest signal.

# What

AC1 through AC8 below (AC7+AC8 added in r1 disposition to address codex F3 + codex-ops F6 reactive-bridge, codex F2 fork-path, codex-ops F4 round-trip preservation, codex-ops F5 running-state unification, codex-ops F7 concurrency race). All AC verification phrased as user-observable behavior; the reviewer's job is to verify each AC has a discrete failure mode (the user can see when it broke) and a discrete test (the suite can prove it didn't regress).

## AC1 — Cluster-origin asks persist cluster_id on the session AND survive the full lifecycle

When a session is created via the cluster-click path (`ClusterRow → runAsk → AnswerView`), the persisted Session record (in LocalStorage via `recordSessionStart`) includes the originating `clusterId`. Typed-query asks (from the search-bar Ask action) do NOT persist a clusterId (none exists). The fork path inherits the source session's clusterId if present — forking off a Statellite cluster session produces a new session also tagged with that clusterId (the fork handoff lives in `TypingState.tsx::ForkTypingState`, which now threads `clusterId` into the options-shaped `onAsk` call).

**clusterId MUST round-trip through `normalizeSession` so it is preserved by `recordSessionUpdate` AND `recordSessionEnd`** — without this, the first answer flush after recordSessionStart silently erases the cluster edge and the resume bug regresses immediately on the user's next click. The test contract in `sessions.test.ts` case (g) drives start → update → end → reload and asserts clusterId is still discoverable.

**Verify:** open the LocalStorage shape after a cluster click → confirm `session.clusterId` is set; after a typed-query ask → confirm `session.clusterId` is `undefined`; after a fork → confirm child's clusterId equals source's. Run `sessions.test.ts` cases (a), (b), (e), (g).

## AC2 — ClusterRow primary action and chip reflect prior-session state (unified `["running","done"]` filter)

For a given cluster, the row state is determined by the latest session whose status is in `["running", "done"]` (the UNIFIED filter — same set at row, AnswerView, and AC5/AC8). When the latest session has `status: "done"`, ClusterRow's primary action is "Open Prior Answer" (icon: `Icon.Document`); the accessories array includes an `Answered {relative_time}` chip rendered to the LEFT of the recency chip. When the latest session has `status: "running"`, ClusterRow's primary action is also "Open Prior Answer" (NOT "Ask"; this prevents the duplicate-agent failure mode codex-ops F5 flagged) and the chip text is `Running` (no time). When no session matches the filter (none / only errored / only cancelled), the row shows no resume-state chip and the primary action is "Ask ECHO about This Cluster" exactly as today.

ClusterRow derives state synchronously from the already-loaded `useSessions()` array (NOT by calling the async `findLatestSessionForCluster` helper during render). The async helper is for AnswerView's mount-time lookup; ClusterRow's synchronous derive consumes the same data and applies the same `["running","done"]` filter.

**Verify:** the cluster-resume component test renders all four states (none / done-only / running-only / both — newest is the displayed one) and asserts the action-panel primary label + accessory chip presence/absence + chip text. **Critically**: the running-state test asserts the primary action label is "Open Prior Answer" — NOT "Ask ECHO about This Cluster" — closing codex-ops F5's gap.

## AC3 — Secondary "Ask Again from This Cluster" action is always present

ClusterRow's ActionPanel ALWAYS includes a secondary action "Ask Again from This Cluster" with shortcut cmd-shift-r — regardless of whether a prior session exists. Triggering it starts a NEW session linked to the same clusterId (does not mutate prior session). The shortcut choice intentionally aligns with the existing "Ask Again from This" pattern in `EmptyState.SessionRow` (cmd-r); cmd-shift-r is the cluster-row equivalent because the row already binds cmd-shift-return to paste-to-frontmost.

**Verify:** action label is present and bound regardless of state; firing it creates a new session row in `Today's sessions` with `clusterId` set; the prior session is unchanged (verify via `findLatestSessionForCluster` returning two sessions, newest first).

## AC4 — AnswerView short-circuits to replay when mounted with a running OR done session match

When AnswerView mounts with a `clusterId` prop AND `forceFreshAgent` is not true AND `await findLatestSessionForCluster(clusterId, ["running","done"])` returns a non-null session, AnswerView MUST short-circuit. The exact short-circuit behavior depends on the matched session's status:

**For `status: "done"`:**
- NOT call `startAgent`
- NOT call `recordSessionStart` (no new session created from a replay open)
- Render the persisted answer text in the same `Detail` markdown shape used for live runs
- Render a single italics line `_Replayed from session asked {relative_time}_` immediately above the answer body so the user can tell at a glance
- Keep ALL existing actions functional (Copy, Paste, Launch to Cursor/Claude, etc.) against the replayed answer text
- Add an "Ask Again from This Cluster" action to the ActionPanel that re-pushes AnswerView with the same `clusterId` and `forceFreshAgent: true` (which bypasses the short-circuit and starts a fresh agent run via AC8's reservation-order, persisting a new session)

**For `status: "running"`:**
- NOT call `startAgent` (V1 explicitly punts true live-attach — see OoS#3; the running short-circuit prevents the duplicate-agent failure mode)
- NOT call `recordSessionStart`
- Render the buffered answer at mount-time from the persisted session
- Render banner `_Replayed from in-progress session started {relative_time} — current answer may continue to grow_`
- Same action panel additions as the done case

When NO session matches OR `forceFreshAgent: true`, AnswerView proceeds with the fresh-agent path subject to AC8's reservation order.

**Verify:** the AnswerView portion of the cluster-resume component test mounts with clusterId pointing at three states (no session / done session / running session) and asserts (a) startAgent call count = 0 in the done+running cases, ≥1 in the no-session case; (b) replay banner rendered with the correct copy per status; (c) "Ask Again from This Cluster" action present in replay mode.

## AC5 — runAsk threading respects clusterId

`runAsk` in `echo.tsx` adds an options parameter `{ forkedFrom?: string | null; clusterId?: string; forceFreshAgent?: boolean }` (back-compatible — existing call sites pass nothing). The cluster-row click path (`onAsk={runAsk}` inside ClusterRow) MUST pass `clusterId: cluster.cluster_id` so AnswerView receives it. The "Ask Again from This Cluster" action also passes `clusterId` and additionally sets `forceFreshAgent: true` to prevent the same-mount replay short-circuit. The typed-query Ask path in `TypingState` MUST NOT pass `clusterId` (no cluster identity for free-form questions; bypassing this is what V1.5's fuzzy-match would address). The fork path (`TypingState::ForkTypingState`) DOES pass `clusterId` when the source session has one (codex F2).

**Verify:** code-read of every `runAsk(...)` call site; static check that `clusterId` is plumbed exactly where it should be, omitted elsewhere. Component test asserts the four call-site shapes (cluster click, ask-again, typed query, fork).

## AC6 — Storage migration is forward-only and lossless

Sessions persisted before this change (no `clusterId` field) MUST continue to load and render correctly. They will simply be invisible to `findLatestSessionForCluster` lookups (which is the correct behavior — there's no way to retroactively assign clusterId to old sessions). The migration path is purely additive: the new field is optional, no schema version bump, no separate migration code. Sessions persisted AFTER this change have `clusterId` when applicable.

**Verify:** `sessions.test.ts` case (f) — load a session record persisted without `clusterId` and confirm it parses cleanly, renders in `SessionsList` as it does today, and is correctly absent from cluster-keyed lookup.

## AC7 — Reactive row-flip after a fresh ask completes (no Raycast re-summon required)

When the user clicks a cluster row with no prior session, the primary action is "Ask ECHO about This Cluster". After the resulting agent run completes and `recordSessionEnd` resolves, the SAME mounted ClusterRow in the underlying EchoContext list MUST re-render with primary action "Open Prior Answer" and accessory chip `Answered {relative_time}` — without the user re-summoning Raycast. This requires an explicit refresh contract because EchoContext reads sessions through `useSessions()` while AnswerView writes them through imported module-level `recordSession*` functions; there is no implicit signal between them.

**The refresh contract:** AnswerView accepts an optional `onSessionChanged?: () => void` callback prop. EchoContext passes a callback that invokes `useSessions()` refresh logic (either an exposed `refresh()` method on the hook, or a state-bump that retriggers the migration/load effect). AnswerView calls `onSessionChanged()` (a) AFTER `recordSessionStart` resolves (so a row in `status: "running"` appears immediately for AC2's running-state chip + AC4's running short-circuit), and (b) AFTER `recordSessionEnd` resolves (so the row flips to `status: "done"` and the chip text updates).

**Verify:** integration-style component test in `cluster-resume.test.tsx` mounts EchoContext, clicks a no-session ClusterRow, lets the mocked agent-runner emit then exit, observes (a) `onSessionChanged` invoked at least twice (after start + after end), (b) the same ClusterRow's primary text changes from "Ask ECHO about This Cluster" to "Open Prior Answer" within the same mount lifecycle (no re-summon, no unmount-and-remount).

## AC8 — Concurrency reservation: `recordSessionStart` MUST resolve before `startAgent`

The fresh-agent flow MUST follow this strict await order inside `AnswerView::startup`:

1. `findLatestSessionForCluster(clusterId, ["running","done"])` — if returns non-null, short-circuit per AC4 (no startup state mutation beyond the replay banner).
2. If no short-circuit: `await recordSessionStart({ ..., clusterId })` — this MUST resolve to a persisted row in `status: "running"` BEFORE step 3.
3. `await onSessionChanged?.()` — fires AC7's refresh so concurrent observers see the running row immediately.
4. `startAgent(invocation)` — only NOW does the agent process spawn.

This ordering guarantees that a near-simultaneous SECOND open of the same cluster (e.g., quick double-click, two Raycast windows on the same hotkey) observes the running session from step 1's lookup and short-circuits via AC4 — instead of racing both to startAgent and spawning duplicate agent processes.

The pre-r1 startup order in `AnswerView.tsx:123-152` placed `startAgent` BEFORE `recordSessionStart` resolved. That ordering MUST flip per this AC; without the flip, a slow LocalStorage write opens a race window where the second click sees no running session and launches a duplicate agent (codex-ops F7).

**Verify:** concurrency test in `cluster-resume.test.tsx` — simulate two near-simultaneous `resumeOrAskForCluster` calls for the same cluster (e.g., two `await Promise.all([...])` invocations within the same tick). Assert exactly one `startAgent` invocation happens total. The second call's mount-time lookup observes the running row from the first call's `recordSessionStart` write and short-circuits per AC4.

# Out of Scope (Don't Drift)

The temptation surface here is wide. EXPLICITLY DO NOT do any of the following, even if "while we're in here" seems compelling:

1. **Fuzzy topic matching across renamed or split clusters.** If a cluster's atom set changes substantially between asks (new atoms join, cluster splits), V1 will simply not find the prior session — the user re-asks. Strategist proposed an atom-fingerprint check; PM punted it. **This spec ships the punt.** Add only after dogfooding shows repeated false negatives ("I asked this 10 minutes ago, why am I being asked again?"). Trigger condition for V1.5 work: 3+ journal entries calling out the miss.

2. **Multi-turn chat continuation inside SessionDetail or AnswerView.** Replay is a single-shot opening of a prior answer. Adding follow-up questions inside the replayed view turns this into a chat client, violating the explicit cut from 063 (sessions-as-objects, NOT a chat thread). Trigger condition for revisit: users repeatedly type follow-ups into Raycast and re-fork; we'd see that in the journal.

3. **True live-attach to a running agent's stdout stream.** When the prior session is `running`, AnswerView V1 replays the buffered answer at mount time but does not subscribe to the live agent's output stream. A second Raycast tab attaching to the same `child_process.stdout` is an IPC problem not in scope here. The replay banner sets expectations honestly (`current answer may continue to grow`). If the user wants live progression they back out and re-summon; the polling on the persisted answer field will catch it. Real live-attach is V1.5+ and probably requires a daemon-side session-stream proxy.

4. **Staleness scoring, automatic refresh suggestions, "this answer is X minutes old, re-ask?" prompts.** No proactive nudging in V1. The `Answered {time}` chip + `Ask Again from This Cluster` action are the user-controlled escape hatch. No modal. No banner. No countdown.

5. **Cluster-row interactions for non-Open-Loops contexts.** The chip + action changes apply to ClusterRow ANYWHERE it's rendered (it's a shared component) — but the spec does NOT touch how clusters appear inside the typed-query results (`TypingState`'s "Clusters" section). Reviewer should confirm the shared-component touch is correctly scoped.

6. **SessionDetail surface modification.** SessionDetail is referenced for visual-consistency check but explicitly NOT modified. The replay path lives inside AnswerView (which already has the full action panel — paste-to-frontmost, etc.) precisely to avoid SessionDetail growing the same action surface.

7. **Daemon-side conversation memory, session linking, or any backend change.** This is pure Raycast-extension work. LocalStorage shape is additive (new optional `clusterId` field). No MCP changes. No `find_clusters` modification. No daemon endpoint changes.

8. **Renaming or restructuring existing functions/files beyond what's strictly required by the AC.** This is a behavior-focused change; if a function name reads awkward after the AC1 plumbing, that's a separate spec.

9. **Backporting the prototype/raycast-cluster-density density chips, label fallback, or `showDetail` toggle from the throwaway branch.** Those are exploration; this spec is the production-quality resume fix. Reviewers SHOULD verify the spec's AC are testable against bare main, not against the prototype branch. The prototype branch may be merged separately or discarded.

10. **Errored/cancelled session "resume."** Default status filter on `findLatestSessionForCluster` is `["running", "done"]`. Opening past failures is a separate UX question (do you replay the partial answer? offer a "retry" button?). Spec sidesteps entirely — past errors don't surface in the cluster row, the user just re-asks via the default action which becomes "Ask ECHO" again when no done/running session exists.

# After Completion (Strategist Notes)

When this item lands in `backlog/complete/`, the strategist should consider promoting these decisions to:

- `wiki/surfaces/hotkey-overlay.md` (or `wiki/surfaces/raycast-extension.md` if it exists) — document the cluster-row resume behavior as part of the surface contract. Specifically: clusters are deep links into the sessions object model; same-cluster repeat clicks open prior answers; explicit "Ask Again" is the only path to a fresh agent run for an already-answered cluster.

- `wiki/principles/felt-not-seen.md` — append a concrete worked example. The Answered-chip + replay-banner-line approach is a textbook application of the principle (no modal, no interrupt, small honest signal) and should anchor future similar decisions.

- Cross-link from `wiki/surfaces/` whatever covers `SessionDetail` and `SessionsList` to clarify the boundary: those are browse/history; cluster click is the deep link into the same object model.

No new wiki folders required. Manifest update via `tools/wiki_index.py` as usual.

# Review queue routing

Reviewer roster: `["codex", "codex-ops"]` — two codex perspectives. Codex strategist already participated in the brainstorm that produced this spec, so the review is a check-the-spec-against-the-code pass rather than a re-litigation of the design. Codex-ops should focus on: storage migration safety (AC6), the running-session edge case (AC4 banner copy + lack of live-attach), and confirming the AC test coverage is sufficient to catch regressions on the storage-layer additive change.

Run loop until convergence (≤3 rounds typical for friction-fixes of this size; if rounds 1+2 surface no HIGH findings, r3 is the converge-check).
