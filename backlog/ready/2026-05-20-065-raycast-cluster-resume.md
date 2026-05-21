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
  - tools/raycast-echo/src/lib/sessions.ts  # AC1, AC6, AC8 — add optional `clusterId?: string` to Session shape + `recordSessionStart` payload; persist on every session that originated from a cluster click (cluster row → runAsk path) so the cluster_id ↔ session edge is durable. New ASYNC lookup: `findLatestSessionForCluster(clusterId: string, statuses?: ReadonlyArray<Session["status"]>): Promise<Session | null>` returning the most-recent session matching the cluster + status filter — Promise-returning because the existing session store is async LocalStorage (`listSessions()` awaits migration; r1 codex F1). Default statuses = `["running", "done"]` (excludes `errored` and `cancelled`; AC6 punts opening past failures as a separate UX). Storage shape is additive — existing sessions without `clusterId` continue to load and behave as today. **clusterId round-trip preservation (r1 codex-ops F4)**: `normalizeSession` MUST preserve `clusterId` through `mergeRowAndWrite`, `recordSessionUpdate`, and `recordSessionEnd`; without this, the first flush after `recordSessionStart` would silently erase the cluster edge. AC1's test contract awaits the helper AND drives the full lifecycle (start → update → end) before asserting the cluster_id is still discoverable. **NEW per-cluster singleflight primitive (r2 codex F1 + codex-ops F5 — ATOMIC reservation; r3 mixed-intent refinement)**: export `acquireOrAwaitClusterSession(clusterId: string, intent: "default" | "fresh", factory: () => Promise<Session>): Promise<Session>` backed by a module-level `Map<string, Promise<Session>>` whose key is `${clusterId}#${intent}` (two parallel singleflight pools per cluster, one per intent — r3 codex F1 + codex-ops F1). Contract: if no in-flight entry exists for the composite `clusterId#intent` key, register `factory()`'s promise, await, delete on settle, return. If an in-flight entry exists for the SAME `clusterId#intent` key, return that existing promise — DO NOT call factory. Crucially, "Open Prior Answer" (intent=`default`) and "Ask Again from This Cluster" (intent=`fresh`) for the same cluster use DIFFERENT keys and proceed in parallel — neither short-circuits the other. This preserves AC3's "Ask Again always starts a fresh agent" contract while still collapsing concurrent same-intent opens. Without intent-keyed separation, a near-simultaneous default + fresh pair would collapse onto whichever started first, swallowing the fresh-intent factory and violating AC3 (codex r3 F1, codex-ops r3 F1).
  - tools/raycast-echo/src/echo.tsx  # AC1, AC2, AC3, AC4, AC5, AC7, AC8 — `runAsk` becomes `runAsk(question, { forkedFrom?, clusterId?, forceFreshAgent? })`; new helper `resumeOrAskForCluster(cluster: FindClustersCluster)` is the decision site for cluster-click default behavior. **ClusterRow (defined in this file at `echo.tsx:249`, not `EmptyState.tsx`) — r2 codex LOW F4 file-map fix**: ClusterRow's primary action becomes "Open Prior Answer" when the latest session for the cluster (filtered to `["running","done"]`) is non-null; otherwise stays "Ask ECHO about This Cluster". Accessory chips: `Answered {relative_time}` for `done`, `Running` for `running`. ClusterRow derives state synchronously from the already-loaded `useSessions()` array passed via the `renderCluster` prop — NOT by calling the async `findLatestSessionForCluster` during render. A new secondary action "Ask Again from This Cluster" (cmd-shift-r) ALWAYS starts a fresh agent run with the cluster_id stamped on the new session AND `forceFreshAgent: true`. The decision lookup is reactive — EchoContext threads a new `onSessionChanged` callback into AnswerView so that completing a fresh ask flips the same row's primary from "Ask" to "Open Prior" without a Raycast re-summon (r1 codex F3 + codex-ops F6).
  - tools/raycast-echo/src/components/EmptyState.tsx  # AC2 (r2 codex LOW F4 scope clarification) — NO ClusterRow code changes in this file. EmptyState only RENDERS clusters via the `renderCluster` prop (passed in by `echo.tsx`); ClusterRow itself lives in `echo.tsx`. EmptyState's role in this spec is solely to thread the `sessions` array (from `useSessions()`) down into `renderCluster` so ClusterRow can synchronously derive the resume-state chip + primary action per AC2. If `EmptyState` already passes `sessions` to children, no edit is needed — the existing wiring is sufficient. If sessions data is currently only consumed for the Sessions sections and not threaded for cluster decisions, add the prop-pass.
  - tools/raycast-echo/src/components/AnswerView.tsx  # AC1, AC4, AC7, AC8 — `AnswerViewProps` gains optional `clusterId?: string`, `forceFreshAgent?: boolean`, and `onSessionChanged?: () => void` (refresh callback for the reactive row-flip contract, r1 codex F3 + codex-ops F6). When `clusterId` is present, AnswerView calls the **intent-keyed singleflight primitive** `acquireOrAwaitClusterSession(clusterId, intent, factory)` where `intent` is `"fresh"` if `forceFreshAgent: true` else `"default"` (r3 codex F1 + codex-ops F1 mixed-intent refinement). The factory passed in: (1) for `intent: "default"` ONLY: `await findLatestSessionForCluster(clusterId, ["running","done"])`; if non-null, return it (replay short-circuit). For `intent: "fresh"`: skip the lookup entirely; always create a fresh session. (2) Pre-allocate the subprocess log path via `allocateSessionLogPath(invocation)` from `agent-runner.ts` (r3 log-path patch — fresh path each call, NOT compared against no-option startAgent). (3) `await recordSessionStart({ ..., clusterId, subprocessLogPath })` — the persisted running row carries the pre-allocated path. (4) Return the freshly-created session. Outside the factory, AnswerView branches: if returned session is a pre-existing done/running session (default-intent replay path): skip startAgent, render the matching replay banner (`_Replayed from session asked {relative_time}_` for done; `_Replayed from in-progress session started {relative_time} — current answer may continue to grow_` for running). If returned session is freshly-created (created by this factory): invoke `onSessionChanged?.()` (AC7), then `startAgent(invocation, { sessionLogPath: subprocessLogPath })` using the SAME pre-allocated path. The intent-keyed singleflight guarantees: (a) two simultaneous default-intent opens collapse onto one factory call (atomic per-cluster-per-intent); (b) two simultaneous fresh-intent opens collapse onto one factory call (no duplicate Ask Again spawns); (c) ONE default-intent + ONE fresh-intent for the same cluster proceed in PARALLEL with different keys — neither swallows the other, preserving AC3's "Ask Again always starts a fresh agent" contract (r3 codex F1, codex-ops F1). Existing actions (Copy, Paste, etc.) work against replayed content. A "Ask Again from This Cluster" action re-pushes AnswerView with the same `clusterId` AND `forceFreshAgent: true`. `onSessionChanged` is invoked AFTER `recordSessionStart` resolves (so AC2's running-state chip appears immediately) AND AFTER `recordSessionEnd` resolves (so the chip flips to `Answered`).
  - tools/raycast-echo/src/components/SessionDetail.tsx  # AC4 — no behavior change; verified to be the same shape the AnswerView replay path renders so the two surfaces stay visually consistent. The replay path INSIDE AnswerView is deliberately chosen over `push(<SessionDetail/>)` because SessionDetail lacks the unified AnswerView actions (paste-to-frontmost, fork, etc.) that founders use post-resume. Strategist/PM both flagged "cluster click is a deep link into the sessions object model" — this implements it by giving AnswerView the dual-mode capability rather than splitting the rendering.
  - tools/raycast-echo/src/components/TypingState.tsx  # AC1, AC3 (r1 codex F2) — `ForkTypingState.onAsk` currently calls `onAsk(buildForkPrompt(source, value), source.id)` (positional forkedFrom). Update to options-shaped call site: `onAsk(buildForkPrompt(source, value), { forkedFrom: source.id, clusterId: source.clusterId })`. Forked sessions inherit the source session's `clusterId` when present so a fork off a Statellite cluster session is itself discoverable by Statellite-cluster lookup. No UI changes; the change is purely the options-shape threading through the existing fork flow.
  - tools/raycast-echo/src/lib/agent-runner.ts  # AC8 (r2 codex MED F2 + r3 codex F2 + codex-ops F2 — log-path pre-allocation) — `createSessionLog` currently names files from `new Date().toISOString()` at open time (agent-runner.ts:270-273), so a side-effect-free deterministic-by-invocation helper is impossible without time injection. The implementable contract is **pre-allocation, not re-derivation**: EXPORT a new helper `allocateSessionLogPath(invocation: AgentInvocation, sessionLogDir?: string): string` that GENERATES a fresh path NOW (timestamp baked in once at call site) and returns that string — no caching, no determinism claim across multiple calls (two calls produce two paths; that's correct). `startAgent(invocation, options?)` accepts a new `options.sessionLogPath?: string` parameter — when provided, `startAgent` USES THAT EXACT PATH for `createSessionLog` (skipping its internal timestamp generation). When omitted, `startAgent` retains current behavior. AnswerView's flow: pre-allocate path via `allocateSessionLogPath` → pass to `recordSessionStart({ ..., subprocessLogPath })` → pass to `startAgent(invocation, { sessionLogPath })`. The persisted row's `subprocessLogPath` matches the file `startAgent` actually opens. **Removed the r2 "deterministic from invocation + dir" claim** — that's impossible given the timestamp dependency; the new contract is path-passing, not path-equivalence (r3 codex F2, codex-ops F2). New test: `allocateSessionLogPath(invocation)` returns a non-empty path string; `startAgent(invocation, { sessionLogPath }).sessionLogPath === sessionLogPath` (injection equality, not no-option equality).
  - tools/raycast-echo/test/sessions.test.ts  # AC1, AC6, AC8 — EXTEND. Cases: (a) `recordSessionStart({ clusterId })` persists; subsequent `await findLatestSessionForCluster` finds it; (b) returns the MOST-RECENT match when multiple sessions exist for the same cluster_id (newest by `startedAt`); (c) default status filter excludes `errored` and `cancelled` (filter is `["running","done"]`); (d) returns null when no session matches; (e) returns null when `clusterId` is undefined on the call (defensive); (f) the LocalStorage migration path: a session persisted in old shape (no `clusterId` field) loads cleanly without throwing and is correctly invisible to cluster lookup; **(g) full lifecycle round-trip (r1 codex-ops F4)**: start({ clusterId }) → recordSessionUpdate(answer="...") → recordSessionEnd({status: "done"}) → re-load via listSessions and assert `clusterId` is still present on the row, AND `findLatestSessionForCluster` still finds it. This proves `normalizeSession` preserves the field across every write path; without this assertion the bug regresses silently.
  - tools/raycast-echo/test/cluster-resume.test.tsx  # AC1, AC2, AC4, AC7, AC8 — NEW (or extend existing component test). **r2 codex MED F3 test-stack note**: the project ships Vitest + tsx but no `@testing-library/react`; AC7's test contract is therefore a CALLBACK/HOOK seam, not a mount-and-observe. Existing component tests in this project inspect React elements via direct function invocation, not via a renderer. Tests follow that pattern. Cases: **(1) ClusterRow state derivation** — call the ClusterRow render function with a mocked `sessions` array returning {none, done-only, running-only, both} states; assert (a) the returned element's action panel primary `title` prop equals `"Open Prior Answer"` for done/running, `"Ask ECHO about This Cluster"` for none; (b) accessory chips array includes the right text for `Answered <time>` / `Running` / no resume chip; (c) "Ask Again from This Cluster" action is present in the action panel children regardless of prior session state. **(2) AnswerView startup ordering** — invoke `AnswerView`'s `startup` function (extracted or exported for testability) with `clusterId` pointing at three states: (a) no session — assert that the recorded call sequence is `acquireOrAwaitClusterSession(C, "default", factory) (factory internally calls findLatestSessionForCluster + allocateSessionLogPath + recordSessionStart) → onSessionChanged → startAgent`; specifically `startAgent` is called EXACTLY once AFTER `recordSessionStart` resolves, and `startAgent`'s `sessionLogPath` option equals the path `allocateSessionLogPath` returned; (b) done session — `startAgent` is NOT called; replay banner string is produced; (c) running session — `startAgent` is NOT called; running banner string is produced. **(3) AC7 callback contract** — assert `onSessionChanged` invoked at the correct moments: once after `recordSessionStart`, once after `recordSessionEnd`. Use a spy passed as the prop; observe call count + ordering. NO mount-and-observe; the contract is the callback, not the parent re-render — the parent's re-render is React's job and exercised by Raycast at runtime. **(4) AC8 atomic per-cluster-per-intent concurrency (three sub-cases — r3 mixed-intent refinement)**: (4a) two near-simultaneous `acquireOrAwaitClusterSession(C, "default", factory)` calls with `findLatestSessionForCluster` mocked NULL for both BEFORE the first's `recordSessionStart` resolves — assert factory + lookup + recordSessionStart + startAgent each called exactly once. (4b) two near-simultaneous `acquireOrAwaitClusterSession(C, "fresh", factory)` calls — assert factory + recordSessionStart + startAgent each called exactly once (proves Ask Again de-dupes). (4c) ONE `acquireOrAwaitClusterSession(C, "default", factory_d)` AND ONE `acquireOrAwaitClusterSession(C, "fresh", factory_f)` for the same cluster, both started before first settles — assert BOTH factories called exactly once (different keys, no collapse), two recordSessionStart calls, two startAgent calls. This proves the mixed-intent parallel contract that codex r3 F1 + codex-ops r3 F1 named (Ask Again never swallowed by a default in-flight). **(5) Log-path pre-allocation (r3 patch)**: `allocateSessionLogPath(invocation)` returns a non-empty string; `startAgent(invocation, { sessionLogPath: P }).sessionLogPath === P` (injection equality — not no-option equality, which is impossible due to `createSessionLog`'s timestamp dependency). Recorded sessions for fresh-agent runs carry the EXACT pre-allocated path from `recordSessionStart` time; assert `listSessions(...).find(s => s.id === created.id).subprocessLogPath === P`.
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

