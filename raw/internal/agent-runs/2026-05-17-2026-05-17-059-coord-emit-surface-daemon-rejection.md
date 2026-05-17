---
item: 2026-05-17-059-coord-emit-surface-daemon-rejection
agent_id: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
binding: claude-code
branch: agent/coord-emit-surface-daemon-rejection
head_sha: 6d19336770a659c58b9e0d44a043b79681a79318
---

# 059 — coord-emit.sh surfaces daemon-rejection vs daemon-unreachable

## Run 1 (2026-05-17 PDT)

### What I implemented

AC1 — `tools/review-queue/coord-emit.sh`:
- Replaced the trailing `curl … >/dev/null 2>&1 || true` block with a parsing flow that captures the HTTP response body + status code via `curl -w '\n%{http_code}'` and curl's own exit code via `|| curl_rc=$?`.
- Suppressed curl's own stderr via `2>/dev/null` on the curl invocation so the daemon-unreachable branch emits zero bytes (the locked silent-on-unreachable contract — r2 codex-ops F1 MED).
- Branched on three states inside a `case "$http_status"` on the 2xx vs non-2xx range, with a substring detection of `"isError":true` (no jq dependency, bash 3.2.57-portable).
- Rejection text extracted via `awk match($0, /"text":"[^"]*"/)`, single-pass `\"` unescape via `sed s/\\"/"/g`, newline-join via `tr '\n' ' '`, and truncated to 500 chars + `…[truncated]` via `${var:0:500}`.
- HTTP non-2xx prints the status code + first 200 chars of the body (or `<empty>` if empty).
- Exit 0 in every branch — the existing comment was updated and a new "Stderr semantics (059 …)" block documents the three-state contract.

AC3 — `tests/coord/coord-emit-wrapper-transport.test.ts`:
- Added a `pickClosedPort()` helper using the `bind-port-0-then-close` pattern (replaces the brittle port-1 trick).
- Added a `runWrapperAsync()` helper around `child_process.spawn` because `spawnSync` blocks the libuv event loop and prevents the in-process MCP daemon / 500-fixture from responding during curl's wait window (root-caused after seeing all in-process-daemon spawnSync calls hit curl's `--max-time 5` timeout).
- Test (i) — daemon rejection via wrong-tier `tick_start --tick-run-id=…`; asserts wrapper exit 0, stderr contains `coord-emit.sh: daemon rejected tick_start`, stderr contains verbatim `requires correlation_id`, storage has zero `tick_start` atoms.
- Test (ii) — daemon unreachable via `pickClosedPort`; asserts wrapper exit 0, stderr === `''` (toBe), negative-asserts no `coord-emit.sh: daemon rejected` substring, storage zero atoms.
- Test (iii) — HTTP 500 via in-process `node:http` fixture returning `{"error":"boom"}`; asserts wrapper exit 0, stderr contains `coord-emit.sh: daemon returned HTTP 500`, negative-asserts no `coord-emit.sh: daemon rejected`, MCP storage zero atoms.
- Extended the existing happy-path test to also assert `r.stdout === ''` and `r.stderr === ''` per the test-discipline clause in the spec.

### Files modified

| File | Lines added / removed |
|---|---|
| `tools/review-queue/coord-emit.sh` | +90 / -6 |
| `tests/coord/coord-emit-wrapper-transport.test.ts` | +197 / -0 (additions only; pre-existing tests preserved + the happy-path test gained two new assertions) |

Branch: `agent/coord-emit-surface-daemon-rejection`
Head SHA: `6d19336770a659c58b9e0d44a043b79681a79318`

### Decisions made during implementation

1. **`set -u` interaction.** With `set -u` enabled, `response=$(curl …) || curl_rc=$?` leaves `curl_rc` unset on the success path. Used `curl_rc="${curl_rc:-0}"` immediately after — `:-` is explicitly safe under nounset.
2. **Async spawn helper, not full test rewrite.** I considered rewriting all four existing tests to use `spawn` for consistency, but they pass under `spawnSync` (their assertions are either status-only or rely on the daemon append happening AFTER spawnSync returns). Limited the change to the three new cases per drift rule 4 (no scope expansion); added `runWrapperAsync` only where the test needs to actually receive the wrapper's parsed stderr.
3. **Truncation marker is `…[truncated]` (literal `…` U+2026 + `[truncated]`).** The spec writes "truncate to the first 500 chars and append the literal `…[truncated]`" — taken verbatim. macOS bash 3.2.57 + UTF-8 locale handles the U+2026 byte sequence cleanly via `${var:0:500}` (counts BYTES, not chars, so a multi-byte char at position 499 could be split — but the test substring match is on plain ASCII and the wrapper still emits the line).
4. **isError detection via grep substring, not full JSON parse.** Spec explicitly allows this — `"the daemon's response is single-line, single-content-item per the validator's contract. A small sed/grep pipe extracting "text":"..." from a single-line JSON body is sufficient"`. Used both `"isError":true` AND `"isError": true` (with whitespace) to be robust against future formatter changes; the current MCP server emits without whitespace.

