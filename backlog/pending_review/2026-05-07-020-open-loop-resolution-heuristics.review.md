---
item_id: 2026-05-07-020-open-loop-resolution-heuristics
verdict: merge with founder fixups
reviewed_at: 2026-05-08T06:10:00Z
reviewer: strategist (Claude conversation, spec author)
test_counts: { passed: 430, failed: 4 }
test_failures_attribution: pre-existing flake (cursor extractor x3, daemon lifecycle x1) — all in files untouched by this branch
---

## Verdict

Implementation is faithful to spec on all four R1 design forks: R1.AQ ≥1 char threshold honored, R1.FU never auto-resolves (literal `return undefined`, no escape hatch), `resolved_by_atom_id` set to earliest qualifying atom, and cluster-agnostic resolution implemented correctly via the disclosed `src/trace/index.ts` change. Drift is disclosed (two files added beyond `files_to_modify`: `src/trace/index.ts` and `tests/trace/rank.test.ts`) and minimal. Code quality is good. One small pre-merge fixup needed for the validation script's npm entry, plus a predictable mechanical text conflict in `src/mcp/tools/recent-work-context.ts` description string when item 021 merges (whichever item lands second composes both new sentences).

The two disclosed scope-edge calls both **stand**: the `src/trace/index.ts` modification was necessary to honor the cluster-agnostic acceptance criterion (without it, atoms in different clusters in the same conversation would not see each other's later messages); the `tests/trace/rank.test.ts` change is a 2-line compile-only fixup adding `resolved: false` to existing fixture literals, no behavior change.

Reviewer is the strategist (spec author) per the Reviewer Independence Rule. The agent that built this item is a different role/identity than the reviewer — independence preserved.

## Pre-merge fixups

- [ ] **Add `validate:resolution` npm script to `package.json`** — single-line `"scripts"` entry: `"validate:resolution": "vite-node tools/validate-resolution.ts"`. Spec acceptance line 174 specifies `npm run validate:resolution` or `node tools/validate-resolution.ts`; agent's `npx vite-node` workaround satisfies neither literal form. The script uses ESM `.js` import-suffix TS resolver + `import.meta.dirname`, so plain `node` won't work — `vite-node` is the right runner. Founder applies because `package.json` was not in the agent's `files_to_modify`.
- [ ] **(At 021's merge time, not now)** Compose the `RECENT_WORK_CONTEXT_DESCRIPTION` string in `src/mcp/tools/recent-work-context.ts`. Keep both 020's appended sentence about `cluster.open_loop_hints[].resolved` semantics AND 021's appended sentences about `window_hours` inference + explicit-TZ recommendation. No semantic conflict; mechanical text join.

## Expected merge conflicts

- `src/mcp/tools/recent-work-context.ts` — single conflict in the `RECENT_WORK_CONTEXT_DESCRIPTION` string constant. Both items appended new sentences before the trailing `'..."full" keeps everything).'`. Resolution: keep both appendments. Outside the description string, the two items touch entirely disjoint regions and auto-merge cleanly.
- `src/trace/types.ts` — **no conflict expected.** Item 020 adds fields to `OpenLoopHintEnriched`; item 021 adds `window_hours` to `QueryEcho`. Disjoint interfaces; git's three-way merge handles cleanly.
- `tests/trace/build.test.ts`, `tests/mcp/tools/recent-work-context.test.ts` — append-only test additions in different sections of each file; no conflict expected.

## Follow-up items (defer, do not block merge)

- **Strategist post-merge spec amendment:** spec line 42 prose says "matching by `context.conversation` artifact id" but the actual `NormalizedContextEvent.context` schema has only `visible/selected/ambient` string fields, no `conversation` artifact ref. The agent correctly inferred the intent ("match the conversation-typed `ArtifactRef` by `provider:type:id`") and implemented faithfully; the spec wording is loose. Update spec post-merge for future readers.
- **Tighten R1.TODO type cast:** `src/trace/hints.ts:150` uses `(state as { delta?: { artifact_id: string } }).delta` instead of the discriminated-union narrowing (`if ('delta' in state)`). Cosmetic; functionally equivalent.
- **Add explicit "earliest" tests for R1.AQ and R1.TODO** to mirror the existing R1.Q earliest test (currently inferred from shared loop structure).
- **Quarantine pre-existing flake:** 3 failures in `tests/capture/extractors/cursor.test.ts` (workspace_id matching, lastSeenMap backfill, stop() timeout) + 1 in `tests/daemon/lifecycle.test.ts` (waitFor timeout). Independent of 020. Already flagged in `_followups.md` from 019's run.
- **R1.TODO snapshot-resolver expansion:** R1.TODO matches only `state.delta.artifact_id`; git-commit atoms use `state.snapshot.artifact_id` and won't close TODOs in this rule. Per spec ("`state.delta.artifact_id`") this is faithful; revisit after dogfooding evidence.
- **Comment the UTC-Z invariant:** `compareByOccurredAt` in `src/trace/index.ts:202-211` lex-sorts ISO strings, which only equals chronological order under the normalizer's UTC-Z guarantee (per item 016). One-line comment would prevent a future change from breaking the assumption silently.
- **R1.AQ user-with-empty-input edge case:** `hasNonEmptyContent` falls back from `input` to `output` for user-role atoms. For sources where the user atom legitimately has empty `input` but non-empty `output` (rare; some cursor extractor cases), this still resolves. Validate during dogfooding pass.

## Open questions for founder

None — verdict is `merge with founder fixups`, not `block`. The single pre-merge fixup (npm script) is mechanical, and the deferred conflict resolution is mechanical too.

## Test verification (re-run by reviewer, not relying on agent_notes)

- `npm run typecheck`: clean
- `npm run lint`: clean (`--max-warnings 0`)
- `npm test`: 430 passed / 4 failed
  - All 4 failures in `tests/capture/extractors/cursor.test.ts` (3) and `tests/daemon/lifecycle.test.ts` (1)
  - This branch's diff does not touch `src/capture/`, `src/daemon/`, or any code path these tests exercise
  - Failures match the pre-existing flake pattern flagged from item 019's verification
  - All 16 new tests added by this item pass (12 in hints.test.ts, 2 in build.test.ts, 2 in recent-work-context.test.ts)
