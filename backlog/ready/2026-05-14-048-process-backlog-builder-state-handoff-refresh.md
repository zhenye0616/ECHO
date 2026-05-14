---
id: 2026-05-14-048-process-backlog-builder-state-handoff-refresh
title: Process-backlog builder-state handoff refresh — keep builder.md current when items move to pending_review
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-05-14
blocked_by: []
task_state_ref: ""
requested_reviewers: ["codex", "cursor"]
files_to_modify:
  - skills/process-backlog.md
  - .claude/commands/process-backlog.md
  - docs/AGENT_INSTRUCTIONS.md
  - tools/task-state/write-builder-state.py
  - tests/task-state/write-builder-state.test.ts
  - tests/backlog/process-backlog-skill.test.ts
spec_refs:
  - backlog/complete/2026-05-13-046-context-fatigue-via-role-typed-state.md
  - backlog/complete/2026-05-13-047-codex-as-builder-binding-adapter.md
  - skills/role-typed-task-state.md
  - skills/process-backlog.md
  - docs/AGENT_INSTRUCTIONS.md
  - tools/task-state/lint.py

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Process-backlog builder-state handoff refresh

## What

Make `/process-backlog` refresh `backlog/task-state/<task-id>/builder.md` as part of the final handoff commit whenever an item has role-typed builder state in scope. The 047 merge proved the gap: the builder wrote a valid `builder.md`, then moved the item to `pending_review/` while the pointer still described the claimed-stage state. `/review-pending` caught the stale pointer, but that is exactly the friction the task-state primitive is supposed to remove.

## Why

046 made role-typed task-state the cold-start substrate for strategist, builder, watcher, and dispatcher roles. 047 was the first concrete `builder.md` dogfooding cycle and exposed a lifecycle hole: the writer contract says the builder refreshes the pointer on completion, but the actual `/process-backlog` handoff steps only stage `backlog/pending_review/` and the run log. The fix belongs in the protocol, not in reviewer memory.

This serves the current friction-first gate directly. It removes a recurring handoff correction from the founder/reviewer path and makes the builder role's working-memory pointer trustworthy for subsequent cold starts.

## Acceptance Criteria

### AC1 — Deterministic builder-state renderer

- Add `tools/task-state/write-builder-state.py`.
- The helper writes `backlog/task-state/<task-id>/builder.md` with the five required blocks from `skills/role-typed-task-state.md`, in order:
  - `## current_thesis`
  - `## locked_decisions`
  - `## open_questions`
  - `## dont_touch`
  - `## canonical_anchors`
- Required CLI shape:
  - `--task-id <id>`
  - `--outcome complete|escalated`
  - `--spec-path backlog/pending_review/<item>.md`
  - `--branch agent/<slug>`
  - `--head-sha <sha-or-empty>`
  - `--run-log raw/internal/agent-runs/<...>.md`
- Completion output says the item is complete and ready for review, and points readers to `agent_notes` plus the run log for acceptance/test detail.
- Escalation output says the item is escalated for founder input, and points readers to `agent_notes` plus the run log for the blocker.
- `canonical_anchors` includes at least `spec`, `branch`, `run_log`, and `head_sha` when provided.
- The rendered body is comfortably under the 80-line soft target and passes `python3 tools/task-state/lint.py <path>`.
- No CAS or blob-lease logic. `builder.md` is still single-writer state; the helper only renders the file and lets the existing `/process-backlog` commit/push flow carry it.

### AC2 — `/process-backlog` final handoff calls the renderer

