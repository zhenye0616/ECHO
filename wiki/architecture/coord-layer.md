---
status: shipped
topic: Architecture
subtopic: Coordination Layer
aliases:
  - Coord layer
  - Coordination layer
  - Role-to-role coordination
  - Coord events
---

# Coord Layer (V1)

The **coord layer** is ECHO's role-to-role coordination substrate: a thin reactive notifier that lets every role (strategist, watcher, reviewer, builder, dispatcher, merger, founder) emit and subscribe to typed `coord:*` events through the existing ECHO daemon. It gives the strategist and operator out-of-band visibility into multi-agent health without adding external infrastructure (no Redis, no NATS, no Kafka). Specced as item [[2026-05-15-057-coord-layer-narrow-append-and-deadlines|057]]; decomposed and shipped as [[coord-substrate-and-observability|057a]] (substrate + observability) and [[coord-active-trigger-and-role-emission|057b]] (active trigger + role emission).

## Why the layer exists

**The motivating incident — 2026-05-15 ~22:50 PDT silent launchd fail.** The founder ran `launchctl kickstart -k` against both codex reviewer launchd jobs after dispatching r1 of items 055 + 056. `kickstart` returned rc=0 but the wrappers' `~/Library/Logs/echo-review-queue-codex.log` showed no new tick-start entry — the pre-redirect failure path (`_followups.md` HIGH #1) fired silently. The founder had to manually invoke `bash tools/review-queue/run-codex-reviewer.sh` to recover. **The strategist had no out-of-band visibility into reviewer health** — only the file-side outcome (atoms appearing on `origin/main` or not). 10-25 min round-trip per round + zero liveness signal.

This is a recurring failure class: the launchd-polled reviewer model has two compounding failure modes — 0-10 min latency per hop even on the happy path, and silent kickstart failures that swallow themselves before the log redirect. A reactive notifier that emits `tick_start` / `tick_end` / `deadline_missed` events into the existing ledger lets the strategist (and any other role) subscribe via long-poll and see the failure within seconds rather than waiting for `combine.py`'s 30-minute `FALLBACK_TIMEOUT_HOURS` to fire a spurious `no_responses`.

