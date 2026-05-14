---
id: 2026-05-14-048-process-backlog-builder-state-handoff-refresh
title: Process-backlog builder-state handoff refresh — keep builder.md current when items move to pending_review
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-05-14
blocked_by: []
task_state_ref: 2026-05-14-048-process-backlog-builder-state-handoff-refresh
requested_reviewers: ["codex", "cursor"]
files_to_modify:
  - skills/process-backlog.md  # add protocol-wide final builder-state patch step
  - .claude/commands/process-backlog.md  # synced adapter copy from skills/
  - docs/AGENT_INSTRUCTIONS.md  # generic builder manual mirrors the protocol
  - tools/task-state/patch-builder-state.py  # minimal stale-anchor patch helper
  - tests/task-state/patch-builder-state.test.ts  # helper behavior tests
  - tests/backlog/process-backlog-skill.test.ts  # protocol text/sync assertions
spec_refs:
  - backlog/complete/2026-05-13-046-context-fatigue-via-role-typed-state.md  # parent task-state primitive and writer contract
  - backlog/complete/2026-05-13-047-codex-as-builder-binding-adapter.md  # first builder.md dogfooding cycle and stale-pointer evidence
  - skills/role-typed-task-state.md  # schema, writer responsibilities, initial pointer content
  - skills/process-backlog.md  # protocol body to patch
  - docs/AGENT_INSTRUCTIONS.md  # builder loop mirror
  - tools/task-state/lint.py  # pointer compliance check used by acceptance/tests

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

## Why this spec exists

046 made role-typed task-state the cold-start substrate for strategist, builder, watcher, and dispatcher roles. 047 was the first concrete `builder.md` dogfooding cycle and exposed a lifecycle hole: the writer contract says the builder refreshes the pointer on completion, but the actual `/process-backlog` handoff steps only stage `backlog/pending_review/` and the run log. The fix belongs in the protocol, not in reviewer memory.

This serves the current friction-first gate directly. It removes a recurring handoff correction from the founder/reviewer path and makes the builder role's working-memory pointer trustworthy for subsequent cold starts.

## Acceptance Criteria

### AC1 — Minimal builder-state patcher

- Add `tools/task-state/patch-builder-state.py`.
- The helper patches an existing `backlog/task-state/<task-id>/builder.md`; it does **not** render a fresh pointer body from CLI arguments.
- Required CLI shape:
  - `--task-id <id>`
  - `--outcome complete|escalated`
  - `--spec-path backlog/pending_review/<item>.md`
  - `--branch agent/<slug>`
  - `--head-sha <sha-or-empty>`
  - `--run-log raw/internal/agent-runs/<...>.md`
- Patch behavior:
  - Update frontmatter `last_updated` to the current UTC timestamp if frontmatter exists; preserve existing frontmatter keys and ordering.
  - Store non-anchor handoff metadata in frontmatter keys `handoff_branch`, `handoff_head_sha`, and `handoff_run_log`, updating existing keys if present or appending them after existing frontmatter keys if absent.
  - Patch only the `## current_thesis`, `## open_questions`, and `## canonical_anchors` blocks.
  - Preserve `## locked_decisions` byte-for-byte, because it carries builder-authored design choices and rejected alternatives that cannot be reconstructed from CLI args.
  - Preserve `## dont_touch` byte-for-byte, because it mirrors spec-specific drift boundaries.
  - In `## current_thesis`, never guess which existing sentence is a lifecycle sentence. Instead, append or replace a patcher-owned marker block:
    `<!-- builder-state-handoff:start -->` / `<!-- builder-state-handoff:end -->`, containing the complete/ready-for-review or escalated-for-founder-input lifecycle note.
  - In `## open_questions`, preserve existing non-empty builder-authored content. If the block is empty or whitespace-only, insert `- None blocking; handed off for review.` for `complete`, or `- See agent_notes and run log for the escalation question.` for `escalated`. If `outcome=escalated` and the block is non-empty, append or replace a patcher-owned marker bullet instead of overwriting the existing question.
  - In `## canonical_anchors`, keep the block schema-compliant with `skills/role-typed-task-state.md`: write only `spec` and, if already present, `reviews`. `spec` must point to `backlog/pending_review/<item>.md`; this is the staleness-prone 047 failure mode. Unknown keys such as `branch`, `run_log`, `head_sha`, and `worktree` must not remain in `canonical_anchors`; the named handoff metadata belongs in frontmatter.
- If `builder.md` is missing, the helper exits 0 with a clear no-op message and does not create a generic placeholder pointer. This lets `/process-backlog` remain compatible with items that set `task_state_ref` before the builder has adopted `builder.md`.
- If `builder.md` exists but is malformed or lacks required blocks, the helper exits non-zero and does not create a generic replacement pointer. The builder escalates rather than silently erasing working memory.
- After patching, `python3 tools/task-state/lint.py <path>` passes.
- No CAS or blob-lease logic. `builder.md` is still single-writer state; the helper edits the builder-owned file and lets the existing `/process-backlog` commit/push flow carry it.

### AC2 — `/process-backlog` final handoff calls the patcher

- Update the protocol body in `skills/process-backlog.md`, not only the codex binding-specific notes.
- Add a named handoff substep before the final `git add ... && git commit -m "review: <item-id>"` / escalation commit:
  - Detect builder-state scope if `task_state_ref:` is non-empty in the item frontmatter OR `backlog/task-state/<task-id>/builder.md` already exists.
  - After `ensure_stage "$(basename $ITEM_FILE)" "pending_review"` and after the agent fills `head_sha`, `pr_url`, and `agent_notes`, call `tools/task-state/patch-builder-state.py`.
  - Pass `--spec-path backlog/pending_review/<item>.md`.
  - Pass `--outcome complete` for successful handoff and `--outcome escalated` for blocked/uncertain handoff.
  - Run `python3 tools/task-state/lint.py "backlog/task-state/<task-id>/builder.md"` immediately after patching.
  - Stage `backlog/task-state/<task-id>/builder.md` in the same final handoff commit as the pending-review item and run log.
