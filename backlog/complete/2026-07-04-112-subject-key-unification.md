---
id: 2026-07-04-112-subject-key-unification
title: "Subject-key unification — one shared normalizer, one metadata key (canonical_subject) across Granola signals and team decisions"
status: proposed
priority: HIGH
estimate: 0.5-1d
created: 2026-07-04
claimed_by: "builder-112"
claimed_at: "2026-07-04T19:45:31Z"
branch: "agent/subject-key-unification"
head_sha: "658f3d22102062a61be4e1ce785b72fbd24ad5fd"
pr_url: ""
agent_notes: |
  Implemented AC1-AC5. Shared src/util/subject.ts normalizeSubject replaces both
  duplicated locals; appendConfirmedDecision now writes canonical_subject
  (==normalized_subject), dedupe_key byte-stable; search_memories metadata_match
  {canonical_subject} falls back to normalized_subject ONLY for team-decision
  atoms. Two reviewer flags: (1) AC5 scoping uses metadata.decision_atom_type===
  "team_decision" (the spec-permitted equivalent) instead of importing
  TEAM_DECISION_SOURCE from the ceo-slack-responder surface, because that import
  breaks the packed CLI import-closure invariant (tests/packaging/import-closure).
  (2) Updated tests/packaging/packed-manifest.test.ts inline snapshot (+2 sorted
  dist/util/subject.* lines) as the forced mechanical consequence of the new
  shipped file; it is outside files_to_modify. Verify: 3 AC files 80/80;
  serialized product suite 1617 passed / 0 failed; tsc clean; eslint 0 warnings.
review_notes: |
  Merged on 2026-07-04 via founder-authorized pipeline run (strategist-operated,
  founder green-lit the full 112→113→114 build+merge loop).

  Conflicts resolved:
  - none — --no-ff merge applied clean, as the sidecar predicted.

  C3.5 cross-vendor consult: none invoked

  Fixups applied:
  - none required in code. The sidecar's single pre-merge gate (shell-reachable
    full-suite failure) was resolved pre-merge as environmental flake: test
    passes in isolation on clean origin/main AND on the branch AND in the
    post-merge merger worktree; fails only under full-suite daemon-port load.

  Fixups deferred to follow-up items:
  - none

  Verify: full suite run twice post-merge — run 1: 1885/1886 (single failure =
  shell-reachable daemon-port flake, passes isolated); run 2: 1886/1886 all
  green. Lint, typecheck, coupled-invariants, sync-skills --check all clean.

  Follow-up items (non-blocking):
  - tests/cli/shell-reachable.test.ts is flaky under full-suite load — test-hardening candidate.
  - Strategist post-shipment: note unified canonical_subject on wiki/architecture/storage.
  - 113 build: confirm loop filter treats canonical_subject as sole forward join key.
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
  - src/mcp/tools/search-memories.ts                   # AC3 retrieval locus (in-tool metadata_match/free-text filter); AC5 legacy read-side fallback
  - tests/enrich/                                      # cross-source key-equality coverage
  - tests/surfaces/ceo-slack-responder/                # decision-store write/read coverage
  - tests/mcp/tools/                                   # search-memories cross-source join + legacy-fallback coverage
ready_content_sha: da5fcf2188e3249756217d7288071a43050b7b4d77e8fd89ad939f5f21b65427
---

## Problem

The station-6 drift join key is fractured: `normalizeSubject` (src/enrich/granola-signals.ts:368) and `normalizeDecisionSubject` (src/surfaces/ceo-slack-responder/decision-store.ts:54) are byte-identical duplicated functions writing to two different metadata keys — `canonical_subject` on signal atoms, `normalized_subject` on team-decision atoms. A cross-source subject join (drift sweep, `loop` filtering in 113) has no single key to join on, and decision subjects are invisible to `search_memories` free-text (which matches `metadata.canonical_subject` only).

## Acceptance Criteria