### Acceptance criteria status

| AC | Status | Evidence |
|---|---|---|
| AC1 — wrapper parses + emits three-state stderr | ✅ | `tests/coord/coord-emit-wrapper-transport.test.ts` cases (i), (ii), (iii) all assert the contract end-to-end; `git diff --stat` confirms only `coord-emit.sh` + the test file changed |
| AC2 — no caller file modified | ✅ | `git diff --stat` output included below — `tests/coord/coord-emit-wrapper-transport.test.ts` + `tools/review-queue/coord-emit.sh` only |
| AC3 — three new test cases | ✅ | All three new `it(…)` blocks under the `059 AC3` describe block; npm test passes |

### Test results (verbatim)

```
$ npx vitest run tests/coord/coord-emit-wrapper-transport.test.ts
 ✓ tests/coord/coord-emit-wrapper-transport.test.ts (7 tests) 16089ms
   ✓ 057b AC7 — coord-emit.sh wrapper transport > coord-emit.sh tick_start produces a valid coord:tick_start atom 5141ms
   ✓ 057b AC7 — coord-emit.sh wrapper transport > atom is accepted by 057a coord_emit validator: tier=round, subject_role=codex 5186ms
   ✓ 057b AC7 — coord-emit.sh wrapper transport > daemon-down does NOT abort the wrapper (exit 0)
   ✓ 057b AC7 — coord-emit.sh wrapper transport > scheduler_health emitted with tick_run_id is accepted 5151ms
   ✓ 059 AC3 — coord-emit.sh distinguishes daemon-rejection from daemon-unreachable > daemon rejection (isError:true) is surfaced verbatim on stderr; exit 0; no atom
   ✓ 059 AC3 — coord-emit.sh distinguishes daemon-rejection from daemon-unreachable > daemon unreachable produces fully empty stderr; exit 0; no atom
   ✓ 059 AC3 — coord-emit.sh distinguishes daemon-rejection from daemon-unreachable > daemon HTTP 500 is surfaced as `returned HTTP 500` on stderr; exit 0; no atom

 Test Files  1 passed (1)
      Tests  7 passed (7)
```

Full coord suite — all 22 files / 122 tests pass.

Full repo suite:
```
 Test Files  98 passed | 1 skipped (99)
      Tests  1124 passed | 21 skipped (1145)
   Duration  32.20s
```

Lint:
```
$ npm run lint
> echo-daemon@0.0.0 lint
> eslint . --max-warnings 0 && npm run lint:task-state
(clean — no output)
> echo-daemon@0.0.0 lint:task-state
> python3 tools/task-state/lint.py
(clean — no output)
```

Typecheck:
```
$ npx tsc --noEmit
(clean — no output)
```

### Open questions for founder

None.

### Drift events caught

None. The spec's "Out of Scope (Don't Drift)" list is tight (12 items) and several were tempting during implementation:

- Item 11 ("don't auto-generalize parse-isError to other wrappers in the same commit") — I noticed `tools/review-queue/push-with-retry.sh` and `_run_reviewer.sh` have similar `|| true` patterns, did NOT touch them.
- Item 12 ("don't detect 200 OK + non-MCP-shaped body") — the parser silently falls through on a 200 with no `isError` and no recognizable `text` key, which is symmetric with OoS #5 (no operator-mistake auto-correction).
- Item 7 ("no opt-in verbose env flag") — I considered an `ECHO_COORD_EMIT_VERBOSE=1` to relax the unreachable-silent rule for one-off debugging, did NOT add it. The async-spawn debugging revelation in the test harness would have been the moment to add such a flag, but the spec's reasoning ("operator alarm fatigue", R2) stands.

### Diff summary

```
$ git diff --stat main..agent/coord-emit-surface-daemon-rejection
 tests/coord/coord-emit-wrapper-transport.test.ts | 197 ++++++++++++++++++++++-
 tools/review-queue/coord-emit.sh                 |  96 ++++++++++-
 2 files changed, 287 insertions(+), 6 deletions(-)
```

### Notes for reviewer

- The async-spawn helper (`runWrapperAsync`) reveals that `spawnSync` is incompatible with assertions that depend on the in-process MCP daemon's response body. The four pre-existing tests were structurally tolerant of this (they assert on status or on storage-side state, both of which survive a curl timeout), but the new tests can't be — they must see the actual wrapper-side parsed stderr. The helper is documented inline.
- The `pickClosedPort()` helper closes the r1 codex F2 finding (port 1 is privileged); this lands as a side benefit of the new test cases per AC3's listing.
- The wrapper-side `2>/dev/null` is the load-bearing change for the locked silent-on-unreachable contract (r2 codex-ops F1 MED). Without it, curl's `(7) Connection refused` leaks into launchd logs on every daemon-down tick. The case-(ii) `toBe('')` assertion pins this; a future PR that loosens that to `not.toMatch(/coord-emit\.sh:/)` would reopen the regression door.
