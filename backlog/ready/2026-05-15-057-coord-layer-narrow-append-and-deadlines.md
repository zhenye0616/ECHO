---
id: 2026-05-15-057-coord-layer-narrow-append-and-deadlines
title: Coord layer v1 — narrow append seam + deadline tracker + mailbox semantics (reactive notifier for generic role↔role coordination)
status: ready
priority: HIGH
estimate: 2-2.5d
created: 2026-05-15
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
task_state_ref: 2026-05-15-057-coord-layer-narrow-append-and-deadlines
agent_notes: |
  NOT YET DISPATCHED FOR REVIEW. Per founder instruction 2026-05-15: hold
  for review queue until 055 + 056 review loops complete; strategist will
  invoke `request.py` for 057 r1 after those converge.
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  # AC0 — strategist-initiated active trigger (active trigger fires from watcher post-push, not request.py — r1 codex F1 HIGH; daemon also opens pre-spawn deadline via coord:reviewer_invoked — r1 codex-ops F1 HIGH)
  - src/mcp/tools/coord-invoke.ts                  # new MCP write tool — spawns wrapper + appends coord:reviewer_invoked atom for pre-spawn deadline
  # request.py is NOT a coord_invoke caller (removed r2 codex F1 + codex-ops F1 convergent HIGH — pre-push spawn produces false healthy/completed signal for a non-existent round)
  - skills/review-queue-watch.md                   # Step 3 (b) post-push hook now calls coord_invoke for each headless reviewer
  - tests/coord/active-trigger-roundtrip.test.ts
  - tests/coord/pre-spawn-deadline-fires.test.ts   # wrapper exits BEFORE tick_start → coord:deadline_missed still fires (r1 codex-ops F1 HIGH)
  - tests/coord/daemon-down-tolerance.test.ts      # coord_invoke + coord_emit failures non-fatal to queue (r1 codex-ops F2 HIGH)
  # AC1 — narrow coord append seam
  - src/mcp/tools/coord-emit.ts                    # new MCP write tool
  - src/mcp/tools/search-memories.ts               # AC1 non-pollution: default-exclude coord; only when no explicit source_prefix="coord:" (r1 codex F6 MED)
  - tools/review-queue/_coord_roles.py             # AC2 code-level validator for max_deadline_sec > default_deadline_sec (r1 codex F3 MED — JSON Schema draft-07 can't express cross-field)
  - tests/coord/coord-roles-validation.test.ts     # bad-config rejection fixture (AC2)
  - tests/coord/non-pollution-three-way.test.ts    # search_memories()/search_memories(coord:)/wait_for_new_turns(coord:) contract (AC1 r1 codex F6 MED)
  - tests/coord/idempotency-per-role.test.ts       # two reviewers same correlation_id, both miss → 2 distinct deadline_missed atoms (AC3 r1 codex F5 + codex-ops F3 MED)
  - tests/coord/no-pre-push-spawn.test.ts          # request.py alone never produces reviewer_invoked/tick_start/tick_end atoms (r2 codex F1 + codex-ops F1 convergent HIGH)
  - tests/coord/internal-emitter-attribution.test.ts  # daemon-emitted reviewer_invoked + deadline_missed atoms attributed to subject_role, not "daemon" (r2 codex-ops F2 HIGH)
  - tests/coord/state-machine-transitions.test.ts  # generic close-then-open rule covers reviewer_invoked → tick_start → tick_end + reconstruction (r2 codex F2 MED)
  - tests/coord/scheduler-health-two-phase.test.ts # wrapper emits scheduler_health (no correlation_id) + later tick_start (with correlation_id) (r2 codex-ops F3 MED)
  - tools/review-queue/schemas/request.schema.json # add correlation_id field (r3 codex-ops F1 HIGH + r3 codex F2 MED convergent)
  - tools/review-queue/request.py                  # generate uuid4 correlation_id at request-write time; NO MCP call (r3 codex-ops F1 + codex F2; r3 codex F1)
  - tests/coord/correlation-id-shared-active-and-fallback.test.ts  # active-spawn crashes pre-tick_start; launchd-fallback closes the daemon's reviewer_invoked deadline (r3 codex-ops F1 HIGH)
  - tests/coord/scheduler-vs-round-tier-keyspace.test.ts  # scheduler-tier tick_run_id and round-tier correlation_id don't collide (r3 codex-ops F2 MED)
  - tests/coord/coord-invoke-input-validation.test.ts     # shell metacharacters + path traversal + bad uuid4 rejected (r4 codex F2 HIGH)
  - tests/coord/pinned-request-mode.test.ts               # coord_invoke spec'd request_path; wrapper reviews EXACT request not scan-pick (r4 codex-ops F2 HIGH)
  - tests/coord/coord-emit-per-tier-input.test.ts         # discriminated input per tier (r4 codex F1 MED)
  - tests/coord/tick-end-covers-clean-exits.test.ts       # stale_combined / duplicate_response / upstream_duplicate all emit tick_end (r4 codex-ops F3 HIGH)
  - src/mcp/server.ts                              # register coord_emit + coord_invoke
  - src/storage/sqlite.ts                          # narrow coord-write path; preserve single-writer constraint
  - src/coord/types.ts                             # new module — coord event types + schema_version registry
  - src/coord/validate.ts                          # event shape validation; reject unknown event_type / schema_version
  - src/coord/source.ts                            # server-derives source = coord:<role> from caller identity
  # AC2 — role-typed deadline config
  - tools/review-queue/coord-roles.json            # sibling of reviewers.json; per-role-per-event-type SLA + max bound
  - tools/review-queue/schemas/coord-roles.schema.json
  # AC3 — deadline tracker + boot reconstruction
  - src/coord/deadlines.ts                         # in-memory tracker + reconstruction logic
  - src/daemon/index.ts                            # wire deadlines.reconstruct() into daemon boot
  # AC4 — mailbox semantics (durable log + live long-poll; no push to stateless)
  - src/mcp/tools/wait-for-new-turns.ts            # widen with a `source_prefix: string` parameter (current tool only accepts `sources[]` exact / source-app-mapped list per src/mcp/tools/wait-for-new-turns.ts:121-132,157-162; bug caught by codex strategist consult 2026-05-16 00:31 PDT)
  # AC5 — identity + schema versioning + observability
  - src/coord/identity.ts                          # caller-identity → role mapping (env var or header-based)
  # AC6 — operator status surface
  - src/mcp/tools/coord-status.ts                  # new MCP read tool: open deadlines, recent missed, role last-tick
  - tools/coord-status.sh                          # CLI sibling for non-MCP operator inspection
  # AC7 — existing roles start emitting
  - tools/review-queue/_run_reviewer.sh            # emit coord:tick_start/tick_end via curl POST or echo CLI sibling
  - skills/process-backlog.md                      # builder emits coord:item_claimed / coord:item_pushed
  - skills/review-queue-watch.md                   # watcher emits coord:round_combined
  - skills/merge-and-cleanup.md                    # merger emits coord:merge_start / coord:merge_complete
  # AC8 — falsifiable end-to-end test
  - tests/coord/silent-fail-detection.test.ts
  - tests/coord/append-seam.test.ts
  - tests/coord/deadlines-reconstruction.test.ts
  - tests/coord/identity-spoof-rejection.test.ts
  # AC9 — task-state pointer per 046 AC1
  - backlog/task-state/2026-05-15-057-coord-layer-narrow-append-and-deadlines/builder.md
