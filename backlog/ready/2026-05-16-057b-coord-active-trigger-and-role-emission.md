---
id: 2026-05-16-057b-coord-active-trigger-and-role-emission
title: Coord layer 057b — active trigger + role emission (strategist-spawned reviewers + wrapper two-phase emission + skill post-push hooks; activates 057a's dormant substrate)
status: ready
priority: HIGH
estimate: 2-2.5d
created: 2026-05-16
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
task_state_ref: 2026-05-16-057b-coord-active-trigger-and-role-emission
agent_notes: |
  057b is the production-emission half of the decomposed 057 spec.
  Depends on 057a (substrate). DO NOT CLAIM 057b until 057a is in
  `complete/`; the build requires `coord_emit` + `coord_status` + the
  deadlines tracker + per-tier registry to already exist.

  057a + 057b together = the original 057 scope. The split was made
  2026-05-16 after 057's r5 plateau (decay r1=9 → r2=5 → r3=4 → r4=5
  → r5=5 — 049 fail-to-converge asymptote). Each half is expected to
  converge in 3-4 rounds.

  Parent context (read once): backlog/complete/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md and its r1-r5 review history.
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  # AC0 — coord_invoke MCP tool (with argv-spawn + input validation + pinned-request mode)
  - src/mcp/tools/coord-invoke.ts                  # new MCP write tool — spawns wrapper + appends coord:reviewer_invoked atom for pre-spawn deadline (r4 codex F2 HIGH security + r4 codex-ops F2 HIGH pinned-mode)
  - src/mcp/server.ts                              # register coord_invoke
  # AC0/AC7 — request.py correlation_id generation (load-bearing for active/fallback sharing the same round id per r3 codex-ops F1 HIGH)
  - tools/review-queue/schemas/request.schema.json # add correlation_id required field (uuid4 pattern)
  - tools/review-queue/request.py                  # generate uuid4 correlation_id at request-write time; NO MCP call (carried from 057 r3 disposition)
  # AC7 — wrapper two-phase emission (scheduler_health no-correlation_id + request-scoped tick_start/tick_end with correlation_id)
  - tools/review-queue/_run_reviewer.sh            # Phase 1 scheduler_health at log-redirect-open; Phase 2 tick_start after candidate selection; tick_end on EVERY clean exit (r4 codex-ops F3 HIGH outcome enum)
  - tools/review-queue/run-codex-reviewer.sh       # forward ECHO_COORD_REQUEST_PATH + ECHO_COORD_CORRELATION_ID env vars (r5 codex F1 HIGH)
  - tools/review-queue/run-codex-ops-reviewer.sh   # same forwarding
  # AC7 — pinned-request mode in reviewer prompts
  - skills/review-queue-codex.md                   # Step 2 scan-skip when ECHO_COORD_REQUEST_PATH set; tick_failed_to_bind on mismatch (r4 codex-ops F2 HIGH)
  - skills/review-queue-codex-ops.md
  - skills/review-queue-claude.md                  # (if 056 has shipped; otherwise skip and add in successor)
  - .claude/commands/review-queue-codex.md         # synced from skills/ via tools/sync-skills.sh
  - .claude/commands/review-queue-codex-ops.md     # synced
  - .claude/commands/review-queue-claude.md        # synced (conditional)
  - adapters/codex/skills/review-queue-codex/SKILL.md  # synced
  - adapters/codex/skills/review-queue-codex-ops/SKILL.md  # synced
  # AC7 — post-push hooks in strategist/watcher/merger skills (the ONLY legitimate coord_invoke call sites per r2 codex F1 + codex-ops F1 convergent HIGH)
  - skills/review-queue-watch.md                   # Step 3 (b) post-push hook now calls coord_invoke; emits coord:round_combined after combine.py succeeds
  - skills/review-pending.md                       # post-push hook calls coord_invoke for sidecar review reviewers
  - skills/merge-and-cleanup.md                    # emits coord:merge_start at Section A pre-flight; coord:merge_complete after final push
  - skills/process-backlog.md                      # builder emits coord:item_claimed after atomic claim; coord:item_pushed after move-to-pending_review
  - .claude/commands/review-queue-watch.md         # synced
  - .claude/commands/review-pending.md             # synced
  - .claude/commands/merge-and-cleanup.md          # synced
  - .claude/commands/process-backlog.md            # synced
  - adapters/codex/skills/review-queue-watch/SKILL.md  # synced
  - adapters/codex/skills/review-pending/SKILL.md  # synced
  - adapters/codex/skills/merge-and-cleanup/SKILL.md  # synced
  - adapters/codex/skills/process-backlog/SKILL.md  # synced
  # AC7 — daemon internal-emitter attribution (daemon writes reviewer_invoked + deadline_missed with subject_role attribution)
  - src/coord/internal-emitter.ts                  # new module — daemon-side emitter with emitter_role=daemon + subject_role=<reviewer> (r2 codex-ops F2 HIGH)
  # AC8 — integration tests (require both 057a substrate + 057b emission to pass)
  - tests/coord/active-trigger-roundtrip.test.ts            # coord_invoke spawns wrapper; reviewer_invoked + tick_start + tick_end appear within budget
  - tests/coord/pre-spawn-deadline-fires.test.ts            # wrapper exits BEFORE tick_start → daemon's pre-spawn deadline fires coord:deadline_missed (r1 codex-ops F1 HIGH)
  - tests/coord/daemon-down-tolerance.test.ts               # coord_invoke + coord_emit failures non-fatal to queue (r1 codex-ops F2 HIGH)
  - tests/coord/no-pre-push-spawn.test.ts                   # request.py alone produces ZERO coord:reviewer_invoked/tick_start/tick_end atoms (r2 codex F1 + codex-ops F1 convergent HIGH)
  - tests/coord/internal-emitter-attribution.test.ts        # daemon-emitted reviewer_invoked + deadline_missed atoms use subject_role attribution; source=coord:<subject_role> (r2 codex-ops F2 HIGH)
  - tests/coord/scheduler-health-two-phase.test.ts          # wrapper emits scheduler_health (no correlation_id) + later tick_start (with correlation_id) (r2 codex-ops F3 MED)
  - tests/coord/correlation-id-shared-active-and-fallback.test.ts  # active-spawn crashes pre-tick_start; launchd-fallback closes the daemon's reviewer_invoked deadline using same correlation_id (r3 codex-ops F1 HIGH)
  - tests/coord/coord-invoke-input-validation.test.ts       # shell metacharacters + path traversal + bad uuid4 rejected; no spawn + no atom on rejection (r4 codex F2 HIGH security)
  - tests/coord/pinned-request-mode.test.ts                 # coord_invoke specifies request_path; wrapper reviews EXACT request (no scan-pick); roster guard (requested_reviewers membership) preserved (r4 codex-ops F2 HIGH + r5 codex F2 MED)
  - tests/coord/tick-end-covers-clean-exits.test.ts         # stale_combined / duplicate_response / upstream_duplicate / completed all emit tick_end and close deadline (r4 codex-ops F3 HIGH)
  - tests/coord/causality-reviewer-invoked-before-tick-start.test.ts  # daemon's reviewer_invoked atom precedes child's tick_start in replay order (r5 codex-ops F1 HIGH)
  - tests/coord/tick-failed-to-bind-closes-deadline.test.ts # tick_failed_to_bind event is registered + closes the pre-spawn deadline (r5 codex-ops F3 MED)
  - tests/coord/silent-fail-detection.test.ts               # the full motivating scenario: launchd-style wrapper invocation fails to emit tick_start; deadline fires coord:deadline_missed within budget
  # AC9 — task-state pointer per 046 AC1
  - backlog/task-state/2026-05-16-057b-coord-active-trigger-and-role-emission/builder.md
