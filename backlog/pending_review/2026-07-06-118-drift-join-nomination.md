---
id: 2026-07-06-118-drift-join-nomination
title: "Drift join: similarity-nominated candidates with judge confirmation + observable misses"
status: proposed
priority: HIGH
estimate: 1-2d
created: 2026-07-06
blocked_by: []
claimed_by: "builder-120-118-B4913C34"
claimed_at: "2026-07-06T02:05:00Z"
branch: "agent/drift-join-nomination"
head_sha: "07ad880afec601c67cfe05058f71bdfe30b87569"
agent_notes: |
  Built to all 5 ACs. AC1: normalizeSubject folds _/-/runs to space before the
  existing lowercase/trim/collapse (no-separator subjects byte-unchanged, so
  dedupe_key stability holds; separator-only subjects intentionally collapse).
  AC2: one pinned-format line added to buildExtractionPrompt (text only). AC3:
  exact Map.get replaced with a deterministic AI-free Jaccard nominator over
  normalized word sets — DRIFT_NOMINATION_JACCARD_THRESHOLD=0.2 and
  DRIFT_MAX_NOMINATIONS_PER_STATEMENT=5 (both exported), total tie-breaker (score
  desc, subject asc, dedupe_key asc), decision token sets computed once per tick,
  each nominated pair judged via the EXISTING judgePair path with the unchanged
  pairKey (checkpoint/watermark/budget/delivery untouched). AC4: per-tick
  counters statements_seen/nominated/no_candidate/decisions_scored in the result
  + drift_sweep_ok log; every no-candidate statement emits a drift_nomination_miss
  naming its closest below-threshold decision (same tie-breaker) or a
  no-decisions note. AC5: separator-only + topical-continuous joins, unrelated
  near-miss; 114 suite unchanged.

  Reviewer notes: (1) the large decision-drift.ts diff is mostly prettier
  RE-INDENTING the existing per-pair body now nested inside a per-nominated-
  decision loop — the body logic is unchanged; focus review on the nominator
  block (subjectTokens/jaccardSimilarity/compareScoredDecisions + the
  score/filter/sort/slice) and the counters. (2) subjectTokens re-normalizes at
  join time so older stored subjects retroactively benefit. (3) The 3 study pairs:
  the decision record names only the openai pair verbatim, so the subject test
  uses it + two real-shaped separator-only pairs.

  ALL files are within files_to_modify (no new shipped module, so packed-manifest
  is untouched). typecheck clean, lint clean. Touched suites: subject 5/5,
  decision-drift 28/28, granola-signals 32/32. Full test:product: only the same
  load-sensitive timing/perf flakes as item 120 (ceo-slack-brain, coord-volume-perf)
  are red — both pass in isolation, neither touches this item. Run log:
  raw/internal/agent-runs/2026-07-06-2026-07-06-118-drift-join-nomination.md

  REBASE (2026-07-06, founder-directed): after 120 and 119 merged to main, this
  branch was rebased onto origin/main so 118 sits on the settled sweep-loop core.
  head_sha updated aed7dad1 → 07ad880a (full SHA above). Conflicts were in
  src/enrich/decision-drift.ts + tests/enrich/decision-drift.test.ts only
  (subject.ts + granola-signals.ts auto-merged clean). Rather than untangle a
  duplicated-body 3-way conflict, I took origin/main's settled version of both
  files as the base and re-applied the 118 nominator surgically: nominator
  constants/helpers, DriftSweepResult counters, the per-pair body (now carrying
  120's retryable_failures/noContradiction + degraded logic AND 119's typed
  deliverPair/delivery-deferred retry, UNCHANGED) wrapped in the
  per-nominated-decision loop, and the result/log counters. Post-rebase FULL
  verify against the settled loop is GREEN: typecheck clean, lint clean, full
  npm run test:product = 1767 passed / 0 failed (162 files; even the timing/perf
  tests passed this run). decision-drift.test.ts = 36 tests (120's + 119's + 118's
  blocks coexisting, all green) — 119/120 tests pass against the restructured
  loop, so no real integration regression.
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
ready_content_sha: f76abf6bdbba7eec0142f7be950c0130d8662f065adb72aacec02d489daeee93
---

## Problem

The 114 drift join is exact-equality on `canonical_subject` (`decision-drift.ts:632` — `decisionBySubject.get(statement.canonical_subject)`), and the empirical study (2026-07-05, decision record B3) shows that is silently near-zero recall: 462 distinct subjects across 524 signals, cross-meeting byte-repeat 0.5% (1/191 decision subjects) against ~37% topical continuity by a lenient proxy. The extractor flips snake_case vs space-separated per meeting (13 vs 4), and `normalizeSubject` collapses whitespace but does not fold separators — so 3 measured word-identical pairs differ only by `_` vs space and the join drops all three.

Worse, the misses are **unobservable**: the no-match path `continue`s with no counter, trace, or log (`decision-drift.ts:632-633`). Seam decision 18's escape hatch ("alias earns its keep after lexical matching *demonstrably misses* real drift") therefore can never fire — there is no evidence of a miss. This item makes the join a deterministic, AI-free **nominate-then-confirm** step (candidates chosen by token-overlap, confirmed by the *existing* brain judge — the precision gate seam decision 18 already permits above the seam), folds separators in the one shared normalizer, pins the extractor format, and turns every no-candidate statement into logged data. It does NOT add an entity/alias registry or any embedding — those remain deferred follow-ups, now unblocked by the miss data this produces.

## Acceptance Criteria

