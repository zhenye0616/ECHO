---
id: 2026-05-07-020-open-loop-resolution-heuristics
title: V1 trace patch — open-loop resolution heuristics (R1)
status: claimed
priority: HIGH
estimate: 3-5d
created: 2026-05-07
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-08T05:53:09Z"
branch: "agent/open-loop-resolution-heuristics"
spec_refs:
  - backlog/complete/2026-05-06-018-recent-work-context-tool.md
  - backlog/complete/2026-05-07-019-trace-edge-filter-and-format.md
  - backlog/complete/2026-05-06-016-read-time-normalizer.md
  - src/trace/hints.ts
  - src/trace/types.ts
  - src/trace/index.ts
  - raw/internal/dogfooding/2026-05-07-trace-layer.md
  - wiki/architecture/work-trace.md
  - wiki/surfaces/mcp-recent-work-context.md
blocked_by: []
acceptance:
  - "`OpenLoopHintEnriched` (in `src/trace/types.ts`) gains two new fields: `resolved: boolean` and `resolved_by_atom_id?: string`. Existing fields unchanged."
  - "`enrichHints(atoms)` in `src/trace/hints.ts` populates `resolved` and (when `resolved === true`) `resolved_by_atom_id` for every emitted hint, by applying the four resolution rules below."
  - "Atoms passed to `enrichHints` are assumed to be sorted ascending by `time.occurred_at`. Resolution scans only forward (atoms with `occurred_at > hint_atom.occurred_at`)."
  - "**Rule R1.Q (`ends_with_question`):** the user-side question hint is `resolved` iff there exists a later atom in the same conversation (matching by `context.conversation` artifact id) that is NOT itself a question (does not end with `?` after trimming). `resolved_by_atom_id` = id of the earliest such atom. If no conversation artifact is present on the hint atom, the hint is unresolvable by this rule and stays `resolved: false`."
  - "**Rule R1.AQ (`unresolved_assistant_q`):** the assistant-side question hint is `resolved` iff there exists a later atom in the same conversation whose `actors[]` contains a role of `'user'` AND whose `action.input` (or `action.output` for non-conversation atoms) is non-empty after trimming. Length threshold: ≥1 char post-trim — even a short reply (\"ok\", \"yes\") closes the loop semantically. `resolved_by_atom_id` = id of earliest such atom."
  - "**Rule R1.TODO (`contains_todo`):** the TODO/FIXME hint is `resolved` iff there exists a later atom whose `state.delta.artifact_id` equals any of the hint atom's `artifacts[].id` whose type is `file`. (I.e., the file containing the TODO was edited after the TODO was logged.) `resolved_by_atom_id` = id of earliest such atom. If the hint atom has no file artifacts, the hint is unresolvable by this rule and stays `resolved: false`."
  - "**Rule R1.FU (`explicit_followup`):** conservative — `explicit_followup` hints **never auto-resolve in V1**. Always `resolved: false`. Rationale: the phrasing (\"come back to\", \"will do later\") is open-ended; a heuristic match is too lossy to risk false-resolves. This rule may be revisited after dogfooding produces signal."
  - "Each rule's scan is cluster-agnostic — resolution depends only on the input atom list, not on which cluster the hint atom ends up in. (Hints are still emitted per-atom; resolution is computed before clustering.)"
  - "Resolution scan complexity: for each hint, a single linear pass over later atoms with early-termination on first match. Total cost: O(H · A) worst-case where H is hint count and A is atom count. For dogfooding-scale inputs (≤500 atoms / window) this is sub-millisecond. No precomputed indexes required for V1."
  - "`response.query.format === 'minimal'` does NOT alter resolution behavior — `resolved` is computed identically in both modes. (Truncation only affects `action.input/output` strings on atom emission, not the upstream hint pass.)"
  - "Tool description in `src/mcp/tools/recent-work-context.ts` updated: one-sentence note that `cluster.open_loop_hints[].resolved` indicates whether the hint has a downstream closure signal in the same window. Existing description text otherwise unchanged."
  - "Tests in `tests/trace/hints.test.ts` (extend):"
  - "  - `R1.Q resolves a user question with a later non-question turn in same conversation`"
  - "  - `R1.Q does NOT resolve when the only later turn is itself a question`"
  - "  - `R1.Q does NOT resolve across conversation boundaries (different conversation artifact id)`"
  - "  - `R1.AQ resolves an assistant question with a 1-char user reply`"
  - "  - `R1.AQ does NOT resolve when the only later turn is also from assistant role`"
  - "  - `R1.TODO resolves when a later atom's state.delta.artifact_id matches a file artifact on the hint atom`"
  - "  - `R1.TODO does NOT resolve when the later edit is on a different file`"
  - "  - `R1.TODO does NOT resolve when the hint atom has no file artifacts`"
  - "  - `R1.FU is always resolved: false (per rule)`"
  - "  - `resolved_by_atom_id is set to the earliest qualifying atom id, not the latest`"
  - "  - `resolved is false when no later atoms exist in the input list`"
  - "Tests in `tests/trace/build.test.ts` (extend):"
  - "  - `enriched hints in cluster.open_loop_hints[] carry resolved + resolved_by_atom_id fields`"
  - "  - `at least one resolved hint and one unresolved hint coexist in the same cluster on a fixture mixing closed and open loops`"
  - "Tests in `tests/mcp/tools/recent-work-context.test.ts` (extend):"
  - "  - `response shape: every cluster.open_loop_hints[i].resolved is a boolean`"
  - "  - `format: 'minimal' does not alter resolved field on any hint`"
  - "**Founder validation pass** (manual, after agent-side criteria pass): agent generates a script `tools/validate-resolution.ts` (or extends the smoke script) that calls `get_recent_work_context` over the last 7 days against live storage and writes the resulting `(hint kind, hint text, resolved, resolved_by_atom_id, full hint atom URL)` rows to `raw/internal/dogfooding/2026-05-08-resolution-validation.md`. Founder hand-scores each row as TP / FP / TN / FN. Agent does NOT change the heuristic based on this — agent finishes; the calibration pass is a follow-up item."
  - "`npm run test`, `npm run lint`, `npm run typecheck` clean."
  - "Run log appended to `raw/internal/agent-runs/2026-05-07-2026-05-07-020-open-loop-resolution-heuristics.md`."
