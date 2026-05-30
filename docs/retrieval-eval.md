# Retrieval Eval

This is the V0 retrieval-quality standard for ECHO's journal/JSONL-grounded eval pack. It measures the evidence set returned by retrieval tools, not final LLM prose.

## Evidence Labels

| Label                | Meaning                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `required_primary`   | Evidence without which the intent cannot be answered correctly.                                                           |
| `required_context`   | Supporting evidence that should appear with the primary refs.                                                             |
| `acceptable_context` | Helpful context that does not hurt the answer if primary evidence is present.                                             |
| `noise`              | Irrelevant or low-value material that consumes budget.                                                                    |
| `forbidden_noise`    | Circular/meta-summary, wrong-project, stale-without-warning, or misleading evidence that must not crowd out primary work. |

## Good Retrieval

Good retrieval returns the primary evidence needed to answer, keeps it top-ranked, scopes it to the requested project/time/domain, hydrates it within budget, and makes omissions, truncation, staleness, source gaps, and storage caps explicit.

Signal is evidence that helps answer the intent. Noise is irrelevant, wrong-project, stale without a warning, circular/meta-summary standing in for primary work, or budget-consuming material that crowds out required evidence.

## Non-Goal

V0 does not judge final answer prose. It scores evidence quality and warning legibility first. Answer faithfulness can be added after retrieval evidence is measurable.

## Metrics

| Metric                       | Definition                                                                               | Gate                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `primary_recall`             | Required-primary fixture refs returned and hydrated                                      | P0 singleton must-haves = 1.00; suite >= 0.80          |
| `top_rank_success`           | Primary evidence appears in the first cluster or first 3 matches                         | true for every P0/P1 case                              |
| `weighted_precision_at_5`    | primary=1, context=0.5, acceptable=0.25, noise=0                                         | >= 0.80                                                |
| `weighted_precision_overall` | Same weighting across the scored retrieved set                                           | >= 0.70                                                |
| `signal_noise_ratio_at_10`   | positive weight divided by noise count in top 10                                         | >= 4:1                                                 |
| `forbidden_noise`            | Circular/meta/wrong-project/stale-forbidden hits                                         | 0 in top 10; 0 anywhere for P0                         |
| `source_coverage`            | Required lanes/artifacts present or explicitly warned missing                            | 100% P0; >= 95% suite                                  |
| `loss_legibility`            | Truncation/storage cap/TZ ambiguity/oversize/staleness warnings surfaced when applicable | 100%                                                   |
| `per_call_budget_bytes`      | Serialized response envelope per tool call                                               | hard <= 25KB; `find_clusters` target <= 10KB           |
| `recipe_budget_bytes`        | Total retrieved context per common intent                                                | <= 50KB common; <= 75KB long-window consult            |
| `call_efficiency`            | Calls needed for common retrieval recipe                                                 | <= 3 common; <= 4 alias cases until alias layer exists |

## Baseline Semantics

Harness correctness is separate from retrieval quality. Schema validation, fixture refs, deterministic execution, JSON/Markdown output, exit codes, and warning reporting must work regardless of current retrieval quality.

Query variants use `baseline_status: "pass"` or `baseline_status: "expected_fail_current_behavior"`. Expected-fail variants must include structured `expected_failure` with allowed failed metrics, missing refs, forbidden refs, and warning gaps. The runner reports `expected_fail_matched` only when the observed failure is inside that allowed contract.

Schema errors, fixture-ref misses, nondeterminism, runtime exceptions, hard budget violations, and silent-loss cases are harness failures and cannot be masked as expected retrieval failures.

## Commands

```bash
npm run eval:retrieval
npm run eval:retrieval -- --case signal-vs-noise-alias
npm run eval:retrieval -- --format json
vite-node --script tools/retrieval-eval/build-fixture.ts
```

Focused `--case` runs load the same committed fixture universe as the full suite and filter only scoring/output. That keeps rank, source coverage, and forbidden-noise behavior reproducible between suite and focused triage.