spec_refs:
  - raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md  # Parent decision note. 057 is the reopened version of the coordination-layer brainstorm that was deferred 2026-05-10. The deferral preconditions (030 shipped + founder out-of-loop) both fired by 2026-05-15, and today's launchd silent-fail surfaced the trigger. Read Phase 6 + Phase 3 of that note for the design space + the rejected approaches.
  - raw/internal/dogfooding/mcp-interactions-journal.md  # The launchd silent-fail event at 2026-05-15 ~22:50 PDT (visible to ANY reader at this commit sha) is the canonical motivating incident — founder had to manually direct-invoke `tools/review-queue/run-codex-reviewer.sh` because `launchctl kickstart -k` returned rc=0 but the wrapper never wrote a tick-start line.
  - backlog/complete/2026-05-13-043-per-round-reviewer-roster.md  # AC2 pattern reference. 043's per-round reviewer roster + `reviewers.json` + `_reviewers.py:92-106` mode↔timeout_hours contract is the template for `coord-roles.json` schema validation.
  - backlog/complete/2026-05-13-047-codex-as-builder-binding-adapter.md  # Cross-tool role pattern. 057 extends the cross-tool protocol to coord-event emission; the wrapper-shape conventions (PATH augmentation, log file + rotation) carry over to AC7.
  - wiki/operating-model/review-queue-protocol.md  # The diagram 057 augments. Coord layer overlay belongs as a Section in this page post-merge.
  - wiki/architecture/group-session.md  # Group-session primitive shipped by 030 — the substrate 057 reuses. Coord events are atoms in the existing ledger; coord subscribers use the existing `wait_for_new_turns` read tool.
  - wiki/architecture/storage.md  # Lines 50, 68-76 (append-only, no trim today), 119-127 (single-writer constraint). AC1 + AC5 honor these invariants verbatim.
  - src/capture/gate.ts  # Lines 57-72 — current capture-gate rejects unknown source schemes (only `app/domain/fs/api/git`). AC1's coord seam is SEPARATE from this gate — coord writes bypass the capture pipeline entirely to avoid extractor / normalizer / clustering pollution.
  - src/capture/pipeline.ts  # Lines 17-44 — timestamp canonicalization pattern AC1 reuses verbatim (the Bug A fix from item 022 must continue to hold for coord:* atoms).
  - src/mcp/tools/wait-for-new-turns.ts  # Lines 9-13, 121-162, 202-279 — the read-side subscription primitive. Current tool accepts `sources[]` (exact source-app-mapped names + literal exact sources at lines 121-132, 157-162) but NOT a prefix parameter. AC4 widens with one new optional `source_prefix: string` input so callers can subscribe to `coord:*` without enumerating every role slug. Stateless by design — that's exactly the property that forces AC4's mailbox-not-push reframing.
  - src/normalize/dispatch.ts  # Lines 11-46 — normalizer adapters registry. AC1 explicitly does NOT register a coord adapter; coord atoms bypass normalization, embedding, and trace clustering. The "non-pollution" property the spec guarantees.
  - src/trace/index.ts  # Lines 69-83 — trace clustering input. AC1 documents that coord atoms are EXCLUDED from clustering (no edges, no candidacy for cluster anchors).
  - src/mcp/server.ts  # Lines 127-132 — current host/DNS-rebinding protection. AC5 adds caller-identity → role mapping on top of this without changing the loopback constraint.
  - src/storage/sqlite.ts  # Lines 76-89 (id generation), 119-127 (single-writer). AC1's coord append path goes through the same writer; no parallel SQLite handle.
review_notes: |
  Born from a strategist (Claude Code) + codex strategist consult on
  2026-05-15. The brainstorm trace lives in the Claude Code session at
  the commit this spec is dispatched against; codex strategist consult
  output is at /tmp/echo-coord-strategist-stdout.md (pre-commit transient
  artifact — not preserved, but the substance is baked into AC1-AC8
  below, with each AC citing the Q1-Q5 finding it closes).

  Cross-tool brainstorm pattern observation: the strategist's v1 design
  treated "atom-shaped" as sufficient; codex strategist's read-only
  consult surfaced 3 HIGH findings the strategist had missed
  (Q1: emission seam doesn't exist; Q3: in-memory tracker not durable;
  Q5: identity / schema versioning absent). All three are HIGH because
  shipping the v1 design would have left coord events spoofable, lost
  deadlines on daemon restart, and required net-new MCP write infrastructure
  the strategist had hand-waved as "use the existing primitives." 057's
  AC structure is the codex strategist's diagnosis-as-acceptance-criteria.
---

## Why this spec exists

**Today's pain (2026-05-15 ~22:50 PDT, this commit sha):** founder `launchctl kickstart -k`'d both codex reviewer launchd jobs after dispatching r1 of 055 + 056; kickstart returned rc=0 but the wrappers' `~/Library/Logs/echo-review-queue-codex.log` showed no new tick-start entry. The pre-redirect failure path documented in `_followups.md` HIGH #1 fired silently. Founder had to manually invoke `bash tools/review-queue/run-codex-reviewer.sh` to recover. **The strategist had no out-of-band visibility into reviewer health** — only the file-side outcome (atoms appearing on `origin/main` or not). 10-25 min round-trip per round + zero liveness signal.

