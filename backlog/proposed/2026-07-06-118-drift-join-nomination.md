---
id: 2026-07-06-118-drift-join-nomination
title: "Drift join: similarity-nominated candidates with judge confirmation + observable misses"
status: proposed
priority: HIGH
estimate: 1-2d
created: 2026-07-06
blocked_by: []
spec_refs:
  - raw/internal/decisions/2026-07-06-drift-failure-modes-root-causes.md   # B3 root cause + the empirical subject study this fixes
  - raw/internal/decisions/2026-07-04-seam-v0-decision.md                  # decisions 18 (dumb-then-alias), 19 (no AI in plumbing) — the rules this stays inside
  - src/util/subject.ts                                                    # the ONE shared normalizer to extend (separator folding)
  - src/enrich/decision-drift.ts                                          # the join (:611-643), pairKey, watermark, DriftSweepResult
  - src/enrich/granola-signals.ts                                         # buildExtractionPrompt (:858) — the extraction prompt to pin; validateSignal/normalize at :446,:476
files_to_modify:
  # PROVISIONAL
  - src/util/subject.ts                                # extend normalizeSubject: fold separator classes into space
  - src/enrich/decision-drift.ts                       # nominate-then-confirm join + per-tick miss counters + near-miss log
  - src/enrich/granola-signals.ts                      # pin subject format in the extraction prompt (prompt text only)
  - tests/util/                                        # normalizeSubject separator-fold fixtures (the 3 measured pairs)
  - tests/enrich/                                      # nominator + near-miss + observability coverage
---

## Problem

The 114 drift join is exact-equality on `canonical_subject` (`decision-drift.ts:632` — `decisionBySubject.get(statement.canonical_subject)`), and the empirical study (2026-07-05, decision record B3) shows that is silently near-zero recall: 462 distinct subjects across 524 signals, cross-meeting byte-repeat 0.5% (1/191 decision subjects) against ~37% topical continuity by a lenient proxy. The extractor flips snake_case vs space-separated per meeting (13 vs 4), and `normalizeSubject` collapses whitespace but does not fold separators — so 3 measured word-identical pairs differ only by `_` vs space and the join drops all three.

Worse, the misses are **unobservable**: the no-match path `continue`s with no counter, trace, or log (`decision-drift.ts:632-633`). Seam decision 18's escape hatch ("alias earns its keep after lexical matching *demonstrably misses* real drift") therefore can never fire — there is no evidence of a miss. This item makes the join a deterministic, AI-free **nominate-then-confirm** step (candidates chosen by token-overlap, confirmed by the *existing* brain judge — the precision gate seam decision 18 already permits above the seam), folds separators in the one shared normalizer, pins the extractor format, and turns every no-candidate statement into logged data. It does NOT add an entity/alias registry or any embedding — those remain deferred follow-ups, now unblocked by the miss data this produces.

## Acceptance Criteria