**The deferred brainstorm fired now.** `raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md` had deferred the general multi-agent coordination layer pending (a) item [[2026-05-09-030-mcp-toolkit-reshape-and-group-session|030]] ship and (b) founder-out-of-loop. Both preconditions held by 2026-05-15. The trigger condition originally written down (#2 in that note: "race spreads beyond the journal to another shared file, silently") didn't fire as predicted — but the launchd silent-fail is the **same class of failure** (silent-loss-of-coordination-signal), and 030's [[group-session|group-session]] primitive is the substrate that makes the coord layer shippable without external infrastructure.

## Four locked design decisions

Five rounds of one-question-at-a-time brainstorming with the founder, validated against a codex strategist read-only consult, produced four load-bearing decisions:

1. **Scope:** generic role↔role coordination for every role (strategist, watcher, reviewer, builder, dispatcher, merger, founder). Not reviewer-only, not strategist-only.
2. **Responsibility:** reactive notifier (observe + push, no built-in policy). The strategist (or any subscriber role) still decides what to do with notifications; the layer just makes events visible and deliverable. Auto-restart, auto-escalate, auto-release-stale-claim were all explicitly rejected.
3. **Location:** the existing ECHO daemon (loopback `127.0.0.1:38478`), reusing 030's group-session primitive. Coord events are atoms with `source = coord:<role>`; subscribers use the existing [[mcp-wait-for-new-turns|`wait_for_new_turns`]] long-poll widened with a `source_prefix` parameter.
4. **Boundary:** local-machine only for V1. Cross-machine coordination is deferred to V2+ via a git-committed event log fallback. Redis / Kafka / NATS were all rejected as conflicts with the bundle commitment, the [[compose-not-capture|`compose-not-capture` principle]], and the scale mismatch (one developer's daily work does not justify a distributed event bus).

## The codex strategist consult that reshaped the spec

The strategist's v1 design treated "atom-shaped" as sufficient. A codex strategist read-only consult at the v1-design boundary surfaced five findings the strategist had missed, all of which became load-bearing acceptance criteria:

| Codex Q | Finding | Resolved by |
|---|---|---|
| Q1 (HIGH) | Emission seam doesn't exist; the [[capture-gate]] rejects unknown source schemes | AC1 — narrow `coord_emit` MCP tool with separate validation registry; non-pollution invariants |
| Q2 (MED) | Deadline tracker needs role-typed config, not hardcoded thresholds | AC2 — `coord-roles.json` sibling of `reviewers.json` with per-role-per-event-type `default_deadline_sec` / `max_deadline_sec` |
| Q3 (HIGH) | In-memory tracker isn't durable across daemon restarts | AC3 — boot-time reconstruction by replaying recent `coord:*` atoms |
| Q4 (MED) | "Second builder gets a push notification about race" is wishful thinking | AC4 — reframe to mailbox semantics; widen `wait_for_new_turns` with `source_prefix` |
| Q5 (HIGH) | Identity / schema versioning absent; caller-supplied `source` is spoofable | AC5 — caller-identity → role mapping; daemon derives `source = coord:<server-derived-role>`; schema-version registry |

The cross-tool pattern observation: 057 is the canonical example of the [[cross-tool-spec-review|cross-tool brainstorm + strategist consult]] cycle. Not just the cross-tool-reviewer pattern — the **cross-tool-strategist** pattern. A read-only consult during design (not after merge) caught five HIGH/MED findings that would have shipped a spoofable, non-durable layer with a phantom mailbox contract.

## The decomposition (2026-05-16)

057 hit the [[review-queue-protocol|049 fail-to-converge plateau]] at r5 — decay went `r1=9 → r2=5 → r3=4 → r4=5 → r5=5`, the asymptote signal that a spec is too large for the converge-or-give-up window. Rather than push for a sixth round, the strategist invoked the decomposition pattern and split 057 into two child specs:

- **[[coord-substrate-and-observability|057a — Coord substrate + observability]]** (AC1 + AC2 + AC3 + AC5 + AC6 + the AC4 widening, plus the read-only AC8 fixtures): the narrow `coord_emit` append seam, role-typed deadline config, in-memory tracker + boot reconstruction, identity model with schema versioning, `coord_status()` operator surface, and `wait_for_new_turns(source_prefix="coord:")`. **Independently shippable** — adds a visibility-only layer with zero behavior change to existing roles.
- **[[coord-active-trigger-and-role-emission|057b — Coord active trigger + role emission]]** (AC0 + AC7 + the active-trigger AC8 fixtures): the `coord_invoke` MCP write tool that spawns reviewer wrappers in-process (parallel to launchd polling), the round-correlation-id contract written into `request.md`, and the AC7 emission integrations across `_run_reviewer.sh`, `skills/process-backlog.md`, `skills/review-queue-watch.md`, `skills/merge-and-cleanup.md`. **Depends on 057a** (needs the substrate to emit into).

Each child spec absorbed its r1-r5 findings from the 057 review history; the original 057 archive at `backlog/complete/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md` plus the 21+ findings under `backlog/reviews/2026-05-15-057-coord-layer-narrow-append-and-deadlines/` is the authoritative record of the design space the children inherit.

## The contract this parent spec defines

The two child specs implement against a single shared contract — listed here so it survives in one place even when 057a/057b drift apart:

- **Source family.** All coord events carry `source = coord:<role>` where `<role>` matches a `name` entry in `tools/review-queue/coord-roles.json` (same slugs as `reviewers.json:name`). The daemon derives `source` server-side from caller identity; caller-supplied `source` is ignored.
- **Event types.** A versioned registry in `src/coord/types.ts` declares each `event_type` with its tier (round vs scheduler), `schema_version`, and (where applicable) the next event it `expects`. V1 events: `reviewer_invoked`, `tick_start`, `tick_end`, `deadline_missed`, `scheduler_health`, `scheduler_health_done`, `item_claimed`, `item_pushed`, `round_combined`, `merge_start`, `merge_complete`. Unknown event types and unknown schema versions are rejected on write and ignored on read (forward-compat).
- **Two tiers.** Round-tier events key on `correlation_id` (uuid4 generated by `request.py` at request-write time and written into `request.md` frontmatter). Scheduler-tier events key on `tick_run_id` (uuid4 generated by the wrapper at process-start). The two keyspaces never collide.
- **Mailbox semantics — not push to stateless.** Every coord event is appended to the durable ledger; live long-poll is the latency optimization for connected subscribers; exited roles learn on next invocation via the durable log. There is no subscriber registry, no participant directory, no presence detection. A second builder that has already exited cannot be pinged about a race in real time — that's a V2+ ask.
- **Non-pollution.** Coord atoms bypass normalization, embedding, and trace clustering. `search_memories()` (no filter) does NOT return coord atoms. `search_memories(source_prefix="coord:")` returns them for forensic retrieval. `wait_for_new_turns(source_prefix="coord:")` returns them for live subscription. The three-way contract is load-bearing — implemented as a dedicated filter at the `search-memories.ts` level, not in a shared `withFsExclusion` helper that would also filter `wait_for_new_turns`.
- **Single-writer.** All coord writes go through the existing [[storage|`src/storage/sqlite.ts`]] write path (the same path capture events use). No parallel SQLite handle, no concurrent writer race.
- **Best-effort emission.** `coord_emit` and `coord_invoke` failures are non-fatal to the underlying queue operation. Short bounded timeouts (2s connect, 5s total); `set -euo pipefail` wrappers wrap curl calls in `|| true`. When the daemon is down or stalled, the queue's existing durability stays intact and the launchd polling path is the fallback heartbeat.

## What the layer does NOT do (out of scope for V1)

- **No cross-machine coordination.** V1 is local-loopback only.
- **No active-coordinator policy.** The layer observes and delivers; the strategist (or any subscriber role) decides what to do.
- **No replacement of launchd polling.** Coord is the latency-optimized happy path; launchd is the durability-guaranteed slow path. Both coexist.
- **No new write surface for capture events.** The capture pipeline at [[capture-gate|`src/capture/gate.ts`]] is unchanged; coord writes are SEPARATE and validate against a closed event-type registry.
- **No Cursor IDE-mode emission in V1.** The existing MCP server does not expose request headers to tool handlers, so a native-MCP client like Cursor's Claude has no canonical path to supply `X-Echo-Role`. V1 emission is scoped to wrapper paths (curl-style HTTP); Cursor coord emission is deferred to V1.5+.

## Producer-side implementation (057b — reviewer activation)

057b activates the 057a substrate for the reviewer role only. Builder, merger, and watcher lifecycle event types are deferred to a follow-on spec (their registry entries don't yet exist in `coord-roles.json` and `coord_emit` would reject them at runtime).

### `coord_invoke` — strategist-spawned reviewers

`src/mcp/tools/coord-invoke.ts` is the only new MCP tool 057b adds. Signature: `coord_invoke(role, request_path, correlation_id)`. The daemon validates inputs through a five-step gate in `src/coord/paths.ts`:

1. **Shape check** — `role` matches `^[a-z][a-z0-9-]*$` (rejected before any FS access).
2. **Roster check** — `role` is present in `loadCoordRoles()` AND its entry has `headless: true` (IDE-mode roles like `cursor` are rejected post-load, pre-FS).
3. **Path construction** — `path.join(REPO_ROOT, "tools/review-queue", "run-${role}-reviewer.sh")`.
4. **Containment check** — resolved path stays under `${REPO_ROOT}/tools/review-queue/` with exact basename.
5. **Existence + executable bit** — `fs.statSync` confirms regular file with exec mode.

`REPO_ROOT` is computed once at module load via `import.meta.url` (honoring an `ECHO_REPO_ROOT` env override for tests and bundled-daemon deploys), so the daemon's `process.cwd()` is irrelevant. `correlation_id` and `request_path` are validated against canonical regexes (uuid4 + `^backlog/reviews/[a-z0-9-]+/r[0-9]+/request\.md$`).

On a valid call the daemon spawns the wrapper fire-and-forget (`shell: false`, `detached: true`, `stdio: 'ignore'`, `unref()`, `cwd: REPO_ROOT`, env pinned with `ECHO_REVIEW_QUEUE_REPO_ROOT` + `ECHO_COORD_REQUEST_PATH` + `ECHO_COORD_CORRELATION_ID`), with a mandatory `child.on('error', ...)` listener BEFORE `unref()` to catch async spawn failures (EMFILE, missing wrapper, bad shebang) without crashing the daemon — the pre-spawn `reviewer_invoked` atom stays in the ledger and the deadline tracker fires `deadline_missed` as the correct operator signal.

### Causality-safe emission ordering

`coord_invoke` appends `coord:reviewer_invoked` SYNCHRONOUSLY before returning. The spawn happens after the atom is durable, so any `tick_start` the child emits strictly post-dates `reviewer_invoked` in replay order. This is the load-bearing invariant the launchd-fallback path must also honor: same correlation_id, same close rule.

### Pinned-request mode (active-spawn path)

When the wrapper sees `$ECHO_COORD_REQUEST_PATH` set, the reviewer skill reads exactly that request (no scan-pick), emits `coord:tick_start(correlation_id=$ECHO_COORD_CORRELATION_ID)` BEFORE bind-validation (so 057a's tracker closes the pre-spawn deadline regardless of validation outcome), and on bind failure emits `coord:tick_end(outcome="bind_failed", reason=...)` with reason in `{request_not_found, correlation_id_mismatch, role_not_in_roster, already_combined, already_responded}`. The `bind_failed` outcome is added to the `tick_end.outcome` enum alongside `completed` / `stale_combined` / `duplicate_response` / `upstream_duplicate`. Scan-pick remains the launchd-fallback path when the env vars are unset.

### Two-phase wrapper emission via `coord-emit.sh`

`tools/review-queue/coord-emit.sh` is the standalone helper that wraps the curl POST with the full 057a `coord_emit` input contract (`event_type` + `schema_version=1` + portable BSD/GNU `emitted_at` + `subject_role` + tier key + optional payload). It's callable identically from `_run_reviewer.sh` (Phase 1) AND from inside reviewer skill steps run by `codex exec` / `claude -p` (Phase 2) — the earlier sourced-bash-function design was unimplementable because the parent's shell function isn't visible in the child CLI shell.

- **Phase 1 — bootstrap-scoped scheduler health.** At log-redirect-open in `_run_reviewer.sh`: `coord-emit.sh scheduler_health --tick-run-id=$TICK_RUN_ID`. After worktree/env/prompt-routing bootstrap completes, BEFORE review work starts: `coord-emit.sh scheduler_health_done --tick-run-id=$TICK_RUN_ID`. This decouples scheduler-tier (sub-120s bootstrap) from round-tier (5–15+ min review work) so long reviews can't fire false `scheduler_health` deadline_missed.
- **Phase 2 — round-scoped tick events.** Inside the reviewer skill: `coord-emit.sh tick_start --correlation-id=...`, run review, `coord-emit.sh tick_end --correlation-id=... --payload='{"outcome":"completed"}'` (or `stale_combined` / `duplicate_response` / `upstream_duplicate` / `bind_failed`).

All curl calls use `--connect-timeout 2 --max-time 5 ... || true` — daemon-down preserves queue durability and only degrades observability.

### Skill-side post-push hooks

`coord_invoke` is called from exactly two skill sites in 057b:

- **`skills/review-queue-watch.md` Step 3 (b)** after `push-with-retry.sh` succeeds on the next round's request — one call per headless reviewer in `requested_reviewers`.
- **`skills/review-pending.md`** after sidecar push — one call per headless reviewer in the next round.

`request.py` is NEVER a `coord_invoke` caller; its only coord-related responsibility is generating + writing the canonical uuid4 `correlation_id` into `request.md` frontmatter. Both active-spawn and launchd-fallback wrapper paths read the same correlation_id, so whichever runs first closes the daemon's pre-spawn deadline correctly.

### Daemon-side `internal-emitter`

`src/coord/internal-emitter.ts` is the daemon's own emit path for `reviewer_invoked` (from `coord_invoke`) and `deadline_missed` (from 057a's tracker). It bypasses the wrapper-required `X-Echo-Role` header check (the daemon IS the authenticated emitter) but still writes a `subject_role` field distinct from `emitter_role: "daemon"`, so per-role `coord_status()` aggregation stays correct and the atom's `source` is `coord:<subject_role>` (not `coord:daemon`).

## Related

- [[coord-substrate-and-observability]] — 057a, substrate implementation
- [[coord-active-trigger-and-role-emission]] — 057b, active trigger implementation
- [[group-session]] — the 030 primitive the coord layer reuses
- [[review-queue-protocol]] — the operating-model diagram the coord layer overlays
- [[cross-tool-spec-review]] — the brainstorm + consult pattern that produced 057's AC structure
- [[storage]] — the single-writer constraint the coord seam preserves
- [[capture-gate]] — the capture pipeline gate the coord seam runs alongside (and does NOT modify)