files_to_modify:
  - src/trace/types.ts
  - src/trace/hints.ts
  - src/mcp/tools/recent-work-context.ts
  - tests/trace/hints.test.ts
  - tests/trace/build.test.ts
  - tests/mcp/tools/recent-work-context.test.ts
  - tests/trace/fixtures/atoms.ts
  - tools/validate-resolution.ts
---

# V1 trace patch — open-loop resolution heuristics (R1)

## What

V1.5 atoms emit four kinds of open-loop hints (`ends_with_question`, `unresolved_assistant_q`, `contains_todo`, `explicit_followup`) that **detect** open-loop signals but never **resolve** them. A 3pm question and its 4pm answer both still carry `ends_with_question` because resolution is computed atom-locally.

This patch adds **per-hint resolution classification** at the trace layer: each emitted hint gets `resolved: boolean` and (when resolved) `resolved_by_atom_id: string` pointing to the atom that closes the loop.

This is **R1** — heuristic-only resolution, no LLM on the read path. R2 (LLM resolution) and R3 (heuristic prefilter + LLM disambiguation) are V1.5+ upgrades reserved for the case where R1's precision proves insufficient.

## Why

The V1 hotkey overlay (specced separately, after this lands) shows **unresolved open loops as the primary surface** — "where you left off" magic moment. The substrate's hint detection is necessary but not sufficient: surfacing 17 false-positive "open" loops on a normal weekday destroys trust faster than missing some real loops.

R1 is the cheapest correctness lever. It's deterministic, runs at trace time with no LLM cost, and ships independently of the overlay UI — every consumer of `get_recent_work_context` (current Claude-in-Cursor, Codex, future overlay) gets better hint quality immediately.

