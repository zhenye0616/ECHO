# `tests/dogfooding/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 1 files.

### `tests/dogfooding/journal-cat.test.ts` — tests for the dogfooding journal merge/validate helper and reviewer wrapper

**Purpose:** Vitest suite exercising `tools/dogfooding/journal-cat.sh` (merges per-actor + legacy shared journal shards into one chronological stream) and `tools/review-queue/_run_reviewer.sh` (reviewer wrapper that writes actor-scoped journal shards). Covers chronological merge with deterministic equal-timestamp tie-break, loud failure on malformed entry blocks, and rejection of invalid reviewer-name slugs before any journal write.

**Depends on:** `tools/dogfooding/journal-cat.sh`, `tools/review-queue/_run_reviewer.sh`, `node:child_process`, `node:fs`, `node:os`, `node:path`, `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `journalDir()` | function | `tests/dogfooding/journal-cat.test.ts:22` | Returns the `raw/internal/dogfooding` path under the temp fixture repo root. |
| `writeShard(actor, entries)` | function | `tests/dogfooding/journal-cat.test.ts:26` | Writes a fixture journal shard file (legacy shared or per-actor, named by MONTH/actor) with a standard preamble plus the given entry blocks. |
| `runJournalCat()` | function | `tests/dogfooding/journal-cat.test.ts:51` | Spawns `journal-cat.sh MONTH` in the fixture repo root and returns exit status, stdout, stderr. |
| `headings(output)` | function | `tests/dogfooding/journal-cat.test.ts:63` | Extracts all `### ...` heading lines from merged journal output via regex for order assertions. |
| `describe: "journal-cat.sh"` | describe block | `tests/dogfooding/journal-cat.test.ts:67` | Exercises `journal-cat.sh` merge ordering (shared + multiple actor shards interleaved chronologically with equal-timestamp determinism), loud failure with file:line diagnostics on malformed entry headers, and verifies `_run_reviewer.sh` writes actor-scoped shard filenames and rejects invalid `REVIEWER_NAME` slugs (empty string, mixed-case) before creating any journal file. |
