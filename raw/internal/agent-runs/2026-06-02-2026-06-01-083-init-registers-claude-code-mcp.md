---
backlog_item: 2026-06-01-083-init-registers-claude-code-mcp
agent_run_started: 2026-06-02T07:31:36Z
agent_run_ended: 2026-06-02T07:55:12Z
status: ready_for_review
test_status: passing
branch: agent/init-registers-claude-code-mcp
head_sha: 2d64e40e2c242fd794f5eca0594eb4f234ff1c2f
---

# Agent Run: 083 Claude Code MCP Registration During Init

## What I Implemented

Implemented the scoped Claude Code MCP registration fix for `echoctl init`.

- Added `src/echo-home/adapters/claude-code-mcp.ts`, a bounded, non-interactive `claude mcp add --transport http --scope user echo <url>` adapter.
- Threaded Claude Code's resolved `mcpServerUrl` through `wire()` and `syncAll()` so both interactive and `--answer-file` init paths register through the same wire step.
- Kept registration best-effort and visible as a wire action: success, CLI missing, timeout, generic error, and duplicate `already-exists (unverified)` are surfaced without treating duplicate output as health.
- Updated init and doctor remediation copy to print the exact user-scope add command plus the local-shadow escape hatch `claude mcp remove echo -s local`.
- Hardened `tools/foreign-install-smoke.sh` with a fake `claude` shim and a hard argv assertion for the exact registration command.
- Updated install docs to describe automatic user-scope registration and troubleshooting-only shadow removal.

## Files Modified

Branch: `agent/init-registers-claude-code-mcp`
Head SHA: `2d64e40e2c242fd794f5eca0594eb4f234ff1c2f`

- `src/echo-home/adapters/claude-code-mcp.ts` — new adapter for bounded Claude CLI registration.
- `src/echo-home/adapter-sync.ts` — async per-agent dispatch for best-effort Claude MCP registration.
- `src/echo-home/wizard/wire.ts` — includes Claude Code MCP URL in profiles/cache and exposes test deps.
- `src/cli/commands/init.ts` — exact remediation copy.
- `src/cli/commands/doctor.ts` and `src/cli/io/render.ts` — doctor text remediation for failed agent probes.
- `tools/foreign-install-smoke.sh` — fake Claude shim + hard argv assertion.
- `docs/echoctl-install.md` — automation and troubleshooting copy.
- `tests/cli/init.test.ts`, `tests/cli/doctor.test.ts`, `tests/echo-home/wizard/wire.test.ts` — coverage for registration argv, duplicate, timeout, missing CLI, doctor copy.

## Decisions Made During Implementation

- Chose the spec's J1 lean: registration lives in the `wire()` path through a small adapter module, not as an init-only side effect. This makes interactive init, answer-file init, and the foreign-install smoke exercise the same registration path.
- Kept duplicate and failure outcomes as successful wire actions with warning-like action labels instead of `AgentResult.ok=false`. Reason: `wired_at` needs to be set so probe/doctor remain the health authority; making duplicate an adapter failure would prevent later doctor probes from running for that agent.
- Did not parse `claude mcp get`, inspect `~/.claude.json`, or attempt shadow resolution. The only parsing is the immediate `mcp add` duplicate message needed to label an exit-1 duplicate as `already-exists (unverified)`.

## Acceptance Criteria Status

- [x] AC1 — `echoctl init` selected `claude-code` now registers via `claude mcp add --transport http --scope user echo <resolved-url>` through wire; Codex/Cursor paths unchanged.
- [x] AC2 — init and doctor print the exact user-scope add command plus `claude mcp remove echo -s local` fallback.
- [x] AC3 — missing CLI is non-fatal, duplicate is surfaced as `already-exists (unverified)`, timeout is bounded and non-fatal, stdin is ignored in the real spawn.
- [x] AC4 — foreign-install smoke has a fake `claude` shim and hard-fails if recorded argv differs from `mcp add --transport http --scope user echo <url>`.
- [x] AC5 — install doc removes manual registration as an install step and documents user scope plus local-shadow troubleshooting.
- [x] AC6 — focused tests, typecheck, lint, build, and full `npm test` passed. The first full run hit an external production-HEAD race in an unrelated test; standalone rerun and a second full run passed.
- [x] AC7 — no files outside `files_to_modify` were touched.

## Test Results

Focused tests:

```text
RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--init-registers-claude-code-mcp

✓ tests/cli/doctor.test.ts (4 tests) 303ms
✓ tests/echo-home/wizard/wire.test.ts (15 tests) 418ms
✓ tests/cli/init.test.ts (21 tests) 629ms

Test Files  3 passed (3)
Tests  40 passed (40)
```

Typecheck:

```text
> echoctl@0.1.0 typecheck
> tsc --noEmit
```

Lint:

```text
> echoctl@0.1.0 lint
> eslint . --max-warnings 0 && npm run lint:task-state

> echoctl@0.1.0 lint:task-state
> python3 tools/task-state/lint.py
```

Build:

```text
> echoctl@0.1.0 build:cli
> tsc -p tsconfig.cli.json && node scripts/copy-sql-migrations.js

copy-sql-migrations: copied 1 file(s) to /Users/zhenye/Desktop/Project_echo--init-registers-claude-code-mcp/dist/storage/migrations
```

Smoke script syntax:

```text
bash -n tools/foreign-install-smoke.sh
# exit 0
```

Full suite, first attempt:

```text
Test Files  1 failed | 141 passed | 1 skipped (143)
Tests  1 failed | 1495 passed | 21 skipped (1517)

FAIL tests/review-queue/053-completed-at-coercion.test.ts
AssertionError: production repo HEAD changed during 053 AC3.2
Expected: "0556b1585e4a8795bf622265554b1287a2536978"
Received: "9b06a45504da0f268e1ce03fba66a62e46b3c712"
```

The two SHAs were external review-queue journal commits for item 084 that advanced `main` during the full-suite run. Standalone rerun:

```text
✓ tests/review-queue/053-completed-at-coercion.test.ts (6 tests) 6120ms

Test Files  1 passed (1)
Tests  6 passed (6)
```

Full suite, second attempt:

```text
Test Files  142 passed | 1 skipped (143)
Tests  1496 passed | 21 skipped (1517)
Duration  73.67s
```

Formatting check:

```text
npm run format:check
# failed repo-wide: Code style issues found in 108 files
```

This is pre-existing broad Prettier drift across many files outside this item. I did not run a formatter or introduce unrelated formatting churn.

## Open Questions for Founder

None.

## Drift Events Caught

None. I did not implement active shadow detection, direct `~/.claude.json` mutation, probe reorder, auto-login, new clients, daemon runtime hardening, or installer magic.

## Next Suggested Backlog Items

- None from implementation. The spec already defers active local/user shadow detection to follow-up planning if dogfooding shows it is needed.
