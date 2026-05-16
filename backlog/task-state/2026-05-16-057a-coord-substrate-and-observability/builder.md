---
task_id: 2026-05-16-057a-coord-substrate-and-observability
role: builder
writer: claude-code-builder
last_updated: 2026-05-16T08:41:53Z
handoff_branch: agent/coord-substrate-and-observability
handoff_head_sha: 09782a46154d651d7a9a006c0745e4c3123aa328
handoff_run_log: raw/internal/agent-runs/2026-05-16-2026-05-16-057a-coord-substrate-and-observability.md
---

## current_thesis

claim of 2026-05-16-057a-coord-substrate-and-observability. Spec ships the daemon-side coord substrate (read/write/track/report) decomposed from 057 after r5 plateau, then iterated 057a r1-r8. AC1 narrow coord append seam (coord_emit + types registry + identity), AC2 role-typed deadline config (coord-roles.json + TS loader + ajv), AC3 deadline tracker (serial mutation lane + two-tier maps + full-ledger replay at boot), AC4 wait_for_new_turns source_prefix widening, AC5 X-Echo-Role identity + schema versioning, AC6 coord_status MCP + CLI, AC7 no-op in 057a (production emission lives in 057b), AC8 ~18 synthetic-emitter test files (each merge-blocking incl. coord-volume-perf.test.ts at 100k atoms <1500ms boot / <300ms coord_status), AC9 builder.md (this file).

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at 09782a46154d651d7a9a006c0745e4c3123aa328.
<!-- builder-state-handoff:end -->

## locked_decisions

- AC list locked at claim (frontmatter id stable; spec body 273 lines; estimate 2-2.5d). All 9 ACs are merge-blocking with the exception of AC7 (deliberate no-op).
- Storage seam shape locked from r4: two methods only — `iterateCoordAtomsByAppendOrder({ sinceSeq?, limit? })` half-open `[sinceSeq, +∞)` + `getCurrentCoordSequence()` returning `max(rowid)` over `source LIKE 'coord:%'`. The r3 third method `getCoordSequenceAtOrAfter(timestamp)` was dropped at r4 because timestamp-order semantics cannot compose with append-order replay under skewed emitted_at. SqliteStorage backs `sequence_id` with `rowid`; MemoryStorage uses a monotonic insertion counter.
- Boot reconstruction algorithm = full ledger replay (V1), gated by `getCurrentCoordSequence()` snapshot at task start. r3's 24h `emitted_at` horizon was dropped at r4 (unsafe under skew); V1 substrate volume is small enough (<3k atoms/day under 057b) that full-scan-at-boot is cheap.
- Deadline tracker is a single-actor serial async mutation lane. Event ingest, heartbeat, boot reconstruction, periodic reconciliation all enqueue onto one ordered queue. Reads (coord_status) take a structural copy off the lane.
- `fireMissedDeadline` is the ONLY function that appends `coord:deadline_missed`. Cache-hit branch is ALSO terminal: when the idempotency cache says "already fired," the open-records map entry is STILL removed (r2 codex-ops F1 HIGH — restart-after-fired must not show stale open record).
- Slot universe (AC6 last-miss) derived ONLY from `coord-roles.json` `role.events.<event_type>.expects` — NOT from `src/coord/types.ts` registry. Single source of truth (r5 codex F1 MED).
- V1 perf-fixture is the operational contract: `tests/coord/coord-volume-perf.test.ts` synthesizes 100k coord atoms and asserts boot reconstruction <1500ms + one `coord_status()` <300ms. NO runtime warning mechanism in V1 (r5 warning patch rejected at r6 — both bugs argued against shipping warning at V1).
- ajv@^8 + ajv-formats@^3 added to package.json as direct runtime deps (r2 codex F2 MED — repo currently has no JS JSON-Schema validator). Bad-config = daemon-startup throw, not per-request error (r1 codex F4 MED).
- `subject_role` policy is registry-driven (r1 codex F1 HIGH): self-attestation events (tick_start, tick_end, scheduler_health, scheduler_health_done) require `subject_role == emitter_role`; invocation events (reviewer_invoked, tick_failed_to_bind) allow `subject_role != emitter_role` as long as `subject_role` is in coord-roles.json.

## open_questions

- Session-budget fit: spec is 2-2.5d / 40 files / new external dep; Claude Code session boundaries likely force escalation before full convergence. Resume path: the shared `~/.echo/agent-id` UUID (78D5AB0F-A8A3-4F01-BC2E-EB05961B2405) is recognized by codex-builder + Cursor's Claude on this machine, so handoff is one founder invocation away if pressure builds. If escalating mid-spec, ensure the run log captures per-AC state with verbatim test output for whatever was attempted.

<!-- builder-state-handoff-open-questions:start -->
- See agent_notes and run log for the escalation question.
<!-- builder-state-handoff-open-questions:end -->

## dont_touch

- NO `coord_invoke` MCP tool (057b ships that).
- NO `_run_reviewer.sh` edits (057a leaves wrapper emission untouched).
- NO `request.py` edits (no `correlation_id` field added in 057a; lives in 057b).
- NO skill-side post-push hooks in `review-queue-watch.md` / `review-pending.md` / `merge-and-cleanup.md` (057b adds those).
- NO cross-machine support (V1 local-loopback only).
- NO active-coordinator policy (observe + report only).
- NO Cursor IDE-mode emission (deferred to V1.5+).
- NO new write surface for capture events (`src/capture/gate.ts` stays unchanged).
- NO edits to `wiki/`, `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md`.

## canonical_anchors

- spec: backlog/pending_review/2026-05-16-057a-coord-substrate-and-observability.md
