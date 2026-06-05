# Agent Run — 2026-06-05-090-adopt-selftest-onboarding-harness

## What I Implemented

- Added `echoctl selftest` as a packaged CLI subcommand with human and JSON reporters.
- Implemented a hermetic selftest runner that creates throwaway `HOME`, `ECHO_HOME`, `CODEX_HOME`, data dir, DB path, log dir, and launchd label.
- Made the throwaway daemon bind with `ECHO_MCP_PORT=0`, read the resolved port from daemon lifecycle output, and thread that resolved port to MCP and CLI checks.
- Added fake-runner voting tests for JSON check IDs, exit-code contract, 38478 sentinel safety, concurrent selftests, and cleanup on success/failure/timeout.
- Added a quarantined `tests/windows-compat.test.ts` red board with skipped/todo rows for 091/Ring-2.
- Added `.github/workflows/ci.yml` with voting `quality` matrix and wholly non-voting `onboarding` packed-artifact selftest matrix.

## Files Modified

- `.github/workflows/ci.yml` — new CI skeleton: quality matrix + non-voting packed onboarding matrix.
- `src/cli/commands/selftest.ts` — new selftest command and injectable runner.
- `src/cli/index.ts` — selftest import/help/dispatch.
- `tests/cli/selftest.test.ts` — voting fake-runner unit tests.
- `tests/windows-compat.test.ts` — quarantined compat board.

Branch: `agent/adopt-selftest-onboarding-harness`

Head SHA: `c98641f00d113ec3a3bb4f127ad09fa8f101359c`

## Decisions Made During Implementation

- Kept the real end-to-end selftest visible but non-voting: local voting tests use injected fakes and never spawn the daemon.
- Kept `--port` out of the selftest CLI surface so production runs cannot accidentally target `38478`; the runner always starts the daemon with `ECHO_MCP_PORT=0`.
- Used the existing daemon lifecycle JSON log as the resolved-port source, avoiding daemon changes.
- Did not run the real `echoctl selftest` locally because 090 intentionally quarantines the real onboarding legs until 091 fixes the known cross-platform/BOM/launchd rows.

## Acceptance Criteria Status

- AC1: Passing. `selftest` is wired into `echoctl`, exports stable check IDs, and has fake-runner tests for JSON shape and exit codes.
- AC2: Passing. Selftest uses throwaway state, daemon `:0`, resolved-port threading, sentinel/concurrency tests, and cleanup tests.
- AC3: Passing. CI has voting `quality` and non-voting packed-artifact `onboarding`.
- AC4: Passing. Windows red board is skipped/todo; voting selftest tests are fake-runner only.
- AC5: Passing. No compat fixes, release workflow, `echo-fix`, `src/util/*`, wiki, docs status/backlog, or backlog body edits.

## Test Results

Focused:

```text
npx vitest run tests/cli/selftest.test.ts tests/windows-compat.test.ts
Test Files  1 passed | 1 skipped (2)
Tests  9 passed | 4 skipped | 2 todo (15)
```

Typecheck:

```text
npm run typecheck
tsc --noEmit
exit 0
```

Lint:

```text
npm run lint
eslint . --max-warnings 0 && npm run lint:task-state
exit 0
```

Build:

```text
npm run build:cli
copy-sql-migrations: copied 1 file(s) to .../dist/storage/migrations
exit 0
```

Full suite:

```text
npm test
Test Files  147 passed | 2 skipped (149)
Tests  1564 passed | 25 skipped | 2 todo (1591)
Duration 111.48s
```

Pack:

```text
npm pack --pack-destination /private/tmp/echo-090-pack
echoctl-0.1.0.tgz
Tarball includes dist/cli/commands/selftest.js and dist/cli/commands/selftest.d.ts.
exit 0
```

Whitespace:

```text
git diff --check --cached
exit 0
```

## Open Questions For Founder

None.

## Drift Events Caught

None.
