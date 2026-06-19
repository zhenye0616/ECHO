---
id: 2026-06-18-103-ceo-context-loop-n2
title: "n=2 CEO context loop — capture decision rationale (the 'why'), expose a read-view, run the two-user bidirectional validation test"
status: proposed
priority: HIGH
estimate: 3-5d (engineering) + multi-day validation observation
created: 2026-06-18
blocked_by: []
task_state_ref: 2026-06-18-103-ceo-context-loop-n2
requested_reviewers: ["codex", "codex-ops"]
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

## Why

_(Created 2026-06-18; **realigned 2026-06-19** after a reasoning-layer fidelity test — see the REFINEMENT note below.)_

The 2026-06-18 office-hours (session 2) interrogation narrowed last session's federated-ecosystem
direction into the *actual* next sprint. The headline finding holds: **the thing that closes the
CEO loop is captured decision *rationale* (the "why"), not shared data.**

**REFINEMENT (2026-06-19 follow-up test — important; supersedes the first-pass read):** the first
`search_memories("observability")` looked like "the why is captured *nowhere* → the mechanism
returns a *technical dump*." A second test corrected this. A reasoning layer (a strong LLM) over
**already-unified context + a thin captured rationale** (the Linear JUS-17 ticket line + the funnel
attrition numbers) **DID produce a faithful CEO-grade "why" — the founder confirmed it aligned with
his actual reason for prioritizing observability (n=1).** So the mechanism is more alive than the
first read suggested, and it *validates the "context-layer-first + reasoning-on-top" architecture.*
**The real failure mode is therefore NOT "no answer" — it is a *fluent, confident, possibly-
confabulated* answer.** Fluency ≠ fidelity; a confabulated why is *worse* than a tech-dump because
the consumer can't detect the error. The load-bearing fix is **one-line rationale capture at
decision time** (the thin Linear line is exactly what grounded the faithful reconstruction) — and
that fix is **orthogonal to capture-breadth** (wiring more surfaces does not improve eng-why
fidelity).

This item is the **n=2 validation experiment** that tests whether a two-person context loop
closes real value — **on a single ECHO, no federation** (federation is unnecessary at n=2 and
sequences behind proving this). It is explicitly a **CONVICTION bet, demand not yet validated**
on the CEO's side; the acceptance criteria are built around the one signal that converts it
from bet to fact. Full reasoning: see spec_refs.

**Observed demand (the duct-tape signal):** the CEO questioned why the observability layer was a
priority; the founder had to **manually translate** the technical decision into a business "why."
That hand-labor under friction is the burned-insurance signal — the validated direction is
**eng→CEO**, grounded by eng exhaust + Linear (**both already flowing into ECHO**). Meetings→founder
(Granola) is the additive second direction and does **NOT** ground the eng-why — do not conflate
wiring Granola with fixing AC1.

## Locked decisions (2026-06-18 session-2 interrogation + 2026-06-19 realignment)

- **Premise #1 (founder accepted):** the gap is *capturing the why*, not *sharing the data* —
  testable on one ECHO, alone.
- **Architecture endorsed (06-19):** **context-layer-first + reasoning-layer-on-top** is the
  right shape (ECHO's own thesis). The reasoning layer produces the why; captured rationale makes
  that why *faithful* rather than merely *fluent*.
- **The AC1 fidelity fix is the one-line "why" habit, NOT capture-breadth (06-19):** a one-sentence
  why/priority on the Linear ticket or commit *at decision time* is what grounds the reasoning
  layer. It is free, immediate, and **independent of how many surfaces are wired.** Granola/Slack
  wiring does not improve eng-why fidelity.
- **Federation is NOT in scope.** At n=2 the loop closes with one ECHO + rationale capture +
  Granola ingestion + a CEO read-view. No consent matrix, no shared store, no admin console.
- **Founder's choice at the gate:** run the test **bidirectionally and straight away** (CEO
  installs ECHO + Granola), overriding solo-first — *with the mandatory pre-flight below.*
- **Mandatory pre-flight:** seed rationale capture for ~3 likely-questioned decisions BEFORE the
  CEO queries, so his first query is not a confabulation that teaches him "this doesn't help me"
  and burns the one cheap-but-not-free adoption ask. **(AC1 mechanism already has a positive n=1 —
  see AC1; the pre-flight now hardens *fidelity*, not basic capability.)**

## Acceptance criteria

