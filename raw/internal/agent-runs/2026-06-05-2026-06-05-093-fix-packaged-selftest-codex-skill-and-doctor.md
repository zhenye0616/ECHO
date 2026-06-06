---
backlog_item: 2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor
agent_run_started: 2026-06-05T23:36:10Z
agent_run_ended: 2026-06-06T00:06:05Z
status: needs_review
test_status: partial
---

# Agent Run: 093 - Packaged selftest Codex skills + DOC-02 + poll-until-recall

## What I Implemented

Implemented 093 on `agent/fix-packaged-selftest-codex-skill-and-doctor` at `0ce61a001beb8e45a224c34008ea6ed7ce9d1919`.

Implementation landed:
- Added a Codex skill second-hop that materializes shipped `assets/echo-skills/*.md` into `<codexHome>/skills/<name>/SKILL.md` with Codex `name:` frontmatter.
- Made `using-echo-mcp.md` a required Codex skill source for wiring. Missing or unreadable source fails before any Codex skill, marker, or config write.
- Made Codex default paths honor `CODEX_HOME`, including the skills directory, so packaged selftest isolation is real.
- Replaced the fixed capture-settle `sleep(4000)` with bounded `search_memories` polling up to 10000ms at 500ms intervals.
- Diagnosed DOC-02: under the clean packaged selftest runtime, `doctor --json` can report `daemon.mcpReachable: true` while exiting 1 because overall health is degraded by agent probes. Selftest now keeps DOC-02 focused on MCP reachability only when ECHO state is OK and the degradation is specifically agent-probe related.

## Files Modified

- `src/echo-home/adapters/skill-sync.ts` - Codex SKILL.md second-hop, required source validation, Codex frontmatter rendering.
- `src/echo-home/adapter-sync.ts` - Codex skills wiring, `CODEX_HOME` default path support, hard-fail before marker/config writes.
- `src/cli/commands/selftest.ts` - poll-until-recall and DOC-02 MCP reachability diagnosis handling.
- `tests/echo-home/adapters/skill-sync.test.ts` - Codex second-hop unit coverage.
- `tests/echo-home/adapter-sync.test.ts` - orchestrator coverage for Codex skill creation and missing-source failure.

Branch: `agent/fix-packaged-selftest-codex-skill-and-doctor`

Head SHA: `0ce61a001beb8e45a224c34008ea6ed7ce9d1919`

## Decisions Made During Implementation

### Codex second-hop stays in adapter sync

- **Observed:** packaged assets already include flat `assets/echo-skills/*.md`, but packaged wiring stopped at `~/.echo/skills`.
- **Chose:** add `syncCodexSkills` beside existing skill sync helpers and call it from the Codex adapter path.
- **Why:** the spec explicitly made this an adapter responsibility, not a dev-only installer script.
- **Worth founder review?** No.

### Required `using-echo-mcp` fails hard

- **Observed:** `WIR-06`/`SKILL-02` can false-pass on dev machines if a prior Codex skill install exists.
- **Chose:** validate required source existence, regular-file shape, readability, and profile inclusion before creating target directories or writing Codex marker/config files.
- **Why:** a tarball missing `using-echo-mcp.md` is broken and should not wire "successfully".
- **Worth founder review?** No.

### DOC-02 tracks MCP reachability, not full doctor health

- **Observed:** packaged `doctor --json` reached the throwaway MCP daemon but exited 1 because overall health was `degraded` by agent probe outcomes in the clean runtime.
- **Chose:** treat DOC-02 as passing when `mcpReachable=true`, ECHO state is schema version 1, no sync lock is present, and the only degradation signal is agent probes.
- **Why:** DOC-02's selftest label and 090 harness intent are MCP reachability. A clean packaged runtime should not require external agent CLIs to make this specific check pass.
- **Worth founder review?** Yes. This is a selftest semantics clarification, not a `doctor` behavior change.

### Full-suite flake left out of scope

