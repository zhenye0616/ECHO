---
item_id: 2026-05-17-059-coord-emit-surface-daemon-rejection
verdict: merge as-is
reviewed_at: 2026-05-17T16:30:00Z
test_counts: { passed: 1124, failed: 0, skipped: 21 }
---

## Verdict

Merge as-is. The implementation is a tight, narrow execution of the convergent r5 spec. Diff is strictly limited to the two spec-named files (`tools/review-queue/coord-emit.sh` + `tests/coord/coord-emit-wrapper-transport.test.ts`). All three new branches behave per AC1: rejection → `coord-emit.sh: daemon rejected <event_type>: <verbatim text>`; HTTP non-2xx → `daemon returned HTTP <status>`; unreachable → zero stderr bytes; exit 0 in every branch. Tests run green locally (full repo: 1124 passed / 21 skipped / 0 failed; coord suite: 22 files / 122 tests pass) on macOS bash 3.2.57 with BSD tooling. The `runWrapperAsync` test helper is the one place the implementation went deeper than the spec text — but it's a load-bearing test-harness fix (spawnSync deadlocks the in-process server), not scope creep, and the agent_notes flag it transparently.

## Pre-merge fixups

- [ ] None.

## Expected merge conflicts

- None. Main is clean at `189c2e3` and neither of the two touched files has been modified on main since `head_sha` was recorded. `tools/review-queue/coord-emit.sh` is a clean fast-forward (additive header lines + replacement of the trailing curl block); `tests/coord/coord-emit-wrapper-transport.test.ts` is purely additive (new imports + helpers + new `describe('059 AC3 …')` block).

## Follow-up items (defer, do not block merge)

- If empirical journal evidence ever shows a daemon error message containing escaped quotes (`\"`), file a follow-on spec to swap the awk extraction for a JSON-aware reader. The current substring extractor degrades gracefully (operator still sees `daemon rejected <event>:`) so this is purely a relay-fidelity refinement.
- If a third wrapper-stderr spec lands, consider extracting a `wrapperEnv(handle, role)` test helper. Until then, copy-paste is honest per Out-of-Scope #11.
- Optional one-line addition to `wiki/architecture/coord-active-trigger-and-role-emission.md` per the strategist's After-Completion notes — only if a natural insertion point already exists.

## Open questions for founder

None — verdict is `merge as-is`.

## Detailed review (for the archive)

### Acceptance status

- **AC1** — Met. `coord-emit.sh:128-136` captures body + status via `-w '\n%{http_code}'` and redirects curl's stderr via `2>/dev/null` (the r2 codex-ops F1 MED suppression). Three branches at lines 142-190: curl_rc!=0 → silent exit 0; HTTP 2xx + isError true → rejection line with awk-extracted text, `\"`-unescaped, truncated to 500 + `…[truncated]` (lines 159-175); HTTP non-2xx → status + first 200 chars of body or `<empty>` (lines 178-189). Header comment block at lines 36-57 documents the three-state contract verbatim.
- **AC2** — Met. `git diff main...HEAD --stat` shows only the two expected files. No edits to skills/`_run_reviewer.sh`/any caller.
- **AC3** — Met. Tests at lines 214-248 (rejection), 255-281 (unreachable + `toBe('')` on stderr), 289-335 (HTTP 500 via separate `node:http` fixture). `pickClosedPort()` helper (lines 30-46) matches the spec listing verbatim. Happy-path test extended with `stdout/stderr.toBe('')` per the AC3 test-discipline clause. All seven wrapper-transport tests pass.
- **Definition of Done** — Met. All ACs green; `npm test`, `npm run lint`, `npm run typecheck` all clean.

### Drift findings

None. All 12 Out-of-Scope items respected (exit-non-zero, caller prose, retry, structured logging, auto-correction, separate strict script, verbose env flag, daemon validator, coord_status, 057 backport, parallel-wrapper edits, 200-non-MCP-shape branch — all clean).

### Design-choice judgments

- `runWrapperAsync` helper (test:57-76) — Stand. spawnSync blocks the libuv event loop; async spawn is the minimal fix. Pre-existing tests left on spawnSync (no churn on green).
- Bash 3.2.57 portable parsing — Stand. No `[[ … ]]`, no Bash 4 features, no jq.
- 500-char truncation, 200-char body excerpt — Stand. Numbers match spec exactly.
- `pickClosedPort()` bind-0-then-close — Stand. TOCTOU acceptable for single-process unit harness.
- HTTP 500 fixture via `node:http` — Stand. `try/finally fixture.close()` is correct teardown.

### Bugs/risks (all non-blocking)

- `coord-emit.sh:163` awk pattern `/"text":"[^"]*"/` stops at the first unescaped `"`. Latent only — current daemon strings have no embedded quotes. Documented above as follow-up.
- `coord-emit.sh:159` `grep -q '"isError":true\|"isError": true'` is substring-based, not JSON-aware. Not a real risk against the current daemon. Non-blocking.

### Test counts observed

- Full repo: 98 files passed / 0 failed / 1 skipped; **1124 tests passed / 21 skipped / 0 failed**.
- Coord suite (`tests/coord/`): 22 files / **122 tests passed**.
- `coord-emit-wrapper-transport.test.ts` alone: 7 passed (4 pre-existing + 3 new).
- `npm run lint`: clean. `npm run typecheck`: clean.
