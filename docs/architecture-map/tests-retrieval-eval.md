# `tests/retrieval-eval/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 5 files.

### `tests/retrieval-eval/cases.test.ts` — retrieval-eval seed case + schema validation tests

**Purpose:** Exercises `loadCases`/`loadFixtureEvents` from `tools/retrieval-eval/run.ts` and `validateRetrievalCase`/`collectFixtureRefs` from `eval/retrieval/schema.ts`, asserting the six committed seed retrieval-eval cases are present, correctly ID'd, schema-valid against fixture refs, and that P0/cross-tool/warning case invariants hold.

**Depends on:** `eval/retrieval/schema.js` (`collectFixtureRefs`, `validateRetrievalCase`), `tools/retrieval-eval/run.js` (`loadCases`, `loadFixtureEvents`), `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "retrieval eval cases"` | describe block | `tests/retrieval-eval/cases.test.ts:5` | Loads all six seed cases + their fixture events, validates each case against `validateRetrievalCase` (expects zero errors), checks each case has ≥2 query variants, and checks P0 cases have non-empty `required_primary`, ≥2 cross-tool cases with `required_sources.length >= 2`, and exactly the two expected `must_warn` cases. |

### `tests/retrieval-eval/determinism.test.ts` — retrieval-eval determinism/stability tests

**Purpose:** Verifies `runRetrievalEval` (from `tools/retrieval-eval/run.ts`) produces identical case/variant statuses and evidence-ref orderings across repeated runs and across different caller home directories, and that duplicate raw fixture timestamps are deterministically disambiguated before commit.

**Depends on:** `tools/retrieval-eval/run.js` (`loadCases`, `loadFixtureEvents`, `runRetrievalEval`), `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "retrieval eval determinism"` | describe block | `tests/retrieval-eval/determinism.test.ts:4` | Runs `runRetrievalEval` twice and asserts identical projected (id/status/failed_metrics/top_evidence_refs) output despite random MemoryStorage IDs; runs with two different `homeDir` overrides and asserts identical aggregate/evidence-ref results; loads fixtures and asserts the two fixture events sharing raw timestamp `2026-05-29T23:53:00.000Z` (`resume-context-codex`, `resume-context-git`) get distinct disambiguated timestamps. |
| `project(summary)` | arrow function (local, inside test) | `tests/retrieval-eval/determinism.test.ts:9` | Projects a `runRetrievalEval` summary down to per-case/per-variant id, result_status, failed_metrics, and top_evidence_refs for equality comparison across runs. |

### `tests/retrieval-eval/run.test.ts` — retrieval-eval runner (full-suite/focused/markdown) tests

**Purpose:** Exercises `runRetrievalEval` and `formatMarkdown` from `tools/retrieval-eval/run.ts`, checking full-suite aggregate counts/exit code, that focused single-case runs still use the full fixture universe, and that the Markdown report includes corpus mode, case id, warning codes, and tool-recipe strings.

**Depends on:** `tools/retrieval-eval/run.js` (`formatMarkdown`, `runRetrievalEval`), `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "retrieval eval runner"` | describe block | `tests/retrieval-eval/run.test.ts:4` | Asserts a full run reports `corpus_mode: 'full-suite'`, 6 cases, ≥19 fixtures, 12 total variants, 3 expected-fail-matched, 0 mismatched/unexpected failures, and exit_code 1; asserts a focused run (`caseId: 'signal-vs-noise-alias'`) reports `focused-full-corpus` mode with the same fixture_count as the full run and 1 case with 2 variants; asserts `formatMarkdown` output for the `stale-source-degraded-warning` case contains the corpus-mode line, case id, `eval:eval_source_gap`, and the discovery→hydrate tool-recipe string. |

### `tests/retrieval-eval/schema.test.ts` — retrieval-eval case/fixture schema validator tests

**Purpose:** Exercises `validateFixtureEvent` and `validateRetrievalCase` from `eval/retrieval/schema.ts` directly with hand-built (not file-loaded) case/fixture objects to check specific validation-rule failure paths: missing structured `expected_failure` on an expected-fail variant, unsupported placeholder syntax plus unconstrained hydration `atom_ids` collections, and fixture timestamp/timezone shape validation.

**Depends on:** `eval/retrieval/schema.js` (`validateFixtureEvent`, `validateRetrievalCase`), `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "retrieval eval schema"` | describe block | `tests/retrieval-eval/schema.test.ts:4` | Three cases: (1) a case with a `baseline_status: 'expected_fail_current_behavior'` variant but no `expected_failure` field must fail validation with an `expected_failure`-mentioning error; (2) a case using placeholder `$case.bad` (unsupported) and an unbounded `$steps.discovery.matches[*].id` hydration collection must fail with errors mentioning "unsupported placeholder" and "ids_limit <= 50 or paginate"; (3) `validateFixtureEvent` accepts a fixture with an explicit-timezone ISO timestamp and rejects one with a timezone-less timestamp (`2026-05-29T00:00:00`). |

### `tests/retrieval-eval/scorer.test.ts` — retrieval-eval scoring behavior tests

**Purpose:** Exercises `runRetrievalEval` (from `tools/retrieval-eval/run.ts`) end-to-end for three specific scoring behaviors: classifying an expected current failure (signal-vs-noise alias) with correct missing-primary/forbidden-noise refs, distinguishing eval-derived source-gap warnings from tool warnings, and scoring newest-first hydration ordering with a truncated-hydration warning.

**Depends on:** `tools/retrieval-eval/run.js` (`runRetrievalEval`), `vitest`

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "retrieval eval scoring"` | describe block | `tests/retrieval-eval/scorer.test.ts:4` | For `signal-vs-noise-alias`: asserts the natural-query variant is `expected_fail_matched` with specific `missing_primary_refs`/`forbidden_noise_refs`, and the control variant is `pass` with a specific `top_evidence_refs` ordering. For `stale-source-degraded-warning`: asserts all variants pass and carry an `observed_warnings` entry with `code: 'eval_source_gap', origin: 'eval', ref: 'cursor'`. For `resume-after-clear-newest-first`: asserts all variants pass, the top-3 `top_evidence_refs` are newest-first (`resume-newest-primary`, `resume-context-git`, `resume-context-codex`), and warnings include `code: 'eval_truncated_hydration', origin: 'eval'`. |
