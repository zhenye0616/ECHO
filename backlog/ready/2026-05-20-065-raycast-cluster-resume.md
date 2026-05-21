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
  - tools/raycast-echo/src/lib/sessions.ts  # AC1, AC6, AC8 — add optional `clusterId?: string` to Session shape + `recordSessionStart` payload; persist on every session that originated from a cluster click (cluster row → runAsk path) so the cluster_id ↔ session edge is durable. New ASYNC lookup: `findLatestSessionForCluster(clusterId: string, statuses?: ReadonlyArray<Session["status"]>): Promise<Session | null>` returning the most-recent session matching the cluster + status filter — Promise-returning because the existing session store is async LocalStorage (`listSessions()` awaits migration; r1 codex F1). Default statuses = `["running", "done"]` (excludes `errored` and `cancelled`; AC6 punts opening past failures as a separate UX). Storage shape is additive — existing sessions without `clusterId` continue to load and behave as today. **clusterId round-trip preservation (r1 codex-ops F4)**: `normalizeSession` MUST preserve `clusterId` through `mergeRowAndWrite`, `recordSessionUpdate`, and `recordSessionEnd`; without this, the first flush after `recordSessionStart` would silently erase the cluster edge. AC1's test contract awaits the helper AND drives the full lifecycle (start → update → end) before asserting the cluster_id is still discoverable. **NEW per-cluster singleflight primitive (r2 codex F1 + codex-ops F5 — ATOMIC reservation)**: export `acquireOrAwaitClusterSession(clusterId: string, factory: () => Promise<Session>): Promise<Session>` backed by a module-level `Map<string, Promise<Session>>`. Contract: if no in-flight entry exists for `clusterId`, register `factory()`'s promise in the map, await it, delete the entry on settle (resolve or reject), return the result. If an in-flight entry DOES exist for the same `clusterId`, return that existing promise — DO NOT call `factory`. This collapses the lookup+`recordSessionStart` pair into one atomic critical section per cluster. Without this primitive, two simultaneous AnswerView mounts can both complete `findLatestSessionForCluster` returning null BEFORE either writes the running row, then both call `recordSessionStart` and both spawn agents (codex r2 HIGH F1: AC8 await-order is per-instance, not atomic).
  - tools/raycast-echo/src/echo.tsx  # AC1, AC2, AC3, AC4, AC5, AC7, AC8 — `runAsk` becomes `runAsk(question, { forkedFrom?, clusterId?, forceFreshAgent? })`; new helper `resumeOrAskForCluster(cluster: FindClustersCluster)` is the decision site for cluster-click default behavior. **ClusterRow (defined in this file at `echo.tsx:249`, not `EmptyState.tsx`) — r2 codex LOW F4 file-map fix**: ClusterRow's primary action becomes "Open Prior Answer" when the latest session for the cluster (filtered to `["running","done"]`) is non-null; otherwise stays "Ask ECHO about This Cluster". Accessory chips: `Answered {relative_time}` for `done`, `Running` for `running`. ClusterRow derives state synchronously from the already-loaded `useSessions()` array passed via the `renderCluster` prop — NOT by calling the async `findLatestSessionForCluster` during render. A new secondary action "Ask Again from This Cluster" (cmd-shift-r) ALWAYS starts a fresh agent run with the cluster_id stamped on the new session AND `forceFreshAgent: true`. The decision lookup is reactive — EchoContext threads a new `onSessionChanged` callback into AnswerView so that completing a fresh ask flips the same row's primary from "Ask" to "Open Prior" without a Raycast re-summon (r1 codex F3 + codex-ops F6).
  - tools/raycast-echo/src/components/EmptyState.tsx  # AC2 (r2 codex LOW F4 scope clarification) — NO ClusterRow code changes in this file. EmptyState only RENDERS clusters via the `renderCluster` prop (passed in by `echo.tsx`); ClusterRow itself lives in `echo.tsx`. EmptyState's role in this spec is solely to thread the `sessions` array (from `useSessions()`) down into `renderCluster` so ClusterRow can synchronously derive the resume-state chip + primary action per AC2. If `EmptyState` already passes `sessions` to children, no edit is needed — the existing wiring is sufficient. If sessions data is currently only consumed for the Sessions sections and not threaded for cluster decisions, add the prop-pass.
  - tools/raycast-echo/src/components/AnswerView.tsx  # AC1, AC4, AC7, AC8 — `AnswerViewProps` gains optional `clusterId?: string`, `forceFreshAgent?: boolean`, and `onSessionChanged?: () => void` (refresh callback for the reactive row-flip contract, r1 codex F3 + codex-ops F6). When `clusterId` is present AND `forceFreshAgent` is not true: AnswerView calls the **singleflight primitive** `acquireOrAwaitClusterSession(clusterId, factory)` (r2 codex F1 + codex-ops F5 atomic reservation, from `sessions.ts`). The factory passed in: (1) calls `await findLatestSessionForCluster(clusterId, ["running","done"])`; (2) if non-null, returns it (short-circuit will fire); (3) if null, pre-resolves the subprocess log path via the new `resolveSessionLogPath(invocation)` helper exposed by `agent-runner.ts` (r2 codex MED F2 — log-path ordering); (4) calls `await recordSessionStart({ ..., clusterId, subprocessLogPath })` so the persisted running row carries the log path from the start. The returned session determines branching: if `status: "done"` — replay (skip startAgent, skip recordSessionStart, render `_Replayed from session asked {relative_time}_`, isLoading=false). If `status: "running"` (r1 codex-ops F5) — replay buffered answer at mount but do NOT call `startAgent`; banner reads `_Replayed from in-progress session started {relative_time} — current answer may continue to grow_`. If the session is the one this AnswerView just created (status: "running" AND id matches our local intent) — proceed with `startAgent(invocation, { sessionLogPath })` using the SAME pre-resolved log path; the running row now exists with the correct path. The singleflight semantics guarantee that a near-simultaneous SECOND AnswerView mount for the same cluster awaits the FIRST factory's promise — both `findLatestSessionForCluster` and `recordSessionStart` execute exactly once per cluster across simultaneous mounts (codex r2 HIGH F1 closed). Existing actions (Copy, Paste, etc.) work against replayed content. A "Ask Again from This Cluster" action re-pushes AnswerView with the same `clusterId` AND `forceFreshAgent: true`. `onSessionChanged` is invoked AFTER `recordSessionStart` resolves (so AC2's running-state chip appears immediately) AND AFTER `recordSessionEnd` resolves (so the chip flips to `Answered`). `forceFreshAgent: true` callers bypass the singleflight short-circuit only on the lookup branch — they still go through `acquireOrAwaitClusterSession` so simultaneous "Ask Again" + "Open Prior Answer" presses don't race; the factory just skips the done-session short-circuit when `forceFreshAgent` is true and proceeds to recordSessionStart.
  - tools/raycast-echo/src/components/SessionDetail.tsx  # AC4 — no behavior change; verified to be the same shape the AnswerView replay path renders so the two surfaces stay visually consistent. The replay path INSIDE AnswerView is deliberately chosen over `push(<SessionDetail/>)` because SessionDetail lacks the unified AnswerView actions (paste-to-frontmost, fork, etc.) that founders use post-resume. Strategist/PM both flagged "cluster click is a deep link into the sessions object model" — this implements it by giving AnswerView the dual-mode capability rather than splitting the rendering.
  - tools/raycast-echo/src/components/TypingState.tsx  # AC1, AC3 (r1 codex F2) — `ForkTypingState.onAsk` currently calls `onAsk(buildForkPrompt(source, value), source.id)` (positional forkedFrom). Update to options-shaped call site: `onAsk(buildForkPrompt(source, value), { forkedFrom: source.id, clusterId: source.clusterId })`. Forked sessions inherit the source session's `clusterId` when present so a fork off a Statellite cluster session is itself discoverable by Statellite-cluster lookup. No UI changes; the change is purely the options-shape threading through the existing fork flow.
  - tools/raycast-echo/src/lib/agent-runner.ts  # AC8 (r2 codex MED F2 — log-path ordering) — `createSessionLog` already computes the log path synchronously at agent-runner.ts:128 before any spawn-side work; that's the reason this refactor is small. EXPORT a new helper `resolveSessionLogPath(invocation: AgentInvocation, sessionLogDir?: string): string` that returns the same path `createSessionLog` would produce (deterministic from invocation + dir; no I/O, no side effects). `startAgent(invocation, options?)` accepts an optional `options.sessionLogPath?: string` parameter — when provided, `startAgent` uses THAT path verbatim (idempotent: pre-resolved path matches what `startAgent` would have computed internally). When omitted, `startAgent` falls back to the current internal behavior. This lets AnswerView pre-resolve the path BEFORE `recordSessionStart` (so the persisted running row carries `subprocessLogPath` from the start) without breaking back-compat for any other call site of `startAgent`. Existing tests pass unchanged; new test in `agent-runner.test.ts` (or extension): `resolveSessionLogPath(invocation)` returns the same string `startAgent(invocation).sessionLogPath` returns.
  - tools/raycast-echo/test/sessions.test.ts  # AC1, AC6, AC8 — EXTEND. Cases: (a) `recordSessionStart({ clusterId })` persists; subsequent `await findLatestSessionForCluster` finds it; (b) returns the MOST-RECENT match when multiple sessions exist for the same cluster_id (newest by `startedAt`); (c) default status filter excludes `errored` and `cancelled` (filter is `["running","done"]`); (d) returns null when no session matches; (e) returns null when `clusterId` is undefined on the call (defensive); (f) the LocalStorage migration path: a session persisted in old shape (no `clusterId` field) loads cleanly without throwing and is correctly invisible to cluster lookup; **(g) full lifecycle round-trip (r1 codex-ops F4)**: start({ clusterId }) → recordSessionUpdate(answer="...") → recordSessionEnd({status: "done"}) → re-load via listSessions and assert `clusterId` is still present on the row, AND `findLatestSessionForCluster` still finds it. This proves `normalizeSession` preserves the field across every write path; without this assertion the bug regresses silently.
  - tools/raycast-echo/test/cluster-resume.test.tsx  # AC1, AC2, AC4, AC7, AC8 — NEW (or extend existing component test). **r2 codex MED F3 test-stack note**: the project ships Vitest + tsx but no `@testing-library/react`; AC7's test contract is therefore a CALLBACK/HOOK seam, not a mount-and-observe. Existing component tests in this project inspect React elements via direct function invocation, not via a renderer. Tests follow that pattern. Cases: **(1) ClusterRow state derivation** — call the ClusterRow render function with a mocked `sessions` array returning {none, done-only, running-only, both} states; assert (a) the returned element's action panel primary `title` prop equals `"Open Prior Answer"` for done/running, `"Ask ECHO about This Cluster"` for none; (b) accessory chips array includes the right text for `Answered <time>` / `Running` / no resume chip; (c) "Ask Again from This Cluster" action is present in the action panel children regardless of prior session state. **(2) AnswerView startup ordering** — invoke `AnswerView`'s `startup` function (extracted or exported for testability) with `clusterId` pointing at three states: (a) no session — assert that the recorded call sequence is `acquireOrAwaitClusterSession (which internally calls findLatestSessionForCluster + resolveSessionLogPath + recordSessionStart) → onSessionChanged → startAgent`; specifically `startAgent` is called EXACTLY once AFTER `recordSessionStart` resolves; (b) done session — `startAgent` is NOT called; replay banner string is produced; (c) running session — `startAgent` is NOT called; running banner string is produced. **(3) AC7 callback contract** — assert `onSessionChanged` invoked at the correct moments: once after `recordSessionStart`, once after `recordSessionEnd`. Use a spy passed as the prop; observe call count + ordering. NO mount-and-observe; the contract is the callback, not the parent re-render — the parent's re-render is React's job and exercised by Raycast at runtime. **(4) AC8 atomic concurrency** — invoke two near-simultaneous `acquireOrAwaitClusterSession` calls for the same `clusterId`, where the factory's internal `findLatestSessionForCluster` is mocked to RESOLVE NULL for both invocations BEFORE the first's `recordSessionStart` resolves (forcing the interleaved race that codex r2 HIGH F1 named). Assert the factory is called EXACTLY ONCE (the singleflight collapses both into one), and `startAgent` is called EXACTLY ONCE total. This is the test that proves the atomic primitive, not the per-instance await order. **(5) Log-path threading** — `resolveSessionLogPath(invocation)` returns the same string `startAgent(invocation).sessionLogPath` returns (or, with the new param shape, `startAgent(invocation, {sessionLogPath}).sessionLogPath === sessionLogPath`); recorded sessions for fresh-agent runs carry the path from `recordSessionStart` time, not patched in later.
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

