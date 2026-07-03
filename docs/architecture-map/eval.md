# `eval/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 2 files.

### `eval/cold-reader/run.sh` — Cold Reader Test arm runner

**Purpose:** Runs the ECHO-off (floor) and ECHO-on (test) arms for one Cold Reader Test case, each as a fresh Codex agent invoked from an empty sandbox temp dir with a read-only sandbox, piping the case's `on.md`/`off.md` prompt and teeing output to `results/<case>.{on,off}.out.txt` for later scoring.

**Depends on:** none (shells out to the `codex` CLI as an external dependency); reads `<case-dir>/on.md` and `<case-dir>/off.md`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `run_arm()` | function | `eval/cold-reader/run.sh:22` | Runs one arm (`on` or `off`): uppercases the arm name for logging, launches `codex exec` in a fresh sandbox dir with `--sandbox read-only`, pipes in the arm's prompt markdown file, and tees stdout/stderr to the results file for that case+arm. |

### `eval/retrieval/schema.ts` — Retrieval eval case schema + validators

**Purpose:** Defines the TypeScript types and hand-rolled runtime validators for retrieval evaluation "cases" (query variants, tool recipes, expected warnings, label groups, budgets, provenance) and for fixture capture events used to seed those cases; used by the retrieval eval harness to validate case JSON/fixtures before running them against ECHO's search/cluster/atom tools.

