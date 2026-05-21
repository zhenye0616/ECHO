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
  - tools/raycast-echo/src/lib/sessions.ts  # AC1, AC6 — add optional `clusterId?: string` to Session shape + `recordSessionStart` payload; persist on every session that originated from a cluster click (cluster row → runAsk path) so the cluster_id ↔ session edge is durable. New lookup: `findLatestSessionForCluster(clusterId: string, statuses?: ReadonlyArray<Session["status"]>): Session | null` returning the most-recent session matching the cluster + status filter. Default statuses = `["running", "done"]` (excludes `errored` and `cancelled`; AC6 punts opening past failures as a separate UX). Storage shape is additive — existing sessions without `clusterId` continue to load and behave as today.
  - tools/raycast-echo/src/echo.tsx  # AC1, AC2, AC3, AC4, AC5 — `runAsk` becomes `runAsk(question, { forkedFrom?, clusterId? })`; new helper `resumeOrAskForCluster(cluster: FindClustersCluster)` is the decision site for cluster-click default behavior. ClusterRow's primary action becomes "Open Prior Answer" when `findLatestSessionForCluster(cluster.cluster_id)` returns non-null; otherwise stays "Ask ECHO about This Cluster". A new secondary action "Ask Again from This Cluster" (cmd-shift-r) ALWAYS starts a fresh agent run with the cluster_id stamped on the new session. The decision lookup is reactive — it must re-evaluate when sessions change so that completing a fresh ask flips the same row's primary from "Ask" to "Open Prior" without a Raycast re-summon.
  - tools/raycast-echo/src/components/EmptyState.tsx  # AC2 — ClusterRow's accessory chips gain an `Answered {relative_time}` chip when `findLatestSessionForCluster(cluster.cluster_id, ["done"])` returns non-null OR a `Running` chip when status is `"running"`. Gated on session presence — clusters with no prior session show no resume chip. Chip is to the LEFT of the existing recency chip so the visual scan reads `loop status · prior-answer state · recency`. Tooltip on the chip: `session.id` + completed_at (PDT) for done; `started_at` for running.
  - tools/raycast-echo/src/components/AnswerView.tsx  # AC1, AC4 — `AnswerViewProps` gains optional `clusterId?: string`. When present AND `findLatestSessionForCluster(clusterId, ["done"])` returns a hit AT MOUNT TIME, AnswerView short-circuits: skips `startAgent`, skips `recordSessionStart`, sets `answer` from the persisted session content, marks `isLoading=false`, and renders a small "_Replayed from session asked {relative_time}_" italics line above the answer body so the user can tell at a glance. Existing actions (Copy, Paste, etc.) work against the replayed content. A "Ask Again from This Cluster" action is added to the ActionPanel that re-pushes AnswerView with `clusterId` BUT forces fresh-agent mode via a new prop `forceFreshAgent?: boolean`.
  - tools/raycast-echo/src/components/SessionDetail.tsx  # AC4 — no behavior change; verified to be the same shape the AnswerView replay path renders so the two surfaces stay visually consistent. The replay path INSIDE AnswerView is deliberately chosen over `push(<SessionDetail/>)` because SessionDetail lacks the unified AnswerView actions (paste-to-frontmost, fork, etc.) that founders use post-resume. Strategist/PM both flagged "cluster click is a deep link into the sessions object model" — this implements it by giving AnswerView the dual-mode capability rather than splitting the rendering.
  - tools/raycast-echo/test/sessions.test.ts  # AC1, AC6 — EXTEND. Cases: (a) `recordSessionStart({ clusterId })` persists; subsequent `findLatestSessionForCluster` finds it; (b) returns the MOST-RECENT match when multiple sessions exist for the same cluster_id (newest by `startedAt`); (c) default status filter excludes `errored` and `cancelled`; (d) returns null when no session matches; (e) returns null when `clusterId` is undefined on the call (defensive); (f) the LocalStorage migration path: a session persisted in old shape (no `clusterId` field) loads cleanly without throwing and is correctly invisible to cluster lookup.
  - tools/raycast-echo/test/cluster-resume.test.tsx  # AC1, AC2, AC4 — NEW (or extend an existing component test if the maintainer prefers). Renders ClusterRow with a mocked `findLatestSessionForCluster` returning {none, done, running}; asserts (a) action panel primary string changes correctly per state; (b) accessory chips include `Answered <time>` or `Running` only in the appropriate states; (c) "Ask Again from This Cluster" action is ALWAYS present regardless of prior session state. Also test AnswerView mounted with `clusterId` pointing at a completed session: zero startAgent calls observed, replay banner rendered, answer text matches persisted content.
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

AC1 through AC6 below. All AC verification phrased as user-observable behavior; the reviewer's job is to verify each AC has a discrete failure mode (the user can see when it broke) and a discrete test (the suite can prove it didn't regress).

## AC1 — Cluster-origin asks persist cluster_id on the session

