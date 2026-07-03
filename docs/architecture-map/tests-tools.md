# `tests/tools/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 1 files.

### `tests/tools/install-pre-commit-hook.test.ts` — installer test suite for the git pre-commit hook

**Purpose:** Vitest suite exercising `tools/install-pre-commit-hook.sh` (052 AC3). Seeds fresh temp git repos, runs the installer binary as a subprocess, and asserts the resolved hook file's location, content, and executable mode across fresh-install, idempotent re-install, mode-repair, content-overwrite, linked-worktree, and relative-`core.hooksPath` scenarios.

**Depends on:** `tools/install-pre-commit-hook.sh` (invoked as subprocess, not imported), `node:child_process`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `sh(cwd, cmd, args)` | function | `tests/tools/install-pre-commit-hook.test.ts:32` | Runs a command synchronously via `spawnSync` in the given cwd and returns stdout/stderr/status with safe defaults. |
| `gitInit(dir)` | function | `tests/tools/install-pre-commit-hook.test.ts:41` | Initializes a git repo in `dir`, sets test user config, and creates a seed commit so the repo has a valid HEAD. |
| `isExecutableForUser(path)` | function | `tests/tools/install-pre-commit-hook.test.ts:50` | Reads the file's mode bits and checks whether the owner-execute bit (0o100) is set. |
| `beforeEach` (workdir setup) | fixture | `tests/tools/install-pre-commit-hook.test.ts:58` | Creates a fresh temp directory (`mkdtempSync`) before each test to isolate repo state. |
| `afterEach` (workdir teardown) | fixture | `tests/tools/install-pre-commit-hook.test.ts:62` | Recursively removes the temp working directory after each test. |
| `describe: "install-pre-commit-hook.sh"` | describe block | `tests/tools/install-pre-commit-hook.test.ts:66` | Covers: fresh install writes an executable hook containing `sync-skills.sh --check` and repo-root resolution logic; idempotent re-install leaves mtime/content/executable bit unchanged and reports "unchanged"; mode-repair re-install restores the executable bit on an existing correct-content hook and reports "mode repaired"; content-differs re-install overwrites a foreign hook body with a warning; linked-worktree install writes into the main repo's `.git/hooks` (not the worktree's `.git` pointer file); relative `core.hooksPath` set from a nested cwd resolves against the repo root rather than the invocation cwd, guarding against a naive misplacement bug. |
