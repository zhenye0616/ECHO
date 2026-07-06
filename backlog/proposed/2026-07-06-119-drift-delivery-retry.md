---
id: 2026-07-06-119-drift-delivery-retry
title: "Drift alert delivery: retryable transport failures, at-most-once preserved for ambiguous crash"
status: proposed
priority: HIGH
estimate: 1d
created: 2026-07-06
blocked_by: []
spec_refs:
  - raw/internal/decisions/2026-07-06-drift-failure-modes-root-causes.md   # B4 root cause: transport failure vs ambiguous crash conflation
  - raw/internal/decisions/2026-07-04-seam-v0-decision.md                  # decision 20 cost model (false alarm = one click) — the tie-breaker
  - src/enrich/decision-drift.ts                                          # deliverPair (:887-930), recovery path (:647-660), delivery-deferred drain (:664-688), AC1 watermark (:846-851)
  - src/enrich/granola-intake-seed-store.ts                               # the 5-attempt retry precedent (:52-60) this mirrors
files_to_modify:
  # PROVISIONAL
  - src/enrich/decision-drift.ts                       # classify deliverPair errors; transport failure → bounded delivery-deferred retry
  - tests/enrich/                                      # 429-then-success, exhaustion, crash-recovery-posts-zero coverage
---

## Problem

114 AC5 adopted a single **at-most-once** posture for delivery and applied it wholesale. The sandboxed harness (decision record B4, PROBE2) showed the cost: a single simulated 429 on the Slack post drove the pair straight to terminal `delivery-failed` with zero re-posts ever (`deliverPair` :905-917 catches any throw → terminal; the recovery guard :643 only re-examines `delivery-intent`). A provably-undelivered contradiction — the demo hero signal — is dropped forever on the first transient blip.

At-most-once is *correct* for the ambiguous-crash case (intent written, outcome unknown — Slack may or may not have delivered; re-posting risks owner spam). But a **clean synchronous post failure** (HTTP status / network error returned to our catch block — Slack provably did not accept it) is provably safe to retry: it is the exact split 114 AC3 already drew for the judge (retryable infra error vs terminal parse failure), and the same 114 batch gave the seed store a 5-attempt retry (`granola-intake-seed-store.ts:52-60`) while giving alerts exactly 1. This item classifies the two cases and gives clean transport failures bounded retries, leaving the ambiguous-crash path unchanged.

## Acceptance Criteria

- **AC1 — classify deliverPair errors; clean transport failure retries:** when `runtime.post(payload)` throws and control returns to `deliverPair`'s catch (`decision-drift.ts:905`), the failure is a **clean, observed transport failure** — Slack provably did not accept the card (HTTP non-2xx, `ok:false`, or a network/timeout error surfaced synchronously). Instead of going terminal, the pair transitions to the existing **non-terminal `delivery-deferred`** state, keeping its `pending_alert` payload and incrementing a `retry_count`, and blocks the AC1 watermark behind its statement (reuse the existing `blockingSeqs` + delivery-deferred watermark handling — do not invent a new state or new watermark path). On subsequent ticks the existing delivery-deferred drain (`:664-688`) re-attempts the post. Retries are bounded by a named constant `DRIFT_DELIVERY_MAX_RETRIES` (default **5**, mirroring the seed store). Tests: a stubbed post that throws once then succeeds delivers on the retry tick with **exactly one** visible card (no double-post), and the pair ends `delivered`.
- **AC2 — exhaustion is terminal with evidence:** once `retry_count` reaches `DRIFT_DELIVERY_MAX_RETRIES`, the next failed attempt records terminal `delivery-failed` with a `failure_reason` (the last transport error) and the pair's `retry_count`, emitting the existing operator-visible `drift_delivery_failed` structured log (pair key, judge version, reason, retry_count). The watermark may then advance past it. `retry_count` increments **only** on an observed failed post attempt in `deliverPair` — a cap-overflow `delivery-deferred` (AC6, `:809`) does NOT consume the retry budget (it was never attempted). Tests: a stubbed post that always throws goes terminal `delivery-failed` after exactly `DRIFT_DELIVERY_MAX_RETRIES` attempts across ticks, carries the failure_reason + retry_count, and does not loop or stall the watermark; a pair deferred purely by the per-tick cap and later delivered ends with `retry_count` 0 (or absent).
- **AC3 — ambiguous crash stays at-most-once, unchanged:** the recovery path for a pair found in `delivery-intent` on a later tick (crash between the durable intent write and the post outcome, `:647-660`) is **unchanged**: promote to terminal `delivery-failed` WITHOUT calling Slack again. This case is genuinely ambiguous (the process died mid-post; Slack may have delivered), so at-most-once holds — and per seam decision 20's cost model a false-alarm re-post costs the owner a click, which is only the acceptable trade when delivery is *provably* not done (AC1), not when it is unknown (this path). The structural distinction is already durable: an observed transport error runs `deliverPair`'s catch (→ AC1 retry); a crash leaves the durable `delivery-intent` untouched (→ this at-most-once recovery). Test: an intent-written/no-outcome checkpoint reprocesses to `delivery-failed` with **zero** additional Slack posts and then permits watermark advance (the existing 114 test, still green).
- **AC4 — backward-compatible checkpoint schema:** `retry_count` is a new **optional** field on `DriftPairCheckpoint`; `DRIFT_SWEEP_CHECKPOINT_SCHEMA_VERSION` stays **1** (an additive optional field is backward-compatible, and `loadDriftSweepCheckpoint` already casts pair values loosely so old files parse). A pair read from an old checkpoint with no `retry_count` is treated as `retry_count` 0. Document this explicitly in the checkpoint type + loader comment. Test: a checkpoint file written before this item (no `retry_count` on any pair) loads without error and a transport failure on such a pair begins retrying from 0.

## Out of Scope (Don't Drift)

- **No Slack `Retry-After` parsing, exponential backoff, or jitter** — retries happen on the sweep's existing tick cadence; bounded count only. Sophistication is a later item if measured need appears.
- **No changes to the seed store** (`granola-intake-seed-store.ts`) — it is cited as precedent, not modified.
- **No resend/replay CLI or operator resend surface** — exhaustion is terminal + logged; manual resend is out of scope.
- **No change to the judge path, nomination, watermark state machine, or `delivery-intent` durable-write ordering** beyond the catch-block classification.
- **No new checkpoint state** — reuse `delivery-deferred` (non-terminal) and `delivery-failed` (terminal); the only schema delta is the optional `retry_count`.

## After Completion (Strategist Notes)

- Update `wiki/surfaces/drift-alert` delivery-semantics section: clean transport failure → bounded retry via `delivery-deferred`; ambiguous crash → at-most-once `delivery-failed`; cite seam decision 20 as the tie-breaker.
- Note the seed-store 5-attempt retry as the shared precedent; if a third worker needs the same shape, consider a shared bounded-retry helper (follow-up, not now).
