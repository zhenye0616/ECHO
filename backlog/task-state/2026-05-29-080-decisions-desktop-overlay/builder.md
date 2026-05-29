---
task_id: 2026-05-29-080-decisions-desktop-overlay
role: builder
agent_id: codex-builder-080
branch: agent/decisions-desktop-overlay
last_updated: 2026-05-29T09:01:44Z
---

## current_thesis
Claimed item 080 for implementation as the desktop decisions overlay. Build must happen in the isolated `agent/decisions-desktop-overlay` worktree and stay scoped to a thin, read-only overlay consumer of `pending_decisions`, `coord_status`, and bounded in-flight backlog reads.

## locked_decisions
- Implement one self-contained `tools/echo-overlay/` package with its own manifest, tsconfig, lint, typecheck, and test scripts.
- J1 stack choice must be recorded in `tools/echo-overlay/README.md` with the reason and concrete transparent/always-on-top packaged-app configuration.
- Default AC4 path is client-side fleet-glance composition; do not add daemon `src/**` reads unless client composition cannot be done honestly without scraping.
- `repoPath` must resolve to an absolute path before `pending_decisions`; default is `~/Desktop/Project_echo`, absolute configured paths pass through, relatives surface a distinct invalid-path error.
- Ambient dot has three states: lit for fresh awaiting-founder cards, dark only for fresh zero-card reads, and neutral/unknown for stale or unreachable reads.
- Decision-dive renders the existing DecisionCard shape unchanged and provides SEE+JUMP only, with zero writes under `backlog/`.
- Tests must cover AC7(a)-(e), root checks must stay green, and packaged-app smoke must be automated or documented as a manual pre-merge checklist.
- AC8 is post-merge founder dogfooding; builder responsibility is the `**Surface:** Overlay` journal marker and README template only.

## open_questions
- None blocking at claim time. Escalate if J1 cannot be resolved from the spec refs, if client-side composition requires unbounded scraping, or if a dependency/file outside the spec becomes necessary.

## dont_touch
- Do not remove or fold in `tools/raycast-echo/`; Raycast removal is item 081.
- Do not add echo/recap retrieval, a feed, auto-pop, OS notifications, badge stream, or a chat/follow-up surface.
- Do not implement SEE+ACT or any write path under `backlog/`.
- Do not add coord events or modify the coord ledger, `combine.py`, watcher, or playbook adapter.
- Do not duplicate `pending_decisions`, add A2 alarms, build multi-repo/multi-machine aggregation, alter brand positioning, or introduce an LLM/agent subprocess.
- Do not edit `wiki/**`, `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md`, or backlog item body text.

## canonical_anchors
- spec: backlog/claimed/2026-05-29-080-decisions-desktop-overlay.md