- **AC1 — one shared normalizer folds separator classes:** `normalizeSubject` in `src/util/subject.ts` (the single normalizer 112 unified) additionally folds `_` and `-` (and runs of them) to a single space before the existing lowercase/trim/whitespace-collapse, so `openai_investment_terms`, `openai-investment-terms`, and `openai investment terms` produce the identical key. All writers and readers inherit it unchanged (signal `canonical_subject` at `granola-signals.ts:476`, decision `normalized_subject`, and the drift join key). The `team-decision:<normalized>` dedupe_key derived from it stays stable for subjects that contained no separators; document in the util's doc comment that separator-only-differing subjects now collapse (intended). Tests: the 3 measured word-identical pairs (`openai sponsorship` family and the two other real pairs from the study) each normalize equal; a subject with no separators is byte-unchanged from today's output.
- **AC2 — extraction prompt pins subject format:** `buildExtractionPrompt` (`granola-signals.ts:858`) instructs the extractor to emit `canonical_subject` as a **space-separated lowercase noun phrase** (no snake_case, no camelCase, no separators). Prompt text only — no change to the signal schema, `parseExtractedSignal`, `validateSignal`, or any metadata key. `normalizeSubject` remains the authority (the prompt reduces variance; it does not replace normalization). Test: the prompt string contains the pinned-format instruction (guards against silent prompt regressions).
- **AC3 — the join becomes nominate-then-confirm (AI-free nominator):** replace the exact `Map.get` with a deterministic nominator that, for each statement, scores every recorded decision by **Jaccard similarity over normalized word sets** (split the normalized subject on whitespace into a set; `|A∩B| / |A∪B|`) and nominates the decisions scoring at or above a named-constant threshold, capped at the top named-constant cap by descending score. **Pinned values (r1 codex F1 / codex-ops F1 — the values, not just the names, are the reviewable contract):** `DRIFT_NOMINATION_JACCARD_THRESHOLD = 0.2` and `DRIFT_MAX_NOMINATIONS_PER_STATEMENT = 5`. Rationale: the measured `"openai sponsorship"` / `"openai investment terms"` pair scores exactly `1/4 = 0.25` (one shared token over four distinct), so `0.2` nominates it with margin. The `0.2` floor is deliberately permissive about token overlap — its actual boundary behavior: a **single** shared token is enough to nominate when the union is small (one common word across two 3-word subjects scores `1/5 = 0.2`, included at the inclusive floor), while a lone shared token across a larger union (`union ≥ 6`, e.g. `1/6 ≈ 0.167`) falls below `0.2` and does not nominate. Precision is not the threshold's job: the judge remains the precision gate, so the nominator errs toward over-nominating and the cap, not the threshold, is what bounds cost. `5` bounds worst-case per-tick judge load to `statements_seen × 5` and mirrors the drift/seed retry family's `5`. **Deterministic ordering (r1 codex F2 / codex-ops F2):** ties are broken by score descending, then normalized decision subject ascending, then decision `dedupe_key` ascending — a total order independent of recorded-decision iteration order, so identical inputs always nominate and checkpoint the identical pair set (seam decision 11 byte-identical answer). Decision token sets are computed **once per tick** (not once per statement) so scoring is the only per-statement work. The nominator contains **no embeddings and no LLM** (seam decision 19 preserved — nothing in the plumbing calls an AI). Each nominated `(decision, statement)` pair is judged through the **existing** `judgePair`/brain path unchanged: pair key stays `driftPairKey(decision.dedupe_key, statement.statement_dedupe_key, judgeVersion)`, so multi-nomination is checkpoint-safe (distinct keys), and the judge budget, checkpoint semantics, delivery guard, and terminal states are untouched. Watermark semantics unchanged: a statement blocks the watermark iff any of its nominated pairs is non-terminal (reuse the existing `blockingSeqs` per-statement logic). An exact byte-match still nominates (threshold-inclusive: identical sets score 1.0). Tests: `"openai sponsorship"` vs `"openai investment terms"` (0.25) nominates and is judged; a pair scoring exactly `0.2` nominates (inclusive boundary) and a pair just below `0.2` does not; a statement matching two decisions above threshold produces two pairs, both judged, both checkpointed independently; more than five tied-score candidates truncate to exactly five by the deterministic tie-breaker (a tie fixture asserts *which* five, not just the count); nomination count per statement never exceeds the cap.
- **AC4 — no-candidate misses become data:** the sweep tracks and reports, in both the `DriftSweepResult` (`status:'ok'` branch) and the `drift_sweep_ok` structured log, per-tick counters: `statements_seen`, `statements_nominated` (statements with ≥1 candidate at/above threshold), `statements_no_candidate` (statements with zero), and `decisions_scored` (the size of the recorded-decision pool scored against this tick — the operator-visible scoring-volume metric from r1 codex-ops F3, so cost growth surfaces before the nominator's `statements_seen × decisions_scored` work starts overrunning the sweep interval; the decision pool is deliberately NOT bounded to the window because the join must see every latest-per-subject decision, matching 114's accepted full-scan-per-tick). For each no-candidate statement, emit a structured near-miss log line carrying the statement's subject, the **top-scoring below-threshold decision subject**, and that score (or an explicit "no decisions to score against" when the decision set is empty). The top-scoring below-threshold subject is selected by the **same deterministic tie-breaker as AC3** (score descending, then normalized subject ascending, then `dedupe_key` ascending), so near-miss evidence is reproducible under ties. This is the evidence seam decision 18 requires before an alias layer can earn its keep. Tests: a tick with one nominated and one no-candidate statement reports `statements_nominated:1`, `statements_no_candidate:1`, and a `decisions_scored` equal to the recorded-decision count; the no-candidate statement's near-miss log names the closest decision subject and its sub-threshold score, and a tie fixture asserts the tie-breaker picks the deterministic subject; a no-candidate statement is NOT judged (zero brain invocations for it).
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
