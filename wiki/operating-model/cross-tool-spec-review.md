---
status: shipped
topic: Process
subtopic: Cross-Tool Review
aliases:
  - Cross-Tool Spec Review
  - Cross-Tool Review
  - Multi-Reviewer Pattern
  - R1/R2/R3 Review Cycle
---

# Cross-Tool Spec Review

The operating-model pattern where ≥2 independent AI clients review the same artifact (spec / code / strategic plan) and a strategist (or founder) synthesizes findings. Demonstrated repeatedly across items 030 and 032 in May 2026; this page documents the pattern after enough independent cycles to call it load-bearing.

## What it is

A review round (`R1`, `R2`, `R3`...) consists of:

1. **Strategist** ships an artifact (spec, code, patch, recommendation).
2. **Two or more peer reviewer clients** — running on different model families and/or different MCP harnesses — independently inspect the artifact against the codebase. Today's pair: Cursor's Claude + Codex (gpt-5.5). Past pairs have substituted Claude Code subagents in either slot.
3. Each reviewer produces a verdict (proceed / proceed-after-fix / pushback / block) plus a numbered findings list.
4. **Strategist** synthesizes findings, validates each against the actual code (`ls`, `grep`, file reads), classifies as convergent (both caught) vs single-source, applies patches.
5. If the patches are non-trivial, fire **`R+1`**: another round on the patched artifact.
6. Stop when both reviewers say "Proceed" with only wording-tier findings — the **verdict-convergence signal**.

