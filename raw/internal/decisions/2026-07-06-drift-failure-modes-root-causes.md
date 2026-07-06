# Drift-loop failure modes — root causes behind the 114 batch's silent gaps

**Date:** 2026-07-06
**Status:** decided (founder-directed scope; strategist-specced as items 118–120)
**Builds on:** `2026-07-04-seam-v0-decision.md` (the seam decisions the sweep implements), `2026-07-03-loop-gap-analysis.md` (station-6 rails), `2026-07-05-terminal-first-demo-surface.md` (pre-freeze demo path).
**Method:** read-only empirical study of the prod atom store (2026-07-05) plus a sandboxed harness driving the real `runDriftSweepOnce` with injected judge/post stubs. This record is the citable basis for the three fixes; the per-probe evidence lives in the study transcript.

The 114 drift sweep shipped to acceptance criteria and merged clean. But three of its design choices are *silent* under real conditions — they fail without producing an observable event. That is the exact failure class the loop-gap analysis named as ECHO's most-recurring one ("silence sends no notification"; "ECHO cannot see its own loop"). This record pins what was measured, why each is silent, and where the fix belongs.

## A. Empirical subject study (2026-07-05, read-only on prod db)

The drift join (114 AC2) is exact-equality on `canonical_subject`. The store shows why that under-fires:

- **524 signals across 18 meetings, 462 distinct `canonical_subject` values.** Subjects are almost entirely unique per statement.
- **Cross-meeting byte-repeat is 0.5%** — exactly 1 of 191 decision-typed subjects byte-matches a subject from a different meeting. Against that, a lenient topical-continuity proxy (shared salient tokens) puts real cross-meeting continuity near **37%**. The exact join captures the 0.5% and misses the rest.
- **The extractor's format is unstable.** It emits snake_case subjects for 13 meetings and space-separated for 4 — the same LLM, flipping format per run. `normalizeSubject` lowercases and collapses whitespace but does **not** fold separator classes, so `openai_investment_terms` and `openai investment terms` are two different keys.
- **3 word-identical pairs differ only by `_` vs space** — e.g. subjects that are the same phrase, same words, same order, defeated purely by the separator. These are the cheapest possible misses and the join drops all three.

Conclusion: exact-equality is not "narrow but correct"; it is silently near-zero-recall, and the separator-fold gap alone is a measured, no-judgment-required miss.

## B. Sandboxed harness probes (real `runDriftSweepOnce`, injected judge/post)

- **PROBE1 — near-miss subject:** a statement whose subject is topically continuous with a recorded decision but not byte-equal produced **0 judge calls, no trace, and the watermark advanced past it** (`decision-drift.ts:632-633` — `decisionBySubject.get(...)` returns undefined → `continue`, no counter, no log). The miss is completely invisible. Seam decision 18's escape hatch ("alias earns its keep after lexical matching *demonstrably misses* real drift") **can never fire**, because misses leave no evidence to demonstrate them.
- **PROBE2 — single simulated 429 on delivery:** one transient Slack post failure drove the pair straight to **terminal `delivery-failed` with zero re-posts ever** (`deliverPair` :905-917 catches any throw → terminal; the recovery guard :643 only re-examines `delivery-intent`, and a `delivery-failed` pair is terminal so the watermark advances past it). A provably-undelivered contradiction is dropped forever on the first blip.
- **PROBE3 — total judge outage:** every tick returned `status:'ok'` with a **frozen watermark and only a `warn` log** (:716-726 records `retryable` as a per-statement block; the tick-level result is still `ok`). An operator polling worker status sees "ok" while the pipeline is fully stalled. Nothing externally distinguishes "quiet day" from "brain down, nothing moving."

## C. Root causes

**B3 — the join has no entity/alias layer, and misses are unobservable.** Two compounding gaps: (1) exact-equality with an unstable extractor format is near-zero recall; (2) there is no counter, trace, or near-miss log on the no-match path, so seam decision 18's "misses become data → then alias earns its keep" loop cannot even start. The fix at demo altitude is *not* an alias registry (that is the deferred follow-up). It is: fold separators in the shared normalizer, pin the extractor format, replace the exact `Map.get` with a deterministic AI-free **nominator** (token-overlap similarity) that hands candidates to the *existing* brain judge (the precision gate seam decision 18 already permits above the seam), and make every no-candidate statement log its top near-miss. That turns silent misses into data without adding an entity layer and without putting an AI in the plumbing (seam decision 19 preserved).