## AC7 — Reactive row-flip after a fresh ask completes (callback contract)

When the user clicks a cluster row with no prior session, the primary action is "Ask ECHO about This Cluster". After the resulting agent run completes and `recordSessionEnd` resolves, the same mounted ClusterRow in the underlying EchoContext list re-renders with primary action "Open Prior Answer" and accessory chip `Answered {relative_time}` — without the user re-summoning Raycast. This requires an explicit refresh contract because EchoContext reads sessions through `useSessions()` while AnswerView writes them through imported module-level `recordSession*` functions; there is no implicit signal between them.

**The refresh contract:** AnswerView accepts an optional `onSessionChanged?: () => void` callback prop. EchoContext passes a callback that invokes `useSessions()` refresh logic (either an exposed `refresh()` method on the hook, or a state-bump that retriggers the migration/load effect). AnswerView calls `onSessionChanged()` (a) AFTER `recordSessionStart` resolves (so a row in `status: "running"` appears immediately for AC2's running-state chip + AC4's running short-circuit), and (b) AFTER `recordSessionEnd` resolves (so the row flips to `status: "done"` and the chip text updates).

**Verify (r2 codex MED F3 test-stack reframe):** the project currently ships Vitest + tsx without `@testing-library/react`; the test contract here is the **callback seam, NOT a full mount-and-observe**. The AC7 test in `cluster-resume.test.tsx` invokes the relevant AnswerView startup path (extracted to a testable function if needed) with a spy `onSessionChanged` prop, runs the mocked agent-runner through its event sequence, and asserts (a) the spy is called exactly twice — once after `recordSessionStart` resolves, once after `recordSessionEnd` resolves; (b) call ordering matches the AC8 await sequence. The downstream parent re-render is React's job and is exercised by Raycast at runtime — the contract this spec defends is the callback emission, not the React reconciliation.

