# `tools/retrieval-eval/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 2 files.

### `tools/retrieval-eval/build-fixture.ts` — retrieval fixture validation + local-provenance inspection CLI

**Purpose:** CLI helper for the retrieval-eval harness that validates the committed retrieval case + fixture files against the schema, and (V0) can inspect local provenance file paths (journal/raw JSONL/artifact) for future fixture authoring without ever scanning home directories.

**Depends on:** `eval/retrieval/schema.js` (collectFixtureRefs, collectLabelRefs, validateRetrievalCase), `tools/retrieval-eval/run.js` (loadCases, loadFixtureEvents, ValidationError); external: `node:fs/promises`, `node:path`, `node:process`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `Args` | interface | `tools/retrieval-eval/build-fixture.ts:11` | CLI argument shape: optional caseId plus arrays of journal/raw-jsonl/artifact paths and an updateFixtures flag. |
| `validateCommittedFixtures(repoRoot, caseId)` | function | `tools/retrieval-eval/build-fixture.ts:19` | Loads all retrieval cases (optionally filtered by caseId), loads referenced fixture events, validates each case against fixture refs and label refs, throwing `ValidationError` on any mismatch; returns counts of cases and fixtures validated. |
| `inspectLocalProvenance(args, repoRoot)` | function | `tools/retrieval-eval/build-fixture.ts:43` | Reads and reports on explicitly-passed local file paths (journal/raw-jsonl/artifact) to confirm they're readable, emitting a redaction reminder; refuses to run with zero explicit paths (never scans home dirs); notes that `--update-fixtures` in this V0 only validates inputs and does not write fixtures. |
| `parseArgs(argv)` | function | `tools/retrieval-eval/build-fixture.ts:70` | Parses `--case`, `--journal`, `--raw-jsonl`, `--artifact`, `--update-fixtures` CLI flags into an `Args` object; throws `ValidationError` on unknown args. |
| `requiredValue(argv, idx, flag)` | function | `tools/retrieval-eval/build-fixture.ts:96` | Fetches the value following a flag at `idx`, throwing `ValidationError` if missing or if it looks like another flag. |
| `main()` | function | `tools/retrieval-eval/build-fixture.ts:104` | Entry point: parses args, and either runs local-provenance inspection (if any explicit path args given) or falls back to `validateCommittedFixtures`, printing results/errors and setting exit code 2 on validation failure. |
| `invokedAsScript` | const | `tools/retrieval-eval/build-fixture.ts:125` | Detects (outside Vitest) whether this file was invoked directly as a script (by matching argv against its ts/js path) to decide whether to auto-run `main()`. |

### `tools/retrieval-eval/run.ts` — retrieval-eval harness runner (scores MCP retrieval tools against fixture corpora)

**Purpose:** Core engine of the retrieval-eval harness: loads retrieval case definitions and their fixture events, builds an in-memory storage corpus, executes each case's tool recipe (`search_memories`/`find_clusters`/`get_atoms`) against that corpus, scores multiple retrieval-quality metrics (recall, precision, signal/noise, source coverage, warning legibility, byte/call budgets) per query variant, classifies pass/expected-fail/unexpected-fail, and renders a JSON or Markdown summary; also runnable as a standalone CLI.

