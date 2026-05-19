---
task_id: 2026-05-17-061-doc-leanout
role: builder
writer: codex-builder
last_updated: 2026-05-19T04:37:10Z
handoff_branch: agent/doc-leanout
handoff_head_sha: 1d0b8840327946964d0817541878df3e0fda2954
handoff_run_log: raw/internal/agent-runs/2026-05-18-2026-05-17-061-doc-leanout.md
---

## current_thesis

Claimed 061 as Codex builder. The task is operating-model doc-surface leanout: remove committed raw/internal HTML twins, freeze and shard the MCP journal, add zero-MCP-call journal skip policy, convert exactly one completed backlog item to the new stub/archive pattern, remove one stale local worktree, repair review-queue setup docs, delete stale STATUS, and append the TZ-offset retrieval bug to followups.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at 1d0b8840327946964d0817541878df3e0fda2954.
<!-- builder-state-handoff:end -->

## locked_decisions

- AC1: delete committed generated `raw/internal/**/*.html` twins while preserving `raw/internal/dogfooding/journal-style.html`; add the `.gitignore` guard and keep a local-only pandoc recipe in `CLAUDE.md`.
- AC2: rename the monolith journal to `mcp-interactions-journal-archive-through-2026-05-17.md`; create current shard `mcp-interactions-journal-2026-05.md`; update canonical path references in `CLAUDE.md`.
- AC3: add the zero-MCP-call skip-rule policy in `CLAUDE.md` only; do not edit reviewer queue skills for this rule in this spec.
- AC4: create `backlog/archive/README.md`; archive exactly `backlog/complete/2026-04-30-001-repo-bootstrap.md` into `backlog/archive/shipped/2026-04/`; leave a <=15-line stub; add the wiki-promotion stub step to `skills/merge-and-cleanup.md`.
- AC5: only remove `.claude/worktrees/laughing-shaw-952357/` and delete branch `claude/laughing-shaw-952357` if the worktree is clean.
- AC6: update `docs/review-queue-setup.md` to the current reviewer ephemeral-worktree recipe and delete `docs/STATUS.md`.
- AC7: append only the specified TZ-offset retrieval bug section to `backlog/_followups.md`.

## open_questions

- Review caveat: broad `mcp-interactions-journal.md` references remain in historical/OoS files and in review-queue skill prose that AC3 explicitly excluded. Current policy surfaces (`CLAUDE.md`, `AGENTS.md`, new shard) are updated; reviewers should decide whether review-queue skill prose needs a followup.

## dont_touch

- No bulk migration of the remaining `backlog/complete/` items.
- Do not archive `backlog/reviews/`.
- Do not build new tools, scripts, automation, hooks, or CI gates.
- Do not fix the ECHO timezone-offset bug.
- Do not add pagination/streaming retrieval work.
- Do not rewrite `docs/README.md`, `docs/NORTH_STAR.md`, or any wiki pages.
- Do not edit the archive journal after rename.
- Do not change journal entry templates or the hotkey-overlay 7-field variant.
- Do not remove the `.claude/worktrees/` `.gitignore` entry.
- Do not add extra `_followups.md` entries beyond AC7.
- Do not edit `skills/review-queue-*.md` or change the review queue protocol/backlog state machine.

## canonical_anchors

- spec: backlog/pending_review/2026-05-17-061-doc-leanout.md
