---
task_id: 2026-05-15-055-cursor-as-builder-paste-trigger
role: builder
writer: claude-code-builder
last_updated: 2026-05-15T23:41:34Z
handoff_branch: agent/cursor-as-builder-paste-trigger
handoff_head_sha: 064f1ee67cb721c9c001bcf4e16c04420261e3d1
handoff_run_log: raw/internal/agent-runs/2026-05-15-2026-05-15-055-cursor-as-builder-paste-trigger.md
---

## current_thesis

claim of 2026-05-15-055-cursor-as-builder-paste-trigger. Built by the Claude Code binding (the spec's AC5 explicitly allows a non-Cursor binding to claim the spec, deferring the Cursor-as-builder dogfooding proof to a 7-day post-merge window). Four deliverables land on `agent/cursor-as-builder-paste-trigger`: AC1 "Binding-specific notes — Cursor's Claude (IDE-mode)" section appended to `skills/process-backlog.md` after the existing codex section; AC2 verified clean by `tools/sync-skills.sh --check`; AC3 new `docs/cursor-builder-trigger.md` operator-facing recipe; AC4 this pointer. No protocol body changes, no wrapper, no schema changes.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at 064f1ee67cb721c9c001bcf4e16c04420261e3d1.
<!-- builder-state-handoff:end -->

## locked_decisions

- AC1 — new section appended at end-of-file, immediately after the existing "Binding-specific notes — codex" section's "### Other bindings" subsection. Section is level-2 (`## Binding-specific notes — Cursor's Claude (IDE-mode)`); subsections are level-3 mirroring codex's shape (Trigger mode / Serialization / atomic-claim race surface / `ECHO_AGENT_ID` / ECHO MCP / Reminder).
- AC1 — section explicitly states "at most one active Cursor builder per ECHO_AGENT_ID at a time" (operator-serialization rule), preserves the no-CAS single-owner invariant, and states no new lock primitive is introduced for Cursor.
- AC2 — both adapters re-synced via `tools/sync-skills.sh`; `--check` passes clean post-sync. Claude adapter is byte-identical; codex adapter body identical with codex-shaped frontmatter rewritten per the existing 049 contract.
- AC3 — operator doc is 47 lines (within ~30-60 target), sibling shape to `docs/review-queue-setup.md`. Contains the exact grep-asserted phrases `ECHO_AGENT_ID` and `one active Cursor builder per ECHO_AGENT_ID`. Verification uses `git show "origin/main:backlog/claimed/<id>.md"` (NOT tip-commit grep) per the spec's success-check note.
- AC4 — this pointer follows the 046 AC1 schema (five required L2 headings in order, body ≤ 120 lines). `canonical_anchors` written with schema-compliant `spec:` + `reviews:` keys per the `tools/task-state/patch-builder-state.py` contract (legacy `branch` / `head_sha` / `worktree` / `run_log` keys are dropped by the patcher at handoff so are omitted from the start). Patcher will rewrite `spec:` to `backlog/pending_review/<id>.md` at handoff time.
- AC5 — observational, deferred. Founder + strategist file the dated `055-AC5-cursor-builder-run-by` followup at merge time per the spec's "Durable reminder" clause.

## open_questions

- None blocking. AC1+AC2+AC3 all verifiable mechanically by the spec's `## Tests` block; AC4 verifiable by `tools/task-state/lint.py`.

## dont_touch

- `skills/process-backlog.md` protocol body — only the new binding-specific section is appended. Atomic-claim, worktree, push-with-retry, move-to-pending_review semantics stay verbatim per Out of Scope.
- No headless Cursor wrapper. No launchd plumbing. No `tools/backlog/run-cursor-builder.sh` equivalent — Cursor IDE has no `claude -p`-equivalent and a paste-trigger is the documented contract.
- No schema changes (`reviewers.json`, request/reviewer/combined JSON schemas) — the builder role is identified by which binding executes the skill, not by a roster file.
- No Claude-as-builder formalization — already works in-session as the implicit default; out of 055's scope.
- No automated cross-binding race detection — the atomic-claim git op is the only synchronization primitive. No new lock primitive.
- `wiki/`, `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md` — founder / strategist owned per `CLAUDE.md`.

## canonical_anchors

- spec: backlog/pending_review/2026-05-15-055-cursor-as-builder-paste-trigger.md
- reviews: backlog/reviews/2026-05-15-055-cursor-as-builder-paste-trigger/
