---
id: 2026-05-17-059-coord-emit-surface-daemon-rejection
title: coord-emit.sh distinguishes daemon-rejection from daemon-unreachable (silent-failure observability gap)
status: ready
priority: MED
estimate: 0.25-0.5d
created: 2026-05-17
blocked_by: []
task_state_ref: 2026-05-17-059-coord-emit-surface-daemon-rejection
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - tools/review-queue/coord-emit.sh  # AC1 — capture HTTP body + status; on isError:true OR HTTP 4xx/5xx, print one stderr line distinguishing rejection from unreachable; still exit 0
  - tests/coord/coord-emit-wrapper-transport.test.ts  # AC3 — extend with two new cases: (i) daemon rejects (tier-key mismatch on tick_start) → wrapper exit 0 + stderr line includes "coord_emit rejected" + the daemon's error message; (ii) daemon unreachable (no server on the chosen port) → wrapper exit 0 + stderr line includes the existing "daemon-down" framing OR nothing extra (preserve current behavior)
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
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
review_notes: ""
agent_notes: ""
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
| Daemon unreachable | non-zero | n/a | n/a | stderr: `coord-emit.sh: daemon unreachable (curl rc=<rc>); event dropped` (or preserve current silent behavior; reviewer call) |

The exit code stays `0` in every case. Queue durability invariant unchanged.

## Architectural invariant

**`coord-emit.sh` exits 0 unconditionally**, regardless of the daemon's response or reachability. Operator visibility into the *reason* a coord atom did not land is improved via stderr lines that are **advisory only** — automation must continue to ignore exit status, and downstream tooling (launchd wrappers, skill prose) is unchanged.

## Acceptance Criteria

### AC1 — `tools/review-queue/coord-emit.sh` parses the daemon response and surfaces rejection on stderr