## AC8 — Atomic per-cluster-per-intent reservation via singleflight

**Evolution across rounds:**
- *r1 version*: per-instance await order. Closes sequential double-click case but NOT interleaved race.
- *r2 version (codex HIGH F1 + codex-ops MED F5)*: atomic per-cluster singleflight. Closes interleaved race for same-intent calls. But conflates default + fresh intents.
- *r3 version (codex F1 + codex-ops F1)*: per-cluster-PER-INTENT singleflight with composite key `${clusterId}#${intent}`. Closes both the interleaved race AND the cross-intent swallow problem.

The fix at r3 is the atomic per-cluster reservation primitive keyed on cluster + intent — not a stricter per-instance order, and not a single per-cluster slot that would conflate replays with explicit Ask-Again calls.

**The contract (r3 mixed-intent refinement):** `tools/raycast-echo/src/lib/sessions.ts` exports `acquireOrAwaitClusterSession(clusterId: string, intent: "default" | "fresh", factory: () => Promise<Session>): Promise<Session>`, backed by a module-level `Map<string, Promise<Session>>` whose key is `${clusterId}#${intent}`. Semantics per composite key:

- If no in-flight entry exists for `${clusterId}#${intent}`: register `factory()`'s promise, await, delete on settle, return. **The factory is called exactly once per key.**
- If an in-flight entry exists for the same key: return that existing promise. **Do NOT call `factory`.**
- Different intents for the same cluster use different keys and proceed independently — a concurrent default + fresh pair both run their factories in parallel. This preserves AC3 (codex r3 F1, codex-ops r3 F1).

