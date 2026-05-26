---
item_id: 2026-05-25-074-echo-cli-binary
round: 4
combined_at: '2026-05-26T06:42:55Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

Both reviewers `proceed_after_patches` — no boundary cross, no escalation, NO HIGH findings. 5 MED findings; one convergent pair (case-5 contradiction) + three single-reviewer cleanup. 058 discipline check: no findings target r3 patches via "remove mechanism" shape — all are precise corrections (sub-detail wording, missing seam, deterministic timing).

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| C1 | MEDIUM | codex F1 + codex-ops F2 | 074:645 (AC7.3 case 5) | accepted — patched | AC7.3 case 5 ("marker symlink → exit 0") contradicts AC4.1 step 4 (`cleanupConflicts.length > 0` → exit 1) AND AC7.3 case 12 (same symlink shape → exit 1). The case 5 wording was not updated when the r2 patch introduced cleanup-conflict-driven exit code derivation. Patch: rewrite case 5 to assert exit 1 + `cleanupConflicts` entry naming the symlinked marker file + ECHO block NOT touched (per-agent isolation preserved); the symlink-conflict path then matches case 12 exactly. Case 5's load-bearing assertion moves from "exit 0 nonfatal" to "exit 1 + cleanup conflict observable to automation." |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 4 | MEDIUM | codex-ops F1 (r4-O1) | 074:548-571 (AC5.4 step 8 try/finally) + 669-671 (AC7.4 case 12b) | accepted — patched | The current AC5.4 step 8 shape — `process.on('SIGINT', onSigInt); ... try { dispatch } finally { process.off(...) }` followed by step 10 exit-code derivation — unregisters the handlers BEFORE the exit derivation runs. If SIGTERM arrives between `dispatchWorkflow` resolving and step 10 reading `receivedSignal.current`, the handler is already removed → `receivedSignal.current` stays `null` → step 10 exits 0 instead of 143. Case 12b is the EXACT window that's supposed to catch this, but the spec leaves it ambiguous whether the handler outlives derivation. Patch: AC5.4 step 8 wraps the WHOLE flow (dispatch + render + exit derivation) in the try/finally; `process.off(...)` runs ONLY after `exitCode` has been computed. Equivalent sketch: `try { const outcomes = await dispatchWorkflow(...); render(outcomes); return computeExitCode(outcomes, receivedSignal); } finally { process.off(SIGINT, onSigInt); process.off(SIGTERM, onSigTerm); }`. Case 12b's timing description is updated to require the deterministic seam (r4-K3 below). |
| 2 | MEDIUM | codex F2 (r4-K2) | 074:109 (J8) + 524-547 (AC5.4 runRun signature) + 656-667 (AC7.4 case 9) | accepted — patched | J8 says `--project` resolution falls back to `default_project` from `projects.json`, but `runRun`'s public seams only expose `stateOnboardingPath` (reading `onboarding.json`); `stateProjectsPath` is missing, and AC7.4 case 9 only exercises the explicit `--project` branch — there's no test for the J8 fallback path. A builder following the spec literally would have NO `projects.json` read in `runRun`, breaking J8 silently. Patch: (a) add `stateProjectsPath?: string` to `runRun` opts (default `ECHO_HOME_PATHS.stateProjects`); (b) AC5.4 step 1 (project root resolution) explicitly reads `projects.json` via 070's `validateProjectsState` when both `--project` AND cwd-git-root fall through, and uses `default_project` if set; (c) NEW AC7.4 case 15 — git-rootless cwd + no `--project` flag + `projects.json` with `default_project: '/fixture/repo'` → fake spawn receives `cwd: '/fixture/repo'`. The case 9 (explicit `--project`) and case 15 (fallback) together cover the J8 spec. |
| 3 | MEDIUM | codex F3 (r4-K3) | 074:670-671 (AC7.4 cases 12a/12b non-deterministic timing) | accepted — patched | The r3-added cases 12a/12b describe timing semantically ("SIGTERM arrives between step 1 and step 2") but provide no deterministic SEAM that guarantees the signal lands in the gap. A bare `setImmediate(() => process.emit('SIGTERM'))` from step 1's completion runs in the same microtask queue as the next-step spawn — the loop can spawn step 2 before the SIGTERM is observed, turning case 12a into another mid-step test. Patch: add a `signalGate` test seam to the fake-spawn `DispatchOpts` (existing test-seam pattern). The fake-spawn's completion handler awaits `signalGate.beforeNextSpawn()` before resolving step N's outcome; the test injects the SIGTERM, then resolves the gate so the loop sees an aborted controller BEFORE step N+1's spawn(). For case 12b (post-final-step gap), the seam is `signalGate.beforeExitDerivation()`: `runRun` awaits this gate AFTER `dispatchWorkflow` resolves and BEFORE step 10's exit derivation; in production the gate is `Promise.resolve()` (no-op); in tests it's the SIGTERM-injection point. **The signalGate is a test-only seam (gated behind the `spawn` test seam already in opts) — no production code path uses it.** AC7.4 cases 12a/12b updated to specify the gate names + the assertion sequence. |
| 5 | MEDIUM | codex-ops F2 (r4-O2) | 074:326-332 (AC4.1 step 4) + 645-654 (AC7.3 case 5) | accepted — patched (same fix as C1) | Same root cause as codex F1 (C1) but pointing at AC4.1's exit-code text as the contradicted contract. The C1 patch satisfies this finding — case 5 is updated to exit 1 + cleanupConflicts entry, matching AC4.1 step 4's contract. Listed separately here because the reviewers cited different "where" lines but the fix is one change to case 5. |

## Convergence call

**needs r5 — focus_hints:** Verify (1) AC5.4's outer try/finally now wraps the FULL dispatch+render+exit-derivation block; `process.off` fires ONLY after the return value is computed; the SIGTERM in the post-final-step gap is observable by `receivedSignal.current` at exit-derivation time. (2) NEW AC5.4 `stateProjectsPath` seam + step 1 `projects.json` read for the J8 default-project fallback; NEW AC7.4 case 15 exercises the fallback path with assertion that fake spawn receives the `default_project` value as `cwd`. (3) NEW `signalGate` test seam in `DispatchOpts` makes AC7.4 cases 12a/12b deterministic; the gate is test-only (production no-op); the spec is explicit about the seam being in `opts` not `process`. (4) AC7.3 case 5 now asserts exit 1 + `cleanupConflicts` entry — matches AC4.1 step 4 contract; no test still claims exit 0 on a conflict. (5) Per 058 discipline: did the r4 patches introduce any new mechanism worth flagging? In particular: the `signalGate` test seam (r4-K3) is a NEW abstraction; if r5 surfaces bugs in `signalGate` semantics specifically, consider whether the seam itself should be replaced with a simpler `signal.aborted` polling check inside the fake spawn.

**Convergence call:** Decay shape is clean (r1: 2H/3M → r2: 4H/4M → r3: 1H/4M → r4: 0H/5M). r5 should be at or near `proceed` — if it is, this item is claim-ready.