The bet is: simple per-kind rules catch 80%+ of real closures. If dogfooding shows precision below ~80%, the upgrade path is R3 — LLM disambiguation on the borderline cases. The rules' shape and the per-hint `resolved_by_atom_id` field both compose with that future upgrade without contract change.

## The four resolution rules

Resolution is **per-hint, per-kind**, computed by scanning the input atoms list forward in time from the hint atom.

| Hint kind | Resolution rule | Closes when |
|---|---|---|
| `ends_with_question` (R1.Q) | A later **non-question** turn in the **same conversation** | User asked, conversation continued past it |
| `unresolved_assistant_q` (R1.AQ) | A later turn from `'user'` role, non-empty after trim, in the **same conversation** | Assistant asked clarifying Q, user replied (any length) |
| `contains_todo` (R1.TODO) | A later atom whose `state.delta.artifact_id` matches a **file** artifact on the hint atom | The file was edited after the TODO was logged |
| `explicit_followup` (R1.FU) | **Never auto-resolves in V1** | Conservative — phrasing too open-ended for a regex match to safely close |

### Rationale per rule

- **R1.Q permissive on closure type, strict on conversation scope.** Any non-question turn closes the loop — the conversation moved on. But cross-conversation joins are out: a question in Slack and an unrelated answer in a Cursor session aren't the same loop.
- **R1.AQ requires user-role reply, accepts any length.** Two-word "ok thanks" semantically closes an assistant clarifying question. False-positive risk (user typed "ok" but didn't actually answer) is small for V1; if dogfooding shows it matters, raise threshold to ≥3 chars or check for substantive content.
- **R1.TODO uses `state.delta.artifact_id` as the closure signal.** This matches commits/edits where the artifact identity is the canonical join key (per `wiki/architecture/artifact-identity.md`). It will miss TODOs closed by *deletion* of the comment without a new atom touching that exact artifact, which is acceptable for V1.
- **R1.FU stays conservative.** "Will follow up next week" + "we followed up" are semantically different statements; a regex-based join will produce false closes. R2/R3 territory.

## Where the resolution pass runs

In `src/trace/hints.ts`, inside `enrichHints(atoms)` — the same pass that emits the existing hints. The pre-resolution loop becomes:

```ts
export function enrichHints(
  atoms: NormalizedContextEvent[],
): OpenLoopHintEnriched[] {
  // 1. Existing hint emission (unchanged) → produces array of {atom, kind, text, confidence}
  // 2. NEW: for each emitted hint, scan atoms forward from the hint atom's index
  //    and apply the kind-specific resolution rule.
  // 3. Return enriched hints with resolved + (optional) resolved_by_atom_id.
}
```

The scan is forward-only (matches happen later in time than the hint), single-linear, with early termination. No precomputed indexes for V1.

## Out of Scope (Don't Drift)

- **UI / hotkey overlay rendering.** This patch only labels hints. The overlay reading the labels is a separate item.
- **Pad-to-5-with-most-recent-loops compositor logic.** That's the overlay's job, not the trace layer's.
- **LLM-based disambiguation (R2 / R3).** Heuristic-only for V1. R2/R3 are deferred until R1's precision data argues for them.
- **Cross-conversation closure joins.** A question in conversation A closed by a reply in conversation B is not detected. V2 territory.
- **Persisting resolution state across queries.** Resolution is computed at trace time on each call. No database writes.
- **Manual dismissal API ("I closed this loop").** Future overlay item.
- **New hint kinds.** The four existing kinds only. Adding a fifth is a separate spec.
- **Modifying hint *emission* logic.** Resolution is a read-after-emission pass; the four regex patterns in `hints.ts` are unchanged.
- **Modifying `OpenLoopHintKind` union or `Confidence` type.** Those are stable contracts.
- **Touching the normalizer / capture / storage.** Read-time only.
- **Calibrating the rules based on the founder validation pass.** The validation pass surfaces precision data; calibration is a separate follow-up item.
- **Changing `resolved` to a richer enum (`'open' | 'closed' | 'ambiguous'`).** Binary boolean for V1; ternary is R3's design space.
- **Cross-cluster resolution.** Resolution scans the whole input atom list, but the `resolved_by_atom_id` pointer is just an id — it does NOT modify cluster membership or anchor selection.

## After Completion (Strategist Notes)

1. **Update the dogfooding journal.** First-day entries for resolution: did `resolved: true` correlate with the founder's gut judgment? Did any rule (especially R1.AQ's "any length" threshold or R1.TODO's `state.delta` match) produce surprising classifications?
2. **Founder validation pass review.** Score the rows in `raw/internal/dogfooding/2026-05-08-resolution-validation.md`. If overall precision (TP / (TP + FP)) is ≥80%, R1 is sufficient for the V1 overlay. If <80%, the next backlog item is the calibration pass (tightening rules based on observed FP modes) before considering R3.
3. **Spec the V1 hotkey overlay item.** The overlay reads `cluster.open_loop_hints[]`, filters `resolved: false`, applies the founder's "unresolved primary, pad to 5 with most-recent if fewer than 5 unresolved" composition rule. Surface size is **not capped** when unresolved ≥ 5; pad-to-5 is a floor, not a ceiling.
4. **Wiki promotion.** Update `wiki/architecture/work-trace.md` to document the resolution pass and the four rules. `wiki/surfaces/mcp-recent-work-context.md` callout that `open_loop_hints[].resolved` is a heuristic signal (not ground truth) and AI clients should treat it as a hint, not a guarantee. Wiki edits land **post-merge by strategist** per the operating-model reconciliation pending from item 019.
5. **No new entries in `_followups.md`** unless the agent surfaces a corner case — the spec is well-traced and acceptance criteria should map directly to implementation.

## Acceptance Criteria

- [ ] `src/trace/types.ts`: `OpenLoopHintEnriched` extended with `resolved: boolean` and `resolved_by_atom_id?: string`. No other field changes.
- [ ] `src/trace/hints.ts`: `enrichHints` populates both fields per the four rules. Forward-scan only; early-termination on first match.
- [ ] **R1.Q** rule implemented per spec (later non-question in same conversation; conversation match by `context.conversation` artifact id).
- [ ] **R1.AQ** rule implemented per spec (later user-role atom with non-empty trimmed input/output in same conversation).
- [ ] **R1.TODO** rule implemented per spec (later atom whose `state.delta.artifact_id` ∈ hint atom's file artifact ids).
- [ ] **R1.FU** always emits `resolved: false`.
- [ ] `resolved_by_atom_id` set to **earliest** qualifying later atom (not latest), only when `resolved === true`.
- [ ] Hints with no later atoms are `resolved: false`, `resolved_by_atom_id: undefined`.
- [ ] Resolution behavior is **identical** in `format: 'full'` and `format: 'minimal'` — truncation does not affect upstream hint computation.
- [ ] Tool description in `src/mcp/tools/recent-work-context.ts` updated with one-sentence note about `open_loop_hints[].resolved` semantics.
- [ ] **Tests in `tests/trace/hints.test.ts`** (12+ new cases per the acceptance list above).
- [ ] **Tests in `tests/trace/build.test.ts`** (2+ new cases asserting `resolved` propagates into `cluster.open_loop_hints[]`).
- [ ] **Tests in `tests/mcp/tools/recent-work-context.test.ts`** (2+ new cases asserting response shape and format invariance).
- [ ] **Validation script** `tools/validate-resolution.ts` runnable as `npm run validate:resolution` (or `node tools/validate-resolution.ts`) — calls `get_recent_work_context` over last 7 days, writes one-row-per-hint scoring sheet to `raw/internal/dogfooding/2026-05-08-resolution-validation.md`. Script does not auto-score; produces the data the founder will hand-score.
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` clean.
- [ ] Run log at `raw/internal/agent-runs/2026-05-07-2026-05-07-020-open-loop-resolution-heuristics.md`.
