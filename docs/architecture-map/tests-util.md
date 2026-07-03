# `tests/util/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 2 files.

### `tests/util/json.test.ts` — unit tests for BOM-tolerant JSON helpers

**Purpose:** Exercises `src/util/json.js`'s `parseJson` and `readJsonFile`, verifying UTF-8 BOM stripping for both raw string parsing and file reads, and that malformed JSON still throws a normal `SyntaxError`.

**Depends on:** `src/util/json.js` (parseJson, readJsonFile); external: `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "BOM-tolerant JSON helper"` | test suite | `tests/util/json.test.ts:7` | Covers BOM-prefixed string parsing, unchanged non-BOM parsing, malformed-JSON error propagation, and reading BOM-prefixed JSON files via a temp directory created/torn down in beforeEach/afterEach. |

### `tests/util/subprocess.test.ts` — unit tests for cross-platform command resolution

**Purpose:** Exercises `src/util/subprocess.js`'s `resolveCommand`, verifying Windows PATH/PATHEXT-based shim resolution (e.g. `.CMD` via `cmd.exe /d /s /c`), direct `.exe` resolution, and that POSIX platforms bypass host PATH inspection entirely.

**Depends on:** `src/util/subprocess.js` (resolveCommand); external: `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "resolveCommand"` | test suite | `tests/util/subprocess.test.ts:4` | Covers finding a Windows `.cmd` shim through injected PATH/PATHEXT/ComSpec with prepended `cmd.exe` args, returning a Windows `.exe` path directly, and leaving POSIX commands unchanged without consulting `existsSync`/host PATH. |
