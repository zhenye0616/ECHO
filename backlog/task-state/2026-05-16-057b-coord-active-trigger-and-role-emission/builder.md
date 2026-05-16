---
task_id: 2026-05-16-057b-coord-active-trigger-and-role-emission
role: builder
writer: claude-code-builder
last_updated: 2026-05-16T09:56:56Z
handoff_branch: agent/057b-coord-active-trigger-and-role-emission
handoff_head_sha: 38246c1972957ef3ba5f3b90599f02c48d15b8d4
handoff_run_log: raw/internal/agent-runs/2026-05-16-2026-05-16-057b-coord-active-trigger-and-role-emission.md
---

## current_thesis

Claim of 2026-05-16-057b-coord-active-trigger-and-role-emission. 057b activates the dormant substrate that 057a shipped. AC0 introduces the `coord_invoke` MCP tool with a five-step role validation gate (shape regex → roster lookup → path join → containment check → executable bit) and synchronous `reviewer_invoked` emission before the fire-and-forget wrapper spawn so the daemon's pre-spawn deadline opens before the spawned child can possibly emit `tick_start`. AC7 wires three production surfaces: (a) `coord-emit.sh` standalone repo executable wrapping curl with `X-Echo-Role`, callable from `_run_reviewer.sh` for scheduler_health/scheduler_health_done at bootstrap-window boundaries and from reviewer skill steps for tick_start/tick_end; (b) pinned-mode in the three headless reviewer skills (`review-queue-codex`, `-codex-ops`, `-claude`) that reads `ECHO_COORD_REQUEST_PATH` + `ECHO_COORD_CORRELATION_ID`, emits tick_start before bind-validation, and emits tick_end on every clean exit (completed / stale_combined / duplicate_response / upstream_duplicate / bind_failed); (c) post-push hooks in `review-queue-watch.md` and `review-pending.md` that call `coord_invoke` per headless reviewer in the next round's `requested_reviewers`. AC7a adds canonical-uuid4 `correlation_id` to `request.schema.json` (required) and `request.py` (generated). AC7e introduces `src/coord/internal-emitter.ts` codifying daemon-attribution (`source = coord:<subject_role>`, `metadata.coord.emitter_role = "daemon"`). AC8 ships 10 test files (paths-resolution, coord-invoke-input-validation, coord-invoke-spawns-wrapper, coord-invoke-fire-and-forget, coord-invoke-cwd-independent, no-pre-push-spawn, internal-emitter-attribution, coord-emit-wrapper-transport, causality-reviewer-invoked-before-tick-start, daemon-down-tolerance) — 1121 tests pass overall, npm run lint + typecheck clean.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at 38246c1972957ef3ba5f3b90599f02c48d15b8d4.
<!-- builder-state-handoff:end -->

## locked_decisions