`AnswerView::startup` calls `acquireOrAwaitClusterSession(clusterId, intent, factory)` where:
- `intent` = `"fresh"` when `forceFreshAgent: true`, else `"default"`.
- `factory` is a closure that:
  1. For `intent: "default"` ONLY: `await findLatestSessionForCluster(clusterId, ["running","done"])`; if non-null, return it (replay path; the closure exits here).
  2. For `intent: "fresh"`: skip the lookup — always create a new session (no short-circuit possible).
  3. `const subprocessLogPath = allocateSessionLogPath(invocation)` (r3 log-path pre-allocation; fresh path each call; the r2 "deterministic from invocation + dir" claim is withdrawn — `createSessionLog` uses `new Date().toISOString()` at open time, so two unparameterized calls produce two paths).
  4. `await recordSessionStart({ ..., clusterId, subprocessLogPath })` — persisted running row carries the pre-allocated path.
  5. Return the freshly-created session.

Outside the factory, AnswerView branches on the returned session:
- Pre-existing done/running session returned (default-intent replay path): NO `startAgent`, NO `recordSessionStart`. Render the matching replay banner (per AC4).
- Freshly-created running session returned (the factory just made it): invoke `onSessionChanged?.()` (AC7), then `startAgent(invocation, { sessionLogPath: subprocessLogPath })` using the SAME pre-allocated path. The persisted row's `subprocessLogPath` matches the file `startAgent` actually opens.

