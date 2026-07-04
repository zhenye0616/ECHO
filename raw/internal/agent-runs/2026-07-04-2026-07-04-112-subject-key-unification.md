---
backlog_item: 2026-07-04-112-subject-key-unification
agent_run_started: 2026-07-04T19:45:31Z
agent_run_ended: 2026-07-04T20:14:19Z
status: ready_for_review
test_status: passing
branch: agent/subject-key-unification
head_sha: 658f3d22102062a61be4e1ce785b72fbd24ad5fd
claim_sha: ee8aa848bafe9aa97cc0cc321d0840c21a1a0d08
---

# Agent Run: Subject-key unification

## What I Implemented

Unified the fractured drift join key into one shared normalizer and one forward
cross-source metadata key (`canonical_subject`) across Granola signal atoms and
team-decision atoms.

- New shared module `src/util/subject.ts` exporting `normalizeSubject`
  (lowercase, trim, collapse whitespace) — byte-identical to the two former
  local implementations.
- `src/enrich/granola-signals.ts` and
  `src/surfaces/ceo-slack-responder/decision-store.ts` now import the shared
  normalizer; their duplicated local functions (`normalizeSubject`,
  `normalizeDecisionSubject`) are deleted.
- `appendConfirmedDecision` additionally writes `metadata.canonical_subject`
  (== `normalized_subject`); `normalized_subject` and the byte-stable
  `team-decision:<normalized>` dedupe_key are unchanged.
- `src/mcp/tools/search-memories.ts` gains a read-side fallback: an in-tool
  `metadata_match: {canonical_subject}` filter also matches legacy team-decision
  atoms (those carrying only `normalized_subject`), scoped strictly to
  team-decision atoms.

## Files Modified

- `src/util/subject.ts` — created (shared `normalizeSubject`)
- `src/enrich/granola-signals.ts` — import shared normalizer, delete local copy
- `src/surfaces/ceo-slack-responder/decision-store.ts` — import shared
  normalizer, delete `normalizeDecisionSubject`, write `canonical_subject` (AC2)
- `src/mcp/tools/search-memories.ts` — AC5 scoped legacy fallback in
  `metadataValue`
- `tests/enrich/granola-signals.test.ts` — AC1 coverage
- `tests/surfaces/ceo-slack-responder/decision-store-latest-wins.test.ts` — AC2 + AC4
- `tests/mcp/tools/search-memories.test.ts` — AC3 + AC5 (positive + negative)
- `tests/packaging/packed-manifest.test.ts` — inline-snapshot bump (see Decision 2)

Branch: `agent/subject-key-unification`  head_sha:
`658f3d22102062a61be4e1ce785b72fbd24ad5fd`

## Decisions Made During Implementation

### Decision 1: AC5 scoping discriminator — `decision_atom_type` metadata, not a surface import
- **Options considered:** (A) import `TEAM_DECISION_SOURCE` from
  `decision-store.ts` and match `event.source`; (B) match
  `metadata.decision_atom_type === 'team_decision'` (the spec's stated
  equivalent).
- **Chose:** B.
- **Why:** Option A makes shipped `dist/mcp/tools/search-memories.js` import the
  ceo-slack-responder surface, which is NOT in the packed CLI/MCP closure —
  `tests/packaging/import-closure.test.ts` fails on it (verified: it flagged
  exactly that broken import). AC5 explicitly names
  `metadata.decision_atom_type === 'team_decision'` as the equivalent
  discriminator; it keeps the tool layer inside its packed closure and reaches
  legacy atoms (which carry `decision_atom_type`, predating item 112).
- **Worth founder review?** Yes — a spec-permitted equivalent chosen over the
  spec's primary phrasing to preserve the packaging invariant. Behavior is
  identical for all team-decision atoms; the negative test proves non-team-
  decision atoms with `normalized_subject` are never over-included.

### Decision 2: `tests/packaging/packed-manifest.test.ts` snapshot bump (outside files_to_modify)
- **Options considered:** (A) update the pinned packed-manifest inline snapshot
  to include the new `dist/util/subject.{js,d.ts}`; (B) escalate because the
  file is not in `files_to_modify`.
- **Chose:** A.
- **Why:** AC1 requires creating `src/util/subject.ts` (a listed file); it
  compiles into the shipped package, so the pinned manifest MUST reflect it or
  CI fails. This is a mechanical, forced consequence — not scope expansion. The
  delta is exactly the two sorted `dist/util/subject.*` lines. Flagging here per
  the "modify a file not listed in files_to_modify" rule.
- **Worth founder review?** Low-stakes; noted for transparency.

## Acceptance Criteria Status

- [x] **AC1** — one shared normalizer; both call sites import it; duplicated
  locals deleted. Test asserts byte-identical output to both former impls across
  unicode/whitespace fixtures + import-only. Passing.
- [x] **AC2** — decisions write `canonical_subject == normalized_subject`;
  `normalized_subject` kept; `team-decision:<normalized>` dedupe_key pinned
  byte-for-byte against a hardcoded literal; latest-wins chain intact. Passing.
- [x] **AC3** — a Granola signal + a new team decision sharing a subject both
  return for `metadata_match {canonical_subject}`; free-text query returns the
  new decision atom. Passing.
- [x] **AC4** — mixed-generation decision store resolves latest-wins via the
  read-side `normalized_subject` fallback. Passing.
- [x] **AC5** — in-tool `metadata_match {canonical_subject}` also returns
  legacy decision atoms (normalized_subject only), scoped to team-decision
  atoms; negative test proves a non-team-decision atom with `normalized_subject`
  is NOT matched. Passing.

## Test Output (verbatim)

Three affected test files:
```
 Test Files  3 passed (3)
      Tests  80 passed (80)
```

Full product suite (`vitest run --config vitest.product.config.ts
--no-file-parallelism`):
```
 Test Files  153 passed | 1 skipped (154)
      Tests  1617 passed | 21 skipped | 1 todo (1639)
```

typecheck: `tsc --noEmit` exit 0. eslint: `eslint .` 0 warnings. prettier:
changed files clean (`granola-signals.ts` had a pre-existing, unrelated
multi-line-import prettier warning at base — left untouched to avoid drift).

## Open Questions

None blocking. See Decision 1 (packaging-driven discriminator) and Decision 2
(snapshot bump) for the two items worth a reviewer glance.

## Notes on flaky full-suite runs

Two default (parallel) full-suite runs each failed ONE different heavy test
(`tests/cli/shell-reachable.test.ts`, then `tests/surfaces/ceo-slack-brain.test.ts`);
both pass cleanly in isolation, and the serialized (`--no-file-parallelism`) run
is 100% green. These are `npm pack` / subprocess-spawning tests timing out under
parallel CPU contention in the worktree — environmental, not caused by this
change.

## Drift Events

None.
