---
id: 2026-07-03-112-linear-status-backflow
title: "v0.1 status backflow — responder answers 'where is X?' from Linear read + eng capture, read-only, provenance-linked"
status: proposed
priority: HIGH
estimate: 2-3d
created: 2026-07-03
blocked_by: []
spec_refs:
  - backlog/complete/2026-07-01-109-granola-meeting-intake-bridge.md   # the v0/v0.1 split and the explicit proposal gate for this item
  - backlog/complete/2026-06-27-108-slack-linear-intake-gate.md        # the intake half this backflows from; Linear client + fail-closed create
  - backlog/complete/2026-06-18-103-ceo-context-loop-n2.md             # the responder + brain read loop this extends
  - raw/internal/decisions/2026-06-19-ceo-loop-reasoning-layer-and-decision-atoms.md  # brain-in-the-consumer architecture; retrieval-vs-synthesis deficits
  - raw/internal/decisions/2026-07-01-org-alignment-reframe.md         # the goal this item serves
  - src/surfaces/ceo-slack-responder/linear-client.ts                  # existing GraphQL client (write path today)
  - src/surfaces/ceo-slack-responder/brain.ts                          # headless-agent invocation this reuses
files_to_modify:
  # PROVISIONAL — finalized at ready-promotion.
  - src/surfaces/ceo-slack-responder/linear-client.ts   # add read queries: issue by key/search term, state, assignee, updatedAt, recent comments
  - src/surfaces/ceo-slack-responder/responder.ts       # route status-type questions to the backflow path
  - src/surfaces/ceo-slack-responder/brain.ts           # brain prompt/context assembly for status answers (Linear state + ECHO retrieval)
---

## Problem

The intake half is live: needs flow from meetings and Slack into Linear with a human confirm. The return half doesn't exist — when a PM/CEO asks "where is X?" in Slack, a human digs through Linear and pings eng. Linear state and eng capture (Codex/Claude/git atoms in ECHO) already jointly contain the answer. This is the v0.1 item that 109 deferred and explicitly queued.

**Proposal gate (109):** "once this ships and the first live meeting-sourced issue lands." Spec review must confirm the first live meeting-sourced issue has landed; if not, this item holds in proposed/.

## Design

Reuse the 103/106 pattern end to end: the responder detects a status-type question, invokes the headless brain with (a) read-only Linear state for candidate issues and (b) scoped ECHO retrieval (eng capture referencing the same artifacts), and posts a synthesized answer with provenance links. No new surface, no new store, no Linear writes.

## Acceptance Criteria

- **AC1 — Linear read path:** `linear-client.ts` gains read-only queries (issue by identifier, text search, state/assignee/updatedAt, recent comments). Token scope documented; the read path shares the client but adds zero mutation capability.
- **AC2 — question routing:** the responder classifies status-type questions ("where is X", "status of Y", "who's on Z") and routes them to the backflow path; non-status questions follow the existing flow unchanged, with tests for both.
- **AC3 — grounded answer:** the brain answers only from retrieved Linear state + ECHO atoms; the reply carries provenance (Linear issue URL; atom sources when eng capture contributed). If no confident match: an explicit "couldn't find" reply — never a confabulated status. Faithfulness failure mode is the one to test, not formatting.
- **AC4 — read-only invariant:** no code path in this item mutates Linear (test asserts no mutation operations are reachable from the backflow route).
- **AC5 — live smoke, journaled:** founder asks a real status question about a real issue in the intake channel; answer graded and journaled per dogfooding discipline.

## Out of Scope (Don't Drift)

- No Linear writes of any kind — the confirm-gated create from 108 is the only write path in the product.
- No proactive/ambient status posting (that is L2 territory) — the responder answers only when asked.
- No new capture sources; Linear remains read-at-query-time, never captured into the store.
- No new destination UI.

## After Completion (Strategist Notes)

- Update `wiki/surfaces/slack-linear-intake.md` (created post-109) with the backflow half; the page then covers the full round trip.
- Record first live-usage evidence in the dogfooding journal synthesis; this is the phase's definition-of-done metric.
