---
status: shipped
topic: Architecture
subtopic: Observability
aliases:
  - Drift Sweep
  - Drift Alert
  - Understanding Drift
  - decision-drift.ts
---

# Drift Sweep v0 (Drift Alert)

## Definition

The drift sweep is a clocked contradiction detector: a periodic worker that reads newly-captured meeting statements and checks whether any of them contradicts a recorded, confirmed team decision. It lives at `src/enrich/decision-drift.ts`, registered in `startEnrichmentDispatch` (`src/enrich/dispatch.ts`) chained after the [[signal-formation|signal worker]] (`runSignalsFirst`-style), and is the one genuinely new mechanism in the capture→signals seam (decision #15) — everything else in the seam is re-drawing boundaries around existing code. It is also the YC demo hero scene: understanding-drift caught automatically, with no human having to notice both sides of a contradiction.

## Why a Clock, Not a Push

Nothing else in the system could catch this. A push/event mechanism reacts to something happening; the most valuable catch here — a decision nobody acted on, or a statement quietly contradicting one — produces **zero events**. Absence sends no notification. Only a clock can see nothing happening (seam decision #14). The sweep is the "alarm clock" fork of the seam: "what arrived since my last check, and does it contradict — or conspicuously ignore — a recorded decision?"

## Position in the Architecture

```
[[signal-formation|derived:granola-signals]]  (decision | rationale | action statements)
        │
        ▼
getSignalWindow({cursor, scope: 'company'})   ([[signal-window]] — durable append-order read)
        │
        ▼
nominate-then-confirm join (Jaccard over canonical_subject)  ×  queryLatestTeamDecisions()
        │
        ▼
strict-JSON judge  →  {contradicts, quote, reason}    (code-enforced verbatim quote check)
        │
        ▼  contradicts: true, survives quote check
Slack card → decision owner (Acknowledge / Dismiss)
```

## Durable Arrival-Order Cursor

Progress is tracked as an append-order `sequence_id` watermark (persisted via atomic file write), not an event-time cursor — for the same late-arrival reason [[signal-window]] generalized the append-order seam: a daemon down during a meeting means that meeting's statements are ingested later carrying an *old* timestamp, and an event-time cursor would silently skip exactly the atoms most likely to matter. Each tick reads `getSignalWindow({cursor, scope: 'company'})`.

The watermark only advances once every statement in the tick's window has reached a **terminal** per-pair state: `judged-no-contradiction`, `judged-and-delivered`, `no-match-skipped`, `terminal-judge-failed`, or `delivery-failed`. A pair `delivery-deferred` — whether by the alert cap (below) or a proven-Slack-rejection retry (item 119, below) — is non-terminal and holds the watermark behind it until a later tick drains it. A tick that crashes mid-way re-processes the same window next tick — no arrival is skipped, and no already-terminal pair is double-delivered.

## The Join: Nominate, Then Confirm (item 118)

The 114 join was exact `canonical_subject` string equality, and an empirical study (2026-07-05) found it silently near-zero recall: the extractor flips snake_case vs space-separated subjects per meeting, and the misses were unobservable (a no-match `continue` with no counter or log). Item 118 replaced the exact join with a deterministic, AI-free **nominate-then-confirm** step:

- For each new `decision` / `rationale` / `action` statement, every decision from `queryLatestTeamDecisions()` is scored by **Jaccard similarity over normalized word sets** (`|A∩B| / |A∪B|` on whitespace-split tokens of the normalized subject).
- Decisions scoring at or above `DRIFT_NOMINATION_JACCARD_THRESHOLD` (named constant, shipped value **0.2**) are nominated, capped at the top `DRIFT_MAX_NOMINATIONS_PER_STATEMENT` (named constant, shipped value **5**) by a deterministic tie-breaker: score descending, then normalized decision subject ascending, then decision `dedupe_key` ascending. Decision token sets are computed once per tick, not once per statement.
- Each nominated `(decision, statement)` pair is judged through the **existing, unchanged** per-pair judge path (`driftPairKey` stays keyed the same way, so multiple nominations per statement are independently checkpointed) — the nominator itself calls no embeddings and no LLM; the judge remains the sole precision gate above the seam (seam decision #19).
- The shared normalizer, `normalizeSubject` (`src/util/subject.ts`), now also folds separator classes (`_`, `-`, and runs of them) to a single space before lowercasing/collapsing whitespace, so `openai_investment_terms` and `openai investment terms` produce the identical key. The extraction prompt (`buildExtractionPrompt`, `src/enrich/granola-signals.ts`) additionally pins `canonical_subject` to a space-separated lowercase noun phrase to reduce variance at the source — normalization, not the prompt, remains the authority.

**Misses are now data, not silence.** A statement with zero nominated candidates is never judged; it is counted (`statements_no_candidate`) and logged as a `drift_nomination_miss` naming the closest below-threshold decision subject and its score (same tie-breaker), or an explicit "no decisions to score against." Per-tick counters — `statements_seen`, `statements_nominated`, `statements_no_candidate`, `decisions_scored` — appear in both `DriftSweepResult` and the `drift_sweep_ok` structured log.

This is still a deliberate floor, not a semantic-matching ceiling (seam decision #18): no alias table, no entity registry, no embeddings anywhere in the nominator. The first week of `statements_no_candidate` near-miss logs is the evidence seam decision #18 was waiting on before an alias layer earns its keep — **do not deepen the nominator until that data shows lexical matching demonstrably misses real drift.**

## Idempotent Judge, Code-Enforced Faithfulness

Each `(decision dedupe_key, statement dedupe_key, judge version)` pair is judged **at most once ever**, via a strict-JSON `runBrain` prompt returning `{contradicts: boolean, quote: string, reason: string}`, checkpointed the same way the signal worker checkpoints extractions. Two failure classes are distinguished:

- **Retryable** — a `runBrain` infrastructure error (network/model outage) is not terminal and doesn't count against the shared attempt budget; the pair is simply left unjudged for a later tick. A transient outage can't become permanent silent suppression.
- **Terminal** — a malformed verdict, or a verdict whose `quote` field does not appear **verbatim** in the statement's content, after `DRIFT_JUDGE_MAX_ATTEMPTS` (a named constant, default 3) attempts at the same judge version, is recorded `terminal-judge-failed` and never re-judged at that version. This is a code check on the quote, not a prompt instruction — a judge that fabricates quotes is caught mechanically, not trusted to self-report. Terminal failures emit durable, operator-visible evidence (pair keys, judge version, reason, per-tick counts) through the structured queue-error/health channel, so a model regression that malforms every verdict surfaces instead of silently going quiet.

## Alert, Contained

On a surviving `contradicts: true`, the worker posts a Slack card to the decision's **owner of record** (`confirmed_by`, resolved to a Slack user id via a reverse `cofounderIdToSlackUserId` lookup over the existing identities config) carrying the decision text + when/who confirmed it, the contradicting quote, meeting provenance, and Acknowledge / Dismiss buttons handled in `src/surfaces/ceo-slack-responder/responder.ts` alongside the existing decision/intake `block_actions` branches. Dismissals append to the event log as noise signal, feeding the eventual alias-table and false-positive-rate decisions.

**Delivery classifies proven rejection from unknown outcome (item 119).** A `delivery-intent` record is persisted **before** the Slack post, and the outcome after. 114 shipped a single at-most-once posture for every failure; the sandboxed harness showed the cost — a single simulated 429 dropped the pair straight to terminal `delivery-failed` forever, on the demo hero signal. Three paths are now distinguished:

- **Proven rejection** — a Slack HTTP response was actually received and indicates non-acceptance (a non-2xx status such as 429, or a received `body.ok !== true`; the poster throws the typed `DriftDeliveryRejectedError`) — is provably safe to retry. The pair returns to the existing non-terminal `delivery-deferred` state, `retry_count` increments, and the existing drain re-attempts on a later tick, bounded by `DRIFT_DELIVERY_MAX_RETRIES` (named constant, shipped value **5** — mirroring the seed store's 5-attempt retry precedent at `granola-intake-seed-store.ts`). The pair terminalizes to `delivery-failed` exactly on the attempt that reaches the budget, carrying a `failure_reason` and the final `retry_count`.
- **Unknown outcome** — any other throw (a timeout, a post-send connection reset, a DNS/socket error, or any untyped error) — Slack may or may not have accepted the card, so re-posting risks double-alerting the owner. It goes straight to terminal `delivery-failed` with **zero** retries.
- **Ambiguous crash** — intent written, no outcome recorded before the process died — is recovered on a later tick straight to `delivery-failed`, without calling Slack again, unchanged from v0.

Only the proven-rejection path retries; unknown-outcome and ambiguous-crash both stay at-most-once. This is seam decision #20's cost model applied precisely, not just invoked for the interrupt-vs-digest split above: a false-alarm re-post costs the owner one click, which is worth paying only when non-delivery is *provably* certain (a response was actually received) — not when it is merely unknown. An owner is never spammed by a re-post, and a real, provably-rejected contradiction is no longer dropped forever on the first transient blip.

Contradiction and silence are handled differently on purpose (seam decision #20): contradiction interrupts the owner behind an acknowledge/dismiss card, because **the false-alarm cost is one click**. Silence (a decision nobody has acted on) is explicitly out of scope for v0 — it would be a digest, not an interrupt, since a wrong "nothing's happening" ping is far more costly to trust than a wrong contradiction ping.

## Fail-Closed, Blast-Radius Capped

Disabled by default behind `ECHO_DRIFT_SWEEP_ENABLED`. Enabled-but-misconfigured (missing Slack token, unresolvable owner map) resolves to a disabled handle with a structured config error — never a daemon crash. Alerts per tick are capped (default 3, `DEFAULT_DRIFT_MAX_ALERTS_PER_TICK`); contradictions beyond the cap are recorded `delivery-deferred` (non-terminal — held for a later tick, never silently dropped, never re-posted once delivered).

Since item 120, fail-closed is no longer silent: the worker writes a heartbeat artifact at the end of every tick (and on boot-time disable) — [[loop-observability]] owns the heartbeat contract, file format, and the `degraded` predicate details.

## Packaging Boundary (v0 deviation, reviewer-verified)

`decision-drift.ts` ships in the npm-packed daemon's `dist/enrich/**`, but the whole `ceo-slack-responder` surface is excluded from the pack (import-closure enforced). The worker therefore cannot import `queryLatestTeamDecisions` or the identity helpers directly — it owns a packed-safe `readLatestDecisions` mirror (verified equivalent to `queryLatestTeamDecisions`'s latest-per-`dedupe_key` + recency logic) and its own `cofounderIdToSlackUserId` reverse lookup. This mirror-divergence risk is a recorded, non-blocking followup: a shared packed-safe module for team-decision read + cofounder identity would remove it.

## What v0 Does NOT Do

- **No silence/absence digest** ("decisions with no activity") — a post-freeze stretch with its own decision record; the sweep's clock and watermark make it a small follow-up when it comes.
- **No Slack or eng-session statement supply** — v0's statement supply is Granola signals only; Slack capture is a separate gap-map track.
- **No execution-drift** (commits/Linear state vs. decisions) — needs Linear read; explicitly later.
- **No alias or entity registry, no embeddings, no semantic subject matching** — the item 118 nominator is stateless lexical token-overlap only; alias grouping is the deferred follow-up its near-miss data unblocks.
- **No decision-store schema changes, no writes to `derived:team-decisions`.**
- **A drift verdict is never persisted as a fact atom** — it exists only in the checkpoint and the Slack card, per the seam's "conclusions are recomputed, never saved" rule (decision #3).

## Related

- [[signal-window]] — the seam this worker reads through (`scope: 'company'`, cursor mode)
- [[signal-formation]] — produces the `decision` / `rationale` / `action` statements this worker joins against decisions
- [[storage]] — `canonical_subject` unification is what makes the join possible at all
- [[drift-prevention]] — the product-scope discipline; this surface is the mechanism-level analog for understanding-drift specifically
- [[loop-observability]] — owns the worker heartbeat contract (item 120) this page's Fail-Closed section cross-references