When a session is created via the cluster-click path (`ClusterRow → runAsk → AnswerView`), the persisted Session record (in LocalStorage via `recordSessionStart`) includes the originating `cluster_id`. Typed-query asks (from the search-bar Ask action) do NOT persist a cluster_id (none exists). The fork path inherits the source session's cluster_id if present — forking off a Statellite cluster session produces a new session also tagged with that cluster_id.

**Verify:** open the LocalStorage shape after a cluster click → confirm `session.clusterId` is set; after a typed-query ask → confirm `session.clusterId` is `undefined`. Run `sessions.test.ts` cases (a), (b), (e).

## AC2 — ClusterRow primary action and chip reflect prior-session state

When `findLatestSessionForCluster(cluster.cluster_id, ["done"])` returns a hit, ClusterRow's primary action is "Open Prior Answer" (icon: `Icon.Document`); the row's accessories array includes an `Answered {relative_time}` chip rendered to the LEFT of the recency chip. When the result is `"running"`, the chip text is `Running` (no time). When neither, the row shows no resume-state chip and the primary action is "Ask ECHO about This Cluster" exactly as today.

**Verify:** the cluster-resume component test renders all three states and asserts the action-panel label string + accessory chip presence/absence + chip text. No new chip appears for clusters with no session.

## AC3 — Secondary "Ask Again from This Cluster" action is always present

ClusterRow's ActionPanel ALWAYS includes a secondary action "Ask Again from This Cluster" with shortcut cmd-shift-r — regardless of whether a prior session exists. Triggering it starts a NEW session linked to the same cluster_id (does not mutate prior session). The shortcut choice intentionally aligns with the existing "Ask Again from This" pattern in `EmptyState.SessionRow` (cmd-r); cmd-shift-r is the cluster-row equivalent because the row already binds cmd-shift-return to paste-to-frontmost.

**Verify:** action label is present and bound regardless of state; firing it creates a new session row in `Today's sessions` with `cluster_id` set; the prior session is unchanged (verify via `findLatestSessionForCluster` returning two sessions, newest first).

## AC4 — AnswerView short-circuits to replay when mounted with a done-session match

When AnswerView mounts with a `clusterId` prop AND `findLatestSessionForCluster(clusterId, ["done"])` returns a non-null session, AnswerView MUST:

- NOT call `startAgent`
- NOT call `recordSessionStart` (no new session created from a replay open)
- Render the persisted answer text in the same `Detail` markdown shape used for live runs
- Render a single italics line `_Replayed from session asked {relative_time}_` immediately above the answer body so the user can tell at a glance
- Keep ALL existing actions functional (Copy, Paste, Launch to Cursor/Claude, etc.) against the replayed answer text
- Add an "Ask Again from This Cluster" action to the ActionPanel that re-pushes AnswerView with the same `clusterId` and `forceFreshAgent: true` (which bypasses the short-circuit and starts a fresh agent run, persisting a new session)

When the matched session is `"running"`, AnswerView replays whatever buffered answer is on the persisted session at mount time but does NOT attempt to attach to the agent's live stdout. (V1 explicitly punts true live-attach — see OoS#3.) The replay banner reads `_Replayed from in-progress session started {relative_time} — current answer may continue to grow_` to set expectations.

**Verify:** the AnswerView portion of the cluster-resume component test mounts with clusterId pointing at three states (no session / done session / running session) and asserts (a) startAgent call count = 0 in the done+running cases, ≥1 in the no-session case; (b) replay banner rendered with the correct copy; (c) "Ask Again from This Cluster" action present in replay mode.

## AC5 — runAsk threading respects clusterId

`runAsk` in `echo.tsx` adds an options parameter `{ forkedFrom?: string | null; clusterId?: string }` (back-compatible — existing call sites pass nothing). The cluster-row click path (`onAsk={runAsk}` inside ClusterRow) MUST pass `clusterId: cluster.cluster_id` so AnswerView receives it. The "Ask Again from This Cluster" action also passes `clusterId` and additionally sets `forceFreshAgent: true` to prevent the same-mount replay short-circuit. The typed-query Ask path in `TypingState` MUST NOT pass `clusterId` (no cluster identity for free-form questions; bypassing this is what V1.5's fuzzy-match would address).

**Verify:** code-read of every `runAsk(...)` call site; static check that `clusterId` is plumbed exactly where it should be, omitted elsewhere. Component test asserts the three call-site shapes.

## AC6 — Storage migration is forward-only and lossless

Sessions persisted before this change (no `clusterId` field) MUST continue to load and render correctly. They will simply be invisible to `findLatestSessionForCluster` lookups (which is the correct behavior — there's no way to retroactively assign cluster_id to old sessions). The migration path is purely additive: the new field is optional, no schema version bump, no separate migration code. Sessions persisted AFTER this change have `clusterId` when applicable.

**Verify:** `sessions.test.ts` case (f) — load a session record persisted without `clusterId` and confirm it parses cleanly, renders in `SessionsList` as it does today, and is correctly absent from cluster-keyed lookup.

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
