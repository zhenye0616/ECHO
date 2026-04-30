# Run log: 2026-04-30-006-capture-pipeline

**Agent:** Mac.attlocal.net-zhenye
**Branch:** agent/006-capture-pipeline
**Head SHA:** 27e1c52111676349a004d022b00a3c54b552124d
**Started:** 2026-04-30T21:14:52Z

## What I implemented

A single new file `src/capture/pipeline.ts` exporting `processCandidate(event, storage)` and the `PipelineResult` discriminated union. The function calls the existing `gate(event)`; on reject it returns `{ accepted: false, reason }` reusing `RejectionReason` from gate.ts (no new strings); on accept it constructs an `Omit<CaptureEvent, 'id'>` from the validated fields (source, timestamp, content, optional metadata — any caller-supplied id is dropped) and awaits `storage.append`, returning the resolved id.

`tests/capture/pipeline.test.ts` covers: accept path → storage count increases by 1 and result.id matches the stored row; metadata round-trips; caller-supplied id is dropped; reject path for each of the four `unknown_*` reasons leaves storage at count 0; malformed events (null, {}, missing source, unknown kind) leave storage at count 0; two storage instances passed in separately don't share state (DI proof).

## Files modified

| File | Lines | Notes |
|---|---|---|
| `src/capture/pipeline.ts` | +37 | new |
| `tests/capture/pipeline.test.ts` | +156 | new |

## Decisions made

- **Field-by-field projection on accept** rather than spread + `Reflect.deleteProperty('id')`. The CandidateEvent shape is just `{source, timestamp, content, metadata?}` per gate.ts; explicitly extracting these fields and only forwarding `metadata` when defined keeps the projection narrow and matches MemoryStorage's behavior of preserving `metadata: undefined` as truly absent (verified by the storage test that asserts `metadata` is `undefined` when not supplied).
- **Test fixture: same allowlist-mutation pattern as gate.test.ts.** The spec note offered "(a) inject through a shimmed predicate" or "(b) wait for item 009". I chose runtime-mutation of `CAPTURED_SOURCES` (with afterEach reset via `resetAllowlist`) — this is the established pattern in the existing gate.test.ts and matches its intent: extend the allowlist for the duration of one test, reset cleanly. Did NOT modify the production `sources.ts` file.
- **No new dependencies.** Pure code on top of existing types.

## Acceptance criteria status

| Criterion | Status |
|---|---|
| `processCandidate(event, storage)` exported from `src/capture/pipeline.ts` | ✅ |
| Returns `PipelineResult`: `{ accepted: true; id }` or `{ accepted: false; reason }` | ✅ |
| Rejection reasons reuse gate's `RejectionReason` type (no new strings) | ✅ — direct re-export |
| On accept: calls `storage.append(event_minus_id)`; returns the EventId | ✅ |
| On reject: storage is untouched (asserted via `count()` before/after) | ✅ — three test cases assert this |
| Storage is dependency-injected; no module-level singleton | ✅ — `Storage` is the second function parameter |
| Tests cover accept / reject / malformed | ✅ — 10 tests in 4 describe blocks |
| Tests use `MemoryStorage` | ✅ |
| `npm run test` clean | ✅ — 84/84 passing |
| `npm run lint` clean | ✅ |
| `npm run typecheck` clean | ✅ |

## Test results (verbatim)

```
> vitest run

 ✓ tests/smoke.test.ts (1 test) 3ms
 ✓ tests/storage/memory.test.ts (16 tests) 15ms
 ✓ tests/capture/sources.test.ts (20 tests) 12ms
 ✓ tests/logging/index.test.ts (9 tests) 33ms
 ✓ tests/capture/pipeline.test.ts (10 tests) 13ms
 ✓ tests/capture/gate.test.ts (28 tests) 28ms

 Test Files  6 passed (6)
      Tests  84 passed (84)
```

## Open questions for founder

None.

## Drift events caught

None. Stayed strictly within `files_to_modify` (two new files); did not touch gate.ts, sources.ts, storage interface, or MemoryStorage. Did not introduce any new dependency or rejection reason.