- **Modified file:** `tools/review-queue/coord-emit.sh`. Edit replaces the current trailing `curl … >/dev/null 2>&1 || true` block (lines ~97-104).
- **New behavior:**
  - Capture curl's stdout (the HTTP response body) and HTTP status code into shell variables. Use `--write-out '%{http_code}'` and a temp file (or `curl -w '\n%{http_code}'` and parse the trailing line) — whichever is more portable across the macOS launchd `bash 3.2.57` BSD/GNU split. Capture curl's own rc into a separate variable. **Keep** the existing `--connect-timeout 2 --max-time 5`. **Keep** the existing headers (`X-Echo-Role`, `Content-Type: application/json`, `Accept: application/json, text/event-stream`).
  - Branch:
    - `curl_rc != 0` → daemon-unreachable. Behavior choice (load-bearing — see Out of Scope #5): **stay silent** by default to preserve the existing quiet-on-daemon-down posture (a transient daemon-down during a healthy launchd tick is normal noise, not a signal). Reviewer can argue for an `ECHO_COORD_EMIT_VERBOSE=1` opt-in stderr line; spec leaves the env-flag question to AC1's reviewer disposition.
    - `curl_rc == 0` AND HTTP status in 2xx range AND body parses to `{ "result": {...}, "isError"?: false (or absent) }` → success path, no stderr.
    - `curl_rc == 0` AND HTTP status in 2xx range AND body parses to `{ "result": { "isError": true, "content": [{"type":"text","text":"…"}] } }` → **NEW** print exactly one line to stderr: `coord-emit.sh: daemon rejected <event_type>: <daemon error text>` where `<daemon error text>` is the verbatim string extracted from `result.content[0].text` (single-line; if multi-line, the wrapper joins on space — operators reading stderr in launchd logs want one line per emit).
    - `curl_rc == 0` AND HTTP status NOT in 2xx → **NEW** print exactly one line to stderr: `coord-emit.sh: daemon returned HTTP <status>: <first 200 chars of body, or "<empty>">`.
- **Parsing constraint:** the wrapper MUST NOT require `jq` or any non-default toolchain (macOS `bash 3.2.57` + BSD `sed` / `awk` / `grep` only; matching the wrapper's existing portability constraint that surfaced in 057b r7 — BSD `date` lacked `%N` and rendered literal `.3NZ`). A small `sed`/`grep` pipe extracting `"text":"…"` from a single-line JSON body is sufficient — the daemon's response is single-line, single-content-item per the validator's contract. Embedded quotes in the error message are unlikely but worth a single-pass `\"` unescape; reviewer may push back on tighter parsing.
- **Exit status unchanged:** the wrapper STILL exits 0 in every branch. The existing comment "ALWAYS exits 0 … Callers MUST NOT branch on this script's exit status" stays verbatim. The new stderr lines are advisory only.
- **Header comment update:** the existing "Exit semantics (r1 codex-ops F2 HIGH best-effort)" block (lines ~30-34) gets a new paragraph documenting the three-state stderr contract: success → silent, rejection → one stderr line with daemon error text, unreachable → silent (or opt-in verbose, per AC1 disposition). The exit-0-unconditional invariant is reinforced.

### AC2 — Skill prose unchanged

- **No edit** to `skills/review-queue-codex.md`, `skills/review-queue-claude.md`, `skills/review-queue-codex-ops.md`, `tools/review-queue/_run_reviewer.sh`, or any other caller. The wrapper's external contract (event_type + flag args, REVIEWER_NAME env, exit 0) is unchanged. This is the load-bearing test that the spec is purely additive on the wrapper's internal observability — if the reviewer finds a caller that needs to change, the spec should be re-examined for hidden coupling.
- **Why this AC exists:** prevents drift into "while we're touching the wrapper, let's also retrofit `tick_end(bind_failed)` emission shape" or similar. The fix is one file plus one test extension.

### AC3 — Two new test cases in `tests/coord/coord-emit-wrapper-transport.test.ts`

- **Extend the existing test file** (do NOT create a new test file). The harness already does `spawnSync('bash', ['tools/review-queue/coord-emit.sh', …])` against an ephemeral in-process daemon (`startMcpServer({port: 0})`) — both new cases reuse this fixture.
- **Test (i) — daemon rejects:** invoke `coord-emit.sh tick_start --tick-run-id=<UUID>` (DELIBERATELY wrong tier — `tick_start` is round-tier). Assert:
  - wrapper `r.status === 0`
  - `r.stderr.toString()` includes the literal substring `coord-emit.sh: daemon rejected tick_start`
  - `r.stderr.toString()` includes the literal substring `requires correlation_id` (the verbatim daemon error text, proving the wrapper relayed it without paraphrasing — guards against regressions where someone "helpfully" replaces the daemon message with a generic "emit failed")
  - storage contains zero atoms (the daemon truly rejected; no side effect)
- **Test (ii) — daemon unreachable:** invoke `coord-emit.sh tick_start --correlation-id=<UUID>` against a port with no listener (`ECHO_MCP_URL=http://127.0.0.1:1/mcp`, port 1 is reserved per RFC 6335 and never bound). Assert:
  - wrapper `r.status === 0`
  - `r.stderr.toString()` does NOT include `coord-emit.sh: daemon rejected` (this is the negative-assertion that splits the two states — operators reading launchd logs distinguish them)
  - whatever AC1 chose for daemon-down (silent vs opt-in verbose) is enforced consistently: if silent, `r.stderr` is empty *or* matches existing wrapper noise (the test should not over-constrain; an empty assertion or a tight whitelist of pre-existing stderr is acceptable — reviewer dispositions which).
- **No live-network test:** both cases use the in-process ephemeral daemon harness or the no-listener port-1 trick. No external host; no `curl https://…`; no test that depends on the launchd daemon being running on the dev machine.
- **`npm test` integration:** the new cases run as part of the existing `tests/coord/coord-emit-wrapper-transport.test.ts` vitest file. No new test command, no new CI step.

## Out of Scope (Don't Drift)

1. **Changing the wrapper's exit contract.** Exit 0 unconditionally is load-bearing (preserves queue durability when the daemon is down — r1 codex-ops F2 HIGH from 057b). No `--strict` flag, no `EXIT_ON_REJECT=1` env var, no exit-non-zero branch. If a builder is tempted to add one, stop and re-read the 057b review history.
2. **Touching skill prose or any caller.** Per AC2 — if a caller needs to change, the spec is wrong. The wrapper's external contract stays bit-exact.
3. **A retry on rejection.** Rejection is a deterministic schema/tier error; retrying produces the same rejection. No retry loop, no exponential backoff. (Retry on `curl_rc != 0` is also out of scope — the launchd polling path is the durability layer.)
4. **Structured logging / journald / a new log file.** The output is stderr, period. Launchd already captures wrapper stderr to `~/Library/Logs/echo-review-queue-<role>.log` via `_run_reviewer.sh`; that's the existing surface. No new log path, no JSON output, no `LOG_LEVEL` env var.
5. **Auto-correction of operator mistakes.** If the operator passes `--tick-run-id` on a round-tier event, the wrapper does NOT silently swap to `--correlation-id` or generate a UUID. The daemon's rejection IS the signal; the wrapper just surfaces it.
6. **A separate `coord-emit-strict.sh` companion.** YAGNI. One script, three branches.
7. **The `ECHO_COORD_EMIT_VERBOSE=1` opt-in env flag (if any).** This spec leaves the daemon-unreachable stderr posture to reviewer disposition during AC1 review. If reviewers prefer "always silent on daemon-down", AC1's unreachable branch stays silent; if reviewers prefer "always one line on daemon-down", AC1's unreachable branch always logs. An env-flag is a *third* alternative that requires a separate reviewer agreement — keep the spec narrow and resolve in AC1 review, not by adding a flag.
8. **Modifying the daemon-side validator.** The validator's rejection strings (`coord_emit: round-tier event 'tick_start' requires correlation_id (non-empty string)`, etc.) are the input the wrapper relays. If the strings need to change for readability, that's a separate spec on `src/coord/validate.ts`.
9. **Surfacing rejection to `coord_status`.** Out of scope. `coord_status` is a daemon-side operator surface for open deadlines + per-role-last-tick; surfacing per-emit rejection counters there is a meaningful design question, not a wrapper hotfix.
10. **Backporting to 057's archived parent spec.** 057 is in `complete/`; no edits there.

## Risks

- **R1 — parsing the daemon's JSON body in bash without jq fragiles in edge cases** (embedded quotes, multi-line content, future schema bumps). Mitigation: extract narrowly — `result.content[0].text` is a single string per the validator's contract, single-line in practice. The test asserts on a literal substring (`requires correlation_id`) rather than full message equality, so minor format drift in the daemon's error text doesn't break the test. If the body parsing turns into a thicket, reviewer may push back to "minimal — just print the whole body up to 200 chars on isError"; that's an acceptable fallback the AC1 disposition can choose.
- **R2 — operator alarm fatigue.** If reviewers' coord_emit calls start showing intermittent rejection lines in launchd logs (e.g., during 057a/057b post-merge transitions), operators may train themselves to ignore the new stderr. Mitigation: the wrapper has been running clean since 057b merged (r10 codex review confirmed AC7 emissions land correctly); rejection lines should be rare in the steady state, and a flurry IS the signal — the test discipline is "if it fires, read it; don't filter."
- **R3 — daemon-down stderr noise during launchd ticks.** If AC1 chooses "always one line on unreachable", every launchd tick during a daemon restart prints a stderr line into `~/Library/Logs/echo-review-queue-<role>.log`. That's potentially 100s of lines per restart × multiple roles. Mitigation: default to silent-on-unreachable (the existing posture), only break silence on rejection (the new signal). The reviewer disposes.
- **R4 — `bash 3.2.57` portability.** macOS launchd runs bash 3.2.57 from /bin/bash. Some `[[ … ]]` idioms differ. Mitigation: keep the parsing to `[ … ]` + `case` + `sed`/`grep` (the existing wrapper style); no Bash 4 features. AC3's test runs via `spawnSync('bash', …)`; reviewer should confirm `which bash` in the test env matches macOS launchd's bash version closely enough.

## Definition of Done

- AC1: `tools/review-queue/coord-emit.sh` parses HTTP status + JSON-RPC `isError`; prints one stderr line on rejection containing both the event_type and the verbatim daemon error text; exits 0 in every branch.
- AC2: no caller file (skills, `_run_reviewer.sh`, etc.) modified by this commit. `git diff --stat` on the feature branch shows changes only in `tools/review-queue/coord-emit.sh` + `tests/coord/coord-emit-wrapper-transport.test.ts`.
- AC3: `tests/coord/coord-emit-wrapper-transport.test.ts` includes both new cases; `npm test` passes for the coord suite.
- All ACs verified locally before pushing the feature branch (per the founder-memory rule on commit + push discipline).

## After Completion (Strategist Notes)

- **No new wiki page.** This is a maintenance / observability friction-fix on a shipped surface (the coord-emit wrapper landed in 057b). The cross-tool-protocol of the coord layer is already documented in `wiki/architecture/coord-layer.md` + child pages.
- **Optional one-line note** in `wiki/architecture/coord-active-trigger-and-role-emission.md` under the "Best-effort emission" subsection (if such a subsection exists post-promotion), recording that wrapper-side rejection is now operator-visible via stderr while the exit-0-unconditional contract is preserved. Land only if the wiki page already has a natural insertion point; don't restructure the page to make room.
- **Do NOT promote a new principle page** about silent-failure-class observability. One spec is not a pattern; if a *second* spec lands in the same class (e.g., a similar fix on `coord_invoke`'s HTTP body parsing, or on the watcher's post-push hooks), that's the trigger to write the principle. YAGNI.
- **Update `raw/internal/dogfooding/mcp-interactions-journal.md`** — when the spec lands in `complete/`, add a one-line back-reference to the original journal entry ("2026-05-16 16:14 PDT — founder-driven live test of coord layer") closing the loop. Keep it short; the journal is the surfacing channel, not the resolution log.
