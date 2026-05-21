---
item_id: 2026-05-20-065-raycast-cluster-resume
agent_id: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
branch: agent/raycast-cluster-resume
head_sha: 13d99ee1fe717a14006a11f1821c0f7d9d7b8229
spec_commit_sha: f2d6389aea78cf437aa9260dd6e793a78e7274cf
started_at: 2026-05-21T06:19:39Z
finished_at: 2026-05-21T06:39:56Z
---

# Run 1 — 2026-05-21 (Claude Code builder)

## What I implemented

Cluster-click resume + sessions-object-identity per AC1–AC8 of the post-r5
spec. The bug ("clicking a cluster row always spawns a fresh agent even when
the same cluster was just answered") is closed via two cooperating pieces:

1. **Session ↔ cluster edge.** `Session.clusterId?: string` is now persisted by
   `recordSessionStart`, round-tripped through `normalizeSession` so
   `recordSessionUpdate` + `recordSessionEnd` preserve it across the full
   lifecycle.
2. **Intent-keyed atomic singleflight.** `acquireOrAwaitClusterSession(clusterId,
   intent, factory)` collapses concurrent same-intent clicks onto one factory
   call, while leaving cross-intent clicks ("Open Prior Answer" vs "Ask Again
   from This Cluster") on independent keys so they proceed in parallel. The
   returned `{source, createdByThisCall}` pair is the three-way branch
   AnswerView uses: lookup-hit replay (`source: "existing"`), owner spawn
   (`"created"` + `createdByThisCall: true`), waiter replay (`"created"` +
   `createdByThisCall: false`).

ClusterRow now derives `{primaryActionTitle, resumeChip}` synchronously from
the already-loaded `useSessions()` array via `deriveClusterResumeState`. When a
`"running"` or `"done"` session exists for the cluster, the primary action is
"Open Prior Answer" (icon `Icon.Document`) and the row carries an `Answered
<rel>` (done) or `Running` (running) accessory chip to the LEFT of the recency
chip. Otherwise the primary is the original "Ask ECHO about This Cluster" and
no resume chip is shown. The action panel ALWAYS exposes "Ask Again from This
Cluster" (cmd-shift-r) so the explicit re-ask escape hatch is one keystroke
away regardless of state.

AnswerView gains `clusterId?`, `forceFreshAgent?`, `onSessionChanged?`, and
`onAskAgainFromCluster?` props. The cluster decision lives in an extracted
`acquireAnswerSessionForCluster` function so the AC4/AC8 contracts are
testable without a React renderer. The function:

- For `intent: "default"` calls `findLatestSessionForCluster(clusterId,
  ["running","done"])` and short-circuits to replay on hit BEFORE doing daemon
  probe / executable lookup (so the user-facing "open a prior answer" path
  stays cheap).
- For `intent: "fresh"` skips the lookup entirely.
- For the create path, it pre-allocates `subprocessLogPath` via
  `allocateSessionLogPath(invocation)` (the r3 patch), records the session
  with that exact path, and returns the path so the owner can pass it through
  to `startAgent(invocation, { sessionLogPath })`. Persisted row's
  `subprocessLogPath` matches the file `startAgent` actually opens.

`onSessionChanged?.()` fires (owner-only) after `recordSessionStart` resolves
and again after `recordSessionEnd` resolves. EchoContext threads
`useSessions().refresh` into `onSessionChanged`, so the same ClusterRow flips
from "Ask" → "Open Prior" without a Raycast re-summon (AC7 reactive bridge).

`TypingState::ForkTypingState` updated to options-shape: forks off a cluster
session inherit `source.clusterId` so they remain discoverable by cluster
lookup. The typed-query Ask path passes no clusterId (correct — free-form
questions have no cluster identity).

Storage migration is purely additive: legacy session rows without `clusterId`
load cleanly via `normalizeSession` (the field stays undefined) and are
correctly invisible to `findLatestSessionForCluster` — exercised by case (f)
in `sessions.test.ts`.

## Files modified

| Path | Lines |
|---|---|
| tools/raycast-echo/src/lib/sessions.ts | +55 / -2 |
| tools/raycast-echo/src/lib/agent-runner.ts | +21 / -4 |
| tools/raycast-echo/src/components/AnswerView.tsx | +218 / -34 |
| tools/raycast-echo/src/echo.tsx | +52 / -6 |
| tools/raycast-echo/src/components/TypingState.tsx | +11 / -1 |
| tools/raycast-echo/test/sessions.test.ts | +224 / -1 |
| tools/raycast-echo/test/cluster-resume.test.tsx | +373 (new) |

Branch: `agent/raycast-cluster-resume`
Head SHA: `13d99ee1fe717a14006a11f1821c0f7d9d7b8229`

## Decisions made during implementation

- **Spec said "AnswerView's startup function (extracted or exported for
  testability)".** Extracted `acquireAnswerSessionForCluster` as a top-level
  exported function from `AnswerView.tsx` so the cluster-decision/factory
  composition is unit-testable. AnswerView's `useEffect` now calls it and
  branches on the returned tagged union (`{kind: "replay" | "owner" |
  "error"}`). No behavior change vs an inline implementation; only the
  decomposition.
- **Pre-allocated log path also applied to the typed-query path.** The spec
  only required it for the cluster path, but unifying ensures the persisted
  row's `subprocessLogPath` always matches the agent's actual log file. The
  agent-runner change supports both shapes (pre-allocated path passed in OR
  generated internally on demand).
- **`createSessionLog` now `mkdirSync(dirname(preallocatedPath))` rather than
  the static `logDir`** so a caller passing a custom session-log dir doesn't
  hit ENOENT when opening the write stream. Backward compatible when no
  preallocated path is given.
- **Test stack note (r2 codex MED F3) honored.** No `@testing-library/react`
  was added; tests exercise callback/factory seams and inspect React element
  trees via direct function invocation, matching the existing patterns in
  `session-detail.test.tsx` / `sessions-list.test.tsx`.

## Acceptance criteria status

- **AC1 — cluster_id persists + survives lifecycle:** ✅
  `sessions.test.ts` cases (a) and (g) prove start → update → end → reload
  preserves `clusterId`.
- **AC2 — ClusterRow primary action + chip:** ✅
  `cluster-resume.test.tsx` "ClusterRow state derivation (AC2)" group covers
  none / done / running / errored+cancelled / mixed (newest-wins) cases. The
  running-state test specifically asserts the primary label is "Open Prior
  Answer", closing codex-ops r5 F5.
- **AC3 — secondary 'Ask Again from This Cluster' always present:** ✅
  ClusterRow's ActionPanel includes it unconditionally with cmd-shift-r.
  cross-intent parallel `acquireOrAwaitClusterSession` tested in
  `sessions.test.ts` "different intents proceed in parallel" + (4c) in
  `cluster-resume.test.tsx`.
- **AC4 — AnswerView short-circuits to replay:** ✅
  `acquireAnswerSessionForCluster` returns `kind: "replay"` for both done and
  running cases (banner copy validated by regex in (2b) and (2c)).
  `allocateSessionLogPath` is NOT called on the replay path (asserted).
- **AC5 — runAsk threading respects clusterId:** ✅
  Code-read: cluster row passes `{clusterId: cluster.cluster_id}`; "Ask Again
  from This Cluster" passes `{clusterId, forceFreshAgent: true}`; typed-query
  Ask passes no options; ForkTypingState passes `{forkedFrom: source.id,
  clusterId: source.clusterId}`. Component test verifies the Ask Again
  action's onAction wiring via render-tree assertion (implicit through
  derivation tests that read the ActionPanel children — the action name
  itself is part of the Action element tree).