- **Observed:** exact `npm test` repeatedly timed out in `tests/mcp/recent-calls-endpoint.test.ts` only under full-suite load; the same file passed in isolation.
- **Chose:** document the non-green full-suite command instead of editing unrelated MCP test timeout/infrastructure.
- **Why:** 093 explicitly leaves full-suite flake handling out of scope.
- **Worth founder review?** Yes. AC5 exact `npm test` is not green.

## Acceptance Criteria Status

- **AC1 - Codex skill second-hop:** implemented and covered. Packaged rehearsal shows `WIR-06` and `SKILL-02` pass.
- **AC2 - DOC-02 diagnosed and green:** implemented in selftest after diagnosis above. Packaged rehearsal shows `DOC-02` pass with detail naming exit 1/degraded agent probe condition.
- **AC3 - poll-until-recall:** implemented with bounded polling and timeout diagnostics.
- **AC4 - packaged rehearsal gate:** passed from the installed tarball with isolated runtime state and absolute installed binary path.
- **AC5 - repo suite green:** partial. `npm run typecheck`, `npm run lint`, focused tests, and isolated recent-calls test passed. Exact `npm test` was attempted twice and failed/hung on the out-of-scope `tests/mcp/recent-calls-endpoint.test.ts` full-suite timeout.
- **AC6 - no drift:** upheld. No release workflow, CI, version, tag, file allowlist, suite split, asset stripping, or wiki/docs changes.

## Tests Run

### `npx vitest run tests/echo-home/adapters/skill-sync.test.ts tests/echo-home/adapter-sync.test.ts tests/cli/selftest.test.ts`

```text
Test Files  3 passed (3)
Tests  53 passed (53)
```

### `npm run typecheck`

```text
> echoctl@0.1.0-beta.1 typecheck
> tsc --noEmit
```

Exit code: 0.

### `npm run lint`

```text
> echoctl@0.1.0-beta.1 lint
> eslint . --max-warnings 0 && npm run lint:task-state

> echoctl@0.1.0-beta.1 lint:task-state
> python3 tools/task-state/lint.py
```

Exit code: 0.

### Packaged installed-tarball rehearsal

Tarball: `/var/folders/bb/rkp9hqh54t742qncslfq5dc40000gn/T/echo-093-pack-XXXXX.VGWikAcsT9/echoctl-0.1.0-beta.1.tgz`

SHA-256: `68089706032134fb6dbc02eeedb794a9a4fc7b12b30972d99dbfc6e1b8d1044c`

Installed binary executed: `/var/folders/bb/rkp9hqh54t742qncslfq5dc40000gn/T/echo-093-prefix-XXXXX.fZ4R4zPGG6/bin/echoctl`

Runtime env:
- `HOME=/var/folders/bb/rkp9hqh54t742qncslfq5dc40000gn/T/echo-093-runtime-XXXXX.uY2sqERKc0/home`
- `USERPROFILE=/var/folders/bb/rkp9hqh54t742qncslfq5dc40000gn/T/echo-093-runtime-XXXXX.uY2sqERKc0/home`
- `ECHO_HOME=/var/folders/bb/rkp9hqh54t742qncslfq5dc40000gn/T/echo-093-runtime-XXXXX.uY2sqERKc0/echo`
- `CODEX_HOME=/var/folders/bb/rkp9hqh54t742qncslfq5dc40000gn/T/echo-093-runtime-XXXXX.uY2sqERKc0/codex`
- `ECHO_MCP_PORT_UNSET=`

Exit code: 0.

Full `selftest --json` output:

