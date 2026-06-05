---
item_id: 2026-06-05-090-adopt-selftest-onboarding-harness
verdict: merge as-is
reviewed_at: 2026-06-05T21:05:00Z
test_counts: { passed: 1563, failed: 0 }
producer: review-pending-orchestrator
---

## Verdict
All five acceptance criteria are met and the diff touches exactly the five declared `files_to_modify` with zero drift. `echoctl selftest` is genuinely hermetic: it sets `ECHO_MCP_PORT=0`, parses the resolved port from the daemon lifecycle payload, threads it everywhere, and both code (`SELF-01`) and tests assert it never contacts 38478 — there is no fallback path to the founder's real daemon. The voting unit test (`tests/cli/selftest.test.ts`, 9/9 green in 58ms) uses a fake runner and never spawns the real daemon; the windows-compat board is quarantined with `it.todo`/`describe.skip` + 091 comments; the `onboarding` job is `continue-on-error` on every leg so no `ci.yml` leg or voting test can fail `main` in 090. Typecheck, lint, and `build:cli` all pass clean. The single `npm test` failure is `tests/cli/init.test.ts` — a pre-existing real-daemon environmental flake that passes in isolation, is byte-identical to main, and is not a 090 file. No merge-conflict risk: `.github/workflows/` is empty on main (090's ci.yml is a pure add), and `src/cli/index.ts` changes are localized to four anchors with no competing item in `pending_review/`.

## Pre-merge fixups
- [ ] None — no blocking fixups. Item is mergeable as-is.

## Expected merge conflicts
- `.github/workflows/ci.yml` — none; path is absent on main, pure add. No resolution needed.
- `src/cli/index.ts` — low risk; localized hunks (one import, one help line, one COMMAND_HELP entry, one dispatch branch). Trivial 3-way only if a sibling subcommand lands at the same anchors (none in queue).
- `src/cli/commands/selftest.ts`, `tests/cli/selftest.test.ts` — net-new files, no conflict.
- `tests/windows-compat.test.ts` — ported fresh; 091 edits it to un-skip but is downstream. No conflict.

## Follow-up items (defer, do not block merge)
- Per the spec's "After Completion" note, record in `review_notes` at merge time whether the packed `onboarding` job surfaces any `files`-allowlist gaps — first CI exercise of the 076 boundary; observational, lands when CI first runs.
- 091 should replace the fixed `await sleep(4000)` capture-settle wait in `selftest.ts:609` with a poll-until-recall loop before flipping `onboarding` to a required gate in 092 (flaky-on-slow-CI risk; harmless while continue-on-error).
- Consider filing the `tests/cli/init.test.ts` real-daemon full-suite flake as a separate friction item — it produced a false-red here under the full run (passes in isolation).