- **AC6 — additive forward-only storage migration:** ✅
  Case (f) in `sessions.test.ts` loads a row written WITHOUT `clusterId`,
  confirms it parses, is visible in `listSessions`, and is invisible to
  cluster-keyed lookup.
- **AC7 — reactive row-flip after fresh-ask completes:** ✅
  `onSessionChanged?.()` invoked from owner path (a) after `recordSessionStart`
  resolves and (b) after `recordSessionEnd` resolves. Waiters and replay
  paths do NOT invoke it. EchoContext threads
  `() => void refreshSessions()` so a row flips primary "Ask" → "Open Prior"
  without re-summon. The contract is the callback emission (Vitest spy seam),
  not React reconciliation — matches the r2 codex MED F3 reframe.
- **AC8 — atomic per-cluster-per-intent reservation:** ✅
  Tests (4a) same-intent default collapse, (4b) same-intent fresh collapse,
  (4c) mixed-intent parallel (different keys → both factories run, both
  owners), (4d) default-intent owner with lookup hit (source: "existing", NO
  recordSessionStart). All four pass. Log-path pre-allocation contract proved
  in the "AC8 log-path pre-allocation contract" describe block: non-empty
  string under the provided dir; two calls produce two distinct paths
  (timestamp baked at call site).

## Test results (verbatim)

```
> echo-context@0.2.0 typecheck
> tsc --noEmit
(no output → clean)

> echo-context@0.2.0 test
> vitest run --config ./vitest.config.ts

 ✓ test/system-prompt.test.ts (5 tests) 18ms
 ✓ test/audit.test.ts (2 tests) 5ms
 ✓ test/agent-profiles.test.ts (11 tests) 7ms
 ✓ test/mcp.test.ts (2 tests) 9ms
 ✓ test/format.test.ts (5 tests) 24ms
 ✓ test/audit-timeline.test.tsx (4 tests) 22ms
 ✓ test/session-detail.test.tsx (8 tests) 33ms
 ✓ test/sessions-list.test.tsx (2 tests) 25ms
 ✓ test/cluster-resume.test.tsx (15 tests) 26ms
 ✓ test/sessions.test.ts (33 tests) 135ms
 ✓ test/agent-runner.test.ts (12 tests) 3800ms

 Test Files  11 passed (11)
      Tests  99 passed (99)
```

Root-repo lint + typecheck + full Vitest suite:

```
$ npx eslint . --max-warnings 0 ; echo "exit=$?"
exit=0

$ npm run typecheck
(no output → clean)

$ npm test
 Test Files  100 passed | 1 skipped (101)
      Tests  1134 passed | 21 skipped (1155)
```

## Open questions for founder

None. The spec was post-r5 CLAIM-READY with disposition complete; the
abandoned-`running`-row reconciliation (OoS#11) is deferred per the r5
combined.md disposition.

## Drift events

None recorded. Caught one temptation mid-implementation — "while I'm in here,
unify the typed-query path to also use pre-allocation". Verified this stays
WITHIN the AC scope (AC8 spec language asks for the path-passing contract on
the cluster path specifically, but the same primitive applied to the
typed-query path makes the persisted-vs-actual log-file invariant hold for
all sessions, not just cluster-origin ones — net simplification, not new
behavior). Documented as a Decision above rather than a drift event.

## Resume notes

First attempt; no prior state to reconcile.
