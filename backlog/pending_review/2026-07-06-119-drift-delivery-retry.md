---
id: 2026-07-06-119-drift-delivery-retry
title: "Drift alert delivery: retry proven Slack rejections, at-most-once preserved for ambiguous crash + unknown-outcome"
status: proposed
claimed_by: "builder-119-7c078333"
claimed_at: "2026-07-06T01:52:01Z"
branch: "agent/drift-delivery-retry"
head_sha: "07a0cb2ad5ffa6e97eaba2de194b55aa190c5064"
pr_url: ""
agent_notes: |
  All four ACs implemented against current main (not the concurrent 120 branch).
  head_sha 07a0cb2ad5ffa6e97eaba2de194b55aa190c5064 on agent/drift-delivery-retry.
  Touched files: src/enrich/decision-drift.ts,
  tests/enrich/decision-drift.test.ts,
  tests/surfaces/ceo-slack-responder/drift-alert.test.ts.

  WHAT BUILT (AC-by-AC):
  - AC1: deliverPair now classifies its post-failure. A new typed
    DriftDeliveryRejectedError (received non-2xx / ok:false = a Slack response
    arrived → PROVEN rejection) → non-terminal delivery-deferred, keeps
    pending_alert, increments retry_count, blocks the watermark; the existing drain
    re-attempts next tick. Every OTHER throw (timeout/reset/DNS/untyped) is
    unknown-outcome → terminal delivery-failed, zero retries, failure_reason
    recorded, drift_delivery_failed emitted with retry_count 0. postDriftAlertCard
    reordered to classify a received non-2xx BEFORE response.json() (r2 codex-ops),
    so a 429 with empty/non-JSON body stays typed+retryable.
  - AC2: retry_count = failed proven-rejection attempts so far; pair terminalizes
    on the attempt that reaches DRIFT_DELIVERY_MAX_RETRIES (default 5) — exactly
    MAX visible attempts, no extra deferral. Cap-overflow (AC6) and unknown-outcome
    never touch retry_count. Terminal write carries failure_reason + final
    retry_count and reuses the drift_delivery_failed error log.
  - AC3: ambiguous-crash recovery (delivery-intent found on a later tick) UNCHANGED
    — still promotes to delivery-failed with zero Slack posts. Existing 114 test
    still green.
  - AC4: retry_count is an additive OPTIONAL checkpoint field; schema version stays
    1; loader loose-cast documented; old checkpoint without retry_count reads as 0.

  DESIGN CHOICES: deliverPair return widened to include 'delivery-deferred'; both
  call sites (first-delivery + drain) gained a deferred branch (deferred++ +
  blockingSeqs.push). New warn log drift_delivery_retry per non-terminal retry.
  No backoff/Retry-After/jitter, no seed-store change, no resend CLI, no new state.

  TESTS: +5 in decision-drift.test.ts (AC1 retry-then-success, AC1
  timeout-after-send terminal-zero-retries, AC2 exhaustion-exactly-MAX, AC2
  cap-deferred-retry_count-0, AC4 pre-119-checkpoint-loads); +1 net-new in
  drift-alert.test.ts (429 non-JSON body classified before parse) plus tightened
  the ok:false test to assert the typed error. Focus run: 34 passed
  (decision-drift 23 + drift-alert 11).

  VERIFICATION (worktree, fresh npm ci):
  - test:product: 160 passed | 1 skipped (161 files); 1733 passed | 21 skipped |
    1 todo. All green.
  - lint: clean. typecheck: clean.
  - Baseline on the claim commit had 2 flaky failures (tests/cli/shell-reachable —
    npm-pack/bash reachability; tests/surfaces/ceo-slack-brain — descendant-pid
    timeout), both untouched by 119; both PASSED on the full post-change run →
    environment-flaky, not regressions.

  ESCALATIONS: none.
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
  - src/enrich/decision-drift.ts                       # classify deliverPair errors; proven Slack rejection → bounded delivery-deferred retry
  - tests/enrich/                                      # 429-then-success, exhaustion, crash-recovery-posts-zero coverage
ready_content_sha: 8164df830e8de441334341b298af52f5f778a6c9acab8cd3b5f4094f412b1a08
---

## Problem