```json
{"platform":"darwin","arch":"x64","node":"v22.22.1","port":59487,"sandbox":"/var/folders/bb/rkp9hqh54t742qncslfq5dc40000gn/T/echo-selftest-HG3Tk3","checks":[{"id":"INS-02","ok":true,"skipped":false,"detail":"/private/var/folders/bb/rkp9hqh54t742qncslfq5dc40000gn/T/echo-093-prefix-XXXXX.fZ4R4zPGG6/lib/node_modules/echoctl/dist/daemon/index.js"},{"id":"INS-05","ok":true,"skipped":false,"detail":"better-sqlite3 prebuilt loads"},{"id":"INS-06","ok":true,"skipped":true,"detail":"Windows compatibility patcher is release-tier until 091"},{"id":"DAE-02","ok":true,"skipped":false,"detail":"resolved :59389"},{"id":"DAE-03","ok":true,"skipped":false,"detail":"pid-lock present"},{"id":"DAE-06","ok":true,"skipped":false,"detail":"events table present"},{"id":"MCP-02","ok":true,"skipped":false,"detail":"ECHO tools advertised"},{"id":"INIT-02","ok":true,"skipped":false,"detail":"BOM answer file accepted (exit 0)"},{"id":"INIT-04","ok":true,"skipped":false,"detail":"onboarding.json completed:true"},{"id":"INIT-05","ok":true,"skipped":true,"detail":"Windows-only"},{"id":"WIR-01","ok":true,"skipped":false,"detail":"CLAUDE.md MCP marker"},{"id":"WIR-02","ok":true,"skipped":false,"detail":"Claude slash command"},{"id":"WIR-04","ok":true,"skipped":false,"detail":"Codex AGENTS.md marker"},{"id":"WIR-05","ok":true,"skipped":false,"detail":"Codex config.toml mcp block"},{"id":"WIR-06","ok":true,"skipped":false,"detail":"Codex SKILL.md"},{"id":"SKILL-02","ok":true,"skipped":false,"detail":"SKILL.md frontmatter"},{"id":"INIT-06","ok":true,"skipped":false,"detail":"repo in capture-sources.json"},{"id":"CAP-02","ok":true,"skipped":false,"detail":"commit captured + recalled after 0ms"},{"id":"REC-02","ok":true,"skipped":false,"detail":"find_clusters repo-scoped"},{"id":"DOC-02","ok":true,"skipped":false,"detail":"doctor: mcp reachable (exit 1, mcpReachable=true, overall=degraded, agent-probe degraded)"},{"id":"DOC-03","ok":true,"skipped":true,"detail":"Windows-only"},{"id":"INIT-08","ok":true,"skipped":false,"detail":"re-init idempotent (1 ECHO block)"},{"id":"SELF-01","ok":true,"skipped":false,"detail":"production port 38478 not used"}],"passed":20,"failed":0,"skipped":3,"failedIds":[]}
```

### `npx vitest run tests/mcp/recent-calls-endpoint.test.ts`

```text
✓ tests/mcp/recent-calls-endpoint.test.ts (2 tests) 10547ms
  ✓ GET /mcp/recent-calls > logs every runtime-registered tool through the wrapper 10534ms

Test Files  1 passed (1)
Tests  2 passed (2)
Duration  12.63s
```

### `npm test`

Attempted twice. Both runs reported the same full-suite timeout and then left the Vitest parent hung; I terminated only the hung Vitest parent after the timeout was printed.

```text
❯ tests/mcp/recent-calls-endpoint.test.ts (2 tests | 1 failed) 24596ms
  × GET /mcp/recent-calls > logs every runtime-registered tool through the wrapper 24545ms
    -> Test timed out in 15000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
```

The same file passed in isolation as shown above. I did not change it because full-suite timing/flaking is listed as a successor/out-of-scope item in 093.

### `git diff --check`

Exit code: 0.

## Open Questions for Founder

1. Should AC5 be considered blocked by the existing full-suite `recent-calls` timing issue, or should that be explicitly waived for this item because focused tests and packaged selftest pass?
2. Is the DOC-02 selftest interpretation acceptable: MCP reachability passes even when `doctor` overall is degraded solely by agent probes?

## Drift Events Caught

- I did not edit `tests/mcp/recent-calls-endpoint.test.ts` or any Vitest configuration to make the full suite pass, because full-suite flake handling is explicitly out of scope.
- I did not edit `doctor.ts`; the behavior change is limited to how selftest interprets DOC-02's MCP reachability check.
