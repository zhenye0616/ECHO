---
task_id: 2026-05-14-048-process-backlog-builder-state-handoff-refresh
role: builder
writer: claude-code-builder
last_updated: 2026-05-14T09:32:01Z
handoff_branch: agent/process-backlog-builder-state-handoff-refresh
handoff_head_sha: f8869ed51000749e72828397d82665bcb41812b9
handoff_run_log: raw/internal/agent-runs/2026-05-14-2026-05-14-048-process-backlog-builder-state-handoff-refresh.md
---

## current_thesis

Claim of 048. Implementing `/process-backlog` final builder-state handoff so
`backlog/task-state/<task-id>/builder.md` is refreshed alongside the move to
`pending_review/`. Scope is narrow: a minimal patch helper plus the protocol
hook + mirror updates in `docs/AGENT_INSTRUCTIONS.md`. No CAS, no full
renderer, no backfill.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at f8869ed51000749e72828397d82665bcb41812b9.
<!-- builder-state-handoff:end -->

## locked_decisions

- AC1 patcher is stdlib-only Python at `tools/task-state/patch-builder-state.py`,
  matching the `lint.py` precedent. No PyYAML / jsonschema dependency.
- Patcher edits only staleness-prone fields. `locked_decisions` and
  `dont_touch` are preserved byte-for-byte; the spec's R2 disposition makes
  this load-bearing because rejected-alternative reasoning lives in
  `locked_decisions`.
- `current_thesis` marker block uses the patcher-owned tags
  `<!-- builder-state-handoff:start -->` / `<!-- builder-state-handoff:end -->`.
  Marker absent → append exactly one block. Marker present → replace from
  start-line through end-line exactly once. No sentence guessing.
- `open_questions`: empty body → insert the canonical fallback bullet (no
  markers); non-empty + complete → preserve byte-for-byte; non-empty +
  escalated → patcher-owned
  `<!-- builder-state-handoff-open-questions:start/end -->` block, same
  replace-once / append-once semantics.
- `canonical_anchors` is rewritten to schema-compliant `spec` (+ preserved
  `reviews`). Legacy `branch` / `worktree` / `run_log` / `head_sha` anchor
  keys are dropped — the shipped parser rejects unknown keys, and per AC1
  that handoff metadata now lives in frontmatter as `handoff_branch` /
  `handoff_head_sha` / `handoff_run_log`.
- Missing `builder.md` is a no-op (exit 0, no generic placeholder); malformed
  existing `builder.md` is fail-closed (exit 2, no rewrite). Both are
  validated by tests.
- AC2 wires the patcher into a protocol-wide named substep E2.5 in
  `skills/process-backlog.md`. The codex section now defers to E2.5 instead
  of carrying its own final-handoff logic. AC3 sync of
  `.claude/commands/process-backlog.md` is verified by
  `tools/sync-skills.sh --check` and asserted by
  `tests/backlog/process-backlog-skill.test.ts`.

## open_questions

- None blocking. All five ACs implemented; lint/typecheck/full vitest pass.

## dont_touch

- `wiki/` — strategist edits only, only post-shipment.
- `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md` — founder-owned.
- The role-typed task-state schema and required headings (Out of Scope).
- `tools/task-state/push-round-state.sh` — still `round-state.md`-only.
- CAS / blob-lease semantics for `builder.md` (single-owner invariant).
- Pre-046 task-state pointers — no backfill.
- Reviewer queue behavior, reviewer validation, merge-and-cleanup —
  unchanged.
- The agent run-log convention and `agent_notes` frontmatter shape.

## canonical_anchors

- spec: backlog/pending_review/2026-05-14-048-process-backlog-builder-state-handoff-refresh.md
- reviews: backlog/reviews/2026-05-14-048-process-backlog-builder-state-handoff-refresh/
