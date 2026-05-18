---
id: 2026-05-17-059-coord-emit-surface-daemon-rejection
title: coord-emit.sh distinguishes daemon-rejection from daemon-unreachable (silent-failure observability gap)
status: ready
priority: MED
estimate: 0.25-0.5d
created: 2026-05-17
blocked_by: []
task_state_ref: 2026-05-17-059-coord-emit-surface-daemon-rejection
requested_reviewers: ["codex", "codex-ops", "claude"]
files_to_modify:
  - tools/review-queue/coord-emit.sh  # AC1 — capture HTTP body + status (via -w '%{http_code}'); redirect curl's OWN stderr to /dev/null so daemon-unreachable produces zero wrapper stderr; on JSON-RPC isError:true print `coord-emit.sh: daemon rejected <event_type>: <text truncated to 500 chars>`; on HTTP non-2xx print `coord-emit.sh: daemon returned HTTP <status>: <first 200 chars of body>`; on curl_rc != 0 print NOTHING; still exit 0 in every branch
  - tests/coord/coord-emit-wrapper-transport.test.ts  # AC3 — extend with THREE new cases: (i) daemon rejects (tier-key mismatch on tick_start) → assert r.status === 0 + stderr contains `coord-emit.sh: daemon rejected tick_start` + verbatim daemon-error substring `requires correlation_id`; (ii) daemon unreachable (port resolved via `pickClosedPort()` bind-port-0-then-close helper) → assert r.status === 0 + `r.stderr.toString() === ''` (full empty-stderr — wrapper redirects curl's own stderr so the silent-on-unreachable contract covers the entire stream); (iii) daemon HTTP 5xx via in-process `node:http` fixture (NOT the MCP daemon) returning 500 → assert r.status === 0 + stderr contains `coord-emit.sh: daemon returned HTTP 500`.
spec_refs:
  - tools/review-queue/coord-emit.sh  # AC1 target — current `curl … || true >/dev/null 2>&1` swallows BOTH daemon-unreachable AND daemon-rejection; this spec splits the two
  - src/coord/validate.ts  # daemon side — `tick_start` round-tier rejection message ("round-tier event 'tick_start' requires correlation_id") and `coord_emit: unknown event_type` are the canonical rejection strings; the wrapper must surface them verbatim, not paraphrase
  - tests/coord/coord-emit-wrapper-transport.test.ts  # AC3 home — already spawnSync's the wrapper against an ephemeral daemon; the two new cases extend the existing harness
  - raw/internal/dogfooding/mcp-interactions-journal.md  # entry "2026-05-16 16:14 PDT — founder-driven live test of coord layer" Note/Conjecture sections — the in-the-moment finding that motivates this spec
  - skills/review-queue-codex.md  # caller — round-tier `coord-emit.sh tick_start --correlation-id=…` emissions in the reviewer skill steps; same silent-rejection failure mode applies (e.g., a future tier-classification change would silently break every reviewer's emission until someone runs coord_status by hand)
  - skills/review-queue-claude.md  # caller — same shape as codex
  - skills/review-queue-codex-ops.md  # caller — same shape as codex
  - tools/review-queue/_run_reviewer.sh  # caller — scheduler-tier `coord-emit.sh scheduler_health[_done] --tick-run-id=…`; the launchd-tick path that motivated the entire coord layer's existence (058a/058b were specced because this path failed silently); the silent-rejection mode here would re-introduce a similar opacity at a tier boundary

