# Agent run — 2026-07-04-113-signal-window-interface

- **Agent:** builder-113 (Claude Code)
- **Branch:** agent/signal-window-interface
- **Worktree:** ~/Desktop/Project_echo--signal-window-interface
- **Claim commit:** a21ad82257663c81f56aa87c31ac05c9755609cc
- **head_sha:** 6fc709ca2cc685fc4685b6688f5832cad7f2bf72

## What I implemented

`getSignalWindow` — the fork-1 "one door" internal seam — plus the generalized
durable append-order storage seam it stands on.

- **`src/trace/signal-window.ts` (NEW):** `getSignalWindow(storage, opts)` returns
  one ordered `SignalWindowEntry[]` = the union of raw events (normalized via the
  existing `src/normalize` adapters) and derived atoms, full fidelity. Each entry
  carries `id`, `sequence_id`, `source`, `timestamp`, untruncated `content`/`metadata`,
  and a `normalized` projection (`null` for atoms with no adapter — `fs:*`, `derived:*`).
  Two orderings: event-time `(timestamp DESC, id DESC)` when `cursor` absent;
  durable append-order (half-open `sinceSeq`) when `cursor.sinceSeq` set. No returned
  next-cursor (caller-derived `max(seq)+1`). Exported scope→source-prefix table
  `SCOPE_SOURCE_PREFIXES` (machine = fs:/git:; company = api:granola/derived:). Loop
  filter = dumb `metadata.canonical_subject` string-equality. `limit` applied LAST,
  after every predicate + ordering. No `src/mcp/internal` import; no AI call.
- **`src/storage/interface.ts`:** added required `iterateAtomsByAppendOrder` +
  `getCurrentSequence` (optional `sourcePrefixes` filter, half-open `sinceSeq`,
  `AtomIterationRecord`). `CoordAtomIterationRecord` is now an alias of
  `AtomIterationRecord`. Coord methods retained.
- **`src/storage/sqlite.ts` / `src/storage/memory.ts`:** implemented the generic
  seam (rowid / insertion-counter parity); reimplemented the coord methods as
  `sourcePrefixes: ['coord:']` wrappers — external coord behavior unchanged.

## Files modified

In `files_to_modify` (or its PROVISIONAL tests/ globs):
- src/trace/signal-window.ts (NEW, ~200 lines)
- src/storage/interface.ts, src/storage/sqlite.ts, src/storage/memory.ts
- tests/storage/signal-window-append-order.test.ts (NEW)
- tests/trace/signal-window.test.ts (NEW)
- tests/trace/signal-window-import-closure.test.ts (NEW)

Outside `files_to_modify` — mechanical interface-conformance only (2 new required
Storage methods force every Storage implementor to compile; PROVISIONAL list did
not enumerate them):
- src/echo-home/wizard/atom-store-readonly.ts — 2 `throw wizardScopeError()` stubs
- tests/echo-home/wizard/{detect-agents,run-wizard,detect-projects}.test.ts — FakeStore stubs (return [] / 0)
- tools/{render-trace,serve-trace,stream-watch}.ts — delegate to `this.inner`
- tests/packaging/packed-manifest.test.ts — inline snapshot regenerated to add
  `dist/trace/signal-window.{js,d.ts}` (the new shipped module; +2 lines only)

## Acceptance criteria status

- AC1 union + entry shape + caller-derived cursor + no wire caps — PASS
- AC2 scope mapping (one exported table) — PASS
- AC3 generalized append-order seam + watermark + coord non-regression — PASS
- AC4 late-arrival (cursor returns old-ts atom; event-time excludes) — PASS
- AC5 determinism (deep-equal x2 + after unrelated-scope append) — PASS
- AC6 loop filter string-equality + import-closure — PASS

## Test results (observed)

- `npm run typecheck` — clean (exit 0)
- `npm run lint` (eslint --max-warnings 0 + lint:task-state) — clean (exit 0)
- Targeted `vitest run` (4 files): 42 passed (signal-window contract 9,
  import-closure 3, storage parity 14, iterate-coord non-regression 16).
- Full `npm test` (`vitest run`): after packed-manifest snapshot regen —
  1912 passed, 21 skipped, 1 todo, 0 failed (the sole pre-regen failure was
  that snapshot pinning the shipped file set; regenerated to include the new module).

## Decisions a reviewer should judge

1. **`normalized` field on each entry.** AC1's "reusing the existing source
   adapters" / "Normalization location" is only meaningful if entries carry an
   adapter projection; I added `normalized: NormalizedContextEvent | null`
   (null when no adapter). Raw untruncated content/metadata always present too.
2. **`getSignalWindow(storage, opts)`** (storage as first arg) — follows the
   repo convention (`getRecentWorkContext(storage, params)`); spec wrote
   `getSignalWindow(opts)`. Returns a bare `SignalWindowEntry[]` ("one ordered list").
3. **Scope is prefix-based per AC2**, so `company` includes ALL `derived:*`
   (incl. `derived:granola-signals-index`), not only the two named in AC1.
4. **Loop = strict `===`** on `metadata.canonical_subject`, no `normalizeSubject`
   on the loop arg (spec: "string-equals it", "dumb by contract").
5. **Coord reimplemented on the generic seam** (not left parallel) — per the
   After-Completion note. `tests/storage/iterate-coord-by-append-order.test.ts`
   stays green unchanged.
6. **Event-time mode materializes the in-scope set then sorts in JS** (no
   storage-level limit pushdown) so `limit` applies after all filters. No
   caching (decision 12: measured slowness first) — acceptable V0 tradeoff.

## Open questions

None blocking. Items 1–6 above are design calls flagged for review, not blockers.

## Drift events

None.
