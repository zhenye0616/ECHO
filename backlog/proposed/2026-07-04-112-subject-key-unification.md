---
id: 2026-07-04-112-subject-key-unification
title: "Subject-key unification — one shared normalizer, one metadata key (canonical_subject) across Granola signals and team decisions"
status: proposed
priority: HIGH
estimate: 0.5-1d
created: 2026-07-04
blocked_by: []
spec_refs:
  - raw/internal/decisions/2026-07-04-seam-v0-decision.md          # decisions 4, 18 — the join-key rule this implements
  - raw/internal/decisions/2026-07-03-loop-gap-analysis.md          # finding 3: the fractured join key
  - raw/internal/decisions/2026-07-03-loop-gap-analysis-station-evidence.md  # station 2/6 citations
files_to_modify:
  # PROVISIONAL
  - src/util/subject.ts                                # NEW: shared normalizeSubject
  - src/enrich/granola-signals.ts                      # consume shared normalizer (drop local copy)
  - src/surfaces/ceo-slack-responder/decision-store.ts # consume shared normalizer; write canonical_subject
  - tests/enrich/                                      # cross-source key-equality coverage
  - tests/surfaces/ceo-slack-responder/                # decision-store write/read coverage
---

## Problem

The station-6 drift join key is fractured: `normalizeSubject` (src/enrich/granola-signals.ts:368) and `normalizeDecisionSubject` (src/surfaces/ceo-slack-responder/decision-store.ts:54) are byte-identical duplicated functions writing to two different metadata keys — `canonical_subject` on signal atoms, `normalized_subject` on team-decision atoms. A cross-source subject join (drift sweep, `loop` filtering in 113) has no single key to join on, and decision subjects are invisible to `search_memories` free-text (which matches `metadata.canonical_subject` only).

## Acceptance Criteria

- **AC1 — one normalizer:** a single shared module (`src/util/subject.ts`, exporting `normalizeSubject`) with the exact current behavior (lowercase, trim, collapse whitespace). Both former call sites import it; the duplicated local functions are deleted. Test: identical output to the previous implementations across a fixture set including unicode/whitespace edge cases.
- **AC2 — decisions write canonical_subject:** `appendConfirmedDecision` additionally writes `metadata.canonical_subject` (same normalized value). `normalized_subject` is still written (backcompat), and the `team-decision:<normalized>` `dedupe_key` format is byte-for-byte unchanged — latest-wins chains over existing atoms must not break. Test: new decision atom carries both keys with equal values; `dedupe_key` unchanged vs a pre-change fixture.
- **AC3 — cross-source join works:** a Granola signal atom and a team-decision atom sharing a subject are retrievable by the same key: `search_memories` free-text query on the subject now matches decision atoms, and `metadata_match: {canonical_subject: ...}` (in-tool signal-filter path) returns both. Test proves both retrieval paths.
- **AC4 — legacy atoms still readable:** `queryLatestTeamDecisions` and `matchesQuery` resolve pre-change decision atoms (which lack `canonical_subject`) exactly as before — read-side falls back to `normalized_subject`. Test: mixed-generation store returns a correct latest-wins result.

## Out of Scope (Don't Drift)

- No alias table, no semantic/embedding matching, no shared-vocabulary enforcement between extractor prompts.
- No change to the `dedupe_key` formats of either source.
- No MCP tool schema changes and no `METADATA_MATCH_KEY_WHITELIST` (storage-level) changes — the in-tool filter path suffices.
- No migration/rewrite of existing atoms (append-only store; read-side fallback covers them).

## After Completion (Strategist Notes)

- Note the unified key on the storage/architecture wiki page post-shipment.
- 113's `loop` filter spec references `canonical_subject` as the one key — confirm at review that no second key survives anywhere in `src/`.