- The step must be idempotent for semantic content: rerunning handoff updates only the timestamp plus the same lifecycle/anchor fields, and does not create a second pointer path or rewrite `locked_decisions`.
- This protocol-wide step is the only canonical implementation site. Binding-specific sections may reference it, but must not duplicate their own final-handoff patch logic.

### AC3 — Codex binding notes defer to the protocol-wide final step

- Update the existing `skills/process-backlog.md` codex-specific `builder.md` section so it does not imply the final handoff refresh is codex-only.
- Keep codex-specific details that still matter: `danger-full-access`, wrapper invocation, single-owner direct commits, and no `push-round-state.sh` for `builder.md`.
- Make the final handoff row point to the new protocol-wide patcher step.
- Sync `.claude/commands/process-backlog.md` from `skills/process-backlog.md` with `tools/sync-skills.sh`.

### AC4 — Builder manual mirrors the protocol

- Update `docs/AGENT_INSTRUCTIONS.md` so the generic builder loop mentions final `builder.md` refresh whenever `task_state_ref` is in scope or a builder pointer exists.
- The manual must say this happens before the move-to-`pending_review` commit is pushed, and that lint failure is a hard stop requiring escalation rather than silently shipping stale state.

### AC5 — Tests cover the helper and protocol hook

- Add `tests/task-state/patch-builder-state.test.ts` covering:
  - complete handoff patches `spec` from `backlog/claimed/<item>.md` to `backlog/pending_review/<item>.md`, writes `handoff_head_sha` in frontmatter, keeps `canonical_anchors` schema-compliant, and passes `tools/task-state/lint.py`;
  - complete handoff appends/replaces only the patcher-owned `current_thesis` marker block and preserves the existing multi-sentence implementation summary;
  - complete handoff preserves non-empty `open_questions` byte-for-byte;
  - escalated handoff appends/replaces escalation-oriented patcher-owned lifecycle/open-question markers, preserves `locked_decisions` byte-for-byte, and passes lint;
  - missing `builder.md` exits 0 as a no-op without creating a generic replacement pointer;
  - malformed existing `builder.md` exits non-zero without creating a generic replacement pointer. Required malformed fixtures: missing `## canonical_anchors` and required headings out of order.
  - invalid `--outcome` exits non-zero without writing misleading state.
- Add `tests/backlog/process-backlog-skill.test.ts` covering:
  - `skills/process-backlog.md` contains the named final builder-state refresh step;
  - that step names `task_state_ref`, existing `builder.md`, `patch-builder-state.py`, `backlog/pending_review/`, and `tools/task-state/lint.py`;
  - `.claude/commands/process-backlog.md` is byte-identical to `skills/process-backlog.md` after sync.
- Existing `npm run lint`, `npm run typecheck`, and targeted Vitest tests pass.
- `tools/sync-skills.sh --check` passes.

## Out of Scope (Don't Drift)

- Do not change the role-typed task-state schema or required headings.
- Do not generalize `tools/task-state/push-round-state.sh`; it is still only for multi-writer `round-state.md`.
- Do not add CAS/lease semantics for `builder.md`.
- Do not backfill old items' missing or stale pointers.
- Do not replace builder-authored `locked_decisions` with generic helper output.
- Do not modify wiki pages; promotion happens only after this item lands in `complete/`.
- Do not change reviewer queue behavior, reviewer validation, or merge-and-cleanup.
- Do not redesign the agent run-log convention or `agent_notes` frontmatter.

## Risks

- **R1 — Patcher might miss stale prose outside anchors.** The 047 failure was stale anchors/stage framing, not stale design content. Acceptance limits the patcher to frontmatter handoff metadata, schema-compliant anchors, and patcher-owned lifecycle markers so it preserves working memory. If later dogfooding shows body prose routinely goes stale too, file a separate item with evidence.
- **R2 — Malformed existing pointers can block handoff.** That is intentional when a pointer exists. A generic replacement would hide the real loss of builder-authored context; the correct behavior is escalation with a clear lint/helper error. Missing pointers are different: they are a no-op for compatibility, not a malformed-state replacement.
- **R3 — Timestamp changes make byte-for-byte full-file idempotence impossible.** Semantic idempotence is the contract: repeated runs preserve `locked_decisions` and converge the same anchors/lifecycle fields while refreshing `last_updated`.
- **R4 — Helper scope could drift into a general pointer editor.** Keep it builder-handoff-specific. `round-state.md` still uses the CAS helper; strategist and watcher pointers are out of scope.
- **R5 — Canonical anchor cleanup may remove legacy non-schema anchor keys.** That is deliberate. The parser accepts only `spec` and optional `reviews`; branch/run-log/head-sha metadata must live in frontmatter until a separate schema-expansion item exists.

## Tests

- `tests/task-state/patch-builder-state.test.ts` covers complete, escalated, malformed pointer, missing-pointer no-op, invalid outcome, required-block preservation, schema-compliant anchors, marker idempotence, and task-state lint compatibility.
- `tests/backlog/process-backlog-skill.test.ts` covers the protocol text hook and skill adapter byte identity.
- Verification commands: targeted Vitest files above, `npm run lint`, `npm run typecheck`, `tools/sync-skills.sh --check`, and `python3 tools/blocked.py`.

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