**B4 — 114 AC5 conflated two different failure classes under one "at-most-once" posture.** The at-most-once rule is *correct* for the ambiguous-crash case (intent written, outcome unknown — Slack may or may not have delivered; re-posting risks owner spam, and seam decision 20's cost model makes "one extra click" the tie-breaker only when delivery is genuinely ambiguous). But it was applied wholesale, including to a **clean synchronous post failure** where Slack provably did not deliver (HTTP status / network error returned before any send). That case is provably safe to retry — it is the exact split 114 AC3 already drew for the judge (retryable infra error vs terminal parse failure), and the same 114 batch gave the *seed store* a 5-attempt retry (`granola-intake-seed-store.ts:52-60`) while giving alerts exactly 1. The fix: classify errors in `deliverPair`; a clean transport failure goes to the existing non-terminal `delivery-deferred` state with a bounded retry_count; the ambiguous-crash path keeps at-most-once unchanged.

**B7 — "never crash the daemon" was adopted without its paired invariant "degraded state is externally observable."** 114 AC6 (fail-closed, disabled handle, config error) and the whole worker family fail *closed* correctly, but the disabled/degraded state is written only to logs — a write-only sink no one polls — and to in-memory handle fields (`DriftSweepWorkerHandle.configError`) that nothing consumes. A boot-time permanent disable (config-parse typo, `granola-signals.ts:920-931`) produces zero durable, queryable evidence. This is the same class as June's `f19dc419` ("36 raw granola atoms and zero signals" — the worker had silently disabled itself for weeks). Fail-closed without an observable degraded state is indistinguishable from working. The fix: each worker atomically writes a small heartbeat JSON under `~/.echo/state/` at every tick end and at boot-disable, carrying `status: ok|degraded|disabled` + reason + the existing result counters, so accidental disablement is externally observable for the first time. Item 117's doctor loop then *reads* observation instead of *inferring* it (117 AC3 explicitly names the in-process-disable limitation and flags "worker-written heartbeat file" as the follow-up).

## D. Founder direction — scope of these fixes

Fix at the **join / delivery / heartbeat layer now**, on the pre-freeze demo path. Specifically the three items below. Explicitly **NOT** in these items, noted as follow-ups:

- **Entity / alias registry** (below-the-seam saved-fact alias grouping) — earns its keep only after the nominator + near-miss logging produce the demonstrated-miss data seam decision 18 requires. Follow-up, not now.
- **Embeddings / semantic subject matching** — never in the plumbing (seam decision 19); if ever, above the seam only. Not now.
- **Process-rule changes** (how specs guard against this failure class generally) — a retro/operating-model question, not a code item.
- **Doctor UI / lifecycle changes** — item 117 owns doctor; item 120 only guarantees the heartbeat artifact exists and exports its path+shape contract.

## Actioned as three backlog items (dependency-independent; all against the 114/115 code)

| # | Item | Fixes | What it is |
|---|---|---|---|
| 118 | drift join: similarity-nominated candidates with judge confirmation + observable misses | B3 | separator-folding normalizer, pinned extraction format, nominate-then-confirm join, per-tick miss counters + near-miss logging |
| 119 | drift alert delivery: retryable transport failures, at-most-once preserved for ambiguous crash | B4 | classify `deliverPair` errors; clean transport failure → bounded `delivery-deferred` retry; ambiguous crash unchanged |
| 120 | worker heartbeat artifacts + degraded status | B7 | atomic per-worker heartbeat JSON (ok/degraded/disabled + counters); exported contract 117's doctor consumes |

## After Completion (Strategist Notes)

- 118 ships → note on the drift-alert surface page that the join is nominate-then-confirm with observable misses; the near-miss log is the input to the eventual alias decision record.
- 119 ships → update the drift-alert page's delivery-semantics section: transport failure retries, ambiguous crash at-most-once.
- 120 ships → new note on the observability story: fail-closed workers now emit heartbeats; cross-reference 117's doctor section once it consumes them. This closes blindspot B7 durably.