# --- agent-managed fields (filled in during run) ---
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-17T08:53:29Z"
branch: "agent/coord-emit-surface-daemon-rejection"
worktree: "~/Desktop/Project_echo--coord-emit-surface-daemon-rejection"
head_sha: "6d19336770a659c58b9e0d44a043b79681a79318"
pr_url: ""
review_notes: |
  Merged on 2026-05-17 via founder reconciliation.
  
  Conflicts resolved:
  - None (clean merge; sidecar predicted no conflicts; main untouched on both files since branch claim).
  
  C3.5 cross-vendor consult: none invoked
  
  Fixups applied:
  - None.
  
  Fixups deferred to follow-up items:
  - None.
  
  Verify: 1105/1126 tests pass (21 skipped, 0 failed); lint and typecheck clean post-merge; tools/sync-skills.sh --check OK.
  
  Follow-up items (non-blocking):
  - If empirical journal evidence ever shows a daemon error message containing escaped quotes (\"), file a follow-on spec to swap the awk extraction for a JSON-aware reader. Current substring extractor degrades gracefully — purely a relay-fidelity refinement.
  - If a third wrapper-stderr spec lands, consider extracting a wrapperEnv(handle, role) test helper. Until then, copy-paste is honest per Out-of-Scope #11.
  - Optional one-line addition to wiki/architecture/coord-active-trigger-and-role-emission.md per strategist After-Completion notes — only if a natural insertion point already exists.

agent_notes: |
  AC1: `tools/review-queue/coord-emit.sh` now captures HTTP status + body via `curl -w '\n%{http_code}'` and curl rc via `|| curl_rc=$?`; suppresses curl's own stderr via `2>/dev/null` so the daemon-unreachable branch produces zero bytes. Three-state stderr contract per spec: success → silent; isError:true → `coord-emit.sh: daemon rejected <event_type>: <text truncated to 500 chars>`; HTTP non-2xx → `coord-emit.sh: daemon returned HTTP <status>: <first 200 chars>`; exit 0 in every branch. Bash 3.2.57-portable (no jq; substring isError detection + awk match for `"text":"..."` + sed unescape).
  AC2: only `tools/review-queue/coord-emit.sh` and `tests/coord/coord-emit-wrapper-transport.test.ts` modified. `git diff --stat` confirms.
  AC3: three new test cases in `tests/coord/coord-emit-wrapper-transport.test.ts` covering rejection / unreachable / HTTP 500. Added `pickClosedPort()` helper (bind-port-0-then-close) and `runWrapperAsync()` helper (async spawn — needed because `spawnSync` blocks the libuv event loop and the in-process MCP daemon / 500-fixture can't respond during curl's wait window). Existing happy-path test extended with stdout/stderr-empty assertions per the AC3 test-discipline clause.
  All 7 wrapper-transport tests pass; full coord suite (22 files / 122 tests) passes; full repo suite (98 files / 1124 tests) passes; `npm run lint` clean; `tsc --noEmit` clean.
  Reviewer note: `runWrapperAsync` is the load-bearing test-side fix that lets cases (i) and (iii) actually exercise the wrapper's parsing path. The four pre-existing tests are structurally tolerant of the spawnSync-blocks-the-event-loop issue (their assertions are status-only or storage-side, which survive curl timeouts); the new ones can't be.
---

# coord-emit.sh distinguishes daemon-rejection from daemon-unreachable

## Why this spec exists

The coord layer's wrapper-side emitter `tools/review-queue/coord-emit.sh` (shipped in 057b AC7) is **deliberately best-effort**: its `curl … || true` swallows non-zero exit codes so a daemon-down condition cannot abort a reviewer tick, preserving queue durability (the original r1 codex-ops F2 HIGH finding). That posture is correct and load-bearing for the daemon-down case.

However, `|| true` combined with `>/dev/null 2>&1` also swallows the case where the daemon is reachable, returns HTTP 200, but the JSON-RPC body carries `isError: true` because the daemon's coord_emit validator rejected the input. To the operator, the two are indistinguishable: `rc=0`, no stderr, no atom written. Bugs that fall into this silent zone include:

- **Tier-key mismatch** — e.g. `coord-emit.sh tick_start --tick-run-id=…`. `tick_start` is round-tier per `src/coord/types.ts`; the daemon responds `"coord_emit: round-tier event 'tick_start' requires correlation_id (non-empty string)"`. Wrapper exit 0, no atom. (Live test 2026-05-16 16:14 PDT — `mcp-interactions-journal.md` "founder-driven live test of coord layer" entry — caught this only after a direct curl was used to bypass the wrapper.)
- **Unknown event_type** — `coord-emit.sh round_combined --correlation-id=…`. Already documented at `skills/review-queue-watch.md:212` ("`coord_emit` would silently reject it"). A future event-type rename in `src/coord/types.ts` would break every emitter using the old name with zero operator signal.
- **Schema-version skew** — a wrapper hardcodes `schema_version: 1`; the registry bumps to 2 with no compat shim. Wrapper exit 0, no atom.
- **Role/identity error** — `X-Echo-Role: rover-typo` against `coord-roles.json`. Wrapper exit 0, no atom.

This class is **exactly the same shape** as the launchd silent-fail incident (`raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md` motivation; `wiki/architecture/coord-layer.md` lines 18-22) that motivated 057 in the first place — *a reachable surface that returns successfully while silently dropping the signal it was supposed to relay*. The coord layer fixed the launchd version; this spec closes the wrapper-side twin.

## The minimum-viable fix

Surface daemon-rejection to stderr without changing the exit contract. The wrapper still exits 0; callers still MUST NOT branch on rc (the script's existing contract, codex r1 F2 HIGH). The only change is an **advisory stderr line** distinguishing three states:

| State | curl rc | HTTP status | JSON-RPC `isError` | Operator-visible signal |
|---|---|---|---|---|
| Success | 0 | 200 | absent / false | none (preserve quiet happy path) |
| **Daemon rejection** (NEW) | 0 | 200 | true | stderr: `coord-emit.sh: daemon rejected <event_type>: <daemon error text>` |
| Daemon HTTP error | 0 | 4xx/5xx | n/a | stderr: `coord-emit.sh: daemon returned HTTP <status>: <body or empty>` |
| Daemon unreachable | non-zero | n/a | n/a | **NONE — silent**, preserves the quiet-on-daemon-down posture (locked r1 codex-ops F1 + claude F1) |

The exit code stays `0` in every case. Queue durability invariant unchanged.

## Architectural invariant

**`coord-emit.sh` exits 0 unconditionally**, regardless of the daemon's response or reachability. Operator visibility into the *reason* a coord atom did not land is improved via stderr lines that are **advisory only** — automation must continue to ignore exit status, and downstream tooling (launchd wrappers, skill prose) is unchanged.

## Acceptance Criteria

### AC1 — `tools/review-queue/coord-emit.sh` parses the daemon response and surfaces rejection on stderr

- **Modified file:** `tools/review-queue/coord-emit.sh`. Edit replaces the current trailing `curl … >/dev/null 2>&1 || true` block (lines ~97-104).
- **New behavior:**
  - Capture curl's stdout (the HTTP response body) and HTTP status code into shell variables. Use `--write-out '%{http_code}'` and a temp file (or `curl -w '\n%{http_code}'` and parse the trailing line) — whichever is more portable across the macOS launchd `bash 3.2.57` BSD/GNU split. Capture curl's own rc into a separate variable. **Keep** the existing `--connect-timeout 2 --max-time 5`. **Keep** the existing headers (`X-Echo-Role`, `Content-Type: application/json`, `Accept: application/json, text/event-stream`).
  - **Suppress curl's own stderr (r2 codex-ops F1 MED, load-bearing).** Replace the current `2>&1` (which routed curl's stderr to /dev/null along with stdout via the old `>/dev/null 2>&1`) with explicit `2>/dev/null` on the new curl invocation. Without this, curl's native error output (`curl: (7) Failed to connect to 127.0.0.1 port X: Connection refused`, `curl: (28) Connection timed out`, etc.) leaks into `~/Library/Logs/echo-review-queue-<role>.log` on every daemon-down launchd tick, defeating the silent-on-unreachable contract that AC1's `curl_rc != 0` bullet claims. The wrapper parses HTTP status from `-w '%{http_code}'` output and curl rc from `$?`; curl's native error lines are redundant with the wrapper's parsed three-state stderr AND would re-create the daemon-down log flood R1 closed. After the redirect, the ONLY stderr the wrapper produces in production comes from the wrapper's own three branches below (rejection / HTTP-non-2xx / silent-on-unreachable).
  - Branch:
    - `curl_rc != 0` → daemon-unreachable. **Silent — no stderr line.** This is the locked V1 contract (r1 codex-ops F1 + claude F1 convergent). The existing quiet-on-daemon-down posture is preserved verbatim: a transient daemon-down during a healthy launchd tick is normal noise, not a signal worth recording. No env-flag, no opt-in verbose mode — Out of Scope #7 enforces. The new signal worth surfacing is daemon-side **rejection** (deterministic schema/tier error), not transient unreachability.
    - `curl_rc == 0` AND HTTP status in 2xx range AND body parses to `{ "result": {...}, "isError"?: false (or absent) }` → success path, no stderr.
    - `curl_rc == 0` AND HTTP status in 2xx range AND body parses to `{ "result": { "isError": true, "content": [{"type":"text","text":"…"}] } }` → **NEW** print exactly one line to stderr: `coord-emit.sh: daemon rejected <event_type>: <daemon error text>` where `<daemon error text>` is the verbatim string extracted from `result.content[0].text` (single-line; if multi-line, the wrapper joins on space — operators reading stderr in launchd logs want one line per emit).
    - `curl_rc == 0` AND HTTP status NOT in 2xx → **NEW** print exactly one line to stderr: `coord-emit.sh: daemon returned HTTP <status>: <first 200 chars of body, or "<empty>">`.
- **Parsing constraint:** the wrapper MUST NOT require `jq` or any non-default toolchain (macOS `bash 3.2.57` + BSD `sed` / `awk` / `grep` only; matching the wrapper's existing portability constraint that surfaced in 057b r7 — BSD `date` lacked `%N` and rendered literal `.3NZ`). A small `sed`/`grep` pipe extracting `"text":"…"` from a single-line JSON body is sufficient — the daemon's response is single-line, single-content-item per the validator's contract. Embedded quotes in the error message are unlikely but worth a single-pass `\"` unescape. **Truncation, not body-dump:** if the extracted text exceeds 500 characters (chosen because launchd log lines beyond that length are read-hostile), truncate to the first 500 chars and append the literal `…[truncated]`. Do NOT fall back to a whole-body dump — that would diverge from AC1's single-shape verbatim-relay contract (r1 claude F2).
- **Exit status unchanged:** the wrapper STILL exits 0 in every branch. The existing comment "ALWAYS exits 0 … Callers MUST NOT branch on this script's exit status" stays verbatim. The new stderr lines are advisory only.
- **Header comment update:** the existing "Exit semantics (r1 codex-ops F2 HIGH best-effort)" block (lines ~30-34) gets a new paragraph documenting the three-state stderr contract: success → silent; rejection → one stderr line with the daemon's verbatim error text (truncated to 500 chars); HTTP non-2xx → one stderr line with the status code; **unreachable → zero bytes of stderr (curl's own stderr is suppressed via `2>/dev/null` per AC1's "Suppress curl's own stderr" bullet — no opt-in verbose mode, no env flag)**. The exit-0-unconditional invariant is reinforced.

### AC2 — Skill prose unchanged

- **No edit** to `skills/review-queue-codex.md`, `skills/review-queue-claude.md`, `skills/review-queue-codex-ops.md`, `tools/review-queue/_run_reviewer.sh`, or any other caller. The wrapper's external contract (event_type + flag args, REVIEWER_NAME env, exit 0) is unchanged. This is the load-bearing test that the spec is purely additive on the wrapper's internal observability — if the reviewer finds a caller that needs to change, the spec should be re-examined for hidden coupling.
- **Why this AC exists:** prevents drift into "while we're touching the wrapper, let's also retrofit `tick_end(bind_failed)` emission shape" or similar. The fix is one file plus one test extension.

### AC3 — Three new test cases in `tests/coord/coord-emit-wrapper-transport.test.ts`

- **Extend the existing test file** (do NOT create a new test file). The harness already does `spawnSync('bash', ['tools/review-queue/coord-emit.sh', …])` against an ephemeral in-process daemon (`startMcpServer({port: 0})`) — all three new cases reuse this fixture (plus, for case (iii), a second tiny in-process HTTP fixture that is NOT the MCP daemon — see below).
- **Test (i) — daemon rejects (JSON-RPC `isError:true`):** invoke `coord-emit.sh tick_start --tick-run-id=<UUID>` (DELIBERATELY wrong tier — `tick_start` is round-tier). Assert:
  - wrapper `r.status === 0`
  - `r.stderr.toString()` includes the literal substring `coord-emit.sh: daemon rejected tick_start`
  - `r.stderr.toString()` includes the literal substring `requires correlation_id` (the verbatim daemon error text, proving the wrapper relayed it without paraphrasing — guards against regressions where someone "helpfully" replaces the daemon message with a generic "emit failed")
  - storage contains zero atoms (the daemon truly rejected; no side effect)
- **Test (ii) — daemon unreachable:** invoke `coord-emit.sh tick_start --correlation-id=<UUID>` against a port the OS just told us is free. Use the bind-port-0-then-close pattern instead of the brittle port-1 trick (r1 codex F2 — port 1 is an assigned privileged port, not a portable "never bound" guarantee):

  ```ts
  // Helper, in the test file:
  import net from 'node:net';
  async function pickClosedPort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.unref();
      probe.listen(0, '127.0.0.1', () => {
        const addr = probe.address();
        if (typeof addr !== 'object' || addr === null) {
          probe.close(); reject(new Error('no port from listen(0)')); return;
        }
        const port = addr.port;
        probe.close(() => resolve(port));
      });
      probe.on('error', reject);
    });
  }
  ```

  Then `ECHO_MCP_URL=http://127.0.0.1:<port>/mcp` for the wrapper invocation. There IS a tiny TOCTOU window between `probe.close()` and the wrapper's `curl`, but in a unit-test harness it is negligible (millisecond order, no concurrent test allocator) and far more deterministic than port-1. Assert:

  - wrapper `r.status === 0`
  - **`r.stderr.toString() === ''`** (fully empty stderr — the locked V1 silent-on-unreachable contract, r2 codex-ops F1 MED). The wrapper redirects curl's own stderr to `/dev/null` per AC1's new "suppress curl's own stderr" requirement, so on the unreachable branch nothing reaches the spawned process's stderr stream — not the wrapper's own emissions (none for this branch), AND not curl's `(7) Connection refused` / `(28) Timed out`. The test pins the whole stream as empty; an earlier draft used `not.toMatch(/coord-emit\.sh:/)` (gating only the wrapper's prefix), but that allowed the production log flood r2 caught. **`toBe('')` is the contract.** If a future bash quirk or pipefail interaction sneaks any byte into stderr on the unreachable path, this assertion fails loudly, which is the desired regression catch.
  - **Negative-assertion** (also kept for clarity): `r.stderr.toString()` does NOT match `/coord-emit\.sh: daemon rejected/` (subsumed by the empty-stderr check, but stated explicitly so a future relaxation of `toBe('')` can't silently allow the rejection-line through).
- **Test (iii) — daemon returned HTTP non-2xx (wrong-transport / 4xx/5xx):** stand up a tiny in-process HTTP fixture (NOT the MCP daemon — a `node:http` server that returns `500 Internal Server Error` with body `{"error":"boom"}` to every POST). This simulates the launchd production failure mode codex-ops F2 named: a stale `ECHO_MCP_URL` reaching a local service that is NOT the MCP daemon, or a daemon-side 500 from an unrelated path. Point the wrapper at it; assert:
  - wrapper `r.status === 0`
  - `r.stderr.toString()` includes the literal prefix `coord-emit.sh: daemon returned HTTP 500`
  - `r.stderr.toString()` does NOT include `coord-emit.sh: daemon rejected` (this is the third tier — not a JSON-RPC isError; the test pins the three branches to three distinct stderr shapes so a future refactor cannot collapse them)
  - storage contains zero coord atoms

  The fixture lives in-process per the same harness pattern as the existing `startMcpServer({port: 0})`; tear it down in `afterEach`. Use `port: 0` for the fixture too, then read its `.address().port` into the wrapper env. No `pickClosedPort` needed here — the fixture IS listening.
- **No live-network test:** all three cases use in-process fixtures. No external host; no `curl https://…`; no test that depends on the launchd daemon being running on the dev machine.
- **`npm test` integration:** the three new cases run as part of the existing `tests/coord/coord-emit-wrapper-transport.test.ts` vitest file. No new test command, no new CI step.

## Out of Scope (Don't Drift)

1. **Changing the wrapper's exit contract.** Exit 0 unconditionally is load-bearing (preserves queue durability when the daemon is down — r1 codex-ops F2 HIGH from 057b). No `--strict` flag, no `EXIT_ON_REJECT=1` env var, no exit-non-zero branch. If a builder is tempted to add one, stop and re-read the 057b review history.
2. **Touching skill prose or any caller.** Per AC2 — if a caller needs to change, the spec is wrong. The wrapper's external contract stays bit-exact.
3. **A retry on rejection.** Rejection is a deterministic schema/tier error; retrying produces the same rejection. No retry loop, no exponential backoff. (Retry on `curl_rc != 0` is also out of scope — the launchd polling path is the durability layer.)
4. **Structured logging / journald / a new log file.** The output is stderr, period. Launchd already captures wrapper stderr to `~/Library/Logs/echo-review-queue-<role>.log` via `_run_reviewer.sh`; that's the existing surface. No new log path, no JSON output, no `LOG_LEVEL` env var.
5. **Auto-correction of operator mistakes.** If the operator passes `--tick-run-id` on a round-tier event, the wrapper does NOT silently swap to `--correlation-id` or generate a UUID. The daemon's rejection IS the signal; the wrapper just surfaces it.
6. **A separate `coord-emit-strict.sh` companion.** YAGNI. One script, three branches.
7. **The `ECHO_COORD_EMIT_VERBOSE=1` opt-in env flag (or any third stderr-state for daemon-unreachable).** R1 locked the daemon-unreachable branch to **silent** (r1 codex-ops F1 + claude F1 convergent); R2 tightened the contract by requiring curl's own stderr be redirected to `/dev/null` (r2 codex-ops F1 MED) so the silent-on-unreachable contract covers the ENTIRE stderr stream (not just the wrapper's own `coord-emit.sh:` emissions). No env flag, no opt-in verbose, no third behavior axis, no leaking of curl's native `(7) Connection refused` / `(28) Timed out` lines into `~/Library/Logs/echo-review-queue-<role>.log`. The unreachable branch is zero bytes of stderr, period.
8. **Modifying the daemon-side validator.** The validator's rejection strings (`coord_emit: round-tier event 'tick_start' requires correlation_id (non-empty string)`, etc.) are the input the wrapper relays. If the strings need to change for readability, that's a separate spec on `src/coord/validate.ts`.
9. **Surfacing rejection to `coord_status`.** Out of scope. `coord_status` is a daemon-side operator surface for open deadlines + per-role-last-tick; surfacing per-emit rejection counters there is a meaningful design question, not a wrapper hotfix.
10. **Backporting to 057's archived parent spec.** 057 is in `complete/`; no edits there.
11. **Auto-generalizing the parse-isError pattern to other best-effort wrappers in the same commit** (e.g. `coord_invoke`'s HTTP body parsing, `push-with-retry.sh`'s retry shell, scheduler-tier emitters in `_run_reviewer.sh`, or any other `|| true` callsite). The 059 fix is narrow and observability-only — `tools/review-queue/coord-emit.sh` is the **single** wrapper touched. If a second silent-failure spec lands later (the "second spec is the trigger" rule from After-Completion), that's when extracting a shared parser becomes warranted. Until then, copy-paste discipline is a feature: it keeps each `|| true` wrapper's silent-vs-loud contract independently auditable. AC2 already enforces "no caller change"; this point closes the symmetric door on parallel-wrapper edits (r1 claude F3).
12. **Detecting 200 OK + non-MCP-shaped body** (e.g., a stale `ECHO_MCP_URL` pointing at a local web service that returns 200 with HTML, an unrelated 200 JSON payload, or a malformed JSON-RPC reply that lacks `result.isError` / `result.content[0].text`). 059's framing is **rejection vs unreachable** — two states the wrapper currently conflates with success. **Wrong-URL-configuration** is a third state but it's an operator-side responsibility (validating `ECHO_MCP_URL` at install/launchd-load time), not daemon-side behavior. The existing AC1 parser falls through silently in this case, which is symmetric with OoS #5's "auto-correction of operator mistakes" posture — the wrapper does NOT compensate for misconfiguration. Codex-ops r4 F1 (MED) recommended an explicit "unexpected 2xx" branch + a 200-non-MCP fixture; **deferred per friction-first / narrow-spec discipline**. If a "wrong ECHO_MCP_URL" incident lands in `raw/internal/dogfooding/mcp-interactions-journal.md` empirically, file a follow-on spec adding the 5th branch — the parser already extracts `result.content[0].text`, so detecting `result` absent is a small extension. Until then, scope stays at the original 2→3 state split.

## Risks

- **R1 — parsing the daemon's JSON body in bash without jq fragiles in edge cases** (embedded quotes, multi-line content, future schema bumps). Mitigation: extract narrowly — `result.content[0].text` is a single string per the validator's contract, single-line in practice. The test asserts on a literal substring (`requires correlation_id`) rather than full message equality, so minor format drift in the daemon's error text doesn't break the test. **Fallback when parsing fails:** truncate the extracted text to 500 chars + `…[truncated]` (per the AC1 parsing-constraint clause); do NOT fall back to a whole-body dump (r1 claude F2 — body-dump would diverge from AC1's single-shape verbatim-relay contract, and AC3 test (i) would still pass because the daemon error text is a substring of the body, masking the divergence).
- **R2 — operator alarm fatigue.** If reviewers' coord_emit calls start showing intermittent rejection lines in launchd logs (e.g., during 057a/057b post-merge transitions), operators may train themselves to ignore the new stderr. Mitigation: the wrapper has been running clean since 057b merged (r10 codex review confirmed AC7 emissions land correctly); rejection lines should be rare in the steady state, and a flurry IS the signal — the test discipline is "if it fires, read it; don't filter."
- **R3 — daemon-down stderr noise during launchd ticks.** R1 locked AC1's unreachable branch to **silent** (no stderr line on `curl_rc != 0`). The closed design avoids the 100s-of-lines-per-restart × roles flood that an opt-in verbose path could create. The new signal worth surfacing is daemon-side **rejection**, not transient unreachability.
- **R4 — `bash 3.2.57` portability.** macOS launchd runs bash 3.2.57 from /bin/bash. Some `[[ … ]]` idioms differ. Mitigation: keep the parsing to `[ … ]` + `case` + `sed`/`grep` (the existing wrapper style); no Bash 4 features. AC3's test runs via `spawnSync('bash', …)`; reviewer should confirm `which bash` in the test env matches macOS launchd's bash version closely enough.

## Tests

All test changes land in **`tests/coord/coord-emit-wrapper-transport.test.ts`** (extended, not replaced). No new test files; no new harness; the existing in-process daemon fixture (`startMcpServer({port: 0})`) is reused; for case (iii), a second in-process `node:http` fixture is stood up per the AC3 description.

**Three new test cases, in this order:**

1. **Daemon rejects (JSON-RPC `isError:true`)** — invoke `coord-emit.sh tick_start --tick-run-id=<UUID>`. Assertions:
   - `r.status === 0`
   - `r.stderr.toString()` contains the literal `coord-emit.sh: daemon rejected tick_start`
   - `r.stderr.toString()` contains the literal `requires correlation_id` (verbatim relay of the daemon's error text — substring assertion, NOT full-message equality, so minor format drift in the daemon string doesn't break the test)
   - storage atom count for the round-tier `tick_start` event is zero

2. **Daemon unreachable (curl_rc != 0)** — invoke `coord-emit.sh tick_start --correlation-id=<UUID>` against a closed port resolved via the `pickClosedPort()` helper (bind-port-0-then-close pattern; see AC3 listing). Assertions:
   - `r.status === 0`
   - **`r.stderr.toString() === ''`** (fully empty stderr — r2 codex-ops F1 MED locked the contract; the wrapper redirects curl's own stderr to /dev/null per AC1, so neither wrapper emissions nor curl's `(7) Connection refused` lines reach the spawned process)
   - `r.stderr.toString()` does NOT match `/coord-emit\.sh: daemon rejected/` (kept as an explicit negative-assertion alongside `toBe('')` for regression-failure clarity)
   - storage atom count is zero

3. **Daemon returns HTTP 5xx (wrong-transport)** — stand up an in-process `node:http` server (NOT the MCP daemon) that returns `500 Internal Server Error` with body `{"error":"boom"}`. Invoke `coord-emit.sh tick_start --correlation-id=<UUID>` against it. Assertions:
   - `r.status === 0`
   - `r.stderr.toString()` starts with (or contains as a line) the literal `coord-emit.sh: daemon returned HTTP 500`
   - `r.stderr.toString()` does NOT match `/coord-emit\.sh: daemon rejected/`
   - storage (the unrelated MCP daemon, if one is up) is untouched (atom count zero)

**Test discipline / no-regression invariants enforced by the suite:**

- The existing happy-path test (`coord-emit.sh tick_start --correlation-id=<UUID>` against the in-process MCP daemon) MUST continue to assert silent stdout AND silent stderr from the wrapper — the new logic must not leak success-path stderr noise.
- All three new cases assert `r.status === 0`. Any future builder PR that adds a `--strict` flag or exit-non-zero branch fails AC2 (caller-prose-unchanged) AND fails these three assertions.
- The three stderr-shape assertions are deliberately tight: rejection / HTTP non-2xx cases match literal substrings on the wrapper's `coord-emit.sh:` prefix; the unreachable case asserts `r.stderr.toString() === ''` (fully empty — **curl's own stderr is suppressed by the wrapper via `2>/dev/null` per AC1**, not "intentionally allowed"). A future refactor that collapses the three branches into a generic message would fail at least two of these.

**Out of scope for AC3 tests:**

- End-to-end test of a launchd-driven tick observing the new stderr in `~/Library/Logs/echo-review-queue-<role>.log`. The in-process fixtures suffice; the AC2 invariant (no caller change) is the gate against drift in the logging path.
- Property-based / fuzzing tests on the daemon error string. The substring assertion is intentional — full-string equality would couple the wrapper test to the daemon's English copy.
- Bash unit tests for the parsing pipeline itself. The end-to-end stderr assertions through `spawnSync` exercise it; a separate shell-unit test layer is YAGNI.

## Definition of Done

- AC1: `tools/review-queue/coord-emit.sh` parses HTTP status + JSON-RPC `isError`; prints exactly one stderr line on rejection (containing both the event_type and the verbatim daemon error text, truncated to 500 chars per the parsing-constraint clause); prints exactly one stderr line on HTTP non-2xx (containing the status code + first 200 chars of body); is silent on `curl_rc != 0`; exits 0 in every branch.
- AC2: no caller file (skills, `_run_reviewer.sh`, etc.) modified by this commit. `git diff --stat` on the feature branch shows changes only in `tools/review-queue/coord-emit.sh` + `tests/coord/coord-emit-wrapper-transport.test.ts`.
- AC3: `tests/coord/coord-emit-wrapper-transport.test.ts` includes all three new cases (rejection, unreachable, HTTP non-2xx); `npm test` passes for the coord suite; the happy-path stderr-silent invariant is preserved.
- All ACs verified locally before pushing the feature branch (per the founder-memory rule on commit + push discipline).

## After Completion (Strategist Notes)

- **No new wiki page.** This is a maintenance / observability friction-fix on a shipped surface (the coord-emit wrapper landed in 057b). The cross-tool-protocol of the coord layer is already documented in `wiki/architecture/coord-layer.md` + child pages.
- **Optional one-line note** in `wiki/architecture/coord-active-trigger-and-role-emission.md` under the "Best-effort emission" subsection (if such a subsection exists post-promotion), recording that wrapper-side rejection is now operator-visible via stderr while the exit-0-unconditional contract is preserved. Land only if the wiki page already has a natural insertion point; don't restructure the page to make room.
- **Do NOT promote a new principle page** about silent-failure-class observability. One spec is not a pattern; if a *second* spec lands in the same class (e.g., a similar fix on `coord_invoke`'s HTTP body parsing, or on the watcher's post-push hooks), that's the trigger to write the principle. YAGNI.
- **Update `raw/internal/dogfooding/mcp-interactions-journal.md`** — when the spec lands in `complete/`, add a one-line back-reference to the original journal entry ("2026-05-16 16:14 PDT — founder-driven live test of coord layer") closing the loop. Keep it short; the journal is the surfacing channel, not the resolution log.
