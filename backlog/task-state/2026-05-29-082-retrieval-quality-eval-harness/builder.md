---
task_id: 2026-05-29-082-retrieval-quality-eval-harness
role: builder
writer: codex-builder
last_updated: 2026-05-30T03:38:41Z
---

## current_thesis

Claimed by codex builder `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405`. Implement a deterministic retrieval-quality eval harness that measures evidence quality and loss legibility against sanitized journal/JSONL-grounded fixtures, without changing production retrieval behavior.

## locked_decisions

- AC1: create `docs/retrieval-eval.md` defining labels, good retrieval, signal/noise, non-goals, metrics, thresholds, expected-fail semantics, and warning/loss scope.
- AC2: add typed JSON case schema and validation helpers in `eval/retrieval/schema.ts`; no YAML or new parser dependency.
- AC3: add `tools/retrieval-eval/build-fixture.ts` for committed fixture validation and optional explicit local provenance mode; fixtures stay sanitized, host-independent, and deterministic.
- AC4: add `tools/retrieval-eval/run.ts` to load the full committed fixture universe, call existing retrieval handlers in process, score evidence/warnings/budgets, and emit deterministic JSON/Markdown.
- AC5: seed six named cases with at least two query variants each, cross-tool requirements on at least two cases, and warning assertions on at least two cases.
- AC6: add `npm run eval:retrieval` only for the deterministic in-process harness; support `--case`, `--format json|md`, and local-only `--update-fixtures`; exit 0/1/2 per spec.
- AC7: production retrieval, ranking, storage, MCP wire shapes, extractors, overlays, and result caps must remain unchanged; baseline retrieval-quality failures are acceptable when reported.
- Expected-fail variants are legal only for current retrieval limitations, never schema/fixture/runtime/budget/silent-loss failures.
- Focused `--case` runs must load the same fixture universe as the full suite and filter only scoring/output.

## open_questions

- None blocking at claim time.

## dont_touch

- No embeddings, semantic/KNN search, query expansion, alias layer, reranker, or LLM-as-judge gate.
- No production changes under `src/mcp/tools/*`, `src/trace/*`, storage adapters, extractors, daemon server, Raycast, overlay, or browser extension.
- No new MCP tool, live-daemon CI requirement, broad home-directory scans, or unredacted private raw session transcripts.
- No wiki edits before the item ships.
- No attempt to define all future retrieval quality beyond this first P0/P1 eval pack and runner.

## canonical_anchors

- spec: backlog/claimed/2026-05-29-082-retrieval-quality-eval-harness.md
- reviews: backlog/reviews/2026-05-29-082-retrieval-quality-eval-harness/