## AC8 — Atomic per-cluster reservation via singleflight (NOT per-instance await order)

**r2 codex HIGH F1 + codex-ops MED F5:** the r1 version of this AC specified a per-instance await sequence inside `AnswerView::startup`. That ordering closes the *sequential* second-open case but NOT the *interleaved* one: two AnswerView mounts can both complete `findLatestSessionForCluster` returning null BEFORE either writes the running row, then both call `recordSessionStart` independently and both spawn agents. The fix is an atomic per-cluster reservation primitive, not a stricter per-instance order.

**The contract:** `tools/raycast-echo/src/lib/sessions.ts` exports `acquireOrAwaitClusterSession(clusterId: string, factory: () => Promise<Session>): Promise<Session>`, backed by a module-level `Map<string, Promise<Session>>`. Semantics:

- If no in-flight entry exists for `clusterId`: register `factory()`'s promise in the map under `clusterId`, await it, delete the entry on settle (resolve or reject), return the result. **The factory is called exactly once.**
- If an in-flight entry exists for `clusterId`: return that existing promise. **Do NOT call `factory`.** The second caller awaits the first caller's result.

`AnswerView::startup` calls `acquireOrAwaitClusterSession(clusterId, factory)` where `factory` is a closure that:

1. `await findLatestSessionForCluster(clusterId, ["running","done"])` — if non-null AND not `forceFreshAgent`, return it (short-circuit path).
2. If null OR `forceFreshAgent: true`: `const subprocessLogPath = resolveSessionLogPath(invocation)` (r2 codex MED F2 — pre-resolved synchronously from `agent-runner.ts`).
3. `await recordSessionStart({ ..., clusterId, subprocessLogPath })` — persisted running row carries the log path from the start.
4. Return the freshly-created session.