The pattern is named "cross-tool" because the diversity that produces complementary findings is the tool/model boundary, not the persona ("strict reviewer vs lenient reviewer"). Same-tool sub-agents have empirically missed things their cross-tool peers caught — see [[#evidence-base]] below.

## When to use it

Use cross-tool review for:

- **Specs touching novel envelope/ceiling logic, ranking semantics, or wire-shape contracts** — item 030's three P1 envelope-ceiling bugs and item 032's rank-demotion semantics both required cross-tool catches.
- **Strategic recommendations with sequencing claims** — item 032's "Ladder A vs Ladder B" framing was substantively reshaped by Codex's pushback on the hotkey-overlay defer.
- **Any patch round after a substantive correction** — strategists hallucinate fewer things on the original draft than on patches that touch one section but not its cross-references; R2 and R3 cycles catch more regressions than R1 cycles.
- **Spec items where reviewer independence is structurally required** — see [[#reviewer-independence-rule]] in CLAUDE.md.

Skip cross-tool review for:

- Trivial mechanical changes (typo fix, single-import update, dependency bump) where a single reviewer's pass is sufficient.
- Time-pressured tactical patches where the cost of one bad merge is recoverable in minutes.
- Operating-model meta-edits (this page) — those review themselves via the founder's read.

## The 4-role pattern

When cross-tool review is active, the work allocates across four roles. Demonstrated organically during the item 030 spec cycle and archived in `raw/internal/decisions/2026-05-10-multi-agent-dev-template-and-product-thesis.md`:

- **Strategist** — conversation-time interlocutor with the founder; produces the spec; reconciles reviewer findings; applies patches.
- **Peer Reviewer A + B** — independent reviewers, different tools/models. Read the artifact + codebase, produce numbered findings, return verdict.
- **Builder** — claims the spec post-merge; implements per acceptance criteria. By the [[#reviewer-independence-rule]], builder must be a different agent than strategist.
- **Founder** — gates the two irreversible moments (substantive conflict resolution + `git push origin main`). Reads reviewer findings; redirects the strategist if a finding was substantively wrong.

The pattern is **1:n, not multiple 1:1.** Cursor's Claude is a distinct reviewer from a Claude Code subagent; Codex is a distinct reviewer from either; together they catch what no single tool catches. Same-tool parallelism does not produce the same finding diversity.

## Findings classes (empirical)

After ~10 cycles across items 030 and 032, findings fall into these classes:

| Class | What it catches | Who typically catches it |
|---|---|---|
| **A — Envelope/ceiling enforcement** | Hard limits declared but never applied; size checks computed against stale envelopes; truncation flags not propagated. | Code review reviewers operating on the implementation; either tool. |
| **B — Spec-vs-code drift** | Wrong `spec_refs` paths; fabricated field names; layer-boundary crossings (e.g., naming a normalized field on a storage type). | Either tool, with high convergence. |
| **C — Internal contradictions** | AC says one thing, Implementation Notes says another, after a partial-patch round. | Either tool, on R2+ cycles. |
| **D — Demo-bar / load-bearing semantic** | The implementation matches the spec but the spec doesn't structurally guarantee the load-bearing behavior (e.g., rank-1 = prior work). | Often Codex (xhigh reasoning), but Cursor catches these on spec review when the artifact is small. |
| **E — Sequencing / strategic facts** | Item is in `complete/` not `ready/`; deprecation precedes replacement; bundle item dropped from V1 mid-spec. | Either tool. |
| **F — Description / user-facing string drift** | Tool descriptions promise old behavior; deprecation banner not updated in lockstep. | Often Cursor (it operates closer to the user-visible surface in practice). |

Class A and Class F are tool-leaning. Classes B, C, E are convergent. Class D is the highest-stakes — load-bearing semantic gaps that a single-reviewer pass usually rationalizes.

**Recovery primitive for elided reviewer responses (V1.6.1, item 033):** Cross-tool review on dense multi-finding turns (Codex `xhigh` reasoning regularly produces these) routinely fires the `truncations: ["content"]` trust signal on `tail_session` / `search_memories` / `get_atoms` responses — the strategist would historically read the source JSONL via `jq` / SQLite to recover the full pushback list. [[mcp-get-atom|`get_atom(id)`]] now returns the verbatim atom content through MCP in one call, no shell or composer-id required. Use it whenever a reviewer's response comes back elided. This closes Magic Moment M1-3 end-to-end — the cross-tool review pattern is no longer structurally dependent on JSONL/SQLite shell access for elision recovery.

## The strategist self-review checklist

Two consecutive patch cycles in May 2026 (R1→R2, R2→R3 on item 032) introduced regressions that the next review caught. The patches fell into two classes:

- **Patch class 1: hallucinated identifiers** (R1→R2). Field names that combine real types (`CaptureEvent.occurred_at` — `CaptureEvent` has `.timestamp`, normalized events have `.time.occurred_at`); file paths that don't exist (`src/normalize/event.ts`).
- **Patch class 2: cross-reference drift within the same spec** (R2→R3). Updating AC without updating the matching Implementation Notes; updating one example without updating the other.

To prevent these, strategists running spec patches should apply this 4-gate checklist before commit:

1. **Path gate:** every `spec_refs` path → `ls` exists.
2. **Field gate:** every named field → `grep` finds it in the named file.
3. **Existing-behavior gate:** every "existing behavior — confirm preserved" claim → `grep` confirms the implementation.
4. **Cross-reference gate:** after editing any AC, `grep` the rest of the spec (Implementation Notes, After Completion, R-sections) for stale references to the pre-edit wording.

Gates 1-3 catch Patch class 1. Gate 4 catches Patch class 2. The cost is ~2 minutes per patch round; the savings compound across review cycles because each regression that lands forces another round.

## Verdict-convergence signal

The pattern terminates when **both reviewers say "Proceed" with only wording-tier findings**, not when "no findings." Treat this convergence as the asymptote:

- R1 findings tend to be many (5-15) and span multiple severity classes.
- R2 typically halves the count and shifts severity downward.
- R3 (when needed) is usually wording-only, single-digit.
- If both reviewers converge on "proceed" at the same severity tier, the spec is claim-ready.

If one reviewer says "Proceed" and the other says "Pushback," there's substantive disagreement worth surfacing to the founder — that's a different signal than convergence.

## Reviewer Independence Rule

Per [[CLAUDE.md]]: **the reviewer-and-merger of any item must be a different role/agent than the builder that wrote the code.** Cross-tool review extends this: the strategist who wrote the spec should NOT be one of the cross-tool reviewers on that spec. Acceptable shapes:

- Strategist (Claude Code) writes spec → Cursor's Claude + Codex review → builder is one of {fresh Claude Code subagent, Cursor's Claude, Codex} not previously involved.
- Strategist (Claude Code) writes spec → Cursor's Claude + Codex review → builder is Claude Code; strategist hands off the patched spec but does NOT review their own code post-build.

Same-tool review by the spec author defeats the structural check.

## Evidence base

Documented cycles in `raw/internal/dogfooding/mcp-interactions-journal.md`:

- **Item 030 R1 spec review** (2026-05-08 → 2026-05-09): 3 rounds, 25 findings, eventually claimable. Cursor + Codex caught 14 complementary findings the strategist had drafted past.
- **Item 030 R1 code review** (2026-05-10 ~00:30 PDT): Cursor's Claude + Codex independently caught the same TWO P1 envelope-ceiling bugs (Class A) that the initial Claude code-reviewer subagent missed entirely. Fixed in commit `c12617b`.
- **Item 032 R1 sequencing pushback** (2026-05-10 14:48 PDT, Codex): caught a factual error (029 stale) + a conceptual conflation (L2-ambient calibration vs L3-summoned UX), and reshaped the demo path.
- **Item 032 R1 spec review** (2026-05-10 15:00 PDT, Cursor + Codex): 9 findings — 3 convergent, 3 Codex-only (including the Class D demo-bar ranking gap), 3 Cursor-only (including the Class F `FIND_CLUSTERS_DESCRIPTION` drift).
- **Item 032 R2** (15:32 PDT, Cursor + Codex): caught two regressions the R1 patch introduced (Class B hallucinated names; AC-vs-existing-behavior contradiction). One Class D strengthening on the demotion rule.
- **Item 032 R3** (15:39 PDT, Cursor + Codex): caught two cross-reference drifts the R2 patch introduced (Class C). Both reviewers converged on "Proceed."
- **Item 033 R1 spec review** (2026-05-10 16:00 PDT, Cursor + Codex): 4 findings, **first divergent-verdict cycle** of the day. Cursor: "Proceed (two small nits)." Codex: "Pushback. I would not send 033 to a builder yet." Strategist sided with Codex's harsher reading after validating the contested metadata-size claim against journal line 737 (Codex `metadata.tool_calls` documented at 120-130KB per atom — falsifying the v1 contract's "verbatim metadata" promise). One Class D contract-vs-reality finding the 4-gate checklist could not have caught; 0 Class B/C findings (the checklist worked for those classes).
- **Item 033 R2** (16:05 PDT, Codex only — Cursor R2 did not occur): "Pushback, but narrow" — 4 Class B dependent-section drifts from R1's contract revision (Goal §49, AC2 §129, Out-of-Scope §172-173, spec_refs §19) plus 1 HIGH truncations-correctness bug in Implementation Notes. The strategist's `Gate 4 ✅` claim from the pre-R1 self-review was honest at the time but **not re-run after the R1 patch** — this exposed the gap that Gate 4 as written doesn't mandate re-running after contract-revision patches. Proposed strengthening: mandatory re-grep for the OLD contract's load-bearing terms after every contract-revision patch, with the grep recorded in the commit message. Self-caught two additional `deliberately bypasses` drifts during claimability check (the regex was incomplete), reinforcing the proposal. **All 5 R2 findings + 2 self-caught extras fixed in `43138e4` + `c5b2e2d`.**

Pattern note: by the end of the day, **the cross-tool review pattern was being applied per-patch, not per-item.** Each R+1 cycle caught regressions the previous patch round introduced. The cost was ~20 min per cycle; the value was 3-9 findings each. **Class distribution shifts predictably across rounds:** R1 surfaces Class D (contract-vs-reality) and Class F (description drift); R2 surfaces Class B (dependent-section drift from R1's patch); R3 surfaces Class C (AC-vs-Implementation contradictions from R2's patch). No reviewer caught the same class twice in a row across the eight cycles documented above — the differentiated value per reviewer per cycle is robustly accumulating, not random.

## Cost / value

Empirically measured today:

- **Cost** per round: ~7 minutes per reviewer client + ~10 minutes strategist synthesis = **~25 minutes total** for a 2-reviewer round.
- **Value** per round (today's empirical): 3-9 real findings, including at least one Class D (load-bearing semantic) on the R1 cycle of every non-trivial spec.

Compared alternatives:

- **Single-reviewer pass:** misses Class D semantically-load-bearing gaps in spec; misses Class A envelope/ceiling bugs in code. Item 030 shipped to merge with single-reviewer pass + would have shipped THREE P1 envelope bugs without the cross-tool R1 code review.
- **Discover-in-build:** ~5x the cost. Builder runs, fails acceptance, escalates back, strategist fixes spec, builder re-runs.
- **Discover-in-post-merge-dogfooding:** ~50x the cost. Bug ships, eventually surfaces in a real call, requires unwind or backwards-compatible patching.

The pattern's value scales positively with patch-cycle depth. Each cycle catches the previous cycle's introduced bugs.

**Cost reduction from V1.6.1 recovery primitive:** Pre-033, dense Codex pushback turns routinely fired `truncations: ["content"]`; the strategist would shell out to `jq` against the JSONL or SQLite-probe Cursor's `state.vscdb` to recover the elided middle. Per-cycle overhead: ~3 minutes per elided turn, ~1-3 turns per cycle. Post-033, [[mcp-get-atom|`get_atom(<elided_atom_id>)`]] returns the verbatim content in one MCP call — net cost reduction ≈ 5-9 minutes per cycle on dense-finding rounds. The recovery primitive doesn't change the review cadence, just removes the per-elision friction tax.

## Related

- [[multi-agent-dev-template-and-product-thesis]] — the broader pattern this is one component of (the 4-role multi-agent dev template)
- [[drift-prevention]] — sibling discipline (catches scope drift; cross-tool review catches correctness drift)
- [[wave-1-2-3-retrospective]] — operating-model retrospective on the substrate waves (sets up the post-substrate review cadence)
- `raw/internal/decisions/2026-05-10-multi-agent-dev-template-and-product-thesis.md` — original archival decision note where the 4-role pattern was first named
- `raw/internal/dogfooding/mcp-interactions-journal.md` — primary evidence base; entries dated 2026-05-08 through 2026-05-10 PDT document the cycles cited here