**Why this is atomic and intent-aware:** the JavaScript event loop is single-threaded; `Map.set` is synchronous. Same-intent concurrent calls collapse atomically onto one factory. Cross-intent concurrent calls (one "Open Prior Answer" + one "Ask Again from This Cluster") use different keys and proceed in parallel — preventing the AC3 violation codex r3 F1 + codex-ops r3 F1 named, where a fresh-intent caller would otherwise be swallowed by a default-intent in-flight promise.

**Verify (`cluster-resume.test.tsx` AC8 test cases — all r3-verifiable):**

- **(4a) Same-intent collapse, default:** two near-simultaneous `acquireOrAwaitClusterSession(C, "default", factory)` calls; factory's `findLatestSessionForCluster` resolves NULL for both BEFORE the first's `recordSessionStart` resolves. Assert: factory called exactly once; `findLatestSessionForCluster`, `recordSessionStart`, `startAgent` each called exactly once.
- **(4b) Same-intent collapse, fresh:** two near-simultaneous `acquireOrAwaitClusterSession(C, "fresh", factory)` calls. Assert: factory called exactly once; `recordSessionStart` called exactly once; `startAgent` called exactly once. Proves Ask Again de-dupes too.
- **(4c) Mixed-intent parallel:** one `acquireOrAwaitClusterSession(C, "default", factory_d)` AND one `acquireOrAwaitClusterSession(C, "fresh", factory_f)` for the SAME cluster `C`, both started before the first settles. Assert: BOTH factories called exactly once (different keys, no collapse); two `recordSessionStart` calls (one per intent); two `startAgent` calls. This proves the mixed-intent contract — Ask Again is never swallowed by a default in-flight (codex r3 F1, codex-ops r3 F1).

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