spec_refs:
  - backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md  # SIBLING SPEC. 057a MUST be in `complete/` before 057b builder claims. 057b uses 057a's coord_emit MCP tool, coord-roles.json + Python loader, deadlines tracker, coord_status surface, and event-type registry as-is — does not modify them.
  - backlog/complete/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md  # Parent monolithic spec (decomposed 2026-05-16). r1-r5 review history captures the design archive.
  - backlog/reviews/2026-05-15-057-coord-layer-narrow-append-and-deadlines/  # r1 through r5 — 21+ findings are the source of truth for AC text below.
  - backlog/complete/2026-05-13-043-per-round-reviewer-roster.md  # AC7 pattern: per-role roster + Python loader. coord-roles.json (in 057a) is the sibling.
  - backlog/complete/2026-05-13-047-codex-as-builder-binding-adapter.md  # Cross-tool role pattern. 057b extends emission to the wrapper layer.
  - backlog/complete/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md  # 050 worktree-isolation: 057b's AC7 wrapper emission happens INSIDE the ephemeral worktree; cleanup trap fires after journal push.
  - tools/review-queue/_run_reviewer.sh  # AC7 touch site. Two-phase emission must wrap the existing tick body, not replace it.
  - skills/review-queue-watch.md  # AC7 touch site (post-push hook).
  - tools/review-queue/request.py  # AC7 touch site (correlation_id field write).
  - tools/review-queue/schemas/request.schema.json  # AC7 touch site (correlation_id required field add).
