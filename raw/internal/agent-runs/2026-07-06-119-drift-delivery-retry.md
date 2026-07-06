# Agent run — 2026-07-06-119-drift-delivery-retry

- **Builder:** builder-119-7c078333 (Claude Code, autonomous)
- **Branch:** agent/drift-delivery-retry
- **Worktree:** ~/Desktop/Project_echo--drift-delivery-retry/
- **Claim commit:** a67c36e8afded06df9d114d7caf1f0150741b636 (on main)

## What was built

Classified `deliverPair`'s post-failure path into two outcomes (item spec AC1):

- **Proven rejection** — a Slack HTTP *response was received* indicating
  non-acceptance (non-2xx status such as 429, or a received `body.ok !== true`).
  Surfaced as a new typed error `DriftDeliveryRejectedError`. Retryable: the pair
  goes to the existing non-terminal `delivery-deferred` state, keeps its
  `pending_alert`, increments the new optional `retry_count`, and blocks the
  watermark (pushes `statement.sequence_id` to `blockingSeqs`). The existing drain
  re-attempts on later ticks, bounded by `DRIFT_DELIVERY_MAX_RETRIES` (default 5,
  mirroring the seed store). Terminalizes to `delivery-failed` exactly on the
  attempt that increments `retry_count` to MAX — exactly MAX visible attempts, no
  extra deferral.
- **Unknown outcome** — any other throw (network timeout, post-send reset,
  DNS/socket error, any untyped error; Slack may have accepted the card). NOT
  retried: straight to terminal `delivery-failed` with zero retries, records a
  `failure_reason`, emits `drift_delivery_failed` with `retry_count` 0. At-most-once,
  same posture as the ambiguous-crash recovery path (unchanged).

`postDriftAlertCard` reordered so a received non-2xx is classified as
`DriftDeliveryRejectedError` **before** `response.json()` (r2 codex-ops): a 429 with
a missing/empty/non-JSON body stays a typed retryable rejection instead of throwing
inside the parse and falling through as an untyped unknown-outcome terminal.

Checkpoint schema: `retry_count` added as an additive **optional** field;
`DRIFT_SWEEP_CHECKPOINT_SCHEMA_VERSION` stays 1 (backward-compatible — old files
parse; a pair with no `retry_count` reads as 0). Documented on the type and at the
loader's loose-cast site (AC4).

## Design choices

- `deliverPair` return type widened to `'delivered' | 'delivery-failed' |
  'delivery-deferred'`; both call sites (first-delivery + drain) gained a
  `delivery-deferred` branch that increments `deferred` and holds the watermark.
- New log event `drift_delivery_retry` (warn) on each non-terminal retry; the
  terminal exhaustion reuses the existing `drift_delivery_failed` (error) with
  `retry_count`, matching the evidence AC2 requires.
- Cap-overflow deferral (AC6) still writes `delivery-deferred` with no
  `retry_count`, so it never consumes the retry budget (never attempted); verified
  by test.

## Out of scope (not touched)

No `Retry-After`/backoff/jitter, no seed-store changes, no resend CLI, no judge /
nomination / watermark-state-machine / intent-write-ordering changes, no new
checkpoint state.

## Verification (in worktree, `npm ci` fresh)

- `npm run test:product` — 160 passed | 1 skipped (161 files); 1733 passed | 21
  skipped | 1 todo (1755 tests). All green.
- `npm run lint` — clean (eslint --max-warnings 0 + task-state lint).
- `npm run typecheck` — clean (`tsc --noEmit`).
- Touched-file focus run: `tests/enrich/decision-drift.test.ts` (23) +
  `tests/surfaces/ceo-slack-responder/drift-alert.test.ts` (11) = 34 passed.

**Baseline note:** the pre-change baseline on the claim commit showed 2 failing
files — `tests/cli/shell-reachable.test.ts` (npm-pack + bash reachability) and
`tests/surfaces/ceo-slack-brain.test.ts` (descendant-pid timeout). Both are
timing/packaging-sensitive and untouched by this item; both PASSED on the full
post-change run, confirming they are environment-flaky, not regressions.

## Tests added

- AC1: proven-rejection-once-then-success delivers on the retry tick with exactly
  one visible card, ends `delivered`.
- AC1: timeout-after-send (untyped throw) goes terminal `delivery-failed` with zero
  retries, records `failure_reason`, never re-posts.
- AC1: received 429 with non-JSON body classifies as `DriftDeliveryRejectedError`
  before body parse (in drift-alert.test.ts); received `ok:false` is a typed
  proven-rejection.
- AC2: persistent proven-rejection terminalizes after exactly
  `DRIFT_DELIVERY_MAX_RETRIES` attempts (never MAX+1), carries `failure_reason` +
  final `retry_count`.
- AC2: cap-deferred-then-delivered ends with `retry_count` 0/absent.
- AC4: pre-119 checkpoint (no `retry_count`) loads and a proven rejection begins
  retrying from 0.
