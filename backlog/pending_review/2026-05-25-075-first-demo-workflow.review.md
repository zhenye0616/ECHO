---
item_id: 2026-05-25-075-first-demo-workflow
verdict: merge as-is
reviewed_at: 2026-05-26T22:00:00Z
test_counts: { passed: 1392, failed: 1, skipped: 21 }
---

## Verdict

`merge as-is`. Implementation at `cca609c2` cleanly covers AC1-AC10 with no observable drift. All 11 modified files are in `files_to_modify`; the conditional `src/echo-home/index.ts` re-export was correctly skipped per AC3.6's no-op clause. Typecheck and lint pass clean. Full test suite shows 1392 passed / 21 skipped / 1 failed — the lone failure (`tests/coord/coord-volume-perf.test.ts`: 307ms vs 300ms budget) is a flaky perf-budget test in unrelated coord code that passes on rerun, not caused by this change. The AC10 narrow lift of `run.ts` is exactly bounded: 10 LOC in the human-mode branch of `renderOutcomes`, no dispatcher / JSON-mode / `DispatchOutcome` shape changes, exit-line semantics preserved.

## Pre-merge fixups

(none — `merge as-is`)

## Expected merge conflicts

- None: `git fetch origin main` confirmed `origin/main == local main`; no incoming changes on any of the touched files. Direct `--no-ff` merge is safe.

## Follow-up items (defer, do not block merge)

- Investigate flaky `tests/coord/coord-volume-perf.test.ts:210` perf budget — 300ms ceiling is tight enough to flap on shared/loaded CI; consider widening to 400ms or recording median-of-3. Unrelated to 075.
- Already captured in spec "After Completion": (a) 074-inherited packed-install allowlist gap for `assets/echo-roles/**` + `skills/**`, (b) `echoctl doctor` extended for workflow loadability of preserved user-modified files.
- Consider adding a single blank line between adjacent `outcome.spawn.stdout` blocks when multiple outcomes are rendered in human mode — pre-empts readability friction once multi-step workflows ship. Defer to the future spec that introduces multi-step.

## Open questions for founder

(none — verdict is `merge as-is`)

## Acceptance status (summary)

All AC1.1 → AC10.4 — Met. Highlights:
- AC1.3 prompt invariants all present in `assets/echo-workflows/change-review.toml` (priority chain in order, both terminal strings exact, fallthrough rule, MCP tool names, 600-word cap).
- AC2.1-AC2.3 `syncDefaultWorkflows` mirrors `syncDefaultRoles` byte-for-byte; per-file isolation via try/catch with results AND `workflowsErrors[]` aggregation (workflow-sync.ts:79-163).
- AC3.4 `dirChecks` extended with workflows entry (adapter-sync.ts:446); symlink short-circuit test in adapter-sync.test.ts confirms target dir is not written through.
- AC3.5 `computeOverallOk` correctly fails on `workflowsErrors.length>0`, `action:'error'`, or required-`source-missing` (adapter-sync.ts:587-594).
- AC4.1 workflow-load.test.ts:82-108 pins priority-chain ordering via indexOf, both terminal strings, fallthrough regex, and `mcp__echo__` presence.
- AC6.3 four-case failure matrix correctly placed: chmod-failure stays in `workflow-sync.test.ts` unit suite (the integration-level chmod test would block earlier syncAll steps per r2 codex F3 disposition); EISDIR-via-pre-existing-directory used for integration-level per-file `error` case.
- AC10.1 renderer extends only the human-mode branch; stdout below exit line with blank-line separator; stderr block only when `exitCode !== 0` (run.ts:100-109).

## Design-choice judgments (J1-J7)

All seven stand. No drift.

## Bugs/risks

- `src/cli/commands/run.ts:104-108` — when multiple outcomes are rendered, consecutive findings don't get a separator line between outcomes. Low risk for the demo (single-step workflow); deferred to multi-step follow-up. Non-blocking.
- `tests/echo-home/adapters/workflow-sync.test.ts` `afterEach` restores only the `locked` chmod path. Fine for current cases; worth tracking if future cases add other intentionally-broken permissions.

## Test counts observed

`{ passed: 1392, failed: 1, skipped: 21 }` from `npm test` (lone failure is the unrelated flaky `coord-volume-perf` perf budget — passes on rerun). `npm run typecheck`: pass (exit 0). `npm run lint`: pass (exit 0).
