# src (root files) — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 2 files.

### `src/guards.ts` — type-guard utility

**Purpose:** Provides a single reusable type guard for validating that an unknown value is a non-empty string.

**Depends on:** none

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `isNonEmptyString(v)` | function | `src/guards.ts:1` | Type guard returning true (narrowing to `string`) when `v` is a string with length greater than 0. |

### `src/index.ts` — empty module placeholder

**Purpose:** Placeholder entry-point module that exports nothing; marks the file as an ES module with `export {}`.

**Depends on:** none

**Symbols:**

(none — file contains only `export {};`, a trivial re-export with no design meaning)
