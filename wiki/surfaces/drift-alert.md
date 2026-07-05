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
join on canonical_subject  ×  queryLatestTeamDecisions()   (the confirmed team-decision store)
        │
        ▼
strict-JSON judge  →  {contradicts, quote, reason}    (code-enforced verbatim quote check)
        │
        ▼  contradicts: true, survives quote check
Slack card → decision owner (Acknowledge / Dismiss)
```

## Durable Arrival-Order Cursor

Progress is tracked as an append-order `sequence_id` watermark (persisted via atomic file write), not an event-time cursor — for the same late-arrival reason [[signal-window]] generalized the append-order seam: a daemon down during a meeting means that meeting's statements are ingested later carrying an *old* timestamp, and an event-time cursor would silently skip exactly the atoms most likely to matter. Each tick reads `getSignalWindow({cursor, scope: 'company'})`.

The watermark only advances once every statement in the tick's window has reached a **terminal** per-pair state: `judged-no-contradiction`, `judged-and-delivered`, `no-match-skipped`, `terminal-judge-failed`, or `delivery-failed`. A pair `delivery-deferred` by the alert cap (below) is non-terminal and holds the watermark behind it until a later tick drains it. A tick that crashes mid-way re-processes the same window next tick — no arrival is skipped, and no already-terminal pair is double-delivered.

## The Join

New `decision` / `rationale` / `action` signal statements are joined against `queryLatestTeamDecisions()` by exact `canonical_subject` equality — the [[storage|unified subject key]] from item 112. A no-match statement is skipped silently (`no-match-skipped`); the join is exact-string only, no alias or semantic matching (a deliberate seam-decision floor — misses become data for a future alias decision, not scope creep here).

## Idempotent Judge, Code-Enforced Faithfulness

Each `(decision dedupe_key, statement dedupe_key, judge version)` pair is judged **at most once ever**, via a strict-JSON `runBrain` prompt returning `{contradicts: boolean, quote: string, reason: string}`, checkpointed the same way the signal worker checkpoints extractions. Two failure classes are distinguished:

- **Retryable** — a `runBrain` infrastructure error (network/model outage) is not terminal and doesn't count against the shared attempt budget; the pair is simply left unjudged for a later tick. A transient outage can't become permanent silent suppression.
- **Terminal** — a malformed verdict, or a verdict whose `quote` field does not appear **verbatim** in the statement's content, after `DRIFT_JUDGE_MAX_ATTEMPTS` (a named constant, default 3) attempts at the same judge version, is recorded `terminal-judge-failed` and never re-judged at that version. This is a code check on the quote, not a prompt instruction — a judge that fabricates quotes is caught mechanically, not trusted to self-report. Terminal failures emit durable, operator-visible evidence (pair keys, judge version, reason, per-tick counts) through the structured queue-error/health channel, so a model regression that malforms every verdict surfaces instead of silently going quiet.

## Alert, Contained

On a surviving `contradicts: true`, the worker posts a Slack card to the decision's **owner of record** (`confirmed_by`, resolved to a Slack user id via a reverse `cofounderIdToSlackUserId` lookup over the existing identities config) carrying the decision text + when/who confirmed it, the contradicting quote, meeting provenance, and Acknowledge / Dismiss buttons handled in `src/surfaces/ceo-slack-responder/responder.ts` alongside the existing decision/intake `block_actions` branches. Dismissals append to the event log as noise signal, feeding the eventual alias-table and false-positive-rate decisions.

**Delivery is at-most-once.** A `delivery-intent` record is persisted **before** the Slack post, and the outcome (`delivered` / `delivery-failed`) after. If the process crashes in between — intent written, no outcome recorded — the next tick promotes that pair straight to `delivery-failed` **without calling Slack again**, which is the terminal state that lets the watermark advance past it. An owner is never spammed by a re-post, and a real contradiction is never silently dropped by an ambiguous crash.

Contradiction and silence are handled differently on purpose (seam decision #20): contradiction interrupts the owner behind an acknowledge/dismiss card, because **the false-alarm cost is one click**. Silence (a decision nobody has acted on) is explicitly out of scope for v0 — it would be a digest, not an interrupt, since a wrong "nothing's happening" ping is far more costly to trust than a wrong contradiction ping.

## Fail-Closed, Blast-Radius Capped

Disabled by default behind `ECHO_DRIFT_SWEEP_ENABLED`. Enabled-but-misconfigured (missing Slack token, unresolvable owner map) resolves to a disabled handle with a structured config error — never a daemon crash. Alerts per tick are capped (default 3, `DEFAULT_DRIFT_MAX_ALERTS_PER_TICK`); contradictions beyond the cap are recorded `delivery-deferred` (non-terminal — held for a later tick, never silently dropped, never re-posted once delivered).

## Packaging Boundary (v0 deviation, reviewer-verified)

`decision-drift.ts` ships in the npm-packed daemon's `dist/enrich/**`, but the whole `ceo-slack-responder` surface is excluded from the pack (import-closure enforced). The worker therefore cannot import `queryLatestTeamDecisions` or the identity helpers directly — it owns a packed-safe `readLatestDecisions` mirror (verified equivalent to `queryLatestTeamDecisions`'s latest-per-`dedupe_key` + recency logic) and its own `cofounderIdToSlackUserId` reverse lookup. This mirror-divergence risk is a recorded, non-blocking followup: a shared packed-safe module for team-decision read + cofounder identity would remove it.

## What v0 Does NOT Do

- **No silence/absence digest** ("decisions with no activity") — a post-freeze stretch with its own decision record; the sweep's clock and watermark make it a small follow-up when it comes.
- **No Slack or eng-session statement supply** — v0's statement supply is Granola signals only; Slack capture is a separate gap-map track.
- **No execution-drift** (commits/Linear state vs. decisions) — needs Linear read; explicitly later.
- **No alias or semantic subject matching** — exact `canonical_subject` only.
- **No decision-store schema changes, no writes to `derived:team-decisions`.**
- **A drift verdict is never persisted as a fact atom** — it exists only in the checkpoint and the Slack card, per the seam's "conclusions are recomputed, never saved" rule (decision #3).

## Related

- [[signal-window]] — the seam this worker reads through (`scope: 'company'`, cursor mode)
- [[signal-formation]] — produces the `decision` / `rationale` / `action` statements this worker joins against decisions
- [[storage]] — `canonical_subject` unification is what makes the join possible at all
- [[drift-prevention]] — the product-scope discipline; this surface is the mechanism-level analog for understanding-drift specifically