- **AC1 — one normalizer:** a single shared module (`src/util/subject.ts`, exporting `normalizeSubject`) with the exact current behavior (lowercase, trim, collapse whitespace). Both former call sites import it; the duplicated local functions are deleted. Test: identical output to the previous implementations across a fixture set including unicode/whitespace edge cases.
- **AC2 — decisions write canonical_subject:** `appendConfirmedDecision` additionally writes `metadata.canonical_subject` (same normalized value). `normalized_subject` is still written (backcompat), and the `team-decision:<normalized>` `dedupe_key` format is byte-for-byte unchanged — latest-wins chains over existing atoms must not break. Test: new decision atom carries both keys with equal values; `dedupe_key` unchanged vs a pre-change fixture.
- **AC3 — cross-source join works:** a Granola signal atom and a team-decision atom sharing a subject are retrievable by the same key through `src/mcp/tools/search-memories.ts`: a `search_memories` free-text query on the subject now matches decision atoms (via `metadata.canonical_subject`), and `metadata_match: {canonical_subject: ...}` (the in-tool signal-filter path, `canonical_subject` already in the tool's in-tool filter set) returns both. Writing `canonical_subject` on decision atoms (AC2) is the primary mechanism; the retrieval path is not expected to change for new atoms. The builder owns `search-memories.ts` for AC5's legacy fallback and may adjust the filter there if the AC3 test proves the new-atom path is not already satisfied. Test proves both retrieval paths return signal + new decision atom.
- **AC4 — legacy atoms still readable (decision-store path):** `queryLatestTeamDecisions` and `matchesQuery` resolve pre-change decision atoms (which lack `canonical_subject`) exactly as before — read-side falls back to `normalized_subject`. Test: mixed-generation store returns a correct latest-wins result.
- **AC5 — legacy decision atoms stay findable by the join key (search path):** the in-tool `metadata_match: {canonical_subject: ...}` filter in `search-memories.ts` also returns pre-change decision atoms that carry only `normalized_subject` — a read-side fallback matching `normalized_subject` for team-decision atoms when filtering by `canonical_subject`. **Scoping predicate (required):** the fallback fires ONLY for team-decision atoms, identified by `event.source === 'derived:team-decisions'` (the `TEAM_DECISION_SOURCE` constant exported from `decision-store.ts`; equivalently `metadata.decision_atom_type === 'team_decision'`). It MUST NOT be a generic "any atom whose `metadata.normalized_subject` equals the filter value" rule — a signal atom or any other source carrying `normalized_subject` must never satisfy a `{canonical_subject}` filter via this fallback. Legacy decision atoms retain this `source` (unchanged by AC2), so the predicate reaches them. This is the search-path twin of AC4: without it, a `canonical_subject` drift/`loop` (113) query silently omits every decision atom predating this change (the recurring source-omission failure mode). Scope is the structured `metadata_match` filter only; free-text `query` matching over legacy decision atoms is out of scope (see below). No storage-whitelist or schema change — the fallback lives in the in-tool filter predicate. Test: a store with one legacy decision atom (only `normalized_subject`) and one new decision atom (both keys) both return for a single `metadata_match: {canonical_subject}` query.

## Out of Scope (Don't Drift)

- No alias table, no semantic/embedding matching, no shared-vocabulary enforcement between extractor prompts.
- No change to the `dedupe_key` formats of either source.
- No MCP tool schema changes and no `METADATA_MATCH_KEY_WHITELIST` (storage-level) changes — the in-tool filter path suffices. AC5's legacy fallback is a behavior change to the in-tool `metadata_match` filter predicate only, not a schema or whitelist change.
- No change to `search_memories` free-text (`query`) matching semantics: free-text still matches `metadata.canonical_subject` only. Legacy decision atoms (predating this change, no `canonical_subject`) are reachable via the structured `metadata_match` fallback (AC5), not by free-text — that is the drift/`loop` consumer path. Going forward all new decisions carry `canonical_subject` and are free-text findable. Broadening free-text to also scan `normalized_subject` would touch shared behavior for all atom types and is deferred.
- No migration/rewrite of existing atoms (append-only store; read-side fallback covers them).

## Tests

Concrete files and load-bearing assertions (extend existing files; add new cases, don't rewrite):

- **AC1 — `tests/enrich/granola-signals.test.ts`:** `normalizeSubject` imported from `src/util/subject.ts` produces byte-identical output to the two former local implementations across a shared fixture set (lowercase, trim, collapse-whitespace, plus unicode/leading-trailing/interior-whitespace edge cases). Assert the duplicated local functions no longer exist (import-only).
- **AC2 (dedupe byte-stability) — `tests/surfaces/ceo-slack-responder/decision-store-latest-wins.test.ts`:** a new `appendConfirmedDecision` atom carries both `metadata.canonical_subject` and `metadata.normalized_subject` with equal values. Pin a **byte-stable pre-change fixture**: assert `decisionDedupeKey(subject)` for a representative subject equals the exact literal `team-decision:<normalized>` string (e.g. assert against a hardcoded expected string, not a recomputation), so any drift in the `team-decision:` prefix or normalization is caught. Latest-wins chain over a pre-existing atom with the same `dedupe_key` still supersedes correctly.
- **AC4 (legacy decision-store fallback) — `tests/surfaces/ceo-slack-responder/decision-store-latest-wins.test.ts`:** a **mixed-generation store fixture** — one legacy atom carrying only `normalized_subject`, one new atom carrying both keys — resolves via `queryLatestTeamDecisions`/`matchesQuery` to the correct latest-wins result, proving the read-side `normalized_subject` fallback.
- **AC3 + AC5 — `tests/mcp/tools/search-memories.test.ts`:** (AC3) `metadata_match: {canonical_subject: S}` returns both a Granola signal atom and a new decision atom sharing subject `S`; a free-text `query` on `S` returns the new decision atom. (AC5, positive) a `metadata_match: {canonical_subject: S}` query against a store containing one legacy decision atom (only `normalized_subject`) and one new decision atom returns BOTH, proving the in-tool filter's `normalized_subject` fallback for team-decision atoms. (AC5, **negative — required**) a store containing a NON-team-decision atom (e.g. a signal atom, or any `source !== 'derived:team-decisions'`) that carries `metadata.normalized_subject === S` and NO `canonical_subject` must NOT be returned by `metadata_match: {canonical_subject: S}` — proving the fallback is scoped to team-decision atoms and the drift/`loop` path cannot silently over-include unrelated atom types.

## After Completion (Strategist Notes)

- Note the unified key on the storage/architecture wiki page post-shipment.
- 113's `loop` filter spec references `canonical_subject` as the one key — confirm at review that `canonical_subject` is the only forward cross-source join key. `normalized_subject` intentionally survives, but ONLY for team-decision backcompat: it is still written by `appendConfirmedDecision` (AC2) and read as the decision-store + search-path read-side fallback for pre-change atoms (AC4/AC5). It is not a second join key and no new writer/reader should treat it as one.
