# tests (root files) — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 2 files.

### `tests/smoke.test.ts` — CI pipeline smoke test

**Purpose:** Trivial always-passing test used to verify the test runner/pipeline itself executes end-to-end (CI wiring check), not any product logic.

**Depends on:** vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "smoke"` | describe block | `tests/smoke.test.ts:3` | Asserts `1 + 1 === 2` to confirm the vitest pipeline runs and reports results. |

### `tests/windows-compat.test.ts` — cross-platform path/subprocess/data-dir compatibility tests

**Purpose:** Exercises Windows/Linux/macOS compatibility behavior across several modules: capture-sources allowlist path matching (`src/capture/sources.js`), BOM-tolerant JSON config parsing, cross-platform subprocess command resolution (`src/util/subprocess.js`), `MemoryStorage` source-prefix querying (`src/storage/memory.js`), and OS-specific data directory resolution (`src/daemon/lifecycle.js`).

**Depends on:** src/capture/sources.js (`_isAllowedPathIn`, `_isAllowedRepoIn`, `readCaptureSourcesConfig`), src/daemon/lifecycle.js (`resolveDataDir`, `resolveDbPath`), src/storage/memory.js (`MemoryStorage`), src/util/subprocess.js (`resolveCommand`), node:fs, node:os, node:path, vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "R1 — path/source separator normalization"` | describe block | `tests/windows-compat.test.ts:14` | Verifies `_isAllowedPathIn`/`_isAllowedRepoIn` case-fold and normalize backslash-vs-forward-slash separators for Windows paths, enforce path boundaries, and that `MemoryStorage.query` matches backslash-stored sources against forward-slash prefixes. |
| `describe: "F4 — UTF-8 BOM tolerance"` | describe block | `tests/windows-compat.test.ts:45` | Sets up/tears down a temp dir per test; verifies `readCaptureSourcesConfig` correctly parses a `capture-sources.json` file prefixed with a UTF-8 BOM. |
| `describe: "R2 — cross-platform subprocess resolution"` | describe block | `tests/windows-compat.test.ts:67` | Verifies `resolveCommand` resolves a Windows `.cmd` shim through `cmd.exe` with proper prepended args instead of naive shell string joining. |
| `describe: "data dir defaults"` | describe block | `tests/windows-compat.test.ts:86` | Verifies `resolveDataDir`/`resolveDbPath` compute correct OS-specific data directories: unchanged macOS path, Windows `LOCALAPPDATA`/`APPDATA` precedence with `ECHO_DATA_DIR` override, and Linux `XDG_DATA_HOME` vs `~/.local/share` fallback. |
| `describe: "Codex skill — companion skill install"` | describe block | `tests/windows-compat.test.ts:127` | Placeholder (`it.todo`) noting `src/util/codex-skill` should export `installCodexSkillFromEchoHome` (Ring-2 successor); no assertions yet. |
