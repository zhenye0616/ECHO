---
id: 2026-05-13-046-context-fatigue-via-role-typed-state
title: Context fatigue via role-typed task-state — role-slot-agnostic orchestration viewed from the friction side (LAST friction-removal spec before vendor-agnostic pivot)
status: ready
priority: HIGH
estimate: 1.5-2d
created: 2026-05-13
requested_reviewers: ["codex", "codex-ops"]
spec_refs:
  - backlog/complete/2026-05-13-045-queue-reliability-friction-cluster.md  # Direct friction-cluster parent. 045 closed reviewer-queue + sidecar-handoff frictions; 046 closes the umbrella friction those individual fixes were chasing — every cold-start actor pays a full-corpus reload tax because role state has no canonical compact home.
  - raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md  # The decision that skills/ is the cross-tool collaboration protocol (not Claude-Code-specific). Frames roles-as-protocol-slots. 046 operationalizes that frame.
  - raw/internal/dogfooding/mcp-interactions-journal.md  # Three load-bearing entries: (a) 2026-05-13 16:25 PDT — cross-tool friction synthesis (claude reading codex's working notes); (b) 2026-05-13 16:30 PDT — session resume after /clear, ~3 MCP calls to re-establish context; (c) 2026-05-13 16:45 PDT — closed-loop event (codex reads prior codex strategist via ECHO). Empirical evidence for the friction this spec eliminates.
  - CLAUDE.md  # Operating-model + journal-discipline rules. Spec extends both.
  - backlog/README.md  # Pipeline doc. Spec extends with `backlog/task-state/<task-id>/` namespace and `task_state_ref:` schema field.
  - /Users/zhenye/.codex/sessions/2026/05/13/rollout-2026-05-13T16-14-31-019e239e-d270-71c0-be02-c55a53103bd5.jsonl  # Prior codex strategist session containing the canonical "roles are slots, clients are bindings" decomposition + the role/client_binding/runtime/skill/capabilities schema. Read this for the architectural backbone. Captured via ECHO; verified verbatim 2026-05-13 16:50 PDT.
  - skills/using-superpowers.md  # AC7 touch — cold-start primer must teach "read your role's task-state pointer first."
  - skills/process-backlog.md  # AC3 touch — builder skill reads/writes `task-state/<id>/builder.md`.
  - skills/review-pending.md  # Reference only — establishes that strategist owns the synthesis between rounds; reviewer ticks stay fresh-eyes.
  - skills/review-queue-codex.md  # Reference only — reviewer ticks MUST NOT consume `task-state/<id>/round-state.md`; fresh-eyes-at-SHA invariant preserved.
  - skills/review-queue-watch.md  # AC5 touch — watcher writes `round-state.md` at the round boundary (or strategist does, on disposition). Either is acceptable; spec picks one in AC body.
---

## Why this spec exists

**The umbrella friction.** Every cold-start actor in the ECHO operating model pays a full-corpus reload tax:

- **Strategist resume after `/clear`** burns N MCP calls + reads BACKLOG + CLAUDE.md + open backlog items + recent journal entries just to re-establish "where did we leave off." This session opened with exactly that pattern: 3 MCP calls + multi-atom reads + spec-status inventory before any real work began.
- **Reviewer ticks** re-load spec + ACs + prior rounds + reviewer schema + reviewer slash-command prompt every single tick, even though one tick is one bounded action. ~6–9 ticks per spec cycle × N reviewers = significant compound cost.
- **Cross-tool consults** (the codex consults during this brainstorm) require the orchestrator to hand-summarize state into each prompt. Without ECHO retrieval the consultee has no compact handoff; with ECHO retrieval the consultee still has to do its own signal-extraction from raw atoms.
- **Multi-round specs** (042–045 were 3–4 rounds each) require every actor to re-derive "what's already decided" from a growing-prose spec file + a chain of round artifacts.

**The diagnosis (cross-strategist convergence, 2026-05-13).** Both claude and codex strategists landed on the same root cause via independent reasoning and via ECHO-mediated retrieval of each other's working notes:

> Cold-start actors lack a compact **role-typed operational state** that tells them *which context matters right now, what mode they're in, what's already decided, what's open, and what must not be touched*. Current artifacts (specs, transcripts, journal, BACKLOG.md) are optimized for the eventual human reader; AI actors in-flow do the signal-extraction every time, from cold. The friction isn't volume — it's that every actor has to rediscover **which** context matters.

**Why this is the LAST friction-removal spec.** The cure shape — *role = (skill bundle, prompt, task-state pointer); bindings are interchangeable* — is structurally identical to what the planned vendor-agnostic ECHO pivot was going to require us to build anyway (prior codex strategist's `role/client_binding/runtime/skill/capabilities` decomposition, captured 2026-05-13 16:17 PDT). 046 ships the role/state primitive *now*, framed friction-first. Everything after 046 is *adding bindings* (cursor-claude, gemini, web-chatgpt, future tools) — not redesigning roles. The two specs collapse into one.

**Why `request.md` is NOT extended with reviewer state.** Codex strategist's catch, R3 consult: putting "what's decided in prior rounds" inside the reviewer request corrupts the fresh-eyes-at-SHA property that makes reviewer differentiation real. Reviewer requests carry only `artifact SHA, spec ref, requested lens` (today's shape — preserved). Multi-round synthesis belongs in `task-state/<id>/round-state.md`, consumed by **strategist / watcher / dispatcher** — not by reviewer ticks.

## Acceptance Criteria

**AC1 — Schema doc for role-typed task-state lives in `skills/` (canonical, cross-tool).**

- Create `skills/role-typed-task-state.md` documenting:
  - Filesystem layout: `backlog/task-state/<task-id>/{strategist,builder,round-state}.md`.
  - Required top blocks per pointer (in order): `current_thesis`, `locked_decisions`, `open_questions`, `dont_touch`, `canonical_anchors`. `round-state.md` adds `current_round: r<N>` as the first field after the header.
  - Hard line cap: 120 lines (target 40-60). The cap measures the file body excluding YAML frontmatter. Semantic framing in the doc body: **"working memory, not audit trail."**
  - Round evolution rule for `round-state.md`: rewritten in place at each round boundary. Old rounds remain canonical in `backlog/reviews/<task>/r<N>/{request,codex,cursor,codex-ops,combined}.md`. Pointer prunes superseded detail; only still-load-bearing prior decisions stay.
  - Writer responsibilities table (who writes what, when).
- Sync to `.claude/commands/role-typed-task-state.md` via `tools/sync-skills.sh` (existing infrastructure from 045's mid-cycle relocation).

**AC2 — CI lint enforces the 120-line hard cap + required top blocks.**

- New script `tools/task-state/lint.py` (Python, matching `tools/review-queue/` conventions: `validate.py`, `combine.py`, `request.py`). Walks `backlog/task-state/**/*.md`. For each file:
  - Body-line count ≤ 120 (frontmatter excluded). Hard fail above 120; warning at 80+ (soft-over-target zone breached). The 40–60 target zone is a doc convention, not a lint state.
  - Required top blocks present in correct order. `round-state.md` files additionally require `current_round:` as first field after the header.
  - Exit non-zero on any violation; print file + line + reason on stderr.
- Wire into `package.json` scripts (`npm run lint:task-state`, invoked via a thin Node wrapper that shells to `python3 tools/task-state/lint.py`). Add to the existing `npm run lint` aggregate so CI catches it without a separate command.
- Tests under `tests/task-state/lint.test.ts` (TypeScript, matching the existing `tests/review-queue/` pattern; spawns `python3 tools/task-state/lint.py` in fixtures): (a) under-cap pass, (b) over-cap fail with line count surfaced, (c) missing required block fail with field name surfaced, (d) wrong-order blocks fail, (e) frontmatter-only files pass (no body).

**AC3 — `backlog/ready/<id>.md` and `backlog/reviews/<task>/r<N>/request.md` schemas extended with optional `task_state_ref:` scalar.**

- Field shape: `task_state_ref: <task-id>` (a string; resolves to `backlog/task-state/<task-id>/`). Optional — existing items without it remain valid (backwards-compat).
- For `backlog/ready/`: add to the documented frontmatter schema in `backlog/README.md`. No automated migration of in-flight items (none today).
- For `backlog/reviews/.../request.md`: add to the reviewer-request schema validated by `tools/review-queue/validate.py`. **Reviewers MUST NOT consume `task_state_ref` from the request** (lint check in validate.py: warn if a reviewer response references the task-state pointer; fresh-eyes invariant preserved by social + lint).
- Per-round `request.md` MAY carry `task_state_ref:` so non-reviewer consumers (watcher, dispatcher, strategist) can find the pointer without scanning the parent backlog dir.

**AC4 — ECHO MCP ships `get_role_state` + `list_task_states`.**

- `get_role_state(task_id: string, role: 'strategist' | 'builder' | 'round-state') -> { content: string, last_updated: ISO8601, source_path: string, line_count: int }`.
  - Reads the file from disk at the current `main` HEAD; no caching for V1 (revisit if hot-path).
  - Returns isError if `task_id` resolves to no directory, or `role` file missing.
- `list_task_states({ role?: string, binding?: string, stage?: 'ready' | 'claimed' | 'pending_review' | 'complete' }) -> { task_states: Array<{ task_id, stage, roles_present: string[], task_state_ref_path, last_updated, canonical_anchors: { spec, reviews? } }> }`.
  - `stage` filter cross-references `backlog/<stage>/<id>.md` existence to determine current pipeline stage.
  - `role` filter narrows `roles_present` listing.
  - `binding` reserved for future use (no-op in V1; documented in schema so future bindings know the shape exists).
  - Empty `task_states: []` is valid (no isError).
- Tests under `tests/echo-mcp/role-state.test.ts` covering: (a) get returns content for existing file, (b) get returns isError for missing role file, (c) list filters by stage, (d) list returns empty array gracefully, (e) `binding` parameter accepted-but-unused without error.
- **NOT shipped in V1:** `upsert_role_state` (write surface). Filed as V2 follow-up. V1 rationale: write semantics deserve their own spec (atomic write, conflict-on-race, sync with FS, journal-write integration).

**AC5 — Read contract documented (FS path + MCP equivalence).**

- New section in `skills/role-typed-task-state.md` (and `.claude/commands/role-typed-task-state.md`): **"Read protocol — two equivalent paths"**:
  - **FS-capable bindings:** `git show <sha>:backlog/task-state/<task-id>/<role>.md` (or direct path read on `main`).
  - **MCP-capable bindings:** `get_role_state(task_id, role)` (single file) or `list_task_states(...)` (discovery).
  - Both MUST return identical content for the same task_id + role + SHA. Future transports (HTTP, gRPC, other) MUST implement the same contract.
- Document explicitly: **no implicit conversion** — pointer content is the on-disk byte stream verbatim; consumers parse the required top blocks themselves.

**AC6 — Journal-by-proxy rule added to `CLAUDE.md` + `skills/`.**

- New section in CLAUDE.md "Dogfooding journal discipline" subsection: **"Journal-by-proxy for read-only consultees"**:
  > A read-only consultee (e.g., `codex exec --sandbox read-only`, a subagent without write capability, or any future binding that lacks repo-write) MAY call ECHO MCP only if it immediately reports `tool name / inputs / returned shape / sources / verdict / note` to its orchestrator in the same turn. The orchestrator MUST journal the call in the same turn, attributed to the consultee (`Source agent: codex strategist (consulting; orchestrator-journaled by claude)`). The in-the-moment rule is NOT weakened.
- Same content cross-referenced in `skills/using-superpowers.md` (or successor cold-start primer) so non-Claude bindings see the rule.
- One worked example in the CLAUDE.md section: the journal entry shape from this spec's brainstorm session (`2026-05-13 16:45 PDT — closed-loop event`).

**AC7 — Cold-start primer teaches "read your role's task-state pointer first."**

- Edit `skills/using-superpowers.md`:
  - Add a top-level rule near the existing "Invoke relevant or requested skills BEFORE any response or action": **"If a `task_state_ref:` is in scope for your action (current backlog item, current review round, current strategist session resume), read the pointer FIRST via `get_role_state` or direct FS read."**
  - Add a short worked example: claude-strategist resuming after `/clear` reads its session's `task-state/<id>/strategist.md` instead of running broad `find_clusters` + `get_atoms` reconstruction.
- Sync to `.claude/commands/using-superpowers.md`.

**AC8 — Dogfooding measure: cold-start cost delta.**

- Acceptance criterion is observational, not pass/fail:
  - **Pre-046 baseline** is already in the dogfooding journal at `2026-05-13 16:30 PDT — session resume after /clear`: 3 ECHO MCP calls (1 × `find_clusters`, 2 × `get_atoms`) + ~110 atoms reachable in the rank-1 cluster (7 + 11 returned in budget after prefix-drop) + reads of CLAUDE.md, BACKLOG.md, and the pipeline state command before any productive work. Review_notes at merge time SHOULD link this baseline entry by date; review_notes does NOT need to re-capture it.
  - **Post-046 dogfooding:** within 1 week of merge, run a `/clear` session-resume on a strategist task that has a populated `task-state/<id>/strategist.md`. Measure: number of MCP calls + number of atom reads + number of broad-corpus file reads before the strategist begins productive work. Target: ≥50% reduction in cold-start ECHO MCP call count; ≥70% reduction in atom-body bytes consumed.
  - Post-046 measurement result lands in review_notes at merge time AND as a journal entry attributed to whoever ran the measurement.

## Out of Scope (Don't Drift)

- **Watcher role pointer.** Watcher already emits compact `combined.md` per round; its synthesis layer is the (a/b/c) post-combine state. Adding a separate `watcher.md` pointer would duplicate `combined.md`. If post-046 dogfooding shows watcher friction, file a successor item.
- **Reviewer-tick pointer / `reviewer.md`.** Proven design flaw during brainstorm (corrupts fresh-eyes-at-SHA). The `reviewer` role exists conceptually (in the role-slot taxonomy) but has **no task-state pointer file** in 046. Reviewers continue to read `request.md` (artifact SHA, spec ref, requested lens) and the spec at SHA.
- **`upsert_role_state` MCP tool (write surface).** V2 follow-up item. V1 ships read-only MCP. Pointer files are written by humans / strategist / builder via normal editor flow + git commit.
- **HTTP / non-MCP transport adapters.** Read contract is *documented* in AC5 so future transports know the shape; no transport is built in V1. Vendor-agnostic binding spec is post-046.
- **`history.md` overflow appendix.** Codex flagged "no inline appendix loophole" — if overflow becomes frequent, separate `history.md` lands in a successor. V1 forces compression.
- **Existing-item backfill.** No in-flight items today (backlog/ready and claimed are empty post-045). Existing complete/ items do not get retroactive `task_state_ref` or `task-state/<id>/` directories. The schema is forward-only.
- **Migration of dogfooding journal into role-state.** The journal stays the canonical cross-tool log; role-state pointers are working-memory snapshots. Do not collapse them.
- **Renaming any existing role (strategist/builder/reviewer/watcher).** The role-slot vocabulary is taken from prior codex strategist's verified-canonical schema; preserve it verbatim.
- **Adding skill-bundle / prompt / capabilities fields to a pointer.** Those are role-DEFINITION concerns (live in `skills/` and slash-command prompts). Pointer carries TASK-STATE only. Conflating the two is a smell.

## Definition of Done

- All 8 ACs implemented and verified.
- `npm run lint`, `npm run typecheck`, `npm test` all clean. `npm run lint:task-state` added and clean.
- `tools/sync-skills.sh --check` reports identity between `skills/role-typed-task-state.md` and `.claude/commands/role-typed-task-state.md`.
- At least one end-to-end dogfooding demonstration: write a `task-state/<this-spec-id>/strategist.md` populated during 046's own review cycle (recursive dogfooding); next reviewer / next strategist tick reads it via `get_role_state` and reports the cold-start cost delta in review_notes.
- AC8 measurement recorded in review_notes at merge time.
- 045-style review_notes block populated; merge happens via `/merge-and-cleanup` with founder approval at the two checkpoints.

## After Completion (Strategist Notes)

Once merged, the strategist must:

1. **Promote the role-slot vocabulary to `wiki/operating-model/role-slot-agnostic-orchestration.md`.** The prior-codex `role / client_binding / runtime / skill / capabilities` decomposition becomes a shipped operating-model wiki page. Mark `status: shipped`.
2. **Update `wiki/architecture/` with `task-state-pointer.md`** documenting the V1 schema + read contract + cap + journal-by-proxy. Status `shipped`.
3. **Update `.manifest.json` and regenerate `wiki/index.md` via `tools/wiki_index.py`.**
4. **Update `CLAUDE.md` "Operating Mode: Coordination System" section** to reference role-typed task-state as the cold-start primitive for each role. Frame it as "the V1 of vendor-agnostic ECHO; subsequent bindings extend this contract."
5. **File the V2 successor item** (`047-upsert-role-state` or similar) with the deferred write-surface MCP work. AC8 measurement data informs whether to prioritize it.
6. **Lift the friction-first prioritization gate.** Per founder direction 2026-05-13 ("046 will be the last round of friction removal spec before moving on to making echo agnostic to all vendors and tools"), the next item filed after 046 ships may be feature/architecture work. Update `project_friction_first_prioritization` memory entry accordingly.

## Risk Register

- **R1 — Cap-induced thrash.** A 120-line hard cap may force destructive pruning of load-bearing decisions during long multi-round cycles. Mitigation: AC8's dogfooding measurement is the empirical test. If thrash observed within 1 week of merge, file a successor item adding `history.md` overflow or raising the cap (NOT inline appendix — codex's "no loophole" rule holds).
- **R2 — Reviewer-tick contamination.** A future builder agent or strategist might mistakenly add reviewer-state prose inside `request.md` "for convenience," eroding fresh-eyes-at-SHA. Mitigation: AC3 validate.py lint warning; AC1 schema doc explicit prohibition; AC6 journal-by-proxy rule does NOT cover reviewer ticks (they remain fully fresh-eyes).
- **R3 — Vendor-agnostic premature concretion.** AC4's `binding` parameter is reserved but unused; AC5 read contract is documented but no second transport ships. Risk: the V1 shape constrains a future binding in a way we don't see yet. Mitigation: explicit "no second transport in V1"; the contract is observational (what FS + MCP do today), not prescriptive.
- **R4 — Pointer drift from reality.** A strategist updates the spec at SHA X but forgets to update the strategist.md pointer; a resumed strategist reads stale state. Mitigation: pointer is small (≤120 lines), so the cost of re-reading the spec to catch drift is low; AC7 primer teaches "if pointer feels stale, read the canonical anchor." V2 `upsert_role_state` may add a freshness signal.
- **R5 — Sync-skills double-edit during this cycle.** Per the 045 mid-cycle lesson (`skills/` vs `.claude/commands/` relocation absorbed via pre-merge fixup), edits to `skills/role-typed-task-state.md` MUST flow through `tools/sync-skills.sh` and MUST NOT be hand-edited in `.claude/commands/`. Mitigation: AC1 explicit "sync via tools/sync-skills.sh"; review_notes block calls out sync-skills compliance.
- **R6 — Recursive dogfooding scope creep.** AC8's "write task-state for 046 itself during 046's cycle" is recursive. Risk: the dogfooding becomes a new sub-spec. Mitigation: keep the dogfooding bounded — one strategist.md pointer for 046, populated by strategist between rounds, measured at merge. Not a deliverable; an observation.
