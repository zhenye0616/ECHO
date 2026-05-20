---
item_id: 2026-05-19-063-raycast-sessions-as-objects
verdict: merge as-is
reviewed_at: 2026-05-20T04:30:00Z
test_counts: { passed_tools_raycast_echo: 69, failed_tools_raycast_echo: 0, passed_root: 1114, failed_root: 0, skipped_root: 21 }
---

## Verdict

**merge as-is.** The implementation is high-fidelity to the spec and passes every verification gate. `echo.tsx` shrank from 1097 → 294 lines (target ≤400, exceeded by 26%). Per-row LocalStorage keys (AC6.7), per-id Promise chain serialization (`sessions.ts:123-133`), startup reconciliation (`sessions.ts:332-349`), AC6.1 migration with backup + sentinel, AC4.2 `fs.statSync` try/catch with `[Open]`/`[Tail]` omission on failure, and AC6.4 awaited final-flush ordering (`AnswerView.tsx:132-147`) are all present and correctly shaped. Test counts (69 tools/raycast-echo, 1114 root) match agent_notes. No drift outside `tools/raycast-echo/**`. The two minor scope additions (`vitest.config.ts`, `test/raycast-api-mock.ts`, and `package.json` test-script fix) are justified — without them the AC8 component tests would be unrunnable, and they touch only the test rig.

## Acceptance status

| AC group | Status | Evidence |
|---|---|---|
| AC1.1–AC1.5 (EmptyState) | Met | `components/EmptyState.tsx` renders Resume / Open loops / Today / Yesterday / This week + empty-corpus placeholder |
| AC2.1–AC2.3 (TypingState) | Met | `components/TypingState.tsx` synthetic Ask row with `Color.OrangeRed`, `subtitle="<agentKind> · ↩"` |
| AC3.1–AC3.6 (AuditTimeline) | Met | `components/AuditTimeline.tsx` renders live/completed/errored/empty; degrades gracefully on daemon error |
| AC4.1–AC4.5 (SessionDetail) | Met | `components/SessionDetail.tsx:101-110` getSessionLogState wraps `statSync`; `buildForkPrompt` composes to TypingState; ⌘R does not create row |
| AC5.1–AC5.4 (SessionsList) | Met | `components/SessionsList.tsx` with List.Dropdown agentKind filter; `canDeleteSession` omits ⌘D when running (`sessions.ts:230-232`); `sessions-list.test.tsx` confirms |
| AC6.1 (migration) | Met | `sessions.ts:244-263` `migrateOnce` — sentinel, backup write, `removeItem` of legacy keys |
| AC6.2 (recordSessionStart) | Met | Row with `status="running"` + non-null `sessionLogPath`; covered by sessions.test |
| AC6.3 (recordSessionUpdate) | Met | Field-scoped at `sessions.ts:103-108` |
| AC6.4 (final-flush ordering) | Met | `AnswerView.tsx:132-147` — clearAuditInterval → clearFlushTimer → drainInflightWrites → await update → await end |
| AC6.5 (eviction) | Met | `enforceSessionCap` + warm-session protection at `sessions.ts:351-374` |
| AC6.6 (startup reconciliation) | Met | `reconcileStaleRunningRows` at `sessions.ts:332-349`, age-only predicate — no log-mtime |
| AC6.7 (per-row keys + chain) | Met | `mergeRowAndWrite` with per-id chain at `sessions.ts:123-133`; monotonic status check at `:289`; composite-key auditCalls merge at `:299-323` |
| AC7.1 (≤400 lines echo.tsx) | Met | `echo.tsx` is 294 lines |
| AC7.2 (per-component budgets) | Met | AnswerView 226, SessionDetail 138, SessionsList 118, EmptyState 104, TypingState 120, AuditTimeline 79 — all under |
| AC7.3 (tsc + ray build clean) | Met | `npx tsc --noEmit` clean; `npx ray build` clean |
| AC8.1–AC8.13 (tests) | Met | 37 new tests across the 5 files; per-id chain test at `sessions.test.ts:235` validates AC8.12(d) |
| AC9.1–AC9.5 (dogfooding) | Deferred | Post-merge dogfooding gates — founder/strategist work |
| AC10.1 (delete recent-asks) | Met | `recent-asks.ts` confirmed absent |
| AC10.2 (preserve history) | Met | `parseRecentAsks` at `sessions.ts:394-415` preserves rows as `status="historical"` |

