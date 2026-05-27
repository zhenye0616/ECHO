# Agent Run — 2026-05-26-076-packaged-echoctl-install-boundary

## Summary

Implemented the packaged `echoctl` install boundary on branch `agent/packaged-echoctl-install-boundary` at `ad4757ddf81a75f120cc4e59968c8f5d5d220ac9`.

The branch makes `echoctl` installable as an npm-packed global CLI, adds a packaged `echoctl daemon` launchd lifecycle surface, copies SQL migrations into `dist/`, ships the runtime coord config/schema files, and adds the install/upgrade/reset documentation.

## Implementation Notes

- Updated `package.json` to `echoctl@0.1.0`, `private: false`, Node `>=22`, runtime-only `files`, and `prepack -> build:cli`.
- Added `scripts/copy-sql-migrations.js` for byte-copying SQL migrations into `dist/storage/migrations/`.
- Added `src/cli/commands/daemon.ts` with install/start/stop/restart/status/logs/uninstall, XML-safe plist rendering, atomic plist lint/write, launchd `bootstrap`/`bootout`, runtime preflight, health probing, bootout-on-timeout, and test isolation overrides.
- Replaced `scripts/launchd/install.sh` with a packaged CLI delegate and updated uninstall to use `launchctl bootout`.
- Extended the packaged shell smoke to install from a tarball, launch an isolated daemon, probe `/mcp`, assert status/log/data-dir/db-path overrides, verify `coord_invoke` packaged de-scope, and clean up without touching production.
- Added `docs/echoctl-install.md` for install, daily use, upgrade, reset, full removal, and upgrade semantics.

## Verification

- `npm run build:cli` passed.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npx vitest run tests/cli/daemon.test.ts tests/cli/shell-reachable.test.ts` passed.
- `npm pack --pack-destination /private/tmp/echo-076-pack` passed outside the sandbox after direct sandboxed `npm pack` hit TS emit `EPERM`.
- `npm test` passed: 135 files passed, 1433 tests passed, 21 skipped.
- `git diff --check` passed.
- Confirmed no leftover `com.echo.daemon.test-*` launchd jobs after smoke runs; production `com.echo.daemon` remained loaded.

## Notes for Review

- `coord_invoke` remains de-scoped by omission of review-queue runner scripts from the package; the packaged daemon returns the existing wrapper-not-found `isError` response.
- The smoke uses a probed free port in the 40000-49999 range and retries `daemon status` briefly after a successful direct MCP initialize, because the full suite runs many MCP servers in parallel.
