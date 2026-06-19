---
id: 2026-06-18-103-ceo-context-loop-n2
title: "eng→CEO context loop — capture decision rationale (the 'why') + a single-consumer read-view; validate the one-directional read loop (Granola/meetings split to 104)"
status: proposed
priority: HIGH
estimate: 2-4d (engineering) + multi-day validation observation
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

_(Created 2026-06-18; realigned 2026-06-19 with the reasoning-layer fidelity test; **trimmed 2026-06-19** to the eng→CEO direction — the meetings→founder/Granola leg split to sibling item 104.)_

The 2026-06-18 office-hours (session 2) interrogation narrowed last session's federated-ecosystem
direction into the *actual* next sprint. The headline finding holds: **the thing that closes the
CEO loop is captured decision *rationale* (the "why"), not shared data.**

**REFINEMENT (2026-06-19 reasoning-layer fidelity test):** a reasoning layer (strong LLM) over
**already-unified context + a thin captured rationale** (the Linear JUS-17 ticket line + funnel
attrition numbers) **produced a faithful CEO-grade "why" — founder-confirmed it matched his actual
reason for prioritizing observability (positive n=1).** This validates the
"context-layer-first + reasoning-on-top" architecture. **The real failure mode is NOT "no answer" —
it is a *fluent, confident, possibly-confabulated* answer.** Fluency ≠ fidelity. The load-bearing
fix is **one-line rationale capture at decision time**, which is **orthogonal to capture-breadth**.

**This item is the eng→CEO half of the loop — the *validated direction* with the observed pain.**
Today the CEO questioned why the observability layer was a priority; the founder had to **manually
translate** the technical decision into a business "why." That hand-labor under friction is the
burned-insurance signal. The CEO is the **consumer**; the founder is the **producer** of context he
*already generates*. The eng-why is grounded by eng exhaust + Linear, **both already flowing into
ECHO** — no new capture surface required.

