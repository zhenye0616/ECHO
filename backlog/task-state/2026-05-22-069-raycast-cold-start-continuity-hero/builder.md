---
task_id: 2026-05-22-069-raycast-cold-start-continuity-hero
role: builder
writer: codex-builder
last_updated: 2026-05-22T20:42:15Z
---

## current_thesis

Claimed 069 as Codex builder. The task is to replace Raycast's over-approximating "Open loops · Today" landing section with a single confidence-gated Continue hero, backed by narrower rank signals for unresolved open loops and code/session anchoring.

## locked_decisions

- AC1 adds `has_unresolved_open_loop` and `code_session_anchor` to rank signals while preserving deprecated `has_open_loop` semantics for backwards compatibility.
- `has_unresolved_open_loop` is true only when at least one open-loop hint has `resolved === false`.
- `code_session_anchor` is true for repo/file/commit artifacts, any atom with `source.app === 'git'`, or at least three distinct apps in `source_breakdown`; `cluster_id` alone must not count as anchored.
- AC1b widens compact `rank_reason` passthrough only to `has_open_loop`, `has_unresolved_open_loop`, and `code_session_anchor`, preserving order and filtering future strings.
- AC2 replaces the Open-loops list with a zero-or-one Continue section: running sessions win; otherwise rank-0 cluster must be unresolved, fresh within 18h by `time_range.to`, and anchored by substrate reason or matching Raycast session `clusterId`.
- Hero text is `Continue: <label-or-Untitled work> · <N> open`; no atom-preview fallback or dominant file/repo suffix in V1.
- Raycast `findClusters()` must pass explicit 18h `since` plus `view: "compact"`.
- AC3 requires additive tests only: rank signal cases, compact rank-reason cases, Raycast MCP since case, and six hero decision-tree cases.

## open_questions

- None blocking at claim.

## dont_touch

- Do not edit `wiki/`, `docs/BACKLOG.md`, `docs/STATUS.md`, or `docs/NORTH_STAR.md`.
- Do not change ranking order or add additive ranking boosts.
- Do not add new MCP tools or new wire fields beyond the existing `rank_reason` strings.
- Do not remove `has_open_loop`; only mark it deprecated for V1+ UI use.
- Do not add dominant file/repo suffixes, atom preview fallback fetch paths, adaptive secondary grouping, frontmost-app CWD anchoring, personalization, visual polish, or configurable 18h tuning.
- Do not change existing sessions buckets, search bar, or EmptyView beyond replacing Resume/Open-loops with the Continue hero contract.

## canonical_anchors

- spec: backlog/claimed/2026-05-22-069-raycast-cold-start-continuity-hero.md
