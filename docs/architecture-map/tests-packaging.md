# `tests/packaging/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 2 files.

### `tests/packaging/import-closure.test.ts` — npm-pack import closure test

**Purpose:** Verifies that every relative runtime import inside the shipped `dist/**/*.js` files resolves to a file that is actually included in the npm-packed file set (via `npm pack --dry-run --json`), catching cases where `.npmignore`/`files` config would ship a module that imports a file not shipped.

**Depends on:** node:child_process, node:fs, node:path, typescript, vitest; none internal (drives the built `npm pack` output and TypeScript AST parsing directly).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `PackedFile` | interface | `tests/packaging/import-closure.test.ts:9` | Shape of one file entry (`path`) inside npm's pack dry-run JSON payload. |
| `PackDryRunEntry` | interface | `tests/packaging/import-closure.test.ts:13` | Shape of one package entry from `npm pack --dry-run --json`, containing a `files` array. |
| `parsePackDryRun(stdout)` | function | `tests/packaging/import-closure.test.ts:17` | Scans npm's stdout for a JSON array (skipping any lifecycle log lines that precede it) and parses it into `PackDryRunEntry[]`; throws if no JSON array is found. |
| `packedPaths()` | function | `tests/packaging/import-closure.test.ts:31` | Runs `npm pack --dry-run --json` in the repo root, asserts success and a single package entry, and returns the sorted, forward-slash-normalized list of packed file paths. |
| `relativeRuntimeImports(filePath, sourceText)` | function | `tests/packaging/import-closure.test.ts:43` | Parses a JS source file with the TypeScript compiler API and collects the string module specifiers of all import/export declarations that start with `.` (relative imports). |
| `resolvePackedRuntimeImport(importerPath, specifier, packed)` | function | `tests/packaging/import-closure.test.ts:63` | Resolves a relative import specifier against the importer's directory, trying the bare path, `.js`, and `index.js` candidates, and returns whichever candidate exists in the packed file set (or the bare-joined path if none match). |
| `describe: "packed package import closure"` | describe block | `tests/packaging/import-closure.test.ts:69` | Exercises the built `dist/**/*.js` output plus `npm pack --dry-run --json`: for every shipped JS file, extracts its relative imports and asserts each one resolves to a file present in the actual npm-packed set, failing with a list of unresolved imports otherwise. |

### `tests/packaging/packed-manifest.test.ts` — npm-pack manifest snapshot test

**Purpose:** Pins the exact sorted set of file paths that `npm pack --dry-run --json` would ship for the package, acting as a regression guard against accidental additions/removals in the published package contents (assets, dist output, docs, tools/review-queue schemas, etc.).

**Depends on:** node:child_process, node:path, vitest; none internal (drives `npm pack` directly against the repo root).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `PackedFile` | interface | `tests/packaging/packed-manifest.test.ts:7` | Shape of one file entry (`path`) inside npm's pack dry-run JSON payload. |
| `PackDryRunEntry` | interface | `tests/packaging/packed-manifest.test.ts:11` | Shape of one package entry from `npm pack --dry-run --json`, containing a `files` array. |
| `parsePackDryRun(stdout)` | function | `tests/packaging/packed-manifest.test.ts:15` | Scans npm's stdout for a JSON array (skipping any lifecycle log lines that precede it) and parses it into `PackDryRunEntry[]`; throws if no JSON array is found. |
| `describe: "packed package manifest"` | describe block | `tests/packaging/packed-manifest.test.ts:29` | Runs `npm pack --dry-run --json` in the repo root and asserts the sorted, normalized list of shipped file paths matches an inline snapshot enumerating every expected packaged path (CHANGELOG/README/LICENSE, `assets/echo-roles/*`, `assets/echo-skills/*`, `assets/echo-workflows/*`, the full `dist/**` compiled output tree across brain/capture/cli/coord/daemon/echo-home/enrich/mcp/normalize/reasoning/storage/trace/util, `docs/echoctl-install.md`, `package.json`, and `tools/review-queue/*` config + schema files). |