**Why one-directional (and why that's fine):** this tests the load-bearing hypothesis — *will one
other human self-serve another human's context instead of interrupting them?* — on the direction
that has the only observed demand datapoint, with **zero external-API dependency.** The reciprocal
direction (founder consuming the CEO's meetings) is the **additive** leg, gated on an unverified
Granola API, and is split to **item 104** so it cannot block this validated half. Asymmetry here is
a *sequencing artifact*, restored to symmetry when 104 ships — not a design stance.

## Locked decisions (2026-06-18 session-2 + 2026-06-19 realignment & trim)

- **Premise #1 (founder accepted):** the gap is *capturing the why*, not *sharing the data*.
- **Architecture endorsed:** context-layer-first + reasoning-layer-on-top. The reasoning layer
  produces the why; captured rationale makes it *faithful* not merely *fluent*.
- **The AC1 fidelity fix is the one-line "why" habit, NOT capture-breadth.** Free, immediate,
  independent of how many surfaces are wired.
- **No federation, no install required for this direction (2026-06-19 simplification).** For the CEO
  to *consume* the founder's eng context he only needs to **query** the founder's ECHO via the
  read-view (a link/interface) — he does **NOT** need to run ECHO on his machine. The only thing
  that ever required capture on the CEO's machine was his Granola, which is now item 104. This
  collapses the n=2 adoption ask from "install ECHO + wire Granola" to "open a link, ask a question."
- **Mandatory pre-flight:** seed rationale capture for ~3 likely-questioned decisions BEFORE the CEO
  queries, so his first query is not a confabulation that teaches him "this doesn't help me" and
  burns the one cheap-but-not-free adoption ask. (AC1 mechanism already has a positive n=1 — the
  pre-flight now hardens *fidelity*, not basic capability.)

## Acceptance criteria

1. **AC1 — Faithful-why proof (the solo pre-flight; gates everything after it).**
   The bar is **FIDELITY, not production.** The 06-19 test showed the reasoning layer *can* produce a
   fluent CEO-grade why and one was founder-confirmed faithful (**positive n=1**). So AC1 is **"does it
   produce a why the author would stand behind, across decisions, rather than a confident
   confabulation."**
   - Capture rationale (why / priority / tradeoff / what-it-prevents) for ~3 likely-questioned
     decisions in a queryable form ECHO ingests (the one-line-why habit).
   - **Rigorous (recommended) test — blind grading:** generate whys for 3–4 decisions, some
     deliberately under-grounded; founder flags which are faithful *without knowing which is which*
     (per the project's blind-holdout discipline). Mere agree-with-a-plausible-paragraph is the weak
     version, vulnerable to agreement bias.
   - **Fail condition:** the reasoning layer confidently produces *unfaithful* whys the author can't
     distinguish from faithful ones → STOP and escalate; a confabulating loop is worse than no loop.
2. **AC2 — CEO read-view (the engineering core).** A read-only query/chat surface onto the founder's
   eng context, exposable to exactly one other person, that answers "why did we decide X?" in
   business terms. Single-consumer, founder-controlled, **not** productized, **not** multi-tenant,
   **not** a consent matrix. Does NOT require the CEO to run ECHO.
3. **AC3 — n=2 setup (eng→CEO only).** The CEO can query the founder's eng context via the read-view
   in a real two-person configuration. (No CEO install, no Granola — that's 104.)
4. **AC4 — The watch-signal instrumented.** A way to observe whether the CEO *self-serves a "why"
   query instead of interrupting the founder* — unprompted, and whether it recurs (>once). This is
   the definition-of-done signal; not "done" until observable in real use.

**Definition of done (validation):** the CEO self-serves a "why" query unprompted, more than once,
instead of interrupting the founder. If he shrugs / never queries after the pre-flight is in place,
the loop is dead regardless of architecture — record that honestly as the result.

## Out of Scope (Don't Drift)

- **Granola / meetings ingestion (the CEO→founder direction)** — split to **item 104**. Do not build
  any meeting-capture surface in this item.
- **Federation / B2 multi-party** — consent matrix, no-shared-store, each-runs-own-ECHO. Deferred to
  team scale (3+ with private context). See [[project_cross_human_ecosystem_bet]].
- **CEO installs/runs ECHO** — not required for eng→CEO consumption; the read-view is query-only.
- **Slack / Linear / PM capture as NEW build** — none here. (NB: Linear already flows into ECHO via
  captured `mcp__linear__*` calls and grounds the eng-why; no new work.)
- **Admin console, permission-mirroring, access-control UI, multi-tenant productization** — none.
  This is an n=2 validation experiment, build the minimum that lets the test run honestly.
- **Rewriting shipped-reality docs** (`wiki/`, `wiki/product/v1-spec.md`, CLAUDE.md V1 scope) —
  strategy record only until this validates.
- **The orchestration loop stays completely personal** — this item touches context capture/retrieval,
  NOT the claim→review→build→merge loop. See [[project_cross_human_ecosystem_bet]].

## files_to_modify

_To be determined at spec-review / claim time. The engineering core is **AC2 — a single-consumer
read-view** onto the founder's existing ECHO eng context (retrieval already exists; the new surface
is exposing a query/chat interface to one other person + minimal auth). AC1 is largely a capture
*habit* + existing retrieval. Reviewers: confirm AC2's read-view surface is the right minimal shape
and flag any auth/exposure work that smuggles in multi-tenant/federation scope._

## spec_refs

- `raw/internal/decisions/2026-06-18-office-hours-ceo-loop-rationale-capture.md` (this item's design doc — READ FIRST)
- `raw/internal/decisions/2026-06-18-office-hours-cross-human-context-ecosystem.md` (session 1 — long-term direction this refines)
- `raw/internal/dogfooding/mcp-interactions-journal-2026-06-claude.md` (06-18 16:30 + 06-19 10:45 entries — the translation + fidelity tests)
- Sibling item: `backlog/proposed/2026-06-18-104-granola-capture-surface.md` (the meetings→founder leg split from here)
- Memory: `project_ceo_loop_rationale_capture`
- Memory: `project_cross_human_ecosystem_bet`

## After Completion (Strategist Notes)

- **Do NOT write wiki pages until the watch-signal (AC4/DoD) actually fires.** This is a validation
  experiment; a wiki page documents shipped+validated reality.
- If the eng→CEO loop validates (CEO self-serves >once), likely wiki home is a new `research/` page
  ("n=2 eng→CEO context-loop validation").
- If it does NOT validate, record the negative result in `raw/internal/decisions/` — a dead loop is a
  high-value datapoint that re-gates the federation bet, not something to quietly drop.
- Symmetry (bidirectional loop) is restored when item 104 (Granola) ships; revisit the federation
  question **only** if the n=2 loop cleared.
