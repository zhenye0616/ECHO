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

The 2026-06-18 office-hours (session 2) interrogation + a **live ECHO test** narrowed last
session's federated-ecosystem direction into the *actual* next sprint. The headline finding:
**the thing that closes the CEO loop is captured decision *rationale* (the "why"), not shared
data.** A live `search_memories("observability")` proved ECHO's capture of the founder's eng
work is deep but entirely **WHAT/HOW** — the business **WHY-it's-a-priority is captured
nowhere**, so the "CEO chats with ECHO instead of interrupting me" mechanism returns a
*technical dump*, not the framing that actually resolved the CEO's question today.

This item is the **n=2 validation experiment** that tests whether a two-person context loop
closes real value — **on a single ECHO, no federation** (federation is unnecessary at n=2 and
sequences behind proving this). It is explicitly a **CONVICTION bet, demand not yet validated**
on the CEO's side; the acceptance criteria are built around the one signal that converts it
from bet to fact. Full reasoning: see spec_refs.

**Observed demand (the duct-tape signal):** today the CEO questioned why the observability
layer was a priority; the founder had to **manually translate** the technical decision into a
business "why." That hand-labor under friction is the burned-insurance signal — the validated
direction is **eng→CEO**. Meetings→founder (Granola) is the additive second direction.

## Locked decisions (from the 2026-06-18 session-2 interrogation)

- **Premise #1 (founder accepted):** the gap is *capturing the why*, not *sharing the data* —
  testable on one ECHO, alone.
- **Federation is NOT in scope.** At n=2 the loop closes with one ECHO + rationale capture +
  Granola ingestion + a CEO read-view. No consent matrix, no shared store, no admin console.
- **Founder's choice at the gate:** run the test **bidirectionally and straight away** (CEO
  installs ECHO + Granola), overriding solo-first — *with the mandatory pre-flight below.*
- **Mandatory pre-flight:** seed rationale capture for ~3 likely-questioned decisions BEFORE the
  CEO queries, so his first query is not the tech-dump that teaches him "this doesn't help me"
  and burns the one cheap-but-not-free adoption ask.

## Acceptance criteria

1. **AC1 — Rationale-capture proof (the solo pre-flight; gates everything after it).**
   Decision rationale (why / priority / tradeoff / what-it-prevents) for the observability
   decision + 2 more likely-questioned ones is captured in a queryable form ECHO ingests.
   Re-running the ECHO query returns a **CEO-grade "why" answer, not a technical dump** —
   judged against the founder's own live translation as the bar. If AC1 fails (LLM can't
   produce the why even with rationale captured), STOP and escalate; the loop premise is wrong.
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
- **Slack / Linear / PM capture surfaces** — only Granola (meetings) is in scope as the second
  direction; do not expand the surface set.
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
- `raw/internal/dogfooding/mcp-interactions-journal-2026-06-claude.md` (16:30 entry — the live translation test that produced the core finding)
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
