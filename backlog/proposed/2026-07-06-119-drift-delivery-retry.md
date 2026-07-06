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

- **AC1 — classify deliverPair errors; retry ONLY proven rejections (founder-adjudicated 2026-07-06):** the retryable class is **proven-rejection only** — a Slack HTTP *response was actually received* and indicates non-acceptance (e.g. HTTP 429, or a received `body.ok !== true`). The poster surfaces this as a distinct typed error (a `DriftDeliveryRejectedError`, mirroring AC3's `DriftJudgeParseError`/`DriftJudgeInfraError` terminal-vs-retryable split); the default `postDriftAlertCard` already throws only *after* a response is received (`!response.ok || body.ok !== true`, `decision-drift.ts:1084`), so that throw becomes the typed proven-rejection. On a proven rejection, the pair transitions to the existing **non-terminal `delivery-deferred`** state, keeps its `pending_alert`, increments `retry_count`, and blocks the AC1 watermark behind its statement (reuse the existing `blockingSeqs` + delivery-deferred handling — no new state, no new watermark path); the existing drain (`:664-688`) re-attempts on later ticks, bounded by `DRIFT_DELIVERY_MAX_RETRIES` (default **5**, mirroring the seed store). **Every other `deliverPair` throw is unknown-outcome** — a network timeout, a connection reset *after* the request was sent, a DNS/socket error, or any untyped error — where Slack *may* have accepted the card. These are **NOT retried**: they go straight to terminal `delivery-failed` (zero retries), exactly like the ambiguous-crash recovery path (AC3), because re-posting an unknown outcome can double-alert the owner. Rationale (founder): the demo-critical 429 is by definition proven-rejected (a response arrived), so hero-alert protection is preserved, while unknown-outcome failures stay at-most-once. Tests: a stubbed poster that raises the proven-rejection error once then succeeds delivers on the retry tick with **exactly one** visible card (no double-post) and ends `delivered`; a stubbed **timeout-after-send** (untyped throw, no received response) goes terminal `delivery-failed` with **zero** retries and never re-posts.
- **AC2 — exhaustion is terminal with evidence; `retry_count` = failed attempts so far (founder-adjudicated 2026-07-06):** `retry_count` is defined as the **number of failed proven-rejection post attempts so far**. The pair terminalizes on the failure that increments `retry_count` to `DRIFT_DELIVERY_MAX_RETRIES` — i.e. **exactly `DRIFT_DELIVERY_MAX_RETRIES` visible post attempts total, with no additional deferred attempt afterward**. That terminal write records `delivery-failed` with a `failure_reason` (the last rejection) and the final `retry_count`, emitting the existing operator-visible `drift_delivery_failed` log (pair key, judge version, reason, retry_count); the watermark may then advance past it. `retry_count` increments **only** on an observed proven-rejection attempt in `deliverPair` — a cap-overflow `delivery-deferred` (AC6, `:809`) does NOT consume the budget (never attempted), and an unknown-outcome failure (AC1) never increments it (it goes terminal immediately). Tests: a stubbed poster that always raises proven-rejection goes terminal `delivery-failed` after **exactly** `DRIFT_DELIVERY_MAX_RETRIES` post attempts across ticks (never one more), carries the failure_reason + final retry_count, and does not loop or stall the watermark; a pair deferred purely by the per-tick cap and later delivered ends with `retry_count` 0 (or absent).
- **AC3 — ambiguous crash stays at-most-once, unchanged:** the recovery path for a pair found in `delivery-intent` on a later tick (crash between the durable intent write and the post outcome, `:647-660`) is **unchanged**: promote to terminal `delivery-failed` WITHOUT calling Slack again. This case is genuinely ambiguous (the process died mid-post; Slack may have delivered), so at-most-once holds — and per seam decision 20's cost model a false-alarm re-post costs the owner a click, which is only the acceptable trade when delivery is *provably* not done (AC1), not when it is unknown (this path). The structural distinction is already durable: a **proven-rejection** error runs `deliverPair`'s catch (→ AC1 retry); an **unknown-outcome** throw also runs the catch but goes terminal like this path (→ at-most-once, zero retries); a crash leaves the durable `delivery-intent` untouched (→ this at-most-once recovery). Test: an intent-written/no-outcome checkpoint reprocesses to `delivery-failed` with **zero** additional Slack posts and then permits watermark advance (the existing 114 test, still green).
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
