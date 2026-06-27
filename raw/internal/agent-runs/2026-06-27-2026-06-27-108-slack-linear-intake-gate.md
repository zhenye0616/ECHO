# 2026-06-27 — 2026-06-27-108-slack-linear-intake-gate

## Run 1 (started at 2026-06-27T22:32:00Z)

### What I implemented

Implemented the Slack→Linear intake gate in `agent/slack-linear-intake-gate`.

- Added a deterministic intake brain helper for plain-language/labeled field extraction, missing-field detection, bounded follow-up questions, and known-project gating.
- Added a durable file-backed intake draft store keyed by `team_id:channel_id:root_ts`, with Slack event de-dupe, requester ownership, confirm/dismiss lifecycle, exactly-once create guard, and fail-closed `needs-reconcile` handling.
- Added the Linear write client with explicit env/config IDs, no Linear reads, bounded timeout, and no automatic retry.
- Added parent-deliverable issue rendering, Slack confirm/dismiss card handling, requester-confirm enforcement, Slack link-back receipts, and operator-visible failure logging.
- Added the Slack Linear intake runbook and focused Vitest coverage for happy path, follow-ups, idempotency/reconcile, and Linear client mapping/config errors.

### Files modified

Branch: `agent/slack-linear-intake-gate`

Head SHA: `531486a3db033cf08fd12963f08a8b2f54e93f3c`

- `docs/onboarding/slack-linear-intake-runbook.md` — 49 lines, new operator setup/failure runbook.
- `src/surfaces/ceo-slack-responder/brain.ts` — 661 lines, added deterministic intake extraction/follow-up helpers.
- `src/surfaces/ceo-slack-responder/identity.ts` — 69 lines, added requester attribution helper.
- `src/surfaces/ceo-slack-responder/intake-draft-store.ts` — 352 lines, new durable intake state/idempotency store.
- `src/surfaces/ceo-slack-responder/issue-render.ts` — 105 lines, new Linear parent-deliverable renderer and Slack receipt formatter.
- `src/surfaces/ceo-slack-responder/linear-client.ts` — 224 lines, new Linear create client/config resolver.
- `src/surfaces/ceo-slack-responder/responder.ts` — 978 lines, added intake routing, confirm/dismiss handling, link-back, and failure logging seams.
- `tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts` — 206 lines, new confirm replay/concurrency tests.
- `tests/surfaces/ceo-slack-responder/intake-followup.test.ts` — 191 lines, new minimum-context/follow-up tests.
- `tests/surfaces/ceo-slack-responder/intake-gate.test.ts` — 147 lines, new happy-path and no-Slack-capture tests.
- `tests/surfaces/ceo-slack-responder/linear-client.test.ts` — 125 lines, new Linear payload/config/timeout tests.

### Decisions

- Kept the intake brain deterministic and local to `brain.ts` rather than adding a new LLM dependency or runtime worker.
- Loaded Linear config only when `ECHO_LINEAR_INTAKE_ENABLED` or a Linear env key is present, so existing responder deployments that do not use intake do not start failing on missing Linear IDs.
- Held the per-draft in-process lock across the external create call so concurrent duplicate confirms wait for the first result instead of misclassifying an in-flight create as crashed.
- Treated a persisted `creating` state observed on a later invocation as uncertain and moved it to `needs-reconcile` without re-calling Linear.
- Did not touch `src/capture/gate.ts` or `src/capture/sources.ts`; tests assert Slack is not added as a capture source.

### Acceptance criteria status

- AC1 — Passing. `respondToQuestion` posts the Slack ACK before intake work; tests cover plain-language/labeled extraction.
- AC2 — Passing. Drafts key by `team_id:channel_id:root_ts`, accumulate top-level/threaded follow-ups, ask ≤2 plain-language questions, reject unmapped project names as missing context, and avoid branch/file/test-plan prompts.
- AC3 — Passing. Confirm/dismiss only; requester must confirm; duplicate/replayed confirms create at most one issue; `creating` replay and create timeout produce `needs-reconcile`.
- AC4 — Passing. Linear create uses explicit config IDs/name→project map, no reads, bounded timeout, no retry, and defensive no-network validation for unresolved create inputs.
- AC5 — Passing. Created issue body includes requester and Slack thread receipt; responder posts issue URL and included-field receipt back to Slack.
- AC6 — Passing. Slack remains surface-only; no capture allowlist change; failures persist draft evidence and append operator-visible failure records; runbook added.

### Test results

Focused acceptance tests:

```text
> echoctl@0.1.0-beta.1 test
> vitest run tests/surfaces/ceo-slack-responder/intake-gate.test.ts tests/surfaces/ceo-slack-responder/intake-followup.test.ts tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts tests/surfaces/ceo-slack-responder/linear-client.test.ts


 RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--slack-linear-intake-gate

 ✓ tests/surfaces/ceo-slack-responder/linear-client.test.ts (4 tests) 10ms
 ✓ tests/surfaces/ceo-slack-responder/intake-gate.test.ts (2 tests) 19ms
 ✓ tests/surfaces/ceo-slack-responder/intake-followup.test.ts (4 tests) 27ms
 ✓ tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts (5 tests) 34ms

 Test Files  4 passed (4)
      Tests  15 passed (15)
   Start at  15:53:50
   Duration  1.03s (transform 562ms, setup 0ms, collect 1.18s, tests 90ms, environment 1ms, prepare 307ms)
```

Typecheck:

```text
> echoctl@0.1.0-beta.1 typecheck
> tsc --noEmit
```

Lint:

```text
> echoctl@0.1.0-beta.1 lint
> eslint . --max-warnings 0 && npm run lint:task-state


> echoctl@0.1.0-beta.1 lint:task-state
> python3 tools/task-state/lint.py
```

Full CEO Slack responder regression group:

```text
> echoctl@0.1.0-beta.1 test
> vitest run tests/surfaces/ceo-slack-responder


 RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--slack-linear-intake-gate

 ✓ tests/surfaces/ceo-slack-responder/linear-client.test.ts (4 tests) 13ms
 ✓ tests/surfaces/ceo-slack-responder/decision-store-latest-wins.test.ts (1 test) 6ms
 ✓ tests/surfaces/ceo-slack-responder/cross-team-scope.test.ts (4 tests) 8ms
 ✓ tests/surfaces/ceo-slack-responder/intake-gate.test.ts (2 tests) 22ms
 ✓ tests/surfaces/ceo-slack-responder/confirm-idempotency.test.ts (2 tests) 23ms
 ✓ tests/surfaces/ceo-slack-responder.test.ts (11 tests) 14ms
 ✓ tests/surfaces/ceo-slack-responder/intake-followup.test.ts (4 tests) 33ms
 ✓ tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts (5 tests) 47ms
 ✓ tests/surfaces/ceo-slack-responder/propose-confirm.test.ts (3 tests) 203ms

 Test Files  9 passed (9)
      Tests  36 passed (36)
   Start at  15:54:01
   Duration  1.73s (transform 1.68s, setup 0ms, collect 4.06s, tests 370ms, environment 1ms, prepare 765ms)
```

Whitespace:

```text
git diff --check
```

No output.

### Open questions

None.

### Drift events

None.
