---
id: 2026-07-03-114-intake-bridge-hardening
title: "Intake-bridge hardening for real traffic — 109's queued follow-ups as one batch (store-driven retry, terminal-key skip, packaging import chain, config-error wrap, owner-pick determinism)"
status: proposed
priority: HIGH
estimate: 1-2d
created: 2026-07-03
blocked_by: []
spec_refs:
  - backlog/complete/2026-07-01-109-granola-meeting-intake-bridge.md  # source of all five follow-ups; AC2/AC6 contracts these harden
  - backlog/_followups.md                                             # the queued entries this item drains
  - backlog/complete/2026-07-02-110-packaged-daemon-brain-boundary.md # the import-closure guard the packaging fix extends
files_to_modify:
  # PROVISIONAL
  - src/enrich/granola-intake-candidates.ts   # terminal-key skip; config-error wrap; owner-pick determinism
  - src/enrich/  (seed store module)          # store-driven retry from seedStore.list()
  - tests/enrich/                             # coverage for each
  - tests/packaging/                          # import-chain guard extension
---

## Problem

109 shipped with five explicitly queued follow-ups, one flagged "fast-follow before real traffic." Doubling down on the team loop means real traffic is the point of this sprint — so the batch lands now, before v0.1 backflow (112) increases usage.

## Acceptance Criteria

- **AC1 — store-driven retry:** non-terminal seed records are retried from `seedStore.list()` on each worker run, not dependent on the classifier re-emitting the candidate within the lookback window. Test: a `posting`-stuck record with its note outside lookback still retries to `posted`/`failed`.
- **AC2 — terminal-key skip:** notes whose candidate keys are all terminal are not re-classified (no repeated LLM cost every 10-min pass). Test asserts zero brain invocations for such a note.
- **AC3 — packaging import chain:** the 110 import-closure guard covers the `dist/enrich → dist/surfaces/ceo-slack-responder` chain (same ERR_MODULE_NOT_FOUND class as the planned 108 fix); packed install cannot crash on the excluded-module import.
- **AC4 — config-error wrap:** `ECHO_GRANOLA_INTAKE_OWNER_MAP` parse errors surface as `GranolaIntakeConfigError` at startup (fail closed, operator-visible); a JSON typo cannot crash the daemon mid-run.
- **AC5 — owner-pick determinism + observability:** owner selection is deterministic when multiple attendees map to Slack users (documented rule, e.g. first-by-sorted-email); accepted-seed-but-Linear-unconfigured logs at warn, not debug.

## Out of Scope (Don't Drift)

- No behavior changes to classification quality, seed message format, or the 108 gate.
- No new config surface beyond the error wrap.
- Strictly the five queued follow-ups; anything else discovered goes back to `_followups.md`.

## After Completion (Strategist Notes)

- Remove the drained entries from `backlog/_followups.md`.
- Note in the 109 wiki page (slack-linear-intake) that the at-least-once retry contract is now store-driven.
