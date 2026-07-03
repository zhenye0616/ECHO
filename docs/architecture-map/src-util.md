# `src/util/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 3 files.

### `src/util/json.ts` — safe JSON parsing/reading utilities

**Purpose:** Small helper module for parsing JSON strings and files while stripping a leading UTF-8 BOM character that would otherwise break `JSON.parse`.

**Depends on:** `node:fs`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `stripLeadingJsonBom(raw)` | function | `src/util/json.ts:3` | Removes a leading `﻿` byte-order-mark character from a string if present, returning the string unchanged otherwise. |
| `parseJson(raw)` | function | `src/util/json.ts:7` | Strips a BOM from `raw` then parses it as JSON, returning the typed result. |
| `readJsonFile(filePath)` | function | `src/util/json.ts:11` | Reads a file as UTF-8 text and parses it via `parseJson`. |

### `src/util/subprocess.ts` — cross-platform command resolution for spawning subprocesses

**Purpose:** Resolves how to invoke a given command executable across platforms, specifically handling Windows quirks (PATH/PATHEXT search, `.cmd`/`.bat` scripts needing `cmd.exe` wrapping) so subprocess-spawning code elsewhere in the repo can call the right binary with the right args.

**Depends on:** `node:fs` (`existsSync`), `node:path` (`win32`)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ResolveCommandDeps` | interface | `src/util/subprocess.ts:4` | Injected dependencies (platform, env, existsSync) used to make command resolution testable/deterministic. |
| `ResolvedCommand` | interface | `src/util/subprocess.ts:10` | Result shape: resolved `command` string plus optional `prependArgs` to insert before the caller's original args. |
| `DEFAULT_WINDOWS_PATHEXT` | const | `src/util/subprocess.ts:15` | Default Windows executable extensions (`.COM`, `.EXE`, `.BAT`, `.CMD`) used when `PATHEXT` env var is unset/blank. |
| `windowsPathEntries(env)` | function | `src/util/subprocess.ts:17` | Splits the Windows `PATH`/`Path`/`path` env var on `;` into a list of directory entries. |
| `windowsPathExts(env)` | function | `src/util/subprocess.ts:22` | Parses `PATHEXT` (or falls back to `DEFAULT_WINDOWS_PATHEXT`) into a normalized list of dot-prefixed extensions. |
| `hasWindowsExecutableExtension(cmd, exts)` | function | `src/util/subprocess.ts:31` | Checks whether `cmd`'s extension (case-insensitive) matches one of the given Windows executable extensions. |
| `resolveWindowsExecutable(cmd, deps)` | function | `src/util/subprocess.ts:36` | Searches candidate filenames (with PATHEXT extensions appended if needed) across PATH directories (or the literal path if `cmd` is absolute/contains a separator), returning the first existing match or `null`. |
| `isWindowsCommandScript(command)` | function | `src/util/subprocess.ts:55` | Returns true if `command`'s extension is `.cmd` or `.bat`. |
| `resolveCommand(cmd, deps)` | function | `src/util/subprocess.ts:60` | On non-Windows platforms returns `cmd` unchanged; on Windows resolves the actual executable path and, if it's a `.cmd`/`.bat` script, wraps it to be invoked via `cmd.exe /d /s /c <script>` using `ComSpec`/`COMSPEC` env var or defaulting to `cmd.exe`. |
| `resolveCommandForCurrentProcess(cmd)` | function | `src/util/subprocess.ts:72` | Convenience wrapper calling `resolveCommand` with real `process.platform`, `process.env`, and Node's `existsSync`. |

### `src/util/timestamp.ts` — timestamp canonicalization for lexicographic comparison

**Purpose:** Normalizes arbitrary timestamp strings (including non-UTC offset forms) into canonical UTC ISO-8601 form so they compare correctly against stored canonical timestamps using plain string/lexicographic comparison.

**Depends on:** none

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `canonicalizeTimestamp(s)` | function | `src/util/timestamp.ts:5` | Parses `s` as a `Date`, throws `invalid timestamp: <s>` if it fails to parse, otherwise returns `d.toISOString()` for canonical UTC comparison. |