**Depends on:** `eval/retrieval/schema.js` (collectFixtureRefs, BaselineStatus, FixtureEvent, MetricName, RetrievalCase, ToolStep, WarningOrigin, validateFixtureEvent, validateRetrievalCase types/functions), `src/mcp/tools/find-clusters.js` (findClusters, FindClustersResult), `src/mcp/tools/get-atoms.js` (getAtoms, GetAtomsResult), `src/mcp/tools/search-memories.js` (searchMemories, SearchResult), `src/storage/memory.js` (MemoryStorage), `src/storage/interface.js` (CaptureEvent, EventId); external: `node:fs/promises`, `node:os`, `node:path`, `node:process`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ResultStatus` | type | `tools/retrieval-eval/run.ts:22` | Union of variant outcome classifications: `pass`, `expected_fail_matched`, `expected_fail_mismatched`, `unexpected_fail`. |
| `ToolOutput` | type | `tools/retrieval-eval/run.ts:28` | Union of the three MCP tool result shapes a recipe step can produce: `SearchResult \| FindClustersResult \| GetAtomsResult`. |
| `EvalWarning` | interface | `tools/retrieval-eval/run.ts:30` | Normalized warning record (code, origin tool/eval, message, optional step_id/ref) used to unify tool-emitted and eval-emitted warnings. |
| `MetricResult` | interface | `tools/retrieval-eval/run.ts:38` | Scored metric value plus pass/fail boolean and the human-readable gate description. |
| `StepRun` | interface | `tools/retrieval-eval/run.ts:44` | Record of one executed tool-recipe step: id, tool name, output byte size, raw output, and derived warnings. |
| `VariantRunResult` | interface | `tools/retrieval-eval/run.ts:52` | Full per-query-variant result: status, all 10 scored metrics, missing/forbidden refs, warning gaps, retrieved refs, call/byte totals, and step runs. |
| `CaseRunResult` | interface | `tools/retrieval-eval/run.ts:71` | Aggregates a case's id/priority/status plus all its variant results. |
| `EvalSummary` | interface | `tools/retrieval-eval/run.ts:78` | Top-level harness output: schema version, corpus mode, case/fixture counts, all case results, and an aggregate pass/fail/exit-code summary. |
| `RunOptions` | interface | `tools/retrieval-eval/run.ts:95` | Options for `runRetrievalEval`: optional caseId filter, repoRoot, homeDir overrides. |
| `FixtureCorpus` | interface | `tools/retrieval-eval/run.ts:101` | In-memory corpus bundle: MemoryStorage instance plus id↔fixture-ref and ref→event lookup maps. |
| `RunContext` | interface | `tools/retrieval-eval/run.ts:108` | Per-variant execution context threading case def, resolved case, variant, corpus, step outputs/runs, and eval warnings through recipe execution. |
| `METRIC_NAMES` | const | `tools/retrieval-eval/run.ts:118` | Ordered list of the 10 metric names scored per variant (primary_recall, top_rank_success, weighted_precision_at_5/overall, signal_noise_ratio_at_10, forbidden_noise, source_coverage, loss_legibility, per_call_budget_bytes, recipe_budget_bytes, call_efficiency). |
| `runRetrievalEval(options)` | function | `tools/retrieval-eval/run.ts:132` | Top-level orchestration: loads cases + fixtures, validates all cases against fixture refs, builds the fixture corpus, runs every selected case's variants through `runVariant`, and assembles the final `EvalSummary` with aggregate pass/fail counts and exit code. |
| `loadCases(repoRoot)` | function | `tools/retrieval-eval/run.ts:198` | Reads and JSON-parses every `*.json` file under `eval/retrieval/cases`, validates each against the retrieval-case schema, and returns the validated `RetrievalCase[]`, throwing `ValidationError` on any invalid case. |
| `loadFixtureEvents(repoRoot, cases)` | function | `tools/retrieval-eval/run.ts:213` | Collects the union of fixture files referenced by all cases, parses each JSONL line as a `FixtureEvent`, validates it, enforces globally-unique `fixture_ref`s, and runs `validateTimestampDeterminism` before returning all events. |
| `formatMarkdown(summary)` | function | `tools/retrieval-eval/run.ts:245` | Renders an `EvalSummary` as a Markdown report: header stats, a "top failing metric" callout, and per-case/per-variant sections with status, query, failed metrics, evidence refs, warnings, and tool recipe chain. |
| `runVariant(caseDef, resolvedCase, variant, corpus)` | function | `tools/retrieval-eval/run.ts:290` | Executes a single query variant's tool recipe step-by-step, derives primary/hydrated evidence refs, adds source-gap and forbidden-noise warnings, scores all metrics via `scoreMetrics`, and classifies the outcome via `classifyResult`, returning the full `VariantRunResult`. |
| `executeStep(step, ctx)` | function | `tools/retrieval-eval/run.ts:368` | Resolves a recipe step's params (`resolveParams`) and dispatches to `searchMemories`, `findClusters`, or `getAtoms`/`getAtomsPaginated` depending on `step.tool` and pagination flag, wrapping the raw tool output plus its byte size and derived warnings into a `StepRun`. |
| `resolveParams(step, ctx)` | function | `tools/retrieval-eval/run.ts:403` | Resolves a step's raw param templates via `resolveUnknown`; for `get_atoms` steps, additionally reorders atom ids (`orderAtomIdsNewestFirst`) if `deterministic_order` is set and clips ids to `ids_limit`, logging an `eval_truncated_hydration` warning on truncation. |
| `orderAtomIdsNewestFirst(atomIds, corpus)` | function | `tools/retrieval-eval/run.ts:423` | Sorts atom ids by their fixture event's parsed timestamp descending (missing timestamps sort last), stable on ties by original index. |
| `resolveUnknown(value, ctx)` | function | `tools/retrieval-eval/run.ts:436` | Recursively walks a param value (string/array/object) resolving any `$`-prefixed template strings via `resolveString`. |
| `resolveString(value, ctx)` | function | `tools/retrieval-eval/run.ts:447` | Resolves a single `$`-template token: `$query`, `$case.repo_path`, `$case.time_window.since/until`, `$case.reference_now`, `$labels.<field>` (maps label refs to fixture ids), or `$steps.<id>.<selector>` (pulls ids/atom_ids out of a prior step's output). |
| `getAtomsPaginated(storage, params, atomIds)` | function | `tools/retrieval-eval/run.ts:480` | Splits atom ids into chunks of 50, calls `getAtoms` per chunk, and merges atoms/dropped-ids/warnings into a single `GetAtomsResult`. |
| `scoreMetrics(caseDef, primaryOutput, primaryRefs, retrievedRefs, steps, warnings)` | function | `tools/retrieval-eval/run.ts:508` | Computes all 10 metrics for a variant: primary recall, top-rank success, weighted precision at-5/overall, signal:noise ratio at-10, forbidden-noise presence (P0 anywhere vs top-10 elsewhere), source coverage, loss legibility (no warning gaps), and per-call/recipe byte budgets + call count, each with a pass boolean against its gate. |
| `classifyResult(variant, failedMetrics, missingPrimary, forbiddenNoise, warningGaps, observedWarnings)` | function | `tools/retrieval-eval/run.ts:595` | Classifies a variant's outcome as pass/expected_fail_matched/expected_fail_mismatched/unexpected_fail by comparing actual failures against the variant's declared `expected_failure` allow-lists (metrics, missing refs, forbidden refs, warning gaps, required observed warnings). |
| `topRankSuccess(caseDef, primaryOutput, primaryRefs)` | function | `tools/retrieval-eval/run.ts:621` | Checks whether required-primary evidence appears in the first cluster (for `find_clusters` output) or within the first 3 matches otherwise. |
| `weightedPrecision(caseDef, refs)` | function | `tools/retrieval-eval/run.ts:634` | Computes mean per-ref relevance weight (via `weightFor`) over a set of retrieved refs; returns 0 for empty input. |
| `signalNoiseRatio(caseDef, refs)` | function | `tools/retrieval-eval/run.ts:640` | Sums positive relevance weight vs. noise/forbidden-noise count across refs and returns their ratio (999 sentinel when there's signal and zero noise, 0 when neither). |
| `weightFor(caseDef, ref)` | function | `tools/retrieval-eval/run.ts:652` | Maps a ref to a relevance weight: 1 for required_primary, 0.5 for required_context, 0.25 for acceptable_context, else 0. |
| `sourceCoverageScore(caseDef, retrievedRefs, warnings)` | function | `tools/retrieval-eval/run.ts:659` | Fraction of `caseDef.required_sources` either present among retrieved refs' source lanes or explicitly covered by an `eval_source_gap` warning. |
| `caseDefToSource(ref, warnings)` | function | `tools/retrieval-eval/run.ts:682` | Looks up the source-lane message recorded in an `eval_source_observed` warning keyed to a given ref. |
| `addSourceGapWarnings(caseDef, retrievedRefs, corpus, warnings)` | function | `tools/retrieval-eval/run.ts:687` | Emits `eval_source_observed` warnings for each retrieved ref's source lane and `eval_source_gap` warnings for any `required_sources` entry not observed. |
| `addForbiddenNoiseWarnings(caseDef, retrievedRefs, warnings)` | function | `tools/retrieval-eval/run.ts:719` | Emits an `eval_forbidden_noise` warning for every retrieved ref that appears in `caseDef.forbidden_noise`. |
| `warningGapsFor(caseDef, warnings)` | function | `tools/retrieval-eval/run.ts:736` | Returns the list of `must_warn` codes from the case definition that were not found among observed warnings with an allowed origin. |
| `primaryEvidenceRefs(output, idToRef)` | function | `tools/retrieval-eval/run.ts:747` | Extracts fixture refs from a tool output's primary evidence: match ids for search results, first cluster's atom ids for cluster results, or atom ids for get_atoms results. |
| `hydratedEvidenceRefs(steps, idToRef)` | function | `tools/retrieval-eval/run.ts:755` | Collects fixture refs for every atom returned by any `get_atoms`-shaped step in the recipe. |
| `toolWarnings(stepId, output)` | function | `tools/retrieval-eval/run.ts:767` | Converts a tool output's raw string `warnings` array into normalized `EvalWarning` objects with origin `tool` and a classified code (via `toolWarningCode`). |
| `toolWarningCode(warning)` | function | `tools/retrieval-eval/run.ts:780` | Classifies a raw tool warning string into a code: `tool_auto_expand`, `tool_tz_naive`, `tool_storage_cap`, `tool_budget_cap`, or generic `tool_warning`. |
| `buildCorpus(events, repoRoot, homeDir)` | function | `tools/retrieval-eval/run.ts:788` | Rewrites each fixture event's path tokens and appends it to a fresh `MemoryStorage`, building the id↔ref and ref→event maps that make up a `FixtureCorpus`. |
| `rewriteFixtureEvent(event, repoRoot, homeDir)` | function | `tools/retrieval-eval/run.ts:807` | Produces a storage-appendable `CaptureEvent` (minus id) from a `FixtureEvent`, rewriting `$EVAL_REPO`/`$EVAL_HOME` tokens in source/content/metadata and stamping `fixture_ref` into metadata. |
| `rewriteCase(c, repoRoot)` | function | `tools/retrieval-eval/run.ts:827` | Applies `$EVAL_REPO`/`$EVAL_HOME` token rewriting recursively across an entire `RetrievalCase` object. |
| `rewriteUnknown(value, repoRoot, homeDir)` | function | `tools/retrieval-eval/run.ts:831` | Recursively rewrites token strings through strings/arrays/records of arbitrary shape. |
| `rewriteTokenString(value, repoRoot, homeDir)` | function | `tools/retrieval-eval/run.ts:842` | Replaces literal `$EVAL_REPO` and `$EVAL_HOME` substrings with the resolved repoRoot/homeDir paths. |
| `validateTimestampDeterminism(events)` | function | `tools/retrieval-eval/run.ts:846` | Throws `ValidationError` if two fixture events share the same source and timestamp, since that would make ordering (e.g. newest-first) non-deterministic. |
| `sourceLane(source)` | function | `tools/retrieval-eval/run.ts:861` | Classifies a raw event source string into a coarse lane: `git`, `claude_code`, `codex`, `cursor`, or undefined. |
| `unique(values)` | function | `tools/retrieval-eval/run.ts:869` | Returns the input array with duplicates removed, preserving first-seen order. |
| `formatWarnings(warnings)` | function | `tools/retrieval-eval/run.ts:880` | Formats a warning list as a comma-joined `origin:code` string, or `'none'` if empty. |
| `isSearchResult(value)` | function | `tools/retrieval-eval/run.ts:885` | Type guard: true if the tool output has a `matches` field (search_memories result). |
| `isFindClustersResult(value)` | function | `tools/retrieval-eval/run.ts:889` | Type guard: true if the tool output has a `clusters` field (find_clusters result). |
| `isGetAtomsResult(value)` | function | `tools/retrieval-eval/run.ts:893` | Type guard: true if the tool output has an `atoms` field (get_atoms result). |
| `isRecord(value)` | function | `tools/retrieval-eval/run.ts:897` | Type guard: true for non-null, non-array objects. |
| `isString(value)` | function | `tools/retrieval-eval/run.ts:901` | Type guard filtering out `undefined` from a `string \| undefined` value. |
| `ValidationError` | class | `tools/retrieval-eval/run.ts:905` | Error subclass carrying a list of individual validation error message strings, joined for the error's `message`. |
| `parseArgs(argv)` | function | `tools/retrieval-eval/run.ts:912` | Parses CLI flags `--case` and `--format` (json/md) for the run.ts entry point; rejects `--update-fixtures` here, directing users to `build-fixture.ts`'s local provenance mode instead. |
| `main()` | function | `tools/retrieval-eval/run.ts:936` | Entry point: parses args, runs `runRetrievalEval`, prints JSON or Markdown output per `--format`, and sets `process.exitCode` from the summary's aggregate exit code; on `ValidationError`, prints errors and exits 2. |
| `invokedAsScript` | const | `tools/retrieval-eval/run.ts:954` | Detects (outside Vitest) whether this file was invoked directly as a script, gating the auto-run of `main()`. |
