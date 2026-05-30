---
backlog_item: 2026-05-29-082-retrieval-quality-eval-harness
agent_run_started: 2026-05-30T03:38:41Z
agent_run_ended: 2026-05-30T04:03:09Z
status: ready_for_review
test_status: passing
---

# Agent Run: Retrieval Quality Eval Harness

## What I Implemented

Implemented a deterministic retrieval-quality eval harness grounded in sanitized fixture refs and JSON case files. The harness defines the scoring standard, validates committed cases/fixtures, loads the full committed fixture universe into `MemoryStorage`, calls the existing retrieval handlers in process, normalizes storage atom IDs back to stable fixture refs, scores evidence/warnings/budgets, and emits JSON or Markdown summaries.

The feature branch is `agent/retrieval-quality-eval-harness` at `599903bf1d4a7aefd023dd8e612142dea99bbec2`.

## Files Modified

- `docs/retrieval-eval.md` - retrieval-quality standard, evidence labels, gates, warning semantics, and baseline reporting rules.
- `eval/retrieval/schema.ts` - typed case/fixture schema plus validation helpers.
- `eval/retrieval/fixtures/core.jsonl` - sanitized committed fixture corpus.
- `eval/retrieval/cases/generated-label-circular-retrieval.json` - P1 circular-label case.
- `eval/retrieval/cases/neutrality-axis-alias.json` - P1 alias case.
- `eval/retrieval/cases/resume-after-clear-newest-first.json` - P0 resume/newest-first case.
- `eval/retrieval/cases/signal-vs-noise-alias.json` - P0 signal-vs-noise alias case.
- `eval/retrieval/cases/stale-source-degraded-warning.json` - P0 stale/degraded-source warning case.
- `eval/retrieval/cases/what-shipped-today-needs-artifacts.json` - P0 shipped-artifacts case.
- `tools/retrieval-eval/build-fixture.ts` - committed fixture validator and explicit local provenance-mode entrypoint.
- `tools/retrieval-eval/run.ts` - in-process runner, placeholder binding, scoring, JSON/Markdown output, and CLI.
- `tests/retrieval-eval/schema.test.ts` - schema and validation coverage.
- `tests/retrieval-eval/cases.test.ts` - committed seed case coverage.
- `tests/retrieval-eval/run.test.ts` - runner, fixture rewriting, focused mode, hydration, and output-shape coverage.
- `tests/retrieval-eval/scorer.test.ts` - metrics, warnings, budgets, and expected-fail classification coverage.
- `tests/retrieval-eval/determinism.test.ts` - ambient time/path/UUID determinism coverage.
- `package.json` - added `eval:retrieval`.

## Decisions Made During Implementation

### Decision 1: Keep the runner in process

- **Options considered:** live daemon/MCP calls, direct handler calls over `MemoryStorage`.
- **Chose:** direct handler calls over `MemoryStorage`.
- **Why:** AC4 forbids a live daemon, MCP network call, embeddings service, or LLM judge in CI mode. Direct calls preserve the current retrieval contract while keeping the suite deterministic.
- **Worth founder review?** No - this follows the spec.

### Decision 2: Treat expected current failures as retrieval-quality output, not harness failure

- **Options considered:** force all seeded variants to pass, or report current expected failures with structured constraints.
- **Chose:** structured expected-fail classification.
- **Why:** AC1 and AC6 explicitly allow the first committed run to fail retrieval-quality gates if the harness reports the failures, matches them to allowed surfaces, and tests pass.
- **Worth founder review?** Yes - the baseline failures should guide the next retrieval-fix item.

### Decision 3: Load the full fixture universe for focused runs

- **Options considered:** case-isolated focused mode, or full-suite corpus with filtered scoring/output.
- **Chose:** full-suite corpus for every run.
- **Why:** AC4 and AC6 require focused `--case` runs to reproduce full-suite signal/noise conditions and filter only scoring/output.
- **Worth founder review?** No - this is specified behavior.

## Acceptance Criteria Status