114 AC5 adopted a single **at-most-once** posture for delivery and applied it wholesale. The sandboxed harness (decision record B4, PROBE2) showed the cost: a single simulated 429 on the Slack post drove the pair straight to terminal `delivery-failed` with zero re-posts ever (`deliverPair` :905-917 catches any throw → terminal; the recovery guard :643 only re-examines `delivery-intent`). A provably-undelivered contradiction — the demo hero signal — is dropped forever on the first transient blip.

At-most-once is *correct* whenever the delivery outcome is **unknown** — the ambiguous-crash case (intent written, outcome unrecorded; Slack may or may not have delivered), and equally a network timeout, a post-send connection reset, or a DNS/socket error where Slack *may* have accepted the card. Re-posting any of those risks double-alerting the owner. But a **proven rejection** — a Slack HTTP *response was actually received* and indicates non-acceptance (e.g. 429, or `body.ok !== true`) — is provably safe to retry: it is the exact split 114 AC3 already drew for the judge (retryable infra error vs terminal parse failure), and the same 114 batch gave the seed store a 5-attempt retry (`granola-intake-seed-store.ts:52-60`) while giving alerts exactly 1. This item classifies received-rejection (retry, bounded) vs unknown-outcome (terminal, at-most-once), leaving the ambiguous-crash path unchanged. (Founder-adjudicated 2026-07-06: retryable is received-rejection ONLY — see AC1.)

## Acceptance Criteria