---

## Why this spec exists

057b activates the substrate that 057a ships dormant. Without 057b:
- 057a's `coord_emit` MCP tool exists but no production code calls it.
- 057a's deadlines tracker initializes but has no events to track.
- 057a's `coord_status()` returns empty open-deadlines and zero-tick last-tick rows.

With 057b:
- The strategist actively spawns reviewers via `coord_invoke` (post-push hook in watcher/review-pending/merge-and-cleanup skills).
- The daemon attributes `reviewer_invoked` + `deadline_missed` atoms to the correct `subject_role`.
- Wrappers emit `scheduler_health` + `tick_start`/`tick_end` for both active-spawn and launchd-fallback paths.
- The launchd silent-fail (`_followups.md` HIGH #1 — the motivating incident) becomes observable AND alertable via `coord_status()` within seconds.

The boundary with 057a is **producer vs substrate**: 057b is producer; 057a is substrate. 057b doesn't add MCP tools, deadlines logic, or schema fields to the daemon — it consumes the contracts 057a defines.

## Acceptance Criteria

**AC0 — `coord_invoke` MCP tool (with argv-spawn + input validation + pinned-request mode).**

New MCP tool at `src/mcp/tools/coord-invoke.ts`. Required input: `coord_invoke(role, request_path, correlation_id)`. ALL THREE parameters required (r4 codex F2 HIGH + r4 codex-ops F2 HIGH).

The daemon:

1. **Loads `invoke_command` from `coord-roles.json`** (the JSON-array argv vector per 057a AC2).
2. **Validates inputs strictly** (r4 codex F2 HIGH security):
   - `correlation_id` MUST match `^[a-f0-9-]{36}$` (uuid4 shape).
   - `request_path` MUST match `^backlog/reviews/[a-z0-9-]+/r[0-9]+/request\.md$` (no traversal, no shell metacharacters).
   - Reject with structured MCP error on either failure; do NOT spawn anything; do NOT append `coord:reviewer_invoked`.
3. **Argv-style spawning** (r4 codex F2 HIGH — no shell injection regardless of input). Substitute `{{WT}}`/`{{REQUEST_PATH}}`/`{{CORRELATION_ID}}` tokens INTO array elements, then invoke via `subprocess.spawn(argv, { shell: false })`. No `bash -c`. Even with strict input validation, argv-spawn is the primary defense; validation is defense-in-depth.
4. **Causality-safe `reviewer_invoked` emission** (r5 codex-ops F1 HIGH): the daemon appends `coord:reviewer_invoked` atom SYNCHRONOUSLY BEFORE returning to the caller — meaning before the spawned child can possibly emit `tick_start`. The contract: by the time `coord_invoke` returns, the `reviewer_invoked` atom is durable in the ledger AND the deadline tracker has opened the pre-spawn record. Concrete ordering in code:
   - daemon validates inputs
   - daemon appends `reviewer_invoked` atom (single-writer; durable)
   - daemon opens the pre-spawn deadline in the tracker
   - daemon `subprocess.spawn(argv, { shell: false })` — fire-and-forget
   - daemon returns success to caller
   - The child wrapper starts running; ANY `tick_start` it emits cannot precede the `reviewer_invoked` atom in replay order.
5. **Pinned-request reviewer mode** (r4 codex-ops F2 HIGH + r5 codex F2 MED roster preservation): the wrapper receives `ECHO_COORD_REQUEST_PATH=<request_path>` and `ECHO_COORD_CORRELATION_ID=<correlation_id>` as env vars (r5 codex F1 HIGH — env-var handoff is implementable; CLI-flag handoff is not since `codex exec` doesn't expose those flags). When these are set, the reviewer skill's Step 2 (in `skills/review-queue-codex.md` etc.) MUST:
   - Read ONLY the specified `$ECHO_COORD_REQUEST_PATH` (not scan-pick from `backlog/reviews/*/r*/`).
   - Validate: file exists; `correlation_id` in frontmatter matches `$ECHO_COORD_CORRELATION_ID`; `requested_reviewers` includes the current `$MY_REVIEWER` (preserves 043 roster guard per r5 codex F2 MED); no `combined.md` or `<my_slug>.md` already exists.
   - On any validation failure: emit `coord:tick_failed_to_bind(subject_role, correlation_id, reason="request_not_found"|"correlation_id_mismatch"|"role_not_in_roster"|"already_combined"|"already_responded")` and exit non-zero.
   - On success: proceed with the rest of the reviewer protocol.
   - Scan-pick remains the launchd-fallback path (when `$ECHO_COORD_REQUEST_PATH` is unset).
6. **Best-effort emission contract** (r1 codex-ops F2 HIGH carried forward): `coord_invoke` callers use bounded HTTP timeouts (2s connect, 5s total) and tolerate non-zero rc without aborting the parent step. Watcher/skill callers wrap in `|| true` equivalent guards. Queue durability stays intact when the daemon is down.

**AC7 — Role emission (wrappers + skills emit coord events).**

Production emission lands in 057b. ALL integration is ADDITIVE — no protocol body changes; only emission lines appended.

**Wrapper two-phase emission** (r2 codex-ops F3 MED scheduler/round distinction; r4 codex-ops F3 HIGH every-clean-exit coverage):

- **Phase 1 — scheduler health tick** (no `correlation_id`): at log-redirect-open in `_run_reviewer.sh`, emit `coord:scheduler_health(subject_role=<slug>, tick_run_id=<uuid4 generated at process-start>)`. This is "I started" — not tied to any review round. Has its own `expects` cycle (default_deadline_sec ~120s per 057a's coord-roles.json).
- **Phase 2 — request-scoped events**: after Step 2 selects a candidate (or, in pinned-request mode, validates the pinned request), read the request's `correlation_id` field. Emit `coord:tick_start(subject_role, correlation_id)` BEFORE running the review. Emit `coord:tick_end(subject_role, correlation_id, outcome=<enum>)` on every clean exit, AND `coord:scheduler_health_done(subject_role, tick_run_id)` before process exit.
- **`tick_end` covers EVERY clean exit after `tick_start`** (r4 codex-ops F3 HIGH; closes the false-`deadline_missed`-on-no-op exit class):
  - `outcome="completed"` — review succeeded; response file committed + pushed.
  - `outcome="stale_combined"` — `combined.md` already existed when wrapper started Step 2.
  - `outcome="duplicate_response"` — local os.link race lost; another wrapper wrote the response first.
  - `outcome="upstream_duplicate"` — pre-push pull found another response landed.
  - Wrapper CRASH before tick_end: intentionally NO terminal event → pre-spawn deadline fires `deadline_missed` per 057a AC3. That's correct behavior for real failures.
- **No-candidate exit (Phase 2 finds nothing):** emit `coord:scheduler_health_done` (no `correlation_id`); no `tick_start`/`tick_end` for that round. The launchd-fallback "I ran but nothing to do" case stays cleanly distinguishable from a tick that processed a round.

**Internal-emitter daemon attribution** (r2 codex-ops F2 HIGH):

The daemon writes `coord:reviewer_invoked` (from `coord_invoke`) and `coord:deadline_missed` (from 057a's tracker) atoms. These have a `subject_role` field that identifies the role being tracked, distinct from the `emitter_role: "daemon"` field. The atom's `source` field is `coord:<subject_role>` (so per-role `coord_status()` aggregation is correct). AC5's "caller-supplied role is ignored" rule from 057a applies ONLY to wrapper-side `coord_emit` calls — the daemon bypasses the X-Echo-Role check because it IS the authenticated emitter. New module `src/coord/internal-emitter.ts` codifies this.

**Skill-side post-push hooks** (the ONLY legitimate `coord_invoke` call sites per r2 codex F1 + codex-ops F1 convergent HIGH):

- **`skills/review-queue-watch.md` Step 3 (b)** after `push-with-retry.sh` succeeds: call `coord_invoke(role=X, request_path=<r<N+1>/request.md>, correlation_id=<from r<N+1>/request.md>)` for each headless reviewer in the next round's `requested_reviewers`.
- **`skills/review-pending.md`** after sidecar push: call `coord_invoke` for the next reviewer round (if any).
- **`skills/merge-and-cleanup.md`** emits `coord:merge_start` at Section A pre-flight and `coord:merge_complete` after final push.
- **`skills/process-backlog.md`** builder emits `coord:item_claimed` after atomic-claim push and `coord:item_pushed` after move-to-pending_review push.
- **`request.py` is NEVER a `coord_invoke` caller** (r2 codex F1 + codex-ops F1 convergent HIGH). Its only coord-related responsibility is generating + writing the `correlation_id` uuid4 to `request.md`. Zero MCP calls. `tests/coord/no-pre-push-spawn.test.ts` asserts this invariant.

**`request.py` + request.schema.json `correlation_id` field** (r3 codex-ops F1 HIGH + r3 codex F2 MED convergent):

- `tools/review-queue/schemas/request.schema.json` extends with `correlation_id: { type: "string", pattern: "^[a-f0-9-]{36}$" }` as a required field; existing `additionalProperties: false` constraint preserved.
- `tools/review-queue/request.py` generates `correlation_id = uuid.uuid4().hex` at request-write time and includes it in the frontmatter. No MCP call.
- The watcher's `coord_invoke` reads the value from `request.md`; the launchd-fallback wrapper's Phase 2 reads the SAME value. Active-spawn + launchd-fallback share one correlation_id per round → daemon's pre-spawn deadline closes correctly regardless of which path succeeds (the load-bearing test in `tests/coord/correlation-id-shared-active-and-fallback.test.ts`).
- **Backward compatibility:** pre-057 requests on origin/main without `correlation_id` are treated as "no coord-tracked round" — wrapper falls back to scheduler-tier identifiers only (no round-tier deadline opened).

**AC8 — Falsifiable integration tests.**

Each test below is merge-blocking. All assume 057a substrate is in place (so `coord_emit`, `coord_status`, deadlines tracker, registry exist as-is). 057b tests exercise the production-emission path end-to-end.

Test inventory in `files_to_modify` above. Each test maps to a finding from 057's r1-r5 review cycle.

**AC9 — Builder pointer per 046 AC1 + 047 AC3.**

Standard schema use.

## Out of Scope (Don't Drift)

- **NO new MCP tools beyond `coord_invoke`.** 057a shipped `coord_emit` + `coord_status` + the registry; 057b does not modify them.
- **NO daemon-side deadlines tracker changes.** 057a's `src/coord/deadlines.ts` is consumed as-is (the daemon-internal-emitter module in 057b uses 057a's APIs).
- **NO `coord-roles.json` schema additions.** 057a's `invoke_command` argv-array shape is what 057b reads.
- **NO cross-machine support.**
- **NO active-coordinator policy.** 057b emits events; the strategist decides what to do with notifications.
- **NO cursor IDE-mode emission.** Cursor's file-side review path stays unchanged.
- **NO retroactive `correlation_id` injection** for pre-057b requests already in `backlog/reviews/`. Those degrade gracefully to scheduler-tier only.

## After Completion (Strategist Notes)

Post-merge wiki promotion:

- **Update `wiki/operating-model/review-queue-protocol.md`** to flip the coord-substrate lane from "057b — not yet active" to "active." Add a sequence diagram showing the `coord_invoke` → `reviewer_invoked` → wrapper → `tick_start` → review → `tick_end` flow.
- **Update `wiki/architecture/coord-layer.md`** (created by 057a) with the producer-side contract: pre-spawn deadline causality, two-phase wrapper emission, pinned-request mode, internal-emitter attribution model.
- **Close `_followups.md` HIGH #1 launchd silent-fail** end-to-end. The full chain works: founder dispatches r1 → watcher post-push hook calls `coord_invoke` → daemon emits `reviewer_invoked` + opens pre-spawn deadline → if wrapper dies silently, deadline fires `coord:deadline_missed` within ~90s and `coord_status()` shows it.
- **Update memory `project_loop_close_gate.md`** if applicable — operator out-of-band health visibility now exists.
- **Dogfooding verification:** the very NEXT spec dispatched after 057a+057b ship is the empirical test. Run `coord_status()` periodically; assert per-role last-tick timestamps update.