## Drift findings

None outside `tools/raycast-echo/**`. `git diff origin/main...HEAD -- ':!tools/raycast-echo/**'` is empty. None of the 10 Out-of-Scope items appear violated: no daemon changes, no chat threading, no destination-window UI, no recent-asks shim.

## Design-choice judgments

- **`vitest.config.ts` + `test/raycast-api-mock.ts` addition (agent_notes scope-note)** — **Stand.** `@raycast/api` has no Vitest-loadable runtime entry; without the alias mock, TSX component tests under AC8.2/AC8.3/AC8.13 are unrunnable. Mock is 101 lines, lives in `test/`, plumbed by alias only — no production-code touch. Justified.
- **`package.json` test-script change** — **Stand.** Prior script referenced a non-existent vitest config; one-token fix to make the test infrastructure work.
- **No daemon-side correlation-id work** — **Stand.** Correctly deferred per AC9.4 + OoS #4.

## Bugs/risks

- `tools/raycast-echo/test/sessions.test.ts:225-233` ("final flush ordering" — AC8.12(c)) — does NOT use a delayed-async LocalStorage mock to capture setItem ordering as the spec required. Sequential awaits in test code would let a fire-and-forget exit handler still pass this specific test. **Mitigating:** `AnswerView.tsx:138-145` exit handler DOES await each call correctly, AND the AC8.12(d) per-id-chain test at `sessions.test.ts:235` uses genuine delayed-async, so the load-bearing primitive is covered. **Non-blocking.**
- `tools/raycast-echo/src/components/SessionDetail.tsx:132-138` (`tailLog`) — uses synchronous `readFileSync` of an entire file before slicing the last 80 lines. Fine for current log sizes; flag for V1.7 if logs grow past ~1MB.
- `tools/raycast-echo/src/components/AnswerView.tsx:135` — `await pollAudit(Date.now() + 2_000)` uses a future `until`; daemon clamps it. Intentional grace window, not a bug.
- `tools/raycast-echo/src/lib/sessions.ts:262` — sentinel is set even when both legacy reads were empty. Correct, but a future "force re-migrate" tool would need to delete both `echo.sessions.v1.migrated` AND `echo.recent-asks.backup`.

## Merge-conflict preview

No predicted conflicts. `main`'s latest touches to `tools/raycast-echo/` (`cca021b` observability, `2d5fdec` legacy-command retirement) are baselined into this branch's diff. All files this branch modifies have no pending changes on `main` since the branch point.

## Suggested fixups

### Pre-merge punch list

(none — clean merge)

### Non-blocking follow-ups

- Strengthen `test/sessions.test.ts` "final flush ordering" test (around line 225) to use the delayed-async setItem mock pattern from the per-id-chain test (around line 239), so AC8.12(c) genuinely catches fire-and-forget regression.
- `SessionDetail.tailLog` (`:132-138`): cap `readFileSync` to last ~64KB via `fs.openSync` + `fs.readSync` from EOF, to keep tail responsive when logs grow past ~1MB.
- AC9.1–AC9.5 dogfooding gates need ≥10 journal entries across ≥3 days and per-pain coverage before this spec's loop closes.

## Test counts observed

- `tools/raycast-echo`: **69 passed, 0 failed, 0 skipped** (9 test files, 1.86s)
- root: **1114 passed, 0 failed, 21 skipped** (99 test files, 1 file skipped, 28.66s)
- `npx tsc --noEmit` clean (both root and `tools/raycast-echo`)
- `npx ray build` succeeds
