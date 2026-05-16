---
status: shipped
title: "Coord active trigger + role emission (057b)"
topic: Architecture
subtopic: Coordination Layer
aliases:
  - 057b
  - Coord Active Trigger
  - coord_invoke
  - Role emission
  - Producer-side coord
---

# Coord Active Trigger + Role Emission (057b)

The **producer-side** half of the [[coord-layer]]: the `coord_invoke` MCP write tool (with its five-step path-resolver gate and causality-safe `reviewer_invoked` emission), the pinned-request mode and `bind_failed` outcome, the two-phase wrapper emission via `coord-emit.sh`, the strategist post-push hooks that drive active reviewer spawn, and the daemon-side `internal-emitter` attribution model. Activates the substrate documented at [[coord-substrate-and-observability]]; called by post-push hooks in [[review-queue-protocol]].

057b activates the 057a substrate for the **reviewer** role only. Builder, merger, and watcher lifecycle event types are deferred to a follow-on spec (their registry entries don't yet exist in `coord-roles.json` and `coord_emit` would reject them at runtime).

## `coord_invoke` — strategist-spawned reviewers

`src/mcp/tools/coord-invoke.ts` is the only new MCP tool 057b adds. Signature: `coord_invoke(role, request_path, correlation_id)`. The daemon validates inputs through a five-step gate in `src/coord/paths.ts`:

1. **Shape check** — `role` matches `^[a-z][a-z0-9-]*$` (rejected before any FS access).
2. **Roster check** — `role` is present in `loadCoordRoles()` AND its entry has `headless: true` (IDE-mode roles like `cursor` are rejected post-load, pre-FS).
3. **Path construction** — `path.join(REPO_ROOT, "tools/review-queue", "run-${role}-reviewer.sh")`.
4. **Containment check** — resolved path stays under `${REPO_ROOT}/tools/review-queue/` with exact basename.
5. **Existence + executable bit** — `fs.statSync` confirms regular file with exec mode.

`REPO_ROOT` is computed once at module load via `import.meta.url` (honoring an `ECHO_REPO_ROOT` env override for tests and bundled-daemon deploys), so the daemon's `process.cwd()` is irrelevant. `correlation_id` and `request_path` are validated against canonical regexes (uuid4 + `^backlog/reviews/[a-z0-9-]+/r[0-9]+/request\.md$`).

On a valid call the daemon spawns the wrapper fire-and-forget (`shell: false`, `detached: true`, `stdio: 'ignore'`, `unref()`, `cwd: REPO_ROOT`, env pinned with `ECHO_REVIEW_QUEUE_REPO_ROOT` + `ECHO_COORD_REQUEST_PATH` + `ECHO_COORD_CORRELATION_ID`), with a mandatory `child.on('error', ...)` listener BEFORE `unref()` to catch async spawn failures (EMFILE, missing wrapper, bad shebang) without crashing the daemon — the pre-spawn `reviewer_invoked` atom stays in the ledger and the deadline tracker fires `deadline_missed` as the correct operator signal.

## Causality-safe emission ordering

`coord_invoke` appends `coord:reviewer_invoked` SYNCHRONOUSLY before returning. The spawn happens after the atom is durable, so any `tick_start` the child emits strictly post-dates `reviewer_invoked` in replay order. This is the load-bearing invariant the launchd-fallback path must also honor: same correlation_id, same close rule.

## Pinned-request mode (active-spawn path)

When the wrapper sees `$ECHO_COORD_REQUEST_PATH` set, the reviewer skill reads exactly that request (no scan-pick), emits `coord:tick_start(correlation_id=$ECHO_COORD_CORRELATION_ID)` BEFORE bind-validation (so 057a's tracker closes the pre-spawn deadline regardless of validation outcome), and on bind failure emits `coord:tick_end(outcome="bind_failed", reason=...)` with reason in `{request_not_found, correlation_id_mismatch, role_not_in_roster, already_combined, already_responded}`. The `bind_failed` outcome is added to the `tick_end.outcome` enum alongside `completed` / `stale_combined` / `duplicate_response` / `upstream_duplicate`. Scan-pick remains the launchd-fallback path when the env vars are unset.

## Two-phase wrapper emission via `coord-emit.sh`

`tools/review-queue/coord-emit.sh` is the standalone helper that wraps the curl POST with the full 057a `coord_emit` input contract (`event_type` + `schema_version=1` + portable BSD/GNU `emitted_at` + `subject_role` + tier key + optional payload). It's callable identically from `_run_reviewer.sh` (Phase 1) AND from inside reviewer skill steps run by `codex exec` / `claude -p` (Phase 2) — the earlier sourced-bash-function design was unimplementable because the parent's shell function isn't visible in the child CLI shell.

- **Phase 1 — bootstrap-scoped scheduler health.** At log-redirect-open in `_run_reviewer.sh`: `coord-emit.sh scheduler_health --tick-run-id=$TICK_RUN_ID`. After worktree/env/prompt-routing bootstrap completes, BEFORE review work starts: `coord-emit.sh scheduler_health_done --tick-run-id=$TICK_RUN_ID`. This decouples scheduler-tier (sub-120s bootstrap) from round-tier (5–15+ min review work) so long reviews can't fire false `scheduler_health` deadline_missed.
- **Phase 2 — round-scoped tick events.** Inside the reviewer skill: `coord-emit.sh tick_start --correlation-id=...`, run review, `coord-emit.sh tick_end --correlation-id=... --payload='{"outcome":"completed"}'` (or `stale_combined` / `duplicate_response` / `upstream_duplicate` / `bind_failed`).

All curl calls use `--connect-timeout 2 --max-time 5 ... || true` — daemon-down preserves queue durability and only degrades observability.

## Skill-side post-push hooks

`coord_invoke` is called from exactly two skill sites in 057b:

- **`skills/review-queue-watch.md` Step 3 (b)** after `push-with-retry.sh` succeeds on the next round's request — one call per headless reviewer in `requested_reviewers`.
- **`skills/review-pending.md`** after sidecar push — one call per headless reviewer in the next round.

`request.py` is NEVER a `coord_invoke` caller; its only coord-related responsibility is generating + writing the canonical uuid4 `correlation_id` into `request.md` frontmatter. Both active-spawn and launchd-fallback wrapper paths read the same correlation_id, so whichever runs first closes the daemon's pre-spawn deadline correctly.

## Daemon-side `internal-emitter`

`src/coord/internal-emitter.ts` is the daemon's own emit path for `reviewer_invoked` (from `coord_invoke`) and `deadline_missed` (from 057a's tracker). It bypasses the wrapper-required `X-Echo-Role` header check (the daemon IS the authenticated emitter) but still writes a `subject_role` field distinct from `emitter_role: "daemon"`, so per-role `coord_status()` aggregation stays correct and the atom's `source` is `coord:<subject_role>` (not `coord:daemon`).

## Related

- [[coord-layer]] — parent overview, four locked design decisions, decomposition rationale, shared contract
- [[coord-substrate-and-observability]] — sibling 057a; the dormant substrate this page activates
- [[review-queue-protocol]] — operating-model protocol whose post-push hooks call `coord_invoke`