- [x] AC1 - Defined the retrieval-quality standard and metrics in `docs/retrieval-eval.md`.
- [x] AC2 - Added typed JSON case schema and validation helpers in `eval/retrieval/schema.ts`.
- [x] AC3 - Added committed sanitized fixtures plus fixture validation/local provenance mode in `tools/retrieval-eval/build-fixture.ts`.
- [x] AC4 - Implemented the in-process runner and scorer in `tools/retrieval-eval/run.ts`.
- [x] AC5 - Seeded six named cases, each with at least two variants; cross-tool requirements and warning assertions are present.
- [x] AC6 - Added `npm run eval:retrieval`; JSON/Markdown output is deterministic and exit codes are documented. The baseline all-case run exits `1` with 3 expected current-behavior failures, 0 mismatches, and 0 unexpected failures.
- [x] AC7 - Production retrieval behavior is unchanged; no production retrieval/ranking/storage/MCP/extractor/overlay/browser files were modified.

## Tests Run

`npm run typecheck`

```text
> echoctl@0.1.0 typecheck
> tsc --noEmit
```

`npm test -- tests/retrieval-eval`

```text
> echoctl@0.1.0 test
> vitest run tests/retrieval-eval

 RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--retrieval-quality-eval-harness

 ✓ tests/retrieval-eval/schema.test.ts (3 tests) 5ms
 ✓ tests/retrieval-eval/cases.test.ts (2 tests) 15ms
 ✓ tests/retrieval-eval/scorer.test.ts (3 tests) 39ms
 ✓ tests/retrieval-eval/run.test.ts (3 tests) 47ms
 ✓ tests/retrieval-eval/determinism.test.ts (3 tests) 53ms

 Test Files  5 passed (5)
      Tests  14 passed (14)
   Start at  21:00:06
   Duration  1.03s (transform 472ms, setup 0ms, collect 1.57s, tests 158ms, environment 1ms, prepare 301ms)
```

`npx vite-node --script tools/retrieval-eval/build-fixture.ts`

```text
Committed retrieval fixtures valid: 6 case(s), 19 fixture event(s)
```

`npm run --silent eval:retrieval -- --format md >/tmp/echo-retrieval-eval.md; RC=$?`

```text
eval_rc:1
```

Top of the generated Markdown summary:

```text
# Retrieval Eval Summary

- Corpus mode: full-suite
- Focused case: none
- Cases scored: 6
- Fixtures loaded: 19
- Exit code: 1

## Top failing metric

- generated-label-circular-retrieval/generated-label: primary_recall (expected_fail_matched)
- Missing primary: label-primary-work
- Forbidden noise: label-noise-generated
- Warning gaps: none
- Budget/calls: 1576 bytes across 2 calls
```

Aggregate JSON status observed during verification:

```json
{"total_variants":12,"failed_variants":3,"expected_fail_matched":3,"expected_fail_mismatched":0,"unexpected_failures":0,"exit_code":1}
```

`npm run lint`

```text
> echoctl@0.1.0 lint
> eslint . --max-warnings 0 && npm run lint:task-state

> echoctl@0.1.0 lint:task-state
> python3 tools/task-state/lint.py
```

`tools/sync-skills.sh --check && git diff --check`

```text
OK: all Claude command adapters match canonical skills/
```

## Open Questions for Founder

None blocking. The intentionally reported baseline failures are:

1. `generated-label-circular-retrieval/generated-label` - expected circular/generated-label retrieval limitation.
2. `neutrality-axis-alias/natural-language` - expected alias gap around "competition axis" vs "neutrality axis".
3. `signal-vs-noise-alias/natural-language` - expected alias gap around "signal vs noise" vs "signal-to-noise/right slice".

## Anything I Almost Did But Stopped Myself

No drift events. I did not change production retrieval behavior or add aliasing/ranking fixes even though the harness exposes those as likely follow-on work.

## Next Suggested Backlog Items (Don't Auto-Create)

Use the three expected matched baseline failures to choose a follow-on retrieval-fix spec after this measurement harness is reviewed and merged.
