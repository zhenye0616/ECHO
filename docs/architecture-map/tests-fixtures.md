# `tests/fixtures/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 4 files.

### `tests/fixtures/allowlist.ts` — test helper for resetting/restoring the capture-source allowlist

**Purpose:** Provides test utilities to mutate and restore the in-memory `CAPTURED_SOURCES` allowlist (apps, domains, fs_paths, apis) so tests can isolate capture-gate behavior without cross-test pollution.

**Depends on:** `src/capture/sources.js` (CAPTURED_SOURCES)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `resetAllowlist()` | function | `tests/fixtures/allowlist.ts:3` | Clears all entries from CAPTURED_SOURCES.apps, .domains, .fs_paths, and .apis in place. |
| `snapshotFsPaths()` | function | `tests/fixtures/allowlist.ts:14` | Returns a shallow copy array of the current CAPTURED_SOURCES.fs_paths for later restoration. |
| `restoreFsPaths(snapshot)` | function | `tests/fixtures/allowlist.ts:18` | Pushes each path from a prior snapshot back onto CAPTURED_SOURCES.fs_paths. |

### `tests/fixtures/cursor-globalstorage.ts` — SQLite fixture builder for Cursor's globalStorage/workspaceStorage schema

**Purpose:** Builds synthetic `cursorDiskKV`/`ItemTable` SQLite databases that mimic Cursor IDE's on-disk composer/bubble storage format, letting tests exercise `parseBubbleRow` and related Cursor-capture parsing logic end-to-end without a real Cursor install.

**Depends on:** `better-sqlite3` (external)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `FixtureBubble` | interface | `tests/fixtures/cursor-globalstorage.ts:3` | Describes one synthetic chat bubble (composer_id, bubble_id, type, text, codeBlocks, attachedFileCodeChunksUris, deletedFiles, toolFormerData, attachedHumanChanges, thinkingContent) used to drive AC2 fallback-chain parsing tests. |
| `FixtureOptions` | interface | `tests/fixtures/cursor-globalstorage.ts:25` | Options controlling composer creation timestamps, globally or per-composer. |
| `composerCreatedAtFor(composer_id, options)` | function | `tests/fixtures/cursor-globalstorage.ts:30` | Resolves the createdAt timestamp for a composer from per-composer override or global default, falling back to 0. |
| `buildHeaders(composer_id, bubbles)` | function | `tests/fixtures/cursor-globalstorage.ts:34` | Filters bubbles belonging to a composer and maps them into `fullConversationHeadersOnly` header entries (bubbleId, type). |
| `bubbleValue(b)` | function | `tests/fixtures/cursor-globalstorage.ts:43` | Serializes a FixtureBubble into the JSON wire shape Cursor stores under `bubbleId:<composer>:<bubble>` keys, including optional codeBlocks/attachedFileCodeChunksUris/deletedFiles/toolFormerData/attachedHumanChanges/thinkingContent fields. |
| `composerValue(composer_id, createdAt, headers)` | function | `tests/fixtures/cursor-globalstorage.ts:72` | Serializes composer metadata (composerId, createdAt, fullConversationHeadersOnly) into the JSON stored under `composerData:<id>`. |
| `createGlobalStorageFixture(dbPath, bubbles, options)` | function | `tests/fixtures/cursor-globalstorage.ts:84` | Creates a `cursorDiskKV` table at dbPath and inserts composerData + bubbleId rows built from the given bubbles/options. |
| `appendBubble(dbPath, b)` | function | `tests/fixtures/cursor-globalstorage.ts:108` | Inserts one additional bubble row into an existing fixture DB and updates (or creates) the corresponding composerData header list. |
| `appendRawCursorDiskKVRow(dbPath, key, value)` | function | `tests/fixtures/cursor-globalstorage.ts:141` | Inserts an arbitrary raw key/value row into cursorDiskKV, used to test malformed/edge-case rows (value may be null). |
| `createWorkspaceFixture(dbPath, composerIds)` | function | `tests/fixtures/cursor-globalstorage.ts:150` | Creates an `ItemTable` table and inserts a `composer.composerData` row listing the given composer IDs with mode 'agent', mimicking Cursor's workspaceStorage DB. |
| `createSchemaUnrecognizedFixture(dbPath)` | function | `tests/fixtures/cursor-globalstorage.ts:164` | Creates an unrelated `foo` table with a sample row, used to test schema-detection fallback/rejection when a DB doesn't match the expected Cursor schema. |

### `tests/fixtures/jsonl.ts` — JSONL file + temp-dir + polling test helpers

**Purpose:** Small general-purpose test utilities for writing/appending JSONL fixture files, creating scratch temp directories, and polling for asynchronous conditions in tests.

**Depends on:** `node:fs`, `node:os`, `node:path`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `writeJsonl(path, lines)` | function | `tests/fixtures/jsonl.ts:6` | Writes an array of objects as newline-delimited JSON to path, overwriting existing content. |
| `appendJsonl(path, lines)` | function | `tests/fixtures/jsonl.ts:11` | Appends an array of objects as newline-delimited JSON to an existing file at path. |
| `tmpDir(prefix)` | function | `tests/fixtures/jsonl.ts:16` | Creates and returns a fresh temp directory under the OS tmpdir with the given prefix. |
| `waitFor(predicate, timeoutMs)` | function | `tests/fixtures/jsonl.ts:21` | Polls the given predicate every 25ms until it returns truthy or timeoutMs elapses, then resolves or throws a timeout Error. |

### `tests/fixtures/stdout.ts` — stdout-capture test helper

**Purpose:** Monkey-patches `process.stdout.write` so tests can assert on CLI/console output and restore the original implementation afterward.

**Depends on:** none

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `captureStdout()` | function | `tests/fixtures/stdout.ts:3` | Replaces process.stdout.write with a recorder that pushes decoded string/Uint8Array chunks into a `writes` array; returns the array plus a `restore()` function to revert the original write function. |
