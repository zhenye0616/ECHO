---
backlog_item: 2026-05-10-034-cursor-capture-coverage
agent_run_started: 2026-05-11T05:39:10Z
agent_run_ended: 2026-05-11T05:55:00Z
status: ready_for_review
test_status: passing
agent_persona: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405 (Claude Code)
branch: agent/cursor-capture-coverage
head_sha: c00a7e7a1eaf10c1cb0e3d7567203ec8895a624b
worktree: ~/Desktop/Project_echo--cursor-capture-coverage
---

# Agent Run: Cursor capture coverage — mid-stream bubble cadence + tool-call bubble parsing (M1-1)

## What I Implemented

All three builder-scope ACs (AC1, AC2, AC3) of item 034. AC4 is post-merge dogfooding (founder/strategist territory) and AC5 is a strategist wiki-promotion task.

**AC1 — Periodic re-poll for the global state.vscdb family.** Added `CURSOR_REPOLL_INTERVAL_MS = 15_000` source constant (override via `CursorExtractorOptions.repollIntervalMs`; no env var). New `triggerRepollExtraction()` closure inside `startCursorExtractor` reads the family-max mtime via the new `maxGlobalDbFamilyMtime()` helper (MAX of `state.vscdb`, `-wal`, `-shm` per R2 Codex HIGH #1), short-circuits when the mtime hasn't advanced beyond the closure-local `lastSeenScanMtime` checkpoint (auto-initialized at extractor start), and otherwise calls `schedule(() => handleGlobalChange('repoll'))` directly — bypassing `scheduleGlobalChange()`'s `debounceTimer` guard, which is correct for chokidar-burst coalescing but would silently drop poll ticks racing with a pending debounce. `setInterval` lifecycle wired into start; `clearInterval` in `stop()` precedes `await watcher.close()` and `await processing`. Interval is `unref()`'d so the test process can exit cleanly. `handleGlobalChange()` now takes `reason: 'repoll' | 'chokidar'`, logged once at function entry; chokidar `dispatch()` path stays log-free.

**AC2 — Tool-call / non-text bubble fallback chain.** Added four top-level pure parsers next to `parseBubbleRow`, exported for tests, ≤30 lines each, every shape mismatch returns `null` (parser is a boundary; throws here would crash an extractor tick): `tryExtractToolFormerText` (tries `text` → `result` → `rawArgs` → stringified `params`), `tryExtractFileDiffText` (`attachedHumanChanges.fileDiff` as string / array / object), `tryExtractCodeBlocksText` (with body guard from R1 Codex Finding 2 — requires non-empty `entry.content` OR `entry.code`; rejects path-only entries so `extractReferencedFiles`' shape isn't reused as fake assistant prose), `tryExtractThinkingText` (string or `{ text: string }` shape). `parseBubbleRow` extended: primary `v.text` non-empty wins (preserves 99% existing behavior), else first-non-empty fallback in deterministic precedence (`toolFormerData → fileDiff → codeBlocks → thinkingContent`); records `text_source` per bubble. `CursorTurn` gains optional `bubble_text_sources?: BubbleTextSource[]`, parallel to `assistant_bubble_ids`, **present only when ≥1 bubble used a fallback parser, omitted when every bubble used primary `'text'`** (R1 Codex Finding 1 — plural per-bubble, not singular). Emitted into metadata in `handleGlobalChange` when present. Stale streaming-continuation comment in `extractCursorTurns` updated per R1 Codex Finding 5 — the previous "`agentKv:` schema rewrite is the proper fix" line was empirically corrected on 2026-05-09 (chat turns remain in `bubbleId:`/`composerData:`; `agentKv:blob:` is content-addressed dedupe storage). One-line semantic comment update; no logic change to the fast-forward branch.

**AC3 — Test coverage.** 17 new test cases across three new `describe` blocks, all OUTSIDE the existing `describe.skip('startCursorExtractor (lifecycle + integration)')` quarantine (which stays as-is per item 023). All AC1/AC3 tests use the R2 `__testHooks` seam contract — `CursorExtractorOptions.exposeTestHooks: true` populates `handle.__testHooks` with `triggerRepoll() / getLastSeenScanMtime() / setLastSeenScanMtime(value)`, double-underscore-prefixed to mark as test-only. AC2 parse-gap revert uses the separately-kept `__disableToolCallFallbacks?: boolean` option (parsers are closure-local pure functions; no other clean hook). Tests use `vi.useFakeTimers()` to keep both the periodic-`setInterval` and the chokidar 300ms debounce-`setTimeout` from ever firing, so manually-triggered `triggerRepoll()` calls cleanly drive the extraction without cross-contamination.

## Files Modified

- `src/capture/extractors/cursor.ts` — +257/-13 lines (AC1 + AC2 + comment cleanup)
- `tests/capture/extractors/cursor.test.ts` — +494/-3 lines (17 new test cases across 4 new describes; outside the chokidar quarantine block)
- `tests/fixtures/cursor-globalstorage.ts` — +20/-4 lines (`FixtureBubble` extended with optional `toolFormerData`, `attachedHumanChanges`, `thinkingContent`, and `codeBlocks` body fields `content` / `code`; `text` made optional so AC2 fallback fixtures can omit it)

Branch: `agent/cursor-capture-coverage` at `c00a7e7a1eaf10c1cb0e3d7567203ec8895a624b` (pushed to origin).

## Decisions Made During Implementation

### Decision 1: Use `triggerRepoll()` for both AC3 revert sub-tests rather than adding a 4th `__testHooks` method

- **Spec text:** "Manually invoke a SINGLE `handleGlobalChange('chokidar')` after seeding the FIRST 2 pairs to simulate one chokidar dispatch tick."
- **Tension:** The R2 `CursorExtractorTestHooks` interface explicitly enumerates exactly 3 methods (`triggerRepoll`, `getLastSeenScanMtime`, `setLastSeenScanMtime`). Adding a 4th method to expose `handleGlobalChange` directly would diverge from the pinned contract.
- **Resolution:** Used `triggerRepoll()` for the cadence-revert single-tick simulation. The test's contract is "one extraction tick captures only the first 2 pairs; the remaining 6 sit uncaptured without a second tick" — which is identical behavior whether the reason string is `'repoll'` or `'chokidar'`. The `reason` parameter only affects the `log.debug('tick', {reason})` line; both paths call the same downstream `extractCursorTurns` → `processCandidate` chain. The cadence-gap is proved by the count assertion (≥3 pairs missing), not by the log reason.
- **Worth founder review?** Worth a glance — strict-spec readers could ask why the test doesn't literally invoke `handleGlobalChange('chokidar')`. The functional equivalence is what makes this safe.

### Decision 2: `unref()` the periodic-poll `setInterval`

- **Spec text:** Doesn't mandate either way — just says "Started via `setInterval(triggerRepollExtraction, CURSOR_REPOLL_INTERVAL_MS)` inside `startCursorExtractor`".
- **Reason:** Without `unref()`, the held interval keeps the Node event loop alive, which causes vitest worker processes to hang at end of suite (the watcher's `stop()` clears the interval, but in test contexts where a handle isn't `stop()`'d, the worker can't exit).
- **Worth founder review?** No — standard Node liveness pattern; the chokidar watcher already owns "extractor is alive" semantics.

### Decision 3: Extend `tests/fixtures/cursor-globalstorage.ts` rather than build a parallel fixture

- **Spec text:** "Test isolation: `tests/capture/extractors/cursor.test.ts` already drives the extractor against in-memory SQLite fixtures (review the existing test file before adding new ones — there's likely a `makeBubbleRow()` or `seedDb()` helper to reuse)."
- **Reason:** The existing `FixtureBubble` shape supported only `text`, path-only `codeBlocks`, `attachedFileCodeChunksUris`, and `deletedFiles`. AC2 fixtures need `toolFormerData`, `attachedHumanChanges.fileDiff`, `codeBlocks` with `content`/`code` body fields, and `thinkingContent`. Extending the existing shape (additive optional fields) is the smallest cohesive change; building a parallel fixture would duplicate `composerValue` / `bubbleValue` plumbing.
- **Worth founder review?** No — purely additive test-helper extension; existing tests still pass unchanged because every existing fixture has `text` set.

### Decision 4: AC1 unit-test pattern — `repollIntervalMs: 60_000` plus `vi.useFakeTimers()` belt-and-suspenders

- **Spec text:** "Tests use a small value (e.g., 50 ms) to exercise the loop deterministically without slowing the suite."
- **Reason:** Fake timers on their own would prevent the interval from firing, but the interval-handle is created during `startCursorExtractor` via `setInterval(...)`. With a small value (e.g., 50 ms) and fake timers, the handler fires only when fake timers advance — but tests don't advance fake timers, so it never fires either way. A 60_000 ms value is a defensive belt-and-suspenders so even if a future test removes `vi.useFakeTimers()` the interval still won't fire during the <100ms test window.
- **Worth founder review?** No — equivalent end-state to spec's "small value"; the test contract is "tests trigger the loop manually via `__testHooks.triggerRepoll()`" which both choices satisfy.

### Decision 5: Existing prettier-warn baseline — auto-formatted my new test file only

- **Observation:** Running `prettier --check src tests …` on `main` flags 52 pre-existing files. My branch initially flagged 53; the new file (`tests/capture/extractors/cursor.test.ts`) was the regression.
- **Resolution:** Ran `prettier --write tests/capture/extractors/cursor.test.ts` to bring the file in line. Did NOT touch the 52 pre-existing flagged files (out of scope; would dilute the diff). Branch now matches baseline (52 flagged).
- **Worth founder review?** No — purely cosmetic; the broader prettier-debt is project housekeeping orthogonal to 034.

## Acceptance Criteria Status

- [x] **AC1 — Periodic re-poll for the global state.vscdb family** — passing (4 unit tests including WAL-only mtime test from R2 Codex HIGH #1)
- [x] **AC2 — Tool-call / non-text bubble extraction** — passing (10 fixture cases a-j + direct parser unit tests)
- [x] **AC3 — Test coverage** — passing (17 new test cases, all outside the chokidar quarantine; quarantine stays unchanged per item 023)
- [N/A] **AC4 — Dogfooding verification** — post-merge, founder/strategist territory per spec ("NOT a builder task post-merge")
- [N/A] **AC5 — Wiki + followups housekeeping** — post-merge strategist task per spec

## Tests Run

```
$ ./node_modules/.bin/vitest run tests/capture/extractors/cursor.test.ts
RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--cursor-capture-coverage

 ✓ tests/capture/extractors/cursor.test.ts (49 tests | 11 skipped) 128ms

 Test Files  1 passed (1)
      Tests  38 passed | 11 skipped (49)
   Duration  997ms

$ ./node_modules/.bin/vitest run
 Test Files  41 passed | 1 skipped (42)
      Tests  671 passed | 21 skipped (692)
   Duration  15.90s

$ ./node_modules/.bin/tsc --noEmit
(clean — no output)

$ ./node_modules/.bin/eslint . --max-warnings 0
(clean — no output)

$ ./node_modules/.bin/prettier --check src tests …
Code style issues found in 52 files. (matches main baseline)
```

The 11 skips inside `cursor.test.ts` are the pre-existing `describe.skip('startCursorExtractor (lifecycle + integration)')` chokidar quarantine block from item 023; explicitly out-of-scope per AC3 ("Do NOT add tests inside the quarantine block — that block stays quarantined per item 023"). The 21 total skipped across the suite include those 11 plus 10 pre-existing skips elsewhere; baseline matches.

## Open Questions for Founder

None blocking. Two soft notes for review pass:

1. **Decision 1 above** (using `triggerRepoll()` instead of literal `handleGlobalChange('chokidar')` in the cadence-revert test) — confirm acceptable. Behavioral equivalence held in the test, but a strict-spec read could ask for a 4th `__testHooks` method to invoke chokidar's reason directly.
2. The `tryExtractToolFormerText` precedence (`text → result → rawArgs → stringified params`) was inferred from common Cursor `toolFormerData` shapes; the parser is defensive (returns null on shape mismatch). If real Cursor `toolFormerData` ever has additional commonly-used fields, the precedence may want re-tuning. AC4 dogfooding will surface this if it bites.

## Anything I Almost Did But Stopped Myself

No drift events. The "Out of Scope (Don't Drift)" section had 7 explicit don't-touch rules; all held:

- Did NOT touch `src/normalize/adapters/cursor.ts` (sibling follow-up, separately tracked).
- Did NOT add `tail_session` repo-scoping or `workspace_id` filter (item 035 candidate).
- Did NOT extract `agentKv:blob:` content (would either dupe `bubbleId:` or leak system prompt).
- Did NOT touch chokidar setup (`awaitWriteFinish`, `ignoreInitial`, watched paths).
- Did NOT change `DEBOUNCE_MS` or `scheduleGlobalChange`'s short-circuit-on-`debounceTimer` semantics (the fix is additive via a separate entry path).
- Did NOT reduce `orphan_assistant_bubble` warning frequency further (V1.5.7 fix stays).
- Did NOT promote `bubble_text_sources[]` to the normalize layer.
- Did NOT change capture-time mtime semantics (`turn.mtime` still records `safeMtimeMs(globalDbPath)`; the new `lastSeenScanMtime` is a poll-side guard checkpoint, distinct from the per-turn mtime stamp).

One in-scope mechanical fixup that the spec called out as "in-scope while touching this file" — the stale streaming-continuation comment in `extractCursorTurns` — was applied. One-line semantic update; no logic change to the fast-forward branch.

## Pre-Run State Note (Founder, please read)

When `/process-backlog` started, the main repo had two uncommitted Codex dogfooding-journal entries (2026-05-10 22:34 + 23:10 PDT) sitting in the working tree, blocking `git pull --rebase`. Per the dogfooding discipline rule in CLAUDE.md ("Commit the .md and .html together"), I committed those first as `d53c18b` ("journal: sync Codex 2026-05-10 22:34 + 23:10 PDT entries (R2 wait + corroboration)") so the atomic-claim flow could proceed. That commit landed on `main` before the `claim:` commit and is purely a journal sync of pre-existing Codex content.

## Next Suggested Backlog Items (Don't Auto-Create)

Surfaced during implementation (not auto-created — founder decides):

- A small `wiki/operating-model/cross-tool-spec-review.md` page documenting the convergence-at-severity / divergence-at-prescription pattern that R2 saw at HIGH severity on AC4's capture-rate formula. The 034 spec's R2 review-history table already captures the pattern in body-text; promoting to a generic wiki page would let future cross-tool reviews reference it as prior art. (Strategist task, post-merge — already mentioned in the 034 spec's "After Completion" section as a possible promotion.)
- A pure-function unit test for `maxGlobalDbFamilyMtime` itself (currently exercised indirectly via the AC1 Test 4 WAL-only flow). Low-priority; the indirect coverage is sufficient and adding a direct test would just duplicate the family-of-three stat() calls.