Outside the factory, AnswerView branches on the returned session:
- If it's a pre-existing done/running session (and not `forceFreshAgent`): short-circuit per AC4. NO `startAgent` call. NO `recordSessionStart` call (the factory's recordSessionStart already happened if needed, but the lookup-hit path skipped it).
- If it's the freshly-created running session this AnswerView intended to spawn: invoke `onSessionChanged?.()` (AC7), then `startAgent(invocation, { sessionLogPath: subprocessLogPath })` using the SAME pre-resolved path.

**Why this is atomic:** the JavaScript event loop is single-threaded. Two simultaneous AnswerView mounts both call `acquireOrAwaitClusterSession`. The FIRST call's `Map.set(clusterId, ...)` completes synchronously before the SECOND call's `Map.get(clusterId)` runs. The second call sees the in-flight entry and awaits the first's promise — it never calls `factory`. So `findLatestSessionForCluster + recordSessionStart` execute exactly once per cluster across simultaneous mounts. Both callers receive the same `Session` object; only one of them is the "creator" (whose pre-resolved log path was used) and only that one proceeds to `startAgent`. The other observes a now-running session and short-circuits.

**Verify:** the `cluster-resume.test.tsx` AC8 test invokes two near-simultaneous `acquireOrAwaitClusterSession` calls for the same `clusterId`, with the factory mocked such that `findLatestSessionForCluster` resolves NULL for BOTH invocations BEFORE the first's `recordSessionStart` resolves (forcing the interleaved race codex named). Assertions: (a) factory called exactly once; (b) `findLatestSessionForCluster` called exactly once; (c) `recordSessionStart` called exactly once; (d) `startAgent` called exactly once across both flows. This proves the atomic primitive — not the per-instance await order.

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