- Update the protocol body in `skills/process-backlog.md`, not only the codex binding-specific notes.
- Add a named handoff substep before the final `git add ... && git commit -m "review: <item-id>"` / escalation commit:
  - Detect builder-state scope if `task_state_ref:` is non-empty in the item frontmatter OR `backlog/task-state/<task-id>/builder.md` already exists.
  - After `ensure_stage "$(basename $ITEM_FILE)" "pending_review"` and after the agent fills `head_sha`, `pr_url`, and `agent_notes`, call `tools/task-state/write-builder-state.py`.
  - Pass `--spec-path backlog/pending_review/<item>.md`.
  - Pass `--outcome complete` for successful handoff and `--outcome escalated` for blocked/uncertain handoff.
  - Run `python3 tools/task-state/lint.py "backlog/task-state/<task-id>/builder.md"` immediately after rendering.
  - Stage `backlog/task-state/<task-id>/builder.md` in the same final handoff commit as the pending-review item and run log.
- The step must be idempotent: rerunning the handoff re-renders the same final pointer for the same inputs and does not create a second pointer path.

### AC3 — Codex binding notes defer to the protocol-wide final step

- Update the existing `skills/process-backlog.md` codex-specific `builder.md` section so it does not imply the final handoff refresh is codex-only.
- Keep codex-specific details that still matter: `danger-full-access`, wrapper invocation, single-owner direct commits, and no `push-round-state.sh` for `builder.md`.
- Make the final handoff row point to the new protocol-wide renderer step.
- Sync `.claude/commands/process-backlog.md` from `skills/process-backlog.md` with `tools/sync-skills.sh`.

### AC4 — Builder manual mirrors the protocol

- Update `docs/AGENT_INSTRUCTIONS.md` so the generic builder loop mentions final `builder.md` refresh whenever `task_state_ref` is in scope or a builder pointer exists.
- The manual must say this happens before the move-to-`pending_review` commit is pushed, and that lint failure is a hard stop requiring escalation rather than silently shipping stale state.

### AC5 — Tests cover the helper and protocol hook

- Add `tests/task-state/write-builder-state.test.ts` covering:
  - complete handoff pointer renders the required blocks, anchors `backlog/pending_review/<item>.md`, and passes `tools/task-state/lint.py`;
  - escalated handoff pointer renders an escalation thesis/open-question shape and passes lint;
  - invalid `--outcome` exits non-zero without writing a misleading pointer.
- Add `tests/backlog/process-backlog-skill.test.ts` covering:
  - `skills/process-backlog.md` contains the named final builder-state refresh step;
  - that step names `task_state_ref`, existing `builder.md`, `write-builder-state.py`, `backlog/pending_review/`, and `tools/task-state/lint.py`;
  - `.claude/commands/process-backlog.md` is byte-identical to `skills/process-backlog.md` after sync.
- Existing `npm run lint`, `npm run typecheck`, and targeted Vitest tests pass.
- `tools/sync-skills.sh --check` passes.

## Out of Scope (Don't Drift)

- Do not change the role-typed task-state schema or required headings.
- Do not generalize `tools/task-state/push-round-state.sh`; it is still only for multi-writer `round-state.md`.
- Do not add CAS/lease semantics for `builder.md`.
- Do not backfill old items' missing or stale pointers.
- Do not modify wiki pages; promotion happens only after this item lands in `complete/`.
- Do not change reviewer queue behavior, reviewer validation, or merge-and-cleanup.
- Do not redesign the agent run-log convention or `agent_notes` frontmatter.

## Definition of Done

- All ACs implemented.
- `npm run lint` clean, including task-state lint.
- `npm run typecheck` clean.
- Targeted tests for the new helper and process-backlog skill pass.
- `tools/sync-skills.sh --check` clean.
- Builder run log includes before/after evidence that the final handoff stages a current `builder.md` when builder-state scope exists.

## After Completion (Strategist Notes)

- Update operating-model wiki pages that describe role-typed task-state or process-backlog handoff, if they exist by then.
- Mark the 047 `_followups.md` entry "`/process-backlog` should refresh `builder.md` at end-of-cycle" as resolved with this merge SHA.
- Watch the next item that has `task_state_ref` set: reviewer should not need to fix a stale `builder.md` during `/review-pending`.
