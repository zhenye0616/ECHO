# `tests/echo-mcp/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 1 files.

### `tests/echo-mcp/role-state.test.ts` — role-state / task-state MCP tool test suite

**Purpose:** Vitest suite for 046 AC4 exercising `getRoleState` and `listTaskStates` directly (bypassing MCP transport) against tmpdir git-init fixtures, covering ref-pinning, byte-identity vs `git show`, HEAD-race safety, branch-ref resolution, malformed-anchor degradation, and repo-root resolution via `startMcpServer`'s `repo_root` option.

**Depends on:** `src/mcp/tools/get-role-state.js` (`getRoleState`), `src/mcp/tools/list-task-states.js` (`listTaskStates`), `src/mcp/util/role-state-git.js` (`GitError`, `readBlobAtRef`), `src/mcp/server.js` (`startMcpServer`, dynamically imported), external: `node:child_process` (`execFileSync`, `spawnSync`), `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `git(repoRoot, args)` | function | `tests/echo-mcp/role-state.test.ts:19` | Runs a git command synchronously in `repoRoot` via `execFileSync` and returns stdout as utf-8. |
| `gitOk(repoRoot, args)` | function | `tests/echo-mcp/role-state.test.ts:23` | Runs a git command via `spawnSync` without throwing, returning `{code, stdout}` for non-fatal checks. |
| `writePointer(repoRoot, taskId, role, body)` | function | `tests/echo-mcp/role-state.test.ts:32` | Writes a role-typed task-state pointer file at `backlog/task-state/<taskId>/<role>.md` with given body. |
| `writeStageItem(repoRoot, taskId, stage)` | function | `tests/echo-mcp/role-state.test.ts:43` | Creates a minimal backlog item stub `backlog/<stage>/<taskId>.md` with frontmatter `id` to simulate pipeline stage placement. |
| `initRepo()` | function | `tests/echo-mcp/role-state.test.ts:49` | Creates a fresh tmpdir, `git init -b main`, and sets test user/email/gpgsign config; returns the repo root path. |
| `commitAll(repoRoot, message)` | function | `tests/echo-mcp/role-state.test.ts:58` | Stages all changes and commits with the given message, returning the resulting commit SHA. |
| `TASK` | const | `tests/echo-mcp/role-state.test.ts:64` | Canonical fixture task id `2026-05-13-046-context-fatigue-via-role-typed-state` used across tests. |
| `validStrategist` | const | `tests/echo-mcp/role-state.test.ts:66` | Well-formed strategist.md fixture body with `current_thesis`, `locked_decisions`, `open_questions`, `dont_touch`, and `canonical_anchors` sections. |
| `describe: "046 AC4 — get_role_state"` | describe block | `tests/echo-mcp/role-state.test.ts:89` | Tests `getRoleState`: reads content at HEAD and explicit SHA, throws `GitError` for missing role file or unresolvable ref, pins SHA at call entry so later commits don't affect a re-read by that ref (HEAD-race), resolves branch refs to commit SHAs (not branch names) and reflects branch moves, and asserts byte-identity against `readBlobAtRef`/`git show`. |
| `describe: "046 AC4 — list_task_states"` | describe block | `tests/echo-mcp/role-state.test.ts:182` | Tests `listTaskStates`: filters by `stage` and by `role`, returns empty array with a valid 40-hex `ref` when no task-state dirs exist, accepts-but-ignores a `binding` parameter, degrades gracefully (returns `_parse_error`) on malformed `canonical_anchors` keys, and uses one pinned SHA across the whole call so a later stage-moving commit isn't visible when an explicit `ref` is passed. |
| `describe: "046 AC4 — repo-root resolution via startMcpServer option"` | describe block | `tests/echo-mcp/role-state.test.ts:262` | Verifies `getRoleState` reads from the passed `repoRoot` (not `cwd()`) and throws for a task id absent in a different repo; verifies `startMcpServer({repo_root, enable_deadlines:false})` boots an MCP HTTP server backed by a stub storage and that a `tools/call` JSON-RPC request for `get_role_state` returns matching `structuredContent.content` and a 40-hex `ref` via real HTTP fetch. |