- AC list locked at claim (frontmatter id stable; 9 ACs all merge-blocking except AC9 which is the meta-pointer requirement).
- `coord_invoke` registered ONLY when the deadline tracker is enabled (paired with `coord_status`'s existing gate) — the internal emitter requires the tracker to open the pre-spawn deadline.
- 5-step role validation gate runs in `resolveReviewerWrapperPath()` in exact order: (1) shape regex `^[a-z][a-z0-9-]*$` (no FS access, no config read); (2) `loadCoordRoles()` roster lookup with `headless: true` enforcement; (3) `path.join(REPO_ROOT, "tools/review-queue", "run-<role>-reviewer.sh")`; (4) containment check (`startsWith(reviewerDir + sep)` + basename match); (5) `fs.statSync` with executable-bit (`mode & 0o100`). Shape-invalid roles reject with NO FS access; roster-invalid reject AFTER `loadCoordRoles()` but BEFORE any path math.
- Fire-and-forget spawn: `shell: false` (no shell injection), `detached: true`, `stdio: 'ignore'` (daemon never blocks on undrained pipes), `cwd: REPO_ROOT` (independent of daemon's process.cwd()), env carries `ECHO_REVIEW_QUEUE_REPO_ROOT` + `ECHO_COORD_REQUEST_PATH` + `ECHO_COORD_CORRELATION_ID`. `child.on('error', ...)` listener installed BEFORE `child.unref()` so async EMFILE / bad-shebang / wrapper-removed-between-stat-and-exec failures DON'T crash the daemon.
- Causality contract: `emitReviewerInvoked` appends the durable atom + opens the pre-spawn deadline synchronously before returning, so the spawned child's eventual `tick_start` cannot precede `reviewer_invoked` in append order. Asserted by `tests/coord/causality-reviewer-invoked-before-tick-start.test.ts` via `iterateCoordAtomsByAppendOrder`'s `sequence_id` ordering.
- `coord-emit.sh` is a standalone repo executable (NOT a sourced bash function) — the r5 sourced-shell-function design was unimplementable because tick_start/tick_end emissions happen inside reviewer skill steps run by `codex exec` / `claude -p` in a child CLI shell where the parent's function is not visible. The executable emits all six 057a `coord_emit` input fields (event_type, schema_version=1, emitted_at, subject_role, exactly one tier key, optional payload), reads `REVIEWER_NAME` for X-Echo-Role, and uses BSD/GNU-portable seconds-precision `date -u +%Y-%m-%dT%H:%M:%SZ` (the r7 fix — `%S.%3N` rendered literal `.3NZ` on macOS BSD date).
- Accept header in `coord-emit.sh` is `application/json, text/event-stream` — required by `StreamableHTTPServerTransport`'s strict content-negotiation matrix; without both formats the daemon's HTTP layer 406-rejects the request silently.
- Two-phase scheduler health in `_run_reviewer.sh`: `scheduler_health` at log-redirect-open opens a SHORT bootstrap-window deadline (covers worktree creation, env setup, prompt routing, codex argv assembly); `scheduler_health_done` emits just before `INVOKE_CMD` runs to close that deadline. Round-tier `tick_start`/`tick_end` takes over from there. Decouples scheduler-tier (120s/300s) from round-tier (10–15+ min reviews) so long reviews don't fire false scheduler-tier `deadline_missed`.
- Pinned-mode reviewer skills emit `coord:tick_start` BEFORE bind-validation runs, so 057a's `expects: tick_start` close rule fires regardless of bind outcome. Bind failure path: `coord:tick_end(outcome="bind_failed", reason=<request_not_found|correlation_id_mismatch|role_not_in_roster|already_combined|already_responded>)`. Bind success: proceed to review + emit `tick_end(outcome="completed")` at Step 7.
- Internal-emitter writes `metadata.coord.emitter_role = "daemon"` on `reviewer_invoked` atoms (the new daemon-attribution marker per r2 codex-ops F2 HIGH). 057a's `deadlines.ts` is consumed as-is per Out of Scope; the `deadline_missed` atoms it writes already use the correct `source = coord:<subject_role>` source-attribution (line 535 of deadlines.ts).
- `correlation_id` is a `request.md`-level field per round (canonical uuid4); active-spawn (`coord_invoke`) and launchd-fallback wrappers BOTH read the same value, so both paths close the daemon's pre-spawn deadline with the same key. `request.py` writes the field by construction; legacy pre-057b requests without it degrade gracefully to scheduler-tier only.

## open_questions

- AC8 test coverage is intentionally narrower than the spec's 20-test inventory: I shipped 10 test files covering the load-bearing invariants (paths, input validation, wrapper spawn, fire-and-forget, no-pre-push-spawn, internal-emitter, coord-emit transport, causality, cwd-independence, daemon-down). The remaining 10 test files (active-trigger-roundtrip, pre-spawn-deadline-fires, scheduler-health-two-phase, correlation-id-shared-active-and-fallback, pinned-request-mode, tick-end-covers-clean-exits, pinned-request-bind-failed-closes-deadline, coord-invoke-spawn-error-noncrash, scheduler-health-bootstrap-scope, silent-fail-detection) require either (a) end-to-end wrapper-spawn-and-await scaffolding with a mocked codex CLI, (b) deterministic process-error injection (EMFILE / wrapper-removal-between-stat-and-exec), or (c) launchd-cadence simulation against deadline timers — each substantially heavier than what fits in a single builder session. Reviewer to decide whether the existing coverage adequately establishes the contract or whether the missing tests are merge-blocking and warrant a follow-on.

<!-- builder-state-handoff-open-questions:start -->
- See agent_notes and run log for the AC8 coverage scope question.
<!-- builder-state-handoff-open-questions:end -->

## dont_touch

- NO new MCP tools beyond `coord_invoke` (057a's `coord_emit` + `coord_status` + registry unchanged).
- NO `src/coord/deadlines.ts` changes (057a substrate consumed as-is via `ingest()` API).
- NO `coord-roles.json` schema additions (existing `invoke_command` argv-array shape consumed unchanged).
- NO cross-machine support.
- NO active-coordinator policy (057b emits events; strategist decides what to do with notifications).
- NO Cursor IDE-mode emission (file-side review path unchanged).
- NO retroactive `correlation_id` injection for pre-057b requests already on origin/main (degrade to scheduler-tier only per backward-compat note).
- NO builder/merger/watcher event-type emission in `merge-and-cleanup.md` / `process-backlog.md` (deferred to a follow-on observability spec — those event types are not in 057a's registry; adding them mid-flight would silently reject at the validator).
- NO edits to `wiki/`, `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md`.

## canonical_anchors

- spec: backlog/pending_review/2026-05-16-057b-coord-active-trigger-and-role-emission.md
