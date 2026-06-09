---
backlog_item: 2026-06-08-100-codex-adapter-freshness-check
agent_run_started: 2026-06-09T18:49:59Z
agent_run_ended: 2026-06-09T19:10:38Z
status: ready_for_review
test_status: partial
branch: agent/codex-adapter-freshness-check
head_sha: a2af40487ec6f7a1dd2590001cabe1038acfc195
---

# Agent Run: Codex Adapter Freshness Check

## What I Implemented

Implemented the operator-side Codex skill-adapter freshness check split out of 099. `tools/install-echo-codex-skills.sh --check` now verifies managed `~/.codex/skills/*` installs read-only by re-rendering expected `SKILL.md` content from each `.echo-managed` sentinel's recorded `source` and `skill_name`, comparing hashes, and reporting cwd-safe per-skill remediation. `echoctl doctor` now runs that check via absolute-path `execFile` with a normalized subprocess `PATH`, includes a structured `codexAdapter` field in JSON, and treats drift or check errors as non-fatal `degraded`.

## Files Modified

- `tools/install-echo-codex-skills.sh` — added `--check`, managed-sentinel discovery, temp-stage rendering, hash comparison, drift/error exit-code split, and remediation output.
- `src/cli/commands/doctor.ts` — added Codex adapter subprocess check, structured report field, total child-outcome mapping, degraded overall contribution, and human output line without touching `render.ts`.
- `tests/sync-skills/install-echo-codex-skills.test.ts` — added clean, drift, absent, non-default namespace, mixed-family, stale-sentinel, true-orphan, temp-cleanup, and uninspectable install cases.
- `tests/cli/doctor.test.ts` — added drift/check-error report coverage, human-output coverage, total mapping coverage, and an unstubbed CLI invocation from a non-repo cwd with sparse `PATH`.

## Decisions Made During Implementation

### Decision 1: Keep human doctor rendering inside `doctor.ts`

- **Options considered:** edit `src/cli/io/render.ts`; append Codex adapter output from `doctor.ts`.
- **Chose:** append from `doctor.ts`.
- **Why:** `render.ts` is not in `files_to_modify`; appending around the existing renderer satisfies the human-output requirement without widening the touched surface.
- **Worth founder review?** No; this is a scope-preserving implementation detail.

### Decision 2: Export a child-outcome mapper for tests

- **Options considered:** force the real installer to exit `127`; expose a pure mapping helper.
- **Chose:** `codexAdapterReportFromOutcome(...)`.
- **Why:** AC3 requires a total child-result mapping, and a pure helper proves `127`/signal behavior without corrupting the real installer path or adding a test-only shell seam.
- **Worth founder review?** No.

### Decision 3: Record full-suite residuals as partial, not blocking acceptance

- **Options considered:** stop handoff because `npm test` had unrelated failures; hand off with focused AC checks green and full-suite residuals documented.
- **Chose:** hand off with `test_status: partial`.
- **Why:** The item-specific suites, typecheck, lint, coupled invariants, and AC4 guard passed. The reproducing failure is in `tests/review-queue/reviewer-readonly.test.ts`, outside this spec's touched surface, and `tests/mcp/recent-calls-endpoint.test.ts` cleared on rerun.
- **Worth founder review?** Yes, only as test-environment context.

## Acceptance Criteria Status

- [x] AC1 — `install-echo-codex-skills.sh --check`: implemented managed sentinel discovery, cwd-independent source handling, per-run temp stage outside `~/.codex`, actual-vs-rendered hash comparison, source/install drift classification, missing-source stale-vs-orphan remediation, and exit codes `0`/`1`/`2`.
- [x] AC2 — absent-install guard: absent `~/.codex/skills` and readable-zero managed installs exit 0; uninspectable installs exit 2.
- [x] AC3 — doctor integration: implemented absolute installer resolution from module/repo anchor, `execFile` invocation with safe `PATH`, `codexAdapter` report field, total exit-code/signal/spawn-error mapping, JSON inclusion, and degraded overall contribution.
- [x] AC4 — merge gate untouched: `tools/review-queue/check-coupled-invariants.sh` was not modified; grep assertion found no `.codex` reference; full coupled invariants still pass.
- [x] AC5 — tests: focused installer and doctor tests pass, including disposable HOME, namespace/underscore, sparse-PATH doctor, check-error, remediation, mixed-family, stale-sentinel, true-orphan, and uninspectable cases.

