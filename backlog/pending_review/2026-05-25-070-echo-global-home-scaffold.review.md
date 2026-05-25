---
item_id: 2026-05-25-070-echo-global-home-scaffold
verdict: merge as-is
reviewed_at: 2026-05-25T17:30:00Z
test_counts: { passed: 1191, failed: 0, skipped: 21 }
---

## Verdict
Implementation is faithful to the spec on every load-bearing point: `wx`-flag absent-only writes (not check-then-write), env-override at module load via `isNonEmptyString`, frozen `ECHO_HOME_PATHS`, Ajv strict-false compile at load, non-fatal daemon wiring after PID lock and before extractor `Promise.all`, and `existsSync`-tracked `created_dirs` accounting. All six new tests pass; full suite 1191 passed / 21 skipped; lint and typecheck clean. No scope drift, no unsafe surfaces. Reviewer (claude/superpowers:code-reviewer): `merge as-is`.

## Acceptance status
- **AC1 paths.ts** — Met. `src/echo-home/paths.ts:1-4` minimal imports; `ECHO_HOME_PATHS` frozen at `:10-18`; env override mirrors `lifecycle.resolveDataDir` via `isNonEmptyString` (`:6-8`); all four schema interfaces (`:20-48`); two Ajv validators exported (`:107-111`); no I/O at import.
- **AC2 scaffold.ts** — Met. `writeFileSync(..., { flag: 'wx' })` at `scaffold.ts:22` with `EEXIST` swallow `:24-26`; other errors re-thrown; `mkdirSync` recursive `:12`; `created_dirs` snapshot `:10-14`; return shape matches spec `:4-8`.
- **AC3 daemon non-fatal wiring** — Met. `src/daemon/index.ts:46-56` — call placed after `acquirePidLockOrExit(dataDir)` (line 44) and before the extractor `Promise.all` (line 58+); try/catch with `createLogger('daemon.echo-home')`; `echo_home_initialized` logged only when arrays are non-empty.
- **AC4 tests** — Met. `tests/echo-home/paths.test.ts` 3 cases + `tests/echo-home/scaffold.test.ts` 3 cases; all 6 pass; `vi.resetModules()` discipline observed.

## Pre-merge fixups
- (none — verdict is merge as-is)

## Expected merge conflicts
- `src/daemon/index.ts` — none expected. Main is unchanged since 067 (`4e17baa`); the inserted block sits cleanly between two stable anchors.
- New subtree `src/echo-home/`, `tests/echo-home/` — no pre-existing files; pure-additive. If 071 lands first, conflicts under `src/echo-home/` are additive — resolve by union (071 adds `roles.ts` + `index.ts`; 070 adds `paths.ts` + `scaffold.ts`; no file-level overlap).

## Follow-up items (defer, do not block merge)
- Consider hoisting the duplicate `process.env['ECHO_HOME']` read in `paths.ts:6-8` to a single local for clarity.
- After 071 also lands, evaluate R2 (lazy Ajv compile threshold) per the spec's own guidance.
- Cosmetic: `scaffold.ts:16-18` uses `'code' in err` narrowing; `(err as NodeJS.ErrnoException).code` is the more common shape elsewhere in this repo.

## Open questions for founder
(none — verdict is merge as-is)
