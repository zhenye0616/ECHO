# `tests/backlog/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 4 files.

### `tests/backlog/backlog-index.test.ts` — tests for `tools/backlog_index.py` rendering

**Purpose:** Exercises `tools/backlog_index.py` (and `tools/blocked.py`'s ready-content-sha helper) by building a temp backlog folder tree, sealing a "ready" item with its content digest, and asserting the generated markdown index correctly renders Proposed/Ready tables including a BLOCKED marker for an item missing its `ready_content_sha`. Also asserts `--check` runs a fixture-only self-check independent of the live `docs/BACKLOG.md`.

**Depends on:** tools/backlog_index.py, tools/blocked.py, node:child_process, node:fs, node:os, node:path, vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `runPython(args, cwd)` | function | `tests/backlog/backlog-index.test.ts:10` | Runs `python3` with given args/cwd via `execFileSync` and returns stdout as utf-8 string. |
| `writeItem(root, stage, id, title)` | function | `tests/backlog/backlog-index.test.ts:14` | Creates `backlog/<stage>/<id>.md` with a minimal frontmatter (priority/estimate/created/blocked_by) and body, returns the file path. |
| `sealReady(path)` | function | `tests/backlog/backlog-index.test.ts:37` | Computes the item's ready-content-sha via `blocked.py --ready-content-sha` and injects `ready_content_sha:` into the frontmatter. |
| `describe: "tools/backlog_index.py"` | describe block | `tests/backlog/backlog-index.test.ts:43` | Covers rendering of Proposed/Ready tables from folder state (including BLOCKED: missing-ready-content-sha detection) and the `--check` fixture-only self-check mode. |

### `tests/backlog/fixtures/mock-codex.sh` — test double for `codex exec` used by run-codex-builder.test.ts

**Purpose:** Stands in for the real `codex` binary in wrapper-contract tests (047 AC4); records its own argv, environment, lock-dir presence/info, and stdin to a side-channel directory (`MOCK_RECORD_DIR`) instead of performing real work, optionally sleeping to simulate a long-running build for lock-contention tests.

**Depends on:** none (pure bash script; reads env vars `MOCK_RECORD_DIR`, `ECHO_BUILDER_LOCK_DIR`, `MOCK_CODEX_SLEEP`)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint | script | `tests/backlog/fixtures/mock-codex.sh:1` | Requires `MOCK_RECORD_DIR`; writes argv to `argv`, full env to `env`, lock-dir presence (`PRESENT`/`ABSENT`) + copied lock `info` file to `lock-status`/`lock-info`, then captures stdin to `stdin`, optionally sleeps `MOCK_CODEX_SLEEP` seconds, and exits 0. |

### `tests/backlog/process-backlog-skill.test.ts` — tests for the process-backlog skill's builder-state hook + adapter sync

**Purpose:** Verifies (048 AC5) that the canonical `skills/process-backlog.md` documents a named "Final builder-state refresh" (E2.5) protocol step referencing `task_state_ref`, `builder.md`, `patch-builder-state.py`, `backlog/pending_review/`, and `lint.py`, that the step is marked protocol-wide (not codex-only) and is positioned before the final commit+push step, and that the Claude Code adapter copy at `.claude/commands/process-backlog.md` stays byte-identical to the canonical skill after running `tools/sync-skills.sh --check`.

**Depends on:** skills/process-backlog.md, .claude/commands/process-backlog.md, tools/sync-skills.sh, node:child_process, node:fs, node:path, vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "048 AC5 — skills/process-backlog.md final builder-state hook"` | describe block | `tests/backlog/process-backlog-skill.test.ts:20` | Asserts presence/positioning of the "Final builder-state refresh" (E2.5) step, its required references, its "protocol-wide"/not-codex-only framing, its ordering before the final commit+push step, and byte-identity of the Claude Code adapter file with the canonical skill after `sync-skills.sh --check`. |

### `tests/backlog/run-codex-builder.test.ts` — tests for `tools/backlog/run-codex-builder.sh` wrapper contract

**Purpose:** Verifies (047 AC4) the exact env/argv/stdin/lock-visibility contract that `tools/backlog/run-codex-builder.sh` hands to `codex exec`, using the `mock-codex.sh` fixture in place of the real codex binary inside an isolated temp git repo + temp HOME, and verifies first-run ECHO_AGENT_ID (UUID) generation/persistence/stability and atomic lockfile behavior (including a lock-contention race scenario and post-cleanup re-acquisition).

**Depends on:** tools/backlog/run-codex-builder.sh, tests/backlog/fixtures/mock-codex.sh, skills/process-backlog.md, node:child_process, node:fs, node:os, node:path, vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `git(cwd, args)` | function | `tests/backlog/run-codex-builder.test.ts:29` | Runs a git command synchronously in `cwd` and returns stdout (or empty string). |
| `initTestRepo(repoRoot)` | function | `tests/backlog/run-codex-builder.test.ts:33` | Initializes a fresh git repo, configures test user/gpgsign, copies in the canonical skill + wrapper script (chmod 755), and creates an initial commit so the wrapper's hardcoded relative paths resolve. |
| `buildEnv(ctx, extras)` | function | `tests/backlog/run-codex-builder.test.ts:63` | Builds a process env for spawning the wrapper: clears inherited `ECHO_AGENT_ID`, sets `HOME`, `ECHO_BACKLOG_REPO_ROOT`, `CODEX_BIN` (pointed at the mock), `MOCK_RECORD_DIR`, plus caller-supplied extras (e.g. `MOCK_CODEX_SLEEP`). |
| `describe: "047 AC4 — run-codex-builder.sh wrapper contract"` | describe block | `tests/backlog/run-codex-builder.test.ts:78` | Three cases: (1) wrapper passes correct argv (`codex exec -C <repo_root> --sandbox danger-full-access -`), env (`ECHO_AGENT_ID`, `HOME`), stdin (skill file contents), lock visibility during the call and lock removal after, plus start/end log markers; (2) `ECHO_AGENT_ID` is generated as a UUID4 on first run, persisted to `~/.echo/agent-id`, and reused unchanged on a second run; (3) the atomic lockfile (`.git/echo-builder-in-progress.d`) prevents an overlapping second invocation (non-zero exit, unchanged lock info) while the first (slow, backgrounded) invocation still holds it, and a third invocation after the first exits acquires the lock cleanly. |