## Tests Run

```text
$ npx vitest run tests/sync-skills/install-echo-codex-skills.test.ts tests/cli/doctor.test.ts
✓ tests/cli/doctor.test.ts (10 tests) 28801ms
✓ tests/sync-skills/install-echo-codex-skills.test.ts (18 tests) 40861ms

Test Files  2 passed (2)
Tests  28 passed (28)
Duration  41.86s
```

```text
$ npm run typecheck
> echoctl@0.1.0-beta.1 typecheck
> tsc --noEmit
```

```text
$ bash -n tools/install-echo-codex-skills.sh
# no output; exit 0
```

```text
$ if rg -n "\.codex" tools/review-queue/check-coupled-invariants.sh; then exit 1; else echo "OK: no .codex reference in check-coupled-invariants.sh"; fi
OK: no .codex reference in check-coupled-invariants.sh
```

```text
$ git diff --check
# no output; exit 0
```

```text
$ npm run lint
> echoctl@0.1.0-beta.1 lint
> eslint . --max-warnings 0 && npm run lint:task-state

> echoctl@0.1.0-beta.1 lint:task-state
> python3 tools/task-state/lint.py
```

```text
$ tools/review-queue/check-coupled-invariants.sh
OK: coupled invariants hold
```

```text
$ npm test
Test Files  3 failed | 155 passed | 1 skipped (159)
Tests  3 failed | 1662 passed | 21 skipped | 1 todo (1687)

FAIL tests/cli/shell-reachable.test.ts > echoctl shell reachability > packs an echoctl binary reachable from bash and exercises transitive doctor imports
AssertionError: daemon com.echo.daemon.test-66185-1781031952582 did not become healthy on port 45772; run `echoctl daemon logs --tail 50 --label com.echo.daemon.test-66185-1781031952582` and reinstall or rollback
: expected 1 to be +0

FAIL tests/mcp/recent-calls-endpoint.test.ts > GET /mcp/recent-calls > logs every runtime-registered tool through the wrapper
Error: Test timed out in 15000ms.

FAIL tests/review-queue/reviewer-readonly.test.ts > 087b reviewer read-only wrapper publisher > rejects a schema-valid response that is bound to the wrong selected request
AssertionError: stdout=
stderr=: expected +0 not to be +0
```

```text
$ npx vitest run tests/mcp/recent-calls-endpoint.test.ts tests/review-queue/reviewer-readonly.test.ts
✓ tests/mcp/recent-calls-endpoint.test.ts (2 tests) 9719ms
FAIL tests/review-queue/reviewer-readonly.test.ts > 087b reviewer read-only wrapper publisher > rejects a schema-valid response that is bound to the wrong selected request
AssertionError: stdout=
stderr=: expected +0 not to be +0
```

## Open Questions for Founder

- None blocking for item 100. The residual `reviewer-readonly.test.ts` failure is outside this item's files and reproduced independently; founder/reviewer may decide whether that should become a separate backlog item.

## Drift Events

- None. I did not wire the check into `check-coupled-invariants.sh`, did not add auto-repair, did not touch Claude adapters, did not change sentinel fields, and did not edit `wiki/`.

## Next Suggested Backlog Items (Don't Auto-Create)

- Investigate `tests/review-queue/reviewer-readonly.test.ts` wrong-binding expectation: the wrapper returned 0 where the test expects a terminal capture failure.