**Depends on:** `src/storage/interface.js` (for `CaptureEvent` type); no external packages.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `PRIORITIES` | const | `eval/retrieval/schema.ts:3` | Tuple of allowed case priority levels: `P0`, `P1`, `P2`. |
| `BASELINE_STATUSES` | const | `eval/retrieval/schema.ts:4` | Tuple of allowed query-variant baseline statuses: `pass`, `expected_fail_current_behavior`. |
| `WARNING_ORIGINS` | const | `eval/retrieval/schema.ts:5` | Tuple of allowed warning-origin values: `tool`, `eval`. |
| `TOOL_NAMES` | const | `eval/retrieval/schema.ts:6` | Tuple of the three ECHO retrieval tools a recipe step may invoke: `search_memories`, `find_clusters`, `get_atoms`. |
| `STEP_KINDS` | const | `eval/retrieval/schema.ts:7` | Tuple of allowed tool-recipe step kinds: `discovery`, `hydration`, `scoring_input`. |
| `Priority` | type | `eval/retrieval/schema.ts:9` | Union type derived from `PRIORITIES`. |
| `BaselineStatus` | type | `eval/retrieval/schema.ts:10` | Union type derived from `BASELINE_STATUSES`. |
| `WarningOrigin` | type | `eval/retrieval/schema.ts:11` | Union type derived from `WARNING_ORIGINS`. |
| `ToolName` | type | `eval/retrieval/schema.ts:12` | Union type derived from `TOOL_NAMES`. |
| `StepKind` | type | `eval/retrieval/schema.ts:13` | Union type derived from `STEP_KINDS`. |
| `MetricName` | type | `eval/retrieval/schema.ts:15` | Union of the eleven scoring metric names (recall, precision, noise, budget, efficiency, etc.) usable in `allowed_failed_metrics`. |
| `TimeWindow` | interface | `eval/retrieval/schema.ts:28` | Shape of a case's `since`/`until` time-window bounds (ISO-8601 strings). |
| `QueryVariant` | interface | `eval/retrieval/schema.ts:33` | Shape of one query variant: id, query text, baseline status, and optional `expected_failure` block. |
| `ExpectedFailure` | interface | `eval/retrieval/schema.ts:40` | Shape describing an accepted current-behavior failure: reason, followup candidate, and allow-lists for failed metrics/missing refs/forbidden-noise refs/warning gaps/required observed warnings. |
| `ToolStep` | interface | `eval/retrieval/schema.ts:50` | Shape of one step in a case's `tool_recipe`: step id, tool, kind, params (with `$`-placeholders), optional primary-discovery flag, ids_limit, paginate flag, deterministic_order. |
| `WarningExpectation` | interface | `eval/retrieval/schema.ts:61` | Shape of a `must_warn` entry: a warning `code` and the set of `origins` (tool/eval) it may originate from. |
| `RetrievalBudgets` | interface | `eval/retrieval/schema.ts:66` | Shape of a case's byte/call budgets: `per_call_bytes`, `total_bytes`, `max_calls`. |
| `ProvenanceRef` | interface | `eval/retrieval/schema.ts:72` | Shape of a provenance citation: `kind` (journal/raw_jsonl/artifact/decision/note), `ref`, optional `note`. |
| `RetrievalCase` | interface | `eval/retrieval/schema.ts:78` | Full shape of a retrieval eval case: id, priority, intent, repo_path, time_window, reference_now, fixture_files, query_variants, tool_recipe, required/acceptable/noise label groups, must_warn, canonical_answer_facts, budgets, provenance. |
| `FixtureEvent` | interface | `eval/retrieval/schema.ts:100` | A `CaptureEvent` (minus `id`) extended with a `fixture_ref` string used to label it for case scoring. |
| `ValidationResult<T>` | interface | `eval/retrieval/schema.ts:104` | Generic validator result shape: `ok`, optional `value`, and an `errors` string array. |
| `ISO_WITH_TZ_RE` | const (regex) | `eval/retrieval/schema.ts:110` | Regex requiring an ISO-8601 timestamp with an explicit timezone offset or `Z`. |
| `PLACEHOLDER_RE` | const (regex) | `eval/retrieval/schema.ts:111` | Regex whitelisting the legal `$`-prefixed placeholder forms usable inside tool_recipe params (query, case fields, step output bindings, labels). |
| `LABEL_GROUPS` | const | `eval/retrieval/schema.ts:113` | Tuple naming the five fixture-ref label groups: `required_primary`, `required_context`, `acceptable_context`, `noise`, `forbidden_noise`. |
| `validateRetrievalCase(input, fixtureRefs?)` | function | `eval/retrieval/schema.ts:121` | Validates a raw object against the full `RetrievalCase` shape: required fields/types, ISO timestamp formats, budgets, query variants, tool recipe, warnings, provenance, cross-referential label-ref uniqueness/existence against `fixtureRefs`, and the P0-must-have-required_primary rule. |
| `validateFixtureEvent(input)` | function | `eval/retrieval/schema.ts:198` | Validates a raw object as a `FixtureEvent`: required `fixture_ref`/`source`/`timestamp`/`content` strings, ISO timestamp format, optional `metadata` object shape. |
| `collectLabelRefs(c)` | function | `eval/retrieval/schema.ts:218` | Returns the set of all fixture refs referenced across a case's five label groups. |
| `collectFixtureRefs(events)` | function | `eval/retrieval/schema.ts:226` | Returns the set of `fixture_ref` values present in a list of fixture events. |
| `validateQueryVariants(input, errors)` | function | `eval/retrieval/schema.ts:230` | Validates the `query_variants` array: minimum of two variants, unique ids, required id/query/baseline_status fields, and that `expected_failure` is present only (and validated) when baseline_status is `expected_fail_current_behavior`. |
| `validateExpectedFailure(input, errors, prefix)` | function | `eval/retrieval/schema.ts:256` | Validates an `ExpectedFailure` object's required reason/followup_candidate strings and its four/five allow-list arrays (metrics, missing refs, forbidden-noise refs, warning gaps, optional required observed warnings). |
| `validateToolRecipe(input, errors)` | function | `eval/retrieval/schema.ts:282` | Validates the `tool_recipe` array: unique step_ids, valid tool/kind enums, params record, placeholder legality, exactly-one `primary_discovery: true` step, and for `get_atoms` steps that bind a collection placeholder, requires `ids_limit` (1-50) or `paginate`, plus `deterministic_order` when `ids_limit` clips a collection. |
| `validateWarnings(input, errors)` | function | `eval/retrieval/schema.ts:336` | Validates each `must_warn` entry has a `code` string and an `origins` array drawn only from `WARNING_ORIGINS`. |
| `validateProvenance(input, errors)` | function | `eval/retrieval/schema.ts:357` | Validates each provenance entry has required `kind` and `ref` strings. |
| `validateBudgets(input, errors)` | function | `eval/retrieval/schema.ts:370` | Validates `per_call_bytes`, `total_bytes`, `max_calls` are all positive integers. |
| `validateMetricArray(input, key, errors, prefix)` | function | `eval/retrieval/schema.ts:380` | Validates that an array field only contains values from the fixed eleven-entry `MetricName` list. |
| `validatePlaceholders(input, errors, prefix)` | function | `eval/retrieval/schema.ts:410` | Recursively walks a params object/array and flags any `$`-prefixed string that doesn't match `PLACEHOLDER_RE`. |
| `validateStringArray(input, key, errors, prefix?)` | function | `eval/retrieval/schema.ts:431` | Validates a field is an array of non-empty strings. |
| `requireString(input, key, errors, label?)` | function | `eval/retrieval/schema.ts:448` | Validates a field is present and is a non-empty string. |
| `requireArray(input, key, errors)` | function | `eval/retrieval/schema.ts:459` | Validates a field is an array. |
| `requireRecord(input, key, errors, label?)` | function | `eval/retrieval/schema.ts:463` | Validates a field is a plain object (record). |
| `requireEnum(input, key, allowed, errors, label?)` | function | `eval/retrieval/schema.ts:472` | Validates a field's value is one of an allowed tuple of strings. |
| `isRecord(value)` | function | `eval/retrieval/schema.ts:484` | Type-guard checking a value is a non-null, non-array object. |