**The deferred brainstorm fires now.** `raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md` deferred the general multi-agent coordination layer pending (a) 030 ship and (b) founder-out-of-loop. Both preconditions hold by 2026-05-15 (memory `project_loop_close_gate.md`). The trigger condition (#2 in that note: "race spreads beyond the journal to another shared file, silently") didn't fire — but the strategist + founder reframed today: the launchd silent-fail IS the same class of failure (silent-loss-of-coordination-signal), and 030's group-session primitive is now the substrate that lets the coord layer ship without external infrastructure.

**The brainstorm trajectory + codex strategist validation.** Five rounds of one-question-at-a-time produced four locked decisions:

1. **Scope:** generic role↔role coordination for every role (strategist, watcher, reviewer, builder, dispatcher, merger, founder).
2. **Responsibility:** reactive notifier (observe + push, no built-in policy). The strategist still decides what to do with notifications; the layer just makes events visible and deliverable.
3. **Location:** ECHO daemon (loopback :38478), reusing item 030's group-session primitive. Coord events are atoms with `source = coord:<role>`; subscribers use the existing `wait_for_new_turns(source_prefix="coord:")` long-poll.
4. **Boundary:** local-machine only for V1. Cross-machine deferred. Redis / Kafka / NATS rejected (conflicts with bundle commitment + `compose-not-capture` principle + scale mismatch).

Codex strategist's read-only consult at the v1-design boundary surfaced 5 findings that the strategist had missed. 057 absorbs all 5 as acceptance criteria — see AC1-AC5 below. Bottom line from codex: *"substrate choice is directionally good, but the spec must stop treating 'atom-shaped' as enough. Coordination atoms need a reserved source family, a narrow append seam, explicit non-pollution rules, durable replay, and a mailbox-not-push delivery contract."*

## Acceptance Criteria

**AC0 — Strategist-initiated active trigger (closes the launchd-polling latency + silent-fail dimension).**

The launchd-polled reviewer model has two compounding failures: (a) 0-10 min latency per hop even on the happy path, and (b) silent kickstart failures that swallow themselves before the log redirect (`_followups.md` HIGH #1). Today's 056 r1 spurious-escalation incident (2026-05-15 ~22:50-23:24Z) is the canonical case — the strategist dispatched r1, launchd never ticked, combine.py's `FALLBACK_TIMEOUT_HOURS=0.5` declared `no_responses` 30 min later despite both reviewers having `timeout_hours: null` in `reviewers.json`.

The fix: a **strategist-initiated active trigger** via the coord layer, parallel to (NOT replacing) launchd polling:

- **New MCP tool `coord_invoke(role, request_path, correlation_id)`** at `src/mcp/tools/coord-invoke.ts` (r4 codex F2 HIGH — `request_path` and `correlation_id` are now REQUIRED, not optional, because their omission led to "wrapper scan-picks a different round" race in r4 codex-ops F2). The daemon:
  1. Loads `invoke_command` from `coord-roles.json` for the resolved role.
  2. **Validates inputs strictly** (r4 codex F2 HIGH security): `correlation_id` MUST match `^[a-f0-9-]{36}$` (uuid4 shape); `request_path` MUST match `^backlog/reviews/[a-z0-9-]+/r[0-9]+/request\.md$` (no traversal, no shell metacharacters). Reject with structured MCP error on either failure; do NOT spawn anything; do NOT append `coord:reviewer_invoked`.
  3. **`invoke_command` is declared as a JSON array (argv vector), NOT a shell string** (r4 codex F2 HIGH security). Example: `["codex", "exec", "-C", "{{WT}}", "--sandbox", "danger-full-access", "--input-file", "{{REQUEST_PATH}}", "--correlation-id", "{{CORRELATION_ID}}"]`. The daemon substitutes `{{...}}` tokens INTO array elements and invokes via `subprocess.spawn(argv, { shell: false })` — no `bash -c`. Token values pass through `shlex.quote()` even for argv-style if any single element risks ambiguity. **This eliminates shell injection regardless of what `correlation_id`/`request_path` contain after validation** (validation is defense-in-depth, argv-spawn is the primary guard).
  4. **Pinned-request reviewer mode** (r4 codex-ops F2 HIGH): the wrapper receives `--input-file <request_path>` (or equivalent), and AC7 Step 2 of the reviewer skill, when this flag is present, MUST review THE SPECIFIED request — not scan-pick from `backlog/reviews/*/r*/`. If the specified `request_path` doesn't exist or its `correlation_id` doesn't match the one passed in `--correlation-id`, the wrapper aborts with a clear error AND emits `coord:tick_failed_to_bind(subject_role, correlation_id, reason="request_not_found"|"correlation_id_mismatch")`. Scan-pick remains the launchd-fallback path (no `--input-file`).
  5. Spawns the wrapper via the same process-spawn path the launchd plist uses. Synchronous spawn (daemon returns success once the wrapper starts), non-blocking on the wrapper's completion — the strategist subscribes via `wait_for_new_turns(source_prefix="coord:")` for the `tick_start` / `tick_end` pings.
  6. AC8 includes a negative test (`tests/coord/coord-invoke-input-validation.test.ts`): call `coord_invoke` with shell metacharacters in `request_path` (`backlog/reviews/x; rm -rf ~`), a path-traversal attempt (`../../../etc/passwd`), and a non-uuid4 `correlation_id`; assert each rejects without spawn AND without appending any coord atom.
- **`coord_invoke` opens a pre-spawn deadline** (r1 codex-ops F1 HIGH; r2 codex-ops F2 HIGH refinement on attribution). Immediately after the daemon spawns the wrapper, the daemon itself appends a `coord:reviewer_invoked` event with the same `correlation_id`. **Internal-emitter attribution model** (r2 codex-ops F2 HIGH): the daemon writes daemon-emitted events (`reviewer_invoked`, `deadline_missed`) with TWO fields — `emitter_role: "daemon"` (the authenticated writer) and `subject_role: "codex"` (the role being tracked; this becomes the atom's `source = coord:<subject_role>` so `coord_status()` per-role aggregation is correct). AC5's "caller-supplied role is ignored" rule applies ONLY to wrapper-side `coord_emit` calls — the daemon itself bypasses the X-Echo-Role header check because it IS the authenticated emitter. AC3's deadline tracker treats `reviewer_invoked` as the opening record — `tick_start` later closes it. **This is load-bearing:** if the wrapper dies BEFORE emitting `tick_start` (the entire launchd silent-fail class — bad repo root, missing TMPDIR, bad prompt path, jsonschema missing, gate failure), the deadline still fires `coord:deadline_missed` after expected_by elapses, attributed to the correct subject_role. Without this, AC3 only catches mid-tick failures AND `coord_status()` cannot tell which role missed.
- **Trigger point: watcher post-push ONLY — `request.py` is NEVER a coord_invoke caller (r1 codex F1 + r2 codex F1 + r2 codex-ops F1 convergent HIGH).** `request.py` writes + validates `request.md` but does NOT commit or push — that's the watcher's job. **A pre-push `coord_invoke` would spawn a reviewer whose Step 1 pull sees no candidate, exits no-op, AND emits `tick_start`/`tick_end` for the same `correlation_id` — giving the strategist false healthy/completed signal for a round that doesn't exist on origin/main.** Therefore: the only legitimate `coord_invoke` call sites are post-`push-with-retry.sh` hooks in `skills/review-queue-watch.md` Step 3 (b), `skills/review-pending.md`, and `skills/merge-and-cleanup.md`. `request.py` MUST NOT spawn wrappers under any code path; it MAY log a "pending invoke after watcher push" diagnostic to stderr (validation-only, no MCP call). Concrete invariant tested by `tests/coord/no-pre-push-spawn.test.ts`: running `request.py` ALONE on a fresh `r<N>/request.md` must produce ZERO `coord:reviewer_invoked` / `coord:tick_start` / `coord:tick_end` atoms; the post-push watcher hook is the only producer.
- **In-progress ping (already in AC7):** the wrapper emits `coord_emit(tick_start, correlation_id=<from invoke>)` before any pre-redirect work — earliest possible signal that the wrapper bootstrapped. Strategist's live subscription receives this within ~100ms.
- **Completion ping (already in AC7) — covers EVERY clean exit, not just successful commit+push** (r4 codex-ops F3 HIGH). After `tick_start` opens the round-tier deadline, the wrapper MUST emit a terminal coord event before exit on EVERY clean-exit path:
  - **Successful review:** `coord_emit(tick_end, correlation_id, outcome="completed", verdict=<from response>)` — after response file committed + pushed.
  - **Stale combined.md detected:** `coord_emit(tick_end, correlation_id, outcome="stale_combined")` — the round was already combined by the strategist watcher between the wrapper's Step 1 pull and Step 2 commit; reviewer's response is no longer needed.
  - **Local os.link race lost:** `coord_emit(tick_end, correlation_id, outcome="duplicate_response")` — another wrapper (active-spawn or launchd-fallback for same role+round) wrote the response file first; this one exits cleanly.
  - **050 upstream duplicate guard:** `coord_emit(tick_end, correlation_id, outcome="upstream_duplicate")` — pre-push pull found another response landed.
  - **Wrapper crash before tick_end:** intentionally NO terminal event — the open `tick_start` deadline fires `deadline_missed` per AC3. That's correct behavior for real failures.
  - The `outcome` enum lives in the schema registry; consumers (combine.py short-circuit logic, coord_status() display) decide whether `outcome=stale_combined` should count as a "completed" tick or a "no-op" tick. Either way, the open-records deadline gets CLOSED so no false `deadline_missed` fires.
  - AC8 includes a fixture `tests/coord/tick-end-covers-clean-exits.test.ts` that simulates each clean-exit path and asserts the open `tick_start` deadline is closed (NOT firing `deadline_missed`).
- **Best-effort emission contract (r1 codex-ops F2 HIGH; r3 codex F1 HIGH stale-text cleanup).** All wrapper-side `coord_emit` calls AND watcher/skill-side `coord_invoke` calls MUST be non-fatal to the underlying queue operation. Use short bounded timeouts (2s connect, 5s total) and tolerate non-zero rc / timeouts without aborting the parent step. `_run_reviewer.sh` runs `set -euo pipefail` — coord curl invocations must be `curl --max-time 5 --connect-timeout 2 ... || true`. **`request.py` makes NO MCP calls at all** — no `coord_invoke`, no `coord_emit`. The only `request.py` coord-related action is local UUID4 generation for the per-round `correlation_id` field written into `request.md` (see "Round correlation-id" bullet below). `coord_invoke` is exclusively a post-push watcher/skill hook. **The queue's existing durability stays intact when the coord daemon is down or stalled.** AC8 includes a daemon-down fixture.

- **Round correlation-id as a committed request artifact (r3 codex-ops F1 HIGH + r3 codex F2 MED convergent).** The per-round `correlation_id` MUST be a field of `request.md` itself, NOT a daemon-generated value passed via `coord_invoke`. Load-bearing: the launchd-fired fallback wrapper does not know which `correlation_id` the active-spawn path used; if the active-spawned wrapper dies before `tick_start` and the fallback wrapper later reviews the same round, the fallback's `tick_start` MUST carry the SAME `correlation_id` so AC3's deadline tracker closes the daemon's open `reviewer_invoked` record (instead of false-firing `deadline_missed` over a fallback that did the work).
  - **`request.py` generates `correlation_id = uuid4()` at request-write time** and includes it in `request.md` frontmatter. No MCP call. Schema at `tools/review-queue/schemas/request.schema.json` extends with `correlation_id: { type: "string", pattern: "^[a-f0-9-]{36}$" }` as a required field; existing `additionalProperties: false` keeps untrusted keys out.
  - **Watcher's post-push `coord_invoke` reads the value from `request.md`** (parses frontmatter, passes `correlation_id` to the MCP call). The daemon's `reviewer_invoked` atom uses this round-correlation-id.
  - **Launchd-fallback wrapper Phase 2 also reads `correlation_id` from `request.md`** after candidate selection (AC7). Same value → AC3's open-records map closes correctly regardless of which path succeeds.
  - **Backward compatibility:** existing pre-057 requests on origin/main without `correlation_id` are treated as "no coord-tracked round"; wrapper falls back to scheduler-tier identifiers (no AC3 round deadline opened). `request.py` writes it from V1 onward.
  - **Falsifiable test (extends AC8):** `tests/coord/correlation-id-shared-active-and-fallback.test.ts` — seed `request.md` with `correlation_id=X`; daemon emits `reviewer_invoked(correlation_id=X)`; active-spawn wrapper crashes pre-`tick_start`; launchd-fallback wrapper succeeds and emits `tick_start(correlation_id=X)` then `tick_end(correlation_id=X)`; assert the daemon's `reviewer_invoked` deadline is CLOSED (no `deadline_missed` fires).
- **Launchd polling stays as the fallback heartbeat.** If the daemon is down or `coord_invoke` fails, launchd's 600s tick still discovers `r<N>/request.md` the old way. The coord layer is the latency-optimized happy path; the polling layer is the durability-guaranteed slow path. Both coexist by design.
- **Strategist short-circuit:** when both reviewers have emitted `tick_end` for the same `correlation_id`, the strategist can run combine.py immediately rather than wait for the next `/loop` cron tick. (Optional optimization; the cron-driven path still works.)

**Why this isn't push-to-stateless** (AC4 invariant preserved): `coord_invoke` is a NEW outbound action from the daemon (spawning a wrapper), not a push to a passive subscriber. The reviewer wrapper is still launched fresh each time; it just learns its work via the spawn args + the committed request.md, not via a long-poll. AC4 still holds: a SECOND builder that's already exited cannot be pinged about a race in real-time.

**Falsifiable test (extends AC8):** `tests/coord/active-trigger-roundtrip.test.ts` — strategist invokes `coord_invoke(role=codex)`; assert wrapper PID spawned within 500ms; assert `coord:tick_start` atom appears within 1s; assert `coord:tick_end` atom appears after the wrapper completes; assert the entire roundtrip is observable via `coord_status()` as a closed correlation_id pair.

**AC1 — Narrow coord append seam (closes codex Q1 HIGH).**

The capture pipeline at `src/capture/gate.ts:57-72` rejects unknown source schemes; that's load-bearing for the capture surface and stays unchanged. Coord events take a SEPARATE path:

- **New MCP tool `coord_emit(event_type, payload, ...)` with per-tier discriminated input** (r4 codex F1 MED) at `src/mcp/tools/coord-emit.ts`. The tool is the ONLY entry point for writing coord atoms. The input contract depends on the event's tier (looked up in the registry at `src/coord/types.ts`):
  - **Round-tier events** (`reviewer_invoked`, `tick_start`, `tick_end`, `deadline_missed` when round-keyed): require `correlation_id: string (uuid4)`; reject if `tick_run_id` is supplied.
  - **Scheduler-tier events** (`scheduler_health`, `scheduler_health_done`): require `tick_run_id: string (uuid4)`; reject if `correlation_id` is supplied.
  - **Common required fields** for both tiers: `event_type` (registry), `emitted_at` (ISO-Z; daemon canonicalizes), `schema_version` (int). Optional: `payload` (event-specific), `expected_by` (ISO-Z; clamped per AC2).
  - Caller does NOT supply `source` — the daemon derives it server-side from caller identity per AC5.
  - AC8 includes a fixture `tests/coord/coord-emit-per-tier-input.test.ts` that calls `coord_emit` with each tier's required fields AND each tier's rejection cases.
- **Server-side processing:**
  - Validate `event_type` against the registry in `src/coord/types.ts`. Reject unknown types with structured MCP error.
  - Validate `schema_version` against the same registry. Reject unknown versions.
  - Canonicalize `emitted_at` timestamp using the same Bug-A-fix pattern as `src/capture/pipeline.ts:17-44` (UTC-Z normalization at append-time).
  - Mark `metadata.surface = "coord"` and `metadata.session_id = "echo:coord"` so memory tools can include/exclude coordination traffic explicitly via existing `exclude_metadata_surface` / `source_prefix` filters.
- **Storage path** goes through `src/storage/sqlite.ts`'s existing write path — no new SQLite handle, single-writer constraint preserved (per `wiki/architecture/storage.md:119-127`).
- **Non-pollution invariants** (load-bearing — guards against contaminating retrieval queries that aren't about coordination):
  - NO normalizer adapter registered in `src/normalize/dispatch.ts:11-46` for `coord:*` sources. Coord atoms bypass normalization, embedding, and clustering.
  - NO trace edges generated from coord atoms (verified by test at `src/trace/index.ts:69-83`).
  - `search_memories(source_prefix="coord:")` works (forensic retrieval); `search_memories()` without filter DOES NOT return coord atoms by default; **`wait_for_new_turns(source_prefix="coord:")` MUST return coord turn ids** (closes mailbox AC4). The three-way contract is load-bearing (r1 codex F6 MED): if a builder implements non-pollution by adding "coord" to a shared `withFsExclusion` helper at `src/mcp/util/fs-exclusion.ts:16-28`, the helper would filter coord atoms out of `wait_for_new_turns` TOO — breaking the mailbox the layer depends on. **Specific contract:** coord non-pollution lives in a DEDICATED filter at the `search-memories.ts` level (not the shared helper), conditioned on the absence of an explicit `source_prefix="coord:"`. `wait_for_new_turns` does NOT apply the coord-default-exclude. AC8 includes three explicit fixtures: (a) `search_memories()` returns 0 coord atoms; (b) `search_memories(source_prefix="coord:")` returns N coord atoms; (c) `wait_for_new_turns(source_prefix="coord:")` returns N coord turn ids. All three must pass.

**AC2 — Role-typed deadline config (closes codex Q2 MED).**

Deadline tracking IS policy. The split mirrors the `reviewers.json` + `combine.py` pattern from 043:

- **New file `tools/review-queue/coord-roles.json`** declares per-role-per-event-type defaults. **`name` matches the reviewer slug exactly** (`codex`, `codex-ops`, `claude`, `cursor`, etc. — same slugs as `reviewers.json:name`), so `coord_invoke(role=codex)` and `X-Echo-Role: codex` map to a single canonical entry (r1 codex F2 HIGH):
  ```json
  {
    "roles": [
      {
        "name": "codex",
        "headless": true,
        "invoke_command": "...{{REQUEST_PATH}}...{{CORRELATION_ID}}...",
        "events": {
          "reviewer_invoked": { "default_deadline_sec": 90,  "max_deadline_sec": 300,  "expects": "tick_start" },
          "tick_start":       { "default_deadline_sec": 600, "max_deadline_sec": 1200, "expects": "tick_end" }
        }
      },
      {
        "name": "codex-ops",
        "headless": true,
        "invoke_command": "...{{REQUEST_PATH}}...{{CORRELATION_ID}}...",
        "events": { "reviewer_invoked": {...}, "tick_start": {...} }
      },
      {
        "name": "cursor",
        "headless": false,
        "events": { ... }
      }
    ]
  }
  ```
  - `headless: true` is REQUIRED to be auto-invoked by `coord_invoke`. IDE-mode roles (`cursor`) MUST have `headless: false` and MAY omit `invoke_command`. The daemon refuses `coord_invoke(role=cursor)` with a structured error pointing at the paste-trigger path.
  - For each headless role, `events.reviewer_invoked` opens the pre-spawn deadline (r1 codex-ops F1 HIGH); `events.tick_start` opens the mid-tick deadline.
- **JSON schema** at `tools/review-queue/schemas/coord-roles.schema.json` validates the static config shape (string/int/bool types, required fields per `headless` value via JSON Schema `if/then`). The `max_deadline_sec > default_deadline_sec` cross-field constraint **cannot be expressed portably in draft-07 JSON Schema** (r1 codex F3 MED) — that check moves into a Python loader at `tools/review-queue/_coord_roles.py` (sibling of `_reviewers.py`), called by `coord-emit.ts`/`coord-invoke.ts` at daemon startup. The loader rejects `max_deadline_sec <= default_deadline_sec` with a clear error AND a startup-fixture in `tests/coord/coord-roles-validation.test.ts` asserts the bad-config case is rejected.
- **`coord_emit` clamps caller-supplied `expected_by`** to the role's `max_deadline_sec`. If caller omits `expected_by`, daemon applies `default_deadline_sec`. Per-event-type override possible; unbounded self-declaration impossible.
- **No reviewer role-specific code paths in the coord layer** — adding a new role is one JSON entry, mirroring 043's roster generalization.

**AC3 — Deadline tracker with reconstruction (closes codex Q3 HIGH).**

In-memory deadline tracker is volatile by design (low latency for the hot path); durability comes from atom-log replay on daemon boot:

- **`src/coord/deadlines.ts`** maintains TWO in-memory maps of open records, keyed by tier (r3 codex-ops F2 MED scheduler/round separation): **round-tier** keyed by `(correlation_id, subject_role, event_type, expected_by)`; **scheduler-tier** keyed by `(tick_run_id, subject_role, event_type, expected_by)`. Both maps follow the same close-then-open transition rule; an incoming event routes to the tier map matching its event_type's tier (per AC5 registry). **Generic transition rule (r2 codex F2 MED — was implicit, now explicit):** on EVERY incoming coord event `E`:
  1. **Close phase:** for each open record `R` matching `(correlation_id, subject_role)` AND whose configured `expects` value equals `E.event_type`, mark `R` as closed (in-memory delete; no `deadline_missed` will fire for it).
  2. **Open phase:** if `E.event_type` itself has a configured `expects` value in `coord-roles.json`, insert a new open record `(correlation_id, subject_role, E.event_type, expected_by)` where `expected_by = E.expected_by || event.default_deadline_sec from coord-roles.json`.
  Concretely: `reviewer_invoked` arrives → close phase finds nothing matching → open phase inserts (it has `expects: tick_start`); `tick_start` arrives → close phase finds the open `reviewer_invoked` record → marks closed → open phase inserts (it has `expects: tick_end`); `tick_end` arrives → close phase finds the open `tick_start` record → marks closed → open phase finds no `expects` for `tick_end` → no new record. A background heartbeat (1-second tick) fires `coord_emit(event_type="deadline_missed", correlation_id=X, subject_role=Y)` when `now > expected_by` AND no matching close has occurred.
- **Reconstruction on daemon boot:** scan recent `coord:*` atoms over the max-deadline horizon (24h is sufficient for V1 — extend if any role's `max_deadline_sec > 86400`). Replay the generic transition rule (close-then-open) over atoms in `emitted_at` order to rebuild the open-record set. Suppress any record with a matching completion atom OR an existing `coord:deadline_missed` atom with the matching idempotency key (per AC3 below). Immediately fire `deadline_missed` events for any record still open AND past `expected_by`. AC8 reconstruction fixtures cover BOTH overdue-`reviewer_invoked`-no-tick_start AND closed-`reviewer_invoked`-followed-by-tick_start to assert the generic rule handles the pre-spawn deadline correctly.
- **Idempotency key** in metadata (r1 codex F5 + codex-ops F3 MED convergent): `coord.idempotency_key = sha256(correlation_id + "|" + role + "|" + event_type + "|deadline_missed")`. Per-role-per-event-type — two reviewers under the same `correlation_id` who BOTH miss tick_end produce TWO distinct `deadline_missed` atoms (one per role), not one. Lookup mechanism: since `src/storage/interface.ts:50-62` `metadata_match` whitelist cannot query a nested `coord.idempotency_key` directly, the daemon scans recent `coord:deadline_missed` atoms over the max-deadline horizon at append-time (small set, in-memory side-cache OK for V1). If a future scale concern surfaces, extend `metadata_match` to include the key — defer that as V1.5+. AC8 includes a restart-test fixture covering two overdue records sharing one correlation_id.
- **Periodic reconciliation:** every 10 minutes the deadline tracker re-runs the reconstruction logic to catch any drift (defensive against in-memory state divergence).

**AC4 — Mailbox semantics + `wait_for_new_turns` widening (closes codex Q4 MED — reframe "push" claim; closes codex strategist 2026-05-16 substrate-consult finding on `source_prefix` gap).**

The v1 design's "second builder gets a push notification about race" was wishful thinking — `wait_for_new_turns` has no subscriber registry and reviewer wrappers exit between ticks. Reframe + one substrate widening:

- **Widen `wait_for_new_turns` with `source_prefix: string` optional input.** Current tool at `src/mcp/tools/wait-for-new-turns.ts:121-132,157-162` accepts `sources[]` (source-app-mapped names + literal exact sources) but NOT a prefix. AC4 adds a sibling parameter `source_prefix` (mutually exclusive with `sources[]`, OR additive — implementation chooses). Subscribers can then call `wait_for_new_turns(source_prefix="coord:")` to receive ALL coord events from ANY role without enumerating the role list. Backwards compatible: existing callers with `sources[]` see no behavior change.
- **Durable event log is the primary contract.** Every coord event is appended to the existing ledger; any role can `search_memories(source_prefix="coord:<peer>", since=<watermark>)` at any time to learn what its peers have done.
- **Live long-poll is the latency optimization for connected subscribers.** A role currently holding a `wait_for_new_turns(source_prefix="coord:")` connection gets events pushed within ~100ms of emission (per 030's existing semantics). Exited roles do NOT get events delivered — they learn on next invocation via the durable log.
- **No claim of push-to-stateless-roles.** The spec explicitly documents: "The second-builder-race-warning notification arrives the next time that builder is invoked, not in real time. If your use case requires immediate cross-process signaling to an exited peer, file as V2+." This bounds the V1 promise honestly.
- **No subscriber directory, no participant registry, no presence detection.** Group sessions stay as 030 shipped them — bag of events, anyone can read.

**AC5 — Identity + schema versioning + single-writer (closes codex Q5 HIGH).**

The MCP server at `src/mcp/server.ts:127-132` has host/DNS-rebinding protection — fine for read tools, insufficient for arbitrary `coord_emit` writes. AC5 adds:

- **Caller-identity → role mapping** at `src/coord/identity.ts`. Identity sourced from the existing wrapper environment (`REVIEWER_NAME`, `ECHO_AGENT_ID`, or future analog). For V1, accept identity via a header (`X-Echo-Role: <role>`) that the wrapper sets before invoking `coord_emit`. Server validates `<role>` is in `coord-roles.json`; rejects unknown roles. The daemon DOES NOT trust caller-supplied `source` — `source = coord:<server-derived-role>`.
- **V1 emission is SCOPED TO WRAPPER PATHS (curl-style HTTP) — native MCP clients do NOT emit in V1** (r1 codex F4 MED; r4 codex-ops F1 HIGH stale-text cleanup). The existing MCP server at `src/mcp/server.ts:103-136` handles tool calls per request but does NOT expose request headers to tool handlers; Cursor IDE-mode and other MCP-native clients have no canonical way to supply `X-Echo-Role`. V1 emission-path list is: codex/codex-ops/claude headless wrappers (`_run_reviewer.sh`) + `skills/review-queue-watch.md` watcher body when running under bash + `skills/review-pending.md` + `skills/merge-and-cleanup.md` post-push hooks. **`request.py` is NOT on this list** — its only coord-related responsibility is local UUID4 generation for `correlation_id`; zero MCP calls (per AC0 invariant). Cursor IDE-mode emission is **out of scope for V1** (defer to V1.5+). AC7's wording is tightened to reflect this. AC8 includes a "Cursor IDE-mode round runs to completion with no coord emission and 057 coord layer DOES NOT degrade the existing file-side flow" assertion.
- **Required event fields** on every `coord_emit` call (r3 codex-ops F2 MED — round-tier vs scheduler-tier distinguished):
  - **Round-tier events** (`reviewer_invoked`, `tick_start`, `tick_end`, `deadline_missed` when keyed to a round): `schema_version` (int), `event_type` (registry), `correlation_id` (uuid4 from `request.md`), `emitted_at` (ISO-Z), `role` (server-derives).
  - **Scheduler-tier events** (`scheduler_health`, `scheduler_health_done` from a wrapper that hasn't selected a candidate yet): same fields BUT `correlation_id` is REPLACED by `tick_run_id` (uuid4 generated by the wrapper at process-start; distinct from round correlation_id). Scheduler-tier events do NOT participate in round-tier deadline tracking. AC3's open-records map keys scheduler-tier records on `(tick_run_id, subject_role, event_type, expected_by)` — a SEPARATE keyspace from round-tier `(correlation_id, ...)`. A wrapper can have both open simultaneously (scheduler-tier `scheduler_health` AND round-tier `tick_start`) without collision.
  - Optional: `payload` (event-specific), `expected_by` (ISO-Z; clamped per AC2).
  - The schema registry at `src/coord/types.ts` declares each event_type's tier (round vs scheduler) so validation can route the required-fields check.
- **Schema-version registry** in `src/coord/types.ts`. Each event type carries a `schema_version` field. Consumers that encounter an unknown `event_type` or `schema_version` MUST ignore (forward-compat).
- **Single-writer constraint** preserved: all coord writes go through the existing `src/storage/sqlite.ts` write path (the same path capture events use). No parallel SQLite handle, no concurrent writer race.

**AC6 — Operator status surface (closes codex Q5 observability gap).**

The point of the layer is out-of-band health visibility — that requires an inspection surface:

- **New MCP read tool `coord_status()`** at `src/mcp/tools/coord-status.ts`. Returns:
  - Open deadlines: `[{role, event_type, correlation_id, expected_by, age_sec}...]`
  - Recent missed deadlines: last N `deadline_missed` events in last 1h
  - Per-role last-tick: `[{role, last_tick_start, last_tick_end, last_tick_duration_sec}...]`
  - Daemon uptime + reconstruction timestamp
- **CLI sibling `tools/coord-status.sh`** for non-MCP operator inspection (curl + jq against the daemon HTTP surface). Founder can run this from any terminal to see "is codex reviewer alive?" without opening Claude Code.
- **Both surfaces are read-only** — no mutate operations exposed via observability tools.

**AC7 — Existing roles emit coord events (integration scope).**

Roles START using `coord_emit` as part of their existing tick bodies. ALL integration is additive — no protocol changes, no behavior changes:

- **`tools/review-queue/_run_reviewer.sh`** uses a TWO-PHASE emission contract (r2 codex-ops F3 MED — distinguishes coord_invoke-spawned vs unattended-fallback ticks):
  - **Phase 1 — scheduler health tick (no correlation_id, no request scope):** at log-redirect-open, emit `coord:scheduler_health(subject_role=<slug>, tick_run_id=<uuid>)`. This is the wrapper saying "I started"; not tied to any review round. Has its own short `expects` cycle (default_deadline_sec ~120s; `expects: scheduler_health_done`). For coord_invoke-spawned ticks: the daemon's prior `coord:reviewer_invoked` atom for `correlation_id=R` already opened the round-scoped deadline; the scheduler_health tick is orthogonal.
  - **Phase 2 — request-scoped tick (correlation_id set):** AFTER Step 2 scans `backlog/reviews/*/r*/request.md` and selects a candidate, parse the request's `correlation_id` (if present from coord_invoke) and emit `coord:tick_start(subject_role, correlation_id)`. If no candidate selected (genuine "nothing to do"), emit `coord:scheduler_health_done` and exit. On candidate selection, the wrapper completes the review and emits `coord:tick_end(subject_role, correlation_id, verdict=...)` after the response file is committed + pushed, THEN emits `coord:scheduler_health_done` and exits.
  - **Unattended fallback**: launchd-fired ticks have no `coord_invoke` predecessor → no `correlation_id` flowing in → Phase 1 fires the scheduler_health tick, Phase 2 picks up `correlation_id` from the request.md itself (so coord_invoke-spawned and launchd-fallback rounds use the same correlation_id when they happen to select the same request).
  - Both phases emit via `curl --max-time 5 --connect-timeout 2 -X POST http://127.0.0.1:38478/mcp ... || true` per AC0 best-effort contract.
- **`skills/process-backlog.md`** binding-specific notes section gains "Emit coord:item_claimed after the atomic-claim push; coord:item_pushed after move-to-pending_review push" prose. Builder agents perform the emission as part of their existing protocol.
- **`skills/review-queue-watch.md`** emits `coord:round_combined` after `combine.py` returns successfully.
- **`skills/merge-and-cleanup.md`** emits `coord:merge_start` at Section A pre-flight, `coord:merge_complete` after final push.
- **Cursor IDE-mode reviewer (`skills/review-queue-cursor.md`) does NOT emit in V1** (r1 codex F4 MED clarification + AC5 V1 scope). The existing MCP server at `src/mcp/server.ts:103-136` does not expose request headers to tool handlers, so a native-MCP client like Cursor's Claude has no canonical path to supply `X-Echo-Role`. Rather than ship a partial identity model, V1 defers Cursor coord emission to V1.5+ along with the native-MCP identity path. Cursor's review cycle continues to operate on the existing file-side semantics (commit cursor.md → strategist watcher reads on next cron tick). 057 explicitly does NOT degrade this path.

If any role's existing skill/wrapper doesn't have a natural emission point, document the gap in `agent_notes` rather than forcing emission; partial coverage is fine for V1.

**AC8 — Falsifiable end-to-end test for today's silent-fail (closes the load-bearing motivation).**

A test that demonstrates the layer catches the exact failure mode that motivated 057:

- **`tests/coord/silent-fail-detection.test.ts`** — fixture sets up a fake reviewer wrapper that emits `coord:tick_start` with `expected_by: T+5sec`, then exits without emitting `coord:tick_end`. Test asserts: at `T+5sec+heartbeat`, a `coord:deadline_missed` atom appears with the correct `correlation_id` and `role`.
- **`tests/coord/append-seam.test.ts`** — covers AC1 + AC5: caller-supplied `source` is ignored; unknown `event_type` is rejected; unknown `schema_version` is rejected; identity-spoof attempt (missing `X-Echo-Role` header OR header value not in `coord-roles.json`) is rejected; canonicalized timestamp matches the capture pipeline pattern.
- **`tests/coord/deadlines-reconstruction.test.ts`** — daemon boot scenario: pre-seed SQLite with a `coord:tick_start` atom that's overdue; assert daemon emits `coord:deadline_missed` during boot reconstruction; assert idempotency (re-boot doesn't double-fire).
- **`tests/coord/identity-spoof-rejection.test.ts`** — explicit security-class test; caller attempts to emit with `source: "coord:codex"` from a `cursor` identity; assert rejection; assert no atom written.

These are MERGE-BLOCKERS — if any fail, the layer hasn't actually solved the problem.

**AC9 — Builder pointer per 046 AC1 + 047 AC3 + 055 AC4.**

Standard `backlog/task-state/<id>/builder.md` schema use, inherited from 046. No CAS, single-owner invariant holds.

## Out of Scope (Don't Drift)

- **No cross-machine coordination.** V1 is local-loopback only — daemon is `127.0.0.1:38478`. Cross-machine (multiple founder machines or paying-customer peer) is deferred to V2+ via a git-committed event log fallback. NATS / Redis / Kafka stay explicitly rejected per the brainstorm.
- **No active-coordinator policy.** The layer observes and delivers; the strategist (or any subscriber role) decides what to do. No auto-restart, no auto-escalate, no auto-release-stale-claim. Policy lives in skill prose where the strategist/founder can edit it without touching infra. Option (C) of the responsibility-level question was explicitly rejected.
- **No new write surface for capture events.** The capture pipeline at `src/capture/gate.ts` stays unchanged; coord writes are SEPARATE. The `coord_emit` MCP tool does not become a back door for arbitrary atom appends — it validates event_type against the registry and rejects everything else.
- **No reviewer/builder protocol changes.** All AC7 integrations are ADDITIVE. If the integration is too invasive for any role, partial coverage is fine — document the gap and ship anyway.
- **No Cursor IDE-mode emission requirement in V1.** Cursor's Claude SHOULD emit coord events when it ticks, but if the paste-driven flow doesn't fire emissions reliably, that's a V1.5+ followup, not a 057 merge-blocker.
- **No removal or modification of `wait_for_new_turns` EXISTING semantics.** AC4 ADDS one optional `source_prefix: string` input; existing `sources[]` behavior is unchanged. No breaking changes to current consumers (group-session subscribers continue to work byte-identically).
- **No removal of the existing launchd-based reviewer mechanism.** The coord layer ADDS visibility; it does NOT replace the polling-based reviewer dispatch. Both coexist.
- **No tests for partial-AC7 coverage.** AC7 says "if natural emission point missing, document and skip" — there's no AC asserting all 6 roles emit. Future hardening only.

## After Completion (Strategist Notes)

Post-merge wiki promotion:

- **Update `wiki/operating-model/review-queue-protocol.md`** (the diagram page) to add a "Coord layer overlay" section — same diagram with a new horizontal lane showing `coord_emit` arrows from each role into the daemon's coord-session, plus the strategist subscribing via `wait_for_new_turns(source_prefix="coord:")`.
- **New page `wiki/architecture/coord-layer.md`** — full design doc (event taxonomy registry, deadline tracker mechanics, identity model, mailbox-vs-push contract, operator status surface). Topic: Architecture. Subtopic: Coordination Layer.
- **Update `wiki/architecture/group-session.md`** to reference `echo:coord` as a sibling well-known group session (alongside the existing capture-event group sessions).
- **Update `wiki/operating-model/cross-tool-spec-review.md`** "Evidence base" with the 057 cycle as the canonical example of the brainstorm → codex strategist consult → revised-spec pattern (the 4-round brainstorm followed by codex's 5 HIGH/MED findings is a clean confirmation cycle of the cross-tool-strategist pattern, not just the cross-tool-reviewer pattern).
- **Update memory `project_friction_first_prioritization.md`** to reflect that the gate-lift criteria (b) — "every role is vendor-agnostic at ≥2 bindings" — gets a new dimension via 057's identity model. Bindings now have a typed coord-identity, not just an opaque writer.
- **Update `_followups.md` HIGH #1 launchd silent-fail entry** — mark CLOSED by 057's deadline-missed event coverage (specifically `tick_start` without `tick_end` within `default_deadline_sec` fires a `deadline_missed` atom the strategist can subscribe to).
- **Update `_followups.md` MED #6 watcher cron session-only entry** — partial close: 057 doesn't fix the session-only issue, but DOES give the founder visibility into whether the watcher's last tick fired (`coord:round_combined` events). Document the partial close.
- **Verification cycle dogfooding:** the 057 R1+R2 review cycle is itself a coord-layer test — the strategist runs the loop, and `coord_status()` should show codex/codex-ops tick_start/tick_end events the whole way through. If `coord_status()` returns empty during the 057 review cycle, AC7's emission integration is broken — re-open for fixup.