1. **AC1 — Faithful-why proof (the solo pre-flight; gates everything after it).**
   The bar is **FIDELITY, not production.** The 06-19 test already showed the reasoning layer
   *can* produce a fluent CEO-grade why and that one was founder-confirmed faithful (**positive
   n=1**). So AC1 is no longer "can it produce a why" — it is **"does it produce a why the author
   would stand behind, across decisions, rather than a confident confabulation."**
   - Capture rationale (why / priority / tradeoff / what-it-prevents) for ~3 likely-questioned
     decisions in a queryable form ECHO ingests (the one-line-why habit).
   - **Rigorous (recommended) test — blind grading:** generate whys for 3–4 decisions, some
     deliberately under-grounded; founder flags which are faithful *without knowing which is which*
     (per the project's blind-holdout discipline). Mere agree-with-a-plausible-paragraph is the
     weak version and is vulnerable to agreement bias.
   - **Fail condition:** the reasoning layer confidently produces *unfaithful* whys that the author
     can't distinguish from faithful ones → STOP and escalate; a confabulating loop is worse than
     no loop. (Note: "can't produce a why at all" is no longer the expected failure — it produced
     one on n=1.)
2. **AC2 — CEO read-view (eng→CEO, the validated direction).** A read-only query/chat surface
   onto the founder's eng context, exposable to exactly one other person, that answers
   "why did we decide X?" in business terms. Minimal — not productized, not multi-tenant.
3. **AC3 — Granola ingestion (meetings→founder, the additive direction).** The CEO's Granola
   meeting summaries are ingested into the founder's ECHO as a capture surface, organized at
   ingestion, queryable. (Founder chose bidirectional; this is the second leg.)
4. **AC4 — n=2 setup stood up.** CEO has ECHO installed; the read-view (AC2) and Granola
   ingest (AC3) are live in a real two-user configuration.
5. **AC5 — The watch-signal instrumented.** There is a way to observe whether the CEO
   *self-serves a "why" query instead of interrupting the founder* — unprompted, and whether
   it recurs (>once). This is the definition-of-done signal; the build is not "done" until the
   signal can be observed in real use.

**Definition of done (validation):** the CEO self-serves a "why" query unprompted, more than
once, instead of interrupting the founder. If he shrugs / never queries after the pre-flight is
in place, the loop is dead regardless of architecture — record that honestly as the result.

## Out of Scope (Don't Drift)

- **Federation / B2 multi-party** — each-person-runs-own-ECHO + consent-sharing across layers,
  consent matrix, no-shared-store mechanics. Deferred to team scale (3+ with private context).
  At n=2 it is pure overhead. See [[project_cross_human_ecosystem_bet]].
- **Slack / Linear / PM capture surfaces (as NEW build)** — only Granola (meetings) is in scope as
  the second direction; do not expand the surface set. (NB: Linear is *already* flowing into ECHO
  via captured `mcp__linear__*` calls — it grounds the eng-why and needs no new work here.)
- **Admin console, permission-mirroring, access-control UI** — none. The read-view is exposed
  to exactly one person by the founder.
- **Productization / packaging / multi-tenant** — this is an n=2 validation experiment, not a
  shippable multi-user product. Build the minimum that lets the test run honestly.
- **Rewriting shipped-reality docs** (`wiki/`, `wiki/product/v1-spec.md`, CLAUDE.md V1 scope) —
  strategy record only until this validates. Per the office-hours discipline.
- **The orchestration loop stays completely personal** — this item touches context capture/
  retrieval, NOT the claim→review→build→merge loop. See the invariant in
  [[project_cross_human_ecosystem_bet]].

## files_to_modify

_To be determined at spec-review / claim time. The ECHO-side engineering (Granola capture
surface, single-consumer read-view) lives in the ECHO codebase; the rationale-capture content
and the n=2 test run partly in `justinian.ai` and on the CEO's machine — a cross-repo item.
Reviewers: scope this down to the minimum engineering the validation test requires, and flag if
AC2/AC3 are too large for one item (Granola ingestion may warrant a sibling item)._

## spec_refs

- `raw/internal/decisions/2026-06-18-office-hours-ceo-loop-rationale-capture.md` (this item's design doc — READ FIRST)
- `raw/internal/decisions/2026-06-18-office-hours-cross-human-context-ecosystem.md` (session 1 — long-term direction this refines)
- `raw/internal/dogfooding/mcp-interactions-journal-2026-06-claude.md` (06-18 16:30 entry — first translation test; **06-19 10:45 entry — the reasoning-layer fidelity test + positive n=1 that realigned this spec**)
- Memory: `project_ceo_loop_rationale_capture` (the finding + the validated direction + the pattern)
- Memory: `project_cross_human_ecosystem_bet` (the long-term federation bet this sequences ahead of)

## After Completion (Strategist Notes)

- **Do NOT write wiki pages from this until the n=2 signal (AC5/DoD) actually fires.** This is a
  validation experiment; a wiki page documents shipped+validated reality.
- If the loop validates (CEO self-serves >once), the wiki home is likely a new `research/` page
  ("n=2 context-loop validation") + a `capture/` page for the Granola surface once it ships.
- If it does NOT validate, record the negative result in `raw/internal/decisions/` — a dead n=2
  loop is a high-value datapoint that should re-gate the federation bet, not be quietly dropped.
- Likely follow-on backlog items: Granola capture-surface hardening (if AC3 was stubbed for the
  test); the federation question re-opened *only* if n=2 cleared.