- **AC1 — classify deliverPair errors; retry ONLY proven rejections (founder-adjudicated 2026-07-06):** the retryable class is **proven-rejection only** — a Slack HTTP *response was actually received* and indicates non-acceptance (e.g. HTTP 429, or a received `body.ok !== true`). The poster surfaces this as a distinct typed error (a `DriftDeliveryRejectedError`, mirroring AC3's `DriftJudgeParseError`/`DriftJudgeInfraError` terminal-vs-retryable split); the default `postDriftAlertCard` already throws only *after* a response is received (`!response.ok || body.ok !== true`, `decision-drift.ts:1084`), so that throw becomes the typed proven-rejection. A received **non-2xx status is classified as proven-rejection BEFORE the response body is parsed** (r2 codex-ops): reorder the current parse-then-check (`await response.json()` at `:1083` precedes the `!response.ok` check at `:1084`) so a 429 — or any non-2xx — with a missing, empty, or non-JSON body still becomes `DriftDeliveryRejectedError` (retryable) instead of throwing inside `response.json()` and falling through as an untyped unknown-outcome terminal. On a proven rejection, the pair transitions to the existing **non-terminal `delivery-deferred`** state, keeps its `pending_alert`, increments `retry_count`, and blocks the AC1 watermark behind its statement (reuse the existing `blockingSeqs` + delivery-deferred handling — no new state, no new watermark path); the existing drain (`:664-688`) re-attempts on later ticks, bounded by `DRIFT_DELIVERY_MAX_RETRIES` (default **5**, mirroring the seed store). **Every other `deliverPair` throw is unknown-outcome** — a network timeout, a connection reset *after* the request was sent, a DNS/socket error, or any untyped error — where Slack *may* have accepted the card. These are **NOT retried**: they go straight to terminal `delivery-failed` (zero retries), exactly like the ambiguous-crash recovery path (AC3), because re-posting an unknown outcome can double-alert the owner. That terminal write records a `failure_reason` and emits the existing operator-visible `drift_delivery_failed` log with `retry_count` 0 (or absent) — the same evidence AC2 requires at exhaustion (r2 codex-ops) — so unattended network loss surfaces and never advances the watermark silently. Rationale (founder): the demo-critical 429 is by definition proven-rejected (a response arrived), so hero-alert protection is preserved, while unknown-outcome failures stay at-most-once. Tests: a stubbed poster that raises the proven-rejection error once then succeeds delivers on the retry tick with **exactly one** visible card (no double-post) and ends `delivered`; a received **429 with an empty/non-JSON body** still classifies as proven-rejection and retries (not terminal); a stubbed **timeout-after-send** (untyped throw, no received response) goes terminal `delivery-failed` with **zero** retries, records a `failure_reason`, emits `drift_delivery_failed` with `retry_count` 0/absent, and never re-posts.
- **AC2 — exhaustion is terminal with evidence; `retry_count` = failed attempts so far (founder-adjudicated 2026-07-06):** `retry_count` is defined as the **number of failed proven-rejection post attempts so far**. The pair terminalizes on the failure that increments `retry_count` to `DRIFT_DELIVERY_MAX_RETRIES` — i.e. **exactly `DRIFT_DELIVERY_MAX_RETRIES` visible post attempts total, with no additional deferred attempt afterward**. That terminal write records `delivery-failed` with a `failure_reason` (the last rejection) and the final `retry_count`, emitting the existing operator-visible `drift_delivery_failed` log (pair key, judge version, reason, retry_count); the watermark may then advance past it. `retry_count` increments **only** on an observed proven-rejection attempt in `deliverPair` — a cap-overflow `delivery-deferred` (AC6, `:809`) does NOT consume the budget (never attempted), and an unknown-outcome failure (AC1) never increments it (it goes terminal immediately). Tests: a stubbed poster that always raises proven-rejection goes terminal `delivery-failed` after **exactly** `DRIFT_DELIVERY_MAX_RETRIES` post attempts across ticks (never one more), carries the failure_reason + final retry_count, and does not loop or stall the watermark; a pair deferred purely by the per-tick cap and later delivered ends with `retry_count` 0 (or absent).
- **AC3 — ambiguous crash stays at-most-once, unchanged:** the recovery path for a pair found in `delivery-intent` on a later tick (crash between the durable intent write and the post outcome, `:647-660`) is **unchanged**: promote to terminal `delivery-failed` WITHOUT calling Slack again. This case is genuinely ambiguous (the process died mid-post; Slack may have delivered), so at-most-once holds — and per seam decision 20's cost model a false-alarm re-post costs the owner a click, which is only the acceptable trade when delivery is *provably* not done (AC1), not when it is unknown (this path). The structural distinction is already durable: a **proven-rejection** error runs `deliverPair`'s catch (→ AC1 retry); an **unknown-outcome** throw also runs the catch but goes terminal like this path (→ at-most-once, zero retries); a crash leaves the durable `delivery-intent` untouched (→ this at-most-once recovery). Test: an intent-written/no-outcome checkpoint reprocesses to `delivery-failed` with **zero** additional Slack posts and then permits watermark advance (the existing 114 test, still green).
- **AC4 — backward-compatible checkpoint schema:** `retry_count` is a new **optional** field on `DriftPairCheckpoint`; `DRIFT_SWEEP_CHECKPOINT_SCHEMA_VERSION` stays **1** (an additive optional field is backward-compatible, and `loadDriftSweepCheckpoint` already casts pair values loosely so old files parse). A pair read from an old checkpoint with no `retry_count` is treated as `retry_count` 0. Document this explicitly in the checkpoint type + loader comment. Test: a checkpoint file written before this item (no `retry_count` on any pair) loads without error and a proven-rejection on such a pair begins retrying from 0.

## Out of Scope (Don't Drift)

- **No Slack `Retry-After` parsing, exponential backoff, or jitter** — retries happen on the sweep's existing tick cadence; bounded count only. Sophistication is a later item if measured need appears.
- **No changes to the seed store** (`granola-intake-seed-store.ts`) — it is cited as precedent, not modified.
- **No resend/replay CLI or operator resend surface** — exhaustion is terminal + logged; manual resend is out of scope.
- **No change to the judge path, nomination, watermark state machine, or `delivery-intent` durable-write ordering** beyond the catch-block classification.
- **No new checkpoint state** — reuse `delivery-deferred` (non-terminal) and `delivery-failed` (terminal); the only schema delta is the optional `retry_count`.

## After Completion (Strategist Notes)

- Update `wiki/surfaces/drift-alert` delivery-semantics section: proven Slack rejection (received 429 / `ok:false`) → bounded retry via `delivery-deferred`; ambiguous crash + unknown-outcome (timeout/reset/DNS) → at-most-once `delivery-failed`; cite seam decision 20 as the tie-breaker.
- Note the seed-store 5-attempt retry as the shared precedent; if a third worker needs the same shape, consider a shared bounded-retry helper (follow-up, not now).