- **AC1 — one shared normalizer folds separator classes:** `normalizeSubject` in `src/util/subject.ts` (the single normalizer 112 unified) additionally folds `_` and `-` (and runs of them) to a single space before the existing lowercase/trim/whitespace-collapse, so `openai_investment_terms`, `openai-investment-terms`, and `openai investment terms` produce the identical key. All writers and readers inherit it unchanged (signal `canonical_subject` at `granola-signals.ts:476`, decision `normalized_subject`, and the drift join key). The `team-decision:<normalized>` dedupe_key derived from it stays stable for subjects that contained no separators; document in the util's doc comment that separator-only-differing subjects now collapse (intended). Tests: the 3 measured word-identical pairs (`openai sponsorship` family and the two other real pairs from the study) each normalize equal; a subject with no separators is byte-unchanged from today's output.
- **AC2 — extraction prompt pins subject format:** `buildExtractionPrompt` (`granola-signals.ts:858`) instructs the extractor to emit `canonical_subject` as a **space-separated lowercase noun phrase** (no snake_case, no camelCase, no separators). Prompt text only — no change to the signal schema, `parseExtractedSignal`, `validateSignal`, or any metadata key. `normalizeSubject` remains the authority (the prompt reduces variance; it does not replace normalization). Test: the prompt string contains the pinned-format instruction (guards against silent prompt regressions).
- **AC3 — the join becomes nominate-then-confirm (AI-free nominator):** replace the exact `Map.get` with a deterministic nominator that, for each statement, scores every recorded decision by **Jaccard similarity over normalized word sets** (split the normalized subject on whitespace into a set; `|A∩B| / |A∪B|`) and nominates the decisions scoring at or above a named-constant threshold (`DRIFT_NOMINATION_JACCARD_THRESHOLD`), capped at the top `DRIFT_MAX_NOMINATIONS_PER_STATEMENT` (named constant, bounds brain cost per statement) by descending score. The nominator contains **no embeddings and no LLM** (seam decision 19 preserved — nothing in the plumbing calls an AI). Each nominated `(decision, statement)` pair is judged through the **existing** `judgePair`/brain path unchanged: pair key stays `driftPairKey(decision.dedupe_key, statement.statement_dedupe_key, judgeVersion)`, so multi-nomination is checkpoint-safe (distinct keys), and the judge budget, checkpoint semantics, delivery guard, and terminal states are untouched. Watermark semantics unchanged: a statement blocks the watermark iff any of its nominated pairs is non-terminal (reuse the existing `blockingSeqs` per-statement logic). An exact byte-match still nominates (threshold-inclusive: identical sets score 1.0). Tests: `"openai sponsorship"` vs `"openai investment terms"` (partial token overlap) nominates and is judged; two unrelated subjects (Jaccard below threshold) do not nominate; a statement matching two decisions above threshold produces two pairs, both judged, both checkpointed independently; nomination count per statement never exceeds the cap.
- **AC4 — no-candidate misses become data:** the sweep tracks and reports, in both the `DriftSweepResult` (`status:'ok'` branch) and the `drift_sweep_ok` structured log, per-tick counters: `statements_seen`, `statements_nominated` (statements with ≥1 candidate at/above threshold), `statements_no_candidate` (statements with zero). For each no-candidate statement, emit a structured near-miss log line carrying the statement's subject, the **top-scoring below-threshold decision subject**, and that score (or an explicit "no decisions to score against" when the decision set is empty). This is the evidence seam decision 18 requires before an alias layer can earn its keep. Tests: a tick with one nominated and one no-candidate statement reports `statements_nominated:1`, `statements_no_candidate:1`; the no-candidate statement's near-miss log names the closest decision subject and its sub-threshold score; a no-candidate statement is NOT judged (zero brain invocations for it).
- **AC5 — end-to-end over the measured shapes:** an integration-style test over the real measured shapes: a separator-only-differing pair now joins and is judged (would have missed under 114); a topically-continuous-but-distinct pair (`openai sponsorship` / `openai investment terms`) nominates and is judged; an unrelated pair is logged as a near-miss, never judged. The existing 114 idempotency/watermark/at-most-once tests still pass unchanged (this item changes *which* pairs are nominated, not the per-pair state machine).

## Out of Scope (Don't Drift)

- **No entity/alias registry and no alias table.** The nominator is stateless token-overlap; alias grouping (below-the-seam saved facts) is the deferred follow-up this item's miss data unblocks — not built here.
- **No embeddings, no semantic/vector matching, no LLM anywhere in the nominator or normalizer** (seam decision 19). The only AI is the existing judge, above the seam, unchanged.
- **No decision-store schema changes** and no new metadata keys — separator folding rides the existing `normalizeSubject`; the prompt change is text-only.
- **No changes to `getSignalWindow` / signal-window loop-filter, `search_memories`, or scope semantics** — those are separate tracks.
- **No change to the judge prompt, judge budget, checkpoint schema, delivery, or watermark state machine** beyond feeding it nominated pairs.
- A drift verdict is still never persisted as a fact atom (seam decision 3/6) — nomination is plumbing, confirmation is the judge, both ephemeral.

## After Completion (Strategist Notes)

- Update the `wiki/surfaces/drift-alert` page: the join is nominate-then-confirm (deterministic token-overlap nominator + brain confirmation), with separator folding and a pinned extractor format; document the named-constant threshold + cap.
- The first week of `statements_no_candidate` near-miss logs is the input to the alias-table decision record — the miss data seam decision 18 was waiting on. Do not deepen the nominator until that data says lexical demonstrably misses real drift.
- Demo note: the pinned extractor format + separator fold make same-day meeting-sourced drift far more likely to actually fire on camera; re-run the drift path on real meetings before freeze (Jul 18).
