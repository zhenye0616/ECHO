# Root configs — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 4 files.

### `eslint.config.js` — ESLint flat config for the repo

**Purpose:** Configures ESLint (flat config format) for TypeScript source files repo-wide, applying the TypeScript-ESLint recommended rules and disabling stylistic rules that conflict with Prettier.

**Depends on:** `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-config-prettier`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `default` (config array) | exported const | `eslint.config.js:5` | Defines ignore globs (`node_modules/**`, `dist/**`, `coverage/**`, `.workflow-*.js`), a `**/*.ts` block using the TS parser with `ecmaVersion: 'latest'`/`sourceType: 'module'` and TS-ESLint recommended rules, and appends the `eslint-config-prettier` ruleset last to disable conflicting stylistic rules. |

### `vitest.config.ts` — Default Vitest test runner config

**Purpose:** Root Vitest configuration used for the general/default test invocation; includes the entire `tests/**/*.test.ts` tree with no exclusions.

**Depends on:** `vitest/config`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `default` (defineConfig result) | exported const | `vitest.config.ts:3` | Sets `test.include` to `['tests/**/*.test.ts']`, running the full test suite unfiltered. |

### `vitest.orchestration.config.ts` — Vitest config scoped to orchestration/dev-infra tests

**Purpose:** Narrow Vitest config that runs only the orchestration-and-dev-infra test subset (review-queue, backlog tooling, coord, task-state harness) — the split introduced to separate CI's product gate from orchestration dev-infra tests (per item 092 split referenced in project CLAUDE.md).

**Depends on:** `vitest/config`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `default` (defineConfig result) | exported const | `vitest.orchestration.config.ts:3` | Sets `test.include` to an explicit list: `tests/review-queue/**/*.test.ts`, `tests/backlog/backlog-index.test.ts`, `tests/backlog/process-backlog-skill.test.ts`, `tests/coord/no-pre-push-spawn.test.ts`, `tests/skills/atomic-state-transition-harness.test.ts`, `tests/task-state/lint.test.ts`, `tests/task-state/patch-builder-state.test.ts`. |

### `vitest.product.config.ts` — Vitest config scoped to product-only tests (CI gate)

**Purpose:** Complementary Vitest config that runs the full test tree minus the orchestration/dev-infra subset, forming the "product" CI gate that excludes review-queue and related dev-infra tests.

**Depends on:** `vitest/config`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `default` (defineConfig result) | exported const | `vitest.product.config.ts:3` | Sets `test.include` to `['tests/**/*.test.ts']` and `test.exclude` to the same explicit orchestration-test list as `vitest.orchestration.config.ts` (`tests/review-queue/**`, backlog-index/process-backlog-skill tests, coord no-pre-push-spawn test, atomic-state-transition-harness test, task-state lint/patch-builder-state tests), so product CI runs everything else. |
