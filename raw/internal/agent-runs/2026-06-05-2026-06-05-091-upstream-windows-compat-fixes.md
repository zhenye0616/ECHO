---
backlog_item: 2026-06-05-091-upstream-windows-compat-fixes
agent_run_started: 2026-06-05T21:18:19Z
agent_run_ended: 2026-06-05T21:40:30Z
status: needs_input
test_status: failing
---

# Agent Run: 091 Upstream Windows Compat Fixes

## What I Implemented

Implemented the Ring-1 compatibility fixes on `agent/upstream-windows-compat-fixes` at `a25d62e25abe3fa4dbacead1aa852419d7a32947`: BOM-tolerant JSON parsing, path separator/prefix normalization, Windows command resolution for default spawns, OS-appropriate daemon data dirs, and non-Darwin manual-daemon behavior for daemon/doctor surfaces. The implementation is pushed, but the handoff is blocked because full `npm test` reproduced an unrelated-looking timeout twice.

## Files Modified

- `src/util/json.ts` — new BOM-tolerant JSON parse/read helper.
- `src/cli/commands/init.ts` — answer-file and onboarding-state reads use the helper.
- `src/capture/sources.ts` — capture-sources parse uses the helper; path membership normalizes separators/case and enforces segment boundaries.
- `src/storage/memory.ts` — path-like `source`/`source_prefix` comparisons normalize separators while logical prefixes such as `coord:` remain raw string prefixes.
- `src/util/subprocess.ts` — new pure `resolveCommand(cmd, deps)` Windows PATHEXT resolver.
- `src/echo-home/wizard/probe.ts` — default spawn routes through `resolveCommand`; injected `deps.spawn` seam unchanged.
- `src/echo-home/adapters/claude-code-mcp.ts` — default spawn routes through `resolveCommand`; injected `deps.spawn` seam unchanged.
- `src/daemon/lifecycle.ts` — `resolveDataDir`/`resolveDbPath` support Darwin, Windows, Linux, and env override precedence.
- `src/cli/commands/daemon.ts` — adds `DaemonDeps.platform`; non-Darwin start/stop/status avoid `launchctl` and report manual-daemon mode.
- `src/cli/commands/doctor.ts` — adds `platform` seam for OS-aware daemon pid path.
- `tests/windows-compat.test.ts` — un-quarantines Ring-1 F4/R1/R2/data-dir assertions; keeps Codex-skill Ring-2 todo.
- `tests/util/json.test.ts`, `tests/util/subprocess.test.ts`, `tests/cli/daemon.test.ts`, `tests/cli/doctor.test.ts` — focused coverage for new helpers and non-Darwin behavior.

## Decisions Made During Implementation

### Decision 1: Treat Windows-looking paths as case-insensitive in host-neutral tests

- **Options considered:** only case-fold when `process.platform === 'win32'`; or case-fold paths that are syntactically Windows-like as well.
- **Chose:** case-fold when running on Windows or when the compared path looks Windows-like (`C:/...` / UNC).
- **Why:** the spec requires Windows case-fold behavior, and the tests run on a POSIX host with injected Windows-looking paths.
- **Worth founder review?** No.

### Decision 2: Make non-Darwin daemon control a clean manual-mode no-op

- **Options considered:** return non-zero but clearer errors; or return zero with manual-daemon status/no-op messages.
- **Chose:** return zero for non-Darwin `start`/`stop`/`status`, never calling `launchctl`.
- **Why:** AC4 explicitly says the ubuntu/Windows selftest must not red-board on absent launchd; the daemon is expected to be manually run for Ring-1.
- **Worth founder review?** No.

## Acceptance Criteria Status

- [x] AC1 — BOM-tolerant reader applied at answer-file, onboarding-state, and capture-sources parse sites; focused tests pass.
- [x] AC2 — path-bearing compares normalize separators/case and enforce segment boundaries; focused tests pass.
- [x] AC3 — Windows subprocess resolver added with pure injected-deps seam; default spawn call sites route through it; focused tests pass.
- [x] AC4 — OS-appropriate data dir + no-launchctl manual daemon behavior implemented; focused daemon/doctor tests pass.
- [x] AC5 — release-path grep is clean; no `echo-fix` / `echo-windows-fix` references in normal release paths.
- [ ] AC6 — blocked: `npm run typecheck`, `npm run lint`, focused vitest, and isolated recent-calls vitest pass, but full `npm test` timed out twice in `tests/mcp/recent-calls-endpoint.test.ts`.
- [x] AC7 — no drift: Ring-2 Codex-skill and Scheduled-Task work left as todo/out-of-scope.

## Tests Run

```text
$ npx vitest run tests/windows-compat.test.ts tests/util/json.test.ts tests/util/subprocess.test.ts tests/cli/daemon.test.ts tests/cli/doctor.test.ts
Test Files  5 passed (5)
Tests  41 passed | 1 todo (42)
```

```text
$ npm run typecheck
> echoctl@0.1.0 typecheck
> tsc --noEmit
[exit 0]
```

```text
$ npm run lint
> echoctl@0.1.0 lint
> eslint . --max-warnings 0 && npm run lint:task-state
> echoctl@0.1.0 lint:task-state
> python3 tools/task-state/lint.py
[exit 0]
```

```text
$ grep -rIn 'echo-fix\|echo-windows-fix' package.json scripts/ .github/workflows/ tsconfig*.json
[exit 1: no matches, expected for AC5]
```

```text
$ npm test
× GET /mcp/recent-calls > logs every runtime-registered tool through the wrapper
  → Test timed out in 15000ms.
[process did not exit after the timeout; Vitest tree was killed]
```

```text
$ npx vitest run tests/mcp/recent-calls-endpoint.test.ts
Test Files  1 passed (1)
Tests  2 passed (2)
Duration  12.50s
```

```text
$ npm test
× GET /mcp/recent-calls > logs every runtime-registered tool through the wrapper
  → Test timed out in 15000ms.
[same full-suite timeout reproduced; Vitest tree was killed]
```

## Open Questions for Founder

1. The implementation appears complete, but should 091 proceed to review with the full-suite timeout treated as an existing load-sensitive test flake, or should this item stay blocked until `tests/mcp/recent-calls-endpoint.test.ts` is stabilized under full-suite concurrency?

## Anything I Almost Did But Stopped Myself

- I considered increasing the timeout or changing `tests/mcp/recent-calls-endpoint.test.ts`, but that file is not listed in `files_to_modify` and the test passes in isolation. Stopped per the file-scope and repeated-test-failure rules.

## Next Suggested Backlog Items (Don't Auto-Create)

- Stabilize `tests/mcp/recent-calls-endpoint.test.ts` under full-suite concurrency, or mark its timeout behavior as an explicit known flake with a targeted owner.
