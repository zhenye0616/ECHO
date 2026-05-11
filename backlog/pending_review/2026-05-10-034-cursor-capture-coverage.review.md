---
item_id: 2026-05-10-034-cursor-capture-coverage
verdict: merge as-is
reviewed_at: 2026-05-11T03:25:00Z
test_counts: { passed: 671, failed: 0, skipped: 21 }
head_sha_verified: c00a7e7a1eaf10c1cb0e3d7567203ec8895a624b
---

## Verdict

**merge as-is.** The implementation faithfully realizes the R2 final contract end-to-end: WAL-family mtime guard (R2 HIGH #1 fix is load-bearing AND tested with a real WAL-only mtime advance at `tests/capture/extractors/cursor.test.ts:1085-1103`), four ≤30-line pure parsers exported for tests, codeBlocks body-guard rejecting path-only entries, `bubble_text_sources?` parallel-array contract (omitted in 99% case, present per-bubble in mixed clusters), `__testHooks` seam, `unref()`-ed interval, no env var, no chokidar/normalize drift, all 17 new tests outside the quarantined `describe.skip` block. Tests 671 pass / 21 skip / 0 fail; lint and typecheck clean. Both agent soft-notes are judged acceptable. Zero merge-conflict risk against `main` (no main-side commits to the three touched files since merge-base `cc30883`).

## Acceptance status

| AC | Status | Evidence |
|---|---|---|
| AC1 — `CURSOR_REPOLL_INTERVAL_MS = 15_000` constant, exported | Met | `src/capture/extractors/cursor.ts:30` |
| AC1 — `repollIntervalMs` option, no env var | Met | `cursor.ts:752` (grep confirms zero `process.env` references) |
| AC1 — `maxGlobalDbFamilyMtime()` MAX of `.vscdb` + `-wal` + `-shm` | Met | `cursor.ts:491-503` (loop over 3 paths) |
| AC1 — `triggerRepollExtraction()` bypasses debounce | Met | `cursor.ts:885-892` (calls `schedule()` directly) |
| AC1 — `handleGlobalChange(reason)` single log; chokidar dispatch log-free | Met | `cursor.ts:810-811`, `:909-915` |
| AC1 — `setInterval` `unref()` + `clearInterval` in `stop()` | Met | `cursor.ts:894-900`, `:932` |
| AC2 — 4 pure parsers (≤30 lines, never throw, exported) | Met | `cursor.ts:224-305` |
| AC2 — codeBlocks body-guard rejects path-only | Met | `cursor.ts:277-295`; NEG test `:812-829` |
| AC2 — Fallback precedence text → toolFormer → fileDiff → codeBlocks → thinking | Met | `cursor.ts:351-381` |
| AC2 — `bubble_text_sources?` parallel array (omitted when all `'text'`) | Met | `cursor.ts:640, 653-655` |
| AC2 — Stale streaming-continuation comment updated (R1 Finding 5) | Met | `cursor.ts:599-604` |
| AC3 — 10 AC2 fixture cases (a–j) incl. path-only NEG + precedence pin | Met | `tests/capture/extractors/cursor.test.ts:728-941` |
| AC3 — 4 AC1 unit tests via `__testHooks` incl. WAL-only mtime (R2 HIGH #1) | Met | `:982-1104` (Test 4 at `:1085-1103`) |
| AC3 — 3 integration tests w/ 8-pair fixture | Met | `:1110-1262` |
| AC3 — All new tests outside `describe.skip` quarantine | Met | quarantine at `:384` unchanged; new describes at `:728, 947, 1110, 1266` are top-level |

## Pre-merge fixups

_None — verdict is merge as-is._

## Expected merge conflicts

_None._ `git log merge-base..main` shows zero commits touching `src/capture/extractors/cursor.ts`, `tests/capture/extractors/cursor.test.ts`, or `tests/fixtures/cursor-globalstorage.ts` since merge-base `cc30883`. Clean merge.

## Follow-up items (defer, do not block merge)

- **AC4 dogfooding** (post-merge founder/strategist task per spec): run two Cursor agent-mode review sessions; apply AC4 capture-rate formula; log to `raw/internal/dogfooding/mcp-interactions-journal.md`. If real-world `toolFormerData` shapes don't match the inferred precedence (`text → result → rawArgs → stringified params`), file a narrow follow-up to re-tune `tryExtractToolFormerText`.
- **AC5 strategist wiki promotion** (post-complete): `wiki/capture/cursor-extractor.md` cadence + bubble-shape subsections; `wiki/capture/per-app/cursor-collected-data.md` `bubble_text_sources` field row; flip "Cursor capture-cadence gap" in `backlog/_followups.md` to resolved.
- **`triggerRepoll` race self-coalescing.** Two concurrent ticks could pass the mtime guard with the same `current` value and both enqueue; the `processing` chain serializes them so correctness holds (per-bubble `lastSeenMap` makes the second scan idempotent), but a minimal `inFlight: boolean` guard would dedupe. Non-blocking.
- **Cosmetic log-field-name divergence.** R1 finding's text said `tick_reason`; implementation uses `reason`. Spec body wording was generic. If any downstream log-grep parses this field, rename; otherwise leave.
- **`safeMtimeMs` vs `maxGlobalDbFamilyMtime` asymmetry** (`cursor.ts:480` returns `Date.now()` on stat failure; the new helper returns 0). The new helper's behavior is correct; the legacy helper predates 034. Worth a note if a future refactor unifies them.

## Open questions for founder

_None. Verdict is unambiguous merge as-is._
