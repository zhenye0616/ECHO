# Agent run — 2026-07-07-125-observability-hardening-batch

- **Item:** `2026-07-07-125-observability-hardening-batch`
- **Branch:** `agent/observability-hardening-batch`
- **Worktree:** `~/Desktop/Project_echo--observability-hardening-batch`
- **Claim commit:** `1935d3a3945df8ea1bba738c87358e40139ce0cd`
- **Head SHA:** `95afbf4ba1b19afc0dfe97550cdca69753666e92`
- **Outcome:** complete — all ACs pass; full gate green.

## What was implemented

Five bounded observability-hardening gaps surfaced by 123's review + first live
trace. No new features, no schema changes, no changes to 123's persisted
contracts (card-atom metadata shape, `capture_status` tri-state,
`card_atom_status` values).

### AC1 — channel-aware seed lookup (`tools/trace-card.ts`)
- Added `seedStorePathForChannel(channelId)`: terminal sentinel →
  `terminalSeedStorePath()` (`.terminal.json`), every other/undefined channel →
  `granolaIntakeSeedStorePath()` (default). Imported `TERMINAL_CHANNEL_SENTINEL`
  + `terminalSeedStorePath` from `tools/intake-terminal.ts` (single source of
  truth for the sentinel + filename; import is side-effect-free behind the house
  entry guard).
- `traceOneCandidate` now resolves the seed store from the card atom's
  `channel_id` before reading the seed — so a terminal card's seed is read from
  `.terminal.json`, closing the live-trace bug where AC1-123's provenance-loss
  banner could never fire for terminal cards.
- `runTraceCard` builds a per-path-cached resolver: `--seed-store <path>`
  override forces one store for all channels + the `--note` scan; otherwise
  channel-aware resolution + the full enumerated set.
- `TraceInput` extended with optional `resolveSeedStore` + `seedStores`;
  `seedStore` retained as the fallback so existing callers are unchanged.

### AC2 — proxy stream error handlers (`src/brain/brain.ts`)
- `createHttpRetrievalCapture`: added error handlers on BOTH streams — `cres`
  (downstream, the brain child) attached before any write, and `ures`
  (upstream, the ECHO MCP server) attached in the response callback. A
  mid-stream destroy in either direction now records a capture failure
  (`finish()` throws → `capture_failed` per the 123 contract) instead of
  emitting an unhandled EPIPE/ERR_STREAM_DESTROYED that crashes the worker.
- Writes guarded against write-after-end; the downstream write is wrapped so a
  destroyed-downstream error is caught whether it throws synchronously or emits
  asynchronously. `writeHead`/`end` guarded against a destroyed `cres`.

### AC3 — card-atom double-append guard (`src/enrich/granola-intake-candidates.ts`)
- `emitIntakeCardAtom` now does a bounded card-source existence check by
  `dedupe_key` and skips the append when the atom already exists — closing the
  **sequential** markPosted-throw retry edge (append succeeds, `markPosted`
  throws, seed returns to pending, retry re-emits). A guard-query failure
  degrades to a best-effort append (prior behavior). NOT atomic; concurrent-tick
  double-append is a documented blind spot (intake is single-flight) — not built
  (would require a persisted-store atomic unique-append, out of scope).

### AC4 — `--note` seed listing (`tools/trace-card.ts`)
- When a note has no card atoms, `traceNote` scans the full enumerated
  seed-store set (default + terminal) for the note's seed records and lists
  them, deduped by candidate_key. An explicit `--seed-store` override narrows
  the scan to that single store. A missing/unreadable store is walked as empty.

### AC5 — render cosmetics + present-db proof
- `tools/loop-dashboard.ts`: `heartbeatLine` counters segment now routes both key
  and value through `esc()`.
- `src/enrich/granola-intake-candidates.ts`: comment on the single-flight guard
  documenting abandoned-not-cancelled semantics (an in-flight run that times
  out / outlasts the interval is left to complete, never force-killed;
  `stop()` awaits it).
- `tests/tools/trace-card.test.ts`: REQUIRED present-db byte-identity test — a
  full trace against a present scratch `echo.db` leaves the db file
  byte-identical (SELECT-only read path).

## Design calls (flagged for reviewer)

1. **`seedStorePathForChannel` maps undefined/unknown channel → default store.**
   The card-atom path always has a `channel_id`; undefined only arises for the
   no-card-atom candidate trace, where default matches historical behavior.
2. **AC3 "bounded query" = scoped to the card source (`GRANOLA_INTAKE_CARD_SOURCE`),
   no artificial `limit`.** `metadata_match` can't filter `dedupe_key` (not in
   `METADATA_MATCH_KEY_WHITELIST`, and widening that whitelist would be an
   interface change out of scope). Card atoms are low-volume; a `limit` would
   trade correctness (missing an older existing atom) for a marginal scan bound.
   Mirrors trace-card's existing source-scoped scan pattern.
3. **AC2 downstream test asserts capture_failed OR partial-capture.** Whether a
   destroyed-downstream write surfaces an error (→ `capture_failed`) or is
   silently discarded (→ partial capture) is OS-timing dependent; the 123
   contract explicitly allows either. The load-bearing invariant — no unhandled
   process error — is asserted by a `guarded` wrapper. The upstream test asserts
   `capture_failed` deterministically (RST → `ures` 'error').
4. **AC1 exercised at three levels:** pure unit (`seedStorePathForChannel` /
   `enumerateSeedStorePaths`), wiring (`buildCardTrace` with an injected
   resolver), and end-to-end (`runTraceCard` with `setEchoHomeRoot` to a scratch
   home, terminal card + terminal-only seed, no override).
5. **Imported from `tools/intake-terminal.ts` into `tools/trace-card.ts`.** Not
   in `files_to_modify` (import-only, no modification). Chosen over duplicating
   the `'terminal'` sentinel + `.terminal.json` filename as magic strings.

## Files modified

- `src/brain/brain.ts`
- `src/enrich/granola-intake-candidates.ts`
- `tools/trace-card.ts`
- `tools/loop-dashboard.ts`
- `tests/tools/trace-card.test.ts`
- `tests/enrich/brain-retrieval-capture.test.ts`
- `tests/enrich/granola-intake-card-atom.test.ts`

## Acceptance per criterion

- **AC1** ✅ — channel-aware resolution + `--seed-store` override + banner; unit,
  wiring, and e2e tests pass.
- **AC2** ✅ — both stream directions handled; two named tests (`item 125 AC2`),
  no unhandled error under `guarded`; upstream deterministically `capture_failed`
  (verified 4× no flake).
- **AC3** ✅ — sequential retry reproduced; exactly one atom after retry.
- **AC4** ✅ — terminal-only pre-123 note lists its seed without an override.
- **AC5** ✅ — `esc()` on counters; abandoned-not-cancelled comment; present-db
  byte-identity test.
- **AC6** ✅ — `npm run lint` (max-warnings 0) clean, `npm run typecheck` clean,
  `npm test` = 2087 passed / 21 skipped / 1 todo, 0 failures (both known flakes
  passed under full-suite load).

## Test output (gate)

```
lint:      eslint . --max-warnings 0 && lint:task-state  → clean
typecheck: tsc --noEmit                                  → clean
npm test:  Test Files 199 passed | 1 skipped (200)
           Tests 2087 passed | 21 skipped | 1 todo (2109)
           Duration 156.16s
```

## Open questions / drift events

- None. No scope expansion; no drift events. Out-of-scope items (atomic
  unique-append primitive, proxy-bypass detection, dashboard features,
  classifier/brain retrieval changes) were not touched.
