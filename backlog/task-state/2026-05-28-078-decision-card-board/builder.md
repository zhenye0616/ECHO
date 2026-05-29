---
task_id: 2026-05-28-078-decision-card-board
role: builder
writer: codex-builder
last_updated: 2026-05-29T03:50:05Z
---

## current_thesis

Claimed 078 as Codex builder. Implement a daemon-owned `pending_decisions` projection and a Raycast `decisions` board that renders playbook-derived DecisionCards as read-only SEE+JUMP cards, with freshness warnings and A1-only alarm attributes.

## locked_decisions

- AC1: add `pending_decisions` as a deterministic MCP tool with required `repo_path`, `source_state` freshness, bounded non-interactive origin refresh, timeout handling, and zero LLM/agent subprocesses.
- AC2: isolate the ECHO review-playbook filesystem adapter in `decision-source-playbook.ts`; derive open cards only from active backlog dirs, latest `combined.md` frontmatter, and A1.
- AC3: implement only `runaway_churn`; count consecutive most-recent non-escalated rounds and reset on `escalated_to_founder: true`, never on `next_round`.
- AC4: add the Raycast `decisions` board with visible stale/dirty/partial banners, single-flight polling, teardown cleanup, and SEE+JUMP actions only.
- AC5: keep `DecisionCard` and `PendingDecisionsResult` playbook-agnostic; all combined.md/backlog knowledge stays in the source adapter.
- AC6: add only the `decisions` command, keep `echo` and `recap` unchanged, keep the extension at three or fewer commands, and document the board in the README.
- AC7: add daemon and Raycast tests for card predicates, A1, freshness, scan bounds, missing-field tolerance, board rendering, actions, polling, teardown, and MCP client shape; run daemon lint/typecheck/test plus Raycast typecheck/test.
- AC8: dogfooding evidence is post-merge validation; builder only ships the tool/board and README template.

## open_questions

- None blocking at claim. Escalate if implementation needs files outside the spec, a new dependency, a write path under `backlog/`, combine.py/watcher/coord-ledger changes, A2 alarm logic, or a caller-provided AbortSignal added to `mcp.ts`.

## dont_touch

- No SEE+ACT and no writes under `backlog/` from the tool or board.
- No `monitor` command, fourth command, separate extension, public positioning change, whole-computer overlay, ambient edge, LLM, or agent subprocess.
- No new coord event and no edits to the coord ledger, `combine.py`, or watcher logic.
- No recap deletion, recap fold, `recap` command changes, `echo` command changes, or inherited Raycast infrastructure rewrites.
- No multi-repo or multi-machine aggregation.
- No A2 non-converging-patch alarm, terminal-disposition field, or hot-path git fetch on the 5s board poll.
- Do not edit `wiki/**`, `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md`, or backlog item bodies.

## canonical_anchors

- spec: backlog/claimed/2026-05-28-078-decision-card-board.md
- reviews: backlog/reviews/2026-05-28-078-decision-card-board/
